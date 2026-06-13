export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySpotlight, currentTheme } from "@/drizzle/schema";

const DA_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const GROUP_NAME = "styleguideai";
// Journals for the monthly theme are posted to the group, not the owner's personal profile
const JOURNAL_AUTHOR = GROUP_NAME;

interface DATokenResponse {
  access_token: string;
}

interface DAFolder {
  folderid: string;
  name: string;
}

interface DAFoldersResponse {
  results: DAFolder[];
  has_more: boolean;
}

interface DAImage {
  src: string;
  height: number;
  width: number;
}

interface DADeviation {
  deviationid: string;
  url: string;
  title: string;
  published_time: number;
  author: { username: string };
  preview: DAImage | null;
  thumbs: DAImage[];
}

interface DAGalleryResponse {
  results: DADeviation[];
  has_more: boolean;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(DA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.DEVIANTART_CLIENT_ID!,
      client_secret: process.env.DEVIANTART_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = (await res.json()) as DATokenResponse;
  return data.access_token;
}

// Extract the primary theme keyword from a gallery name like "Junique 2026" → "junique"
// Strips years, emoji, and punctuation so we can do a loose title match.
function themeKeyword(galleryName: string): string {
  return galleryName
    .replace(/\d{4}/g, "")         // remove 4-digit years
    .replace(/[^\w\s]/gu, " ")     // strip emoji / punctuation
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0]
    ?.toLowerCase() ?? "";
}

// Find the URL of a journal posted by satoricanton whose title matches the gallery name.
// Uses /user/profile/posts which returns journals + status updates for a given user.
async function findJournalUrl(
  authHeaders: Record<string, string>,
  galleryName: string
): Promise<string | null> {
  const keyword = themeKeyword(galleryName);
  if (!keyword) return null;
  console.log("[sync-deviantart] Searching journals for keyword:", keyword, "(from gallery:", galleryName + ")");

  try {
    const res = await fetch(
      `${DA_BASE}/user/profile/posts?${new URLSearchParams({ username: JOURNAL_AUTHOR, limit: "24" })}`,
      { headers: authHeaders }
    );
    console.log("[sync-deviantart] user/profile/posts status:", res.status);
    if (!res.ok) {
      const body = await res.text();
      console.error("[sync-deviantart] user/profile/posts error body:", body);
      return null;
    }
    const data = (await res.json()) as DAGalleryResponse;
    console.log("[sync-deviantart] user/profile/posts returned", data.results?.length ?? 0, "items");
    data.results?.forEach((d) => console.log("  post:", JSON.stringify(d.title), d.url));

    // Match on the theme keyword; also filter to journal URLs to avoid status posts
    const match = data.results?.find(
      (d) => d.title.toLowerCase().includes(keyword) && d.url.includes("/journal/")
    );
    if (match) {
      console.log("[sync-deviantart] Found journal:", match.title, match.url);
      return match.url;
    }

    // Looser fallback: any item (journal or status) whose title contains the keyword
    const loose = data.results?.find((d) => d.title.toLowerCase().includes(keyword));
    if (loose) {
      console.log("[sync-deviantart] Found post (loose match):", loose.title, loose.url);
      return loose.url;
    }

    console.log("[sync-deviantart] No post matched keyword:", keyword);
  } catch (err) {
    console.error("[sync-deviantart] user/profile/posts error:", err);
  }

  return null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error("[sync-deviantart] Token error:", err);
    return NextResponse.json({ error: "DeviantArt token failed" }, { status: 502 });
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // Step 1: Get gallery folders for the group.
  // Folders come back in the same order the owner arranged them in DA group admin.
  // folders[0] = Featured (community spotlight source)
  // folders[1] = Current month's daily themes (hero image source)
  const foldersRes = await fetch(
    `${DA_BASE}/gallery/folders?${new URLSearchParams({ username: GROUP_NAME, calculate_size: "false", limit: "50" })}`,
    { headers: authHeaders },
  );
  if (!foldersRes.ok) {
    const body = await foldersRes.text();
    console.error("[sync-deviantart] Folders fetch failed:", body);
    return NextResponse.json({ error: "Folders fetch failed", detail: body }, { status: 502 });
  }

  const foldersData = (await foldersRes.json()) as DAFoldersResponse;
  const folders = foldersData.results ?? [];
  console.log("[sync-deviantart] Folders found:", folders.map((f) => `${f.name}:${f.folderid}`));

  // Prefer "Featured", fall back to first folder
  const featuredFolder =
    folders.find((f) => f.name.toLowerCase() === "featured") ?? folders[0];

  if (!featuredFolder) {
    return NextResponse.json({ ok: true, synced: 0, message: "No gallery folders found" });
  }

  console.log("[sync-deviantart] Using folder:", featuredFolder.name, featuredFolder.folderid);

  // Step 2: Fetch deviations from Featured folder → community spotlight
  const galleryRes = await fetch(
    `${DA_BASE}/gallery/${featuredFolder.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "24", mode: "newest" })}`,
    { headers: authHeaders },
  );
  if (!galleryRes.ok) {
    const body = await galleryRes.text();
    console.error("[sync-deviantart] Gallery fetch failed:", body);
    return NextResponse.json({ error: "Gallery fetch failed", detail: body }, { status: 502 });
  }

  const gallery = (await galleryRes.json()) as DAGalleryResponse;
  const deviations = gallery.results ?? [];
  console.log("[sync-deviantart] Deviations returned:", deviations.length);

  let synced = 0;
  for (const deviation of deviations) {
    const imageUrl = deviation.preview?.src
      ?? deviation.thumbs?.[deviation.thumbs.length - 1]?.src
      ?? null;

    try {
      await db
        .insert(communitySpotlight)
        .values({
          title: deviation.title,
          artistName: deviation.author?.username ?? "Unknown",
          thumbnailUrl: imageUrl,
          deviationUrl: deviation.url,
          publishedAt: deviation.published_time
            ? new Date(deviation.published_time * 1000)
            : null,
        })
        .onConflictDoUpdate({
          target: communitySpotlight.deviationUrl,
          set: { thumbnailUrl: imageUrl },
        });
      synced++;
    } catch (err) {
      console.error("[sync-deviantart] Insert error:", err);
    }
  }

  // Step 3: Find the current month's theme gallery.
  // nonFeaturedFolders[0] is always the current month's gallery (second in DA group admin order).
  // Only allow fallback to nonFeaturedFolders[1] (previous month) near month boundaries
  // (within 3 days of start or end of month) — never mid-month.
  const nonFeaturedFolders = folders.filter(
    (f) => f.name.toLowerCase() !== "featured"
  );
  const dayOfMonth = new Date().getUTCDate();
  const nearMonthBoundary = dayOfMonth < 3 || dayOfMonth > 28;
  console.log("[sync-deviantart] Day of month:", dayOfMonth, "nearBoundary:", nearMonthBoundary);

  const themeCandidates = nearMonthBoundary
    ? nonFeaturedFolders.slice(0, 2)
    : nonFeaturedFolders.slice(0, 1);

  let themeGalleryName: string | null = null;
  let themeHeroImageUrl: string | null = null;
  let themeHeroDeviationUrl: string | null = null;

  for (const candidate of themeCandidates) {
    try {
      // Fetch up to 24 images — if the most recent is NSFW and DA filters it,
      // we still find a valid image further down the list.
      const themeRes = await fetch(
        `${DA_BASE}/gallery/${candidate.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "24", mode: "newest" })}`,
        { headers: authHeaders }
      );
      if (!themeRes.ok) {
        console.error("[sync-deviantart] Theme gallery fetch failed for", candidate.name, themeRes.status);
        continue;
      }
      const themeData = (await themeRes.json()) as DAGalleryResponse;
      console.log("[sync-deviantart] Theme candidate", candidate.name, "returned", themeData.results?.length ?? 0, "deviations");

      // Take the first deviation that has a usable image URL
      const top = themeData.results?.find(
        (d) => d.preview?.src || (d.thumbs && d.thumbs.length > 0)
      );

      if (top) {
        themeGalleryName = candidate.name;
        themeHeroImageUrl = top.preview?.src
          ?? top.thumbs?.[top.thumbs.length - 1]?.src
          ?? null;
        themeHeroDeviationUrl = top.url;
        console.log("[sync-deviantart] Theme gallery:", candidate.name, "hero image:", themeHeroImageUrl);
        break;
      }

      // Gallery exists but has no visible images — mid-month we still claim this folder
      // as the current theme (so the badge shows the right name) but skip image update.
      if (!nearMonthBoundary) {
        themeGalleryName = candidate.name;
        console.log("[sync-deviantart] Theme gallery", candidate.name, "has no visible images mid-month; keeping gallery name, skipping image.");
        break;
      }
    } catch (err) {
      console.error("[sync-deviantart] Theme gallery fetch error:", err);
    }
  }

  // Step 4: Find journal article by satoricanton with matching title
  let journalUrl: string | null = null;
  if (themeGalleryName) {
    journalUrl = await findJournalUrl(authHeaders, themeGalleryName);
    console.log("[sync-deviantart] Journal URL:", journalUrl ?? "(not found, will use deviation URL)");
  }

  // Step 5: Upsert current theme data.
  // Always update galleryName (so the badge label stays correct).
  // Only overwrite image/link fields if we actually found an image this run —
  // this preserves a good image from a previous run when DA happens to filter today's top result.
  if (themeGalleryName) {
    try {
      const hasImage = !!themeHeroImageUrl;
      await db
        .insert(currentTheme)
        .values({
          id: "singleton",
          galleryName: themeGalleryName,
          heroImageUrl: themeHeroImageUrl,
          heroDeviationUrl: themeHeroDeviationUrl,
          journalUrl: journalUrl ?? themeHeroDeviationUrl,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: currentTheme.id,
          set: {
            galleryName: themeGalleryName,
            ...(hasImage && {
              heroImageUrl: themeHeroImageUrl,
              heroDeviationUrl: themeHeroDeviationUrl,
            }),
            // Always update journalUrl when we found one; don't clear an existing one
            ...(journalUrl && { journalUrl }),
            updatedAt: new Date(),
          },
        });
      console.log("[sync-deviantart] currentTheme upserted. galleryName:", themeGalleryName, "hasImage:", hasImage, "journalUrl:", journalUrl ?? "(unchanged)");
    } catch (err) {
      console.error("[sync-deviantart] currentTheme upsert error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    total: deviations.length,
    folder: featuredFolder.name,
    theme: themeGalleryName ?? null,
  });
}

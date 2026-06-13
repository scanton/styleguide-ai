export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySpotlight, currentTheme } from "@/drizzle/schema";

const DA_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const GROUP_NAME = "styleguideai";
const JOURNAL_AUTHOR = "satoricanton";

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

// Find the URL of a journal by satoricanton whose title matches the gallery name.
// Falls back to null so the caller can use a different URL.
async function findJournalUrl(
  authHeaders: Record<string, string>,
  galleryName: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${DA_BASE}/browse/user/journals?${new URLSearchParams({ username: JOURNAL_AUTHOR, limit: "24" })}`,
      { headers: authHeaders }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DAGalleryResponse;
    const name = galleryName.toLowerCase();
    const match = data.results?.find((d) => d.title.toLowerCase().includes(name));
    return match?.url ?? null;
  } catch {
    return null;
  }
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

  // Step 3: Find the current month's theme gallery (second folder in arranged order,
  // falling back to third if the second is empty). Fetch the top image as the hero.
  // Folders at index 0 may be Featured; the theme gallery is always second by DA admin order.
  const nonFeaturedFolders = folders.filter(
    (f) => f.name.toLowerCase() !== "featured"
  );
  let themeGalleryName: string | null = null;
  let themeHeroImageUrl: string | null = null;
  let themeHeroDeviationUrl: string | null = null;

  for (const candidate of nonFeaturedFolders.slice(0, 2)) {
    try {
      const themeRes = await fetch(
        `${DA_BASE}/gallery/${candidate.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "1", mode: "newest" })}`,
        { headers: authHeaders }
      );
      if (!themeRes.ok) continue;
      const themeData = (await themeRes.json()) as DAGalleryResponse;
      const top = themeData.results?.[0];
      if (top) {
        themeGalleryName = candidate.name;
        themeHeroImageUrl = top.preview?.src
          ?? top.thumbs?.[top.thumbs.length - 1]?.src
          ?? null;
        themeHeroDeviationUrl = top.url;
        console.log("[sync-deviantart] Theme gallery:", candidate.name, "top image:", themeHeroImageUrl);
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

  // Step 5: Upsert current theme data
  if (themeGalleryName) {
    try {
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
            heroImageUrl: themeHeroImageUrl,
            heroDeviationUrl: themeHeroDeviationUrl,
            journalUrl: journalUrl ?? themeHeroDeviationUrl,
            updatedAt: new Date(),
          },
        });
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

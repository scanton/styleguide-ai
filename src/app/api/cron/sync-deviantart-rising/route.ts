export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { and, eq, gt, sql } from "drizzle-orm";

const DA_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const GROUP_NAME = "styleguideai";
const RISING_WINDOW_HOURS = 24;

interface DATokenResponse {
  access_token: string;
}

interface DAImage {
  src: string;
  height: number;
  width: number;
}

interface DAStats {
  favourites: number;
}

interface DADeviation {
  deviationid: string;
  url: string;
  title: string;
  published_time: number;
  author: { username: string; usericon: string };
  preview: DAImage | null;
  thumbs: DAImage[];
  stats?: DAStats;
}

interface DAFolder {
  folderid: string;
  name: string;
}

interface DAFoldersResponse {
  results: DAFolder[];
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

function classifyAspectRatio(
  width: number,
  height: number
): "portrait" | "square" | "landscape" {
  const ratio = width / height;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.18) return "landscape";
  return "square";
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
    console.error("[sync-deviantart-rising] Token error:", err);
    return NextResponse.json({ error: "DeviantArt token failed" }, { status: 502 });
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const cutoff = new Date(Date.now() - RISING_WINDOW_HOURS * 60 * 60 * 1000);

  // Get gallery folders
  const foldersRes = await fetch(
    `${DA_BASE}/gallery/folders?${new URLSearchParams({ username: GROUP_NAME, calculate_size: "false", limit: "50" })}`,
    { headers: authHeaders }
  );
  if (!foldersRes.ok) {
    return NextResponse.json({ error: "Folders fetch failed" }, { status: 502 });
  }
  const { results: folders } = (await foldersRes.json()) as DAFoldersResponse;

  // Sync from Featured + top 2 theme galleries (current month + previous/next for month boundaries)
  const featured = folders.find((f) => f.name.toLowerCase() === "featured");
  const themeFolders = folders
    .filter((f) => f.name.toLowerCase() !== "featured")
    .slice(0, 2);
  const targetFolders = [featured, ...themeFolders].filter(Boolean) as DAFolder[];

  let synced = 0;
  let updated = 0;

  for (const folder of targetFolders) {
    const galleryRes = await fetch(
      `${DA_BASE}/gallery/${folder.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "50", mode: "newest" })}`,
      { headers: authHeaders }
    );
    if (!galleryRes.ok) continue;

    const { results: deviations } = (await galleryRes.json()) as DAGalleryResponse;

    for (const dev of deviations) {
      const publishedAt = dev.published_time ? new Date(dev.published_time * 1000) : null;
      if (!publishedAt || publishedAt < cutoff) continue; // outside rising window

      const preview = dev.preview ?? dev.thumbs?.[dev.thumbs.length - 1] ?? null;
      if (!preview?.src) continue;

      const thumb = dev.thumbs?.[0] ?? null;
      const aspectRatioClass = preview.width && preview.height
        ? classifyAspectRatio(preview.width, preview.height)
        : "square";

      const expiresAt = new Date(publishedAt.getTime() + RISING_WINDOW_HOURS * 60 * 60 * 1000);
      const rawEngagement = dev.stats?.favourites ?? 0;

      try {
        // Check if this deviation already exists in the window
        const [existing] = await db
          .select({ id: risingPosts.id })
          .from(risingPosts)
          .where(
            and(
              eq(risingPosts.source, "deviantart"),
              eq(risingPosts.sourceId, dev.deviationid),
              gt(risingPosts.expiresAt, new Date())
            )
          )
          .limit(1);

        if (existing) {
          // Update engagement only
          await db
            .update(risingPosts)
            .set({ rawEngagement })
            .where(eq(risingPosts.id, existing.id));
          updated++;
        } else {
          await db.insert(risingPosts).values({
            source: "deviantart",
            sourceId: dev.deviationid,
            imageUrl: preview.src,
            thumbnailUrl: thumb?.src ?? null,
            title: dev.title,
            caption: null,
            creatorName: dev.author?.username ?? "Unknown",
            creatorUrl: `https://www.deviantart.com/${dev.author?.username ?? ""}`,
            toolOrigin: null,
            toolContext: null,
            rawEngagement,
            siteLikes: 0,
            risingScore: 0,
            aspectRatioClass,
            createdAt: publishedAt,
            expiresAt,
            sourceUrl: dev.url,
          });
          synced++;
        }
      } catch (err) {
        console.error("[sync-deviantart-rising] Upsert error:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, synced, updated });
}

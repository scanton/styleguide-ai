export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySpotlight } from "@/drizzle/schema";

const DA_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const GROUP_NAME = "styleguideai";

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

interface DAThumb {
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
  thumbs: DAThumb[];
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

  // Step 1: Get gallery folders for the group to find the Featured folder UUID.
  // Groups don't have deviations in gallery/all — their content lives in folders
  // contributed by members.
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
  const target =
    folders.find((f) => f.name.toLowerCase() === "featured") ?? folders[0];

  if (!target) {
    return NextResponse.json({ ok: true, synced: 0, message: "No gallery folders found" });
  }

  console.log("[sync-deviantart] Using folder:", target.name, target.folderid);

  // Step 2: Fetch deviations from the chosen folder
  const galleryRes = await fetch(
    `${DA_BASE}/gallery/${target.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "24", mode: "newest" })}`,
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

  if (!deviations.length) {
    return NextResponse.json({ ok: true, synced: 0, total: 0, message: "Empty gallery response" });
  }

  let synced = 0;
  for (const deviation of deviations) {
    // Use the largest available thumbnail (last in array)
    const thumb = deviation.thumbs?.[deviation.thumbs.length - 1];

    try {
      await db
        .insert(communitySpotlight)
        .values({
          title: deviation.title,
          artistName: deviation.author?.username ?? "Unknown",
          thumbnailUrl: thumb?.src ?? null,
          deviationUrl: deviation.url,
          publishedAt: deviation.published_time
            ? new Date(deviation.published_time * 1000)
            : null,
        })
        .onConflictDoNothing({ target: communitySpotlight.deviationUrl });
      synced++;
    } catch (err) {
      console.error("[sync-deviantart] Insert error:", err);
    }
  }

  return NextResponse.json({ ok: true, synced, total: deviations.length, folder: target.name });
}

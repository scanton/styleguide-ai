export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySpotlight } from "@/drizzle/schema";

const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const DA_GALLERY_URL = "https://www.deviantart.com/api/v1/oauth2/gallery/all";
const GROUP_NAME = "styleguideai";

interface DATokenResponse {
  access_token: string;
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

  const params = new URLSearchParams({
    username: GROUP_NAME,
    limit: "24",
    mature_content: "false",
  });

  const galleryRes = await fetch(`${DA_GALLERY_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!galleryRes.ok) {
    const body = await galleryRes.text();
    console.error("[sync-deviantart] Gallery fetch failed:", body);
    return NextResponse.json({ error: "Gallery fetch failed" }, { status: 502 });
  }

  const gallery = (await galleryRes.json()) as DAGalleryResponse;
  const deviations = gallery.results ?? [];

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

  return NextResponse.json({ ok: true, synced, total: deviations.length });
}

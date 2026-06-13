export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communitySpotlight } from "@/drizzle/schema";

const RSS_URL =
  "https://backend.deviantart.com/rss.xml?type=deviation&q=gallery%3Astyleguideai%2FFeatured+sort%3Atime+meta%3Aall";

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const escaped = tag.replace(":", "\\:");
  const match = xml.match(
    new RegExp(`<${escaped}(?:[^>]*?)\\s${attr}="([^"]*)"[^>]*>`)
  );
  return match?.[1]?.trim() ?? "";
}

function parseThumbnail(itemXml: string): string | null {
  // Prefer the largest media:thumbnail (last one DeviantArt lists tends to be bigger)
  const all = [...itemXml.matchAll(/<media:thumbnail\s[^>]*url="([^"]*)"[^>]*/g)];
  if (!all.length) return null;
  return all[all.length - 1][1];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "StyleGuideAI/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `RSS fetch failed: ${res.status}` }, { status: 502 });
  }

  const xml = await res.text();

  // Use regex match to reliably capture <item>...</item> blocks
  const itemMatches = [...xml.matchAll(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/g)];
  const rawItems = itemMatches.map((m) => m[0]);

  // Debug: log first 300 chars of raw XML if nothing found
  if (!rawItems.length) {
    console.error("[sync-deviantart] No <item> elements found. RSS preview:", xml.slice(0, 300));
    return NextResponse.json({
      ok: true,
      synced: 0,
      total: 0,
      debug: "No <item> elements found — check RSS URL or group name",
    });
  }

  let synced = 0;
  for (const item of rawItems) {
    const title = extractTag(item, "title");
    // <link> in RSS is often a text node after <guid>; try both
    const link = extractTag(item, "link") || extractAttr(item, "guid", "isPermaLink") || extractTag(item, "guid");
    const deviationUrl = link.startsWith("http") ? link : extractTag(item, "guid");
    const artistName = extractTag(item, "dc:creator") || "Unknown";
    const pubDateStr = extractTag(item, "pubDate");
    const thumbnailUrl = parseThumbnail(item);

    if (!title || !deviationUrl) continue;

    try {
      await db
        .insert(communitySpotlight)
        .values({
          title,
          artistName,
          thumbnailUrl: thumbnailUrl ?? null,
          deviationUrl,
          publishedAt: pubDateStr ? new Date(pubDateStr) : null,
        })
        .onConflictDoNothing({ target: communitySpotlight.deviationUrl });
      synced++;
    } catch (err) {
      console.error("Spotlight insert error:", err);
    }
  }

  return NextResponse.json({ ok: true, synced, total: rawItems.length });
}

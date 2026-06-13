export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, artMovements } from "@/drizzle/schema";

const MEDIUM_RSS = "https://medium.com/feed/@satoricanton";

interface ParsedArticle {
  title: string;
  slug: string;
  summary: string | null;
  mediumUrl: string;
  publishedAt: Date | null;
  tags: string[];
  thumbnailUrl: string | null;
}

function extractCdata(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`, "i");
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function extractAllCdata(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const val = (m[1] ?? m[2] ?? "").trim();
    if (val) results.push(val);
  }
  return results;
}

function extractFirstImage(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function slugFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    return last.slice(0, 200) || url.slice(-40);
  } catch {
    return url.slice(-40);
  }
}

function parseRssItems(xml: string): ParsedArticle[] {
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  const parsed: ParsedArticle[] = [];
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];

    const title = extractCdata(block, "title");
    const link = extractCdata(block, "link") || block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim() || "";
    const pubDateStr = extractCdata(block, "pubDate") || block.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]?.trim();
    const description = extractCdata(block, "description");
    const content = extractCdata(block, "content:encoded");
    const categories = extractAllCdata(block, "category");

    if (!title || !link) continue;

    // Strip HTML from description for a clean excerpt
    const summary = description.replace(/<[^>]+>/g, "").trim().slice(0, 500) || null;

    const thumbnailUrl = extractFirstImage(content) ?? extractFirstImage(description) ?? null;

    parsed.push({
      title,
      slug: slugFromUrl(link),
      summary,
      mediumUrl: link,
      publishedAt: pubDateStr ? new Date(pubDateStr) : null,
      tags: categories,
      thumbnailUrl,
    });
  }

  return parsed;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch RSS
  const rssRes = await fetch(MEDIUM_RSS, {
    headers: { "User-Agent": "StyleGuideAI/1.0 (RSS sync)" },
  });
  if (!rssRes.ok) {
    console.error("[sync-articles] RSS fetch failed:", rssRes.status);
    return NextResponse.json({ error: "RSS fetch failed" }, { status: 502 });
  }
  const xml = await rssRes.text();

  const items = parseRssItems(xml);
  console.log("[sync-articles] RSS items parsed:", items.length);

  if (!items.length) {
    return NextResponse.json({ ok: true, synced: 0, message: "No items in feed" });
  }

  // Load all art movement names once for tag matching
  const movements = await db
    .select({ id: artMovements.id, name: artMovements.name })
    .from(artMovements);

  const movementNames = movements.map((mv) => ({
    id: mv.id,
    lower: mv.name.toLowerCase(),
  }));

  let synced = 0;
  for (const item of items) {
    const lowerTags = item.tags.map((t) => t.toLowerCase());
    const lowerTitle = item.title.toLowerCase();

    const movementMatches = movementNames
      .filter(
        (mv) =>
          lowerTags.some((t) => t.includes(mv.lower) || mv.lower.includes(t)) ||
          lowerTitle.includes(mv.lower),
      )
      .map((mv) => mv.id);

    try {
      await db
        .insert(articles)
        .values({
          title: item.title,
          slug: item.slug,
          summary: item.summary,
          mediumUrl: item.mediumUrl,
          publishedAt: item.publishedAt,
          tags: item.tags,
          thumbnailUrl: item.thumbnailUrl,
          movementMatches,
        })
        .onConflictDoUpdate({
          target: articles.mediumUrl,
          set: {
            title: item.title,
            summary: item.summary,
            tags: item.tags,
            thumbnailUrl: item.thumbnailUrl,
            movementMatches,
            updatedAt: new Date(),
          },
        });
      synced++;
    } catch (err) {
      console.error("[sync-articles] Insert error for", item.slug, err);
    }
  }

  console.log("[sync-articles] Synced:", synced, "of", items.length);
  return NextResponse.json({ ok: true, synced, total: items.length });
}

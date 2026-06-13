export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles } from "@/drizzle/schema";
import { desc, ilike, or, count, and, notInArray } from "drizzle-orm";
import { ARTICLES_BLOCKLIST } from "@/data/articles-blocklist";

const PAGE_SIZE = 24;
const BLOCKED_SLUGS = Array.from(ARTICLES_BLOCKLIST);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const visibleOnly = notInArray(articles.slug, BLOCKED_SLUGS);
  const where = q
    ? and(visibleOnly, or(ilike(articles.title, `%${q}%`), ilike(articles.summary, `%${q}%`)))
    : visibleOnly;

  try {
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          summary: articles.summary,
          mediumUrl: articles.mediumUrl,
          publishedAt: articles.publishedAt,
          tags: articles.tags,
          thumbnailUrl: articles.thumbnailUrl,
        })
        .from(articles)
        .where(where)
        .orderBy(desc(articles.publishedAt))
        .limit(PAGE_SIZE)
        .offset(offset),

      db
        .select({ total: count() })
        .from(articles)
        .where(where),
    ]);

    return NextResponse.json({ articles: rows, total: Number(total), page, limit: PAGE_SIZE });
  } catch (err) {
    console.error("[/api/articles] Error:", err);
    return NextResponse.json({ articles: [], total: 0, page, limit: PAGE_SIZE });
  }
}

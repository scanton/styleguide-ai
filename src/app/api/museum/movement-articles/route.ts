import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles } from "@/drizzle/schema";
import { and, notInArray, desc, sql } from "drizzle-orm";
import { ARTICLES_BLOCKLIST } from "@/data/articles-blocklist";

const BLOCKED_SLUGS = Array.from(ARTICLES_BLOCKLIST);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movementId = searchParams.get("movementId")?.trim();

  if (!movementId) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const rows = await db
      .select({
        title: articles.title,
        slug: articles.slug,
        mediumUrl: articles.mediumUrl,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(
        and(
          sql`${articles.movementMatches} @> ARRAY[${movementId}]::text[]`,
          notInArray(articles.slug, BLOCKED_SLUGS)
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(5);

    return NextResponse.json({ articles: rows });
  } catch (err) {
    console.error("[/api/museum/movement-articles] Error:", err);
    return NextResponse.json({ articles: [] });
  }
}

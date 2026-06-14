import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles } from "@/drizzle/schema";
import { and, notInArray, or, ilike, desc } from "drizzle-orm";
import { ARTICLES_BLOCKLIST } from "@/data/articles-blocklist";
import { getArtists } from "@/lib/museum-data";

const BLOCKED_SLUGS = Array.from(ARTICLES_BLOCKLIST);

/** Build a set of title search terms from an artist's display name.
 *  Strips parentheticals like "(Mike Winkelmann)" and strips quote marks,
 *  then collects the full cleaned name plus any individual word ≥5 chars.
 *  This catches both full-name matches and nickname-only article titles.
 */
function searchTermsForName(name: string): string[] {
  const stripped = name
    .replace(/\s*\(.*?\)/g, "")  // remove (Mike Winkelmann) style suffixes
    .replace(/"/g, "")            // remove quote chars from "Craola" style nicknames
    .trim();

  const terms = new Set<string>();
  terms.add(stripped.toLowerCase());

  for (const word of stripped.split(/\s+/)) {
    if (word.length >= 5) terms.add(word.toLowerCase());
  }

  return Array.from(terms);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId")?.trim();

  if (!artistId) return NextResponse.json({ articles: [] });

  const artist = getArtists().find((a) => a.id === artistId);
  if (!artist) return NextResponse.json({ articles: [] });

  const terms = searchTermsForName(artist.name);
  if (terms.length === 0) return NextResponse.json({ articles: [] });

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
          or(...terms.map((t) => ilike(articles.title, `%${t}%`))),
          notInArray(articles.slug, BLOCKED_SLUGS)
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(5);

    return NextResponse.json({ articles: rows });
  } catch (err) {
    console.error("[/api/museum/artist-articles] Error:", err);
    return NextResponse.json({ articles: [] });
  }
}

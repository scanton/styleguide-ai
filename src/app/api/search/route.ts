export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, artMovements, articles } from "@/drizzle/schema";
import { sql, ilike, or } from "drizzle-orm";

export interface SearchResult {
  id: string;
  type: "artist" | "movement" | "article";
  title: string;
  subtitle?: string;
  href: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const pattern = `%${q}%`;

    const [artistRows, movementRows, articleRows] = await Promise.all([
      db
        .select({ id: artists.id, name: artists.name, movements: artists.movements })
        .from(artists)
        .where(ilike(artists.name, pattern))
        .limit(5),

      db
        .select({ id: artMovements.id, name: artMovements.name, startYear: artMovements.startYear, endYear: artMovements.endYear })
        .from(artMovements)
        .where(or(ilike(artMovements.name, pattern), ilike(artMovements.description, pattern)))
        .limit(5),

      db
        .select({ id: articles.id, title: articles.title, summary: articles.summary, mediumUrl: articles.mediumUrl, tags: articles.tags })
        .from(articles)
        .where(or(ilike(articles.title, pattern), ilike(articles.summary, pattern)))
        .limit(5),
    ]);

    const results: SearchResult[] = [
      ...artistRows.map((a) => ({
        id: `artist-${a.id}`,
        type: "artist" as const,
        title: a.name,
        subtitle: (a.movements ?? []).slice(0, 2).join(", ") || undefined,
        href: `/museum/artist/${a.id}`,
      })),
      ...movementRows.map((m) => ({
        id: `movement-${m.id}`,
        type: "movement" as const,
        title: m.name,
        subtitle: m.endYear ? `${m.startYear}–${m.endYear}` : `${m.startYear}–present`,
        href: `/museum/movement/${m.id}`,
      })),
      ...articleRows.map((a) => ({
        id: `article-${a.id}`,
        type: "article" as const,
        title: a.title,
        subtitle: (a.tags ?? []).slice(0, 3).join(", ") || a.summary?.slice(0, 80) || undefined,
        href: a.mediumUrl,
      })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ results: [] });
  }
}

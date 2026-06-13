export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, artMovements } from "@/drizzle/schema";

const MEDIUM_USER = "satoricanton";
const XSSI_PREFIX = "])}while(1);</x>";
const MAX_PAGES = 40; // 400+ articles max (10 per page from internal API)

interface MediumPost {
  id: string;
  title: string;
  slug: string;
  firstPublishedAt: number;
  homeCollectionId?: string;
  virtuals?: {
    subtitle?: string;
    previewImage?: { imageId?: string };
    tags?: Array<{ slug: string; name: string }>;
  };
}

interface MediumApiResponse {
  success: boolean;
  payload: {
    references?: { Post?: Record<string, MediumPost> };
    paging?: { next?: { to?: string; source?: string; limit?: number } };
  };
}

function buildMediumUrl(post: MediumPost): string {
  return `https://medium.com/@${MEDIUM_USER}/${post.slug}`;
}

function buildThumbnailUrl(imageId: string | undefined): string | null {
  if (!imageId) return null;
  return `https://miro.medium.com/v2/resize:fit:800/${imageId}`;
}

async function fetchPage(cursor?: string): Promise<{ posts: MediumPost[]; nextCursor?: string }> {
  const params = new URLSearchParams({ format: "json", source: "overview", limit: "10" });
  if (cursor) params.set("to", cursor);
  const url = `https://medium.com/@${MEDIUM_USER}?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "StyleGuideAI/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Medium API ${res.status}`);

  const text = await res.text();
  const json = JSON.parse(text.startsWith(XSSI_PREFIX) ? text.slice(XSSI_PREFIX.length) : text) as MediumApiResponse;

  if (!json.success) return { posts: [] };

  const posts = Object.values(json.payload.references?.Post ?? {});
  const nextCursor = json.payload.paging?.next?.to;

  return { posts, nextCursor };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Paginate through all Medium posts
  const allPosts: MediumPost[] = [];
  let cursor: string | undefined;
  let page = 0;

  try {
    do {
      const { posts, nextCursor } = await fetchPage(cursor);
      allPosts.push(...posts);
      cursor = nextCursor;
      page++;
      console.log(`[sync-articles] Page ${page}: ${posts.length} posts (total so far: ${allPosts.length})`);
    } while (cursor && page < MAX_PAGES);
  } catch (err) {
    console.error("[sync-articles] Fetch error:", err);
    return NextResponse.json({ error: "Medium API fetch failed", detail: String(err) }, { status: 502 });
  }

  console.log("[sync-articles] Total posts fetched:", allPosts.length);

  if (!allPosts.length) {
    return NextResponse.json({ ok: true, synced: 0, message: "No posts returned" });
  }

  // Load all art movement names for tag matching
  const movements = await db.select({ id: artMovements.id, name: artMovements.name }).from(artMovements);
  const movementNames = movements.map((mv) => ({ id: mv.id, lower: mv.name.toLowerCase() }));

  let synced = 0;
  for (const post of allPosts) {
    const tags = (post.virtuals?.tags ?? []).map((t) => t.name);
    const lowerTags = tags.map((t) => t.toLowerCase());
    const lowerTitle = post.title.toLowerCase();

    const movementMatches = movementNames
      .filter(
        (mv) =>
          lowerTags.some((t) => t.includes(mv.lower) || mv.lower.includes(t)) ||
          lowerTitle.includes(mv.lower),
      )
      .map((mv) => mv.id);

    const imageId = post.virtuals?.previewImage?.imageId;
    const summary = post.virtuals?.subtitle ?? null;
    const mediumUrl = buildMediumUrl(post);
    const slug = post.slug || post.id;

    try {
      await db
        .insert(articles)
        .values({
          title: post.title,
          slug: slug.slice(0, 200),
          summary,
          mediumUrl,
          publishedAt: post.firstPublishedAt ? new Date(post.firstPublishedAt) : null,
          tags,
          thumbnailUrl: buildThumbnailUrl(imageId),
          movementMatches,
        })
        .onConflictDoUpdate({
          target: articles.mediumUrl,
          set: {
            title: post.title,
            summary,
            tags,
            thumbnailUrl: buildThumbnailUrl(imageId),
            movementMatches,
            updatedAt: new Date(),
          },
        });
      synced++;
    } catch (err) {
      console.error("[sync-articles] Insert error for", slug, err);
    }
  }

  console.log("[sync-articles] Synced:", synced, "of", allPosts.length);
  return NextResponse.json({ ok: true, synced, total: allPosts.length, pages: page });
}

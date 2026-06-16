export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts, risingVotes } from "@/drizzle/schema";
import { and, gt, eq, sql, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import crypto from "crypto";

export type RisingSource = "deviantart" | "discord" | "site";
export type AspectRatioClass = "portrait" | "square" | "landscape";

export interface RisingPost {
  id: string;
  source: RisingSource;
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  creatorName: string;
  creatorUrl: string | null;
  toolOrigin: string | null;
  toolContext: string | null;
  siteLikes: number;
  rawEngagement: number;
  risingScore: number;
  aspectRatioClass: AspectRatioClass;
  createdAt: Date | null;
  expiresAt: Date;
  sourceUrl: string | null;
  hasVoted: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") as RisingSource | "tools" | "all" | null;

  const session = await auth();
  let voterId: string;
  if (session?.user?.id) {
    voterId = session.user.id;
  } else {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ua = request.headers.get("user-agent") ?? "";
    voterId = crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex");
  }

  const now = new Date();

  // Build source filter
  let sourceFilter;
  if (source === "deviantart" || source === "discord" || source === "site") {
    sourceFilter = eq(risingPosts.source, source);
  } else if (source === "tools") {
    sourceFilter = sql`${risingPosts.toolOrigin} IS NOT NULL`;
  }
  // "all" or null → no filter

  const whereClause = sourceFilter
    ? and(gt(risingPosts.expiresAt, now), sourceFilter)
    : gt(risingPosts.expiresAt, now);

  const posts = await db
    .select()
    .from(risingPosts)
    .where(whereClause)
    .orderBy(
      sql`(${risingPosts.rawEngagement} + ${risingPosts.siteLikes})::float /
          POWER(EXTRACT(EPOCH FROM (NOW() - ${risingPosts.createdAt})) / 3600.0 + 2, 1.5) DESC`
    )
    .limit(200);

  // Fetch this visitor's votes on the returned post IDs
  const postIds = posts.map((p) => p.id);
  let votedIds = new Set<string>();
  if (postIds.length > 0) {
    const votes = await db
      .select({ postId: risingVotes.postId })
      .from(risingVotes)
      .where(
        and(
          eq(risingVotes.voterId, voterId),
          inArray(risingVotes.postId, postIds)
        )
      );
    votedIds = new Set(votes.map((v) => v.postId));
  }

  const result: RisingPost[] = posts.map((p) => ({
    id: p.id,
    source: p.source as RisingSource,
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbnailUrl,
    title: p.title,
    caption: p.caption,
    creatorName: p.creatorName,
    creatorUrl: p.creatorUrl,
    toolOrigin: p.toolOrigin,
    toolContext: p.toolContext,
    siteLikes: p.siteLikes ?? 0,
    rawEngagement: p.rawEngagement ?? 0,
    risingScore: p.risingScore ?? 0,
    aspectRatioClass: (p.aspectRatioClass ?? "square") as AspectRatioClass,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    sourceUrl: p.sourceUrl,
    hasVoted: votedIds.has(p.id),
  }));

  return NextResponse.json({ posts: result });
}

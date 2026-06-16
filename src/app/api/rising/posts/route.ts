export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts, risingVotes } from "@/drizzle/schema";
import { and, gt, eq, sql, inArray, ne } from "drizzle-orm";
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
  imageWidth: number | null;
  imageHeight: number | null;
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

  const notHidden = eq(risingPosts.hidden, false);

  // Site uploads and tool-originated posts draw from the last 100 regardless of age —
  // these tabs are for showcasing our tools, not the time-windowed Rising feed.
  const isHistoricalTab = source === "site" || source === "tools";

  let posts;
  if (isHistoricalTab) {
    const tabFilter =
      source === "tools"
        ? sql`${risingPosts.toolOrigin} IS NOT NULL`
        : eq(risingPosts.source, "site");

    posts = await db
      .select()
      .from(risingPosts)
      .where(and(notHidden, tabFilter))
      .orderBy(sql`${risingPosts.createdAt} DESC`)
      .limit(100);
  } else {
    // "all", "deviantart", "discord" — respect the 24h expiry window
    const sourceFilter =
      source === "deviantart" || source === "discord"
        ? eq(risingPosts.source, source)
        : undefined;

    const whereClause = sourceFilter
      ? and(notHidden, gt(risingPosts.expiresAt, now), sourceFilter)
      : and(notHidden, gt(risingPosts.expiresAt, now));

    posts = await db
      .select()
      .from(risingPosts)
      .where(whereClause)
      .orderBy(
        sql`(${risingPosts.rawEngagement} + ${risingPosts.siteLikes})::float /
            POWER(EXTRACT(EPOCH FROM (NOW() - ${risingPosts.createdAt})) / 3600.0 + 2, 1.5) DESC`
      )
      .limit(200);
  }

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
    imageWidth: p.imageWidth ?? null,
    imageHeight: p.imageHeight ?? null,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    sourceUrl: p.sourceUrl,
    hasVoted: votedIds.has(p.id),
  }));

  return NextResponse.json({ posts: result });
}

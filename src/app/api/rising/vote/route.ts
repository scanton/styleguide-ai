import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts, risingVotes } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  const { postId } = (await request.json()) as { postId: string };
  if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

  const session = await auth();
  let voterId: string;
  if (session?.user?.id) {
    voterId = session.user.id;
  } else {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ua = request.headers.get("user-agent") ?? "";
    voterId = crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex");
  }

  // Check post is still active
  const [post] = await db
    .select({ id: risingPosts.id, expiresAt: risingPosts.expiresAt, siteLikes: risingPosts.siteLikes })
    .from(risingPosts)
    .where(eq(risingPosts.id, postId))
    .limit(1);

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.expiresAt < new Date()) return NextResponse.json({ error: "Post expired" }, { status: 410 });

  // Check if already voted (last 24h for anon; ever for auth)
  const [existing] = await db
    .select()
    .from(risingVotes)
    .where(and(eq(risingVotes.postId, postId), eq(risingVotes.voterId, voterId)))
    .limit(1);

  if (existing) {
    // Toggle off
    await db
      .delete(risingVotes)
      .where(and(eq(risingVotes.postId, postId), eq(risingVotes.voterId, voterId)));
    await db
      .update(risingPosts)
      .set({ siteLikes: sql`GREATEST(0, ${risingPosts.siteLikes} - 1)` })
      .where(eq(risingPosts.id, postId));
    return NextResponse.json({ voted: false, likes: Math.max(0, (post.siteLikes ?? 0) - 1) });
  }

  // Cast vote
  await db.insert(risingVotes).values({ postId, voterId });
  await db
    .update(risingPosts)
    .set({ siteLikes: sql`${risingPosts.siteLikes} + 1` })
    .where(eq(risingPosts.id, postId));

  return NextResponse.json({ voted: true, likes: (post.siteLikes ?? 0) + 1 });
}

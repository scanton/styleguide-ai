export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

export interface MuseumRender {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  creatorName: string;
  siteLikes: number;
  rawEngagement: number;
  createdAt: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType"); // "movement" | "artist"
  const id = searchParams.get("id");

  if (!entityType || !id) {
    return NextResponse.json({ renders: [] });
  }

  try {
    const renders = await db
      .select({
        id: risingPosts.id,
        imageUrl: risingPosts.imageUrl,
        thumbnailUrl: risingPosts.thumbnailUrl,
        creatorName: risingPosts.creatorName,
        siteLikes: risingPosts.siteLikes,
        rawEngagement: risingPosts.rawEngagement,
        createdAt: risingPosts.createdAt,
      })
      .from(risingPosts)
      .where(
        and(
          eq(risingPosts.toolOrigin, "museum"),
          eq(risingPosts.hidden, false),
          // Match the JSON field: toolContext::jsonb->>'id' = id
          sql`${risingPosts.toolContext}::jsonb->>'id' = ${id}`,
          sql`${risingPosts.toolContext}::jsonb->>'entityType' = ${entityType}`
        )
      )
      .orderBy(
        sql`(${risingPosts.siteLikes} + ${risingPosts.rawEngagement}) DESC`
      )
      .limit(20);

    return NextResponse.json({ renders });
  } catch {
    return NextResponse.json({ renders: [] });
  }
}

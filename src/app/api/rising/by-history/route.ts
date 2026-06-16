export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

export interface HistoryRender {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  siteLikes: number;
  rawEngagement: number;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);

  if (ids.length === 0) return NextResponse.json({ byId: {} });

  try {
    const posts = await db
      .select({
        id: risingPosts.id,
        imageUrl: risingPosts.imageUrl,
        thumbnailUrl: risingPosts.thumbnailUrl,
        siteLikes: risingPosts.siteLikes,
        rawEngagement: risingPosts.rawEngagement,
        historyEntryId: sql<string>`${risingPosts.toolContext}::jsonb->>'historyEntryId'`,
      })
      .from(risingPosts)
      .where(
        and(
          eq(risingPosts.hidden, false),
          sql`${risingPosts.toolContext}::jsonb->>'historyEntryId' = ANY(ARRAY[${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `
          )}])`
        )
      )
      .orderBy(sql`(${risingPosts.siteLikes} + ${risingPosts.rawEngagement}) DESC`);

    const byId: Record<string, HistoryRender[]> = {};
    for (const post of posts) {
      const hid = post.historyEntryId;
      if (!hid) continue;
      if (!byId[hid]) byId[hid] = [];
      byId[hid].push({
        id: post.id,
        imageUrl: post.imageUrl,
        thumbnailUrl: post.thumbnailUrl,
        siteLikes: post.siteLikes ?? 0,
        rawEngagement: post.rawEngagement ?? 0,
      });
    }

    return NextResponse.json({ byId });
  } catch {
    return NextResponse.json({ byId: {} });
  }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityEvents } from "@/drizzle/schema";
import { desc, ilike, sql, count } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const q = searchParams.get("q")?.trim();
  const offset = (page - 1) * limit;

  const baseQuery = db
    .select()
    .from(communityEvents)
    .orderBy(desc(communityEvents.postedAt));

  const rows = await (q
    ? baseQuery.where(ilike(communityEvents.title, `%${q}%`)).limit(limit).offset(offset)
    : baseQuery.limit(limit).offset(offset));

  const [{ total }] = await db
    .select({ total: count() })
    .from(communityEvents)
    .where(q ? ilike(communityEvents.title, `%${q}%`) : sql`true`);

  return NextResponse.json({ events: rows, total: Number(total), page, limit });
}

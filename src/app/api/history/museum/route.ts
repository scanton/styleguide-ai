export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { museumHistory } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ entries: [] });
  const entries = await db
    .select()
    .from(museumHistory)
    .where(eq(museumHistory.userId, session.user.id))
    .orderBy(desc(museumHistory.createdAt))
    .limit(50);
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entityType, entityId, entityName, sceneDetails, prompt } = await req.json();
  if (!prompt || !entityType || !entityId || !entityName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const [entry] = await db
    .insert(museumHistory)
    .values({ userId: session.user.id, entityType, entityId, entityName, sceneDetails: sceneDetails || null, prompt })
    .returning({ id: museumHistory.id });
  return NextResponse.json({ id: entry.id });
}

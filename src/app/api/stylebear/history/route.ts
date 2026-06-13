export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stylebearHistory } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(stylebearHistory)
    .where(eq(stylebearHistory.userId, session.user.id))
    .orderBy(desc(stylebearHistory.createdAt))
    .limit(200);

  return NextResponse.json({ history: rows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { prompt, inputs } = body as { prompt?: string; inputs?: string };
  if (!prompt || !inputs) {
    return NextResponse.json({ error: "prompt and inputs required" }, { status: 422 });
  }

  const [row] = await db
    .insert(stylebearHistory)
    .values({ userId: session.user.id, prompt, inputs })
    .returning();

  return NextResponse.json({ entry: row }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 422 });
  }

  await db
    .delete(stylebearHistory)
    .where(and(eq(stylebearHistory.id, id), eq(stylebearHistory.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

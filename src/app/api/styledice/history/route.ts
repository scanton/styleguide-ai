export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stylediceHistory } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(stylediceHistory)
    .where(eq(stylediceHistory.userId, session.user.id))
    .orderBy(desc(stylediceHistory.createdAt))
    .limit(50);

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

  const { diceValues, generatedPrompt } = body as {
    diceValues?: string[];
    generatedPrompt?: string;
  };

  if (!Array.isArray(diceValues) || diceValues.length !== 6) {
    return NextResponse.json(
      { error: "diceValues must be an array of 6 strings" },
      { status: 422 }
    );
  }

  const [row] = await db
    .insert(stylediceHistory)
    .values({
      userId: session.user.id,
      diceValues: JSON.stringify(diceValues),
      generatedPrompt: generatedPrompt ?? null,
    })
    .returning();

  return NextResponse.json({ entry: row }, { status: 201 });
}

export async function PATCH(request: Request) {
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

  const { id, generatedPrompt } = body as { id?: string; generatedPrompt?: string };
  if (!id || !generatedPrompt) {
    return NextResponse.json({ error: "id and generatedPrompt required" }, { status: 422 });
  }

  // Only update rows belonging to this user
  const [row] = await db
    .update(stylediceHistory)
    .set({ generatedPrompt })
    .where(eq(stylediceHistory.id, id))
    .returning();

  return NextResponse.json({ entry: row });
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
    .delete(stylediceHistory)
    .where(and(eq(stylediceHistory.id, id), eq(stylediceHistory.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

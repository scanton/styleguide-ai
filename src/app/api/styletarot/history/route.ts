export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { styletarotHistory } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(styletarotHistory)
    .where(eq(styletarotHistory.userId, session.user.id))
    .orderBy(desc(styletarotHistory.createdAt))
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

  const { cardIndices, generatedPrompt } = body as {
    // Static cards store their numeric index; community cards store their
    // stable string id (a synthetic position-based index would drift as
    // new community cards are added).
    cardIndices?: (number | string)[];
    generatedPrompt?: string;
  };

  if (
    !Array.isArray(cardIndices) ||
    cardIndices.length !== 5 ||
    !cardIndices.every((i) => typeof i === "number" || typeof i === "string")
  ) {
    return NextResponse.json(
      { error: "cardIndices must be an array of 5 numbers or strings" },
      { status: 422 }
    );
  }

  const [row] = await db
    .insert(styletarotHistory)
    .values({
      userId: session.user.id,
      cardIndices: JSON.stringify(cardIndices),
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

  const [row] = await db
    .update(styletarotHistory)
    .set({ generatedPrompt })
    .where(and(eq(styletarotHistory.id, id), eq(styletarotHistory.userId, session.user.id)))
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
    .delete(styletarotHistory)
    .where(and(eq(styletarotHistory.id, id), eq(styletarotHistory.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

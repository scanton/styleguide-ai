export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      displayName: users.displayName,
      preferredAspectRatio: users.preferredAspectRatio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
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

  const { displayName, preferredAspectRatio } = body as {
    displayName?: string;
    preferredAspectRatio?: string | null;
  };
  if (typeof displayName !== "string") {
    return NextResponse.json({ error: "displayName must be a string" }, { status: 422 });
  }

  const trimmed = displayName.trim().slice(0, 60);
  const aspectRatio = typeof preferredAspectRatio === "string" ? preferredAspectRatio || null : undefined;

  const updates: Partial<{ displayName: string | null; preferredAspectRatio: string | null }> = {
    displayName: trimmed || null,
  };
  if (aspectRatio !== undefined) {
    updates.preferredAspectRatio = aspectRatio;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({ displayName: users.displayName, preferredAspectRatio: users.preferredAspectRatio });

  return NextResponse.json({
    displayName: updated?.displayName ?? null,
    preferredAspectRatio: updated?.preferredAspectRatio ?? null,
  });
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, risingPosts } from "@/drizzle/schema";
import { eq, or, and } from "drizzle-orm";
import { locales } from "@/i18n/routing";

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
      preferredLanguage: users.preferredLanguage,
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

  const { displayName, preferredAspectRatio, preferredLanguage } = body as {
    displayName?: string;
    preferredAspectRatio?: string | null;
    preferredLanguage?: string | null;
  };

  if (typeof displayName !== "string") {
    return NextResponse.json({ error: "displayName must be a string" }, { status: 422 });
  }

  const trimmed = displayName.trim().slice(0, 60);
  const aspectRatio = typeof preferredAspectRatio === "string" ? preferredAspectRatio || null : undefined;
  const lang =
    typeof preferredLanguage === "string" && locales.includes(preferredLanguage as typeof locales[number])
      ? preferredLanguage
      : preferredLanguage === null
      ? null
      : undefined;

  // Read current display name before the update so we can match old posts by name
  const [current] = await db
    .select({ displayName: users.displayName, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const oldCreatorName = current?.displayName ?? current?.name ?? null;

  const updates: Partial<{
    displayName: string | null;
    preferredAspectRatio: string | null;
    preferredLanguage: string | null;
  }> = { displayName: trimmed || null };

  if (aspectRatio !== undefined) updates.preferredAspectRatio = aspectRatio;
  if (lang !== undefined) updates.preferredLanguage = lang;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({
      displayName: users.displayName,
      preferredAspectRatio: users.preferredAspectRatio,
      preferredLanguage: users.preferredLanguage,
    });

  // Sync creatorName on all of this user's site posts:
  // - Posts with sourceId = userId (new posts going forward)
  // - Posts where creatorName matches the old name (legacy posts uploaded before sourceId was stored)
  if (trimmed) {
    const conditions = [eq(risingPosts.source, "site")];
    const nameConditions = [eq(risingPosts.sourceId, session.user.id)];
    if (oldCreatorName) nameConditions.push(eq(risingPosts.creatorName, oldCreatorName));

    await db
      .update(risingPosts)
      .set({ creatorName: trimmed })
      .where(and(...conditions, or(...nameConditions)));
  }

  return NextResponse.json({
    displayName: updated?.displayName ?? null,
    preferredAspectRatio: updated?.preferredAspectRatio ?? null,
    preferredLanguage: updated?.preferredLanguage ?? null,
  });
}

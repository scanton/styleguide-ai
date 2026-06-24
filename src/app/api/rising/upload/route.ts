import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { risingPosts, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

// Client compresses to ≤3.5 MB; 5 MB server cap keeps a safety margin
// while staying well under Vercel's 4.5 MB serverless body limit.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// 24-hour expiry matches all other Rising posts; the blob itself is permanent
const SITE_EXPIRY_HOURS = 24;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to share to Rising" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string | null)?.trim() || null;
    const toolOrigin = (formData.get("toolOrigin") as string | null) || null;
    const toolContext = (formData.get("toolContext") as string | null) || null;
    const aspectRatioClass =
      (formData.get("aspectRatioClass") as "portrait" | "square" | "landscape" | null) ?? "square";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const pathname = `rising/${session.user.id}/${Date.now()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SITE_EXPIRY_HOURS * 60 * 60 * 1000);

    // Use displayName from DB so the user's chosen name (including emoji etc.) is always current
    const [dbUser] = await db
      .select({ name: users.name, displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const displayName =
      dbUser?.displayName?.trim() ||
      dbUser?.name?.trim() ||
      dbUser?.email?.split("@")[0] ||
      session.user.email?.split("@")[0] ||
      "Anonymous";

    const [post] = await db
      .insert(risingPosts)
      .values({
        source: "site",
        sourceId: null,
        imageUrl: blob.url,
        thumbnailUrl: null,
        title: null,
        caption,
        creatorName: displayName,
        creatorUrl: null,
        toolOrigin,
        toolContext,
        rawEngagement: 0,
        siteLikes: 0,
        risingScore: 0,
        aspectRatioClass,
        createdAt: now,
        expiresAt,
        sourceUrl: null,
      })
      .returning({ id: risingPosts.id });

    return NextResponse.json({ ok: true, postId: post.id, imageUrl: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[rising/upload]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

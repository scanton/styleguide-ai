import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { communityTarotCards } from "@/drizzle/schema";
import { isNotNull, desc, and, ne } from "drizzle-orm";
import { put } from "@vercel/blob";

const VALID_TYPES = new Set([
  "movement", "artist", "media", "technique",
  "subject", "setting", "inspiration",
]);

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

// GET /api/styletarot/community-cards — complete cards only
// Excludes: title="" (pre-submit stubs) and type="" (pending type fix)
export async function GET() {
  const cards = await db
    .select()
    .from(communityTarotCards)
    .where(and(
      isNotNull(communityTarotCards.imageUrl),
      ne(communityTarotCards.title, ""),
      ne(communityTarotCards.type, ""),
    ))
    .orderBy(desc(communityTarotCards.createdAt));

  return NextResponse.json({ cards });
}

// POST /api/styletarot/community-cards — create card + upload image (web)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = (form.get("title") as string | null)?.trim();
  const description = (form.get("description") as string | null)?.trim();
  const type = (form.get("type") as string | null)?.trim().toLowerCase();
  const creator = (form.get("creator") as string | null)?.trim();
  const file = form.get("file") as File | null;

  if (!title || !description || !type || !creator || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid card type" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image too large (max 3.5 MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const safeName = title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  const pathname = `styletarot-community/${Date.now()}_${safeName}.${ext}`;

  const blob = await put(pathname, file, { access: "public", contentType: file.type });

  const [card] = await db
    .insert(communityTarotCards)
    .values({
      title,
      description,
      type,
      creator,
      creatorUserId: session.user.id,
      imageUrl: blob.url,
      source: "web",
    })
    .returning();

  return NextResponse.json({ ok: true, card });
}

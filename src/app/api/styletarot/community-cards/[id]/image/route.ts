import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityTarotCards } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";

// PATCH /api/styletarot/community-cards/[id]/image
// Discord step 2: bot downloads image from Discord CDN, uploads to Blob, finalises card.
// Authenticated via DISCORD_INTERNAL_SECRET header (set by the bot route).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.DISCORD_BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  let body: { imageUrl: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  // Download from Discord CDN
  const dlRes = await fetch(body.imageUrl);
  if (!dlRes.ok) {
    return NextResponse.json({ error: "Failed to download image" }, { status: 502 });
  }
  const imageBlob = await dlRes.blob();
  const contentType = body.contentType ?? imageBlob.type ?? "image/png";
  const ext = contentType.split("/")[1] ?? "png";
  const pathname = `styletarot-community/discord_${id}.${ext}`;

  const stored = await put(pathname, imageBlob, { access: "public", contentType });

  const [card] = await db
    .update(communityTarotCards)
    .set({ imageUrl: stored.url })
    .where(eq(communityTarotCards.id, id))
    .returning();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, card });
}

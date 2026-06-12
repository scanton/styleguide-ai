export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityEvents } from "@/drizzle/schema";

interface EventPayload {
  title: string;
  description?: string;
  eventDate: string;
  discordMessageId?: string;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-discord-secret");
  if (secret !== process.env.DISCORD_BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, eventDate, discordMessageId } = body as EventPayload;

  if (!title?.trim() || !eventDate) {
    return NextResponse.json({ error: "title and eventDate required" }, { status: 422 });
  }

  try {
    const [event] = await db
      .insert(communityEvents)
      .values({
        title: title.trim(),
        description: description?.trim() ?? null,
        eventDate: new Date(eventDate),
        discordMessageId: discordMessageId ?? null,
      })
      .onConflictDoNothing({ target: communityEvents.discordMessageId })
      .returning();

    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error("Event insert error:", err);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { and, eq, gt, inArray } from "drizzle-orm";

const DISCORD_API = "https://discord.com/api/v10";
const RISING_WINDOW_HOURS = 24;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
// Set DISCORD_RISING_CHANNEL_ID in Vercel env to the #art-rising channel ID
const RISING_CHANNEL_ID = process.env.DISCORD_RISING_CHANNEL_ID;

function botHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

interface DiscordAttachment {
  url: string;
  proxy_url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

interface DiscordReaction {
  count: number;
  emoji: { name: string };
}

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { id: string; username: string; global_name?: string };
  attachments: DiscordAttachment[];
  reactions?: DiscordReaction[];
}

function classifyAspectRatio(
  w: number,
  h: number
): "portrait" | "square" | "landscape" {
  const ratio = w / h;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.18) return "landscape";
  return "square";
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!RISING_CHANNEL_ID) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "DISCORD_RISING_CHANNEL_ID not set — configure the channel in Vercel env vars",
    });
  }

  const headers = botHeaders();
  const cutoff = new Date(Date.now() - RISING_WINDOW_HOURS * 60 * 60 * 1000);

  // ── Step 1: Fetch recent messages from the Rising channel ────────────────
  const msgsRes = await fetch(
    `${DISCORD_API}/channels/${RISING_CHANNEL_ID}/messages?limit=100`,
    { headers }
  );
  if (!msgsRes.ok) {
    console.error("[sync-discord-rising] Messages fetch failed:", msgsRes.status);
    return NextResponse.json({ error: "Messages fetch failed" }, { status: 502 });
  }
  const messages = (await msgsRes.json()) as DiscordMessage[];

  // Filter to messages with image attachments posted within the rising window
  const imageMsgs = messages.filter((m) => {
    const postedAt = new Date(m.timestamp);
    if (postedAt < cutoff) return false;
    return m.attachments.some((a) => a.content_type?.startsWith("image/"));
  });

  // ── Step 2: Sync new posts ───────────────────────────────────────────────
  let synced = 0;
  let updated = 0;

  // Check which message IDs already exist
  const messageIds = imageMsgs.map((m) => m.id);
  let existingSourceIds = new Set<string>();
  if (messageIds.length > 0) {
    const existing = await db
      .select({ sourceId: risingPosts.sourceId })
      .from(risingPosts)
      .where(
        and(
          eq(risingPosts.source, "discord"),
          inArray(risingPosts.sourceId, messageIds)
        )
      );
    existingSourceIds = new Set(existing.map((r) => r.sourceId).filter(Boolean) as string[]);
  }

  for (const msg of imageMsgs) {
    const imageAttachment = msg.attachments.find((a) =>
      a.content_type?.startsWith("image/")
    );
    if (!imageAttachment) continue;

    const publishedAt = new Date(msg.timestamp);
    const expiresAt = new Date(publishedAt.getTime() + RISING_WINDOW_HOURS * 60 * 60 * 1000);
    const rawEngagement = (msg.reactions ?? []).reduce((sum, r) => sum + r.count, 0);
    const displayName = msg.author.global_name ?? msg.author.username;
    const sourceUrl = `https://discord.com/channels/${GUILD_ID}/${RISING_CHANNEL_ID}/${msg.id}`;

    const imageWidth = imageAttachment.width ?? null;
    const imageHeight = imageAttachment.height ?? null;
    const aspectRatioClass =
      imageWidth && imageHeight
        ? classifyAspectRatio(imageWidth, imageHeight)
        : "square";

    if (existingSourceIds.has(msg.id)) {
      // Update reaction count on existing active post
      await db
        .update(risingPosts)
        .set({ rawEngagement })
        .where(
          and(
            eq(risingPosts.source, "discord"),
            eq(risingPosts.sourceId, msg.id),
            gt(risingPosts.expiresAt, new Date())
          )
        );
      updated++;
    } else {
      await db.insert(risingPosts).values({
        source: "discord",
        sourceId: msg.id,
        imageUrl: imageAttachment.url,
        thumbnailUrl: imageAttachment.proxy_url ?? null,
        title: null,
        caption: msg.content?.trim() || null,
        creatorName: displayName,
        creatorUrl: `https://discord.com/users/${msg.author.id}`,
        toolOrigin: null,
        toolContext: null,
        rawEngagement,
        siteLikes: 0,
        risingScore: 0,
        aspectRatioClass,
        imageWidth,
        imageHeight,
        createdAt: publishedAt,
        expiresAt,
        sourceUrl,
      });
      synced++;
    }
  }

  return NextResponse.json({ ok: true, synced, updated, scanned: imageMsgs.length });
}

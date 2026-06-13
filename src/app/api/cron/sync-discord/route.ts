export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityEvents } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";

const DISCORD_API = "https://discord.com/api/v10";
const FORUM_CHANNEL_ID = process.env.DISCORD_EVENTS_CHANNEL_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

function botHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

interface DiscordTag {
  id: string;
  name: string;
}

interface DiscordThread {
  id: string;
  name: string;
  parent_id: string;
  thread_metadata: { create_timestamp: string };
  applied_tags: string[];
}

interface DiscordAttachment {
  url: string;
  content_type?: string;
}

interface DiscordMessage {
  content: string;
  attachments: DiscordAttachment[];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = botHeaders();

  // 1. Get forum channel info for tag name → id mapping
  const channelRes = await fetch(`${DISCORD_API}/channels/${FORUM_CHANNEL_ID}`, { headers });
  if (!channelRes.ok) {
    return NextResponse.json({ error: "Failed to fetch channel" }, { status: 502 });
  }
  const channel = (await channelRes.json()) as { available_tags?: DiscordTag[] };
  const tagMap = new Map<string, string>(
    (channel.available_tags ?? []).map((t) => [t.id, t.name])
  );

  // 2. Active threads in guild, filtered to our forum channel
  const activeRes = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/threads/active`, { headers });
  const { threads: allActive = [] } = activeRes.ok
    ? ((await activeRes.json()) as { threads: DiscordThread[] })
    : { threads: [] };
  const activeThreads = allActive.filter((t) => t.parent_id === FORUM_CHANNEL_ID);

  // 3. Recent archived threads from the forum channel
  const archivedRes = await fetch(
    `${DISCORD_API}/channels/${FORUM_CHANNEL_ID}/threads/archived/public?limit=25`,
    { headers }
  );
  const { threads: archivedThreads = [] } = archivedRes.ok
    ? ((await archivedRes.json()) as { threads: DiscordThread[] })
    : { threads: [] };

  const allThreads = [...activeThreads, ...archivedThreads];
  if (!allThreads.length) {
    return NextResponse.json({ ok: true, synced: 0, message: "No threads found" });
  }

  // 4. Separate new threads from existing ones
  const threadIds = allThreads.map((t) => t.id);
  const existing = await db
    .select({ discordThreadId: communityEvents.discordThreadId })
    .from(communityEvents)
    .where(inArray(communityEvents.discordThreadId, threadIds));
  const existingIds = new Set(existing.map((e) => e.discordThreadId));

  const newThreads = allThreads.filter((t) => !existingIds.has(t.id));
  const existingThreads = allThreads.filter((t) => existingIds.has(t.id));

  // 5. Patch thread_url on already-synced records (no extra API calls needed)
  for (const thread of existingThreads) {
    const threadUrl = `https://discord.com/channels/${GUILD_ID}/${thread.id}`;
    await db
      .insert(communityEvents)
      .values({ discordThreadId: thread.id, title: thread.name, threadUrl })
      .onConflictDoUpdate({ target: communityEvents.discordThreadId, set: { threadUrl } })
      .catch(() => {});
  }

  if (!newThreads.length) {
    return NextResponse.json({ ok: true, synced: 0, patched: existingThreads.length, message: "URLs patched, no new threads" });
  }

  // 6. Fetch opening message for each new thread and insert
  let synced = 0;
  for (const thread of newThreads) {
    try {
      // In Discord forum posts the opening message shares the thread's snowflake ID
      const msgRes = await fetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}`,
        { headers }
      );
      const msg: DiscordMessage = msgRes.ok
        ? ((await msgRes.json()) as DiscordMessage)
        : { content: "", attachments: [] };

      const imageUrl =
        msg.attachments?.find((a) => a.content_type?.startsWith("image/"))?.url ?? null;

      const tagNames = (thread.applied_tags ?? [])
        .map((id) => tagMap.get(id))
        .filter((n): n is string => Boolean(n));

      const threadUrl = `https://discord.com/channels/${GUILD_ID}/${thread.id}`;

      await db
        .insert(communityEvents)
        .values({
          discordThreadId: thread.id,
          title: thread.name,
          description: msg.content?.slice(0, 2000) || null,
          imageUrl,
          discordTags: tagNames,
          threadUrl,
          postedAt: new Date(thread.thread_metadata.create_timestamp),
        })
        .onConflictDoNothing({ target: communityEvents.discordThreadId });

      synced++;
    } catch (err) {
      console.error(`Failed to process thread ${thread.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, synced, patched: existingThreads.length, total: allThreads.length });
}

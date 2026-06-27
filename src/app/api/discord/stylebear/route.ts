export const dynamic = "force-dynamic";

import { after } from "next/server";
import { verifyKey } from "discord-interactions";
import { buildBotUserMessage, getSystemPrompt } from "@/lib/stylebear-server";
import { callLLM } from "@/lib/openrouter";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { communityTarotCards } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const DISCORD_API = "https://discord.com/api/v10";

const PING = 1;
const APPLICATION_COMMAND = 2;
const MODAL_SUBMIT = 5;

const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_CHANNEL_MESSAGE = 5;
const MODAL = 9;

const EMBED_COLOR = 0x6b21a8;

const MODAL_ID_STYLEBEAR = "stylebear_modal";
const MODAL_ID_ADD_CARD = "add_card_modal";

const VALID_TYPES = new Set([
  "movement", "artist", "media", "technique",
  "subject", "setting", "inspiration",
]);

interface DiscordTextInput {
  type: number;
  custom_id: string;
  value?: string;
}

interface DiscordActionRow {
  type: number;
  components: DiscordTextInput[];
}

interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  content_type?: string;
  size: number;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
}

interface DiscordInteraction {
  type: number;
  token: string;
  member?: { user?: DiscordUser; nick?: string };
  user?: DiscordUser;
  data?: {
    name?: string;
    options?: { name: string; value: string | boolean; type?: number }[];
    resolved?: { attachments?: Record<string, DiscordAttachment> };
    custom_id?: string;
    components?: DiscordActionRow[];
  };
}

function parseModalValues(rows: DiscordActionRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    for (const comp of row.components) {
      if (comp.custom_id && comp.value) out[comp.custom_id] = comp.value.trim();
    }
  }
  return out;
}

function parseOptions(
  options: { name: string; value: string | boolean }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of options) out[opt.name] = String(opt.value);
  return out;
}

function getDisplayName(body: DiscordInteraction): string {
  return (
    body.member?.nick ??
    body.member?.user?.global_name ??
    body.member?.user?.username ??
    body.user?.global_name ??
    body.user?.username ??
    "Community Member"
  );
}

async function sendFollowUp(appId: string, token: string, content: object): Promise<void> {
  await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
}

// ── StyleBear ──────────────────────────────────────────────────────────────────

async function processStyleBear(appId: string, token: string, opts: Record<string, string>): Promise<void> {
  const userMessage = buildBotUserMessage({
    movement: opts.movement,
    media: opts.media,
    style: opts.style,
    scene: opts.scene,
  });

  const systemPrompt = getSystemPrompt(opts.style);

  let generatedPrompt: string;
  try {
    const result = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage || "Generate a creative AI art prompt." },
      ],
      { maxTokens: 1024 }
    );
    generatedPrompt = result.content.trim();
  } catch {
    await sendFollowUp(appId, token, {
      content: "Something went wrong generating your prompt — try again or visit <https://www.styleguideai.com/stylebear>.",
    });
    return;
  }

  const fields: { name: string; value: string; inline: boolean }[] = [];
  if (opts.movement) fields.push({ name: "Movement", value: opts.movement, inline: true });
  if (opts.media) fields.push({ name: "Media", value: opts.media, inline: true });
  if (opts.style) fields.push({ name: "Style", value: opts.style, inline: true });

  await sendFollowUp(appId, token, {
    embeds: [
      {
        title: "✨ Your StyleBear Prompt",
        description: generatedPrompt,
        color: EMBED_COLOR,
        fields,
        footer: {
          text: "Render this for free at arena.ai/image · share in #⬆️-rising to showcase your creation on styleguideai.com/rising",
        },
        url: "https://www.styleguideai.com/stylebear",
      },
    ],
  });
}

// ── Add Card: modal submit processing ────────────────────────────────────────
// Called after the user fills in the text modal. The stub record already has
// the Discord CDN image URL stored from the slash command step.

async function processAddCard(
  appId: string,
  token: string,
  cardId: string,
  opts: Record<string, string>
): Promise<void> {
  const { title, description, type, creator } = opts;

  if (!title || !description || !type || !creator) {
    await sendFollowUp(appId, token, {
      content: "❌ Missing required fields. Please try `/add-card` again.",
    });
    await db.delete(communityTarotCards).where(eq(communityTarotCards.id, cardId));
    return;
  }

  const normalizedType = type.toLowerCase().trim();
  if (!VALID_TYPES.has(normalizedType)) {
    const validList = Array.from(VALID_TYPES).join(", ");
    await sendFollowUp(appId, token, {
      content: `❌ **${type}** isn't a valid card type. Valid types: ${validList}\n\nPlease try \`/add-card\` again.`,
    });
    await db.delete(communityTarotCards).where(eq(communityTarotCards.id, cardId));
    return;
  }

  // Look up the stub record to get the temporary Discord CDN image URL
  const [stub] = await db
    .select()
    .from(communityTarotCards)
    .where(eq(communityTarotCards.id, cardId));

  if (!stub?.imageUrl) {
    await sendFollowUp(appId, token, {
      content: "❌ Couldn't find your image. Please try `/add-card` again.",
    });
    return;
  }

  // Download from Discord CDN and upload to Vercel Blob
  let blobUrl: string;
  try {
    const dlRes = await fetch(stub.imageUrl);
    if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`);
    const imageBlob = await dlRes.blob();
    const contentType = imageBlob.type || "image/png";
    const ext = contentType.split("/")[1]?.split("+")[0] ?? "png";
    const stored = await put(
      `styletarot-community/${cardId}.${ext}`,
      imageBlob,
      { access: "public", contentType, addRandomSuffix: false }
    );
    blobUrl = stored.url;
  } catch {
    await sendFollowUp(appId, token, {
      content: "❌ Failed to store your image. Please try `/add-card` again.",
    });
    await db.delete(communityTarotCards).where(eq(communityTarotCards.id, cardId));
    return;
  }

  // Finalize the record
  const [card] = await db
    .update(communityTarotCards)
    .set({ title, description, type: normalizedType, creator, imageUrl: blobUrl })
    .where(eq(communityTarotCards.id, cardId))
    .returning();

  if (!card) {
    await sendFollowUp(appId, token, {
      content: "❌ Something went wrong saving your card. Please try again.",
    });
    return;
  }

  await sendFollowUp(appId, token, {
    embeds: [
      {
        title: `🎴 New Card: ${card.title}`,
        description: card.description,
        color: EMBED_COLOR,
        image: { url: blobUrl },
        fields: [
          { name: "Type", value: normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1), inline: true },
          { name: "Creator", value: card.creator, inline: true },
        ],
        footer: {
          text: "This card is now live in the StyleTarot draw pool at styleguideai.com/styletarot",
        },
        url: "https://www.styleguideai.com/styletarot",
      },
    ],
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  const APP_ID = process.env.DISCORD_APP_ID;

  if (!PUBLIC_KEY || !APP_ID) {
    return new Response("Bot not configured", { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";

  const isValid = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
  if (!isValid) return new Response("Invalid request signature", { status: 401 });

  const body = JSON.parse(rawBody) as DiscordInteraction;

  if (body.type === PING) return Response.json({ type: PONG });

  if (body.type === APPLICATION_COMMAND) {
    const commandName = body.data?.name;

    // /stylebear — open StyleBear modal
    if (commandName === "stylebear") {
      return Response.json({
        type: MODAL,
        data: {
          custom_id: MODAL_ID_STYLEBEAR,
          title: "StyleBear Prompt Generator",
          components: [
            {
              type: 1,
              components: [{
                type: 4, custom_id: "scene", label: "What do you want to create?",
                style: 2, required: true, max_length: 500,
                placeholder: "Describe your idea — StyleBear will build the full AI art prompt around it.",
              }],
            },
          ],
        },
      });
    }

    // /add-card image:[attachment] — store stub, open text modal
    if (commandName === "add-card") {
      const opts = parseOptions(body.data?.options ?? []);
      const attachmentId = opts.image;
      const attachment = body.data?.resolved?.attachments?.[attachmentId];

      if (!attachment) {
        return Response.json({
          type: CHANNEL_MESSAGE,
          data: { content: "❌ Please attach an image when using `/add-card`.", flags: 64 },
        });
      }

      if (!attachment.content_type?.startsWith("image/")) {
        return Response.json({
          type: CHANNEL_MESSAGE,
          data: { content: "❌ Please attach an image file (PNG, JPG, or WebP).", flags: 64 },
        });
      }

      const displayName = getDisplayName(body);

      // Create a stub record with the temporary Discord CDN URL.
      // The title/description/type will be filled in on modal submit.
      // The GET endpoint excludes stubs where title = "".
      const [stub] = await db
        .insert(communityTarotCards)
        .values({
          title: "",
          description: "",
          type: "",
          creator: displayName,
          imageUrl: attachment.url,
          source: "discord",
        })
        .returning();

      return Response.json({
        type: MODAL,
        data: {
          custom_id: `${MODAL_ID_ADD_CARD}:${stub.id}`,
          title: "Add a StyleTarot Card",
          components: [
            {
              type: 1,
              components: [{
                type: 4, custom_id: "title", label: "Card Title",
                style: 1, required: true, max_length: 100,
                placeholder: "e.g. Watercolor Textures",
              }],
            },
            {
              type: 1,
              components: [{
                type: 4, custom_id: "description", label: "Card Description",
                style: 2, required: true, max_length: 500,
                placeholder: "Describe the mood, feeling, technique, or concept…",
              }],
            },
            {
              type: 1,
              components: [{
                type: 4, custom_id: "type", label: "Card Type",
                style: 1, required: true, max_length: 20,
                placeholder: "artist · movement · media · technique · subject · setting · inspiration",
              }],
            },
            {
              type: 1,
              components: [{
                type: 4, custom_id: "creator", label: "Your Name",
                style: 1, required: true, max_length: 100,
                value: displayName,
              }],
            },
          ],
        },
      });
    }

    return Response.json({ type: PONG });
  }

  if (body.type === MODAL_SUBMIT) {
    // StyleBear
    if (body.data?.custom_id === MODAL_ID_STYLEBEAR) {
      const opts = parseModalValues(body.data.components ?? []);
      after(() => processStyleBear(APP_ID, body.token, opts));
      return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
    }

    // Add Card — custom_id is "add_card_modal:stc_xxxxxxxx"
    if (body.data?.custom_id?.startsWith(MODAL_ID_ADD_CARD + ":")) {
      const cardId = body.data.custom_id.split(":")[1];
      const opts = parseModalValues(body.data.components ?? []);
      after(() => processAddCard(APP_ID, body.token, cardId, opts));
      return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
    }
  }

  return Response.json({ type: PONG });
}

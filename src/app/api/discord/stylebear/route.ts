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

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
const MODAL_SUBMIT = 5;

// Discord response types
const PONG = 1;
const DEFERRED_CHANNEL_MESSAGE = 5;
const MODAL = 9;

// Deep purple — matches StyleGuideAI brand
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

interface DiscordInteraction {
  type: number;
  token: string;
  data?: {
    name?: string;
    options?: { name: string; value: string | boolean; type?: number }[];
    resolved?: {
      attachments?: Record<string, DiscordAttachment>;
    };
    custom_id?: string;
    components?: DiscordActionRow[];
  };
}

function parseModalValues(rows: DiscordActionRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    for (const comp of row.components) {
      if (comp.custom_id && comp.value) {
        out[comp.custom_id] = comp.value.trim();
      }
    }
  }
  return out;
}

function parseOptions(
  options: { name: string; value: string | boolean; type?: number }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of options) {
    out[opt.name] = String(opt.value);
  }
  return out;
}

async function sendFollowUp(appId: string, token: string, content: object): Promise<void> {
  await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
}

// ── StyleBear ──────────────────────────────────────────────────────────────────

async function processAndReply(appId: string, token: string, opts: Record<string, string>): Promise<void> {
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

// ── Add Card: step 1 modal submit ─────────────────────────────────────────────

async function processAddCard(
  appId: string,
  token: string,
  opts: Record<string, string>
): Promise<void> {
  const { title, description, type, creator } = opts;

  if (!title || !description || !type || !creator) {
    await sendFollowUp(appId, token, {
      content: "❌ Missing required fields. Please fill in title, description, type, and creator.",
    });
    return;
  }

  const normalizedType = type.toLowerCase().trim();
  if (!VALID_TYPES.has(normalizedType)) {
    const validList = Array.from(VALID_TYPES).join(", ");
    await sendFollowUp(appId, token, {
      content: `❌ Invalid card type **${type}**. Valid types: ${validList}`,
    });
    return;
  }

  let card: typeof communityTarotCards.$inferSelect;
  try {
    [card] = await db
      .insert(communityTarotCards)
      .values({
        title,
        description,
        type: normalizedType,
        creator,
        source: "discord",
      })
      .returning();
  } catch {
    await sendFollowUp(appId, token, {
      content: "❌ Failed to save card. Please try again.",
    });
    return;
  }

  await sendFollowUp(appId, token, {
    embeds: [
      {
        title: "🎴 Card Created — Image Needed!",
        description: `**${title}** by ${creator} has been added.\n\n> ${description}`,
        color: EMBED_COLOR,
        fields: [
          { name: "Type", value: normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1), inline: true },
          { name: "Card ID", value: `\`${card.id}\``, inline: true },
        ],
        footer: {
          text: `Now upload your card image using: /add-card-image card_id:${card.id} image:[your image]`,
        },
      },
    ],
  });
}

// ── Add Card: step 2 image upload ─────────────────────────────────────────────

async function processAddCardImage(
  appId: string,
  token: string,
  cardId: string,
  attachment: DiscordAttachment
): Promise<void> {
  // Download from Discord CDN
  let imageBlob: Blob;
  try {
    const dlRes = await fetch(attachment.url);
    if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`);
    imageBlob = await dlRes.blob();
  } catch {
    await sendFollowUp(appId, token, {
      content: `❌ Could not download the image. Please try again.`,
    });
    return;
  }

  const contentType = attachment.content_type ?? imageBlob.type ?? "image/png";
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "png";
  const pathname = `styletarot-community/discord_${cardId}.${ext}`;

  // Upload to Vercel Blob
  let blobUrl: string;
  try {
    const stored = await put(pathname, imageBlob, { access: "public", contentType, addRandomSuffix: false });
    blobUrl = stored.url;
  } catch {
    await sendFollowUp(appId, token, {
      content: `❌ Failed to store image. Please try again.`,
    });
    return;
  }

  // Update card in DB
  const [card] = await db
    .update(communityTarotCards)
    .set({ imageUrl: blobUrl })
    .where(eq(communityTarotCards.id, cardId))
    .returning();

  if (!card) {
    await sendFollowUp(appId, token, {
      content: `❌ Card \`${cardId}\` not found. Check the card ID and try again.`,
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
          { name: "Type", value: card.type.charAt(0).toUpperCase() + card.type.slice(1), inline: true },
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
  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as DiscordInteraction;

  // Discord PING
  if (body.type === PING) {
    return Response.json({ type: PONG });
  }

  // Slash commands
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
              components: [
                {
                  type: 4,
                  custom_id: "scene",
                  label: "What do you want to create?",
                  style: 2,
                  required: true,
                  placeholder: "Describe your idea — StyleBear will build the full AI art prompt around it.",
                  max_length: 500,
                },
              ],
            },
          ],
        },
      });
    }

    // /add-card — open Add Card modal
    if (commandName === "add-card") {
      return Response.json({
        type: MODAL,
        data: {
          custom_id: MODAL_ID_ADD_CARD,
          title: "Add a StyleTarot Card",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "title",
                  label: "Card Title",
                  style: 1,
                  required: true,
                  placeholder: "e.g. Watercolor Textures",
                  max_length: 100,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "description",
                  label: "Card Description",
                  style: 2,
                  required: true,
                  placeholder: "Describe the style or technique in evocative terms…",
                  max_length: 500,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "type",
                  label: "Card Type",
                  style: 1,
                  required: true,
                  placeholder: "artist, movement, media, technique, subject, setting, or inspiration",
                  max_length: 20,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "creator",
                  label: "Your Name",
                  style: 1,
                  required: true,
                  placeholder: "Your display name",
                  max_length: 100,
                },
              ],
            },
          ],
        },
      });
    }

    // /add-card-image — upload image for a pending card
    if (commandName === "add-card-image") {
      const opts = parseOptions(body.data?.options ?? []);
      const cardId = opts.card_id;
      const attachmentId = opts.image;
      const attachment = body.data?.resolved?.attachments?.[attachmentId];

      if (!cardId || !attachment) {
        return Response.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: { content: "❌ Missing card_id or image.", flags: 64 }, // ephemeral
        });
      }

      after(() => processAddCardImage(APP_ID, body.token, cardId, attachment));
      return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
    }

    // Unknown command — fall through to PONG
    return Response.json({ type: PONG });
  }

  // Modal submissions
  if (body.type === MODAL_SUBMIT) {
    // StyleBear modal
    if (body.data?.custom_id === MODAL_ID_STYLEBEAR) {
      const opts = parseModalValues(body.data.components ?? []);
      after(() => processAndReply(APP_ID, body.token, opts));
      return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
    }

    // Add Card modal
    if (body.data?.custom_id === MODAL_ID_ADD_CARD) {
      const opts = parseModalValues(body.data.components ?? []);
      after(() => processAddCard(APP_ID, body.token, opts));
      return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
    }
  }

  return Response.json({ type: PONG });
}

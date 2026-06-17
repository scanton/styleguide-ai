export const dynamic = "force-dynamic";

import { after } from "next/server";
import { verifyKey } from "discord-interactions";
import { buildBotUserMessage, getSystemPrompt } from "@/lib/stylebear-server";
import { callLLM } from "@/lib/openrouter";

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

const MODAL_ID = "stylebear_modal";

interface DiscordTextInput {
  type: number;
  custom_id: string;
  value?: string;
}

interface DiscordActionRow {
  type: number;
  components: DiscordTextInput[];
}

interface DiscordInteraction {
  type: number;
  token: string;
  data?: {
    // slash command options
    options?: { name: string; value: string | boolean }[];
    // modal submit
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

async function sendFollowUp(appId: string, token: string, content: object): Promise<void> {
  await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
}

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

  // Build tag fields for whichever inputs were provided
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

  // Discord PING — endpoint verification
  if (body.type === PING) {
    return Response.json({ type: PONG });
  }

  // Slash command /stylebear — open the modal form
  if (body.type === APPLICATION_COMMAND) {
    return Response.json({
      type: MODAL,
      data: {
        custom_id: MODAL_ID,
        title: "StyleBear Prompt Generator",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "scene",
                label: "What do you want to create?",
                style: 2, // paragraph
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

  // Modal submitted — defer, generate, reply
  if (body.type === MODAL_SUBMIT && body.data?.custom_id === MODAL_ID) {
    const opts = parseModalValues(body.data.components ?? []);

    after(() => processAndReply(APP_ID, body.token, opts));

    // Public deferred response — no ephemeral flag
    return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
  }

  return Response.json({ type: PONG });
}

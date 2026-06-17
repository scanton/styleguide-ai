export const dynamic = "force-dynamic";

import { after } from "next/server";
import { verifyDiscordRequest } from "@/lib/discord-verify";
import { buildBotUserMessage, getSystemPrompt } from "@/lib/stylebear-server";
import { callLLM } from "@/lib/openrouter";

const DISCORD_API = "https://discord.com/api/v10";

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Discord response types
const PONG = 1;
const DEFERRED_CHANNEL_MESSAGE = 5;

// Discord message flags
const EPHEMERAL = 64;

// Deep purple — matches StyleGuideAI brand
const EMBED_COLOR = 0x6b21a8;

interface DiscordOption {
  name: string;
  value: string | boolean;
}

interface DiscordInteraction {
  type: number;
  token: string;
  data?: {
    options?: DiscordOption[];
  };
}

function parseOptions(raw: DiscordOption[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of raw) {
    out[opt.name] = String(opt.value);
  }
  return out;
}

async function sendFollowUp(
  appId: string,
  token: string,
  content: object
): Promise<void> {
  await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
}

async function processCommand(
  appId: string,
  token: string,
  opts: Record<string, string>
): Promise<void> {
  const userMessage = buildBotUserMessage({
    movement: opts.movement,
    media: opts.media,
    style: opts.style,
    scene: opts.scene,
    aspect: opts.aspect,
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
      content:
        "Something went wrong generating your prompt — try again or visit <https://styleguideai.com/stylebear>.",
    });
    return;
  }

  // Build tag fields from whichever options the user supplied
  const fields: { name: string; value: string; inline: boolean }[] = [];
  if (opts.movement) fields.push({ name: "Movement", value: opts.movement, inline: true });
  if (opts.media) fields.push({ name: "Media", value: opts.media, inline: true });
  if (opts.style) fields.push({ name: "Style", value: opts.style, inline: true });
  if (opts.aspect) fields.push({ name: "Aspect", value: opts.aspect, inline: true });

  await sendFollowUp(appId, token, {
    embeds: [
      {
        title: "✨ Your StyleBear Prompt",
        description: generatedPrompt,
        color: EMBED_COLOR,
        fields,
        footer: {
          text: "Render this and share your image at styleguideai.com/rising",
        },
        url: "https://styleguideai.com/stylebear",
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

  // Read raw body — signature verification requires the exact bytes Discord sent
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";

  const isValid = await verifyDiscordRequest(signature, timestamp, rawBody, PUBLIC_KEY);
  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as DiscordInteraction;

  // Discord PING — required for endpoint verification in Developer Portal
  if (body.type === PING) {
    return Response.json({ type: PONG });
  }

  if (body.type === APPLICATION_COMMAND) {
    const opts = parseOptions(body.data?.options ?? []);
    const isShare = opts.share === "true";

    // Fire LLM + follow-up after the response is sent (next/server after())
    after(() => processCommand(APP_ID, body.token, opts));

    return Response.json({
      type: DEFERRED_CHANNEL_MESSAGE,
      data: isShare ? {} : { flags: EPHEMERAL },
    });
  }

  // Unknown interaction type — acknowledge gracefully
  return Response.json({ type: PONG });
}

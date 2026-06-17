/**
 * Server-side prompt builder for StyleBear.
 * Mirrors the buildPrompt logic in StyleBearClient.tsx without any client
 * component dependencies — safe to import in API routes and server actions.
 */
import { artMovements } from "@/data/stylebear/art-movements";
import { mediaTypes } from "@/data/stylebear/media-types";
import { systemPrompts } from "@/data/stylebear/system-prompts";

export interface StyleBearBotOptions {
  movement?: string;
  media?: string;
  style?: string;
  scene?: string;
  aspect?: string;
}

export function buildBotUserMessage(opts: StyleBearBotOptions): string {
  const parts: string[] = [];

  if (opts.scene?.trim()) {
    parts.push(opts.scene.trim());
  }

  if (opts.movement?.trim()) {
    parts.push(`[${opts.movement.trim()}]`);

    // Pick a random representative artist from the movement data, same as the web app
    const entry = artMovements.find(
      (m) => m.name.toLowerCase() === opts.movement!.trim().toLowerCase()
    );
    if (entry?.artists?.length) {
      const artist = entry.artists[Math.floor(Math.random() * entry.artists.length)];
      parts.push(`in the style of [${artist}]`);
    }
  }

  if (opts.media?.trim()) {
    parts.push(`made with [${opts.media.trim()}]`);

    const entry = mediaTypes.find(
      (m) => m.name.toLowerCase() === opts.media!.trim().toLowerCase()
    );
    if (entry?.artists?.length) {
      const artist = entry.artists[Math.floor(Math.random() * entry.artists.length)];
      parts.push(`in the style of [${artist}]`);
    }
  }

  if (opts.aspect?.trim()) {
    parts.push(`aspect ratio ${opts.aspect.trim()}`);
  }

  return parts
    .join(", ")
    .replace(/,\s*,+/g, ",")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}

export function getSystemPrompt(style?: string): string {
  return systemPrompts[style ?? "modern"] ?? systemPrompts.modern;
}

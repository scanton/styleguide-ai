import { artMovements } from "../../src/data/stylebear/art-movements";
import { mediaTypes } from "../../src/data/stylebear/media-types";
import { promptData } from "../../src/data/stylebear/prompt-data";

const sortedMovements = [...artMovements].sort((a, b) => a.name.localeCompare(b.name));
const sortedMedia = [...mediaTypes].sort((a, b) => a.name.localeCompare(b.name));

export { sortedMovements, sortedMedia };

export function processWildcards(str: string): string {
  let prev: string | null = null;
  let result = str;
  while (prev !== result) {
    prev = result;
    result = result.replace(/\{[^{}]*\}/g, (match) => {
      const options = match.slice(1, -1).split("|");
      return options[Math.floor(Math.random() * options.length)].trim();
    });
  }
  return result;
}

export function buildPrompt(
  subject: string,
  footer: string,
  selectedMovements: string[],
  selectedMedia: string[],
  checkedOptions: Set<string>
): string {
  const parts: string[] = [];

  if (subject.trim()) parts.push(processWildcards(subject.trim()));

  const movements = selectedMovements.filter(Boolean);
  const media = selectedMedia.filter(Boolean);

  const artistsFromMovements = movements.flatMap((name) => {
    const entry = sortedMovements.find((m) => m.name === name);
    if (!entry?.artists.length) return [];
    return [entry.artists[Math.floor(Math.random() * entry.artists.length)]];
  });
  const artistsFromMedia = media.flatMap((name) => {
    const entry = sortedMedia.find((m) => m.name === name);
    if (!entry?.artists.length) return [];
    return [entry.artists[Math.floor(Math.random() * entry.artists.length)]];
  });

  if (movements.length) parts.push("[" + [...new Set(movements)].join(" | ") + "]");
  if (media.length) parts.push("made with [" + [...new Set(media)].join(" | ") + "]");

  const allArtists = [...new Set([...artistsFromMovements, ...artistsFromMedia])];
  if (allArtists.length) parts.push("in the style mix of [" + allArtists.join(" | ") + "]");

  for (const key of checkedOptions) {
    const value = promptData[key as keyof typeof promptData];
    if (value) parts.push(processWildcards(value));
  }

  if (footer.trim()) parts.push(processWildcards(footer.trim()));

  return parts
    .join(", ")
    .replace(/,\s*,+/g, ",")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}

export function randomizeSelections(count: number, list: { name: string }[]): string[] {
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((m) => m.name);
}

export const ASPECT_RATIOS = [
  { label: "9:16 — Portrait (Mobile)", value: "9:16" },
  { label: "2:3 — Portrait (Photo)", value: "2:3" },
  { label: "3:4 — Portrait (Standard)", value: "3:4" },
  { label: "1:1 — Square", value: "1:1" },
  { label: "4:3 — Landscape (Standard)", value: "4:3" },
  { label: "3:2 — Landscape (Photo)", value: "3:2" },
  { label: "16:9 — Landscape (Widescreen)", value: "16:9" },
  { label: "21:9 — Ultrawide (Cinematic)", value: "21:9" },
] as const;

export const DEFAULT_ASPECT_RATIO = "9:16";

export const PROMPT_TYPES = [
  { label: "Modern / Detailed", value: "modern" },
  { label: "Flux", value: "flux" },
  { label: "SDXL / SD1.5", value: "sdxl" },
  { label: "Midjourney", value: "midjourney" },
  { label: "Tag (Pony / Illustrious)", value: "tag" },
  { label: "Dall-3 (substitute copyright)", value: "censor" },
  { label: "PGv3 (very descriptive)", value: "v3" },
  { label: "Greeting Card", value: "greeting_card" },
] as const;

export const STYLEBEAR_MODEL = "openrouter/free";
export const TRIPLE_COUNT = 3;

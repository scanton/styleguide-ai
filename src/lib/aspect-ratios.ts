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

export type AspectRatioValue = (typeof ASPECT_RATIOS)[number]["value"];
export const DEFAULT_STYLEBEAR_ASPECT_RATIO = "16:9";

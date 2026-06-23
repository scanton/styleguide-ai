/**
 * Translate messages/en.json into all supported locales using OpenRouter.
 *
 * Usage:
 *   npx tsx scripts/translate-messages.ts
 *   npx tsx scripts/translate-messages.ts --locale fr   # single locale only
 *   npx tsx scripts/translate-messages.ts --force       # re-translate even if file exists
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const LOCALES = ["zh", "nl", "fr", "de", "it", "ja", "pt", "ru", "es"] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_NAMES: Record<Locale, string> = {
  zh: "Simplified Chinese",
  nl: "Dutch",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  pt: "Portuguese (Brazilian)",
  ru: "Russian",
  es: "Spanish",
};

const ROOT = join(__dirname, "..");
const MESSAGES_DIR = join(ROOT, "messages");
const EN_PATH = join(MESSAGES_DIR, "en.json");

async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const model = process.env.DEFAULT_MODEL ?? "openrouter/free";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://www.styleguideai.com",
      "X-Title": "StyleGuideAI",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

function buildPrompt(targetLang: string, chunk: Record<string, unknown>): string {
  return `You are a professional translator for a website about AI art and art history.

Translate the following JSON from English to ${targetLang}.

CRITICAL RULES — follow every one exactly:
1. Return ONLY valid JSON. No explanation, no markdown fences, no extra text.
2. Keep ALL JSON keys exactly as-is (keys are never translated).
3. Do NOT translate these proper nouns — leave them in English exactly:
   - Brand/tool names: StyleGuideAI, StyleBear, StyleDice, StyleTarot, Rising, Virtual Museum
   - Platform names: Discord, DeviantArt, Medium, Google, Flux, Midjourney, SDXL, LoRA
   - Person names: Satori Canton, HeartStamp
   - Art movement/artist names (Impressionism, Cubism, Renaissance, etc.)
4. Keep all {placeholders} like {year}, {n}, {query}, {total} exactly as-is.
5. Keep all ↗ → ← symbols exactly as-is.
6. Translate UI strings naturally and idiomatically — not word-for-word.
7. Keep HTML entities like &amp; as-is.

JSON to translate:
${JSON.stringify(chunk, null, 2)}`;
}

async function translateLocale(locale: Locale, force: boolean): Promise<void> {
  const outPath = join(MESSAGES_DIR, `${locale}.json`);

  if (!force && existsSync(outPath)) {
    console.log(`  ⏭  ${locale} — already exists, skipping (use --force to re-translate)`);
    return;
  }

  const en = JSON.parse(readFileSync(EN_PATH, "utf-8")) as Record<string, unknown>;
  const langName = LOCALE_NAMES[locale];
  console.log(`  🌍 Translating to ${langName} (${locale})…`);

  // Translate namespace by namespace to stay within token limits
  const namespaces = Object.keys(en);
  const result: Record<string, unknown> = {};

  for (const ns of namespaces) {
    process.stdout.write(`     ${ns}… `);
    const chunk = { [ns]: en[ns] };
    let raw: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        raw = await callLLM(buildPrompt(langName, chunk));
        if (raw) break;
      } catch (err) {
        if (attempt === 3) {
          console.error(`\n     ✗ Failed to translate namespace "${ns}" after 3 attempts:`, err);
        } else {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (!raw) {
      result[ns] = en[ns];
      continue;
    }

    // Extract JSON — strip markdown fences, or pull out the first {...} block
    raw = raw.replace(/^```(?:json)?\n?/im, "").replace(/\n?```\s*$/im, "").trim();
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      raw = raw.slice(braceStart, braceEnd + 1);
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      result[ns] = parsed[ns] ?? parsed; // handle both {ns: {...}} and bare {...}
      console.log("✓");
    } catch {
      console.error(`\n     ✗ Invalid JSON returned for namespace "${ns}", using English fallback`);
      result[ns] = en[ns];
    }

    // Brief pause to avoid rate limits on free tier
    await new Promise((r) => setTimeout(r, 500));
  }

  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log(`  ✅ Wrote ${outPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const localeArg = args.find((a) => a.startsWith("--locale="))?.split("=")[1]
    ?? (args[args.indexOf("--locale") + 1] !== "--force" ? args[args.indexOf("--locale") + 1] : undefined);

  const targets: Locale[] = localeArg
    ? [localeArg as Locale]
    : [...LOCALES];

  // Load .env.local for local runs
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: join(ROOT, ".env.local") });
  } catch {
    // dotenv not installed — rely on env vars being set externally
  }

  console.log(`\nTranslating messages/en.json → ${targets.length} locale(s)…\n`);

  for (const locale of targets) {
    await translateLocale(locale, force);
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

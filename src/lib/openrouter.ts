export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string | LLMContentPart[];
}

export interface LLMContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface LLMResponse {
  content: string;
  model: string;
}

export const EXPERIMENT_MODELS = [
  // "openai/gpt-oss-20b:free", // commented out — down for hours, re-add once it recovers
  "cohere/north-mini-code:free",
] as const;

// Last-resort fallback: OpenRouter's automatic free-model router. Only tried
// after every model in EXPERIMENT_MODELS has failed for a request.
export const FALLBACK_MODEL = "openrouter/free";

// Total attempts a single request can make (primary pool + fallback).
export const MAX_MODEL_ATTEMPTS = EXPERIMENT_MODELS.length + 1;

// Picks randomly among untried EXPERIMENT_MODELS; once those are exhausted,
// returns FALLBACK_MODEL (once). Removed models: gpt-oss-120b, hermes-3-405b,
// gemma-4-26b/31b, dolphin-mistral-venice (unreliable), poolside/laguna-xs-2.1
// (being retired). Check /admin/models before adding models back.
export function pickExperimentModel(exclude: string[] = []): string {
  const pool = EXPERIMENT_MODELS.filter((m) => !exclude.includes(m));
  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  if (!exclude.includes(FALLBACK_MODEL)) return FALLBACK_MODEL;
  throw new Error("No experiment models left to try");
}

export async function callLLM(
  messages: LLMMessage[],
  options?: { model?: string; maxTokens?: number }
): Promise<LLMResponse> {
  const modelId = options?.model ?? process.env.DEFAULT_MODEL ?? "openrouter/free";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://styleguideai.com",
      "X-Title": "StyleGuideAI",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return { content: data.choices[0].message.content, model: modelId };
}

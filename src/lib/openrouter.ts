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
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
] as const;

// Tries models in priority order (gpt-oss-120b first, then gpt-oss-20b, then
// the rest of EXPERIMENT_MODELS in list order) rather than picking randomly —
// the free-tier models are unreliable enough that we want to exhaust the
// known-good ones before touching the flaky long tail.
export function pickExperimentModel(exclude: string[] = []): string {
  const pool = EXPERIMENT_MODELS.filter((m) => !exclude.includes(m));
  if (pool.length === 0) throw new Error("No experiment models left to try");
  return pool[0];
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

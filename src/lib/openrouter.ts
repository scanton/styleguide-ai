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
  "openrouter/owl-alpha",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
] as const;

export function pickExperimentModel(exclude: string[] = []): string {
  const pool = EXPERIMENT_MODELS.filter((m) => !exclude.includes(m));
  if (pool.length === 0) throw new Error("No experiment models left to try");
  return pool[Math.floor(Math.random() * pool.length)];
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

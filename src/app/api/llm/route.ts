export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { callLLM, pickExperimentModel, EXPERIMENT_MODELS, type LLMMessage } from "@/lib/openrouter";
import { systemPrompts } from "@/data/stylebear/system-prompts";

// Experiment mode: random model selection with fallback.
// To revert to the DEFAULT_MODEL env var, set OPENROUTER_EXPERIMENT=false in Vercel.
const EXPERIMENT_ACTIVE = process.env.OPENROUTER_EXPERIMENT !== "false";

async function callWithExperiment(
  messages: LLMMessage[],
  maxTokens?: number
): Promise<{ content: string; model: string; warning?: string }> {
  const tried: string[] = [];

  while (tried.length < EXPERIMENT_MODELS.length) {
    const model = pickExperimentModel(tried);
    tried.push(model);

    try {
      const result = await callLLM(messages, { model, maxTokens });
      const warning =
        tried.length > 1
          ? `${tried.slice(0, -1).join(", ")} failed — fell back to ${model}`
          : undefined;
      return { content: result.content, model, warning };
    } catch {
      if (tried.length >= EXPERIMENT_MODELS.length) {
        throw new Error("All experiment models failed");
      }
    }
  }

  throw new Error("All experiment models failed");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, maxTokens, model, promptStyle, imageData } = body as {
    messages?: LLMMessage[];
    maxTokens?: number;
    model?: string;
    promptStyle?: string;
    imageData?: string;
  };

  // StyleBear mode: promptStyle + optional imageData
  if (promptStyle !== undefined) {
    const systemPrompt = systemPrompts[promptStyle] ?? systemPrompts.flux;
    const userContent = imageData
      ? [
          {
            type: "image_url" as const,
            image_url: { url: imageData },
          },
          {
            type: "text" as const,
            text: (messages?.[0]?.content as string) ?? "Analyze this image and create an art prompt.",
          },
        ]
      : (messages?.[0]?.content as string) ?? "";

    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent as LLMMessage["content"] },
    ];

    try {
      const result = EXPERIMENT_ACTIVE
        ? await callWithExperiment(llmMessages, maxTokens ?? 2048)
        : await callLLM(llmMessages, { model, maxTokens: maxTokens ?? 2048 });
      return NextResponse.json(result);
    } catch (err) {
      console.error("LLM error:", err);
      return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
    }
  }

  // Generic mode: pass messages directly
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 422 });
  }

  try {
    const result = EXPERIMENT_ACTIVE
      ? await callWithExperiment(messages, maxTokens)
      : await callLLM(messages, { model, maxTokens });
    return NextResponse.json(result);
  } catch (err) {
    console.error("LLM error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}

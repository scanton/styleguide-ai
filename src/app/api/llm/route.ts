export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { callLLM, pickExperimentModel, EXPERIMENT_MODELS, type LLMMessage } from "@/lib/openrouter";
import { systemPrompts } from "@/data/stylebear/system-prompts";
import { db } from "@/lib/db";
import { llmModelAttempts } from "@/drizzle/schema";

function logAttempt(params: {
  model: string;
  success: boolean;
  errorMessage?: string;
  latencyMs: number;
  context?: string;
}) {
  // Fire-and-forget — never let logging failures affect the LLM response.
  db.insert(llmModelAttempts)
    .values({
      model: params.model,
      success: params.success,
      errorMessage: params.errorMessage?.slice(0, 500) ?? null,
      latencyMs: params.latencyMs,
      context: params.context ?? null,
    })
    .catch((err) => console.error("[llm] Failed to log model attempt:", err));
}

// Experiment mode: random model selection with live fallback streaming.
// To revert to the DEFAULT_MODEL env var, set OPENROUTER_EXPERIMENT=false in Vercel.
const EXPERIMENT_ACTIVE = process.env.OPENROUTER_EXPERIMENT !== "false";

function shortModel(model: string): string {
  return model.split("/").pop()?.replace(/:free$/, "") ?? model;
}

// Returns a streaming NDJSON response. Events are newline-delimited JSON:
//   {"status":"trying","model":"owl-alpha"}
//   {"status":"failed","model":"owl-alpha"}
//   {"status":"done","content":"...","model":"gpt-oss-120b","warning":"..."}
//   {"status":"error","error":"..."}
function experimentStream(messages: LLMMessage[], maxTokens?: number, context?: string): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const tried: string[] = [];

      while (tried.length < EXPERIMENT_MODELS.length) {
        const model = pickExperimentModel(tried);
        tried.push(model);

        controller.enqueue(
          encoder.encode(JSON.stringify({ status: "trying", model: shortModel(model) }) + "\n")
        );

        const startedAt = Date.now();
        try {
          const result = await callLLM(messages, { model, maxTokens });
          logAttempt({ model, success: true, latencyMs: Date.now() - startedAt, context });
          const warning =
            tried.length > 1
              ? `${tried.slice(0, -1).map(shortModel).join(", ")} failed — fell back to ${shortModel(model)}`
              : undefined;
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ status: "done", content: result.content, model: shortModel(model), warning }) + "\n"
            )
          );
          controller.close();
          return;
        } catch (err) {
          logAttempt({
            model,
            success: false,
            errorMessage: err instanceof Error ? err.message : String(err),
            latencyMs: Date.now() - startedAt,
            context,
          });
          controller.enqueue(
            encoder.encode(JSON.stringify({ status: "failed", model: shortModel(model) }) + "\n")
          );
        }
      }

      controller.enqueue(
        encoder.encode(JSON.stringify({ status: "error", error: "All experiment models failed" }) + "\n")
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, maxTokens, model, promptStyle, imageData, context } = body as {
    messages?: LLMMessage[];
    maxTokens?: number;
    model?: string;
    promptStyle?: string;
    imageData?: string;
    context?: string;
  };

  // StyleBear mode: promptStyle + optional imageData
  if (promptStyle !== undefined) {
    const systemPrompt = systemPrompts[promptStyle] ?? systemPrompts.flux;
    const userContent = imageData
      ? [
          { type: "image_url" as const, image_url: { url: imageData } },
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

    if (EXPERIMENT_ACTIVE) return experimentStream(llmMessages, maxTokens ?? 2048, "stylebear");

    const startedAt = Date.now();
    try {
      const result = await callLLM(llmMessages, { model, maxTokens: maxTokens ?? 2048 });
      logAttempt({ model: result.model, success: true, latencyMs: Date.now() - startedAt, context: "stylebear" });
      return NextResponse.json(result);
    } catch (err) {
      logAttempt({
        model: model ?? "openrouter/free",
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startedAt,
        context: "stylebear",
      });
      console.error("LLM error:", err);
      return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
    }
  }

  // Generic mode: pass messages directly
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 422 });
  }

  if (EXPERIMENT_ACTIVE) return experimentStream(messages, maxTokens, context);

  const startedAt = Date.now();
  try {
    const result = await callLLM(messages, { model, maxTokens });
    logAttempt({ model: result.model, success: true, latencyMs: Date.now() - startedAt, context });
    return NextResponse.json(result);
  } catch (err) {
    logAttempt({
      model: model ?? "openrouter/free",
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startedAt,
      context,
    });
    console.error("LLM error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}

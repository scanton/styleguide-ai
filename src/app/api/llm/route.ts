export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { callLLM, type LLMMessage } from "@/lib/openrouter";
import { systemPrompts } from "@/data/stylebear/system-prompts";

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
      const result = await callLLM(llmMessages, { model, maxTokens: maxTokens ?? 2048 });
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
    const result = await callLLM(messages, { model, maxTokens });
    return NextResponse.json(result);
  } catch (err) {
    console.error("LLM error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}

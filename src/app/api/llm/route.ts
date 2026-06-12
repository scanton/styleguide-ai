export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { callLLM, type LLMMessage } from "@/lib/openrouter";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, maxTokens } = body as { messages: LLMMessage[]; maxTokens?: number };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 422 });
  }

  try {
    const result = await callLLM(messages, { maxTokens });
    return NextResponse.json(result);
  } catch (err) {
    console.error("LLM error:", err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 500 });
  }
}

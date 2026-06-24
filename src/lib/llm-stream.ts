export type LLMStreamEvent =
  | { status: "trying"; model: string }
  | { status: "failed"; model: string }
  | { status: "done"; content: string; model: string; warning?: string }
  | { status: "error"; error: string };

export async function readLLMStream(
  res: Response,
  onEvent: (event: LLMStreamEvent) => void
): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as LLMStreamEvent);
      } catch { /* skip malformed lines */ }
    }
  }
  if (buffer.trim()) {
    try { onEvent(JSON.parse(buffer.trim()) as LLMStreamEvent); } catch { /* skip */ }
  }
}

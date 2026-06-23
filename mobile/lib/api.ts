const API_BASE = "https://www.styleguideai.com";

async function apiFetch(path: string, options: RequestInit = {}, sessionToken?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sessionToken) {
    headers["Cookie"] = `next-auth.session-token=${sessionToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

// --- LLM ---

export async function generatePrompt(body: {
  messages: { role: string; content: string }[];
  promptStyle: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ content?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// --- StyleBear history ---

export async function saveStyleBearHistory(
  prompt: string,
  inputs: string,
  sessionToken: string
): Promise<{ entry?: { id: string } } | null> {
  try {
    const res = await apiFetch(
      "/api/stylebear/history",
      { method: "POST", body: JSON.stringify({ prompt, inputs }) },
      sessionToken
    );
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchStyleBearHistory(
  sessionToken: string
): Promise<{ id: string; prompt: string; inputs: string; createdAt: string }[]> {
  try {
    const res = await apiFetch("/api/stylebear/history", {}, sessionToken);
    const data = await res.json();
    return data.history ?? [];
  } catch {
    return [];
  }
}

export async function deleteStyleBearHistory(id: string, sessionToken: string): Promise<void> {
  await apiFetch(`/api/stylebear/history?id=${id}`, { method: "DELETE" }, sessionToken);
}

// --- StyleDice history ---

export async function saveStyleDiceHistory(
  diceValues: string[],
  generatedPrompt: string,
  sessionToken: string
): Promise<{ entry?: { id: string } } | null> {
  try {
    const res = await apiFetch(
      "/api/styledice/history",
      { method: "POST", body: JSON.stringify({ diceValues, generatedPrompt }) },
      sessionToken
    );
    return res.json();
  } catch {
    return null;
  }
}

// --- StyleTarot history ---

export async function saveStyleTarotHistory(
  cardIndices: number[],
  generatedPrompt: string,
  sessionToken: string
): Promise<{ entry?: { id: string } } | null> {
  try {
    const res = await apiFetch(
      "/api/styletarot/history",
      { method: "POST", body: JSON.stringify({ cardIndices, generatedPrompt }) },
      sessionToken
    );
    return res.json();
  } catch {
    return null;
  }
}

// --- Generic LLM (no promptStyle required) ---

export async function callLLM(body: {
  messages: { role: string; content: string }[];
  maxTokens?: number;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.content ?? data.text ?? data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

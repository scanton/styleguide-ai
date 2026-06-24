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

// --- Rising ---

export interface RisingPost {
  id: string;
  source: "deviantart" | "discord" | "site";
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  creatorName: string;
  creatorUrl: string | null;
  toolOrigin: string | null;
  toolContext: string | null;
  siteLikes: number;
  rawEngagement: number;
  risingScore: number;
  aspectRatioClass: "portrait" | "square" | "landscape";
  imageWidth: number | null;
  imageHeight: number | null;
  createdAt: string | null;
  expiresAt: string;
  sourceUrl: string | null;
  hasVoted: boolean;
}

export async function fetchRisingPosts(
  source = "all",
  sessionToken?: string | null
): Promise<RisingPost[]> {
  try {
    const res = await apiFetch(`/api/rising/posts?source=${source}`, {}, sessionToken);
    const data = await res.json();
    return data.posts ?? [];
  } catch {
    return [];
  }
}

export async function voteRisingPost(
  postId: string,
  sessionToken?: string | null
): Promise<{ voted: boolean; likes: number } | null> {
  try {
    const res = await apiFetch(
      "/api/rising/vote",
      { method: "POST", body: JSON.stringify({ postId }) },
      sessionToken
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function reportRisingPost(postId: string, sessionToken?: string | null): Promise<void> {
  try {
    await apiFetch(
      "/api/rising/report",
      { method: "POST", body: JSON.stringify({ postId }) },
      sessionToken
    );
  } catch {}
}

export async function uploadRisingPost(
  imageUri: string,
  mimeType: string,
  caption: string,
  toolOrigin: string | null,
  sessionToken: string
): Promise<{ postId: string; imageUrl: string } | null> {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: "photo.jpg",
      type: mimeType,
    } as unknown as Blob);
    if (caption.trim()) formData.append("caption", caption.trim());
    if (toolOrigin) formData.append("toolOrigin", toolOrigin);

    const res = await fetch(`${API_BASE}/api/rising/upload`, {
      method: "POST",
      headers: { Cookie: `next-auth.session-token=${sessionToken}` },
      body: formData,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// --- Articles ---

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  mediumUrl: string;
  publishedAt: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  movementMatches: string[];
}

export async function fetchArticles(opts: {
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ articles: Article[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await apiFetch(`/api/articles?${params}`);
    const data = await res.json();
    return { articles: data.articles ?? [], total: data.total ?? 0 };
  } catch {
    return { articles: [], total: 0 };
  }
}

// --- Events / Themes ---

export interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discordTags: string[];
  threadUrl: string | null;
  postedAt: string | null;
  discordThreadId: string | null;
}

export async function fetchEvents(opts: {
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ events: CommunityEvent[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await apiFetch(`/api/events?${params}`);
    const data = await res.json();
    return { events: data.events ?? [], total: data.total ?? 0 };
  } catch {
    return { events: [], total: 0 };
  }
}

// --- Search ---

export interface SearchResult {
  id: string;
  type: "artist" | "movement" | "article";
  title: string;
  subtitle?: string;
  href: string;
}

export async function searchContent(q: string): Promise<SearchResult[]> {
  if (q.trim().length < 2) return [];
  try {
    const res = await apiFetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

// --- Contact ---

export async function sendContactForm(body: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: data.error ?? "Unknown error" };
  } catch {
    return { ok: false, error: "Network error" };
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

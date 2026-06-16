const KEY = "sgai_presign";
const TTL_MS = 10 * 60 * 1000;

export interface PendingShare {
  tool: string;
  prompt: string;
  toolOrigin: string;
  toolContext?: string;
}

export function savePendingShare(data: PendingShare) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch {}
}

export function loadPendingShare(): PendingShare | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > TTL_MS) { clearPendingShare(); return null; }
    return parsed as PendingShare;
  } catch { return null; }
}

export function clearPendingShare() {
  try { localStorage.removeItem(KEY); } catch {}
}

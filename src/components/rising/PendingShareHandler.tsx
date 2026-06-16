"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { loadPendingShare, clearPendingShare } from "@/lib/session-restore";
import { ShareToRisingModal } from "@/components/rising/ShareToRisingModal";

async function saveRestoredHistory(tool: string, prompt: string, payload: Record<string, unknown>) {
  try {
    if (tool === "styletarot") {
      await fetch("/api/styletarot/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIndices: payload.cardIndices, generatedPrompt: prompt }),
      });
    } else if (tool === "stylebear") {
      await fetch("/api/stylebear/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, inputs: payload.inputs }),
      });
    } else if (tool === "styledice") {
      await fetch("/api/styledice/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diceValues: payload.diceValues, generatedPrompt: prompt }),
      });
    } else if (tool === "museum") {
      await fetch("/api/history/museum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, prompt }),
      });
    }
  } catch {}
}

export function PendingShareHandler() {
  const { data: session } = useSession();
  const [pending, setPending] = useState<{ prompt: string; toolOrigin: string; toolContext?: string } | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const saved = loadPendingShare();
    if (!saved) return;
    clearPendingShare();
    if (saved.historyPayload) {
      saveRestoredHistory(saved.tool, saved.prompt, saved.historyPayload);
    }
    setPending({ prompt: saved.prompt, toolOrigin: saved.toolOrigin, toolContext: saved.toolContext });
  }, [session?.user]);

  if (!pending) return null;

  return (
    <ShareToRisingModal
      prompt={pending.prompt}
      toolOrigin={pending.toolOrigin}
      toolContext={pending.toolContext}
      onClose={() => setPending(null)}
    />
  );
}

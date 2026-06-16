"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { loadPendingShare, clearPendingShare } from "@/lib/session-restore";
import { ShareToRisingModal } from "@/components/rising/ShareToRisingModal";

export function PendingShareHandler() {
  const { data: session } = useSession();
  const [pending, setPending] = useState<{ prompt: string; toolOrigin: string; toolContext?: string } | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const saved = loadPendingShare();
    if (!saved) return;
    clearPendingShare();
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

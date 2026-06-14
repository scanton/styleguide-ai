"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

interface MuseumPromptModalProps {
  type: "artist" | "movement";
  id: string;
  name: string;
  onClose: () => void;
}

export function MuseumPromptModal({ type, id, name, onClose }: MuseumPromptModalProps) {
  const { data: session } = useSession();
  const [sceneDetails, setSceneDetails] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setPrompt(null);
    try {
      const res = await fetch("/api/museum/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, sceneDetails: sceneDetails.trim() || undefined }),
      });
      const data = await res.json();
      const generated: string = data.prompt ?? data.error ?? "No response";
      setPrompt(generated);

      // Save to StyleBear history for logged-in users
      if (session?.user && data.prompt) {
        fetch("/api/stylebear/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: data.prompt,
            inputs: `Museum: ${type === "artist" ? "Artist" : "Movement"} — ${name}`,
          }),
        }).catch(() => {});
      }
    } catch {
      setPrompt("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [type, id, sceneDetails, session, name]);

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const typeLabel = type === "artist" ? "Artist" : "Movement";

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="museum-prompt-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="museum-prompt-modal-title"
              className="font-heading text-xl text-primary"
            >
              Generate Prompt with StyleBear
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {typeLabel}: <span className="font-medium text-foreground">{name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Scene details input */}
        <div className="space-y-1.5">
          <label
            htmlFor="scene-details"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Scene Details <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            id="scene-details"
            value={sceneDetails}
            onChange={(e) => setSceneDetails(e.target.value)}
            rows={3}
            placeholder={`Add any specific scene, subject, or mood you'd like in the ${type === "artist" ? `${name} style` : name} prompt…`}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate Prompt"}
        </button>

        {/* Output */}
        {prompt && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{prompt}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 h-10 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm hover:bg-muted transition-colors"
              >
                {copied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
            {session?.user && (
              <p className="text-xs text-muted-foreground text-center">
                Saved to your StyleBear history.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

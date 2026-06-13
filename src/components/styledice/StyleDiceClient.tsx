"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { gsap } from "gsap";
import { prefersReducedMotion as shouldReduceMotion } from "@/lib/motion";
import { artMovementFaces } from "@/data/styledice/art-movements";
import { famousArtistFaces } from "@/data/styledice/famous-artists";
import { mediaTypeFaces } from "@/data/styledice/media-types";
import { artTechniqueFaces } from "@/data/styledice/art-techniques";
import { popCultureFaces } from "@/data/styledice/pop-culture";
import { genreFaces } from "@/data/styledice/genres";

const MAX_REROLLS = 2;

interface Die {
  category: string;
  color: string; // Tailwind arbitrary or CSS var
  faces: string[];
}

const DICE: Die[] = [
  {
    category: "Art Movement",
    color: "oklch(0.42 0.22 285)",
    faces: artMovementFaces,
  },
  {
    category: "Famous Artist",
    color: "oklch(0.60 0.14 195)",
    faces: famousArtistFaces,
  },
  {
    category: "Media Type",
    color: "oklch(0.78 0.15 85)",
    faces: mediaTypeFaces,
  },
  {
    category: "Art Technique",
    color: "oklch(0.65 0.17 30)",
    faces: artTechniqueFaces,
  },
  {
    category: "Pop Culture",
    color: "oklch(0.65 0.14 355)",
    faces: popCultureFaces,
  },
  {
    category: "Genre",
    color: "oklch(0.35 0.15 255)",
    faces: genreFaces,
  },
];

function rollFace(faces: string[]): string {
  return faces[Math.floor(Math.random() * faces.length)];
}

type GamePhase = "start" | "rolling" | "done";

export default function StyleDiceClient() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<GamePhase>("start");
  const [values, setValues] = useState<string[]>(DICE.map(() => ""));
  const [held, setHeld] = useState<boolean[]>(Array(6).fill(false));
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);

  const dieRefs = useRef<(HTMLDivElement | null)[]>([]);
  const promptRef = useRef<HTMLDivElement | null>(null);

  const animateDice = useCallback((indices: number[]) => {
    if (shouldReduceMotion()) return;
    indices.forEach((i) => {
      const el = dieRefs.current[i];
      if (!el) return;
      gsap.killTweensOf(el);
      // 2-phase squish: compress to flat → snap value → expand + overshoot → settle
      gsap.timeline()
        .to(el, { scaleX: 0.05, duration: 0.1, ease: "power2.in" })
        .to(el, { scaleX: 1.06, duration: 0.14, ease: "power2.out" })
        .to(el, { scaleX: 1, duration: 0.08, ease: "power1.inOut",
          onComplete: () => gsap.set(el, { clearProps: "scaleX" }) });
    });
  }, []);

  const handleStart = useCallback(() => {
    const fresh = Array(6).fill(false);
    const initialValues = DICE.map((die) => rollFace(die.faces));
    setHeld(fresh);
    setValues(initialValues);
    setRerollsLeft(MAX_REROLLS);
    setGeneratedPrompt(null);
    setSavedEntryId(null);
    setCopied(false);
    setPhase("rolling");
    animateDice([0, 1, 2, 3, 4, 5]);
  }, [animateDice]);

  const handleToggleHold = useCallback(
    (index: number) => {
      if (phase !== "rolling") return;
      const el = dieRefs.current[index];
      setHeld((prev) => {
        const next = [...prev];
        next[index] = !next[index];
        if (el && !shouldReduceMotion()) {
          gsap.to(el, {
            y: next[index] ? -6 : 0,
            duration: 0.15,
            ease: "power2.out",
          });
        }
        return next;
      });
    },
    [phase]
  );

  // Save the roll (no prompt yet) when all rerolls are exhausted and user is logged in
  const saveRollIfNeeded = useCallback(async (finalValues: string[]) => {
    if (!session?.user || savedEntryId) return;
    try {
      const res = await fetch("/api/styledice/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diceValues: finalValues }),
      });
      const data = await res.json();
      if (data.entry?.id) setSavedEntryId(data.entry.id);
    } catch {
      // Non-fatal
    }
  }, [session, savedEntryId]);

  const handleReroll = useCallback(() => {
    if (rerollsLeft <= 0) return;
    const next = rerollsLeft - 1;
    // Compute final values before setState so we can save them if this is the last roll
    const finalValues = values.map((v, i) => (held[i] ? v : rollFace(DICE[i].faces)));
    setValues(finalValues);
    animateDice(held.map((h, i) => (!h ? i : -1)).filter((i) => i >= 0));
    setRerollsLeft(next);
    if (next === 0) {
      setPhase("done");
      saveRollIfNeeded(finalValues);
    }
  }, [rerollsLeft, held, values, animateDice, saveRollIfNeeded]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGeneratedPrompt(null);

    const [movement, artist, media, technique, popCulture, genre] = values;
    const userMessage = `Generate an AI art prompt inspired by these six creative elements:
- Art Movement: ${movement}
- Famous Artist: ${artist}
- Media Type: ${media}
- Art Technique: ${technique}
- Pop Culture Reference: ${popCulture}
- Genre: ${genre}

Create a detailed, ready-to-use Flux image generation prompt that weaves all six elements together naturally.`;

    let prompt: string | null = null;

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          maxTokens: 512,
        }),
      });
      const data = await res.json();
      prompt = data.content ?? data.text ?? data.choices?.[0]?.message?.content ?? null;
      setGeneratedPrompt(prompt);
    } catch {
      setGeneratedPrompt("Failed to generate prompt. Please try again.");
    }

    // Save to DB if authenticated; if no entry yet, create one; else patch
    if (session?.user && prompt) {
      try {
        if (!savedEntryId) {
          const saveRes = await fetch("/api/styledice/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ diceValues: values, generatedPrompt: prompt }),
          });
          const saved = await saveRes.json();
          if (saved.entry?.id) setSavedEntryId(saved.entry.id);
        } else {
          await fetch("/api/styledice/history", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: savedEntryId, generatedPrompt: prompt }),
          });
        }
      } catch {
        // Non-fatal — history save failure doesn't break the game
      }
    }

    setGenerating(false);

    // Scroll prompt into view
    requestAnimationFrame(() => {
      promptRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [values, session, savedEntryId]);

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedPrompt]);

  const handlePlayAgain = useCallback(() => {
    setPhase("start");
    setValues(DICE.map(() => ""));
    setHeld(Array(6).fill(false));
    setRerollsLeft(MAX_REROLLS);
    setGeneratedPrompt(null);
    setSavedEntryId(null);
    setCopied(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (phase === "start") {
    return (
      <div className="flex flex-col items-center gap-8 py-12 px-4 text-center">
        <div className="max-w-lg">
          <p className="text-lg text-foreground/70 leading-relaxed">
            Roll six dice — each one draws from a different creative category. Hold the
            results you like, re-roll the rest up to twice. Lock in your combination and
            generate a ready-to-use AI art prompt.
          </p>
        </div>
        <button
          onClick={handleStart}
          className="px-8 py-4 rounded-full text-lg font-semibold text-white transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: "oklch(0.42 0.22 285)", focusRingColor: "oklch(0.42 0.22 285)" } as React.CSSProperties}
        >
          Start Playing
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4">
      {/* Instructions */}
      <div className="text-center text-sm text-foreground/60 max-w-md">
        {phase === "rolling" && rerollsLeft > 0 && (
          <>
            <span className="font-semibold text-foreground/80">
              Re-rolls left: {rerollsLeft}
            </span>
            {" · "}
            Click a die to hold it, then Re-Roll the rest.
          </>
        )}
        {phase === "done" && !generatedPrompt && (
          <>
            <span className="font-semibold text-foreground/80">Your combination is locked.</span>
            {" "}Generate a Flux art prompt from these six elements.
          </>
        )}
      </div>

      {/* Dice grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
        {DICE.map((die, i) => {
          const isHeld = held[i];
          const isDone = phase === "done";
          return (
            <div
              key={die.category}
              ref={(el) => { dieRefs.current[i] = el; }}
              onClick={() => handleToggleHold(i)}
              role={phase === "rolling" ? "button" : undefined}
              aria-pressed={phase === "rolling" ? isHeld : undefined}
              aria-label={phase === "rolling" ? `${die.category}: ${values[i]}. ${isHeld ? "Held" : "Not held"}. Click to ${isHeld ? "release" : "hold"}.` : undefined}
              tabIndex={phase === "rolling" ? 0 : undefined}
              onKeyDown={(e) => {
                if (phase === "rolling" && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleToggleHold(i);
                }
              }}
              className={[
                "relative flex flex-col items-center justify-between rounded-2xl p-4 min-h-[140px] select-none transition-shadow",
                phase === "rolling" ? "cursor-pointer" : "cursor-default",
                isHeld
                  ? "ring-4 shadow-lg"
                  : "ring-1 ring-black/10 shadow-sm",
                isDone ? "opacity-90" : "",
              ].join(" ")}
              style={{
                backgroundColor: isHeld
                  ? `color-mix(in oklch, ${die.color} 15%, white)`
                  : "white",
                "--ring-color": die.color,
                ringColor: isHeld ? die.color : undefined,
                boxShadow: isHeld ? `0 0 0 3px ${die.color}` : undefined,
              } as React.CSSProperties}
            >
              {/* Category label */}
              <span
                className="text-xs font-bold uppercase tracking-wider w-full text-center"
                style={{ color: die.color }}
              >
                {die.category}
              </span>

              {/* Die value */}
              <span className="text-base font-semibold text-center text-foreground leading-snug px-1">
                {values[i] || "—"}
              </span>

              {/* Hold badge */}
              {isHeld && (
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: die.color }}
                  aria-hidden="true"
                >
                  Held
                </span>
              )}
              {!isHeld && <span className="h-5" aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        {phase === "rolling" && (
          <button
            onClick={handleReroll}
            disabled={rerollsLeft <= 0}
            className="px-7 py-3 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: "oklch(0.42 0.22 285)" } as React.CSSProperties}
          >
            Re-Roll ({rerollsLeft} left)
          </button>
        )}

        {phase === "done" && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-7 py-3 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: "oklch(0.60 0.14 195)" } as React.CSSProperties}
          >
            {generating ? "Generating…" : generatedPrompt ? "Re-generate" : "Generate Prompt"}
          </button>
        )}

        <button
          onClick={handlePlayAgain}
          className="px-7 py-3 rounded-full font-semibold border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Roll Again
        </button>
      </div>

      {/* Generated prompt */}
      {generatedPrompt && (
        <div
          ref={promptRef}
          className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "oklch(0.42 0.22 285)" }}
            >
              Generated Prompt
            </span>
            <button
              onClick={handleCopy}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{generatedPrompt}</p>
          {session?.user && (
            <p className="text-[11px] text-foreground/40">Saved to your history.</p>
          )}
        </div>
      )}
    </div>
  );
}

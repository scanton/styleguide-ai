"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { prefersReducedMotion } from "@/lib/motion";
import { artMovements } from "@/data/stylebear/art-movements";
import { mediaTypes } from "@/data/stylebear/media-types";
import { promptData, cultureKeys, checkboxOptions } from "@/data/stylebear/prompt-data";
import { promptTypes, TRIPLE_COUNT } from "@/data/stylebear/config";
import { ASPECT_RATIOS, DEFAULT_STYLEBEAR_ASPECT_RATIO } from "@/lib/aspect-ratios";
import { processWildcards } from "@/lib/wildcards";
import { ShareToRisingModal } from "@/components/rising/ShareToRisingModal";
import { SignInPromptModal } from "@/components/rising/SignInPromptModal";
import { readLLMStream } from "@/lib/llm-stream";

const STYLEBEAR_MODEL = "openrouter/free";

const sortedMovements = [...artMovements].sort((a, b) =>
  a.name.localeCompare(b.name)
);
const sortedMedia = [...mediaTypes].sort((a, b) =>
  a.name.localeCompare(b.name)
);

function buildPrompt(
  subject: string,
  footer: string,
  selectedMovements: string[],
  selectedMedia: string[],
  checkedOptions: Set<string>
): string {
  const parts: string[] = [];

  if (subject.trim()) {
    parts.push(processWildcards(subject.trim()));
  }

  const movements = selectedMovements.filter(Boolean);
  const media = selectedMedia.filter(Boolean);

  const artistsFromMovements = movements.flatMap((name) => {
    const entry = sortedMovements.find((m) => m.name === name);
    if (!entry || !entry.artists.length) return [];
    return [entry.artists[Math.floor(Math.random() * entry.artists.length)]];
  });

  const artistsFromMedia = media.flatMap((name) => {
    const entry = sortedMedia.find((m) => m.name === name);
    if (!entry || !entry.artists.length) return [];
    return [entry.artists[Math.floor(Math.random() * entry.artists.length)]];
  });

  if (movements.length) {
    parts.push("[" + [...new Set(movements)].join(" | ") + "]");
  }
  if (media.length) {
    parts.push("made with [" + [...new Set(media)].join(" | ") + "]");
  }

  const allArtists = [...new Set([...artistsFromMovements, ...artistsFromMedia])];
  if (allArtists.length) {
    parts.push("in the style mix of [" + allArtists.join(" | ") + "]");
  }

  for (const key of checkedOptions) {
    const value = promptData[key as keyof typeof promptData];
    if (value) {
      parts.push(processWildcards(value));
    }
  }

  if (footer.trim()) {
    parts.push(processWildcards(footer.trim()));
  }

  return parts
    .join(", ")
    .replace(/,\s*,+/g, ",")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}

export default function StyleBearClient() {
  const t = useTranslations("stylebear");
  const tm = useTranslations("stylebearMovements");
  const tmt = useTranslations("stylebearMedia");
  const { data: session } = useSession();
  const [selectedMovements, setSelectedMovements] = useState<string[]>(
    Array(TRIPLE_COUNT).fill("")
  );
  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    Array(TRIPLE_COUNT).fill("")
  );
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(
    () => new Set(checkboxOptions.filter((o) => o.defaultChecked).map((o) => o.key))
  );
  const [showCultures, setShowCultures] = useState(false);
  const [promptType, setPromptType] = useState<string>(promptTypes[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_STYLEBEAR_ASPECT_RATIO);
  const [output, setOutput] = useState<string>("");
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [modelWarning, setModelWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.preferredAspectRatio) {
          setAspectRatio(data.user.preferredAspectRatio);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  const [hasGenerated, setHasGenerated] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasGenerated && outputRef.current && !prefersReducedMotion()) {
      gsap.fromTo(
        outputRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [hasGenerated]);

  const handleGenerate = useCallback(async () => {
    const subject = subjectRef.current?.value ?? "";
    const footer = footerRef.current?.value ?? "";
    const basePrompt = buildPrompt(subject, footer, selectedMovements, selectedMedia, checkedOptions);
    const rawPrompt = aspectRatio
      ? `${basePrompt}\n\nEnd the prompt with: ${aspectRatio} aspect ratio`
      : basePrompt;

    setHasGenerated(true);
    setLoading(true);
    setOutput("");
    setModelLabel(null);
    setModelWarning(null);

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: rawPrompt }],
          promptStyle: promptType,
          model: STYLEBEAR_MODEL,
          maxTokens: 2048,
        }),
      });

      let generated = "No response";
      if (res.headers.get("content-type")?.includes("x-ndjson")) {
        await readLLMStream(res, (event) => {
          if (event.status === "failed") {
            setModelWarning(`${event.model} failed — trying another model…`);
          } else if (event.status === "done") {
            generated = event.content;
            setOutput(event.content);
            setModelLabel(event.model);
            if (event.warning) setModelWarning(event.warning);
            else setModelWarning(null);
          } else if (event.status === "error") {
            generated = "Failed to generate prompt. Please try again.";
            setOutput(generated);
          }
        });
      } else {
        const data = (await res.json()) as { content?: string; error?: string; model?: string; warning?: string };
        generated = data.content ?? data.error ?? "No response";
        setOutput(generated);
        if (data.model) setModelLabel(data.model);
        if (data.warning) setModelWarning(data.warning);
      }

      if (session?.user && generated && generated !== "No response" && !generated.startsWith("Failed")) {
        const allOptionDefs = [...checkboxOptions, ...cultureKeys];
        const inputs = JSON.stringify({
          source: "stylebear",
          promptStyle: promptType,
          aspectRatio: aspectRatio || undefined,
          movements: selectedMovements.filter(Boolean),
          media: selectedMedia.filter(Boolean),
          options: [...checkedOptions]
            .map((key) => allOptionDefs.find((o) => o.key === key)?.label as string | undefined)
            .filter((l): l is string => typeof l === "string"),
        });
        try {
          const saveRes = await fetch("/api/stylebear/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: generated, inputs }),
          });
          const saved = await saveRes.json();
          if (saved.entry?.id) setSavedEntryId(saved.entry.id);
        } catch {
          // Non-fatal
        }
      }
    } catch {
      setOutput(t("error"));
    } finally {
      setLoading(false);
    }
  }, [selectedMovements, selectedMedia, checkedOptions, promptType, aspectRatio, session, t]);

  const handleRandomize = useCallback(() => {
    const randMovements = Array.from({ length: TRIPLE_COUNT }, (_, i) => {
      if (i === TRIPLE_COUNT - 1) return "";
      return sortedMovements[Math.floor(Math.random() * sortedMovements.length)].name;
    });
    const randMedia = Array.from({ length: TRIPLE_COUNT }, (_, i) => {
      if (i === TRIPLE_COUNT - 1) return "";
      return sortedMedia[Math.floor(Math.random() * sortedMedia.length)].name;
    });
    setSelectedMovements(randMovements);
    setSelectedMedia(randMedia);
    setCheckedOptions((prev) => {
      const next = new Set(prev);
      next.delete("hasAllArtists");
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [output]);

  const toggleOption = useCallback((key: string) => {
    setCheckedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/stylebear-face.png"
            alt="StyleBear, the StyleGuideAI mascot — a cute white plush teddy bear"
            className="h-[140px] w-auto"
          />
        </div>
        <h1 className="font-heading text-4xl text-primary">{t("title")}</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Controls Row */}
      <section className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px] space-y-1">
          <label htmlFor="prompt-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("promptStyle")}
          </label>
          <select
            id="prompt-type"
            value={promptType}
            onChange={(e) => setPromptType(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {promptTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {t(`promptType_${pt.value}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[140px] space-y-1">
          <label htmlFor="aspect-ratio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("aspectRatio")}
          </label>
          <select
            id="aspect-ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {t(`ar_${ar.value.replace(":", "_")}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRandomize}
          className="h-11 px-4 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted transition-colors text-sm min-w-[100px]"
        >
          {t("randomize")}
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium min-w-[120px] disabled:opacity-50"
        >
          {loading ? t("generating") : t("generate")}
        </button>
      </section>

      {/* Subject */}
      <section className="space-y-1">
        <label htmlFor="subject-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("subject")}
        </label>
        <textarea
          id="subject-input"
          ref={subjectRef}
          rows={3}
          placeholder={t("subjectPlaceholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={t("subjectAriaLabel")}
        />
      </section>

      {/* Prompt Output — hidden until Generate is clicked */}
      {hasGenerated && (
        <div ref={outputRef}>
          <section className="border border-border rounded-lg p-4 space-y-3 bg-card min-h-[100px]">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/loading_animation_satori_bear.gif"
                  alt="Generating prompt…"
                  className="w-32 h-32 object-contain"
                />
              </div>
            ) : (
              <>
                {modelWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mb-1">
                    ⚠️ {modelWarning}
                  </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{output}</p>
                {modelLabel && (
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    via {modelLabel.split("/").pop()?.replace(/:free$/, "")}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    {copySuccess ? t("copied") : t("copyPrompt")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!session?.user) { setShowSignInModal(true); return; }
                      setShowShareModal(true);
                    }}
                    className="px-4 py-2 text-sm rounded-md border border-primary text-primary hover:bg-primary/10 transition-colors min-h-[44px]"
                  >
                    {t("share")}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Art Movements */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("artMovements")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {selectedMovements.map((val, i) => (
            <select
              key={i}
              value={val}
              onChange={(e) => {
                const next = [...selectedMovements];
                next[i] = e.target.value;
                setSelectedMovements(next);
              }}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Art movement ${i + 1}`}
            >
              <option value="">{t("noneOption")}</option>
              {sortedMovements.map((m) => (
                <option key={m.name} value={m.name}>
                  {tm(m.name as Parameters<typeof tm>[0])}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      {/* Media Types */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("mediaTypes")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {selectedMedia.map((val, i) => (
            <select
              key={i}
              value={val}
              onChange={(e) => {
                const next = [...selectedMedia];
                next[i] = e.target.value;
                setSelectedMedia(next);
              }}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Media type ${i + 1}`}
            >
              <option value="">{t("noneOption")}</option>
              {sortedMedia.map((m) => (
                <option key={m.name} value={m.name}>
                  {tmt(m.name as Parameters<typeof tmt>[0])}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      {/* Checkbox Options */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("options")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkboxOptions.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={checkedOptions.has(opt.key)}
                onChange={() => toggleOption(opt.key)}
                className="h-4 w-4 rounded border-input accent-primary"
                aria-label={t(opt.key as Parameters<typeof t>[0])}
              />
              <span>{t(opt.key as Parameters<typeof t>[0])}</span>
            </label>
          ))}
        </div>

        {/* Culture Toggle */}
        <button
          type="button"
          onClick={() => setShowCultures((v) => !v)}
          className="text-xs text-accent hover:underline underline-offset-2 min-h-[44px] px-2"
          aria-expanded={showCultures}
        >
          {showCultures ? t("hideCultures") : t("showCultures")}
        </button>

        {showCultures && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-border">
            {cultureKeys.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={checkedOptions.has(c.key)}
                  onChange={() => toggleOption(c.key)}
                  className="h-4 w-4 rounded border-input accent-primary"
                  aria-label={t(c.key as Parameters<typeof t>[0])}
                />
                <span>{t(c.key as Parameters<typeof t>[0])}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <section className="space-y-1">
        <label htmlFor="footer-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("footerLabel")}
        </label>
        <textarea
          id="footer-input"
          ref={footerRef}
          rows={2}
          placeholder={t("footerPlaceholder")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={t("footerAriaLabel")}
        />
      </section>

    </div>

      {showShareModal && output && (
        <ShareToRisingModal
          prompt={output}
          toolOrigin="stylebear"
          toolContext={savedEntryId ? JSON.stringify({ historyEntryId: savedEntryId, historyTable: "stylebear" }) : undefined}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showSignInModal && output && (
        <SignInPromptModal
          pendingShare={{
            tool: "stylebear",
            prompt: output,
            toolOrigin: "stylebear",
            historyPayload: {
              inputs: JSON.stringify({
                movements: selectedMovements.filter(Boolean),
                media: selectedMedia.filter(Boolean),
                options: [...checkedOptions],
                promptType,
                aspectRatio,
              }),
            },
          }}
          onClose={() => setShowSignInModal(false)}
        />
      )}
    </>
  );
}

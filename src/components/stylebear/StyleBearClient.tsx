"use client";

import { useState, useRef, useCallback } from "react";
import { artMovements } from "@/data/stylebear/art-movements";
import { mediaTypes } from "@/data/stylebear/media-types";
import { promptData, cultureKeys, checkboxOptions } from "@/data/stylebear/prompt-data";
import { promptTypes, llmModels, TRIPLE_COUNT } from "@/data/stylebear/config";
import { processWildcards } from "@/lib/wildcards";

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
  const [model, setModel] = useState<string>(llmModels[0].value);
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async () => {
    const subject = subjectRef.current?.value ?? "";
    const footer = footerRef.current?.value ?? "";
    const rawPrompt = buildPrompt(subject, footer, selectedMovements, selectedMedia, checkedOptions);

    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: rawPrompt }],
          promptStyle: promptType,
          model,
          maxTokens: 2048,
        }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      setOutput(data.content ?? data.error ?? "No response");
    } catch {
      setOutput("Error generating prompt. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedMovements, selectedMedia, checkedOptions, promptType, model]);

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

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target?.result as string;
    };
    img.onload = () => {
      const maxDim = 800;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      setImageDataUrl(canvas.toDataURL("image/jpeg", 0.8));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageDataUrl) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Analyze this image and describe the subject, art style, mood, and notable visual elements." }],
          promptStyle: promptType,
          model: "qwen/qwen-vl-plus:free",
          imageData: imageDataUrl,
          maxTokens: 1024,
        }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      if (subjectRef.current) {
        subjectRef.current.value = data.content ?? "";
      }
    } catch {
      // silently fail — user can still type subject manually
    } finally {
      setAnalyzing(false);
    }
  }, [imageDataUrl, promptType]);

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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div
            style={{ width: 120, height: 120 }}
            className="rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0"
            role="img"
            aria-label="[PROMPT: cute white plush fluffy chibi-style teddy bear with meerkat-like eyes, sitting at a vintage drawing table surrounded by colorful art supplies, retro 1950s illustration style, warm pastel colors, adorable expression]"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground opacity-40" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        </div>
        <h1 className="font-heading text-4xl text-primary">StyleBear</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          AI art prompt generator. Pick your movements, media, and style — StyleBear does the rest.
        </p>
      </div>

      {/* Image Upload */}
      <section className="border border-border rounded-lg p-4 space-y-3 bg-card">
        <h2 className="font-heading text-lg text-foreground">Analyze an Image</h2>
        <p className="text-xs text-muted-foreground">Upload an image to auto-fill the Subject field.</p>

        {imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt="Uploaded image for analysis"
            className="max-h-48 rounded-md object-contain border border-border"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted transition-colors min-h-[44px]"
          >
            Choose Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
            aria-label="Upload image for analysis"
          />
          {imageDataUrl && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 text-sm rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Analyze Image"}
            </button>
          )}
        </div>
      </section>

      {/* Prompt Output */}
      <section className="border border-border rounded-lg p-4 space-y-3 bg-card min-h-[100px]">
        {loading ? (
          <div className="flex items-center justify-center h-16 text-muted-foreground text-sm animate-pulse">
            StyleBear is crafting your prompt…
          </div>
        ) : output ? (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{output}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-h-[44px]"
            >
              {copySuccess ? "Copied!" : "Copy Prompt"}
            </button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm italic">Your generated prompt will appear here.</p>
        )}
      </section>

      {/* Controls Row */}
      <section className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px] space-y-1">
          <label htmlFor="prompt-type" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Prompt Style
          </label>
          <select
            id="prompt-type"
            value={promptType}
            onChange={(e) => setPromptType(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {promptTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[140px] space-y-1">
          <label htmlFor="llm-model" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            AI Model
          </label>
          <select
            id="llm-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {llmModels.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRandomize}
          className="h-11 px-4 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted transition-colors text-sm min-w-[100px]"
        >
          Randomize
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="h-11 px-6 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium min-w-[120px] disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </section>

      {/* Subject */}
      <section className="space-y-1">
        <label htmlFor="subject-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Subject
        </label>
        <textarea
          id="subject-input"
          ref={subjectRef}
          rows={3}
          placeholder="Describe your subject. Use {option1|option2} for random choices."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Subject description"
        />
      </section>

      {/* Art Movements */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Art Movements</h2>
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
              <option value="">— none —</option>
              {sortedMovements.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      {/* Media Types */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Media Types</h2>
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
              <option value="">— none —</option>
              {sortedMedia.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      {/* Checkbox Options */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Options</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkboxOptions.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={checkedOptions.has(opt.key)}
                onChange={() => toggleOption(opt.key)}
                className="h-4 w-4 rounded border-input accent-primary"
                aria-label={opt.label}
              />
              <span>{opt.label}</span>
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
          {showCultures ? "Hide Cultures" : "Show Cultures"}
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
                  aria-label={`Culture: ${c.label}`}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <section className="space-y-1">
        <label htmlFor="footer-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Footer
        </label>
        <textarea
          id="footer-input"
          ref={footerRef}
          rows={2}
          placeholder="Text appended at the end of every prompt."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Footer text"
        />
      </section>

    </div>
  );
}

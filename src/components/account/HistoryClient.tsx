"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TAROT_CARDS, CARD_TYPE_COLORS } from "@/data/styletarot/cards";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TarotEntry {
  id: string;
  cardIndices: string; // JSON array of 5 numbers
  generatedPrompt: string | null;
  createdAt: string;
}

interface DiceEntry {
  id: string;
  diceValues: string; // JSON string of 6 values
  generatedPrompt: string | null;
  createdAt: string;
}

interface BearEntry {
  id: string;
  prompt: string;
  inputs: string;
  createdAt: string;
}

const DICE_CATEGORIES = ["Art Movement", "Famous Artist", "Media Type", "Art Technique", "Pop Culture", "Genre"];
const DICE_COLORS = [
  "oklch(0.42 0.22 285)",
  "oklch(0.60 0.14 195)",
  "oklch(0.78 0.15 85)",
  "oklch(0.65 0.17 30)",
  "oklch(0.65 0.14 355)",
  "oklch(0.35 0.15 255)",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── StyleDice tab ─────────────────────────────────────────────────────────────

function DiceHistoryTab() {
  const [entries, setEntries] = useState<DiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/styledice/history")
      .then((r) => r.json())
      .then((d) => setEntries(d.history ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/styledice/history?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>;
  if (!entries.length) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-muted-foreground">No StyleDice rolls yet.</p>
      <a href="/styledice" className="text-sm text-primary hover:underline">Roll the dice →</a>
    </div>
  );

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        let values: string[] = [];
        try { values = JSON.parse(entry.diceValues); } catch { /* noop */ }
        return (
          <li key={entry.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:underline"
                aria-label="Delete this roll"
              >
                Delete
              </button>
            </div>
            {/* Dice chips */}
            <div className="flex flex-wrap gap-2">
              {values.map((val, i) => (
                <span
                  key={i}
                  className="inline-flex flex-col text-xs rounded-lg px-2.5 py-1.5 text-white leading-tight"
                  style={{ backgroundColor: DICE_COLORS[i] }}
                >
                  <span className="opacity-70 text-[10px] uppercase tracking-wide font-semibold">
                    {DICE_CATEGORIES[i]}
                  </span>
                  <span className="font-medium mt-0.5">{val}</span>
                </span>
              ))}
            </div>
            {/* Generated prompt */}
            {entry.generatedPrompt && (
              <div className="rounded-xl bg-muted/60 p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Generated prompt</p>
                <p className="text-sm text-foreground leading-relaxed">{entry.generatedPrompt}</p>
                <button
                  onClick={() => handleCopy(entry.generatedPrompt!, entry.id)}
                  className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  {copied === entry.id ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── StyleBear tab ─────────────────────────────────────────────────────────────

function BearHistoryTab() {
  const [entries, setEntries] = useState<BearEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stylebear/history")
      .then((r) => r.json())
      .then((d) => setEntries(d.history ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/stylebear/history?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>;
  if (!entries.length) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-muted-foreground">No StyleBear prompts yet.</p>
      <a href="/stylebear" className="text-sm text-primary hover:underline">Generate a prompt →</a>
    </div>
  );

  return (
    <ul className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:underline"
              aria-label="Delete this prompt"
            >
              Delete
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{entry.prompt}</p>
          <button
            onClick={() => handleCopy(entry.prompt, entry.id)}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {copied === entry.id ? "Copied!" : "Copy"}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── StyleTarot tab ────────────────────────────────────────────────────────────

const TAROT_BY_INDEX = new Map(TAROT_CARDS.map((c) => [c.index, c]));

function TarotHistoryTab() {
  const [entries, setEntries] = useState<TarotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/styletarot/history")
      .then((r) => r.json())
      .then((d) => setEntries(d.history ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/styletarot/history?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading…</p>;
  if (!entries.length) return (
    <div className="text-center py-12 space-y-2">
      <p className="text-muted-foreground">No StyleTarot hands yet.</p>
      <a href="/styletarot" className="text-sm text-primary hover:underline">Draw your first hand →</a>
    </div>
  );

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        let indices: number[] = [];
        try { indices = JSON.parse(entry.cardIndices); } catch { /* noop */ }
        const cards = indices.map((i) => TAROT_BY_INDEX.get(i)).filter(Boolean);
        return (
          <li key={entry.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:underline"
                aria-label="Delete this hand"
              >
                Delete
              </button>
            </div>
            {/* Card chips */}
            <div className="flex flex-wrap gap-2">
              {cards.map((card, i) => (
                <span
                  key={i}
                  className="inline-flex flex-col text-xs rounded-lg px-2.5 py-1.5 text-white leading-tight"
                  style={{ backgroundColor: CARD_TYPE_COLORS[card!.type] ?? "oklch(0.42 0.22 285)" }}
                >
                  <span className="opacity-70 text-[10px] uppercase tracking-wide font-semibold">
                    {card!.type}
                  </span>
                  <span className="font-medium mt-0.5">{card!.title}</span>
                </span>
              ))}
            </div>
            {/* Generated prompt */}
            {entry.generatedPrompt && (
              <div className="rounded-xl bg-muted/60 p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Generated prompt</p>
                <p className="text-sm text-foreground leading-relaxed">{entry.generatedPrompt}</p>
                <button
                  onClick={() => handleCopy(entry.generatedPrompt!, entry.id)}
                  className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  {copied === entry.id ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Main HistoryClient ────────────────────────────────────────────────────────

type Tab = "dice" | "bear" | "tarot";

export function HistoryClient() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("dice");

  if (!session?.user) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Sign in to view your history.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border border-border rounded-xl p-1 w-fit">
        {(["dice", "bear", "tarot"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t === "dice" ? "🎲 StyleDice" : t === "bear" ? "🐻‍❄️ StyleBear" : "🃏 StyleTarot"}
          </button>
        ))}
      </div>

      {tab === "dice" ? <DiceHistoryTab /> : tab === "bear" ? <BearHistoryTab /> : <TarotHistoryTab />}
    </div>
  );
}

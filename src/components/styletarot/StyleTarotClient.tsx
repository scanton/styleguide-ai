"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { prefersReducedMotion as shouldReduceMotion } from "@/lib/motion";
import { TAROT_CARDS, CARD_TYPE_COLORS, type TarotCard } from "@/data/styletarot/cards";
import { ShareToRisingModal } from "@/components/rising/ShareToRisingModal";
import { SignInPromptModal } from "@/components/rising/SignInPromptModal";
import { AddCardModal } from "@/components/styletarot/AddCardModal";
import { readLLMStream } from "@/lib/llm-stream";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommunityCard {
  id: string;
  index: number;        // 50000+ virtual index, never conflicts with static cards
  title: string;
  description: string;
  type: string;
  creator: string;
  imageUrl: string;
  isCommunity: true;
}

type AnyCard = TarotCard | CommunityCard;

function getCardSrc(card: AnyCard): string {
  if ("isCommunity" in card) return card.imageUrl;
  return `/images/styletarot/${(card as TarotCard).imageFilename}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const HAND_SIZE = 5;
const MAX_REDRAWS = 1;


// Map a card type to a short display label
function typeLabel(type: string): string {
  const MAP: Record<string, string> = {
    movement: "Movement",
    artist: "Artist",
    media: "Media",
    technique: "Technique",
    subject: "Subject",
    setting: "Setting",
    inspiration: "Inspiration",
    situation: "Situation",
    "pop culture": "Pop Culture",
    location: "Location",
  };
  return MAP[type] ?? type;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CardFace({ card, held, onClick, interactive, heldLabel }: {
  card: AnyCard;
  held: boolean;
  onClick?: () => void;
  interactive?: boolean;
  heldLabel: string;
}) {
  const [imgError, setImgError] = useState(false);
  const typeColor = (CARD_TYPE_COLORS as Record<string, string>)[card.type] ?? "oklch(0.42 0.22 285)";

  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={interactive ? held : undefined}
      aria-label={interactive
        ? `${card.title}, ${typeLabel(card.type)} card. ${held ? "Held — click to release" : "Click to hold"}`
        : card.title}
      className={[
        "relative overflow-hidden rounded-2xl text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 w-full",
        interactive ? "cursor-pointer" : "cursor-default",
        held ? "shadow-xl" : "shadow-md",
      ].join(" ")}
      style={{
        boxShadow: held ? `0 0 0 3px ${typeColor}, 0 8px 24px rgba(0,0,0,0.15)` : undefined,
      }}
    >
      {/* Card image — 9:16 container matches the actual image aspect ratio */}
      <div className="relative w-full" style={{ aspectRatio: "9/16" }}>
        {!imgError ? (
          <Image
            src={getCardSrc(card)}
            alt={card.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
            quality={85}
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in oklch, ${typeColor} 20%, white)` }}>
            <span className="text-3xl opacity-30">🎴</span>
          </div>
        )}

        {/* Hold badge overlay */}
        {held && (
          <div className="absolute top-2 left-2 right-2 flex justify-center">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white shadow"
              style={{ backgroundColor: typeColor }}
            >
              {heldLabel}
            </span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-2.5 bg-white space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white flex-none"
            style={{ backgroundColor: typeColor }}
          >
            {typeLabel(card.type)}
          </span>
        </div>
        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{card.title}</p>
        <p className="text-[10px] text-muted-foreground">by {card.creator}</p>
      </div>
    </button>
  );
}

// ── Explore mode card picker ──────────────────────────────────────────────────

const ALL_TYPES = Array.from(new Set(TAROT_CARDS.map((c) => c.type))).sort();

function ExploreMode({
  selected,
  onToggle,
  searchPlaceholder,
  allTypesLabel,
  noResultsLabel,
  heldLabel,
}: {
  selected: Set<number>;
  onToggle: (index: number) => void;
  searchPlaceholder: string;
  allTypesLabel: string;
  noResultsLabel: string;
  heldLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = TAROT_CARDS.filter((card) => {
    const matchType = filterType === "all" || card.type === filterType;
    const matchSearch =
      !search ||
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.type.toLowerCase().includes(search.toLowerCase()) ||
      card.creator.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-black/15 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">{allTypesLabel}</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{typeLabel(t)}</option>
          ))}
        </select>
      </div>

      {/* Scrollable card grid */}
      <div className="relative">
        <div className="overflow-y-auto max-h-[60vh] md:max-h-[75vh] rounded-xl pr-1 -mr-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pb-4">
            {filtered.map((card) => {
              const isSelected = selected.has(card.index);
              const isDisabled = !isSelected && selected.size >= HAND_SIZE;
              return (
                <div
                  key={card.index}
                  className={["relative transition-opacity", isDisabled ? "opacity-30" : ""].join(" ")}
                >
                  <CardFace
                    card={card}
                    held={isSelected}
                    onClick={() => !isDisabled && onToggle(card.index)}
                    interactive={!isDisabled || isSelected}
                    heldLabel={heldLabel}
                  />
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-12">{noResultsLabel}</p>
            )}
          </div>
        </div>
        {/* Bottom fade hint — signals more cards below */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 rounded-b-xl bg-gradient-to-t from-[oklch(0.98_0.01_90)] to-transparent" />
      </div>
    </div>
  );
}

// ── Main game component ───────────────────────────────────────────────────────

type GameMode = "draw" | "explore";
type DrawPhase = "start" | "dealt" | "drawn" | "locked";

export function StyleTarotClient() {
  const { data: session } = useSession();
  const t = useTranslations("styletarot");

  // Mode
  const [mode, setMode] = useState<GameMode>("draw");

  // Community cards (fetched from DB, merged into draw pool)
  const [communityCards, setCommunityCards] = useState<CommunityCard[]>([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [communityRefetch, setCommunityRefetch] = useState(0);

  // Draw mode state
  const [drawPhase, setDrawPhase] = useState<DrawPhase>("start");
  const [hand, setHand] = useState<AnyCard[]>([]);
  const [held, setHeld] = useState<boolean[]>(Array(HAND_SIZE).fill(false));
  const [redrawsLeft, setRedrawsLeft] = useState(MAX_REDRAWS);

  // Explore mode state
  const [exploreSelected, setExploreSelected] = useState<Set<number>>(new Set());

  // Shared output state
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [modelWarning, setModelWarning] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [preferredAspectRatio, setPreferredAspectRatio] = useState<string | null>(null);

  // Refs for GSAP
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const promptRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);

  // Deal counter: increment each deal so the animation effect runs exactly once per deal
  const [dealCount, setDealCount] = useState(0);
  const lastAnimatedDeal = useRef(0);

  // Animation trigger for redraw (set before setState, consumed by useEffect after render)
  const pendingRedrawAnim = useRef<number[] | null>(null);

  // ── Fetch preferred aspect ratio ───────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.preferredAspectRatio) {
          setPreferredAspectRatio(data.user.preferredAspectRatio);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  // ── Fetch community cards ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/styletarot/community-cards")
      .then((r) => r.json())
      .then((data: { cards?: { id: string; title: string; description: string; type: string; creator: string; imageUrl: string }[] }) => {
        if (!Array.isArray(data.cards)) return;
        setCommunityCards(
          data.cards.map((c, i) => ({
            id: c.id,
            index: 50000 + i,
            title: c.title,
            description: c.description,
            type: c.type,
            creator: c.creator,
            imageUrl: c.imageUrl,
            isCommunity: true as const,
          }))
        );
      })
      .catch(() => {});
  }, [communityRefetch]);

  // ── GSAP hold animation ────────────────────────────────────────────────────

  // ── Draw mode actions ──────────────────────────────────────────────────────

  const handleDeal = useCallback(() => {
    const allCards: AnyCard[] = [...TAROT_CARDS, ...communityCards];
    const newHand = pickRandom(allCards, HAND_SIZE);
    setDealCount((c) => c + 1);
    setHand(newHand);
    setHeld(Array(HAND_SIZE).fill(false));
    setRedrawsLeft(MAX_REDRAWS);
    setGeneratedPrompt(null);
    setSavedEntryId(null);
    setCopied(false);
    setDrawPhase("dealt");
  }, [communityCards]);

  const handleToggleHold = useCallback((i: number) => {
    if (drawPhase !== "dealt") return;
    const el = cardRefs.current[i];
    setHeld((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      if (el && !shouldReduceMotion()) {
        gsap.to(el, { y: next[i] ? -10 : 0, duration: 0.18, ease: "power2.out" });
      }
      return next;
    });
  }, [drawPhase]);

  const handleRedraw = useCallback(() => {
    if (redrawsLeft <= 0 || drawPhase !== "dealt") return;
    const replaceIndices = held.map((h, i) => (!h ? i : -1)).filter((i) => i >= 0);

    const next = redrawsLeft - 1;
    setRedrawsLeft(next);
    if (next === 0) setDrawPhase("drawn");

    if (shouldReduceMotion()) {
      // No animation — just swap cards
      const newHand = [...hand];
      const allCards: AnyCard[] = [...TAROT_CARDS, ...communityCards];
      const replacements = pickRandom(
        allCards.filter((c) => !hand.some((hc) => hc.index === c.index)),
        replaceIndices.length
      );
      replaceIndices.forEach((i, idx) => { newHand[i] = replacements[idx] ?? newHand[i]; });
      setHand(newHand);
      return;
    }

    // Animate out, then swap, then animate in via useEffect
    const allCards: AnyCard[] = [...TAROT_CARDS, ...communityCards];
    const tl = gsap.timeline({
      onComplete: () => {
        const newHand = [...hand];
        const replacements = pickRandom(
          allCards.filter((c) => !hand.some((hc) => hc.index === c.index)),
          replaceIndices.length
        );
        replaceIndices.forEach((i, idx) => { newHand[i] = replacements[idx] ?? newHand[i]; });
        pendingRedrawAnim.current = replaceIndices;
        setHand(newHand);
      },
    });
    replaceIndices.forEach((i, idx) => {
      const el = cardRefs.current[i];
      if (!el) return;
      tl.to(el, { y: 16, opacity: 0, scale: 0.9, duration: 0.18, ease: "power2.in" }, idx * 0.04);
    });
  }, [redrawsLeft, drawPhase, held, hand, communityCards]);

  const handleLockHand = useCallback(() => {
    setDrawPhase("locked");
    setHeld(Array(HAND_SIZE).fill(false));
    // Reset y offsets from hold animation
    cardRefs.current.forEach((el) => {
      if (el) gsap.to(el, { y: 0, duration: 0.15 });
    });
  }, []);

  // ── Explore mode actions ───────────────────────────────────────────────────

  const handleExploreToggle = useCallback((index: number) => {
    setExploreSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < HAND_SIZE) next.add(index);
      return next;
    });
    setGeneratedPrompt(null);
    setSavedEntryId(null);
  }, []);

  // ── Shared: generate prompt ────────────────────────────────────────────────

  const getActiveCards = useCallback((): AnyCard[] => {
    if (mode === "draw") return hand;
    return Array.from(exploreSelected).map(
      (idx) => TAROT_CARDS.find((c) => c.index === idx)!
    ).filter(Boolean);
  }, [mode, hand, exploreSelected]);

  const handleGenerate = useCallback(async () => {
    const cards = getActiveCards();
    if (cards.length !== HAND_SIZE) return;

    setGenerating(true);
    setGeneratedPrompt(null);

    const cardList = cards
      .map((c, i) =>
        `${i + 1}. **${c.title}** (${typeLabel(c.type)})${c.description ? `\n   ${c.description}` : ""}`
      )
      .join("\n\n");

    const systemMessage = `You are an expert AI art prompt engineer. You synthesize StyleTarot card concepts — movements, artists, media, subjects, settings, and inspirations — into detailed, evocative image generation prompts.

Modern AI image models (DALL-E 3, Midjourney, Stable Diffusion XL, Flux) handle long, specific prompts exceptionally well. Your prompts are rich in visual specificity: main subject, scene composition, artistic style, lighting, color palette, texture, mood, and atmosphere. You MUST explicitly name the art movements, artists, and other concepts drawn from the card titles within the prompt text itself — never describe a style anonymously.

Return ONLY the art prompt itself — 150 to 250 words of pure visual description. No preamble, no explanation, no labels, no quotation marks.`;

    const aspectSuffix = preferredAspectRatio
      ? `\n\nEnd the prompt with: ${preferredAspectRatio} aspect ratio`
      : "";
    const userMessage = `I drew these 5 StyleTarot cards as creative inspiration:

${cardList}

Create a single, unified AI art prompt that weaves all five cards into one cohesive, visually stunning artwork. Draw from the card descriptions for specific visual elements, style cues, subject matter, setting, and mood. The result should feel like a natural, intentional artwork — not a random mashup. Be specific: name colors, lighting conditions, compositional choices, textures, and emotional tone.${aspectSuffix}`;

    let prompt: string | null = null;
    setModelLabel(null);
    setModelWarning(null);

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          maxTokens: 2048,
        }),
      });

      if (res.headers.get("content-type")?.includes("x-ndjson")) {
        await readLLMStream(res, (event) => {
          if (event.status === "failed") {
            setModelWarning(`${event.model} failed — trying another model…`);
          } else if (event.status === "done") {
            prompt = event.content;
            setGeneratedPrompt(event.content);
            setModelLabel(event.model);
            if (event.warning) setModelWarning(event.warning);
            else setModelWarning(null);
          } else if (event.status === "error") {
            setGeneratedPrompt(t("generatePrompt"));
          }
        });
      } else {
        const data = await res.json();
        prompt = data.content ?? data.text ?? data.choices?.[0]?.message?.content ?? null;
        setGeneratedPrompt(prompt);
        if (data.model) setModelLabel(data.model);
        if (data.warning) setModelWarning(data.warning);
      }
    } catch {
      setGeneratedPrompt(t("generatePrompt"));
    }

    // Save history
    if (session?.user && prompt) {
      const indices = cards.map((c) => c.index);
      try {
        if (!savedEntryId) {
          const saveRes = await fetch("/api/styletarot/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardIndices: indices, generatedPrompt: prompt }),
          });
          const saved = await saveRes.json();
          if (saved.entry?.id) setSavedEntryId(saved.entry.id);
        } else {
          await fetch("/api/styletarot/history", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: savedEntryId, generatedPrompt: prompt }),
          });
        }
      } catch {
        // Non-fatal
      }
    }

    setGenerating(false);
    requestAnimationFrame(() => {
      promptRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [getActiveCards, session, savedEntryId, preferredAspectRatio, t]);

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedPrompt]);

  const handleNewHand = useCallback(() => {
    setGeneratedPrompt(null);
    setSavedEntryId(null);
    setCopied(false);
    handleDeal();
  }, [handleDeal]);

  // Fire deal animation after React commits card DOM elements.
  // Uses dealCount so Strict Mode's second run skips (lastAnimatedDeal already matches).
  useEffect(() => {
    if (dealCount === 0 || dealCount <= lastAnimatedDeal.current) return;
    if (!handRef.current) return;
    const els = Array.from(handRef.current.querySelectorAll<HTMLDivElement>(":scope > div"));
    if (els.length !== HAND_SIZE) return;

    lastAnimatedDeal.current = dealCount;
    if (shouldReduceMotion()) return;

    els.forEach((el, i) => {
      gsap.fromTo(
        el,
        { y: -20, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.4)", delay: i * 0.07 }
      );
    });
  }, [dealCount, hand]);

  // Fire redraw-in animation after new cards are in the DOM
  useEffect(() => {
    const indices = pendingRedrawAnim.current;
    if (!indices || hand.length !== HAND_SIZE) return;
    const els = indices.map((i) => cardRefs.current[i]).filter(Boolean) as HTMLDivElement[];
    if (els.length !== indices.length) return;

    pendingRedrawAnim.current = null;
    if (shouldReduceMotion()) return;

    els.forEach((el, i) => {
      gsap.fromTo(
        el,
        { y: -16, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.25, ease: "back.out(1.4)", delay: i * 0.06 }
      );
    });
  }, [hand]);

  // Animate prompt appearance
  useEffect(() => {
    if (generatedPrompt && promptRef.current && !shouldReduceMotion()) {
      gsap.fromTo(
        promptRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [generatedPrompt]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeCards = getActiveCards();

  const showDrawActions = mode === "draw" && drawPhase !== "start";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="space-y-8">
      {/* Mode tabs */}
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex rounded-full border border-black/10 bg-white p-1 gap-1">
          {(["draw", "explore"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setGeneratedPrompt(null);
                setSavedEntryId(null);
              }}
              className={[
                "px-5 py-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                mode === m
                  ? "text-white shadow-sm"
                  : "text-foreground/60 hover:text-foreground",
              ].join(" ")}
              style={mode === m ? { backgroundColor: "oklch(0.42 0.22 285)" } : {}}
            >
              {m === "draw" ? t("drawMode") : t("exploreMode")}
            </button>
          ))}
        </div>
        {session?.user && (
          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.42_0.22_285)] hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.42_0.22_285)] rounded"
            aria-label={t("addCard")}
          >
            <Plus size={13} aria-hidden="true" />
            {t("addCard")}
          </button>
        )}
      </div>

      {/* ── Draw mode ── */}
      {mode === "draw" && (
        <div className="space-y-6">
          {/* Start screen */}
          {drawPhase === "start" && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <p className="text-muted-foreground max-w-sm">
                {t("drawDescription")}
              </p>
              <button
                onClick={handleDeal}
                className="px-8 py-4 rounded-full text-lg font-semibold text-white transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ backgroundColor: "oklch(0.42 0.22 285)" }}
              >
                {t("dealCards")}
              </button>
            </div>
          )}

          {/* Hand */}
          {hand.length > 0 && (
            <div>
              {/* Instructions */}
              {drawPhase === "dealt" && (
                <p className="text-center text-sm text-muted-foreground mb-4">
                  <span className="font-semibold text-foreground/80">
                    {t("redraws", { n: redrawsLeft })}
                  </span>
                  {" · "}
                  {t("holdInstruction")}
                </p>
              )}
              {drawPhase === "drawn" && (
                <p className="text-center text-sm text-muted-foreground mb-4">
                  <span className="font-semibold text-foreground/80">{t("handLocked")}</span>
                  {" "}{t("generateInstruction")}
                </p>
              )}
              {drawPhase === "locked" && !generatedPrompt && (
                <p className="text-center text-sm text-muted-foreground mb-4">
                  <span className="font-semibold text-foreground/80">{t("handLocked")}</span>
                  {" "}{t("generateInstruction")}
                </p>
              )}

              {/* Cards */}
              <div
                ref={handRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
              >
                {hand.map((card, i) => (
                  <div
                    key={`${card.index}-${i}`}
                    ref={(el) => { cardRefs.current[i] = el; }}
                    className={[
                      // Center the 5th card on mobile 2-col grid
                      i === 4 ? "col-span-2 sm:col-span-1 mx-auto w-1/2 sm:w-full" : "",
                    ].join(" ")}
                  >
                    <CardFace
                      card={card}
                      held={held[i]}
                      onClick={() => handleToggleHold(i)}
                      interactive={drawPhase === "dealt"}
                      heldLabel={t("lockHand")}
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              {showDrawActions && (
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  {drawPhase === "dealt" && (
                    <button
                      onClick={handleRedraw}
                      disabled={redrawsLeft <= 0}
                      className="px-6 py-3 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2"
                      style={{ backgroundColor: "oklch(0.42 0.22 285)" }}
                    >
                      {t("redraw", { n: redrawsLeft })}
                    </button>
                  )}

                  {drawPhase === "dealt" && (
                    <button
                      onClick={handleLockHand}
                      className="px-6 py-3 rounded-full font-semibold border border-black/20 text-foreground/70 hover:text-foreground hover:border-black/40 transition-colors focus-visible:outline-none focus-visible:ring-2"
                    >
                      {t("lockHand")}
                    </button>
                  )}

                  {(drawPhase === "drawn" || drawPhase === "locked") && (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="px-6 py-3 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                      style={{ backgroundColor: "oklch(0.60 0.14 195)" }}
                    >
                      {generating ? t("generating") : generatedPrompt ? t("regenerate") : t("generatePrompt")}
                    </button>
                  )}

                  <button
                    onClick={handleNewHand}
                    className="px-6 py-3 rounded-full font-semibold border border-black/20 text-foreground/60 hover:text-foreground hover:border-black/40 transition-colors focus-visible:outline-none focus-visible:ring-2"
                  >
                    {t("newHand")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Explore mode ── */}
      {mode === "explore" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("selectCards", { n: HAND_SIZE })}
            </p>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: exploreSelected.size === HAND_SIZE ? "oklch(0.60 0.14 195)" : "oklch(0.42 0.22 285)" }}
            >
              {exploreSelected.size}/{HAND_SIZE}
            </span>
          </div>

          <ExploreMode
            selected={exploreSelected}
            onToggle={handleExploreToggle}
            searchPlaceholder={t("searchPlaceholder")}
            allTypesLabel={t("allTypes")}
            noResultsLabel={t("noResults")}
            heldLabel={t("lockHand")}
          />

          {exploreSelected.size === HAND_SIZE && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-3 rounded-full font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                style={{ backgroundColor: "oklch(0.60 0.14 195)" }}
              >
                {generating ? t("generating") : generatedPrompt ? t("regenerate") : t("generatePrompt")}
              </button>
              <button
                onClick={() => { setExploreSelected(new Set()); setGeneratedPrompt(null); }}
                className="px-6 py-3 rounded-full font-semibold border border-black/20 text-foreground/60 hover:text-foreground hover:border-black/40 transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                {t("clearSelection")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Selected cards preview (explore mode) ── */}
      {mode === "explore" && exploreSelected.size > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground text-center">
            {t("yourSelection")}
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from(exploreSelected).map((idx) => {
              const card = TAROT_CARDS.find((c) => c.index === idx);
              if (!card) return null;
              return (
                <div key={idx}>
                  <CardFace
                    card={card}
                    held={true}
                    onClick={() => handleExploreToggle(idx)}
                    interactive={true}
                    heldLabel={t("lockHand")}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Generating spinner ── */}
      {generating && !generatedPrompt && (
        <div className="flex items-center justify-center py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/loading_animation_satori_bear-small.gif"
            alt="Generating prompt…"
            className="w-48 h-48 object-contain"
          />
        </div>
      )}

      {/* ── Generated prompt ── */}
      {generatedPrompt && (
        <div
          ref={promptRef}
          className="rounded-2xl border border-black/10 bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "oklch(0.42 0.22 285)" }}
            >
              {t("generatedPrompt")}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              >
                {copied ? t("copied") : t("copy")}
              </button>
              <button
                onClick={() => {
                  if (!session?.user) { setShowSignInModal(true); return; }
                  setShowShareModal(true);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[oklch(0.42_0.22_285)] text-[oklch(0.42_0.22_285)] hover:bg-purple-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              >
                {t("share")}
              </button>
            </div>
          </div>
          {modelWarning && (
            <p className="text-xs text-amber-600 dark:text-amber-500 -mt-1 mb-1">
              ⚠️ {modelWarning}
            </p>
          )}
          <p className="text-sm leading-relaxed text-foreground">{generatedPrompt}</p>
          {modelLabel && (
            <p className="text-xs text-muted-foreground/50 -mt-1">
              via {modelLabel.split("/").pop()?.replace(/:free$/, "")}
            </p>
          )}

          {/* Cards used summary */}
          <div className="border-t border-black/5 pt-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("cardsUsed")}</p>
            <div className="flex flex-wrap gap-1.5">
              {activeCards.map((card) => {
                const color = (CARD_TYPE_COLORS as Record<string, string>)[card.type] ?? "oklch(0.42 0.22 285)";
                return (
                  <span
                    key={card.index}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {card.title}
                  </span>
                );
              })}
            </div>
          </div>

          {session?.user && (
            <p className="text-[11px] text-foreground/40">{t("savedToHistory")}</p>
          )}
        </div>
      )}
    </div>

      {showShareModal && generatedPrompt && (
        <ShareToRisingModal
          prompt={generatedPrompt}
          toolOrigin="styletarot"
          toolContext={JSON.stringify({
            cards: activeCards.map((c) => ({
              index: c.index,
              title: c.title,
              type: c.type,
              ...("isCommunity" in c
                ? { imageUrl: (c as CommunityCard).imageUrl, isCommunity: true }
                : { imageFilename: (c as TarotCard).imageFilename }),
            })),
            ...(savedEntryId ? { historyEntryId: savedEntryId } : {}),
          })}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showAddCardModal && (
        <AddCardModal
          onClose={() => setShowAddCardModal(false)}
          onSubmitted={() => {
            setShowAddCardModal(false);
            setCommunityRefetch((n) => n + 1);
          }}
        />
      )}

      {showSignInModal && generatedPrompt && (
        <SignInPromptModal
          pendingShare={{
            tool: "styletarot",
            prompt: generatedPrompt,
            toolOrigin: "styletarot",
            toolContext: JSON.stringify(
              activeCards.map((c) => ({
                index: c.index,
                title: c.title,
                type: c.type,
                ...("isCommunity" in c
                  ? { imageUrl: (c as CommunityCard).imageUrl, isCommunity: true }
                  : { imageFilename: (c as TarotCard).imageFilename }),
              }))
            ),
            historyPayload: {
              cardIndices: JSON.stringify(activeCards.map((c) => c.index)),
            },
          }}
          onClose={() => setShowSignInModal(false)}
        />
      )}
    </>
  );
}

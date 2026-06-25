"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { RisingPost } from "@/app/api/rising/posts/route";
import { X, ExternalLink, Heart, Flag } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  deviantart: "DeviantArt",
  discord: "Discord",
  site: "Site Upload",
};

const TOOL_LABELS: Record<string, string> = {
  stylebear: "StyleBear",
  styletarot: "StyleTarot",
  styledice: "StyleDice",
  museum: "Virtual Museum",
};

const CARD_TYPE_COLORS: Record<string, string> = {
  movement: "oklch(0.42 0.22 285)",
  subject: "oklch(0.55 0.18 35)",
  media: "oklch(0.50 0.16 160)",
  artist: "oklch(0.48 0.20 300)",
  inspiration: "oklch(0.52 0.19 50)",
  technique: "oklch(0.46 0.17 220)",
  setting: "oklch(0.50 0.15 130)",
  situation: "oklch(0.54 0.18 15)",
  "pop culture": "oklch(0.50 0.22 10)",
  location: "oklch(0.48 0.16 190)",
};

interface TarotCardMini {
  index: number;
  title: string;
  type: string;
  imageFilename: string;
}

function TarotCardMiniDisplay({ card }: { card: TarotCardMini }) {
  const [imgError, setImgError] = useState(false);
  const color = CARD_TYPE_COLORS[card.type] ?? "oklch(0.42 0.22 285)";
  return (
    <div className="rounded-xl overflow-hidden shadow-md">
      <div className="relative aspect-[9/16] bg-stone-700">
        {!imgError ? (
          <Image
            fill
            src={`/images/styletarot/${card.imageFilename}`}
            alt={card.title}
            sizes="20vw"
            quality={85}
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <span className="text-2xl">🎴</span>
          </div>
        )}
      </div>
      <div className="p-1.5 bg-white space-y-0.5">
        <span
          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {card.type}
        </span>
        <p className="text-[10px] font-semibold text-stone-800 leading-tight line-clamp-2">{card.title}</p>
      </div>
    </div>
  );
}

interface Props {
  post: RisingPost;
  onClose: () => void;
  onVote: (postId: string) => void;
}

export function RisingDetailModal({ post, onClose, onVote }: Props) {
  const totalLikes = post.siteLikes + post.rawEngagement;
  const [reported, setReported] = useState(false);

  async function handleReport() {
    if (reported) return;
    await fetch("/api/rising/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    setReported(true);
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-stone-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-stone-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Image */}
        <div className="rounded-t-2xl overflow-hidden bg-black">
          <img
            src={post.imageUrl}
            alt={post.title ?? `Art by ${post.creatorName}`}
            className="w-full max-h-[60vh] object-contain"
          />
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">
          {/* Creator + source */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-semibold text-base">
                {post.creatorName}
              </p>
              <p className="text-stone-400 text-sm">
                via {SOURCE_LABELS[post.source] ?? post.source}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onVote(post.id)}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  post.hasVoted
                    ? "text-red-400 hover:text-red-300"
                    : "text-stone-300 hover:text-white"
                }`}
                aria-label={`${post.hasVoted ? "Unlike" : "Like"}`}
              >
                <Heart
                  size={16}
                  className={post.hasVoted ? "fill-red-400" : ""}
                />
                {totalLikes}
              </button>
              {post.sourceUrl && (
                <a
                  href={post.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-stone-400 hover:text-white text-sm transition-colors"
                >
                  View original <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Tool context tags */}
          {post.toolOrigin && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded-full font-medium">
                {TOOL_LABELS[post.toolOrigin] ?? post.toolOrigin}
              </span>
            </div>
          )}

          {/* StyleTarot cards */}
          {post.toolOrigin === "styletarot" && (() => {
            try {
              const parsed = JSON.parse(post.toolContext ?? "");
              const cards: TarotCardMini[] = Array.isArray(parsed)
                ? parsed
                : (Array.isArray(parsed?.cards) ? parsed.cards : []);
              if (cards.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Cards used</p>
                  <div className="grid grid-cols-5 gap-2">
                    {cards.map((card) => (
                      <TarotCardMiniDisplay key={card.index} card={card} />
                    ))}
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          {/* Prompt / caption */}
          {post.caption && (
            <div className="bg-stone-800 rounded-lg p-4">
              <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                {post.caption}
              </p>
            </div>
          )}

          {/* Title */}
          {post.title && (
            <p className="text-stone-400 text-sm italic">{post.title}</p>
          )}

          {/* Report */}
          <div className="pt-2 border-t border-stone-800 flex justify-end">
            <button
              onClick={handleReport}
              disabled={reported}
              className={`flex items-center gap-1 text-xs transition-colors ${
                reported
                  ? "text-stone-600 cursor-default"
                  : "text-stone-600 hover:text-stone-400"
              }`}
              aria-label="Report this post"
            >
              <Flag size={12} />
              {reported ? "Reported" : "Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

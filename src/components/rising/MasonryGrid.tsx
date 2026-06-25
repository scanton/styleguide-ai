"use client";
/**
 * Equal-area gallery layout.
 *
 * Every image is pre-sized so width = sqrt(A × AR) and height = sqrt(A / AR).
 * Because w/h = AR, each container exactly matches the image's natural aspect
 * ratio — no cropping, no letter/pillarbox bars, no distortion.
 * Because w × h = A for every image, every image has the same pixel area
 * regardless of whether it's portrait, landscape, or square.
 *
 * Images are then grouped into rows (greedy fill), and each row is scaled
 * uniformly (capped at MAX_SCALE to prevent over-stretching sparse rows).
 * Each image in a row gets its own width and height — not a shared row height.
 *
 * Mobile: 2-column natural-height columns (simpler, still no cropping).
 */
import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { RisingPost } from "@/app/api/rising/posts/route";

// ── constants ───────────────────────────────────────────────────────────────

const GAP = 8;
const TARGET_AREA = 220 * 220; // 48,400 px² — equal area target per image
const MAX_SCALE = 1.35;        // max row stretch before we left-align
const MIN_PER_ROW = 2;         // never let a single image balloon up alone

const ASPECT_FALLBACKS: Record<string, number> = {
  portrait: 3 / 4,
  square: 1,
  landscape: 4 / 3,
};

const SOURCE_LABELS: Record<string, string> = {
  deviantart: "DA",
  discord: "Discord",
  site: "Site",
};

const TOOL_COLORS: Record<string, string> = {
  stylebear: "bg-purple-600",
  styletarot: "bg-indigo-600",
  styledice: "bg-teal-600",
  museum: "bg-amber-600",
};

// ── geometry ─────────────────────────────────────────────────────────────────

function getAR(post: RisingPost): number {
  if (post.imageWidth && post.imageHeight && post.imageHeight > 0) {
    return post.imageWidth / post.imageHeight;
  }
  return ASPECT_FALLBACKS[post.aspectRatioClass] ?? 1;
}

/** Pre-sized dims such that w×h = TARGET_AREA and w/h = AR. */
function preDims(ar: number): { w: number; h: number } {
  return {
    w: Math.sqrt(TARGET_AREA * ar),
    h: Math.sqrt(TARGET_AREA / ar),
  };
}

interface RowItem {
  post: RisingPost;
  preW: number;
  preH: number;
}

interface Row {
  items: RowItem[];
  scale: number; // uniform scale applied to all preW/preH in this row
}

function buildRows(posts: RisingPost[], containerWidth: number): Row[] {
  const rows: Row[] = [];
  let i = 0;

  while (i < posts.length) {
    let acc = 0;
    let j = i;

    // Greedily accumulate images into this row
    while (j < posts.length) {
      const ar = getAR(posts[j]);
      const { w } = preDims(ar);
      const needed = w + (j > i ? GAP : 0);
      if (acc + needed > containerWidth && j > i) break;
      acc += needed;
      j++;
    }

    // Always at least MIN_PER_ROW images so a single wide image can't balloon alone
    while (j - i < MIN_PER_ROW && j < posts.length) {
      const { w } = preDims(getAR(posts[j]));
      acc += GAP + w;
      j++;
    }

    const items: RowItem[] = posts.slice(i, j).map((post) => {
      const ar = getAR(post);
      const { w, h } = preDims(ar);
      return { post, preW: w, preH: h };
    });

    const totalPreW = items.reduce((s, it) => s + it.preW, 0);
    const available = containerWidth - (items.length - 1) * GAP;
    // Scale to fill the row, but cap so sparse rows don't balloon
    const scale = Math.min(available / totalPreW, MAX_SCALE);

    rows.push({ items, scale });
    i = j;
  }

  return rows;
}

// ── Card ─────────────────────────────────────────────────────────────────────

function EqualAreaCard({
  post,
  width,
  height,
  onVote,
  onClick,
}: {
  post: RisingPost;
  width: number;
  height: number;
  onVote: (id: string) => void;
  onClick: (post: RisingPost) => void;
}) {
  const [liked, setLiked] = useState(post.hasVoted);
  const [count, setCount] = useState(post.siteLikes);
  const totalLikes = count + post.rawEngagement;
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const hoursLeft = Math.max(0, Math.round((new Date(post.expiresAt).getTime() - nowMs) / 3_600_000));

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? c - 1 : c + 1));
    onVote(post.id);
  }

  return (
    <div
      className="relative flex-none overflow-hidden rounded-xl cursor-pointer group"
      style={{ width, height, flexShrink: 0 }}
      onClick={() => onClick(post)}
    >
      {/*
        objectFit "fill" is intentional: because width/height = AR exactly
        (from preDims), the container matches the image's natural ratio —
        so fill === contain === cover with zero bars or cropping.
        For fallback-AR images (no stored dims), object-contain is safer.
      */}
      {post.imageWidth && post.imageHeight ? (
        <img
          src={post.imageUrl}
          alt={post.title ?? `Art by ${post.creatorName}`}
          width={width}
          height={height}
          className="block bg-stone-900"
          style={{ width, height, objectFit: "fill" }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <img
          src={post.imageUrl}
          alt={post.title ?? `Art by ${post.creatorName}`}
          width={width}
          height={height}
          className="block w-full h-full object-contain bg-stone-900"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Like button — always visible */}
      <div className="absolute top-2 right-2">
        <button
          onClick={handleVote}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm transition-transform hover:scale-110 ${
            liked
              ? "bg-red-500/85 text-white"
              : "bg-black/55 text-white/90 hover:bg-black/70"
          }`}
          aria-label={`${liked ? "Unlike" : "Like"} — ${totalLikes} likes`}
        >
          <Heart size={12} className={liked ? "fill-white text-white" : "text-white/80"} />
          <span>{totalLikes}</span>
        </button>
      </div>

      {/* Overlays — hidden until hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        {/* Top-left: source + tool badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-black/55 px-2 py-0.5 rounded-full self-start">
            {SOURCE_LABELS[post.source] ?? post.source}
          </span>
          {post.toolOrigin && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide text-white px-2 py-0.5 rounded-full self-start ${
                TOOL_COLORS[post.toolOrigin] ?? "bg-stone-600"
              }`}
            >
              {post.toolOrigin}
            </span>
          )}
        </div>

        {/* Bottom: creator + hours */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3 flex items-end justify-between">
          <span className="text-white text-xs font-medium truncate max-w-[72%] drop-shadow">
            {post.creatorName}
          </span>
          <span className="text-white/60 text-[10px] tabular-nums">{hoursLeft}h</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-stone-400 text-center">
      <p className="text-lg font-medium mb-2">Nothing here yet</p>
      <p className="text-sm max-w-xs">
        The gallery refreshes every 24 hours. Check back soon — or be the first
        to share something.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  posts: RisingPost[];
  onVote: (id: string) => void;
  onCardClick: (post: RisingPost) => void;
}

export function MasonryGrid({ posts, onVote, onCardClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    setContainerWidth(Math.floor(el.offsetWidth));
    return () => ro.disconnect();
  }, []);

  if (posts.length === 0) return <EmptyState />;

  return (
    <div ref={containerRef}>
      {/* Desktop: equal-area rows */}
      {containerWidth > 0 && (
        <div className="hidden sm:flex sm:flex-col sm:gap-2">
          {buildRows(posts, containerWidth).map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2 items-center">
              {row.items.map(({ post, preW, preH }) => {
                const w = Math.round(preW * row.scale);
                const h = Math.round(preH * row.scale);
                return (
                  <EqualAreaCard
                    key={post.id}
                    post={post}
                    width={w}
                    height={h}
                    onVote={onVote}
                    onClick={onCardClick}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Mobile: 2-column natural-height columns */}
      <div className="sm:hidden columns-2 gap-2">
        {posts.map((post) => (
          <div key={post.id} className="break-inside-avoid mb-2">
            <div
              className="relative overflow-hidden rounded-xl cursor-pointer group bg-stone-900"
              onClick={() => onCardClick(post)}
            >
              <img
                src={post.imageUrl}
                alt={post.title ?? `Art by ${post.creatorName}`}
                className="w-full h-auto block"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 flex items-end justify-between">
                  <span className="text-white text-[11px] font-medium truncate max-w-[65%]">
                    {post.creatorName}
                  </span>
                  <span className="text-white/70 text-[10px] tabular-nums">
                    ♥ {(post.siteLikes ?? 0) + (post.rawEngagement ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

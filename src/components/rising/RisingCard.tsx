"use client";
import { useState } from "react";
import type { RisingPost } from "@/app/api/rising/posts/route";
import { Heart } from "lucide-react";

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

interface Props {
  post: RisingPost;
  onVote: (postId: string) => void;
  onClick: (post: RisingPost) => void;
}

export function RisingCard({ post, onVote, onClick }: Props) {
  const [optimisticLiked, setOptimisticLiked] = useState(post.hasVoted);
  const [optimisticCount, setOptimisticCount] = useState(post.siteLikes);

  const totalLikes = optimisticCount + post.rawEngagement;

  const hoursLeft = Math.max(
    0,
    Math.round((new Date(post.expiresAt).getTime() - Date.now()) / 3_600_000)
  );

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    setOptimisticLiked((v) => !v);
    setOptimisticCount((c) => (optimisticLiked ? c - 1 : c + 1));
    onVote(post.id);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl cursor-pointer group bg-stone-800 ${
        post.aspectRatioClass === "portrait"
          ? "row-span-2"
          : post.aspectRatioClass === "landscape"
          ? "col-span-2"
          : ""
      }`}
      onClick={() => onClick(post)}
    >
      {/* Image */}
      <img
        src={post.thumbnailUrl ?? post.imageUrl}
        alt={post.title ?? `Art by ${post.creatorName}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />

      {/* Top badges */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
        {post.toolOrigin ? (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide text-white px-2 py-0.5 rounded-full ${
              TOOL_COLORS[post.toolOrigin] ?? "bg-stone-600"
            }`}
          >
            {post.toolOrigin}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
          {SOURCE_LABELS[post.source] ?? post.source}
        </span>
      </div>

      {/* Bottom overlay: creator + likes */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-3 flex items-end justify-between">
        <span className="text-white text-xs font-medium truncate max-w-[60%] drop-shadow">
          {post.creatorName}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-xs tabular-nums">{hoursLeft}h</span>
          <button
            onClick={handleVote}
            className="flex items-center gap-1 text-white text-xs font-semibold hover:scale-110 transition-transform"
            aria-label={`${optimisticLiked ? "Unlike" : "Like"} — ${totalLikes} likes`}
          >
            <Heart
              size={14}
              className={optimisticLiked ? "fill-red-400 text-red-400" : "text-white/80"}
            />
            <span>{totalLikes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

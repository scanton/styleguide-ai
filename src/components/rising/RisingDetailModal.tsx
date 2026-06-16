"use client";
import { useEffect } from "react";
import type { RisingPost } from "@/app/api/rising/posts/route";
import { X, ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface Props {
  post: RisingPost;
  onClose: () => void;
  onVote: (postId: string) => void;
}

export function RisingDetailModal({ post, onClose, onVote }: Props) {
  const totalLikes = post.siteLikes + post.rawEngagement;

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
        </div>
      </div>
    </div>
  );
}

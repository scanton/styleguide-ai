"use client";
import type { RisingPost } from "@/app/api/rising/posts/route";
import { RisingCard } from "./RisingCard";

interface Props {
  posts: RisingPost[];
  onVote: (postId: string) => void;
  onCardClick: (post: RisingPost) => void;
}

export function RisingGrid({ posts, onVote, onCardClick }: Props) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 text-center">
        <p className="text-lg font-medium mb-2">Nothing here yet</p>
        <p className="text-sm max-w-xs">
          The gallery refreshes every 12 hours. Check back soon — or be the first
          to share something.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: aspect-ratio-aware CSS grid */}
      <div
        className="hidden md:grid gap-2"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gridAutoRows: "220px",
          gridAutoFlow: "dense",
        }}
      >
        {posts.map((post) => (
          <RisingCard
            key={post.id}
            post={post}
            onVote={onVote}
            onClick={onCardClick}
          />
        ))}
      </div>

      {/* Mobile: 2-column natural-height masonry via CSS columns */}
      <div className="md:hidden columns-2 gap-2 space-y-2">
        {posts.map((post) => (
          <div key={post.id} className="break-inside-avoid mb-2">
            <div
              className="relative overflow-hidden rounded-xl cursor-pointer group bg-stone-800"
              onClick={() => onCardClick(post)}
            >
              <img
                src={post.thumbnailUrl ?? post.imageUrl}
                alt={post.title ?? `Art by ${post.creatorName}`}
                className="w-full h-auto object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 flex items-end justify-between">
                <span className="text-white text-[11px] font-medium truncate max-w-[60%]">
                  {post.creatorName}
                </span>
                <span className="text-white/80 text-[11px]">
                  ♥ {post.siteLikes + post.rawEngagement}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

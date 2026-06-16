"use client";
import { useState } from "react";
import { Heart } from "lucide-react";

interface Props {
  postId: string;
  initialLikes: number;
}

export function RisingPostLikeButton({ postId, initialLikes }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (loading) return;
    setLoading(true);
    const prev = liked;
    setLiked(!prev);
    setCount((c) => (prev ? c - 1 : c + 1));
    try {
      const res = await fetch("/api/rising/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        const { voted, likes } = (await res.json()) as { voted: boolean; likes: number };
        setLiked(voted);
        setCount(likes);
      }
    } catch {
      // revert optimistic update
      setLiked(prev);
      setCount((c) => (prev ? c + 1 : c - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        liked
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-stone-800 text-white/80 hover:bg-stone-700 hover:text-white"
      }`}
      aria-label={`${liked ? "Unlike" : "Like"} — ${count} likes`}
    >
      <Heart size={16} className={liked ? "fill-white text-white" : "text-white/60"} />
      <span>{count} {count === 1 ? "like" : "likes"}</span>
    </button>
  );
}

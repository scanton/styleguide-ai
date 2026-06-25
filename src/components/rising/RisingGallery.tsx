"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { RisingPost, RisingSource } from "@/app/api/rising/posts/route";
import { MasonryGrid } from "./MasonryGrid";
import { RisingDetailModal } from "./RisingDetailModal";

type TabKey = "all" | RisingSource | "tools";

export function RisingGallery() {
  const t = useTranslations("rising");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [posts, setPosts] = useState<RisingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<RisingPost | null>(null);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all",        label: t("tabRising") },
    { key: "deviantart", label: "DeviantArt" },
    { key: "discord",    label: "Discord" },
    { key: "site",       label: t("tabSiteUploads") },
    { key: "tools",      label: t("tabFromTools") },
  ];

  const fetchPosts = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rising/posts?source=${tab}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { posts: RisingPost[] };
      setPosts(data.posts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPosts(activeTab);
  }, [activeTab, fetchPosts]);

  async function handleVote(postId: string) {
    try {
      const res = await fetch("/api/rising/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) return;
      const { voted, likes } = (await res.json()) as { voted: boolean; likes: number };
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, hasVoted: voted, siteLikes: likes } : p
        )
      );
      if (selectedPost?.id === postId) {
        setSelectedPost((p) => p ? { ...p, hasVoted: voted, siteLikes: likes } : p);
      }
    } catch {
      // silent — optimistic UI already updated in RisingCard
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-[oklch(0.42_0.22_285)] text-white"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gridAutoRows: "220px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <MasonryGrid
          posts={posts}
          onVote={handleVote}
          onCardClick={setSelectedPost}
        />
      )}

      {/* Detail modal */}
      {selectedPost && (
        <RisingDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

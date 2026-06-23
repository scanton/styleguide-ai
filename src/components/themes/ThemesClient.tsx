"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discordTags: string[];
  threadUrl: string | null;
  postedAt: string | null;
}

interface EventsResponse {
  events: CommunityEvent[];
  total: number;
  page: number;
  limit: number;
}

const TAG_COLORS: Record<string, string> = {
  "Daily Theme": "bg-primary/10 text-primary",
  "Contest":     "bg-accent/10 text-accent",
  "Challenge":   "bg-[oklch(0.65_0.17_30)]/10 text-[oklch(0.55_0.17_30)]",
  "Special":     "bg-[oklch(0.78_0.15_85)]/10 text-[oklch(0.58_0.15_85)]",
};

function tagClass(tag: string) {
  return TAG_COLORS[tag] ?? "bg-muted text-muted-foreground";
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PAGE_SIZE = 24;

export function ThemesClient({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/events?${params}`);
      const json = (await res.json()) as EventsResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(query, page);
  }, [query, page, fetchEvents]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = inputValue.trim();
    setQuery(next);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next); else params.delete("q");
    router.replace(`/themes?${params}`);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-8">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search themes and events…"
          className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Search community themes"
        />
        <button
          type="submit"
          className="h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setInputValue(""); setQuery(""); setPage(1); router.replace("/themes"); }}
            className="h-11 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </form>

      {/* Results count */}
      {!loading && data && (
        <p className="text-sm text-muted-foreground">
          {data.total === 0
            ? "No themes found."
            : `${data.total} theme${data.total === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : data?.events.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-3" aria-hidden="true">🎨</p>
          <p>No themes yet — check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-border bg-card overflow-hidden flex flex-col gap-0 hover:border-primary/40 transition-colors"
            >
              {/* Image — Discord CDN URLs expire after ~24h, hide on error */}
              {event.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full aspect-video object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
              {/* Tags */}
              {event.discordTags && event.discordTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {event.discordTags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagClass(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h2 className="font-semibold text-base leading-snug">{event.title}</h2>

              {/* Description */}
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-1 gap-2">
                <time
                  dateTime={event.postedAt ?? undefined}
                  className="text-xs text-muted-foreground"
                >
                  {formatDate(event.postedAt)}
                </time>
                {event.threadUrl && (
                  <a
                    href={event.threadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline underline-offset-2 min-h-[44px] flex items-center"
                  >
                    View on Discord ↗
                  </a>
                )}
              </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-10 px-4 rounded-md border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-10 px-4 rounded-md border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

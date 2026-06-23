"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  mediumUrl: string;
  publishedAt: string | null;
  tags: string[];
  thumbnailUrl: string | null;
}

interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
}

interface Props {
  initialQ: string;
  initialPage: number;
  initialTotal: number;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPaginationItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const around = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const pages = Array.from(around)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const items: (number | "…")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push("…");
    items.push(pages[i]);
  }
  return items;
}

const PAGE_SIZE = 24;

export function ArticlesClient({ initialQ, initialPage, initialTotal }: Props) {
  const t = useTranslations("articles");
  const ta = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/articles?${params}`);
      const json = (await res.json()) as ArticlesResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(query, page);
  }, [query, page, fetchArticles]);

  function pushUrl(q: string, p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q); else params.delete("q");
    if (p > 1) params.set("page", String(p)); else params.delete("page");
    router.replace(`/articles?${params}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = inputValue.trim();
    setQuery(next);
    setPage(1);
    pushUrl(next, 1);
  }

  function goToPage(p: number) {
    setPage(p);
    pushUrl(query, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const total = data?.total ?? initialTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <div className="space-y-8">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={t("searchPlaceholder")}
        />
        <button
          type="submit"
          className="h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t("search")}
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setInputValue(""); setQuery(""); setPage(1); pushUrl("", 1); }}
            className="h-11 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("clearSearch")}
          >
            ✕
          </button>
        )}
      </form>

      {/* Results count */}
      {!loading && data && (
        <p className="text-sm text-muted-foreground">
          {data.total === 0
            ? t("noArticles")
            : `${data.total} article${data.total === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse h-64" />
          ))}
        </div>
      ) : data?.articles.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-3" aria-hidden="true">📚</p>
          <p>{t("emptyState")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.articles.map((article) => (
            <a
              key={article.id}
              href={article.mediumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-ring"
            >
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {article.thumbnailUrl && (
                <img
                  src={article.thumbnailUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}

              <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Tags */}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h2 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
                  {article.title}
                </h2>

                {/* Summary */}
                {article.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {article.summary}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 mt-auto gap-2">
                  <time
                    dateTime={article.publishedAt ?? undefined}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(article.publishedAt)}
                  </time>
                  <span className="text-xs font-medium text-primary">
                    {t("readOnMedium")}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label={t("paginationLabel")}
          className="flex items-center justify-center gap-1 pt-4 flex-wrap"
        >
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="h-10 px-3 rounded-md border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            aria-label={ta("prevPage")}
          >
            ←
          </button>

          {paginationItems.map((item, i) =>
            item === "…" ? (
              <span key={`ellipsis-${i}`} className="h-10 w-10 flex items-center justify-center text-sm text-muted-foreground select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => goToPage(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`${item}`}
                className={`h-10 w-10 rounded-md text-sm font-medium transition-colors ${
                  item === page
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="h-10 px-3 rounded-md border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            aria-label={ta("nextPage")}
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}

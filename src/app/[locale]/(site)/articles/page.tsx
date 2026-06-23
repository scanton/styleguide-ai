import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArticlesClient } from "@/components/articles/ArticlesClient";
import { db } from "@/lib/db";
import { articles } from "@/drizzle/schema";
import { count, notInArray } from "drizzle-orm";
import { ARTICLES_BLOCKLIST } from "@/data/articles-blocklist";

const BLOCKED_SLUGS = Array.from(ARTICLES_BLOCKLIST);

export const metadata: Metadata = {
  title: "Art History Articles",
  description:
    "Deep-dives into art movements, techniques, and the history behind the styles that inspire our AI art community. Originally published on Medium.",
  openGraph: {
    title: "Art History Articles — StyleGuideAI",
    description: "Deep-dives into art movements, techniques, and the history behind the styles that inspire our AI art community. Originally published on Medium.",
    images: [{ url: "/images/og/og-articles.png", width: 1672, height: 941, alt: "Art History Articles — StyleGuideAI" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-articles.png"] },
};

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const { q = "", page: pageParam = "1" } = await searchParams;
  const initialPage = Math.max(1, parseInt(pageParam, 10) || 1);

  const [[{ total }], t] = await Promise.all([
    db
      .select({ total: count() })
      .from(articles)
      .where(notInArray(articles.slug, BLOCKED_SLUGS))
      .catch(() => [{ total: 0 }]),
    getTranslations("articles"),
  ]);

  return (
    <main className="min-h-screen px-4 py-12 md:py-16">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span aria-hidden="true">{t("badge")}</span>
            <span>{t("byAuthor")}</span>
          </div>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            {t("heading")}
          </h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {t("totalCount", { total })}
          </p>
          <a
            href="https://medium.com/@satoricanton"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-2"
          >
            {t("followMedium")}
          </a>
        </div>

        {/* Articles grid with search */}
        <Suspense>
          <ArticlesClient initialQ={q} initialPage={initialPage} initialTotal={total} />
        </Suspense>
      </div>
    </main>
  );
}

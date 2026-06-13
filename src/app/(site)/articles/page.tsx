import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticlesClient } from "@/components/articles/ArticlesClient";

export const metadata: Metadata = {
  title: "Art History Articles",
  description:
    "300+ articles on art movements, art history, and AI art by Satori Canton. Explore Impressionism, Cubism, Art Nouveau, and more.",
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-12 md:py-16">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span aria-hidden="true">✍️</span>
            <span>By Satori Canton</span>
          </div>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            Art History Articles
          </h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            300+ deep-dives into art movements, techniques, and the history behind the styles that inspire our community. Originally published on Medium.
          </p>
          <a
            href="https://medium.com/@satoricanton"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-2"
          >
            Follow on Medium ↗
          </a>
        </div>

        {/* Articles grid with search */}
        <Suspense>
          <ArticlesClient initialQ={q} />
        </Suspense>
      </div>
    </main>
  );
}

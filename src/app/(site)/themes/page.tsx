import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemesClient } from "@/components/themes/ThemesClient";

export const metadata: Metadata = {
  title: "Community Themes & Events",
  description:
    "Browse all StyleGuideAI community art themes, challenges, and special events. Click through to join the conversation on Discord.",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ThemesPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
            <span aria-hidden="true">🎨</span>
            <span>Community Archive</span>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Themes &amp; Events
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
            Every daily theme, art challenge, and community event from our Discord — all in one
            searchable archive. Click any card to join the conversation.
          </p>
        </div>
        <Suspense fallback={<div className="animate-pulse h-12 rounded-md bg-muted max-w-md" />}>
          <ThemesClient initialQ={q} />
        </Suspense>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { StyleTarotClient } from "@/components/styletarot/StyleTarotClient";

export const metadata: Metadata = {
  title: "StyleTarot",
  description:
    "Draw five StyleTarot cards — movements, artists, media, subjects, and inspirations — and generate a detailed AI art prompt from your hand.",
  openGraph: {
    title: "StyleTarot — Art Inspiration Card Game",
    description: "Draw five StyleTarot cards — movements, artists, media, subjects, and inspirations — and generate a detailed AI art prompt from your hand.",
    images: [{ url: "/images/og/og-styletarot.png", width: 1672, height: 941, alt: "StyleTarot — Art Inspiration Card Game" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-styletarot.png"] },
};

export default async function StyleTarotPage() {
  const t = await getTranslations("styletarot");

  return (
    <main className="min-h-screen px-4 py-12 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span aria-hidden="true">🃏</span>
            <span>{t("badge")}</span>
          </div>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-xl text-muted-foreground text-lg leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <Suspense>
          <StyleTarotClient />
        </Suspense>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RisingGallery } from "@/components/rising/RisingGallery";

export const metadata: Metadata = {
  title: "Rising | StyleGuideAI",
  description: "Community art gallery — the most-loved images from the past 24 hours, pulled from DeviantArt, Discord, and direct uploads.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Rising | StyleGuideAI",
    description: "The most-loved AI art from our community in the past 24 hours.",
    images: [
      {
        url: "/images/og/og-rising.png",
        width: 1456,
        height: 816,
        alt: "Rising — StyleGuideAI Community Gallery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og/og-rising.png"],
  },
};

export default async function RisingPage() {
  const t = await getTranslations("rising");

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-400 mb-2">
            {t("badge")}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{t("heading")}</h1>
          <p className="text-stone-400 max-w-xl text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <RisingGallery />
      </div>
    </div>
  );
}

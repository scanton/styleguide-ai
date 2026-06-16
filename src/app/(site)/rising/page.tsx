import type { Metadata } from "next";
import { RisingGallery } from "@/components/rising/RisingGallery";

export const metadata: Metadata = {
  title: "Rising | StyleGuideAI",
  description: "Community art gallery — the most-loved images from the past 12 hours, pulled from DeviantArt, Discord, and direct uploads.",
  robots: { index: false, follow: false },
};

export default function RisingPage() {
  return (
    <main id="main-content" className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[oklch(0.42_0.22_285)] mb-2">
            Community Gallery
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Rising</h1>
          <p className="text-stone-400 max-w-xl text-base leading-relaxed">
            The most-loved art from our community in the past 12 hours. Images rise
            by getting the most hearts in the least time — then expire to make room
            for what&apos;s next.
          </p>
        </div>

        <RisingGallery />
      </div>
    </main>
  );
}

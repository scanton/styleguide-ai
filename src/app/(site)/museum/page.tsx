import type { Metadata } from "next";
import { getMovements, getArtists } from "@/lib/museum-data";
import MuseumTimeline from "@/components/museum/MuseumTimeline";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Virtual Museum — Explore Art History | StyleGuideAI",
  description:
    "Travel through six centuries of art history on an interactive timeline — movements, masters, and the connections between them.",
};

export default function MuseumPage() {
  const movements = getMovements();
  const artists = getArtists();

  return (
    <div className="py-8 md:py-12">
      {/* Hero */}
      <header className="mx-auto max-w-3xl space-y-3 px-4 pb-8 text-center md:pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          The Virtual Museum
        </p>
        <h1 className="font-heading text-4xl text-primary md:text-5xl">
          Six Centuries of Art, One Timeline
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          From Renaissance Florence to the digital frontier — {""}
          {movements.length} movements and {artists.length} artists, mapped in
          time. Tap anything to step closer.
        </p>
      </header>

      {/* Timeline (full-bleed) */}
      <MuseumTimeline movements={movements} artists={artists} />
    </div>
  );
}

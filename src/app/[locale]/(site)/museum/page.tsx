import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getMovements,
  getArtists,
  getEvents,
  getConnections,
  getGalleryKeys,
} from "@/lib/museum-data";
import MuseumTimeline from "@/components/museum/MuseumTimeline";

export const metadata: Metadata = {
  title: "Virtual Museum — Explore Art History",
  description:
    "Travel through 40,000 years of art history on an interactive timeline — movements, masters, world events, and the connections between them.",
  openGraph: {
    title: "Virtual Museum — Explore Art History",
    description: "Travel through 40,000 years of art history on an interactive timeline — movements, masters, world events, and the connections between them.",
    images: [{ url: "/images/og/og-museum.png", width: 1672, height: 941, alt: "StyleGuideAI Virtual Museum" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-museum.png"] },
};

export default async function MuseumPage() {
  const t = await getTranslations("museum");
  const movements = getMovements();
  const artists = getArtists();
  const events = getEvents();
  const connections = getConnections();
  const galleryKeys = getGalleryKeys();

  return (
    <div className="py-8 md:py-12">
      <header className="mx-auto max-w-3xl space-y-3 px-4 pb-8 text-center md:pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          {t("heading")}
        </p>
        <h1 className="font-heading text-4xl text-primary md:text-5xl">
          {t("subheading")}
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("description", { movements: movements.length, artists: artists.length })}
        </p>
      </header>

      <MuseumTimeline
        movements={movements}
        artists={artists}
        events={events}
        connections={connections}
        galleryKeys={galleryKeys}
      />
    </div>
  );
}

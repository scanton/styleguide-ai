import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { RisingWidget } from "@/components/rising/RisingWidget";
import { CommunitySection } from "@/components/home/CommunitySection";
import { ConsultingCTA } from "@/components/home/ConsultingCTA";
import { db } from "@/lib/db";
import { communityEvents, communitySpotlight, currentTheme } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "StyleGuideAI — AI Art Community & Tools",
  description:
    "A 1,000+ member community for AI artists. Explore our prompt generators, Virtual Museum of art history, and daily art inspiration.",
  openGraph: {
    title: "StyleGuideAI — AI Art Community & Tools",
    description: "A 1,000+ member community for AI artists. Explore our prompt generators, Virtual Museum of art history, and daily art inspiration.",
    images: [{ url: "/images/og/og-default.png", width: 1672, height: 941, alt: "StyleGuideAI — AI Art Community & Tools" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-default.png"] },
};

export const revalidate = 300; // re-fetch every 5 minutes

export default async function HomePage() {
  const [[latestEvent], spotlightItems, [heroTheme]] = await Promise.all([
    db
      .select({ title: communityEvents.title, threadUrl: communityEvents.threadUrl })
      .from(communityEvents)
      .orderBy(desc(communityEvents.postedAt))
      .limit(1)
      .catch(() => []),
    // DISTINCT ON (artist_name) picks the newest post per artist,
    // then JS sort takes the 4 most recent across all distinct artists.
    db
      .selectDistinctOn([communitySpotlight.artistName], {
        id: communitySpotlight.id,
        title: communitySpotlight.title,
        artistName: communitySpotlight.artistName,
        thumbnailUrl: communitySpotlight.thumbnailUrl,
        deviationUrl: communitySpotlight.deviationUrl,
        publishedAt: communitySpotlight.publishedAt,
      })
      .from(communitySpotlight)
      .orderBy(communitySpotlight.artistName, desc(communitySpotlight.publishedAt))
      .then((rows) =>
        rows
          .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
          .slice(0, 4),
      )
      .catch(() => []),
    db
      .select({
        galleryName: currentTheme.galleryName,
        heroImageUrl: currentTheme.heroImageUrl,
        heroDeviationUrl: currentTheme.heroDeviationUrl,
        journalUrl: currentTheme.journalUrl,
      })
      .from(currentTheme)
      .where(eq(currentTheme.id, "singleton"))
      .limit(1)
      .catch(() => []),
  ]);

  return (
    <>
      <HeroSection theme={heroTheme ?? null} />
      <FeatureGrid />
      <RisingWidget />
      <CommunitySection
        latestEventTitle={latestEvent?.title ?? null}
        latestEventUrl={latestEvent?.threadUrl ?? null}
        spotlightItems={spotlightItems}
      />
      <ConsultingCTA />
    </>
  );
}

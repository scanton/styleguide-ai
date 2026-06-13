import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CommunitySection } from "@/components/home/CommunitySection";
import { ConsultingCTA } from "@/components/home/ConsultingCTA";
import { db } from "@/lib/db";
import { communityEvents, communitySpotlight } from "@/drizzle/schema";
import { desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "StyleGuideAI — AI Art Community & Tools",
  description:
    "A 1,000+ member community for AI artists. Explore our prompt generators, Virtual Museum of art history, and daily art inspiration.",
};

export const revalidate = 300; // re-fetch every 5 minutes

export default async function HomePage() {
  const [[latestEvent], spotlightItems] = await Promise.all([
    db
      .select({ title: communityEvents.title, threadUrl: communityEvents.threadUrl })
      .from(communityEvents)
      .orderBy(desc(communityEvents.postedAt))
      .limit(1)
      .catch(() => []),
    db
      .select({
        id: communitySpotlight.id,
        title: communitySpotlight.title,
        artistName: communitySpotlight.artistName,
        thumbnailUrl: communitySpotlight.thumbnailUrl,
        deviationUrl: communitySpotlight.deviationUrl,
      })
      .from(communitySpotlight)
      .orderBy(desc(communitySpotlight.publishedAt))
      .limit(4)
      .catch(() => []),
  ]);

  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <CommunitySection
        latestEventTitle={latestEvent?.title ?? null}
        latestEventUrl={latestEvent?.threadUrl ?? null}
        spotlightItems={spotlightItems}
      />
      <ConsultingCTA />
    </>
  );
}

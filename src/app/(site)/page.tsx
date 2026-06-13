import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CommunitySection } from "@/components/home/CommunitySection";
import { ConsultingCTA } from "@/components/home/ConsultingCTA";
import { db } from "@/lib/db";
import { communityEvents } from "@/drizzle/schema";
import { desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "StyleGuideAI — AI Art Community & Tools",
  description:
    "A 1,000+ member community for AI artists. Explore our prompt generators, Virtual Museum of art history, and daily art inspiration.",
};

export const revalidate = 3600; // re-fetch latest event at most once per hour

export default async function HomePage() {
  const [latestEvent] = await db
    .select({ title: communityEvents.title, threadUrl: communityEvents.threadUrl })
    .from(communityEvents)
    .orderBy(desc(communityEvents.postedAt))
    .limit(1)
    .catch(() => []);

  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <CommunitySection latestEventTitle={latestEvent?.title ?? null} latestEventUrl={latestEvent?.threadUrl ?? null} />
      <ConsultingCTA />
    </>
  );
}

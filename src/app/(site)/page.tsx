import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/ui/placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/home/HeroSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { CommunitySection } from "@/components/home/CommunitySection";
import { ConsultingCTA } from "@/components/home/ConsultingCTA";

export const metadata: Metadata = {
  title: "StyleGuideAI — AI Art Community & Tools",
  description:
    "A 1,000+ member community for AI artists. Explore our prompt generators, Virtual Museum of art history, and daily art inspiration.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid />
      <CommunitySection />
      <ConsultingCTA />
    </>
  );
}

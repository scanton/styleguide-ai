import type { Metadata } from "next";
import { Placeholder } from "@/components/ui/placeholder";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About StyleGuideAI",
  description:
    "StyleGuideAI is a 1,000+ member AI art community led by Satori Canton. Join us on Discord and DeviantArt.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-24 space-y-16">
      {/* Intro */}
      <section aria-labelledby="about-heading" className="space-y-6 text-center">
        <h1
          id="about-heading"
          className="font-heading text-4xl font-bold sm:text-5xl"
        >
          About StyleGuideAI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          StyleGuideAI is a growing community of AI artists, art history enthusiasts, and creative technologists exploring the intersection of generative AI and the rich history of human art.
        </p>
      </section>

      {/* Community */}
      <section aria-labelledby="community-heading" className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-5">
          <h2 id="community-heading" className="font-heading text-2xl font-bold">
            Our Community
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            What started as a small Discord server has grown into a 1,000+ member community with members from around the world. We share AI art, run daily themed art challenges, publish research on AI art styles, and build tools together.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our daily art themes bring the community together — every day a new movement, artist, or style to explore through AI generation. The archive lives here on StyleGuideAI.com.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="default" size="lg" className="min-h-[44px]">
              <a
                href="https://discord.gg/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join Discord ↗
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-[44px]">
              <a
                href="https://www.deviantart.com/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
              >
                DeviantArt Group ↗
              </a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border">
          <Placeholder
            width={480}
            height={360}
            alt="[PROMPT: diverse group of AI artists gathered around a retro 1950s diner table, each with tablets and computers showing AI-generated artwork, warm vintage illustration style, communal and joyful atmosphere]"
            className="w-full"
          />
        </div>
      </section>

      {/* Founder */}
      <section aria-labelledby="founder-heading" className="rounded-2xl bg-card border border-border p-8 md:p-12 grid gap-8 md:grid-cols-3 md:items-start">
        <div className="md:col-span-1 flex justify-center">
          <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20">
            <Placeholder
              width={160}
              height={160}
              alt="[PROMPT: portrait of a creative AI technologist in retro 1950s illustrative style, warm colors, professional yet artistic, stylized illustration]"
              className="w-full h-full"
            />
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 id="founder-heading" className="font-heading text-2xl font-bold">
            Satori Canton
          </h2>
          <p className="text-sm text-primary font-medium">Head of AI at HeartStamp · Founder, StyleGuideAI</p>
          <p className="text-muted-foreground leading-relaxed">
            Satori Canton is a generative AI specialist with deep expertise in AI art production, model training, and agentic system design. As Head of AI at HeartStamp, he leads AI strategy and implementation across creative products.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            He has written 300+ articles on art movements and AI art techniques on Medium, making art history accessible to AI artists everywhere. StyleGuideAI.com is the community home for that body of work.
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="outline" size="sm">
              <a
                href="https://medium.com/@satoricanton"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read on Medium ↗
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

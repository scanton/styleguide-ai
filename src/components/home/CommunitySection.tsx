"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Placeholder } from "@/components/ui/placeholder";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CommunitySectionProps {
  latestEventTitle: string | null;
  latestEventUrl: string | null;
}

export function CommunitySection({ latestEventTitle, latestEventUrl }: CommunitySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !sectionRef.current) return;
    gsap.from(sectionRef.current.querySelectorAll(".reveal"), {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
      },
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-card border-y px-4 py-16 md:py-24"
      aria-labelledby="community-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Spotlight grid */}
          <div className="reveal grid grid-cols-2 gap-3" aria-label="Community art spotlight">
            {[
              "[PROMPT: abstract AI art in the style of Kandinsky, flowing geometric shapes, vivid colors, retro texture]",
              "[PROMPT: Art Nouveau portrait of a woman with floral hair, detailed line work, warm gold and green palette]",
              "[PROMPT: Impressionist landscape with AI color distortion, Monet-style water lilies, dreamy soft focus]",
              "[PROMPT: Cubist still life with digital glitch effects, Picasso-inspired fragmented forms, bold outlines]",
            ].map((prompt, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-muted aspect-square">
                <Placeholder
                  width={200}
                  height={200}
                  alt={prompt}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>

          {/* Text */}
          <div className="space-y-6">
            <div className="reveal inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              <span aria-hidden="true">★</span>
              <span>Community Spotlight</span>
            </div>
            <h2
              id="community-heading"
              className="reveal font-heading text-3xl font-bold sm:text-4xl"
            >
              Art Made by
              <br />
              Our Community
            </h2>
            <p className="reveal text-muted-foreground leading-relaxed max-w-md">
              Every day our members share their AI art creations — from Impressionist landscapes to Cubist portraits to entirely new aesthetics. Join 1,000+ artists exploring the intersection of AI and art history.
            </p>
            <div className="reveal flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline" className="min-h-[44px]">
                <a
                  href="https://discord.gg/3QK2B3zhGb"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Discord ↗
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost" className="min-h-[44px]">
                <a
                  href="https://www.deviantart.com/styleguideai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View DeviantArt ↗
                </a>
              </Button>
            </div>
            {/* Latest community theme */}
            <div className="reveal rounded-xl border border-border bg-background p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                🎨
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Latest Community Theme</p>
                {latestEventTitle ? (
                  latestEventUrl ? (
                    <a
                      href={latestEventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary hover:underline underline-offset-2 line-clamp-1"
                    >
                      {latestEventTitle}
                    </a>
                  ) : (
                    <p className="font-bold text-primary line-clamp-1">{latestEventTitle}</p>
                  )
                ) : (
                  <p className="font-bold text-primary">Coming soon…</p>
                )}
              </div>
              <Button asChild variant="ghost" size="sm" className="ml-auto flex-shrink-0">
                <Link href="/themes">All themes →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

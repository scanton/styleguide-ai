"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Placeholder } from "@/components/ui/placeholder";

export function HeroSection() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(headingRef.current, { y: 40, opacity: 0, duration: 0.7 })
      .from(subRef.current, { y: 24, opacity: 0, duration: 0.6 }, "-=0.4")
      .from(ctaRef.current, { y: 20, opacity: 0, duration: 0.5 }, "-=0.3")
      .from(imageRef.current, { x: 40, opacity: 0, duration: 0.8 }, "-=0.6");
  }, []);

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5 px-4 py-16 md:py-24 lg:py-32"
      aria-labelledby="hero-heading"
    >
      {/* Retro decorative stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-brand-gold to-accent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span aria-hidden="true">✦</span>
              <span>1,000+ member AI art community</span>
            </div>
            <h1
              ref={headingRef}
              id="hero-heading"
              className="font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Where AI Art
              <br />
              <span className="text-primary">Meets Art History</span>
            </h1>
            <p
              ref={subRef}
              className="max-w-lg text-lg text-muted-foreground leading-relaxed"
            >
              Explore a living community of AI artists, generate stunning prompts with StyleBear, and tour 500+ years of art history in our Virtual Museum.
            </p>
            <div ref={ctaRef} className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-[44px]">
                <Link href="/stylebear">Try StyleBear</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                <Link href="/museum">Explore Museum</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="min-h-[44px]">
                <a
                  href="https://discord.gg/styleguideai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Discord ↗
                </a>
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div ref={imageRef} className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm lg:max-w-md">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-2xl">
                <Placeholder
                  width={480}
                  height={520}
                  alt="[PROMPT: 1950s retro diner soda-fountain waitress with long brunette hair and black glasses, surrounded by floating vintage art prints and paintbrushes, retro illustration style, warm cream and red color palette, pin-up style, cheerful and stylish]"
                  className="w-full"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 rounded-xl bg-card border border-border shadow-lg px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">Today&apos;s theme</p>
                <p className="text-sm font-bold text-primary">Art Nouveau</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

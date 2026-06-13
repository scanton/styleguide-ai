"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FEATURES = [
  {
    icon: "🏛️",
    title: "Virtual Museum",
    description:
      "A scrollable timeline of 100+ art movements and 500+ artists — from Renaissance to generative AI. Click through to immersive gallery experiences.",
    href: "/museum",
    cta: "Explore the museum",
    color: "from-accent/10 to-accent/5",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: "🐻",
    title: "StyleBear",
    description:
      "Our flagship AI art prompt generator. Pick art movements, media, styles, and let StyleBear craft the perfect prompt for Flux, Midjourney, SDXL, and more.",
    href: "/stylebear",
    cta: "Generate prompts",
    color: "from-primary/10 to-primary/5",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: "🃏",
    title: "StyleTarot",
    description:
      "A video-poker-style art inspiration game. Get dealt five artist and movement cards, hold your favorites, draw new ones, then generate your art prompt.",
    href: "/styletarot",
    cta: "Deal the cards",
    color: "from-primary/10 to-accent/5",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: "📚",
    title: "Articles",
    description:
      "233 deep-dives into art history, movements, and techniques by Satori Canton. From Impressionism to AI art — fuel your creative research.",
    href: "/articles",
    cta: "Read articles",
    color: "from-brand-gold/20 to-brand-gold/5",
    accent: "bg-brand-gold/20 text-foreground",
  },
];

export function FeatureGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      gsap.from(card, {
        y: 40,
        opacity: 0,
        duration: 0.6,
        delay: i * 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="px-4 py-16 md:py-24"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center space-y-3">
          <h2
            id="features-heading"
            className="font-heading text-3xl font-bold sm:text-4xl"
          >
            Tools for AI Artists
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to create, explore, and get inspired — from prompt generators to a full museum of art history.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.href}
              ref={(el) => { if (el) cardsRef.current[i] = el; }}
              className={`group relative rounded-2xl bg-gradient-to-br ${f.color} border border-border p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${f.accent}`} aria-hidden="true">
                {f.icon}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-heading font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="self-start -ml-2 group-hover:text-primary transition-colors">
                <Link href={f.href}>{f.cta} →</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

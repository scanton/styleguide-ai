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

const SERVICES = [
  {
    icon: "🤖",
    title: "AI Model Training",
    description: "LoRA fine-tuning for custom art styles and character models.",
  },
  {
    icon: "🎨",
    title: "Art Direction",
    description: "Strategic creative direction for AI-generated visual content.",
  },
  {
    icon: "⚙️",
    title: "AI Agent Design",
    description: "Custom agentic AI systems for creative workflows and automation.",
  },
];

export function ConsultingCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !sectionRef.current) return;
    gsap.from(sectionRef.current.querySelectorAll(".reveal"), {
      y: 24,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
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
      className="px-4 py-16 md:py-24"
      aria-labelledby="consulting-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 px-6 py-12 md:px-12 text-primary-foreground">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="space-y-6">
              <h2
                id="consulting-heading"
                className="reveal font-heading text-3xl font-bold sm:text-4xl"
              >
                Work With Satori
              </h2>
              <p className="reveal leading-relaxed opacity-90 max-w-md">
                Head of AI at HeartStamp, founder of StyleGuideAI, and author of 300+ articles on art history and AI. Available for consulting on AI art production, model training, and agentic system design.
              </p>
              <div className="reveal flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 min-h-[44px]"
                >
                  <Link href="/consulting">View Services</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/10 min-h-[44px]"
                >
                  <a
                    href="https://medium.com/@satoricanton"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read Articles ↗
                  </a>
                </Button>
              </div>
            </div>

            {/* Services */}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="reveal rounded-2xl bg-white/10 backdrop-blur-sm p-5 space-y-2"
                >
                  <div className="text-2xl" aria-hidden="true">{s.icon}</div>
                  <h3 className="font-heading font-semibold">{s.title}</h3>
                  <p className="text-sm opacity-80 leading-snug">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

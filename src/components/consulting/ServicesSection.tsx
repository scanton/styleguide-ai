"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SERVICES = [
  {
    number: "01",
    title: "Art Model Training",
    audience: "Artists, studios, and product teams",
    description:
      "LoRA fine-tuning for custom image generation models — whether you want to replicate a consistent visual style, train a character or product model, or build proprietary image generation capability. I handle dataset preparation, training pipeline setup, and quality evaluation.",
    bullets: [
      "LoRA / SDXL / Flux fine-tuning",
      "Dataset curation and captioning",
      "Style replication and character consistency",
      "Training pipeline setup and documentation",
    ],
  },
  {
    number: "02",
    title: "Art Direction & Style Consulting",
    audience: "Product teams and creative directors",
    description:
      "Deep knowledge of art history applied to GenAI art projects. I bridge the gap between \"make it look painterly\" and knowing exactly which movement, palette, and technique achieves the desired aesthetic. Clients include product teams building AI art features who need an expert eye.",
    bullets: [
      "Movement and period identification",
      "Style prompt development and refinement",
      "Aesthetic direction for AI art pipelines",
      "Art history research and documentation",
    ],
  },
  {
    number: "03",
    title: "AI Agent Design & GenAI Systems",
    audience: "Companies building AI-powered products",
    description:
      "Designing and building AI-powered systems that produce generative AI outputs — end-to-end agentic workflows, multi-step prompt pipelines, tool-calling systems, and LLM integrations. I understand both the technical architecture and the creative output requirements.",
    bullets: [
      "Agentic workflow design and implementation",
      "Multi-model LLM pipeline architecture",
      "GenAI product strategy",
      "API integration and system design",
    ],
  },
];

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll(".service-card");
    cards.forEach((card, i) => {
      gsap.from(card, {
        y: 40,
        opacity: 0,
        duration: 0.6,
        delay: i * 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
        },
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="services-heading"
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2
          id="services-heading"
          className="font-heading text-3xl font-bold sm:text-4xl"
        >
          Services
        </h2>
        <p className="text-muted-foreground max-w-lg">
          Three core practice areas, each grounded in both technical depth and creative expertise.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SERVICES.map((s) => (
          <article
            key={s.number}
            className="service-card rounded-2xl border border-border bg-card p-6 flex flex-col gap-5"
          >
            <div className="flex items-start justify-between">
              <span className="font-heading font-bold text-4xl text-primary/20 leading-none">
                {s.number}
              </span>
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-heading font-bold text-lg">{s.title}</h3>
              <p className="text-xs font-medium text-accent uppercase tracking-wide">
                {s.audience}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
            <ul className="space-y-1.5" aria-label={`${s.title} services`}>
              {s.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary flex-shrink-0" aria-hidden="true">→</span>
                  {b}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

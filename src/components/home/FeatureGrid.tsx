"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function FeatureGrid() {
  const t = useTranslations("home");
  const cardsRef = useRef<HTMLDivElement[]>([]);

  const FEATURES = [
    {
      icon: "🏛️",
      title: t("museumFeatureTitle"),
      description: t("museumFeatureDesc"),
      href: "/museum",
      cta: t("museumFeatureCta"),
      color: "from-accent/10 to-accent/5",
      accent: "bg-accent/10 text-accent",
    },
    {
      icon: "🐻‍❄️",
      title: t("stylebearFeatureTitle"),
      description: t("stylebearFeatureDesc"),
      href: "/stylebear",
      cta: t("stylebearFeatureCta"),
      color: "from-primary/10 to-primary/5",
      accent: "bg-primary/10 text-primary",
    },
    {
      icon: "🃏",
      title: t("styletarotFeatureTitle"),
      description: t("styletarotFeatureDesc"),
      href: "/styletarot",
      cta: t("styletarotFeatureCta"),
      color: "from-primary/10 to-accent/5",
      accent: "bg-primary/10 text-primary",
    },
    {
      icon: "📚",
      title: t("articlesFeatureTitle"),
      description: t("articlesFeatureDesc"),
      href: "/articles",
      cta: t("articlesFeatureCta"),
      color: "from-brand-gold/20 to-brand-gold/5",
      accent: "bg-brand-gold/20 text-foreground",
    },
  ];

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
      className="px-4 py-16 md:py-24"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center space-y-3">
          <h2
            id="features-heading"
            className="font-heading text-3xl font-bold sm:text-4xl"
          >
            {t("featuresHeading")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("featuresSubheading")}
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

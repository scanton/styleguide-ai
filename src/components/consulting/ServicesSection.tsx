"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function ServicesSection() {
  const t = useTranslations("consulting");
  const sectionRef = useRef<HTMLElement>(null);

  const SERVICES = [
    {
      number: "01",
      title: t("service1Title"),
      audience: t("service1Audience"),
      description: t("service1Desc"),
      bullets: [t("service1Point1"), t("service1Point2"), t("service1Point3"), t("service1Point4")],
    },
    {
      number: "02",
      title: t("service2Title"),
      audience: t("service2Audience"),
      description: t("service2Desc"),
      bullets: [t("service2Point1"), t("service2Point2"), t("service2Point3"), t("service2Point4")],
    },
    {
      number: "03",
      title: t("service3Title"),
      audience: t("service3Audience"),
      description: t("service3Desc"),
      bullets: [t("service3Point1"), t("service3Point2"), t("service3Point3"), t("service3Point4")],
    },
  ];

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
          {t("servicesHeading")}
        </h2>
        <p className="text-muted-foreground max-w-lg">
          {t("servicesSubheading")}
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

"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import { wikimediaThumb } from "@/lib/wikimedia";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Three.js loads only when someone steps inside.
const Gallery3D = dynamic(() => import("@/components/museum/Gallery3D"), {
  ssr: false,
});

export interface GalleryWork {
  id: string;
  title: string;
  year: number | null;
  imageUrl: string;
  width: number;
  height: number;
  description: string | null;
  artistName?: string;
  source: string;
  licenseType: string;
}

interface MuseumRender {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  creatorName: string;
  siteLikes: number;
  rawEngagement: number;
}

interface EditorialGalleryProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  works: GalleryWork[];
  galleryKind?: string;
  galleryId?: string;
}

export default function EditorialGallery({
  eyebrow,
  title,
  subtitle,
  description,
  accentColor,
  works,
  galleryKind,
  galleryId,
}: EditorialGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [show3D, setShow3D] = useState(false);
  const [communityRenders, setCommunityRenders] = useState<MuseumRender[]>([]);

  useEffect(() => {
    if (!galleryKind || !galleryId) return;
    fetch(`/api/rising/museum-renders?entityType=${galleryKind}&id=${encodeURIComponent(galleryId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.renders)) setCommunityRenders(data.renders);
      })
      .catch(() => {});
  }, [galleryKind, galleryId]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // Top progress bar tracks overall scroll.
      gsap.to(progressRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
        },
      });

      // Hero text rises in on load.
      gsap.from("[data-hero] > *", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
      });

      // Each artwork: image reveals + gentle parallax, metadata follows.
      gsap.utils.toArray<HTMLElement>("[data-work]").forEach((section) => {
        const img = section.querySelector("[data-work-image]");
        const meta = section.querySelectorAll("[data-work-meta] > *");

        gsap.fromTo(
          img,
          { opacity: 0, scale: 1.05, y: 48 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 72%" },
          }
        );
        gsap.from(meta, {
          y: 22,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: { trigger: section, start: "top 55%" },
        });
        // Slow parallax drift while the section passes through the viewport.
        gsap.to(img, {
          y: -36,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="dark bg-background text-foreground">
      {/* Scroll progress */}
      <div className="fixed inset-x-0 top-0 z-40 h-1 bg-foreground/10">
        <div
          ref={progressRef}
          className="h-full origin-left scale-x-0"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Hero */}
      <header className="relative flex min-h-[100dvh] items-center justify-center px-5">
        <div data-hero className="max-w-2xl space-y-5 text-center">
          <p
            className="text-xs font-medium uppercase tracking-[0.25em]"
            style={{ color: accentColor }}
          >
            {eyebrow}
          </p>
          <h1 className="font-heading text-5xl leading-tight md:text-7xl">{title}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-foreground/85 md:text-base">
            {description}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/museum"
              className="rounded-md border border-border px-4 py-3 text-sm hover:bg-muted transition-colors min-h-[44px]"
            >
              ← Back to the Timeline
            </Link>
            <button
              type="button"
              onClick={() => setShow3D(true)}
              className="rounded-md px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
              style={{ backgroundColor: accentColor }}
            >
              Step Inside → <span className="text-[10px] uppercase opacity-80">3D</span>
            </button>
          </div>
          <p className="pt-6 text-xs text-muted-foreground" aria-hidden="true">
            Scroll to begin · {works.length} works
          </p>
          <div className="flex justify-center" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="animate-bounce text-muted-foreground motion-reduce:animate-none"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </header>

      {/* Works */}
      {works.map((work, i) => (
        <section
          key={work.id}
          data-work
          className="flex min-h-[100dvh] flex-col items-center justify-center gap-7 px-5 py-20"
          aria-label={`${work.title}${work.year ? `, ${work.year}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-work-image
            src={wikimediaThumb(work.imageUrl, 1600, work.width)}
            alt={`${work.title}${work.artistName ? ` by ${work.artistName}` : ""}${
              work.year ? `, ${work.year}` : ""
            }`}
            width={work.width}
            height={work.height}
            loading={i < 2 ? "eager" : "lazy"}
            decoding="async"
            className="h-auto max-h-[70dvh] w-auto max-w-[94vw] rounded-sm shadow-2xl md:max-w-[82vw]"
          />
          <div data-work-meta className="max-w-xl space-y-2 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {i + 1} / {works.length}
            </p>
            <h2 className="font-heading text-2xl md:text-4xl">{work.title}</h2>
            <p className="text-sm text-muted-foreground">
              {work.artistName && <>{work.artistName} · </>}
              {work.year ?? "Date unknown"}
            </p>
            {work.description && (
              <p className="pt-1 text-sm leading-relaxed text-foreground/80">
                {work.description}
              </p>
            )}
            <p className="pt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
              {work.licenseType} · via Wikimedia Commons
            </p>
          </div>
        </section>
      ))}

      {/* Community renders from Rising */}
      {communityRenders.length > 0 && (
        <section className="px-5 py-20 max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <p
              className="text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: accentColor }}
            >
              Community Gallery
            </p>
            <h2 className="font-heading text-3xl md:text-4xl">AI Renders by the Community</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              These images were generated by community members using prompts inspired by this gallery.
              They are AI renders, not historical artworks.
            </p>
          </div>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {communityRenders.map((render) => (
              <Link
                key={render.id}
                href={`/rising/${render.id}`}
                className="block break-inside-avoid rounded-xl overflow-hidden bg-stone-800 group relative"
              >
                <img
                  src={render.thumbnailUrl ?? render.imageUrl}
                  alt={`AI render by ${render.creatorName}`}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[11px] font-medium truncate">{render.creatorName}</p>
                  <p className="text-white/60 text-[10px]">
                    ♥ {(render.siteLikes ?? 0) + (render.rawEngagement ?? 0)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            Share your own renders via the prompt generator in this gallery · they appear here automatically
          </p>
        </section>
      )}

      {/* Outro */}
      <footer className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-5 py-20 text-center">
        <h2 className="font-heading text-3xl md:text-4xl">The end of this room.</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Walk these works in 3D, or head back — the timeline holds 40,000 years more.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShow3D(true)}
            className="rounded-md px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 min-h-[44px]"
            style={{ backgroundColor: accentColor }}
          >
            Step Inside →
          </button>
          <Link
            href="/museum"
            className="rounded-md border border-border px-6 py-3 text-sm transition-colors hover:bg-muted min-h-[44px]"
          >
            Return to the Timeline
          </Link>
        </div>
      </footer>

      {/* 3D gallery overlay */}
      {show3D && (
        <Gallery3D
          title={title}
          accentColor={accentColor}
          works={works}
          onExit={() => setShow3D(false)}
        />
      )}
    </div>
  );
}

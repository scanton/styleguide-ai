"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import type { ArtMovement, Artist } from "@/types/museum";
import { prefersReducedMotion } from "@/lib/motion";
import { useWikiThumb } from "@/lib/wiki-thumb";

export type TimelineSelection =
  | { type: "artist"; id: string }
  | { type: "movement"; id: string };

interface TimelineInfoCardProps {
  selection: TimelineSelection;
  movements: Map<string, ArtMovement>;
  artists: Map<string, Artist>;
  onClose: () => void;
  onSelect: (selection: TimelineSelection) => void;
}

function yearsLabel(start: number, end: number | null): string {
  return end === null ? `${start} – today` : `${start} – ${end}`;
}

function ArtistThumbChip({
  artist,
  onClick,
}: {
  artist: Artist;
  onClick: () => void;
}) {
  const thumb = useWikiThumb(artist.wikipediaUrl);
  const initials = artist.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-border bg-secondary py-1 pl-1 pr-3 text-xs hover:bg-muted transition-colors min-h-[36px]"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="h-7 w-7 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {initials}
        </span>
      )}
      <span>{artist.name}</span>
    </button>
  );
}

function MovementChip({
  movement,
  onClick,
}: {
  movement: ArtMovement;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs hover:bg-muted transition-colors min-h-[36px]"
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: movement.color }}
        aria-hidden="true"
      />
      {movement.name}
    </button>
  );
}

function EnterGalleryButton() {
  return (
    <button
      type="button"
      disabled
      title="The gallery experience arrives in the next phase"
      className="w-full rounded-md bg-primary/50 px-4 py-3 text-sm font-medium text-primary-foreground cursor-not-allowed min-h-[44px]"
    >
      Enter Gallery — coming soon
    </button>
  );
}

export default function TimelineInfoCard({
  selection,
  movements,
  artists,
  onClose,
  onSelect,
}: TimelineInfoCardProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const artist = selection.type === "artist" ? artists.get(selection.id) : undefined;
  const movement = selection.type === "movement" ? movements.get(selection.id) : undefined;
  const portraitThumb = useWikiThumb(artist?.wikipediaUrl);

  // Slide in on mount; animate out before unmount via the close helper.
  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;
    const dur = prefersReducedMotion() ? 0 : 0.45;
    const isMobile = window.innerWidth < 768;
    gsap.fromTo(
      panel,
      isMobile ? { yPercent: 100 } : { xPercent: 100 },
      { yPercent: 0, xPercent: 0, duration: dur, ease: "power3.out" }
    );
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: dur * 0.7 });
    panel.focus();
  }, []);

  const animateClose = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const dur = prefersReducedMotion() ? 0 : 0.32;
    if (!panel || !backdrop || dur === 0) {
      onClose();
      return;
    }
    const isMobile = window.innerWidth < 768;
    gsap.to(backdrop, { opacity: 0, duration: dur });
    gsap.to(panel, {
      ...(isMobile ? { yPercent: 100 } : { xPercent: 100 }),
      duration: dur,
      ease: "power3.in",
      onComplete: onClose,
    });
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") animateClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animateClose]);

  const heading = artist?.name ?? movement?.name ?? "";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={heading}>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
        onClick={animateClose}
        aria-hidden="true"
      />

      {/* Panel: bottom sheet on mobile, right drawer on md+ */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl bg-card shadow-2xl outline-none md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none"
      >
        {/* Color band header */}
        <div
          className="h-2.5 w-full md:h-3"
          style={{
            backgroundColor:
              movement?.color ??
              (artist ? movements.get(artist.movements[0] ?? "")?.color : undefined) ??
              "var(--primary)",
          }}
          aria-hidden="true"
        />

        <div className="space-y-5 p-5 md:p-6">
          {/* Close */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl leading-tight text-foreground md:text-3xl">
                {heading}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {artist && yearsLabel(artist.birthYear, artist.deathYear)}
                {artist && artist.nationality.length > 0 && (
                  <> · {artist.nationality.join(", ")}</>
                )}
                {movement && yearsLabel(movement.startYear, movement.endYear)}
                {movement && movement.region.length > 0 && (
                  <> · {movement.region.join(", ")}</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={animateClose}
              aria-label="Close info card"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Artist portrait */}
          {artist && (
            <div className="flex justify-center">
              {portraitThumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portraitThumb}
                  alt={`Portrait of ${artist.name}`}
                  className="h-36 w-36 rounded-full border-4 object-cover shadow-md md:h-44 md:w-44"
                  style={{
                    borderColor:
                      movements.get(artist.movements[0] ?? "")?.color ?? "var(--border)",
                  }}
                />
              ) : (
                <div
                  className="flex h-36 w-36 items-center justify-center rounded-full border-4 bg-muted font-heading text-4xl text-muted-foreground md:h-44 md:w-44"
                  style={{
                    borderColor:
                      movements.get(artist.movements[0] ?? "")?.color ?? "var(--border)",
                  }}
                  role="img"
                  aria-label={`Portrait of ${artist.name} pending`}
                >
                  {artist.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-sm leading-relaxed text-foreground">
            {artist?.description ?? movement?.description}
          </p>

          {/* Artist → movements */}
          {artist && artist.movements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Movements
              </h3>
              <div className="flex flex-wrap gap-2">
                {artist.movements.map((mid) => {
                  const m = movements.get(mid);
                  if (!m) return null;
                  return (
                    <MovementChip
                      key={mid}
                      movement={m}
                      onClick={() => onSelect({ type: "movement", id: mid })}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Movement → key artists */}
          {movement && movement.keyArtists.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key Artists
              </h3>
              <div className="flex flex-wrap gap-2">
                {movement.keyArtists.map((aid) => {
                  const a = artists.get(aid);
                  if (!a) return null;
                  return (
                    <ArtistThumbChip
                      key={aid}
                      artist={a}
                      onClick={() => onSelect({ type: "artist", id: aid })}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Movement lineage */}
          {movement && (movement.influencedBy.length > 0 || movement.influences.length > 0) && (
            <div className="space-y-3">
              {movement.influencedBy.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Grew from
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movement.influencedBy.map((mid) => {
                      const m = movements.get(mid);
                      if (!m) return null;
                      return (
                        <MovementChip
                          key={mid}
                          movement={m}
                          onClick={() => onSelect({ type: "movement", id: mid })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {movement.influences.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Paved the way for
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movement.influences.map((mid) => {
                      const m = movements.get(mid);
                      if (!m) return null;
                      return (
                        <MovementChip
                          key={mid}
                          movement={m}
                          onClick={() => onSelect({ type: "movement", id: mid })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <EnterGalleryButton />
            <a
              href={artist?.wikipediaUrl ?? movement?.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md border border-border px-4 py-3 text-center text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
            >
              Read on Wikipedia ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

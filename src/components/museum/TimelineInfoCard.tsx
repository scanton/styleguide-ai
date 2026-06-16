"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import gsap from "gsap";
import type {
  ArtMovement,
  Artist,
  WorldEvent,
  ArtistConnection,
} from "@/types/museum";
import { prefersReducedMotion } from "@/lib/motion";
import { formatYear } from "@/lib/timeline-scale";
import { useWikiThumb } from "@/lib/wiki-thumb";
import { MuseumPromptModal } from "@/components/museum/MuseumPromptModal";

interface ArticleLink {
  title: string;
  slug: string;
  mediumUrl: string;
  publishedAt: string | null;
}

export type TimelineSelection =
  | { type: "artist"; id: string }
  | { type: "movement"; id: string }
  | { type: "event"; id: string };

interface TimelineInfoCardProps {
  selection: TimelineSelection;
  movements: Map<string, ArtMovement>;
  artists: Map<string, Artist>;
  events: Map<string, WorldEvent>;
  connections: ArtistConnection[];
  galleryKeys: Set<string>;
  onClose: () => void;
  onSelect: (selection: TimelineSelection) => void;
}

function yearsLabel(start: number, end: number | null): string {
  return end === null
    ? `${formatYear(start)} – present`
    : `${formatYear(start)} – ${formatYear(end)}`;
}

function artistYearsLabel(birth: number, death: number | null | undefined): string {
  return death == null
    ? `${formatYear(birth)} – present`
    : `${formatYear(birth)} – ${formatYear(death)}`;
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

function EnterGalleryButton({ href }: { href: string | null }) {
  if (href) {
    return (
      <Link
        href={href}
        className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 min-h-[44px]"
      >
        Enter Gallery →
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled
      title="Artworks for this gallery are still being collected"
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
  events,
  connections,
  galleryKeys,
  onClose,
  onSelect,
}: TimelineInfoCardProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const artist = selection.type === "artist" ? artists.get(selection.id) : undefined;
  const movement = selection.type === "movement" ? movements.get(selection.id) : undefined;
  const event = selection.type === "event" ? events.get(selection.id) : undefined;
  const portraitThumb = useWikiThumb(artist?.wikipediaUrl);

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

  const [relatedArticles, setRelatedArticles] = useState<ArticleLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    if (selection.type === "movement") {
      url = `/api/museum/movement-articles?movementId=${encodeURIComponent(selection.id)}`;
    } else if (selection.type === "artist") {
      url = `/api/museum/artist-articles?artistId=${encodeURIComponent(selection.id)}`;
    }

    if (!url) {
      setRelatedArticles([]);
      return;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data: { articles?: ArticleLink[] }) => {
        if (!cancelled) setRelatedArticles(data.articles ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const artistBonds = artist
    ? connections
        .filter((c) => c.a === artist.id || c.b === artist.id)
        .map((c) => ({
          other: artists.get(c.a === artist.id ? c.b : c.a),
          label: c.label,
        }))
        .filter((b): b is { other: Artist; label: string } => b.other !== undefined)
    : [];

  const heading = artist?.name ?? movement?.name ?? event?.name ?? "";
  const bandColor =
    movement?.color ??
    (artist ? movements.get(artist.movements[0] ?? "")?.color : undefined) ??
    (event ? "var(--brand-gold)" : "var(--primary)");

  return (
    <>
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
          style={{ backgroundColor: bandColor }}
          aria-hidden="true"
        />

        <div className="space-y-5 p-5 md:p-6">
          {/* Heading + close */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl leading-tight text-foreground md:text-3xl">
                {heading}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {artist && artistYearsLabel(artist.birthYear, artist.deathYear)}
                {artist && artist.nationality.length > 0 && (
                  <> · {artist.nationality.join(", ")}</>
                )}
                {movement && yearsLabel(movement.startYear, movement.endYear)}
                {movement && movement.region.length > 0 && (
                  <> · {movement.region.join(", ")}</>
                )}
                {event && (
                  <>
                    {formatYear(event.year)} · World event
                  </>
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
              {(artist.portraitUrl || portraitThumb) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.portraitUrl || portraitThumb!}
                  alt={`Portrait of ${artist.name}`}
                  className="h-36 w-36 rounded-full border-4 object-cover shadow-md md:h-44 md:w-44"
                  style={{ borderColor: bandColor }}
                />
              ) : (
                <div
                  className="flex h-36 w-36 items-center justify-center rounded-full border-4 bg-muted font-heading text-4xl text-muted-foreground md:h-44 md:w-44"
                  style={{ borderColor: bandColor }}
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
            {artist?.description ?? movement?.description ?? event?.description}
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

          {/* Artist → bonds with other artists */}
          {artist && artistBonds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Connections
              </h3>
              <ul className="space-y-2">
                {artistBonds.map((bond) => (
                  <li key={bond.other.id} className="flex items-center gap-3">
                    <ArtistThumbChip
                      artist={bond.other}
                      onClick={() => onSelect({ type: "artist", id: bond.other.id })}
                    />
                    <span className="min-w-0 flex-1 text-xs italic leading-snug text-muted-foreground">
                      {bond.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Artist → related articles */}
          {artist && relatedArticles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Related Articles
              </h3>
              <ul className="space-y-1">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <a
                      href={a.mediumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[36px] items-center text-sm text-primary hover:underline"
                    >
                      <span className="line-clamp-2">{a.title} ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
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

          {/* Movement → related articles */}
          {movement && relatedArticles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Related Articles
              </h3>
              <ul className="space-y-1">
                {relatedArticles.map((a) => (
                  <li key={a.slug}>
                    <a
                      href={a.mediumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[36px] items-center text-sm text-primary hover:underline"
                    >
                      <span className="line-clamp-2">{a.title} ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Event → movements it shaped */}
          {event && event.influencedMovements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Shaped these movements
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.influencedMovements.map((mid) => {
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

          {/* Actions */}
          <div className="space-y-3 pt-1">
            {!event && (
              <EnterGalleryButton
                href={`/museum/gallery/${selection.type}/${selection.id}`}
              />
            )}
            {(artist || movement) && (
              <button
                type="button"
                onClick={() => setShowPromptModal(true)}
                className="block w-full rounded-md bg-primary/10 border border-primary/30 px-4 py-3 text-center text-sm text-primary font-medium hover:bg-primary/20 transition-colors min-h-[44px]"
              >
                Generate Prompt with StyleBear
              </button>
            )}
            {(artist?.wikipediaUrl ?? movement?.wikipediaUrl) && (
              <a
                href={artist?.wikipediaUrl ?? movement?.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-md border border-border px-4 py-3 text-center text-sm text-foreground hover:bg-muted transition-colors min-h-[44px]"
              >
                Read on Wikipedia ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>

    {showPromptModal && (artist || movement) && (
      <MuseumPromptModal
        type={artist ? "artist" : "movement"}
        id={selection.id}
        name={artist?.name ?? movement?.name ?? ""}
        onClose={() => setShowPromptModal(false)}
      />
    )}
    </>
  );
}

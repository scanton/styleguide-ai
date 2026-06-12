"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { ArtMovement, Artist } from "@/types/museum";
import { prefersReducedMotion } from "@/lib/motion";
import { useWikiThumb } from "@/lib/wiki-thumb";
import {
  yearToX,
  xToYear,
  getTicks,
  getActiveEra,
  assignLanes,
  assignNodeRows,
  ERAS,
  TIMELINE_WIDTH,
  TIMELINE_END,
  type EraId,
} from "@/lib/timeline-scale";
import TimelineInfoCard, {
  type TimelineSelection,
} from "@/components/museum/TimelineInfoCard";

gsap.registerPlugin(useGSAP);

// ── Layout constants ──────────────────────────────────────────────────────────
const RULER_H = 34;
const LANE_H = 40;
const LANE_GAP = 6;
const NODE_SIZE = 56;
const NODE_ROW_H = 76;
const NODE_ROWS = 4;
const BAND_TOP = RULER_H + 12;

interface MuseumTimelineProps {
  movements: ArtMovement[];
  artists: Artist[];
}

// ── Artist node ───────────────────────────────────────────────────────────────
function ArtistNode({
  artist,
  x,
  y,
  color,
  visible,
  onClick,
}: {
  artist: Artist;
  x: number;
  y: number;
  color: string;
  visible: boolean;
  onClick: () => void;
}) {
  const thumb = useWikiThumb(artist.wikipediaUrl, visible);
  const initials = artist.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <button
      type="button"
      data-artist-node={artist.id}
      onClick={onClick}
      aria-label={`${artist.name}, ${artist.timelineYear}`}
      title={artist.name}
      className="group absolute z-10 rounded-full outline-offset-4 transition-transform duration-200 hover:z-20 hover:scale-110 focus-visible:z-20"
      style={{
        left: x - NODE_SIZE / 2,
        top: y,
        width: NODE_SIZE,
        height: NODE_SIZE,
      }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-full w-full rounded-full border-[3px] object-cover shadow-md"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full border-[3px] bg-card font-heading text-sm text-muted-foreground shadow-md"
          style={{ borderColor: color }}
        >
          {initials}
        </span>
      )}
      {/* Name label on hover/focus */}
      <span
        className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[11px] text-background opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        {artist.name}
      </span>
    </button>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
export default function MuseumTimeline({ movements, artists }: MuseumTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef(0);

  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [activeEra, setActiveEra] = useState<EraId>("renaissance");
  const [centerYear, setCenterYear] = useState(1430);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(() => new Set());

  const lanes = useMemo(() => assignLanes(movements), [movements]);
  const laneCount = useMemo(
    () => Math.max(...Array.from(lanes.values())) + 1,
    [lanes]
  );
  const nodeRows = useMemo(() => assignNodeRows(artists, NODE_ROWS), [artists]);
  const ticks = useMemo(() => getTicks(), []);

  const movementMap = useMemo(
    () => new Map(movements.map((m) => [m.id, m])),
    [movements]
  );
  const artistMap = useMemo(
    () => new Map(artists.map((a) => [a.id, a])),
    [artists]
  );

  const bandsBottom = BAND_TOP + laneCount * (LANE_H + LANE_GAP);
  const nodesTop = bandsBottom + 28;
  const canvasHeight = nodesTop + NODE_ROWS * NODE_ROW_H + 36;

  // ── Entrance animation: bands sweep in, ruler fades ──
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-band]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.035,
      });
      gsap.from("[data-ruler]", { opacity: 0, duration: 1.2, ease: "power2.out" });
    },
    { scope: canvasRef }
  );

  // ── Vertical wheel → horizontal scroll (GSAP-smoothed) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollTarget.current = el.scrollLeft;

    const onWheel = (e: WheelEvent) => {
      // Let native horizontal trackpad gestures through.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const max = el.scrollWidth - el.clientWidth;
      scrollTarget.current = Math.max(
        0,
        Math.min(max, scrollTarget.current + e.deltaY * 1.6)
      );
      if (prefersReducedMotion()) {
        el.scrollLeft = scrollTarget.current;
      } else {
        gsap.to(el, {
          scrollLeft: scrollTarget.current,
          duration: 0.7,
          ease: "power3.out",
          overwrite: true,
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Track center year + active era; keep wheel target in sync on touch ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!gsap.isTweening(el)) scrollTarget.current = el.scrollLeft;
        const year = xToYear(el.scrollLeft + el.clientWidth / 2);
        setCenterYear(year);
        setActiveEra(getActiveEra(year));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Lazy node reveal: observe nodes inside the scroll container ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const observer = new IntersectionObserver(
      (entries) => {
        const newlyVisible: string[] = [];
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.artistNode;
            if (id) newlyVisible.push(id);
            if (!reduced) {
              gsap.fromTo(
                entry.target,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }
              );
            }
            observer.unobserve(entry.target);
          }
        }
        if (newlyVisible.length) {
          setVisibleNodes((prev) => {
            const next = new Set(prev);
            newlyVisible.forEach((id) => next.add(id));
            return next;
          });
        }
      },
      { root: el, rootMargin: "0px 300px" }
    );
    el.querySelectorAll("[data-artist-node]").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [artists]);

  // ── Era navigation ──
  const jumpToEra = useCallback((year: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(
      0,
      Math.min(el.scrollWidth - el.clientWidth, yearToX(year) - 48)
    );
    scrollTarget.current = target;
    if (prefersReducedMotion()) {
      el.scrollLeft = target;
    } else {
      gsap.to(el, {
        scrollLeft: target,
        duration: 1.1,
        ease: "power3.inOut",
        overwrite: true,
      });
    }
  }, []);

  // ── Keyboard navigation on the scroll region ──
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const delta = e.key === "ArrowRight" ? 320 : -320;
      const max = el.scrollWidth - el.clientWidth;
      scrollTarget.current = Math.max(0, Math.min(max, scrollTarget.current + delta));
      gsap.to(el, {
        scrollLeft: scrollTarget.current,
        duration: prefersReducedMotion() ? 0 : 0.5,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Era mini-map + year readout */}
      <div className="flex items-center gap-3 px-4 md:px-8">
        <nav
          aria-label="Jump to era"
          className="flex flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ERAS.map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => jumpToEra(era.year)}
              aria-pressed={activeEra === era.id}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs transition-colors min-h-[36px] ${
                activeEra === era.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {era.label}
            </button>
          ))}
        </nav>
        <output
          aria-label="Year at center of view"
          className="hidden shrink-0 rounded-md border border-border bg-card px-3 py-1.5 font-heading text-lg tabular-nums text-primary sm:block"
        >
          {centerYear}
        </output>
      </div>

      {/* The timeline canvas */}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Art history timeline — scroll horizontally to travel through time"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative w-full overflow-x-auto overflow-y-hidden overscroll-x-contain border-y border-border bg-gradient-to-b from-card via-background to-card [scrollbar-width:thin]"
      >
        <div
          ref={canvasRef}
          className="relative"
          style={{ width: TIMELINE_WIDTH, height: canvasHeight }}
        >
          {/* Year ruler */}
          <div data-ruler className="absolute inset-x-0 top-0" style={{ height: RULER_H }}>
            {ticks.map((tick) => (
              <div
                key={tick.year}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: yearToX(tick.year) }}
                aria-hidden="true"
              >
                <span
                  className={`text-[11px] tabular-nums ${
                    tick.major ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tick.year}
                </span>
                <span
                  className={`mt-0.5 w-px ${
                    tick.major ? "h-3.5 bg-foreground/40" : "h-2 bg-border"
                  }`}
                />
              </div>
            ))}
            {/* Baseline */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
          </div>

          {/* Vertical grid lines at major ticks */}
          {ticks
            .filter((t) => t.major)
            .map((t) => (
              <div
                key={`grid-${t.year}`}
                className="absolute w-px bg-border/50"
                style={{ left: yearToX(t.year), top: RULER_H, bottom: 0 }}
                aria-hidden="true"
              />
            ))}

          {/* Movement bands */}
          {movements.map((m) => {
            const lane = lanes.get(m.id) ?? 0;
            const startX = yearToX(m.startYear);
            const endX = yearToX(m.endYear ?? TIMELINE_END);
            const width = Math.max(endX - startX, 60);
            return (
              <button
                key={m.id}
                type="button"
                data-band
                onClick={() => setSelection({ type: "movement", id: m.id })}
                aria-label={`${m.name}, ${m.startYear} to ${m.endYear ?? "today"}`}
                className="absolute flex items-center overflow-hidden rounded-full px-4 text-left shadow-sm transition-[filter,box-shadow] duration-200 hover:shadow-md hover:brightness-110 focus-visible:brightness-110"
                style={{
                  left: startX,
                  top: BAND_TOP + lane * (LANE_H + LANE_GAP),
                  width,
                  height: LANE_H,
                  backgroundColor: m.color,
                }}
              >
                <span className="sticky left-4 truncate text-sm font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                  {m.name}
                </span>
              </button>
            );
          })}

          {/* Artist nodes */}
          {artists.map((a) => {
            const row = nodeRows.get(a.id) ?? 0;
            const color = movementMap.get(a.movements[0] ?? "")?.color ?? "var(--primary)";
            return (
              <ArtistNode
                key={a.id}
                artist={a}
                x={yearToX(a.timelineYear)}
                y={nodesTop + row * NODE_ROW_H}
                color={color}
                visible={visibleNodes.has(a.id)}
                onClick={() => setSelection({ type: "artist", id: a.id })}
              />
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <p className="px-4 text-center text-xs text-muted-foreground md:px-8">
        Scroll, swipe, or use the era buttons to travel through six centuries of art.
        Tap any band or portrait to learn more.
      </p>

      {/* Info card */}
      {selection && (
        <TimelineInfoCard
          selection={selection}
          movements={movementMap}
          artists={artistMap}
          onClose={() => setSelection(null)}
          onSelect={setSelection}
        />
      )}
    </div>
  );
}

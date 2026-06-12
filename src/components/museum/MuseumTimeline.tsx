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
import type {
  ArtMovement,
  Artist,
  WorldEvent,
  ArtistConnection,
} from "@/types/museum";
import { prefersReducedMotion } from "@/lib/motion";
import { useWikiThumb } from "@/lib/wiki-thumb";
import {
  yearToX,
  xToYear,
  getTicks,
  getActiveEra,
  formatYear,
  assignLanes,
  assignNodeRows,
  ERAS,
  TIMELINE_WIDTH,
  TIMELINE_START,
  TIMELINE_END,
  type EraId,
} from "@/lib/timeline-scale";
import TimelineInfoCard, {
  type TimelineSelection,
} from "@/components/museum/TimelineInfoCard";

gsap.registerPlugin(useGSAP);

// ── Layout constants ──────────────────────────────────────────────────────────
const RULER_H = 34;
const EVENTS_H = 64;
const LANE_H = 40;
const LANE_GAP = 6;
const NODE_SIZE = 56;
const NODE_ROW_H = 76;
const NODE_ROWS = 4;
const BAND_TOP = RULER_H + EVENTS_H + 8;

interface MuseumTimelineProps {
  movements: ArtMovement[];
  artists: Artist[];
  events: WorldEvent[];
  connections: ArtistConnection[];
}

type Highlight =
  | { type: "movement"; id: string }
  | { type: "artist"; id: string }
  | null;

// ── Artist node ───────────────────────────────────────────────────────────────
function ArtistNode({
  artist,
  x,
  y,
  color,
  visible,
  dimmed,
  onClick,
  onHover,
}: {
  artist: Artist;
  x: number;
  y: number;
  color: string;
  visible: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (on: boolean) => void;
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
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      aria-label={`${artist.name}, ${formatYear(artist.timelineYear)}`}
      title={artist.name}
      className="group absolute z-10 rounded-full outline-offset-4 transition-[transform,opacity] duration-200 hover:z-20 hover:scale-110 focus-visible:z-20"
      style={{
        left: x - NODE_SIZE / 2,
        top: y,
        width: NODE_SIZE,
        height: NODE_SIZE,
        opacity: dimmed ? 0.18 : undefined,
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
export default function MuseumTimeline({
  movements,
  artists,
  events,
  connections,
}: MuseumTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef(0);

  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [hover, setHover] = useState<Highlight>(null);
  const [activeEra, setActiveEra] = useState<EraId>("prehistoric");
  const [centerYear, setCenterYear] = useState<number>(TIMELINE_START);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(() => new Set());
  const [showFlows, setShowFlows] = useState(true);
  const [showBonds, setShowBonds] = useState(false);

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
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const bandsBottom = BAND_TOP + laneCount * (LANE_H + LANE_GAP);
  const nodesTop = bandsBottom + 28;
  const canvasHeight = nodesTop + NODE_ROWS * NODE_ROW_H + 36;

  // ── Highlight: explicit selection wins over hover ──
  const highlight: Highlight =
    selection && selection.type !== "event"
      ? (selection as Highlight)
      : hover;

  // Movements related to the highlighted movement (itself + lineage).
  const relatedMovements = useMemo(() => {
    if (highlight?.type !== "movement") return null;
    const m = movementMap.get(highlight.id);
    if (!m) return null;
    return new Set([m.id, ...m.influences, ...m.influencedBy]);
  }, [highlight, movementMap]);

  // Artists related to the highlighted artist (themselves + bonded peers).
  const relatedArtists = useMemo(() => {
    if (highlight?.type !== "artist") return null;
    const set = new Set([highlight.id]);
    for (const c of connections) {
      if (c.a === highlight.id) set.add(c.b);
      if (c.b === highlight.id) set.add(c.a);
    }
    return set;
  }, [highlight, connections]);

  // ── Geometry helpers ──
  const laneCenterY = useCallback(
    (id: string) => BAND_TOP + (lanes.get(id) ?? 0) * (LANE_H + LANE_GAP) + LANE_H / 2,
    [lanes]
  );
  const nodeCenter = useCallback(
    (a: Artist): [number, number] => [
      yearToX(a.timelineYear),
      nodesTop + (nodeRows.get(a.id) ?? 0) * NODE_ROW_H + NODE_SIZE / 2,
    ],
    [nodeRows, nodesTop]
  );

  // ── Influence edges (movement → movement), deduped ──
  const movementEdges = useMemo(() => {
    const set = new Map<string, { from: string; to: string }>();
    for (const m of movements) {
      for (const t of m.influences) set.set(`${m.id}→${t}`, { from: m.id, to: t });
      for (const s of m.influencedBy) set.set(`${s}→${m.id}`, { from: s, to: m.id });
    }
    return [...set.values()].filter(
      (e) => movementMap.has(e.from) && movementMap.has(e.to)
    );
  }, [movements, movementMap]);

  const edgeGeometry = useCallback(
    (fromId: string, toId: string) => {
      const from = movementMap.get(fromId)!;
      const to = movementMap.get(toId)!;
      const fStart = yearToX(from.startYear);
      const fEnd = yearToX(from.endYear ?? TIMELINE_END);
      const tStart = yearToX(to.startYear);
      const sy = laneCenterY(fromId);
      const ty = laneCenterY(toId);
      const sx = Math.max(fStart + 24, Math.min(fEnd - 12, tStart - 36));
      const tx = tStart + 6;
      const dx = Math.max(48, Math.min(220, Math.abs(tx - sx) / 2));
      return {
        path: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`,
        tx,
        ty,
      };
    },
    [movementMap, laneCenterY]
  );

  // ── Bond arcs (artist ↔ artist) ──
  const bondGeometry = useCallback(
    (c: ArtistConnection) => {
      const a = artistMap.get(c.a);
      const b = artistMap.get(c.b);
      if (!a || !b) return null;
      const [ax, ay] = nodeCenter(a);
      const [bx, by] = nodeCenter(b);
      const midX = (ax + bx) / 2;
      const span = Math.abs(bx - ax);
      const peakY = Math.min(ay, by) - Math.min(120, 40 + span * 0.06);
      return { path: `M ${ax} ${ay} Q ${midX} ${peakY} ${bx} ${by}`, midX, peakY };
    },
    [artistMap, nodeCenter]
  );

  // ── Entrance animation ──
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-band]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.025,
      });
      gsap.from("[data-ruler]", { opacity: 0, duration: 1.2, ease: "power2.out" });
      gsap.from("[data-event-marker]", {
        y: -14,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.8)",
        stagger: 0.04,
        delay: 0.4,
      });
    },
    { scope: canvasRef }
  );

  // ── Vertical wheel → horizontal scroll (GSAP-smoothed) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollTarget.current = el.scrollLeft;

    const onWheel = (e: WheelEvent) => {
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

  // ── Track center year + active era ──
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
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Lazy node reveal ──
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
                { scale: 0 },
                { scale: 1, duration: 0.5, ease: "back.out(2)" }
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

  // ── Draw-in animation for highlighted lineage curves ──
  useEffect(() => {
    if (!highlight || prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paths = canvas.querySelectorAll<SVGPathElement>("[data-edge-active]");
    paths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.fromTo(
        p,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" }
      );
    });
  }, [highlight]);

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

  // ── Keyboard navigation ──
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

  const hoverMovement = useCallback(
    (id: string) => (on: boolean) =>
      setHover(on ? { type: "movement", id } : null),
    []
  );
  const hoverArtist = useCallback(
    (id: string) => (on: boolean) => setHover(on ? { type: "artist", id } : null),
    []
  );

  // Which bond arcs to render and how strongly.
  const activeBonds = useMemo(() => {
    if (highlight?.type === "artist") {
      return connections.filter(
        (c) => c.a === highlight.id || c.b === highlight.id
      );
    }
    return showBonds ? connections : [];
  }, [highlight, connections, showBonds]);
  const bondsEmphasized = highlight?.type === "artist";

  return (
    <div className="space-y-4">
      {/* Era mini-map + toggles + year readout */}
      <div className="flex flex-col gap-2 px-4 md:px-8">
        <nav
          aria-label="Jump to era"
          className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFlows((v) => !v)}
            aria-pressed={showFlows}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors min-h-[36px] ${
              showFlows
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            Influence flows
          </button>
          <button
            type="button"
            onClick={() => setShowBonds((v) => !v)}
            aria-pressed={showBonds}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors min-h-[36px] ${
              showBonds
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
            }`}
          >
            Artist bonds
          </button>
          <output
            aria-label="Year at center of view"
            className="ml-auto shrink-0 rounded-md border border-border bg-card px-3 py-1.5 font-heading text-base tabular-nums text-primary sm:text-lg"
          >
            {formatYear(centerYear)}
          </output>
        </div>
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
                  className={`whitespace-nowrap text-[11px] tabular-nums ${
                    tick.major ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {formatYear(tick.year)}
                </span>
                <span
                  className={`mt-0.5 w-px ${
                    tick.major ? "h-3.5 bg-foreground/40" : "h-2 bg-border"
                  }`}
                />
              </div>
            ))}
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

          {/* World event markers */}
          {events.map((e, i) => {
            const x = yearToX(e.year);
            const dimmed =
              relatedMovements !== null &&
              !e.influencedMovements.some((mid) => relatedMovements.has(mid));
            return (
              <div key={e.id}>
                <div
                  className="absolute w-0 border-l border-dashed transition-opacity duration-200"
                  style={{
                    left: x,
                    top: RULER_H + EVENTS_H,
                    bottom: 0,
                    borderColor: "var(--brand-gold)",
                    opacity: dimmed ? 0.1 : 0.55,
                  }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  data-event-marker
                  onClick={() => setSelection({ type: "event", id: e.id })}
                  aria-label={`World event: ${e.name}, ${formatYear(e.year)}`}
                  className="absolute z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm transition-[opacity,box-shadow] duration-200 hover:shadow-md"
                  style={{
                    left: x,
                    top: RULER_H + (i % 2 === 0 ? 4 : 32),
                    transform: "translateX(-8px)",
                    opacity: dimmed ? 0.25 : 1,
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rotate-45"
                    style={{ backgroundColor: "var(--brand-gold)" }}
                    aria-hidden="true"
                  />
                  {e.name}
                </button>
              </div>
            );
          })}

          {/* Connection layer: influence flows + artist bonds */}
          <svg
            className="pointer-events-none absolute inset-0 z-[5]"
            width={TIMELINE_WIDTH}
            height={canvasHeight}
            aria-hidden="true"
          >
            {/* Movement influence curves */}
            {movementEdges.map((edge) => {
              const touched =
                highlight?.type === "movement" &&
                (edge.from === highlight.id || edge.to === highlight.id);
              if (!showFlows && !touched) return null;
              const { path, tx, ty } = edgeGeometry(edge.from, edge.to);
              const color = movementMap.get(edge.to)!.color;
              const ambient = relatedMovements ? 0.04 : 0.16;
              return (
                <g key={`${edge.from}→${edge.to}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={touched ? 2.5 : 1.5}
                    strokeLinecap="round"
                    style={{ opacity: touched ? 0.9 : ambient, transition: "opacity 0.2s" }}
                    {...(touched ? { "data-edge-active": "" } : {})}
                  />
                  <circle
                    cx={tx}
                    cy={ty}
                    r={touched ? 4 : 2.5}
                    fill={color}
                    style={{ opacity: touched ? 0.95 : ambient, transition: "opacity 0.2s" }}
                  />
                </g>
              );
            })}

            {/* Artist bond arcs */}
            {activeBonds.map((c) => {
              const geo = bondGeometry(c);
              if (!geo) return null;
              return (
                <g key={`${c.a}↔${c.b}`}>
                  <path
                    d={geo.path}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={bondsEmphasized ? 2 : 1.5}
                    strokeLinecap="round"
                    strokeDasharray={bondsEmphasized ? "none" : "4 5"}
                    style={{ opacity: bondsEmphasized ? 0.85 : 0.3 }}
                    {...(bondsEmphasized ? { "data-edge-active": "" } : {})}
                  />
                  {bondsEmphasized && (
                    <text
                      x={geo.midX}
                      y={geo.peakY + 16}
                      textAnchor="middle"
                      className="fill-foreground text-[11px]"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--background)",
                        strokeWidth: 4,
                        strokeLinejoin: "round",
                      }}
                    >
                      {c.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Movement bands */}
          {movements.map((m) => {
            const lane = lanes.get(m.id) ?? 0;
            const startX = yearToX(m.startYear);
            const endX = yearToX(m.endYear ?? TIMELINE_END);
            const width = Math.max(endX - startX, 60);
            const dimmed = relatedMovements !== null && !relatedMovements.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                data-band
                onClick={() => setSelection({ type: "movement", id: m.id })}
                onMouseEnter={() => hoverMovement(m.id)(true)}
                onMouseLeave={() => hoverMovement(m.id)(false)}
                onFocus={() => hoverMovement(m.id)(true)}
                onBlur={() => hoverMovement(m.id)(false)}
                aria-label={`${m.name}, ${formatYear(m.startYear)} to ${
                  m.endYear === null ? "today" : formatYear(m.endYear)
                }`}
                className="absolute flex items-center overflow-hidden rounded-full px-4 text-left shadow-sm transition-[filter,box-shadow,opacity] duration-200 hover:shadow-md hover:brightness-110 focus-visible:brightness-110"
                style={{
                  left: startX,
                  top: BAND_TOP + lane * (LANE_H + LANE_GAP),
                  width,
                  height: LANE_H,
                  backgroundColor: m.color,
                  opacity: dimmed ? 0.2 : undefined,
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
            const dimmedByMovement =
              relatedMovements !== null &&
              !a.movements.some((mid) => relatedMovements.has(mid));
            const dimmedByArtist =
              relatedArtists !== null && !relatedArtists.has(a.id);
            return (
              <ArtistNode
                key={a.id}
                artist={a}
                x={yearToX(a.timelineYear)}
                y={nodesTop + row * NODE_ROW_H}
                color={color}
                visible={visibleNodes.has(a.id)}
                dimmed={dimmedByMovement || dimmedByArtist}
                onClick={() => setSelection({ type: "artist", id: a.id })}
                onHover={hoverArtist(a.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <p className="px-4 text-center text-xs text-muted-foreground md:px-8">
        Scroll, swipe, or jump by era — 40,000 years of art. Hover or tap a movement
        to trace its lineage; tap an artist to see who shaped them. Gold diamonds mark
        world events that bent the course of art.
      </p>

      {/* Info card */}
      {selection && (
        <TimelineInfoCard
          selection={selection}
          movements={movementMap}
          artists={artistMap}
          events={eventMap}
          onClose={() => setSelection(null)}
          onSelect={setSelection}
        />
      )}
    </div>
  );
}

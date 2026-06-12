import type { ArtMovement, Artist } from "@/types/museum";

/**
 * Piecewise-linear time scale for the museum timeline.
 * Art history is dense after 1850 — older centuries are compressed so the
 * modern era gets the room it needs.
 */
const SEGMENTS = [
  { from: 1380, to: 1700, pxPerYear: 3.2 },
  { from: 1700, to: 1850, pxPerYear: 8 },
  { from: 1850, to: 2030, pxPerYear: 18 },
] as const;

export const TIMELINE_START = SEGMENTS[0].from;
export const TIMELINE_END = SEGMENTS[SEGMENTS.length - 1].to;

export function yearToX(year: number): number {
  const y = Math.max(TIMELINE_START, Math.min(TIMELINE_END, year));
  let x = 0;
  for (const seg of SEGMENTS) {
    if (y <= seg.from) break;
    const upper = Math.min(y, seg.to);
    x += (upper - seg.from) * seg.pxPerYear;
  }
  return x;
}

export function xToYear(x: number): number {
  let remaining = Math.max(0, x);
  for (const seg of SEGMENTS) {
    const segWidth = (seg.to - seg.from) * seg.pxPerYear;
    if (remaining <= segWidth) {
      return Math.round(seg.from + remaining / seg.pxPerYear);
    }
    remaining -= segWidth;
  }
  return TIMELINE_END;
}

export const TIMELINE_WIDTH = yearToX(TIMELINE_END);

/** Ruler tick marks: sparse in the compressed early centuries, denser later. */
export function getTicks(): { year: number; major: boolean }[] {
  const ticks: { year: number; major: boolean }[] = [];
  for (let y = 1400; y < 1850; y += 50) {
    ticks.push({ year: y, major: y % 100 === 0 });
  }
  for (let y = 1850; y <= 2025; y += 25) {
    ticks.push({ year: y, major: y % 100 === 0 });
  }
  return ticks;
}

/** Era jump points for the mini-map navigation. */
export const ERAS = [
  { id: "renaissance", label: "Renaissance", year: 1400 },
  { id: "baroque", label: "Baroque", year: 1590 },
  { id: "rococo", label: "Rococo", year: 1700 },
  { id: "romantic", label: "Romantic", year: 1780 },
  { id: "impressionist", label: "Impressionist", year: 1858 },
  { id: "modern", label: "Modern", year: 1900 },
  { id: "postwar", label: "Postwar", year: 1942 },
  { id: "contemporary", label: "Contemporary", year: 1972 },
] as const;

export type EraId = (typeof ERAS)[number]["id"];

export function getActiveEra(centerYear: number): EraId {
  let active: EraId = ERAS[0].id;
  for (const era of ERAS) {
    if (centerYear >= era.year) active = era.id;
  }
  return active;
}

/**
 * Greedy lane packing for movement bands: each band takes the first lane
 * whose previous occupant ends far enough to its left.
 */
export function assignLanes(
  movements: ArtMovement[],
  gapPx = 28
): Map<string, number> {
  const sorted = [...movements].sort((a, b) => a.startYear - b.startYear);
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();

  for (const m of sorted) {
    const startX = yearToX(m.startYear);
    const endX = yearToX(m.endYear ?? TIMELINE_END);
    let lane = laneEnds.findIndex((end) => startX >= end + gapPx);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endX);
    } else {
      laneEnds[lane] = endX;
    }
    lanes.set(m.id, lane);
  }
  return lanes;
}

/**
 * Row assignment for artist nodes so portraits at nearby years don't overlap.
 * Cycles through rows, always picking the row whose last node is furthest left.
 */
export function assignNodeRows(
  artists: Artist[],
  rowCount = 4,
  minSpacing = 68
): Map<string, number> {
  const sorted = [...artists].sort((a, b) => a.timelineYear - b.timelineYear);
  const rowEnds: number[] = Array(rowCount).fill(-Infinity);
  const rows = new Map<string, number>();

  for (const a of sorted) {
    const x = yearToX(a.timelineYear);
    // Prefer the row with the most clearance.
    let best = 0;
    for (let r = 1; r < rowCount; r++) {
      if (rowEnds[r] < rowEnds[best]) best = r;
    }
    // If any row has full clearance, take the topmost such row for stability.
    for (let r = 0; r < rowCount; r++) {
      if (x - rowEnds[r] >= minSpacing) {
        best = r;
        break;
      }
    }
    rows.set(a.id, best);
    rowEnds[best] = x;
  }
  return rows;
}

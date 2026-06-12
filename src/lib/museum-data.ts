import "server-only";
import fs from "node:fs";
import path from "node:path";
import type {
  ArtMovement,
  Artist,
  Artwork,
  WorldEvent,
  ArtistConnection,
} from "@/types/museum";

const MUSEUM_DIR = path.join(process.cwd(), "src", "data", "museum");

function readJsonDir<T>(dir: string): T[] {
  const full = path.join(MUSEUM_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(full, f), "utf-8")) as T);
}

export function getMovements(): ArtMovement[] {
  return readJsonDir<ArtMovement>("movements").sort(
    (a, b) => a.startYear - b.startYear
  );
}

export function getArtists(): Artist[] {
  return readJsonDir<Artist>("artists").sort(
    (a, b) => a.timelineYear - b.timelineYear
  );
}

export function getArtworks(): Artwork[] {
  return readJsonDir<Artwork>("artworks");
}

export function getEvents(): WorldEvent[] {
  return readJsonDir<WorldEvent>("events").sort((a, b) => a.year - b.year);
}

export function getConnections(): ArtistConnection[] {
  const file = path.join(MUSEUM_DIR, "artist-connections.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ArtistConnection[];
}

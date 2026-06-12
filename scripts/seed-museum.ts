/**
 * Seeds Postgres from the JSON data files in src/data/museum/.
 * Idempotent — uses upsert (insert ... on conflict do update).
 *
 * Run: npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql, notInArray } from "drizzle-orm";
import * as schema from "../src/drizzle/schema";
import type { ArtMovement, Artist, Artwork } from "../src/types/museum";

const MUSEUM_DIR = path.join(process.cwd(), "src", "data", "museum");

function readJsonDir<T>(dir: string): T[] {
  const full = path.join(MUSEUM_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(full, f), "utf-8")) as T);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Validation failed: ${msg}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Run via: npm run db:seed");
    process.exit(1);
  }
  const db = drizzle(neon(connectionString), { schema });

  const movements = readJsonDir<ArtMovement>("movements");
  const artists = readJsonDir<Artist>("artists");
  const artworks = readJsonDir<Artwork>("artworks");

  // ── Validate ──
  const movementIds = new Set(movements.map((m) => m.id));
  const artistIds = new Set(artists.map((a) => a.id));

  for (const m of movements) {
    assert(m.id && m.name && typeof m.startYear === "number", `movement ${m.id} missing required fields`);
    for (const ref of [...m.influences, ...m.influencedBy]) {
      assert(movementIds.has(ref), `movement ${m.id} references unknown movement "${ref}"`);
    }
    for (const ref of m.keyArtists) {
      assert(artistIds.has(ref), `movement ${m.id} references unknown artist "${ref}"`);
    }
  }
  for (const a of artists) {
    assert(a.id && a.name && typeof a.birthYear === "number" && typeof a.timelineYear === "number", `artist ${a.id} missing required fields`);
    for (const ref of a.movements) {
      assert(movementIds.has(ref), `artist ${a.id} references unknown movement "${ref}"`);
    }
  }
  for (const w of artworks) {
    // AI-generation stubs have an empty imageUrl until the image is rendered;
    // they must carry the prompt instead and are excluded from the database.
    assert(
      w.id && w.title && (w.imageUrl || w.generationPrompt),
      `artwork ${w.id} missing required fields (needs imageUrl or generationPrompt)`
    );
    if (w.artistId) assert(artistIds.has(w.artistId), `artwork ${w.id} references unknown artist "${w.artistId}"`);
    if (w.movementId) assert(movementIds.has(w.movementId), `artwork ${w.id} references unknown movement "${w.movementId}"`);
  }
  const displayableArtworks = artworks.filter((w) => w.imageUrl !== "");

  // ── Upsert movements ──
  for (const m of movements) {
    await db
      .insert(schema.artMovements)
      .values(m)
      .onConflictDoUpdate({
        target: schema.artMovements.id,
        set: {
          name: m.name,
          startYear: m.startYear,
          endYear: m.endYear,
          color: m.color,
          description: m.description,
          wikipediaUrl: m.wikipediaUrl,
          influences: m.influences,
          influencedBy: m.influencedBy,
          keyArtists: m.keyArtists,
          region: m.region,
          tags: m.tags,
        },
      });
  }

  // ── Upsert artists ──
  for (const a of artists) {
    await db
      .insert(schema.artists)
      .values(a)
      .onConflictDoUpdate({
        target: schema.artists.id,
        set: {
          name: a.name,
          birthYear: a.birthYear,
          deathYear: a.deathYear,
          nationality: a.nationality,
          movements: a.movements,
          description: a.description,
          wikipediaUrl: a.wikipediaUrl,
          portraitUrl: a.portraitUrl,
          artworkIds: a.artworkIds,
          timelineYear: a.timelineYear,
        },
      });
  }

  // ── Upsert artworks (only those with an actual image) ──
  for (const w of displayableArtworks) {
    await db
      .insert(schema.artworks)
      .values({
        id: w.id,
        artistId: w.artistId,
        movementId: w.movementId,
        title: w.title,
        year: w.year,
        imageUrl: w.imageUrl,
        source: w.source,
        licenseType: w.licenseType,
        width: w.width,
        height: w.height,
        description: w.description,
      })
      .onConflictDoUpdate({
        target: schema.artworks.id,
        set: {
          artistId: w.artistId,
          movementId: w.movementId,
          title: w.title,
          year: w.year,
          imageUrl: w.imageUrl,
          source: w.source,
          licenseType: w.licenseType,
          width: w.width,
          height: w.height,
          description: w.description,
        },
      });
  }

  // ── Remove rows whose source files no longer exist (e.g. renamed ids) ──
  // These tables are wholly file-managed, so the files are the source of truth.
  const movementIdList = movements.map((m) => m.id);
  const artistIdList = artists.map((a) => a.id);
  const artworkIdList = displayableArtworks.map((w) => w.id);

  if (artworkIdList.length > 0) {
    await db.delete(schema.artworks).where(notInArray(schema.artworks.id, artworkIdList));
  } else {
    await db.delete(schema.artworks);
  }
  await db.delete(schema.artists).where(notInArray(schema.artists.id, artistIdList));
  await db
    .delete(schema.artMovements)
    .where(notInArray(schema.artMovements.id, movementIdList));

  const result = await db.execute(
    sql`select
      (select count(*) from art_movements) as movements,
      (select count(*) from artists) as artists,
      (select count(*) from artworks) as artworks`
  );
  const counts = result.rows[0] as { movements: string; artists: string; artworks: string };
  console.log(
    `Seed complete: ${counts.movements} movements, ${counts.artists} artists, ${counts.artworks} artworks in database.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

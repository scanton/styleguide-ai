import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Auth.js tables ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ─── Community Events (from Discord forum threads) ────────────────────────────

export const communityEvents = pgTable(
  "community_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    discordThreadId: text("discord_thread_id").unique(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    discordTags: text("discord_tags").array().default(sql`'{}'::text[]`),
    threadUrl: text("thread_url"),
    postedAt: timestamp("posted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("community_events_posted_at_idx").on(t.postedAt)]
);

// ─── Articles cache (from Medium RSS) ────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary"),
    mediumUrl: text("medium_url").notNull().unique(),
    publishedAt: timestamp("published_at", { mode: "date" }),
    thumbnailUrl: text("thumbnail_url"),
    tags: text("tags").array().default(sql`'{}'::text[]`),
    movementMatches: text("movement_matches").array().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
    updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [
    index("articles_published_at_idx").on(t.publishedAt),
    index("articles_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.title} || ' ' || coalesce(${t.summary}, ''))`
    ),
  ]
);

// ─── Community spotlight (DeviantArt RSS) ────────────────────────────────────

export const communitySpotlight = pgTable(
  "community_spotlight",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    artistName: text("artist_name").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    deviationUrl: text("deviation_url").notNull().unique(),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("spotlight_published_at_idx").on(t.publishedAt)]
);

// ─── Museum tables ────────────────────────────────────────────────────────────

export const artMovements = pgTable(
  "art_movements",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year"),
    color: text("color").notNull(),
    description: text("description").notNull(),
    wikipediaUrl: text("wikipedia_url").notNull(),
    influences: text("influences").array().default(sql`'{}'::text[]`),
    influencedBy: text("influenced_by").array().default(sql`'{}'::text[]`),
    keyArtists: text("key_artists").array().default(sql`'{}'::text[]`),
    region: text("region").array().default(sql`'{}'::text[]`),
    tags: text("tags").array().default(sql`'{}'::text[]`),
  },
  (t) => [
    index("art_movements_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.name} || ' ' || ${t.description})`
    ),
  ]
);

export const artists = pgTable(
  "artists",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    birthYear: integer("birth_year").notNull(),
    deathYear: integer("death_year"),
    nationality: text("nationality").array().default(sql`'{}'::text[]`),
    movements: text("movements").array().default(sql`'{}'::text[]`),
    description: text("description").notNull(),
    wikipediaUrl: text("wikipedia_url").notNull(),
    portraitUrl: text("portrait_url").notNull(),
    artworkIds: text("artwork_ids").array().default(sql`'{}'::text[]`),
    timelineYear: integer("timeline_year").notNull(),
  },
  (t) => [
    index("artists_timeline_year_idx").on(t.timelineYear),
    index("artists_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.name} || ' ' || ${t.description})`
    ),
  ]
);

export const artworks = pgTable("artworks", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").references(() => artists.id),
  movementId: text("movement_id").references(() => artMovements.id),
  title: text("title").notNull(),
  year: integer("year"),
  imageUrl: text("image_url").notNull(),
  source: text("source", {
    enum: ["wikimedia", "rijksmuseum", "ai-generated", "other"],
  }).notNull(),
  licenseType: text("license_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  description: text("description"),
});

// ─── StyleDice roll history ───────────────────────────────────────────────────

export const stylediceHistory = pgTable(
  "styledice_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // JSON array of 6 strings: [movement, artist, media, technique, popCulture, genre]
    diceValues: text("dice_values").notNull(),
    generatedPrompt: text("generated_prompt"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("styledice_history_user_idx").on(t.userId)]
);

// ─── StyleBear prompt history ─────────────────────────────────────────────────

export const stylebearHistory = pgTable(
  "stylebear_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    inputs: text("inputs").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("stylebear_history_user_idx").on(t.userId)]
);

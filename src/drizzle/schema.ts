import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
  real,
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
  preferredAspectRatio: text("preferred_aspect_ratio"),
  preferredLanguage: text("preferred_language"),
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

// ─── Current theme hero (DeviantArt second gallery) ──────────────────────────

export const currentTheme = pgTable("current_theme", {
  id: text("id").primaryKey(),
  galleryName: text("gallery_name"),
  heroImageUrl: text("hero_image_url"),
  heroDeviationUrl: text("hero_deviation_url"),
  journalUrl: text("journal_url"),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`),
});

// ─── StyleTarot hand history ──────────────────────────────────────────────────

export const styletarotHistory = pgTable(
  "styletarot_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // JSON array of 5 card indices
    cardIndices: text("card_indices").notNull(),
    generatedPrompt: text("generated_prompt"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("styletarot_history_user_idx").on(t.userId)]
);

// ─── Rising community gallery ─────────────────────────────────────────────────

export const risingPosts = pgTable(
  "rising_posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: text("source", { enum: ["deviantart", "discord", "site"] }).notNull(),
    sourceId: text("source_id"),
    imageUrl: text("image_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    title: text("title"),
    caption: text("caption"),
    creatorName: text("creator_name").notNull(),
    creatorUrl: text("creator_url"),
    toolOrigin: text("tool_origin"),
    toolContext: text("tool_context"),
    rawEngagement: integer("raw_engagement").default(0).notNull(),
    siteLikes: integer("site_likes").default(0).notNull(),
    risingScore: real("rising_score").default(0).notNull(),
    aspectRatioClass: text("aspect_ratio_class", {
      enum: ["portrait", "square", "landscape"],
    })
      .default("square")
      .notNull(),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    sourceUrl: text("source_url"),
    hidden: boolean("hidden").default(false).notNull(),
  },
  (t) => [
    index("rising_posts_expires_score_idx").on(t.expiresAt, t.risingScore),
    index("rising_posts_source_idx").on(t.source, t.expiresAt),
  ]
);

export const risingVotes = pgTable(
  "rising_votes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => risingPosts.id, { onDelete: "cascade" }),
    voterId: text("voter_id").notNull(),
    votedAt: timestamp("voted_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.postId, t.voterId] })]
);

export const risingReports = pgTable(
  "rising_reports",
  {
    postId: text("post_id")
      .notNull()
      .references(() => risingPosts.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.reporterId] }),
    index("rising_reports_post_idx").on(t.postId),
  ]
);

// ─── Museum prompt history ─────────────────────────────────────────────────────
export const museumHistory = pgTable(
  "museum_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityName: text("entity_name").notNull(),
    sceneDetails: text("scene_details"),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`),
  },
  (t) => [index("museum_history_user_idx").on(t.userId)]
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

// ─── Community StyleTarot cards ───────────────────────────────────────────────

export const communityTarotCards = pgTable(
  "community_tarot_cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `stc_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull(),
    creator: text("creator").notNull(),
    creatorUserId: text("creator_user_id"),
    imageUrl: text("image_url"), // null until image uploaded (Discord two-step)
    source: text("source", { enum: ["web", "discord"] }).notNull().default("web"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  },
  (t) => [
    index("community_tarot_cards_creator_idx").on(t.creatorUserId),
    index("community_tarot_cards_created_idx").on(t.createdAt),
  ]
);

// ─── LLM model attempt log (experiment fallback chain) ───────────────────────

export const llmModelAttempts = pgTable(
  "llm_model_attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    model: text("model").notNull(),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    latencyMs: integer("latency_ms"),
    // Which feature triggered the call: stylebear, styletarot, styledice, museum, generic
    context: text("context"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  },
  (t) => [
    index("llm_model_attempts_model_idx").on(t.model),
    index("llm_model_attempts_created_idx").on(t.createdAt),
  ]
);

CREATE TABLE "rising_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "source" text NOT NULL,
  "source_id" text,
  "image_url" text NOT NULL,
  "thumbnail_url" text,
  "title" text,
  "caption" text,
  "creator_name" text NOT NULL,
  "creator_url" text,
  "tool_origin" text,
  "tool_context" text,
  "raw_engagement" integer DEFAULT 0 NOT NULL,
  "site_likes" integer DEFAULT 0 NOT NULL,
  "rising_score" real DEFAULT 0 NOT NULL,
  "aspect_ratio_class" text DEFAULT 'square' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "source_url" text
);

CREATE TABLE "rising_votes" (
  "post_id" text NOT NULL REFERENCES "rising_posts"("id") ON DELETE CASCADE,
  "voter_id" text NOT NULL,
  "voted_at" timestamp DEFAULT now(),
  PRIMARY KEY ("post_id", "voter_id")
);

CREATE INDEX "rising_posts_expires_score_idx" ON "rising_posts" ("expires_at", "rising_score" DESC);
CREATE INDEX "rising_posts_source_idx" ON "rising_posts" ("source", "expires_at");
CREATE UNIQUE INDEX "rising_posts_source_id_idx" ON "rising_posts" ("source", "source_id") WHERE "source_id" IS NOT NULL;

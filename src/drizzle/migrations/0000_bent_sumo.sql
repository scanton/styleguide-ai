CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "art_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"color" text NOT NULL,
	"description" text NOT NULL,
	"wikipedia_url" text NOT NULL,
	"influences" text[] DEFAULT '{}'::text[],
	"influenced_by" text[] DEFAULT '{}'::text[],
	"key_artists" text[] DEFAULT '{}'::text[],
	"region" text[] DEFAULT '{}'::text[],
	"tags" text[] DEFAULT '{}'::text[]
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"medium_url" text NOT NULL,
	"published_at" timestamp,
	"tags" text[] DEFAULT '{}'::text[],
	"movement_matches" text[] DEFAULT '{}'::text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_medium_url_unique" UNIQUE("medium_url")
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_year" integer NOT NULL,
	"death_year" integer,
	"nationality" text[] DEFAULT '{}'::text[],
	"movements" text[] DEFAULT '{}'::text[],
	"description" text NOT NULL,
	"wikipedia_url" text NOT NULL,
	"portrait_url" text NOT NULL,
	"artwork_ids" text[] DEFAULT '{}'::text[],
	"timeline_year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_id" text,
	"movement_id" text,
	"title" text NOT NULL,
	"year" integer,
	"image_url" text NOT NULL,
	"source" text NOT NULL,
	"license_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "community_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"discord_message_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_events_discord_message_id_unique" UNIQUE("discord_message_id")
);
--> statement-breakpoint
CREATE TABLE "community_spotlight" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artist_name" text NOT NULL,
	"thumbnail_url" text,
	"deviation_url" text NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_spotlight_deviation_url_unique" UNIQUE("deviation_url")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stylebear_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"inputs" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "styledice_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"dice_values" text NOT NULL,
	"generated_prompt" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_movement_id_art_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."art_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylebear_history" ADD CONSTRAINT "stylebear_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "styledice_history" ADD CONSTRAINT "styledice_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "art_movements_fts_idx" ON "art_movements" USING gin (to_tsvector('english', "name" || ' ' || "description"));--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_fts_idx" ON "articles" USING gin (to_tsvector('english', "title" || ' ' || coalesce("summary", '')));--> statement-breakpoint
CREATE INDEX "artists_timeline_year_idx" ON "artists" USING btree ("timeline_year");--> statement-breakpoint
CREATE INDEX "artists_fts_idx" ON "artists" USING gin (to_tsvector('english', "name" || ' ' || "description"));--> statement-breakpoint
CREATE INDEX "community_events_date_idx" ON "community_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "spotlight_published_at_idx" ON "community_spotlight" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "stylebear_history_user_idx" ON "stylebear_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "styledice_history_user_idx" ON "styledice_history" USING btree ("user_id");
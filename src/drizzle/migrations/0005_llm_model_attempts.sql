CREATE TABLE "llm_model_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "model" text NOT NULL,
  "success" boolean NOT NULL,
  "error_message" text,
  "latency_ms" integer,
  "context" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "llm_model_attempts_model_idx" ON "llm_model_attempts" ("model");
CREATE INDEX "llm_model_attempts_created_idx" ON "llm_model_attempts" ("created_at");

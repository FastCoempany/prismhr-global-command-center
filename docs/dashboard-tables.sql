-- Dashboard (moonshot) — create the single isolated table for the hand-sewn board.
-- Safe/surgical/idempotent: creates only DashCard, touches nothing else.
-- Supabase dashboard -> SQL Editor -> paste all -> Run.
-- (Until this runs, the dashboard is read-only; after it runs, cards + node
-- states persist. It is intentionally wired to nothing else in the app.)

CREATE TABLE IF NOT EXISTS "DashCard" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "states" JSONB,
  "notes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DashCard_position_idx" ON "DashCard"("position");

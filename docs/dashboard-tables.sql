-- Dashboard (moonshot) — isolated tables for the hand-sewn board.
-- Safe/surgical/idempotent. Supabase dashboard -> SQL Editor -> paste all -> Run.
-- Re-runnable: creates DashCard + DashConfig and adds the archived column if the
-- table already existed. Wired to nothing else in the app.

CREATE TABLE IF NOT EXISTS "DashCard" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "states" JSONB,
  "notes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashCard_pkey" PRIMARY KEY ("id")
);

-- If DashCard already existed from an earlier run, add the archived column.
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "DashCard_position_idx" ON "DashCard"("position");
CREATE INDEX IF NOT EXISTS "DashCard_archived_idx" ON "DashCard"("archived");

CREATE TABLE IF NOT EXISTS "DashConfig" (
  "id" TEXT NOT NULL,
  "labels" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashConfig_pkey" PRIMARY KEY ("id")
);

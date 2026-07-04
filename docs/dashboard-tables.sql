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
  "checks" JSONB,
  "checkNotes" JSONB,
  "activated" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashCard_pkey" PRIMARY KEY ("id")
);

-- If DashCard already existed from an earlier run, add the newer columns.
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "checks" JSONB;
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "checkNotes" JSONB;
-- "activated" records when each node first went active, so Today can age commitments.
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "activated" JSONB;

CREATE INDEX IF NOT EXISTS "DashCard_position_idx" ON "DashCard"("position");
CREATE INDEX IF NOT EXISTS "DashCard_archived_idx" ON "DashCard"("archived");

CREATE TABLE IF NOT EXISTS "DashConfig" (
  "id" TEXT NOT NULL,
  "labels" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashConfig_pkey" PRIMARY KEY ("id")
);

-- Field notes — the owner's running "voice of the base" + enablement-gap
-- capture (what we have / don't / need to arm partners). Standalone; feeds the
-- Today surface and the Aleks 1:1. Safe to re-run.
CREATE TABLE IF NOT EXISTS "FieldNote" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'gap',
  "body" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FieldNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FieldNote_kind_idx" ON "FieldNote"("kind");
CREATE INDEX IF NOT EXISTS "FieldNote_resolved_idx" ON "FieldNote"("resolved");

-- Today interaction overlays — let Today act in place (park a signal, validate a
-- score, resolve a Look-into item) without duplicating the Dashboard. Safe to re-run.
CREATE TABLE IF NOT EXISTS "SignalSnooze" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "snoozedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SignalSnooze_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SignalSnooze_accountId_key" ON "SignalSnooze"("accountId");

CREATE TABLE IF NOT EXISTS "ScoreValidation" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "adjustedDemand" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScoreValidation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScoreValidation_accountId_key" ON "ScoreValidation"("accountId");

CREATE TABLE IF NOT EXISTS "LookIntoStatus" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LookIntoStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LookIntoStatus_itemId_key" ON "LookIntoStatus"("itemId");

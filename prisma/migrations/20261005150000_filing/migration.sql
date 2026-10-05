-- The Filing table and the links to it: one row per capture, carrying the
-- structured read, every window that cut something and the duplicate check's
-- outcome; every AccountNote and Todo the filing wrote points back at it.
--
-- The Chute brains refactor plan, §2.1 (pick C): the read is stored in its
-- own table and linked by a column, never scanned out of a body, because
-- provenance is columns (ruled 2026-09-25, P3/P4). D4 needs the windows kept
-- where the receipt can read them; D7 needs the duplicate check's outcome;
-- D10 needs the signals kept. Unique on (accountId, fingerprint), the
-- pastehash marker's own key, so a re-drop after an undo replaces the row.
--
-- Applied by the app when the server starts (src/lib/db/migrate.ts lists it,
-- src/instrumentation.ts runs it) because Vercel's build cannot reach the
-- database; IF NOT EXISTS on every statement keeps that re-runnable, so a
-- start that died halfway finishes on the next one, and keeps `prisma migrate
-- deploy` honest on a database the app already updated.
--
-- Additive and nullable. Existing rows read as NULL — filed before the column
-- existed — and the readers fall back to the regex pass on them (slice 10).
CREATE TABLE IF NOT EXISTS "Filing" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "door" TEXT NOT NULL,
    "dialect" TEXT NOT NULL,
    "how" TEXT NOT NULL,
    "read" JSONB,
    "windows" JSONB NOT NULL,
    "dupeCheck" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Filing_accountId_fingerprint_key" ON "Filing"("accountId", "fingerprint");
CREATE INDEX IF NOT EXISTS "Filing_accountId_idx" ON "Filing"("accountId");
ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "filingId" TEXT;
CREATE INDEX IF NOT EXISTS "AccountNote_filingId_idx" ON "AccountNote"("filingId");
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "filingId" TEXT;
CREATE INDEX IF NOT EXISTS "Todo_filingId_idx" ON "Todo"("filingId");

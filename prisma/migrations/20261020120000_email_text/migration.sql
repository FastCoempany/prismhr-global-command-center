-- The EmailText table: the whole email beside its note (ship order
-- 2026-10-20; CLAUDE.md, The email in the row). The read keeps each filed
-- email as a synopsis; this keeps the email's own words, cleaned and
-- money-redacted, one row per email entry, keyed by the note, so the
-- HomeRoom row can show the newest email whole.
--
-- Applied by the app when the server starts (src/lib/db/migrate.ts lists it,
-- src/instrumentation.ts runs it) because Vercel's build cannot reach the
-- database; IF NOT EXISTS on every statement keeps that re-runnable.
--
-- Additive: a new table, no column on any existing one.
CREATE TABLE IF NOT EXISTS "EmailText" (
    "noteId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "filingId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailText_pkey" PRIMARY KEY ("noteId")
);
CREATE INDEX IF NOT EXISTS "EmailText_accountId_idx" ON "EmailText"("accountId");
CREATE INDEX IF NOT EXISTS "EmailText_filingId_idx" ON "EmailText"("filingId");

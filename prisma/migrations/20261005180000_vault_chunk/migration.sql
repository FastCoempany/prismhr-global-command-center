-- The VaultChunk table: the vault's staging for a dropped file above the
-- server's request cap. The file arrives in pieces of at most 4 MB, each a
-- row here, until the last one lands; then the server assembles the file in
-- order, pushes it to GitHub once and deletes the pieces (the Chute brains
-- refactor plan, §2.4 and slice 7; D8 as amended 2026-10-05 — CLAUDE.md, The
-- Chute: every dropped file travels through the server, no token reaches the
-- browser, and git is the home for every size).
--
-- Applied by the app when the server starts (src/lib/db/migrate.ts lists it,
-- src/instrumentation.ts runs it) because Vercel's build cannot reach the
-- database; IF NOT EXISTS on every statement keeps that re-runnable, so a
-- start that died halfway finishes on the next one, and keeps `prisma migrate
-- deploy` honest on a database the app already updated.
--
-- Additive: a new table, no column on any existing one.
CREATE TABLE IF NOT EXISTS "VaultChunk" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultChunk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VaultChunk_accountId_filename_idx" ON "VaultChunk"("accountId", "filename");

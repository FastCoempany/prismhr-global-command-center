-- Demo Sidekick — create the six feature tables directly.
-- Use this when Prisma's migrate/db push can't run (e.g. the database already
-- contains unrelated tables or cross-schema refs to Supabase's `auth` schema).
-- Safe and surgical: creates ONLY the sidekick tables, touches nothing else.
-- Idempotent — safe to run more than once.
--
-- How: Supabase dashboard → SQL Editor → New query → paste all of this → Run.

DO $$ BEGIN
  CREATE TYPE "DemoAudience" AS ENUM ('BOTH', 'SERVICE_PROVIDER', 'DIRECT_EMPLOYER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "DemoAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "personaLabel" TEXT,
    "defaultAudience" "DemoAudience" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoNote" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoPin" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoPin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoPlaybook" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoPlaybook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoPlaybookItem" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoPlaybookItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DemoScreenOverride" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "say" TEXT,
    "what" TEXT,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sp" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "de" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branching" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DemoScreenOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemoAccount_name_idx" ON "DemoAccount"("name");
CREATE INDEX IF NOT EXISTS "DemoNote_accountId_idx" ON "DemoNote"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "DemoNote_accountId_screenId_key" ON "DemoNote"("accountId", "screenId");
CREATE INDEX IF NOT EXISTS "DemoPin_accountId_idx" ON "DemoPin"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "DemoPin_accountId_screenId_key" ON "DemoPin"("accountId", "screenId");
CREATE INDEX IF NOT EXISTS "DemoPlaybook_accountId_idx" ON "DemoPlaybook"("accountId");
CREATE INDEX IF NOT EXISTS "DemoPlaybookItem_playbookId_idx" ON "DemoPlaybookItem"("playbookId");
CREATE UNIQUE INDEX IF NOT EXISTS "DemoScreenOverride_screenId_key" ON "DemoScreenOverride"("screenId");

DO $$ BEGIN
  ALTER TABLE "DemoNote" ADD CONSTRAINT "DemoNote_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "DemoPin" ADD CONSTRAINT "DemoPin_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "DemoPlaybook" ADD CONSTRAINT "DemoPlaybook_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "DemoPlaybookItem" ADD CONSTRAINT "DemoPlaybookItem_playbookId_fkey"
    FOREIGN KEY ("playbookId") REFERENCES "DemoPlaybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

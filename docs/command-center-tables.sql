-- Command Center — create the two mutable-state tables directly in Supabase.
-- Safe/surgical/idempotent: creates only PeoState + PeoActivity, touches nothing else.
-- Supabase dashboard -> SQL Editor -> paste all -> Run.
-- (Until this runs, the command center still shows the book read-only; after it
-- runs, stage/approach/intent/next-action/notes persist.)

DO $$ BEGIN
  CREATE TYPE "PeoStage" AS ENUM ('NOT_TOUCHED','CSM_BRIEFED','PEO_ENGAGED','CLIENT_CAMPAIGN','LEAD','DEMO','OPPORTUNITY','WON','PASSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PeoApproach" AS ENUM ('NEEDS_CSM','CHANNEL_OK','DIRECT_OK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PeoIntent" AS ENUM ('UNKNOWN','LOW','MEDIUM','HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "PeoState" (
  "id" TEXT NOT NULL,
  "peoId" TEXT NOT NULL,
  "stage" "PeoStage" NOT NULL DEFAULT 'NOT_TOUCHED',
  "approach" "PeoApproach" NOT NULL DEFAULT 'NEEDS_CSM',
  "intent" "PeoIntent" NOT NULL DEFAULT 'UNKNOWN',
  "nextAction" TEXT,
  "nextActionDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeoState_pkey" PRIMARY KEY ("id")
);

-- If PeoState already existed from an earlier run, add the new columns.
ALTER TABLE "PeoState" ADD COLUMN IF NOT EXISTS "approach" "PeoApproach" NOT NULL DEFAULT 'NEEDS_CSM';
ALTER TABLE "PeoState" ADD COLUMN IF NOT EXISTS "intent" "PeoIntent" NOT NULL DEFAULT 'UNKNOWN';

CREATE TABLE IF NOT EXISTS "PeoActivity" (
  "id" TEXT NOT NULL,
  "peoId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PeoActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PeoState_peoId_key" ON "PeoState"("peoId");
CREATE INDEX IF NOT EXISTS "PeoState_stage_idx" ON "PeoState"("stage");
CREATE INDEX IF NOT EXISTS "PeoState_approach_idx" ON "PeoState"("approach");
CREATE INDEX IF NOT EXISTS "PeoState_nextActionDate_idx" ON "PeoState"("nextActionDate");
CREATE INDEX IF NOT EXISTS "PeoActivity_peoId_idx" ON "PeoActivity"("peoId");

DO $$ BEGIN
  ALTER TABLE "PeoActivity" ADD CONSTRAINT "PeoActivity_peoId_fkey"
    FOREIGN KEY ("peoId") REFERENCES "PeoState"("peoId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

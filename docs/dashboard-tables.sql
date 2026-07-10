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
-- Deal size (free text) + stakeholders (each their own box).
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "dealSize" TEXT;
ALTER TABLE "DashCard" ADD COLUMN IF NOT EXISTS "stakeholders" JSONB;

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

-- Task completion marks (per day / per week). The key encodes the task + its
-- period, so marks reset automatically. Presence = done.
CREATE TABLE IF NOT EXISTS "TaskDone" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TaskDone_key_key" ON "TaskDone"("key");

-- Logged contacts ("touches") with an automatic follow-up cadence. Marking a
-- partner contacted / an outreach sent creates one; Today surfaces it when the
-- follow-up comes due and keeps nudging every intervalDays until a reply is
-- marked. subjectKey is stable/deterministic so re-contacting advances the same
-- thread. Safe to re-run.
CREATE TABLE IF NOT EXISTS "Touch" (
  "id" TEXT NOT NULL,
  "subjectKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'partner',
  "label" TEXT NOT NULL,
  "detail" TEXT,
  "message" TEXT,
  "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "followUpAt" TIMESTAMP(3) NOT NULL,
  "intervalDays" INTEGER NOT NULL DEFAULT 2,
  "status" TEXT NOT NULL DEFAULT 'awaiting',
  "log" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Touch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Touch_subjectKey_key" ON "Touch"("subjectKey");
CREATE INDEX IF NOT EXISTS "Touch_status_idx" ON "Touch"("status");
CREATE INDEX IF NOT EXISTS "Touch_followUpAt_idx" ON "Touch"("followUpAt");

-- Plain personal to-dos — the right-hand column beside Follow-ups on Today.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS "Todo" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Todo_done_idx" ON "Todo"("done");
CREATE INDEX IF NOT EXISTS "Todo_position_idx" ON "Todo"("position");
-- Notetaker upgrade: optional account link + date/time. Additive; existing notes
-- keep their body/done untouched.
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "remindAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Todo_accountId_idx" ON "Todo"("accountId");

-- Stash — the app-wide capture inbox. Highlight / right-click / drag anything on
-- any tab and it lands here with an auto micro-note, until you route it to a lane
-- (todo → Todo, follow → Touch, gap → FieldNote). Only un-routed grabs persist
-- here; right-click routing writes straight to the target store. Safe to re-run.
CREATE TABLE IF NOT EXISTS "StashItem" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "micro" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT '',
  "accountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StashItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StashItem_createdAt_idx" ON "StashItem"("createdAt");

-- Per-account engagement — CSM meeting cadence, CSM notes, client health, and
-- whether Salesforce research has been pulled. Keyed by the SF account id.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS "AccountEngagement" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "cadence" TEXT,
  "meetingDay" TEXT,
  "nextMeetingAt" TIMESTAMP(3),
  "clientHealth" TEXT,
  "csmNotes" TEXT,
  "sfCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountEngagement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountEngagement_accountId_key" ON "AccountEngagement"("accountId");

-- A dated, time-stamped note pinned to a partner (CSM) — the by-partner
-- repository behind the Partner Room and the notes strip on each partner's
-- outreach card on Today. Written from Stash routing and the Partner Room's
-- note box. Safe to re-run.
CREATE TABLE IF NOT EXISTS "PartnerNote" (
  "id" TEXT NOT NULL,
  "partner" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PartnerNote_partner_createdAt_idx" ON "PartnerNote"("partner", "createdAt");

-- A dated, time-stamped note pinned to a book account from the partner-outreach
-- chips on Today — your own note or what the partner said. Surfaces on the
-- Account Room detail panel and drives chip freshness colors. Safe to re-run.
CREATE TABLE IF NOT EXISTS "AccountNote" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "partner" TEXT NOT NULL DEFAULT '',
  "kind" TEXT NOT NULL DEFAULT 'mine',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AccountNote_accountId_createdAt_idx" ON "AccountNote"("accountId", "createdAt");

-- Off-structure account dispositions — "motion" (conversation already live,
-- skip the roundup), "not-mine" (another rep's account; excluded + ledgered),
-- "parked" (shelved for now). One row per account. Safe to re-run.
CREATE TABLE IF NOT EXISTS "AccountDisposition" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountDisposition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountDisposition_accountId_key" ON "AccountDisposition"("accountId");
CREATE INDEX IF NOT EXISTS "AccountDisposition_status_idx" ON "AccountDisposition"("status");

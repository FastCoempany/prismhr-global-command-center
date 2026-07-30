-- The Intranet's tables. Run once in the Supabase SQL editor.
--
-- Until this runs, /intranet renders as an empty brain rather than an error:
-- every loader in src/lib/intranet/store.ts degrades to empty on a missing
-- table. Nothing else in the app is touched by this migration.
--
-- Doctrine these tables carry (docs/intranet-research-room.md):
--   · source is provenance, never partition — no table here is per-origin
--   · nothing is ever deleted; "originGone" marks a mirror whose app row went
--   · people are never entities; "speakers" is provenance only
--
-- Safe to re-run: every statement is IF NOT EXISTS.

-- ── the raw arrival ─────────────────────────────────────────────────────────
-- "raw" is ALWAYS post-redaction. The pre-redaction text is never persisted;
-- scrubSecrets and redactMoney run in memory before the first insert.
CREATE TABLE IF NOT EXISTS "IntranetCapture" (
  "id"          TEXT PRIMARY KEY,
  "origin"      TEXT        NOT NULL,
  "raw"         TEXT        NOT NULL,
  "rawChecksum" TEXT        NOT NULL UNIQUE,
  "title"       TEXT        NOT NULL DEFAULT '',
  "capturedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "segmented"   BOOLEAN     NOT NULL DEFAULT false,
  "meta"        JSONB
);
CREATE INDEX IF NOT EXISTS "IntranetCapture_capturedAt_idx"
  ON "IntranetCapture" ("capturedAt");

-- ── documents ───────────────────────────────────────────────────────────────
-- One coherent conversation. App-owned rows are MIRRORED here, not moved: the
-- home table stays the source of truth and "originRef" walks back to it.
CREATE TABLE IF NOT EXISTS "IntranetDoc" (
  "id"            TEXT PRIMARY KEY,
  "captureId"     TEXT        NOT NULL DEFAULT '',
  "origin"        TEXT        NOT NULL,
  "originRef"     TEXT        NOT NULL DEFAULT '',
  "space"         TEXT        NOT NULL DEFAULT '',
  "title"         TEXT        NOT NULL DEFAULT '',
  "body"          TEXT        NOT NULL,
  "speakers"      TEXT[]      NOT NULL DEFAULT '{}',
  "occurredAt"    TIMESTAMPTZ NOT NULL,
  "capturedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "accountId"     TEXT        NOT NULL DEFAULT '',
  "links"         JSONB,
  "checksum"      TEXT        NOT NULL,
  "extractedAt"   TIMESTAMPTZ,
  "promptVersion" TEXT        NOT NULL DEFAULT '',
  -- C6 · the app row went away; the memory did not.
  "originGone"    TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntranetDoc_origin_originRef_key"
  ON "IntranetDoc" ("origin", "originRef");
CREATE INDEX IF NOT EXISTS "IntranetDoc_checksum_idx"  ON "IntranetDoc" ("checksum");
CREATE INDEX IF NOT EXISTS "IntranetDoc_occurredAt_idx" ON "IntranetDoc" ("occurredAt");
CREATE INDEX IF NOT EXISTS "IntranetDoc_extractedAt_idx" ON "IntranetDoc" ("extractedAt");

-- ── claims ──────────────────────────────────────────────────────────────────
-- What retrieval matches and what answers are built from. Offsets are what let
-- a citation open into the surrounding conversation rather than a bare quote.
CREATE TABLE IF NOT EXISTS "IntranetClaim" (
  "id"           TEXT PRIMARY KEY,
  "docId"        TEXT        NOT NULL,
  "text"         TEXT        NOT NULL,
  "speaker"      TEXT        NOT NULL DEFAULT '',
  "saidAt"       TIMESTAMPTZ NOT NULL,
  -- fact | decision | commitment | opinion | question | process | prospect-question
  "kind"         TEXT        NOT NULL,
  "confidence"   TEXT        NOT NULL DEFAULT 'stated',
  "entities"     TEXT[]      NOT NULL DEFAULT '{}',
  "topicIds"     TEXT[]      NOT NULL DEFAULT '{}',
  -- C7 · prospect questions only: definitional|commercial|risk|technical|process|timeline
  "askShape"     TEXT        NOT NULL DEFAULT '',
  "offsetStart"  INTEGER     NOT NULL DEFAULT 0,
  "offsetEnd"    INTEGER     NOT NULL DEFAULT 0,
  "supersededBy" TEXT        NOT NULL DEFAULT '',
  "disputedWith" TEXT[]      NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IntranetClaim_docId_idx"  ON "IntranetClaim" ("docId");
CREATE INDEX IF NOT EXISTS "IntranetClaim_saidAt_idx" ON "IntranetClaim" ("saidAt");
CREATE INDEX IF NOT EXISTS "IntranetClaim_kind_idx"   ON "IntranetClaim" ("kind");
-- The array roads: topic and entity retrieval both hit these.
CREATE INDEX IF NOT EXISTS "IntranetClaim_topicIds_gin"
  ON "IntranetClaim" USING GIN ("topicIds");
CREATE INDEX IF NOT EXISTS "IntranetClaim_entities_gin"
  ON "IntranetClaim" USING GIN ("entities");
-- The lexical road: full-text over the claim's own words.
CREATE INDEX IF NOT EXISTS "IntranetClaim_text_fts"
  ON "IntranetClaim" USING GIN (to_tsvector('english', "text"));

-- ── topics ──────────────────────────────────────────────────────────────────
-- Derived, accumulated, hierarchical. "parentId" is the whole decomposition
-- mechanism; depth is uncapped. A merged topic KEEPS its row and redirects, so
-- every id ever issued still resolves.
CREATE TABLE IF NOT EXISTS "IntranetTopic" (
  "id"         TEXT PRIMARY KEY,
  "label"      TEXT        NOT NULL,
  "parentId"   TEXT        NOT NULL DEFAULT '',
  "summary"    TEXT        NOT NULL DEFAULT '',
  "status"     TEXT        NOT NULL DEFAULT 'pending',  -- pending|live|merged
  "mergedInto" TEXT        NOT NULL DEFAULT '',
  "docCount"   INTEGER     NOT NULL DEFAULT 0,
  "claimCount" INTEGER     NOT NULL DEFAULT 0,
  "firstSeen"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSeen"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IntranetTopic_status_idx"   ON "IntranetTopic" ("status");
CREATE INDEX IF NOT EXISTS "IntranetTopic_parentId_idx" ON "IntranetTopic" ("parentId");

-- ── asks ────────────────────────────────────────────────────────────────────
-- Every question and answer, kept for the reasoning fold, for evals, and so a
-- repeat is cheap.
CREATE TABLE IF NOT EXISTS "IntranetAsk" (
  "id"           TEXT PRIMARY KEY,
  "question"     TEXT        NOT NULL,
  "plan"         JSONB,
  "candidateIds" TEXT[]      NOT NULL DEFAULT '{}',
  "answer"       TEXT        NOT NULL DEFAULT '',
  "reasoning"    TEXT        NOT NULL DEFAULT '',
  "citations"    JSONB,
  "coverage"     JSONB,
  "model"        TEXT        NOT NULL DEFAULT '',
  "ms"           INTEGER     NOT NULL DEFAULT 0,
  "askedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IntranetAsk_askedAt_idx" ON "IntranetAsk" ("askedAt");

-- ── row level security ──────────────────────────────────────────────────────
-- Supabase warns when a table has no RLS, because the anon and authenticated
-- API keys could otherwise read it. This corpus is internal — it should never
-- be reachable by a browser key at all — so RLS goes ON with NO policies:
-- the deny-by-default posture.
--
-- The app is unaffected. It connects over DATABASE_URL as the table owner, and
-- an owner bypasses RLS unless FORCE ROW LEVEL SECURITY is set. It is not set
-- here, and must not be — that single word is what would lock the app out of
-- its own brain.
ALTER TABLE "IntranetCapture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntranetDoc"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntranetClaim"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntranetTopic"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntranetAsk"     ENABLE ROW LEVEL SECURITY;

-- If the room ever reports it cannot write after this, the diagnosis is one
-- query — it will show rowsecurity = true and forcerowsecurity = false, which
-- is correct. A true in the second column is the fault:
--   SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class WHERE relname LIKE 'Intranet%';

-- ── check ───────────────────────────────────────────────────────────────────
-- Expect five rows, all zero, on a fresh run.
SELECT 'IntranetCapture' AS table, count(*) FROM "IntranetCapture"
UNION ALL SELECT 'IntranetDoc',   count(*) FROM "IntranetDoc"
UNION ALL SELECT 'IntranetClaim', count(*) FROM "IntranetClaim"
UNION ALL SELECT 'IntranetTopic', count(*) FROM "IntranetTopic"
UNION ALL SELECT 'IntranetAsk',   count(*) FROM "IntranetAsk";

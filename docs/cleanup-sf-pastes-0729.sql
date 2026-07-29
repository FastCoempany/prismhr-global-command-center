-- Clean out every SF-paste-filed record entry predating 2026-07-29 19:00 UTC —
-- the moment the pipeline repair batch (PR #165) went live. These rows carry
-- the old defects (wrong lanes, "You" actors, filing-time dates, subject-line
-- stubs); the founder re-pastes what matters and it files correctly.
--
-- WHAT IS REMOVED — and nothing else:
--   AccountNote rows that came from an SF/Outlook paste, identified by
--   source IN ('sf','sf-ai')  OR  a legacy paste head ('✉ SF …', '✔ SF …',
--   '☎ SF …') written before the source column existed.
-- WHAT REMAINS (all other data):
--   typed notes (source 'room'/'sheet'/''), transcripts ('transcript'),
--   partner notes, dispositions, touches, todos, dashboard cards — untouched.
--
-- SAFETY GUARDS (both must hold for a row to delete):
--   1. "createdAt" < '2026-07-29 19:00:00+00'  — predates the repair.
--   2. "createdAt"::time <> '12:00:00'         — post-repair pastes file at
--      the activity's date at EXACTLY noon UTC; this fingerprint protects
--      re-pasted history even if this script runs late.
--
-- Run the PREVIEW first; the DELETE is idempotent.

-- ── PREVIEW — what would be removed ─────────────────────────────────────────
SELECT "accountId",
       count(*)                       AS entries,
       min("createdAt")               AS oldest,
       max("createdAt")               AS newest
FROM   "AccountNote"
WHERE  ( "source" IN ('sf', 'sf-ai')
         OR "body" ~ '^[✉✔☎] SF ' )
  AND  "createdAt" < TIMESTAMPTZ '2026-07-29 19:00:00+00'
  AND  "createdAt"::time <> TIME '12:00:00'
GROUP  BY "accountId"
ORDER  BY entries DESC;

-- ── DELETE — run after the preview reads right ──────────────────────────────
DELETE FROM "AccountNote"
WHERE  ( "source" IN ('sf', 'sf-ai')
         OR "body" ~ '^[✉✔☎] SF ' )
  AND  "createdAt" < TIMESTAMPTZ '2026-07-29 19:00:00+00'
  AND  "createdAt"::time <> TIME '12:00:00';

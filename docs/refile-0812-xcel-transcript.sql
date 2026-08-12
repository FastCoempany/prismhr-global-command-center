-- Misfile repair, 8/12 — the Prism Global payroll demo call landed on Infiniti HR.
--
-- WHAT HAPPENED
--   2026-08-12 21:50:59Z a CALL TRANSCRIPT was filed to Infiniti HR
--   (001F000000w38OIIAY). The call is XCEL HR's (001F000000w38GlIAI): Bill
--   Laffey, Helen Niemcewicz and Sharon Murray on the XLHR side, Shane Jacobs
--   presenting. Both accounts sit with the same CSM (Anika Steenstra), which is
--   how the route slipped. One paste, one read, and the read fanned out — the
--   record entry, the commitment it opened, the asks it queued and the playbook
--   knowledge it filed all carry Infiniti HR's id.
--
-- WHAT THIS REMOVES — the 21:50:59Z paste and nothing else:
--   1  AccountNote   cmsqmiow9000204lag0zd8s34  the ☎ CT record entry
--   1  Todo          cmsqmioxz000404lahc80nmyy  the commitment it opened
--   3+ AccountNote   ns gaps:001F000000w38OIIAY  the asks it queued
--   6  AccountNote   ns playbook:market / :lessons, provenance "Infiniti HR"
--   1  AccountDisposition  pastehash:001F000000w38OIIAY:…  the duplicate marker
--
-- WHAT STAYS — everything else on Infiniti HR, including the two rows filed
-- the same evening that ARE Infiniti's own:
--   cmsqlne7g000104jo5hgriryd  ☰ transcript — the Matthew Swissman /
--                              infinitihr.com email thread (21:26:39Z)
--   cmsq7yql1000204jrg66gvpf0  ✎ the typed note about the 8/11 meeting
--   and XCEL's correctly-filed Outlook entries from 21:27:45Z, untouched.
--
-- The window guard (21:50:59.7 → 21:51:01) is what makes the asks and the
-- playbook rows exact: every row this paste wrote landed inside that second.
-- Run § 1 first and read it. Then run EITHER § 2 (remove, then re-drop the
-- .vtt on XCEL through the Chute) OR § 3 (move the rows across as they are).
-- Never both.

-- ═══ § 1 · PREVIEW — what would go ══════════════════════════════════════════

-- 1a · the record entry
SELECT "id", "createdAt", "source", "lane", "actors",
       left("body", 120) AS head
FROM   "AccountNote"
WHERE  "id" = 'cmsqmiow9000204lag0zd8s34'
  AND  "accountId" = '001F000000w38OIIAY';

-- 1b · the commitment it opened (still open — a done one is the record's, not ours)
SELECT "id", "accountId", "done", "remindAt", left("body", 160) AS body
FROM   "Todo"
WHERE  "id" = 'cmsqmioxz000404lahc80nmyy'
  AND  "accountId" = '001F000000w38OIIAY';

-- 1c · the asks it queued
SELECT "id", "createdAt", left("body", 160) AS ask
FROM   "AccountNote"
WHERE  "accountId" = 'gaps:001F000000w38OIIAY'
  AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
  AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00'
ORDER  BY "createdAt";

-- 1d · the playbook knowledge, filed against the wrong deal
SELECT "id", "accountId" AS namespace, "createdAt", left("body", 200) AS entry
FROM   "AccountNote"
WHERE  "accountId" IN ('playbook:market', 'playbook:lessons')
  AND  "body" LIKE '%"a":"001F000000w38OIIAY"%'
  AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
  AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00'
ORDER  BY "createdAt";

-- 1e · the duplicate marker (its reason carries the paste's first note id)
SELECT "id", "accountId" AS marker, "status", "reason", "createdAt"
FROM   "AccountDisposition"
WHERE  "accountId" LIKE 'pastehash:001F000000w38OIIAY:%'
  AND  "reason" LIKE '%cmsqmiow9000204lag0zd8s34%';

-- ═══ § 2 · REMOVE — run after § 1 reads right ═══════════════════════════════
-- Idempotent: every statement is a no-op once clean.

BEGIN;

DELETE FROM "AccountNote"
WHERE  "id" = 'cmsqmiow9000204lag0zd8s34'
  AND  "accountId" = '001F000000w38OIIAY';

DELETE FROM "Todo"
WHERE  "id" = 'cmsqmioxz000404lahc80nmyy'
  AND  "accountId" = '001F000000w38OIIAY'
  AND  "done" = false;

DELETE FROM "AccountNote"
WHERE  "accountId" = 'gaps:001F000000w38OIIAY'
  AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
  AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00';

DELETE FROM "AccountNote"
WHERE  "accountId" IN ('playbook:market', 'playbook:lessons')
  AND  "body" LIKE '%"a":"001F000000w38OIIAY"%'
  AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
  AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00';

DELETE FROM "AccountDisposition"
WHERE  "accountId" LIKE 'pastehash:001F000000w38OIIAY:%'
  AND  "reason" LIKE '%cmsqmiow9000204lag0zd8s34%';

COMMIT;

-- THE REFILE. Throw the same .vtt at the Chute and pick XCEL HR, or drop it on
-- XCEL's row. The duplicate guard keys per account, so XCEL takes it clean —
-- and the marker deleted above means Infiniti would take it again too, which is
-- why the file goes to XCEL and not back. The read re-derives everything: the
-- record entry, the commitment, the asks, the playbook lines. Since #199 shipped
-- at 22:20 today the whole call now also archives foldable behind one head line,
-- which the 21:50 filing predates — the re-drop is a better filing than the one
-- being removed. Clear the receipts in the Chute afterward; that ledger is the
-- browser's, not the database's.

-- ═══ § 3 · MOVE — the alternative, if the .vtt is gone ═══════════════════════
-- Repoints the same rows to XCEL HR instead of deleting them. Nothing is
-- re-read and nothing is re-spent, but the call's full text stays lost: the
-- 21:50 filing predates #199, so only the read's summary was ever stored.
-- Run this INSTEAD OF § 2, never after it.

-- BEGIN;
--
-- UPDATE "AccountNote" SET "accountId" = '001F000000w38GlIAI'
-- WHERE  "id" = 'cmsqmiow9000204lag0zd8s34' AND "accountId" = '001F000000w38OIIAY';
--
-- UPDATE "Todo" SET "accountId" = '001F000000w38GlIAI'
-- WHERE  "id" = 'cmsqmioxz000404lahc80nmyy' AND "accountId" = '001F000000w38OIIAY';
--
-- UPDATE "AccountNote" SET "accountId" = 'gaps:001F000000w38GlIAI'
-- WHERE  "accountId" = 'gaps:001F000000w38OIIAY'
--   AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
--   AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00';
--
-- UPDATE "AccountNote"
-- SET    "body" = replace("body",
--          '"a":"001F000000w38OIIAY","n":"Infiniti HR"',
--          '"a":"001F000000w38GlIAI","n":"XCEL HR"')
-- WHERE  "accountId" IN ('playbook:market', 'playbook:lessons')
--   AND  "body" LIKE '%"a":"001F000000w38OIIAY"%'
--   AND  "createdAt" >= TIMESTAMPTZ '2026-08-12 21:50:59.700+00'
--   AND  "createdAt" <  TIMESTAMPTZ '2026-08-12 21:51:01+00';
--
-- UPDATE "AccountDisposition"
-- SET    "accountId" = replace("accountId", '001F000000w38OIIAY', '001F000000w38GlIAI')
-- WHERE  "accountId" LIKE 'pastehash:001F000000w38OIIAY:%'
--   AND  "reason" LIKE '%cmsqmiow9000204lag0zd8s34%';
--
-- COMMIT;

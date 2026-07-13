-- One-off scrub: PayrollOne LLC removed from the book (7/13) — it's a child
-- entity of Denali HR Solutions and not separately contracted; the contract
-- sits with Denali. Deletes any runtime rows that referenced it. Safe to run
-- repeatedly — every statement is a no-op once clean.

DELETE FROM "Touch" WHERE "subjectKey" = 'outreach:001Pb00002ezRkoIAE';
DELETE FROM "AccountNote" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "AccountEngagement" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "AccountDisposition" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "SignalSnooze" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "ScoreValidation" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "Todo" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "StashItem" WHERE "accountId" = '001Pb00002ezRkoIAE';
DELETE FROM "DashCard" WHERE "name" = 'PayrollOne LLC';

-- One-off scrub: PuzzleHR is Shane's account, not ours. The book/research/CSV
-- entries are already removed from the app; this deletes any runtime rows that
-- ever referenced it (touches, notes, dashboard card, snoozes, validations,
-- linked to-dos). Safe to run repeatedly — every statement is a no-op once
-- clean.

DELETE FROM "Touch" WHERE "subjectKey" = 'outreach:PUZZLEHR000000001';
DELETE FROM "AccountNote" WHERE "accountId" = 'PUZZLEHR000000001';
DELETE FROM "AccountEngagement" WHERE "accountId" = 'PUZZLEHR000000001';
DELETE FROM "SignalSnooze" WHERE "accountId" = 'PUZZLEHR000000001';
DELETE FROM "ScoreValidation" WHERE "accountId" = 'PUZZLEHR000000001';
DELETE FROM "Todo" WHERE "accountId" = 'PUZZLEHR000000001';
DELETE FROM "DashCard" WHERE "name" = 'PuzzleHR';
DELETE FROM "StashItem" WHERE "accountId" = 'PUZZLEHR000000001' OR "body" ILIKE '%puzzlehr%' OR "body" ILIKE '%puzzle hr%';
DELETE FROM "PartnerNote" WHERE "body" ILIKE '%puzzlehr%' OR "body" ILIKE '%puzzle hr%';
DELETE FROM "FieldNote" WHERE "body" ILIKE '%puzzlehr%' OR "body" ILIKE '%puzzle hr%';

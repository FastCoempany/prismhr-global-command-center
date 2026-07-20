-- ── ESC dedupe (7/20): fold the hand-added "Employer Services Corporation (ESC)"
-- (synthetic id MYESC000000000001, created with the 7/14 inbound) into the real
-- Salesforce record 001F000000w38ItIAI. The book row, research entry, roundup
-- pin/bullet, and the 7/14 seed file are repointed in the same commit; this
-- migrates any DB that already applied seed-0714-esc-and-deals.sql.

UPDATE "AccountNote"
SET "accountId" = '001F000000w38ItIAI'
WHERE "accountId" = 'MYESC000000000001';

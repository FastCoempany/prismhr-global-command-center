-- One-off scrub: Kellie Washington was briefly listed as a partner from the
-- 7/13 HCM export — mistaken ID; she owns no accounts. Deletes any runtime
-- rows created against her while she was on the rail. Safe to run repeatedly;
-- every statement is a no-op once clean.

DELETE FROM "Touch" WHERE "subjectKey" = 'partner-outreach:Kellie Washington';
DELETE FROM "PartnerNote" WHERE "partner" = 'Kellie Washington';
DELETE FROM "AccountNote" WHERE "partner" = 'Kellie Washington';

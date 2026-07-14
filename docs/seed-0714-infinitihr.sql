-- One-off seed (7/14): the Infiniti HR inbound (Jennifer Hardesty, via Anika's
-- LMS thread) — thread notes, motion disposition, and a dashboard card. Safe to
-- re-run: notes/disposition conflict on fixed ids, and the card only inserts if
-- no live card with that name exists.

-- ── Infiniti HR thread, beat by beat ────────────────────────────────────────
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'inf-0-tzp-context',
  '001F000000w38OIIAY',
  'Context',
  'note',
  'Relationship context: Jennifer Hardesty was on the TZP Group thread (Mar–Apr 2026) where an Infiniti client cancelled PrismHR Performance Management — the 360-review capability fell short of what was pitched. Precision over promises with this account.',
  '2026-07-14 16:00:00'
),
(
  'inf-1-jennifer-ask',
  '001F000000w38OIIAY',
  'Jennifer Hardesty (Infiniti HR)',
  'partner',
  'On Anika''s LMS thread, Jennifer (Director of Implementation & Technology) asked: "could you send us some info on the global payroll solution that Prism integrates with now? I saw them at the conference but interested in a little more info." She thinks Global is a third-party integration. Stephanie Fitzwater cc''d.',
  '2026-07-14 16:26:00'
),
(
  'inf-2-anika-loop',
  '001F000000w38OIIAY',
  'Anika Steenstra',
  'partner',
  'Anika looped me in as the Global resource, attached the Global one-pager, and offered Jennifer either their next monthly call or something sooner with me. (Mary Mahoney looped separately for HR Compliance/Mineral — not my lane.)',
  '2026-07-14 17:15:00'
),
(
  'inf-3-followup',
  '001F000000w38OIIAY',
  'Jennifer Hardesty (Infiniti HR)',
  'mine',
  'Sent the follow-up: clarified PrismHR Global is our own product family built into their PrismHR environment (not a third-party integration), framed the four products, and asked the scoping questions (Infiniti''s own team vs. their clients, employees vs contractors, which countries, entities or not) — offered the monthly call or a sooner 20 minutes.',
  '2026-07-14 19:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Infiniti HR is in motion — a live thread, not a pending roundup.
INSERT INTO "AccountDisposition" ("id", "accountId", "status", "reason", "createdAt", "updatedAt") VALUES
(
  'seed-dispo-infinitihr',
  '001F000000w38OIIAY',
  'motion',
  'Inbound 7/14 — Jennifer Hardesty asked about Global; follow-up out (built-in clarification + scoping questions), G-P displacement opening',
  '2026-07-14 19:00:00',
  '2026-07-14 19:00:00'
)
ON CONFLICT ("accountId") DO NOTHING;

-- ── Dashboard card ──────────────────────────────────────────────────────────
INSERT INTO "DashCard" ("id", "name", "subtitle", "position", "archived", "states", "notes", "activated", "dealSize", "stakeholders", "updatedAt")
SELECT 'seed-card-infinitihr', 'Infiniti HR', 'Anika Steenstra · PEO/ASO · Columbia MD',
  105, false,
  '{"interested":"done","csm_seeded":"done","discovery":"active"}'::jsonb,
  '{"discovery":"Inbound 7/14 on Anika''s LMS thread: Jennifer Hardesty asked for info on ''the global payroll solution Prism integrates with'' (saw it at the conference — thinks it''s third-party). Follow-up sent 7/14: it''s ours and built in, four-product frame, scoping questions (own team vs clients, employees vs contractors, countries, entities). Venue: Anika''s monthly call or sooner. Displacement context: G-P alliance since 2023 — they chose it when we had no global product."}'::jsonb,
  '{"discovery":"2026-07-14T19:00:00Z"}'::jsonb,
  '32.8k WSE book · G-P displacement · scope TBD (own use vs client base)',
  '[{"name":"Jennifer Hardesty","role":"Director of Implementation & Technology, Infiniti HR","note":"Jennifer@infinitihr.com · 301-798-5627 · lived the TZP PM cancellation — precision over promises"},{"name":"Stephanie Fitzwater","role":"Infiniti HR","note":"cc on the thread"},{"name":"Anika Steenstra","role":"CSM","note":"looped me in 7/14; owns the monthly-call venue"}]'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DashCard" WHERE "name" = 'Infiniti HR' AND NOT "archived");

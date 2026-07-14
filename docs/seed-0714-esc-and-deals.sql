-- One-off seed (7/14): the ESC inbound thread + dashboard cards for every
-- active deal. Run once in Supabase after docs/dashboard-tables.sql. Safe to
-- re-run — notes/dispositions conflict on fixed ids, and each dashboard card
-- only inserts if no live card with that name exists (so nothing you added by
-- hand gets duplicated).

-- ── ESC thread, beat by beat ────────────────────────────────────────────────
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-1-inbound',
  'MYESC000000000001',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Inbound to Lesha: Hatton Humphrey (Director of Technology Solutions) asked for the best route to set up a demo and conversation about the Global Payroll Platform — ESC has "a couple of interested prospects" in their client base and needs to understand what''s available. Kim Bartolotti cc''d.',
  '2026-07-13 15:59:00'
),
(
  'esc-2-lesha-intro',
  'MYESC000000000001',
  'Lesha Cyphers',
  'partner',
  'Lesha introduced me to Hatton as the Global SME for questions and the demo.',
  '2026-07-14 16:03:00'
),
(
  'esc-3-hatton-availability',
  'MYESC000000000001',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Hatton''s reply: wants a phone call first to discuss the platform and get a general understanding, then a system demo for a larger ESC team. Availability this week (EDT): Wed 8:30–10a / 11a–2p / 3–4p, Thu 11:30a–2p, Fri 8:30a–12p.',
  '2026-07-14 16:30:00'
),
(
  'esc-4-precall-discovery',
  'MYESC000000000001',
  'C. Hatton Humphrey (ESC)',
  'mine',
  'Sent the pre-call discovery note: framed the four-product family (Global Payroll = client''s own entities; EOR = no entity; Contractor Solutions = 1099; Talent = recruiting), and asked the four scoping questions (independent client companies? employees vs contractors? which countries? own entities or not?) so the intro call and team demo land on the right product. Holding the calendar until his answers come back — nothing scheduled yet.',
  '2026-07-14 18:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- ESC is in motion — the rail reads it as a live conversation, not a pending
-- roundup. No-op if a disposition is already set.
INSERT INTO "AccountDisposition" ("id", "accountId", "status", "reason", "createdAt", "updatedAt") VALUES
(
  'seed-dispo-esc',
  'MYESC000000000001',
  'motion',
  'Inbound 7/13 — Global demo request for ESC client prospects; pre-call discovery out, calendar holds until answers return',
  '2026-07-14 18:00:00',
  '2026-07-14 18:00:00'
)
ON CONFLICT ("accountId") DO NOTHING;

-- ── Dashboard cards for every active deal ───────────────────────────────────
-- Stages: interested → csm_seeded → discovery → use_case → demo → decision.

INSERT INTO "DashCard" ("id", "name", "subtitle", "position", "archived", "states", "notes", "activated", "dealSize", "stakeholders", "updatedAt")
SELECT 'seed-card-simploy', 'Simploy', 'Lesha Cyphers · PEO/ASO · St. Louis',
  101, false,
  '{"interested":"done","csm_seeded":"done","discovery":"done","use_case":"active"}'::jsonb,
  '{"discovery":"Chassie (COO) inbound after LIVE — 8/6 partner decision. Discovery in 7/9: 2 internal contractors in India + a client group with an India contractor on another provider. Integrated PrismHR option “would be ideal” if competitive. Pricing + new Global materials sent 7/13; call proposed Mon/Tue 1–3p.","use_case":"Dual play: internal international expansion (EOR/contractor conversions) AND reselling global workforce services to their client base."}'::jsonb,
  '{"use_case":"2026-07-13T18:00:00Z"}'::jsonb,
  '2 IC (India) + client-group conversions · dual play · 8/6 clock',
  '[{"name":"Chassie Smith","role":"COO, Simploy","note":"Drives the 8/6 selection; waiting on call-window confirm"},{"name":"Lesha Cyphers","role":"CSM (intro)","note":"Keep looped via roundup card"}]'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DashCard" WHERE "name" = 'Simploy' AND NOT "archived");

INSERT INTO "DashCard" ("id", "name", "subtitle", "position", "archived", "states", "notes", "activated", "dealSize", "stakeholders", "updatedAt")
SELECT 'seed-card-advocatepay', 'Advocate Pay — SubcontractorHub', 'Eric Ronci · EOR CORE via channel',
  102, false,
  '{"interested":"done","csm_seeded":"done","discovery":"done","use_case":"done","demo":"done","decision":"active"}'::jsonb,
  '{"decision":"Pricing sent 7/8; contracts (final, client-shareable) sent 7/10 with the IP-protection walkthrough Renee requested; confirmed shareable 7/13. Deposit waived. Paced per Aleks while contracts solidify on our side. Shane OOO to 7/20 — I run point.","use_case":"SubcontractorHub roster in hand: Bulgaria “Frontier” group = primary W-2/EOR conversion; remaining international workers stay 1099."}'::jsonb,
  '{"decision":"2026-07-10T13:42:00Z"}'::jsonb,
  'Bulgaria W-2 conversions + 1099 balance · EOR CORE · deposit waived',
  '[{"name":"Bryce Rowley","role":"Advocate Pay","note":"bryce@advocatepay.com — primary"},{"name":"Andy Aziz","role":"Advocate Pay","note":"cc on contracts"},{"name":"Jessica Brach","role":"EVP Treasury, SubcontractorHub","note":"sent the intl roster 7/1"},{"name":"Renee Surratt","role":"SubcontractorHub","note":"asked for the IP-protection language"},{"name":"Shane Jacobs","role":"GBC (OOO to 7/20)","note":"deal originator — I run point"}]'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DashCard" WHERE "name" = 'Advocate Pay — SubcontractorHub' AND NOT "archived");

INSERT INTO "DashCard" ("id", "name", "subtitle", "position", "archived", "states", "notes", "activated", "dealSize", "stakeholders", "updatedAt")
SELECT 'seed-card-esc', 'Employer Services Corporation (ESC)', 'Lesha Cyphers · PEO · Western NY',
  103, false,
  '{"interested":"done","csm_seeded":"done","discovery":"active"}'::jsonb,
  '{"discovery":"Inbound 7/13: demo request for the Global Payroll Platform on behalf of a couple of interested client prospects. Pre-call discovery note sent 7/14 (entities vs EOR, employees vs contractors, countries) — calendar held until his answers land. Hatton wants a phone call first, then a system demo for a larger ESC team (had offered Wed/Thu/Fri windows)."}'::jsonb,
  '{"discovery":"2026-07-14T18:00:00Z"}'::jsonb,
  '2 client prospects · product TBD (Global Payroll vs EOR vs Contractor)',
  '[{"name":"C. Hatton Humphrey","role":"Director of Technology Solutions, ESC","note":"chumphrey@myesc.com · (716) 932-6886"},{"name":"Kim Bartolotti","role":"ESC","note":"cc on the thread"},{"name":"Lesha Cyphers","role":"CSM (intro)","note":"handed off 7/14"}]'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DashCard" WHERE "name" = 'Employer Services Corporation (ESC)' AND NOT "archived");

INSERT INTO "DashCard" ("id", "name", "subtitle", "position", "archived", "states", "notes", "activated", "dealSize", "stakeholders", "updatedAt")
SELECT 'seed-card-xcelhr', 'XCEL HR', 'Anika Steenstra · PEO/ASO · Fort Wayne',
  104, false,
  '{"interested":"done","csm_seeded":"active"}'::jsonb,
  '{"csm_seeded":"Anika (7/13): in discussions about several new products since LIVE; she can include me on the next call with Bill, her main contact. Per Aleks: let Anika lead on timing — they''re implementing ~4 Prism products right now. Education-first segment, not a pitch."}'::jsonb,
  '{"csm_seeded":"2026-07-13T20:00:00Z"}'::jsonb,
  'TBD — education-first via Anika''s next call with Bill',
  '[{"name":"Bill","role":"XcelHR (Anika''s main contact)","note":"book lists Ted Bross — confirm"},{"name":"Anika Steenstra","role":"CSM","note":"owns the timing"}]'::jsonb,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DashCard" WHERE "name" = 'XCEL HR' AND NOT "archived");

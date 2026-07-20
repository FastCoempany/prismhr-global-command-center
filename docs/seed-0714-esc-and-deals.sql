-- One-off seed (7/14): the ESC inbound thread + dashboard cards for every
-- active deal. Run once in Supabase after docs/dashboard-tables.sql. Safe to
-- re-run — notes/dispositions conflict on fixed ids, and each dashboard card
-- only inserts if no live card with that name exists (so nothing you added by
-- hand gets duplicated).

-- ── ESC thread, beat by beat ────────────────────────────────────────────────
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-1-inbound',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Inbound to Lesha: Hatton Humphrey (Director of Technology Solutions) asked for the best route to set up a demo and conversation about the Global Payroll Platform — a couple of ESC''s clients are interested and she needs to understand what''s available. Kim Bartolotti cc''d.',
  '2026-07-13 15:59:00'
),
(
  'esc-2-lesha-intro',
  '001F000000w38ItIAI',
  'Lesha Cyphers',
  'partner',
  'Lesha introduced me to Hatton as the Global SME for questions and the demo.',
  '2026-07-14 16:03:00'
),
(
  'esc-3-hatton-availability',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Hatton''s reply: she wants a phone call first to discuss the platform and get a general understanding, then a system demo for a larger ESC team. Her availability this week (EDT): Wed 8:30–10a / 11a–2p / 3–4p, Thu 11:30a–2p, Fri 8:30a–12p.',
  '2026-07-14 16:30:00'
),
(
  'esc-4-precall-discovery',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'mine',
  'Sent the pre-call discovery note: framed the four-product family (Global Payroll = client''s own entities; EOR = no entity; Contractor Solutions = 1099; Talent = recruiting), and asked the four scoping questions (independent client companies? employees vs contractors? which countries? own entities or not?) so the intro call and team demo land on the right product. Holding the calendar until her answers come back — nothing scheduled yet.',
  '2026-07-14 18:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Hatton's discovery answers (added 7/14 pm — safe to re-run the whole file).
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-5-hatton-answers',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Discovery answers, same day: (1) yes — two independent client companies, both established to do business in Canada; (2) employees, with interest in understanding contractor capabilities; (3) Canada, specifically Ontario initially; (4) companies are active businesses in Canada — "We are not interested in EOR"; (5) ~300 headcount to start. Also specifically asked: additional platform, or functionality built into the current Prism platform?',
  '2026-07-14 20:30:00'
),
(
  'esc-6-pricing-gate',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'mine',
  'Confirmed pure Global Payroll deal (own Canadian entities, no EOR). Holding my reply until Aleks confirms our Canada per-employee payroll pricing and that it''s Listo product pricing — Teams note sent 7/14. Her platform question (built-in vs separate) is the easy part of the reply.',
  '2026-07-14 20:45:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Aleks' pricing answer + the Anthony outreach (added 7/14 eve — file stays
-- safe to re-run).
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-7-pricing-path',
  '001F000000w38ItIAI',
  'Aleks',
  'partner',
  'Aleks on the pricing question: "please reach out to Anthony and copy me. These are going to be individually priced based on country was our agreement." So: no list rates — Global Payroll is individually priced per country, quotes via Anthony Falzone (Head of Global Ops).',
  '2026-07-14 21:15:00'
),
(
  'esc-8-anthony-ask',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'mine',
  'Reached out to Anthony Falzone (copy Aleks) for the Canada quote: two ESC client companies, own entities, ~300 employees in Ontario to start, paid as employees. Reply to Hatton holds until the quote lands.',
  '2026-07-14 21:30:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Refresh the seeded ESC card with the confirmed scope (only touches the
-- seeded card id, so a hand-made card is never overwritten).
UPDATE "DashCard" SET
  "notes" = '{"discovery":"CONFIRMED pure Global Payroll (7/14 answers): two ESC client companies, both active businesses in Canada with their own entities; ~300 employees in Ontario to start; employees (contractor curiosity secondary); explicitly not EOR. Hatton''s open question: built into Prism or separate platform (answer: built in). Pricing path per Aleks: individually priced per country, no list rates — Canada quote requested 7/14 from Anthony Falzone (Head of Global Ops, cc Aleks). Reply to Hatton holds until it lands."}'::jsonb,
  "dealSize" = '2 ESC clients · Canada (Ontario) · ~300 EEs · pure Global Payroll',
  "updatedAt" = NOW()
WHERE "id" = 'seed-card-esc';

-- The 7/15 intro call with Hatton (added 7/15 — file stays safe to re-run).
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-9-intro-call',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Intro call 7/15 — the deal is structural, not one-off. ESC sits in Buffalo on the Canadian border. As a Prism PEO/ASO provider all their clients are US-based and every employee is treated as US-based; they run NO Canadian payroll and have no tech for international payroll or taxes. They TURN DOWN 4–5 companies a year — US companies with Canadian workers, or true Canadian companies. Named example: D''Youville College (bi-national university; Dir of Ops asked to pay at their Canadian location — taxes, banking). Current workaround for Canadian residents: list the college as the residence in Prism, require a US bank account, treat them like green-card holders. Another example: a long-time trucking client with a US office paying US drivers, plus a Canadian side ESC can''t touch. CORRECTION (7/15 pm): the ~300 employees are ONE STANDALONE ESC PROSPECT operating in Canada that wants ESC to run Canadian payroll for them — among the 3 true bi-national Canadian prospects ESC is holding.',
  '2026-07-15 15:30:00'
),
(
  'esc-10-intlemployee-fyi',
  '001F000000w38ItIAI',
  'C. Hatton Humphrey (ESC)',
  'partner',
  'Post-call FYI from Hatton: June 2026 PrismHR release notes (WSP-3980/3982/4043) add an "International Employee" field on Employee Details (service-provider-only INTLEMPLOYEE feature code) that waives the US resident address. IMPORTANT CLARITY FOR THE DEMO: that flag is an HR-record accommodation only — flagged employees CANNOT be processed in a payroll batch (finalization errors by design). It is not Global Payroll; actual multi-country processing is the PrismHR Global Payroll product. Hatton saw this and connected it to Global — the demo should draw the line explicitly.',
  '2026-07-15 16:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Intro call done → discovery closes, use-case shaping is live.
UPDATE "DashCard" SET
  "states" = '{"interested":"done","csm_seeded":"done","discovery":"done","use_case":"active"}'::jsonb,
  "notes" = '{"discovery":"CONFIRMED pure Global Payroll (7/14 answers + 7/15 intro call): ESC client prospects with their own Canadian entities, explicitly not EOR. The ~300 employees are one standalone Canadian-operating prospect that wants ESC to run their Canadian payroll (corrected 7/15 pm). Structural upside: ESC (Buffalo, border PEO) turns down 4–5 Canadian-adjacent companies a year — Global Payroll turns those from turn-downs into revenue.","use_case":"Bi-national Canada payroll for ESC''s client base. Named: D''Youville College (pay at their Canadian location — taxes, banking). Current workaround (college listed as residence, US bank account, green-card-holder treatment) is the urgency lever. Demo must separate the INTLEMPLOYEE record flag (no payroll processing) from Global Payroll (the actual product). Canada quote from Anthony Falzone gates pricing talk."}'::jsonb,
  "activated" = '{"discovery":"2026-07-14T18:00:00Z","use_case":"2026-07-15T15:30:00Z"}'::jsonb,
  "dealSize" = '~300-EE standalone CN prospect now · +4–5 turn-downs/yr channel upside',
  "updatedAt" = NOW()
WHERE "id" = 'seed-card-esc';

-- Anthony's pricing-thread reply (added 7/15 — file stays safe to re-run).
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'esc-12-pricing-thread',
  '001F000000w38ItIAI',
  'Anthony Falzone',
  'partner',
  'Pricing thread (Teams, 7/14 pm — Anthony + Aleks): Anthony asked retail or wholesale pricing → I asked for BOTH, for future reference, Canada first. Aleks asked what tech ESC uses today and whether this is a contract with ESC (ESC bills their client) or direct with the end client → confirmed: CONTRACT WITH ESC (channel/wholesale motion). Relayed ESC''s tech concern: additional platform vs built into current Prism — "they want to use our tech." (At that point: email exchange only, no call yet.)',
  '2026-07-14 21:22:00'
),
(
  'esc-11-anthony-mpex',
  '001F000000w38ItIAI',
  'Anthony Falzone',
  'partner',
  'Anthony (Teams, 7/15 am) on the Canada quote: "CAN is a bit nuanced because Vensure/Prism own local tech in CAN (MPEX). It is good from a cost standpoint because there are no 3rd parties, but we need to understand what they want from a technology standpoint." Owned Canadian payroll tech = cost-favorable, and his open question maps exactly to Hatton''s platform concern. Acknowledged 9:21 ("understood"); the tech-standpoint answer is in hand from the 7/15 discovery call (native-in-Prism; separate platform is the objection) — fold it into the next pricing-thread message. Freddie Ashby added to the thread with full history.',
  '2026-07-15 13:07:00'
)
ON CONFLICT ("id") DO NOTHING;

-- ESC is in motion — the rail reads it as a live conversation, not a pending
-- roundup. No-op if a disposition is already set.
INSERT INTO "AccountDisposition" ("id", "accountId", "status", "reason", "createdAt", "updatedAt") VALUES
(
  'seed-dispo-esc',
  '001F000000w38ItIAI',
  'motion',
  'Inbound 7/13 — Global demo request for interested ESC clients; pre-call discovery out, calendar holds until answers return',
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
  '{"discovery":"Inbound 7/13: demo request for the Global Payroll Platform on behalf of a couple of ESC''s interested clients. Pre-call discovery note sent 7/14 (entities vs EOR, employees vs contractors, countries) — calendar held until her answers land. Hatton wants a phone call first, then a system demo for a larger ESC team (she had offered Wed/Thu/Fri windows)."}'::jsonb,
  '{"discovery":"2026-07-14T18:00:00Z"}'::jsonb,
  '2 interested ESC clients · product TBD (Global Payroll vs EOR vs Contractor)',
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

-- ── Advocate Pay / SubcontractorHub: Bulgaria-first urgency (added 7/15) ────
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'advpay-bulgaria-12',
  'ADVOCATEPAY000001',
  'Advocate Pay / SubcontractorHub',
  'partner',
  'Urgency confirmed (7/15, via Bryce): the unsolved Bulgaria problem is costing SUBCONTRACTORHUB (Advocate Pay''s prospect; Advocate Pay is our ASO partner on Prism) dearly EVERY MONTH — Prism and Advocate Pay need the contract done NOW. Scope narrows to phase 1: the 12 workers in Bulgaria only, working back through the rest of the roster after. Sent the implementation timeline (keyed off signature date) with the Bulgaria intake list: signed agreements, roster (names/emails/roles/start dates), gross comp per person, terms (hours/remote/notice/benefits), clean 1099 end-dates for conversion, one comms point of contact.',
  '2026-07-15 17:30:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Bulgaria-first scope + urgency onto the seeded card (guarded to the seed id).
UPDATE "DashCard" SET
  "notes" = '{"decision":"CLIENT URGENCY (7/15, via Bryce): the unsolved problem costs SubcontractorHub (Advocate Pay''s prospect) dearly monthly — contract needs to close NOW. Phase 1 = the 12 Bulgaria workers only; rest of roster phases in behind. Implementation timeline + intake list sent 7/15. Contracts (final, client-shareable) in their hands since 7/10; deposit waived. Signature is the only gate.","use_case":"Bulgaria-first: 12 workers convert to W-2/EOR CORE via our Bulgarian entity; remaining international roster stays 1099, phased after Bulgaria proves the motion."}'::jsonb,
  "dealSize" = '12 Bulgaria EEs now (EOR CORE) · roster phases behind · deposit waived',
  "updatedAt" = NOW()
WHERE "id" = 'seed-card-advocatepay';

-- Internal tension on record (added 7/15 pm): client urgency vs. our readiness.
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'advpay-aleks-readiness',
  'ADVOCATEPAY000001',
  'Aleks',
  'note',
  'Context for the 7/15 ask to Aleks: she recently signaled we want them to WAIT — parts of our contracting apparatus were still in limbo (the founding VP of Sales for Global left before launch, and this motion landed in her lap). That posture now collides with client urgency (SubcontractorHub bleeding monthly, Bryce pressing to close). Sent Aleks the question + a theoretical implementation sample (Bulgaria, 12 EEs) so the answer starts from a straw man, not a blank page. The decision needed from her: are we ready to countersign and implement now — and if not, what can I promise Bryce today?',
  '2026-07-15 18:30:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Bryce call, 7/15 (video transcribed) — urgency, contracts, pricing pressure.
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'advpay-bryce-call-715',
  'ADVOCATEPAY000001',
  'Bryce Rowley (Advocate Pay)',
  'partner',
  'Call with Bryce 7/15 (video on file): SubcontractorHub''s principal is excited and wants to move — but is asking hard timing/implementation questions and needs a clear game plan. He told Bryce he will "solve this or find another way" (Remote-class alternatives on his radar) — the problem is a big monthly financial hit ("hole in the ship"). CONTRACTS: Bryce reviewed ours — nothing alarming; needs a couple hours + his attorney (1–2 days max); realistic signature Fri 7/17–Mon 7/21. Renee''s IP concern already addressed in the language. PRICING PRESSURE: Advocate Pay presented at $495/EE/mo (≈$71K/yr for the 12) with a Sept 1 go-live; client calls it "crazy expensive" vs Remote.com-class pricing; Bryce''s rule-of-40 point — three stacked margins ≈120% markup on core cost — and says Advocate Pay isn''t making much on it either. SAME-DAY COMMITMENTS: roadmap (bullets + timing per bullet, Bulgaria only) to Bryce before his 5p ET in-person client meeting; reconvene call 1:45 CT / 2:45 ET. Bryce asked for the shortest reasonable Bulgaria timeline assuming "Monday morning, let''s start." Note: Bryce hasn''t told the client we''re freshly rolling out — treat maturity questions carefully.',
  '2026-07-15 19:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Deal card: decision-stage picture per the 7/15 call.
UPDATE "DashCard" SET
  "notes" = '{"decision":"CLIENT URGENCY (7/15 call w/ Bryce, video on file): SubcontractorHub''s principal will solve it or go elsewhere (Remote-class alternatives); big monthly financial hit. Contracts: Bryce + attorney pass 1–2 days → target signature Fri 7/17–Mon 7/21. PRICING PRESSURE: $495/EE/mo presented (≈$71K/yr for 12), Sept 1 go-live in the proposal — client calls it expensive; the schedule is the retention play: signed Mon → first payroll on the August cycle, AHEAD of the quoted go-live. Roadmap delivered to Bryce 7/15 for his 5p client meeting.","use_case":"Bulgaria-first: 12 workers convert to W-2/EOR CORE via our Bulgarian entity; remaining international roster stays 1099, phased after Bulgaria proves the motion."}'::jsonb,
  "dealSize" = '12 Bulgaria EEs · ~$495/EE/mo (≈$71K/yr) · sign target 7/21 · Aug payroll',
  "updatedAt" = NOW()
WHERE "id" = 'seed-card-advocatepay';

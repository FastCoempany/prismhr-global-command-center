-- One-off seed: the Simploy / Chassie thread as dated, time-stamped account
-- notes (account id 001F000000w38BOIAY — Simploy, Lesha's book). Run once in
-- Supabase after the AccountNote table exists (docs/dashboard-tables.sql).
-- Timestamps: Chassie's inbound + Lesha's intro landed 7/8; the reply went out
-- 7/9 ~1pm CT (18:00 UTC). Safe to re-run (fixed ids, ON CONFLICT DO NOTHING).

INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'simploy-thread-1-chassie-inbound',
  '001F000000w38BOIAY',
  'Chassie (Simploy)',
  'partner',
  'Inbound after PrismHR LIVE: ~2 months into a project to select a global-workforce partner (EOR, contractor management, global payroll). Wants pricing/cost structure, full functionality + country coverage, implementation timeline/requirements, and how it integrates with their existing PrismHR setup — plus a demo ASAP. Hard date: 8/6 to finalize the partner and approach (not go-live). Also waiting on shipping info for the glasses she won at the conference.',
  '2026-07-08 15:00:00'
),
(
  'simploy-thread-2-lesha-intro',
  '001F000000w38BOIAY',
  'Lesha Cyphers',
  'partner',
  'Connected me with Chassie as the PrismHR Global SME — asked me to take her info and demo requests.',
  '2026-07-08 16:30:00'
),
(
  'simploy-thread-3-my-reply',
  '001F000000w38BOIAY',
  'Lesha Cyphers',
  'mine',
  'Replied to Chassie: sent the functionality/country-coverage and implementation docs; confirmed integration is built-in (Global appears as a new tab in their existing PrismHR — no integration work). Asked for the pricing inputs: which countries their people are in, EOR conversion headcount, and contractor counts to move onto the platform. Demo goes on the calendar as soon as she responds. 8/6 partner-decision deadline noted.',
  '2026-07-09 18:00:00'
)
ON CONFLICT ("id") DO NOTHING;

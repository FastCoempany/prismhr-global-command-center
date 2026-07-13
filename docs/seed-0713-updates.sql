-- One-off seed (7/13): the latest beats on two live threads, as dated account
-- notes. Run once in Supabase after docs/dashboard-tables.sql (and after
-- docs/seed-simploy-thread.sql for the earlier Simploy history). Safe to
-- re-run (fixed ids, ON CONFLICT DO NOTHING).
--
--  · Simploy (001F000000w38BOIAY): Chassie's discovery answers landed 7/9
--    4:02pm CT (21:02 UTC); the pricing package + call proposal went out 7/13.
--  · XCEL HR (001F000000w38GlIAI): Anika's read arrived 7/13 in the roundup
--    thread — new-product discussions post-LIVE, offer to join the next call.

INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'simploy-thread-1b-platform-preference',
  '001F000000w38BOIAY',
  'Chassie (Simploy)',
  'partner',
  'Key buying signal from her original inbound (7/8): she is actively evaluating potential partners for global workforce expansion, and told us directly that "having an integrated option through PrismHR would be ideal for us, assuming it''s competitive on both price and functionality." Translation: we are the preferred path — already on our platform, integration is zero-lift — and the decision comes down to price + functionality vs. the other providers she''s comparing.',
  '2026-07-08 15:05:00'
),
(
  'simploy-thread-4-chassie-discovery',
  '001F000000w38BOIAY',
  'Chassie (Simploy)',
  'partner',
  'Discovery answers from Chassie (COO): two internal independent contractors in India today, plus at least one client group with a contractor in India on another provider — a transition opportunity. Counts are small now, but the strategic goal is dual: build the capability to expand their own internal team internationally (simple, scalable, compliant) AND offer global workforce solutions to their clients as an expanded service. Her words: supporting both would be "a very compelling value proposition." Wants pricing and available options next.',
  '2026-07-09 21:02:00'
),
(
  'simploy-thread-5-pricing-sent',
  '001F000000w38BOIAY',
  'Lesha Cyphers',
  'mine',
  'Sent Chassie the pricing overview plus the newly released Global materials (launched today). Proposed a call for Monday 7/20 or Tuesday 7/21, 1–3p. Next: lock the call, then the demo.',
  '2026-07-13 16:30:00'
),
(
  'xcelhr-1-anika-read',
  '001F000000w38GlIAI',
  'Anika Steenstra',
  'partner',
  'Anika''s read (from the roundup thread): Xcel HR has been in discussions about a few new products since PrismHR LIVE. She''s happy to include me on the next call, though transparently not familiar with their aptitude for Global. Her main contact there is Bill (the book lists Ted Bross) and she''s sure he''d be open to hearing more. Next: take her up on the invite and ride the existing call.',
  '2026-07-13 16:45:00'
)
ON CONFLICT ("id") DO NOTHING;

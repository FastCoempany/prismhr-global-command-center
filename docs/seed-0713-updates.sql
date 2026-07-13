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
),
-- Advocate Pay / SubcontractorHub — the live EOR deal, beat by beat.
(
  'advocatepay-1-roster',
  'ADVOCATEPAY000001',
  'Jessica Brach (SubcontractorHub)',
  'partner',
  'SubcontractorHub''s international employee roster received (via Bryce): the Frontier group in Bulgaria is the primary focus for W-2 (EOR conversion); the remaining international workers can be classified as 1099. Contacts on their side: Jessica Brach (EVP Treasury), Renee Surratt, Justin Brach, Nate Price.',
  '2026-07-01 17:43:00'
),
(
  'advocatepay-2-shane-terms',
  'ADVOCATEPAY000001',
  'Shane Jacobs',
  'partner',
  'Shane''s ground rules after the SubcontractorHub call: proposal is EOR CORE (no recruiting/SOLVO); deposit on the EOR employees is waived; Vensure Global collateral shared as interim talking points (Prism Global versions coming in a week or two). Shane OOO 7/10–7/20 — I run point from here.',
  '2026-07-08 00:07:00'
),
(
  'advocatepay-3-pricing-sent',
  'ADVOCATEPAY000001',
  'Bryce (Advocate Pay)',
  'mine',
  'Pricing sent to Bryce for the SubcontractorHub EOR CORE proposal (Bulgaria W-2 conversions + 1099 balance). Awaiting their reaction.',
  '2026-07-08 14:30:00'
),
(
  'advocatepay-4-contracts-sent',
  'ADVOCATEPAY000001',
  'Bryce (Advocate Pay)',
  'mine',
  'Contracts sent to Bryce + Andy Aziz (Service-Provider-to-SMB template + PrismHR Global Terms), with the IP-protection walkthrough Renee asked for: Section 3(a)(v) — all work product by assigned employees vests in the client, with an irrevocable-assignment backstop where local law doesn''t auto-vest; Section 5 — confidentiality survives 3 years, trade secrets as long as they qualify; Section 9 — platform license doesn''t touch ownership. Offered to loop in mutual counsel. Standing by on pricing reaction.',
  '2026-07-10 13:42:00'
),
(
  'advocatepay-5-final-confirmed',
  'ADVOCATEPAY000001',
  'Bryce (Advocate Pay)',
  'mine',
  'Bryce asked whether the contracts are drafts or final (7/10) — confirmed to Bryce + Andy that they are FINAL and can be shared with the client. SubcontractorHub can review directly. Next: their reaction to pricing + contracts, then signature and Bulgaria onboarding.',
  '2026-07-13 18:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Advocate Pay is formally in motion — the rail stops asking for a roundup and
-- reads it as a live conversation instead. No-op if a disposition already set.
INSERT INTO "AccountDisposition" ("id", "accountId", "status", "reason", "createdAt", "updatedAt") VALUES
(
  'seed-dispo-advocatepay',
  'ADVOCATEPAY000001',
  'motion',
  'SubcontractorHub EOR deal live — pricing + contracts out, running point while Shane is OOO',
  '2026-07-13 18:00:00',
  '2026-07-13 18:00:00'
)
ON CONFLICT ("accountId") DO NOTHING;

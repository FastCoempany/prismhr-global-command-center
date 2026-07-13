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

-- Premier Payroll & HR Solutions — John's intel (Teams, 7/10): acquired by
-- Vensure 9/2025, absorbed + managed by Vensure entirely, ExecuPay customer.
-- Out of our channel motion.
INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'premier-1-vensure-acquired',
  '001Pb00000MLcjtIAD',
  'John Hebert',
  'partner',
  'John (Teams): Premier Payroll was acquired by Vensure in September 2025 — anything they do goes through Vensure. Vensure-acquired PEOs are typically fully absorbed within ~2 months, at which point Vensure has full authority; John doesn''t have conversations with these entities (they work with Vensure Success, Support, and Services). Premier is also an ExecuPay customer — "a whole different ball of wax" under Vensure. His broader warning: "Vensure is like a vacuum sucking up other customers regularly" — expect to see this again.',
  '2026-07-10 15:45:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Dispositions: Advocate Pay is formally in motion (live deal); Premier
-- Payroll is out of the book (Vensure''s now). No-op if already set.
INSERT INTO "AccountDisposition" ("id", "accountId", "status", "reason", "createdAt", "updatedAt") VALUES
(
  'seed-dispo-advocatepay',
  'ADVOCATEPAY000001',
  'motion',
  'SubcontractorHub EOR deal live — pricing + contracts out, running point while Shane is OOO',
  '2026-07-13 18:00:00',
  '2026-07-13 18:00:00'
),
(
  'seed-dispo-premier',
  '001Pb00000MLcjtIAD',
  'not-mine',
  'Acquired by Vensure 9/2025 — fully absorbed, managed by Vensure Success/Support/Services; ExecuPay customer. Per John Hebert, 7/10.',
  '2026-07-10 15:50:00',
  '2026-07-10 15:50:00'
)
ON CONFLICT ("accountId") DO NOTHING;

-- Roundup threads that actually went out (so the rail reflects reality).
-- John (7/10, Teams): sent the one-account Premier roundup; he replied with
-- the Vensure disqualification and the thread is closed — seeded ARCHIVED so
-- his card resets to a fresh roundup from his remaining (HCM) accounts, with
-- the whole exchange kept in history.
INSERT INTO "Touch" ("id", "subjectKey", "kind", "label", "detail", "message", "contactedAt", "followUpAt", "intervalDays", "status", "log", "updatedAt") VALUES
(
  'seed-touch-john-0710',
  'partner-outreach:John Hebert',
  'partner',
  'John Hebert',
  '1 account teed up',
  'Hi John — as I work through my set of the PrismHR Global leads assigned to me, I pulled one of your accounts I''d love your read on for global-hiring potential:

• Premier Payroll & HR Solutions — No specific global-hiring signal has surfaced yet, but the account profile fits the kind of company that runs into cross-border needs. Worth a quick gauge of where they hire and how they pay international workers before we decide whether to work it or set it aside.

Not urgent, and I don''t want to get ahead of any of your relationships — I''m really just trying to find where there might be a global opening worth a conversation.

A quick "yes / no / not yet" would help me prioritize. Thanks so much!

Looking forward to winning some business together!',
  '2026-07-10 15:18:00',
  '2026-07-13 15:18:00',
  1,
  'archived',
  '[{"at":"2026-07-10T15:35:00Z","body":"Reply received ✓ — John: Premier Payroll was acquired by Vensure in September 2025; anything they do would need to go through Vensure."},{"at":"2026-07-10T15:45:00Z","body":"John, two more: (1) Vensure-acquired PEOs are fully absorbed within ~2 months — Vensure has full authority and John doesn''t engage them (Vensure Success/Support/Services do). (2) Premier is an ExecuPay customer — a whole different ball of wax under Vensure."},{"at":"2026-07-10T15:51:00Z","body":"Closed the loop — Premier is out of our wheelhouse. John: expect this again; Vensure is a vacuum sucking up customers regularly. Thread archived ✓"}]'::jsonb,
  '2026-07-10 15:51:00'
),
-- Whitney (7/13, after the 10a meet-and-greet): 4-account roundup sent; she
-- replied — will keep it in mind as she connects with these clients (no formal
-- meetings yet; more to follow). Seeded REPLIED — your move.
(
  'seed-touch-whitney-0713',
  'partner-outreach:Whitney Dideon',
  'partner',
  'Whitney Dideon',
  '4 accounts teed up',
  'as promised

• Cornerstone Capital Group, Inc — No specific global-hiring signal has surfaced yet, but the account profile fits the kind of company that runs into cross-border needs. Worth a quick gauge of where they hire and how they pay international workers before we decide whether to work it or set it aside.

• PES Payroll — No specific global-hiring signal has surfaced yet, but the account profile fits the kind of company that runs into cross-border needs. Worth a quick gauge of where they hire and how they pay international workers before we decide whether to work it or set it aside.

• Accent Employer Solutions Inc. — No specific global-hiring signal has surfaced yet, but the account profile fits the kind of company that runs into cross-border needs. Worth a quick gauge of where they hire and how they pay international workers before we decide whether to work it or set it aside.

• HR Pulse Inc. d/b/a Bay Staffing Solutions — No specific global-hiring signal has surfaced yet, but the account profile fits the kind of company that runs into cross-border needs. Worth a quick gauge of where they hire and how they pay international workers before we decide whether to work it or set it aside.

None of these are urgent, and I don''t want to get ahead of any of your relationships — I''m really just trying to find where there might be a global opening worth a conversation.

A quick "yes / no / not yet" on each would help me prioritize. Thanks so much!

Looking forward to winning some business together!',
  '2026-07-13 15:05:00',
  '2026-07-14 15:05:00',
  1,
  'replied',
  '[{"at":"2026-07-13T16:00:00Z","body":"Reply received ✓ — Whitney: \"I will keep this in mind as I connect with these clients but have not yet had formal meeting with any of these. More to follow once I get to know them.\""}]'::jsonb,
  '2026-07-13 16:00:00'
)
ON CONFLICT ("subjectKey") DO NOTHING;

-- Partner-room context notes.
INSERT INTO "PartnerNote" ("id", "partner", "body", "source", "createdAt") VALUES
(
  'seed-pn-whitney-meet',
  'Whitney Dideon',
  'Meet-and-greet (10a): Whitney is the incoming Regional VP of HCM — only ~3 weeks in seat. She hasn''t had formal meetings with her accounts yet; she''ll gauge global-hiring potential as she connects with each client and circle back. Roundup delivered as promised during the meet.',
  'today',
  '2026-07-13 16:05:00'
),
(
  'seed-pn-john-vensure',
  'John Hebert',
  'Working note from the Premier Payroll exchange: Vensure regularly acquires customers out of the book ("like a vacuum"). When an account turns out to be Vensure-acquired, it''s fully out of our channel motion within ~2 months — mark it not-mine and move on. Worth periodically checking the book against Vensure''s acquisition list.',
  'today',
  '2026-07-10 15:55:00'
)
ON CONFLICT ("id") DO NOTHING;

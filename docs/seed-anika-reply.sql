-- One-off seed: Anika's reply to the roundup (received 7/9), captured as dated
-- per-account "partner said" notes so her intel lives on each account and feeds
-- the drafting desk. Run once in Supabase after docs/dashboard-tables.sql.
-- Safe to re-run (fixed ids, ON CONFLICT DO NOTHING). After running, click
-- "They replied ✓" on Anika's card on Today to advance the thread.

INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'anika-reply-1-infiniti',
  '001F000000w38OIIAY',
  'Anika Steenstra',
  'partner',
  'Good relationship with Infiniti — working to schedule an on-site Strategic Business Review early fall. Has monthly calls and offered to add me to the next one to discuss Global. Their Prism agreement renewed 8/1 — already locked for next year.',
  '2026-07-09 21:00:00'
),
(
  'anika-reply-2-nextep',
  '001F000000w38OpIAI',
  'Anika Steenstra',
  'partner',
  'GREAT relationship with Nextep — bi-weekly calls; just attended their sales rally in Dallas. Offered to add me to the next call to discuss Global. Growing fast: goal is 40,000 WSEs by next year. On a 3-year Prism deal — does not renew until 9/1/2028. She flags this as a good account to get in front of.',
  '2026-07-09 21:00:00'
),
(
  'anika-reply-3-genesis',
  '001F000000w38JqIAI',
  'Anika Steenstra',
  'partner',
  'Genesis is a child account / acquisition of Engage PEO — no direct Genesis contacts; everything routes through Engage (her main contact there is Chris). She will ask for insight on their Engage call Thursday and report back whether Genesis is worth a conversation.',
  '2026-07-09 21:00:00'
),
(
  'anika-reply-4-eemployers',
  '001F000000w38OsIAI',
  'Anika Steenstra',
  'partner',
  'Pretty good relationship; the account has decent momentum right now. Unsure of their Global appetite but happy to add me to her next call with them to gauge interest.',
  '2026-07-09 21:00:00'
),
(
  'anika-reply-5-onepoint',
  '001F000000w38ETIAY',
  'Anika Steenstra',
  'partner',
  'Newer account to her — they have not been open to regular calls yet, so little direction available. Will add me if she gets something scheduled; if I reach out and schedule something directly, she asked to be included.',
  '2026-07-09 21:00:00'
)
ON CONFLICT ("id") DO NOTHING;

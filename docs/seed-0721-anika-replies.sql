-- One-off seed (7/21): Anika's written replies to the account roundup — her
-- read on five accounts, stored as partner-said notes so every surface
-- (Today, chip popovers, Account Room) carries them. Safe to re-run
-- (fixed ids, ON CONFLICT DO NOTHING).

INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'anika-0721-infiniti',
  '001F000000w38OIIAY',
  'Anika Steenstra',
  'partner',
  'Anika: good relationship with Infiniti — working to schedule an on-site Strategic Business Review early fall. Monthly calls; happy to add me to the next one to discuss Global. Their Prism agreement renews 8/1, so they are already renewed for next year.',
  '2026-07-21 10:00:00'
),
(
  'anika-0721-nextep',
  '001F000000w38OpIAI',
  'Anika Steenstra',
  'partner',
  'Anika: GREAT relationship with Nextep — bi-weekly calls, just attended their sales rally in Dallas. Happy to add me to the next call to discuss Global; good account to get in front of — growing like crazy (goal: 40,000 WSEs by next year). On a 3-year deal; does not renew with Prism until 9/1/2028.',
  '2026-07-21 10:01:00'
),
(
  'anika-0721-genesis',
  '001F000000w38JqIAI',
  'Anika Steenstra',
  'partner',
  'Anika: Genesis is a child account/acquisition of Engage PEO. No direct Genesis contacts — Chris at Engage is the main contact. She''ll ask for more insight on her Thursday Engage call and report whether Genesis is worth a conversation.',
  '2026-07-21 10:02:00'
),
(
  'anika-0721-eemployers',
  '001F000000w38OsIAI',
  'Anika Steenstra',
  'partner',
  'Anika: pretty good relationship with eEmployers and decent momentum right now. Unsure of their Global appetite, but happy to add me to her next call to see if there''s future interest.',
  '2026-07-21 10:03:00'
),
(
  'anika-0721-onepoint',
  '001F000000w38ETIAY',
  'Anika Steenstra',
  'partner',
  'Anika: OnePoint is newer to her and not open to regular calls yet — can''t give much direction. Will include me if she gets something scheduled; if I reach out and book something, she wants to be included.',
  '2026-07-21 10:04:00'
)
ON CONFLICT ("id") DO NOTHING;

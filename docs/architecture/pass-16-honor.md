---
title: Pass 16 — the five left on honor
status: Shipped 2026-10-09
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-15-honor.md
  - tests/browser/click-depth.test.ts
  - tests/helpers/page-render.ts
---

# Pass 16 — the five left on honor

Pass 15 left five rows on honor: the four click-depth rows and the ship pattern. Pass 16 took the click-depth sweep to every page the app serves and to every kind of compression the law names, and moved the four. One row stays.

## 1. What moved

| Row | Decree | Now | Pin | What it took |
|---|---|---|---|---|
| A5.1 | "Every compression opens." | chain | tests/browser/click-depth.test.ts › "A5.1 to A5.4 · every count on every mounted face is a door, and no fold opens uninvited" (18); › "A5.1 to A5.4 · every page the harness cannot mount is swept from its server render (pass 16)" (7); › "the doors pass 11 opened each reach their evidence in one click" (3) | §2 and §3. |
| A5.2 | "every shortened thing on every surface is a door to its evidence, exactly one click deep" | chain | as A5.1 | §2 and §3. |
| A5.3 | "Nothing compressed is ever a dead end" | chain | as A5.1 | §2 and §3. |
| A5.4 | "nothing deep ever surfaces uninvited" | chain | as A5.1: every face and page is read for an open fold on arrival; tests/browser/budgets.test.ts holds the arrival budgets of all twenty-five | §2 and §3. |

## 2. Every page

The browser harness mounts client faces; eighteen are mounted. Seven pages are server components that read the store and could not be mounted: asks, partners, archive, demos, the Intranet's health and pastes pages, and login. tests/helpers/page-render.ts renders each under node as the server would, with the session resolved to a signed-in operator (page-hooks.mjs and fake-auth.mjs, registered by this helper alone) and the Prisma client, which src/lib/db.ts caches on the global, set to a fake that holds a few rows per table. The markup is handed to the browser as a static page with every CSS module's sheet, and the same sweep runs over it. Login is read with the gate shut, as a visitor sees it.

The seven pages join the click-depth sweep, the budget ratchet and the palette sweep. Twenty-five surfaces, every page the app serves.

## 3. Every kind of compression

The law names four: "a two-word term, a count, a theme, an abbreviation". The sweep read counts since pass 11 and abbreviations since pass 13. It reads the short mono-caps terms now: a kicker, a chip, a two-word term, set the way the design canon sets a compression (JetBrains Mono, letterspaced uppercase), one to three words. Each is a door, or sits by its door, or is on LABELS with its reason, or it fails. A clock or a day is a moment, not a term. The labels, each a kicker that names something rather than compressing it: the clock's zone, the Klaxon's band name, the record register's scope kicker, the Sendbook's column heads and day divider, a touch's channel and ordinal, the demo's branch labels, the desk clock's kicker, and MULTI on Groundwork, whose expansion is the people chips beside it.

What the sweep still cannot read is a compression set in body type. The design canon sets none that way, and one built that way would be the canon's break before it was this sweep's.

## 4. What the wider sweep found

Two breaks, fixed:

1. **A parenthetical on the Archive page.** Its section heads read "Done notes (1)" and "Matches for “q” (3)". The writing canon bans parentheticals in operator copy. They read "Done notes · 1" and "Matches for “q” · 3".
2. **Nothing else on the seven pages.** The health page's one-line count opens in the panels beneath it, the asks page's figures are the operator's own question and a price-desk answer, and the archive's heads count the rows in view beneath them; each is a named exemption with its reason.

## 5. What stays, and why

| Row | Pin | Why it stays |
|---|---|---|
| A11.6 | partial · the verify chain's order is pinned (tests/canon/standing-decrees.test.ts) | "A `claude/` branch → PR → Vercel CI green → squash merge" is process outside the code. No test in the repo can see a branch, a PR or a merge. |

## 6. The scoreboard after

| | Before pass 16 | After |
|---|---|---|
| Honor-system decrees (111) | 5 honor · 104 chain · 2 retired | 1 honor · 108 chain · 2 retired |
| Of the honor rows, with partial pins | 5 | 1 |

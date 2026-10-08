---
title: Pass 11 Browser
status: Pass 11, 2026-10-08. The 46 honor rows left after pass 10, worked with a real browser in the verify chain; merged as #392.
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-10-verification.md
---

# Pass 11 Browser

On 2026-10-08 the founder ordered: "run a pass 11 on the 46 left on honor."

Pass 10 had checked every one of the 46 and found them holding. What kept them on honor was that no test could reach them. Most are CSS, a hover, or a click, which a server render cannot read. The rest are app-wide laws or process rules.

## 1. The browser

`tests/helpers/browser.ts` bundles a fixture with esbuild and mounts it in the headless Chromium the container ships. It works like this:

- **Stylesheets.** The page gets the app's own stylesheets: the tokens, the global sheet, and every CSS module, each scoped to its file the way Next scopes it.
- **Server actions.** Each one is stubbed and records its call, so a test reads what a click asked the server to do.
- **Page GETs.** The page's own requests, such as the evidence route, are answered and logged.
- **Fixed state.** The clock and localStorage can be set per test.

Ten suites run under `tests/browser` (58 tests), and all of them are in `package.json` `test`, so they run in the verify chain. To show the suites read the real CSS, flipping the chip's orange tick to blue fails its test. The suites ran green three times in a row.

Three faces were refactored so the browser can mount what the pages paint. None of the refactors changes behavior:

- `src/app/room/face.tsx` (RoomFace) holds the HomeRoom's frame.
- `CsmPrep` holds the roundup brief's folded prep.
- `MultiBadge` holds Groundwork's MULTI badge.

## 2. What moved

32 rows move to chain. Their pins measure, click and hover in the browser, or they are structural pins across all of `src`:

- **A2.4, the derived-fact gate.** Each function that derives the relationship, the people, whose move it is, the owed lines or the last human touch can be called only from the account read or a named adapter. A new caller fails the build. Every `readOutcome` call reads the board card, the outcome stamp's only store.
- **A4.30.** Only the evidence route reads staged bodies out of the store. Groundwork's slice reads go only through head-only builders, and each builder is shown to drop the body.
- **A6.11.** No concept, variant or scratch route is served. No mockup sits in `public/`, nothing imports from `docs/`, and no rewrite reaches past the app.
- **A12.6.** Every held-box choice and the Chute's own line keep to six words a sentence.

## 3. What the browser found, and what was fixed

The click-depth sweep reads every visible number on eight mounted faces. Each number must be a door, name a moment, share its line with its door, or fall under a named exemption. The sweep found four dead ends:

1. **The sheet's fit score** now opens the drilldown with the score's parts unfolded.
2. **The sheet's demand score** now opens the research read.
3. **A Groundwork stamp's channel line** ("EMAIL · STEP 1 · PAT E.") shortened a name and opened nothing. It now opens to the name in full and the touch's own words.
4. **The Intranet receipt's "N messages"** now opens the messages the capture became.

Two copy faults were also fixed: two quiet-flag titles read "It informs; it never blocks.", and both now say it flat.

Two pins were rewritten to follow the refactors:
- `tests/ingest-hooks.test.ts` › "the page mounts the Chute once, first in main, above the board" now reads `RoomFace`.
- `tests/canon/standing-decrees.test.ts` › "every surface that paints MULTI reads the one ladder" now follows the badge into the face.

## 4. What stays, and why

Fourteen rows stay on honor:

- **A5.1 to A5.4.** The sweep covers the eight faces the suite mounts, and only compressions that contain a digit.
- **A4.27.** The browser drills Groundwork, the sheet, the lane and THEIRS. The draft desk's cited line, the Playbook's draft queue and the readout are not mounted.
- **A4.31.** The budget ratchet measures five faces.
- **A4.1.** It is a law over every law of the first record.
- **A2.8.** The derived-fact gate catches a narrow read on a new surface, but ten routes carry no recorded audit: asks, demos, intranet/health, intranet/pastes, login, payroll-demo-sidekick, pricing, sidekick, sidekick-v3, sidekick/flows.
- **A11.6.** The verify chain is pinned. The branch, PR, CI and squash steps are process.
- **A12.1, A12.10 and A12.12.** Each carries a lint pin, but the rest of the rule is a judgment of wording.
- **A6.12 (process) and A12.3 (judgment)** have no pin.

Found but not fixed, because it is beyond these rows: 117 distinct hex colors outside the brand's eight, used 237 times across the CSS modules (for example #b6791a, #166534 and #7a4b00; many are tints a token could carry). The design canon allows the brand's palette only, and that needs its own pass.

## 5. The scoreboard after

| | Before pass 11 | After |
|---|---|---|
| Honor-system decrees (111) | 46 honor · 63 chain · 2 retired | 14 honor · 95 chain · 2 retired |
| Of the honor rows, with partial pins | 40 | 12 |

The chain runs 2320 tests.

## 6. Every row

| Row | Section | Status now | Pin | Note |
|---|---|---|---|---|
| A1.1 | The Chute | chain | tests/browser/room.test.ts › "the Chute is the frame's first child, above every row; each row's Drop is its own, and no other intake exists"; tests/ingest-hooks.test.ts › "the page mounts the Chute once, first in main, above the board" +1 | The page renders RoomFace; the browser mounts it. |
| A1.3 | The Chute | chain | tests/browser/chute.test.ts › "a dropped email is read in the browser and routed at once, with its words" +1; tests/ingest-hooks.test.ts › "the line starts the first three reads the moment they are handed over" +2 | A real drop event carrying real files. |
| A2.4 | The Ted doctrine | chain | tests/canon/ted-doctrine.test.ts › "every derived fact comes from the account read or a named adapter (A2.4, whole scope)" (7); with the per-surface pins of pass 10 | The caller gate: a new narrow reader fails the build. |
| A2.8 | The Ted doctrine | honor · partial | tests/canon/ted-doctrine.test.ts › "every derived fact comes from the account read or a named adapter (A2.4, whole scope)" | The gate stops a new surface deriving a fact narrowly; ten routes carry no recorded audit (asks, demos, intranet/health, intranet/pastes, login, payroll-demo-sidekick, pricing, sidekick, sidekick-v3, sidekick/flows). |
| A4.1 | The second record, the meat law, the vehicle rule | honor · partial | tests/canon/ted-doctrine.test.ts › the A2.4 gate; tests/second-record-faces.test.ts › "staged bodies leave the store by the evidence route alone (A4.30, whole scope)" +1; and the pass 10 pins | A law over every law of the first record; each law has its own pin, the whole is not one test. |
| A4.16 | The second record, the meat law, the vehicle rule | chain | tests/browser/evidence.test.ts › "the row sits under the reason line, every chip a mono button, nothing open on arrival" +4 |  |
| A4.19 | The second record, the meat law, the vehicle rule | chain | tests/browser/accounts.test.ts › "the three columns hold more width than the three before them" +1 |  |
| A4.20 | The second record, the meat law, the vehicle rule | chain | tests/browser/room.test.ts › "THEIRS is blue, mono, one line, above UNKNOWN; the move sits above it" | The move's seat is measured against a row with no THEIRS line. |
| A4.23 | The second record, the meat law, the vehicle rule | chain | tests/browser/prep.test.ts › "folded on arrival, its kicker the real count; open, each row a door to its excerpt; none, no fold"; tests/second-record-faces.test.ts › "the CSM's own last rows lead with what happened, not a due date" | The fold is a face (CsmPrep). |
| A4.27 | The second record, the meat law, the vehicle rule | honor · partial | tests/browser/evidence.test.ts › "every citation, theme, count and case drills to row-level meat" (4); tests/browser/accounts.test.ts › "THE SIGNAL's cite opens its excerpt; LAST HUMAN TOUCH opens the entry it read"; tests/browser/room.test.ts › "THEIRS opens its gem; the cite opens the email it stands on" | Drilled in the browser on Groundwork, the sheet, the lane and THEIRS; the draft desk's cited line, the Playbook's draft queue and the readout are not mounted. |
| A4.30 | The second record, the meat law, the vehicle rule | chain | tests/second-record-faces.test.ts › "only the route, the activity library and Groundwork's page read a slice" +1; › "the route answers GET and nothing else" +2 |  |
| A4.31 | The second record, the meat law, the vehicle rule | honor · partial | tests/browser/budgets.test.ts › "A4.31 · arrival budgets never grow" (6) | A ratchet over five faces (budgets.json); faces not mounted are not measured. |
| A5.1 | The click-depth law | honor · partial | tests/browser/click-depth.test.ts › "A5.1 to A5.4 · every count on every mounted face is a door, and no fold opens uninvited" (8) +3 | The sweep reads every visible number on eight mounted faces; a compression with no digit, and the unmounted faces, stay outside it. |
| A5.2 | The click-depth law | honor · partial | as A5.1 |  |
| A5.3 | The click-depth law | honor · partial | as A5.1 |  |
| A5.4 | The click-depth law | honor · partial | tests/browser/click-depth.test.ts › the A5 sweep (no fold open on arrival, eight faces); tests/browser/budgets.test.ts |  |
| A6.1 | The Spring | chain | tests/browser/room.test.ts › "UNKNOWN, COMPARABLE and TODAY each take one line, and a long top entry trails off inside it"; tests/canon/spring.test.ts › the A6.1 block (6) |  |
| A6.3 | The Spring | chain | tests/browser/room.test.ts › "a line composed on the Drop lands in an open TODAY" +1; tests/today-register.test.ts › "every receipt enters through a door, and both doors spring TODAY" +2 |  |
| A6.6 | The Spring | chain | tests/browser/room.test.ts › "the ✕ rests invisible and shows when its ask is hovered"; tests/canon/spring.test.ts › "each control is its glyph alone, tooltip-titled, wherever its register paints it" +3 |  |
| A6.11 | The Spring | chain | tests/canon/standing-decrees.test.ts › "no route is named for a concept, a variant, a mockup or a scratch surface" +1 | The code half: nothing concept is served; the ship order is A6.12. |
| A6.12 | The Spring | honor | — (process: every face PR carries a recorded order; #260 and #309 ratified 2026-10-08) | Process. |
| A7.3 | The Scratchpaper | chain | tests/browser/scratchpad.test.ts › "the ✎ sits in the bottom-right corner, holds it on scroll, and opens one pad" |  |
| A8.1 | The Act Lane | chain | tests/browser/accounts.test.ts › "the chip's left edge is a 3px orange tick, and its other edges are not" |  |
| A8.2 | The Act Lane | chain | tests/browser/accounts.test.ts › "the source line sits beneath the act, smaller, mono and quiet" |  |
| A8.6 | The Act Lane | chain | tests/browser/accounts.test.ts › "a click opens the lane on the act, to the right of the sheet, and it holds while the sheet scrolls" |  |
| A8.7 | The Act Lane | chain | tests/browser/accounts.test.ts › "a cite in the lane drills to its cleaned excerpt from the evidence route, and folds back" |  |
| A8.21 | The Act Lane | chain | tests/browser/accounts.test.ts › "one mono door at the sheet's top-right shoulder, quiet at rest, lit and named while a filter is live" |  |
| A8.22 | The Act Lane | chain | tests/browser/accounts.test.ts › "no sort control anywhere; a click on a title re-sorts the sheet" |  |
| A8.24 | The Act Lane | chain | tests/browser/accounts.test.ts › "the count sits in the Account title; ⧉ and ⇩ sit on the h1's line; the search is raised" |  |
| A9.2 | Groundwork face | chain | tests/browser/groundwork.test.ts › "done is the left wing, waiting the right, the stage between them" |  |
| A9.3 | Groundwork face | chain | tests/browser/groundwork.test.ts › "solid amber burns today, half amber is this week, quiet ink keeps" |  |
| A9.4 | Groundwork face | chain | tests/browser/groundwork.test.ts › "the trigger sits beneath its name, smaller and quieter" |  |
| A9.5 | Groundwork face | chain | tests/browser/groundwork.test.ts › "A9.5 · the serif verb runs the masthead's left, the orange count its right" |  |
| A9.6 | Groundwork face | chain | tests/browser/groundwork.test.ts › "A9.6 · the burn bar spans the masthead and drains as the window empties" |  |
| A9.7 | Groundwork face | chain | tests/browser/groundwork.test.ts › "A9.7 · inside the last five minutes the count and the bar turn red and throb; reduced motion keeps the red" |  |
| A10.20 | The Sendbook | chain | tests/browser/groundwork.test.ts › "the ↺ rests hidden and shows when the stamp is hovered"; tests/canon/sendbook.test.ts › the A10.20 block (4) |  |
| A11.2 | Other standing decrees | chain | tests/browser/links.test.ts › "A11.2 · account names are plain links on every face" (4); tests/canon/standing-decrees.test.ts › the A11.2 sweep (3) |  |
| A11.3 | Other standing decrees | chain | tests/browser/room.test.ts › "each tone in its color, the card shut at rest, open on a click and on a hover"; tests/browser/prep.test.ts › "one thread red, two amber, three or more green; no badge when no one is on file" |  |
| A11.4 | Other standing decrees | chain | tests/browser/room.test.ts › "Roundups · Check-ins rests thin in quiet ink and lifts to ink only on hover" |  |
| A11.6 | Other standing decrees | honor · partial | tests/canon/standing-decrees.test.ts › "prettier, tsc, eslint with no warnings, the tests, the build" +1 | Process: the branch, the PR, CI and the squash. |
| A12.1 | The writing canon and plain-speech law on the ingest surfaces | honor · partial | tests/ingest-faces.test.ts › the A12 sweep | Mood is judgment beyond the noun-form guard. |
| A12.3 | The writing canon and plain-speech law on the ingest surfaces | honor | — (existing partial: tests/ingest-guard.test.ts › "the sanitizer: …") | Judgment. |
| A12.6 | The writing canon and plain-speech law on the ingest surfaces | chain | tests/ingest-faces.test.ts › "every choice the held box offers, with a long and a short account name" +1; tests/ingest-guard.test.ts (the held reason's nine-word cap) |  |
| A12.7 | The writing canon and plain-speech law on the ingest surfaces | chain | tests/browser/room.test.ts › "a held question kept on 10/7 returns on 10/8 in the held box with Held since 10/7."; tests/ingest-faces.test.ts › the A12.7 blocks (5) |  |
| A12.10 | The writing canon and plain-speech law on the ingest surfaces | honor · partial | tests/ingest-faces.test.ts › the A12 sweep | The lint knows the decree's example; property-talk is judgment. |
| A12.12 | The writing canon and plain-speech law on the ingest surfaces | honor · partial | tests/ingest-faces.test.ts › the A12 sweep | Constructed phrasing is judgment. |

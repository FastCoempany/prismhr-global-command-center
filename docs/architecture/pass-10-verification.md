---
title: Pass 10 Verification
status: Pass 10, 2026-10-08. Every honor-system row on the scoreboard checked against the code, one by one; merged as #384 to #389.
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-9-fixes.md
---

# Pass 10 Verification

On 2026-10-08 the founder ordered: "fix that number, write tests for the 23 logic rules (they need no browser), and run a row-by-row check of the remaining 82 so 'none broken' becomes a verified statement instead of an absence of reports."

Pass 10 checked all 83 rows still on the scoreboard's list (82 honor and A1.8, the one text pin) against the code, in five slices by area. Each row got a verdict from reading the code on every surface in its scope and, where it settles the question, a server render of the component. Every row a test can call now has a test in the verify chain.

The number is fixed too: docs/architecture/pass-9-fixes.md said thirteen of the honor rows carried partial pins. The scoreboard showed twenty.

## 1. What it found

| Verdict | Rows |
|---|---|
| holds | 64 |
| broken, now fixed | 14 (A8.5 by the ship order of 2026-10-08) |
| broken, open | 0 |
| process: no code can show it | 5 (A2.8, A4.31, A6.11, A6.12, A11.6) |

"None broken" is now a checked statement. A8.5, the one break that needed a ship order, shipped on the founder's order the same day (#391). The thirteen breaks were real, and each one was fixed with a test that fails on the old code:

- **A2.4 and A4.1, the Ted doctrine and the second record.** Four surfaces read one record or no roster:
  - the draft desk's "Last touched" line read the export alone;
  - the Partners desk could name a colleague as the relationship;
  - the contacts roster read the newest 400 rows under one id;
  - the readout's "verified cold on both records" counted the export alone.
  All four fixed (#385, #388).
- **A4.23.** The stage-row fold re-sorted rows dated ahead back to the top, and the CSM prep could take a due-dated row. Both fixed (#385, #388).
- **A5.1 to A5.3, the click-depth law.** Sixteen counts and marks were dead ends; each now opens one click deep:
  - on the Intranet: the Send-it digest's counts and the health page's meters;
  - on the Playbook: the bank questions and the wing's tally;
  - on Groundwork: the wire's count, the flags, "And N more", a stamp's count and the stale drop;
  - on the Sendbook: its cap, GONE COLD and MKTG LIVE;
  - on the HomeRoom: the Chute's second-record counts, the follow-up count, MULTI, and the research chip's date.
  (#386, #387, #388)
- **A6.3.** Four receipts landed in a folded TODAY. All four now spring TODAY open. The mint, which is not a filing, springs UNKNOWN (#387).
- **A6.10.** Editing a line in place dropped tag keys the codec no longer reads (#387).
- **A11.2.** One account link still carried an arrow (#387).
- **A12.5, A12.11 and A12.12, the writing canon on the ingest surfaces.** Sixty strings carried dash asides, antitheses or flourishes, and all are flat now. A sweep in the chain parses every operator string on those surfaces (#386).
- **A12.7, Yesterday carries.** A held file left unpicked at the Chicago day line, or on a row's Drop across a reload, was forgotten and never backed up. Both doors now carry it and say "Held since M/D." (#386, #389).

The fixes routed in from other slices' finds rode the same PRs:
- the MULTI count is the HomeRoom's on Groundwork;
- MULTI at zero threads is red everywhere;
- the sheet's green is the brand's by role;
- "Cadence" reads "Check-ins";
- the copy on the room, the sheet and the Intranet lost its dash asides.

## 2. What stays open

Nothing is broken. On 2026-10-08 the founder gave the three orders this section asked for ("ship the fold for A8.5, and ship #260 and #309"):

1. **A8.5, shipped (#391).** THE SIGNAL's fold lists every acted gem about an account person at its foot, newest acted first, each with its ↺. With nothing live to lead, THE SIGNAL reads "✓ N ACTED" and opens the same fold.
2. **#260 and #309, ratified (#391).** The Act Lane and the Pipeline pull tab now carry their ship order in CLAUDE.md, so every face PR since the ship-order rule has one.
3. **The process rows hold on the evidence there is:**
   - A2.8 and A4.31: audits ran, but after ship;
   - A6.11: no concept route is served;
   - A6.12: every face PR carries its order;
   - A11.6: the verify chain is pinned; the branch, PR, CI and squash steps are process.

## 3. The scoreboard after

| | Before pass 10 | After |
|---|---|---|
| Honor-system decrees (111) | 82 honor · 1 text · 26 chain · 2 retired | 46 honor · 63 chain · 2 retired |
| Of the honor rows, with partial pins | 20 | 40 |

37 rows moved to chain, A8.5 with the fold (#391). The chain pins each one by behavior across its whole scope. The other 46 stay on the list:

- **40 with partial pins.** What a test can call is pinned. The rest is CSS (a color, a side, a hover), a click a server render cannot make, or a scope wider than the suites reach.
- **6 with no pin.** Four are process rows (A2.8, A4.31, A6.11, A6.12). A12.3, "the reason is the trigger", is a judgment about what a line says. A12.6, six words a line, has nothing in its scope to pin: the ingest surfaces carry no action or reason line.

The founder's "23 logic rules" was an estimate made by kind. Every row a test can call now has one, and that came to 37.

The chain runs 2246 tests after #389.

## 4. Every row

| Row | Section | Verdict | Status now | PR | Pin | Note |
|---|---|---|---|---|---|---|
| A1.1 | The Chute | holds | honor · partial | #385 | tests/ingest-hooks.test.ts › "the board's only file doors are its rows' Drops; the Chute is one door" +1 |  |
| A1.3 | The Chute | holds | honor · partial | #385 | tests/ingest-hooks.test.ts › "the line starts the first three reads the moment they are handed over" +2, on the hook taken from a render; the onDrop to handleFiles wiring stays a text pin |  |
| A1.8 | The Chute | holds | chain | #385 | tests/canon/chute.test.ts › "every page that reads the record derives on request (A1.8)" + the existing text pins |  |
| A2.4 | The Ted doctrine | broken → fixed | honor · partial | #385 | tests/second-record-faces.test.ts › "a first-record touch later than the export's row silences the line" +2; tests/canon/second-record.test.ts › "a send under the shell id and a later logged touch both reach the last touch" +2; plus the existing partial pins | The desk line, the Partners recipient, the contacts roster and the readout's verified cold each read one record or no roster; all four fixed (#385, #388). |
| A2.8 | The Ted doctrine | process | honor | #385 | — |  |
| A4.1 | The second record, the meat law, the vehicle rule | broken → fixed | honor · partial | #385 | tests/second-record-faces.test.ts › "the draft desk's last touched reads both records (A2.4, A4.1, C1)"; existing R5 pin "the current drop's digest is live; last week's and a taken-back drop's are not" | The desk line and the readout's cold count now read both records (#385, #388). |
| A4.11 | The second record, the meat law, the vehicle rule | holds | chain | #385 | tests/canon/second-record.test.ts › "an incomplete upload refuses to run (A4.11)": "a drop still uploading, with no manifest yet, does not run" +3, each asserting no rollup or gem is written |  |
| A4.16 | The second record, the meat law, the vehicle rule | holds | honor · partial | #385 | tests/second-record-faces.test.ts › "Groundwork's chip row holds only doors, one per chip" + the existing groundwork pins; placement under the reason is server-page markup |  |
| A4.17 | The second record, the meat law, the vehicle rule | holds | chain | #385 | tests/canon/act-lane.test.ts › "the sheet's columns: no MODEL, no PRISMHR, the three at the right" +1 |  |
| A4.19 | The second record, the meat law, the vehicle rule | holds | honor · partial | #385 | tests/canon/act-lane.test.ts › "LAST HUMAN TOUCH, THE SIGNAL and ACT are each a door on the row"; the fold itself needs a click |  |
| A4.20 | The second record, the meat law, the vehicle rule | holds | honor · partial | #385 | tests/room-parity.test.ts › "the line is the panel's first line, one line, before UNKNOWN" +1; the color is CSS-only |  |
| A4.23 | The second record, the meat law, the vehicle rule | broken → fixed | honor · partial | #385 | tests/second-record-faces.test.ts › "the CSM's own last rows lead with what happened, not a due date" + the existing G6 pin |  |
| A4.25 | The second record, the meat law, the vehicle rule | holds | chain | #385 | tests/second-record-faces.test.ts › "themes of five or more cases, top three book-wide, become drafts" +2 |  |
| A4.27 | The second record, the meat law, the vehicle rule | holds | honor · partial | #385 | tests/second-record-faces.test.ts › "the second record's faces: every chip, cite, theme, count and case is a door (A4.16, A4.27)" + tests/canon/act-lane.test.ts › the A5 block; each deeper layer needs a click and a fetch |  |
| A4.30 | The second record, the meat law, the vehicle rule | holds | honor · partial | #385 | tests/second-record-faces.test.ts › "the route answers GET and nothing else" +2 |  |
| A4.31 | The second record, the meat law, the vehicle rule | process | honor | #385 | — |  |
| A5.1 | The click-depth law | broken → fixed | honor · partial | #386 | tests/ingest-faces.test.ts › "the counts are a link to the dock's anchor, and the dock answers to it"; tests/intranet.test.ts › "the digest paints each count as a button, and an open kind lists its claims as doors" +3; tests/groundwork.test.ts › "every count on Groundwork's face opens what it counts"; tests/canon/sendbook.test.ts › "Show all N is a link to every line under the same filter; under the cap there is no door" +1; tests/canon/spring.test.ts › "the follow-up count and MULTI open one click deep" | Every dead end found is now a door: the Intranet digest, the health meters, the Playbook lists (#386); Groundwork's wire, flags, rest, stamp counts, stale drop, and the Sendbook's cap and marks (#388); the HomeRoom's follow-up count, MULTI and research chip (#387). |
| A5.2 | The click-depth law | broken → fixed | honor · partial | #386 | as A5.1 | As A5.1; the Sendbook's GONE COLD and MKTG LIVE moved from hover titles to doors (#388). |
| A5.3 | The click-depth law | broken → fixed | honor · partial | #386 | as A5.1 | As A5.1. |
| A5.4 | The click-depth law | holds | honor · partial | #386 | tests/ingest-faces.test.ts › "nothing deep surfaces uninvited: the held box's grounds and the receipt's lists stay shut at first paint" |  |
| A6.1 | The Spring | holds | honor · partial | #387 | tests/canon/spring.test.ts › "UNKNOWN, COMPARABLE and TODAY each rest as one line, in that order" +5 |  |
| A6.3 | The Spring | broken → fixed | honor · partial | #387 | tests/today-register.test.ts › "every receipt enters through a door, and both doors spring TODAY" +1, alongside the existing H4 block |  |
| A6.5 | The Spring | holds | chain | #387 | tests/canon/spring.test.ts › "the board paints the legend once, after the last row" +2 |  |
| A6.6 | The Spring | holds | honor · partial | #387 | tests/canon/spring.test.ts › "each control is its glyph alone, tooltip-titled, wherever its register paints it" +3 |  |
| A6.10 | The Spring | broken → fixed | chain | #387 | tests/canon/spring.test.ts › "a key the codec no longer reads and a line in its own order survive" +4. With the old logic dropped into the helper, this test fails. |  |
| A6.11 | The Spring | process | honor | #387 | — |  |
| A6.12 | The Spring | process | honor | #387 | — | Ship orders recorded for every face PR since the decree. #260 (the Act Lane) and #309 (the Pipeline pull tab) had none on record; the founder ratified both on 2026-10-08 (#391). |
| A7.1 | The Scratchpaper | holds | chain | #384 | tests/canon/scratchpaper.test.ts › "the floater's own modules do not resolve" +2 |  |
| A7.3 | The Scratchpaper | holds | honor · partial | #384 | tests/canon/scratchpaper.test.ts › "first paint is the ✎ button alone, closed, with no second pad" |  |
| A7.8 | The Scratchpaper | holds | chain | #384 | tests/canon/scratchpaper.test.ts › "a kept line is one row under the pad's namespace, by the hand door, figures kept" +5 |  |
| A7.10 | The Scratchpaper | holds | chain | #384 | tests/canon/scratchpaper.test.ts › "the question that leaves carries no figure" +2 |  |
| A7.14 | The Scratchpaper | holds | chain | #384 | tests/canon/scratchpaper.test.ts › "cross out, then ↺: the line is back on the paper with its words and its moment" +2; existing › "the struck history pages from its own namespace" |  |
| A8.1 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "a row with an act shows one chip: the act, then the source line inside it" +2 |  |
| A8.2 | The Act Lane | holds | honor · partial | #384 | same test as A8.1 |  |
| A8.5 | The Act Lane | broken → fixed | chain | #384, #391 | tests/canon/act-lane.test.ts › "the stamp renders with its ↺, which names the gem it takes back" +2; › "the fold lists each acted gem with its ↺ while another gem leads the ACT cell" +2 | An earlier ✓ stamp and its ↺ rendered nowhere while another gem led the ACT cell. By the founder's ship order (2026-10-08) every acted gem now sits in THE SIGNAL's fold with its ↺. |
| A8.6 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "the chip is the lane's door, and the lane it opens is the standing workbench" +1 |  |
| A8.7 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "every citation is a door above the draft (A8.7, partial)" |  |
| A8.8 | The Act Lane | holds | chain | #384 | tests/canon/act-lane.test.ts › "TO carries the relationship contact and SUBJECT the act; the body starts blank (A8.8)" +1 |  |
| A8.9 | The Act Lane | holds | chain | #384 | tests/canon/act-lane.test.ts › "Send, File and the fork sit at the foot, after the draft, in that order (A8.9)" +1 |  |
| A8.20 | The Act Lane | holds | chain | #384 | tests/canon/act-lane.test.ts › "six columns, titled; Stage, Next action and Play are gone (A8.20)" +1 |  |
| A8.21 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "no rail: one mono Filter Door at the shoulder, resting closed (A8.21, partial)" +1 |  |
| A8.22 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "the column titles are the only sort: each title is a button and no sort control exists (A8.22, partial)" |  |
| A8.23 | The Act Lane | holds | chain | #384 | tests/canon/act-lane.test.ts › "no header subtext, no hot-signal bar, no ⊞; the dashboard door is plain words (A8.23)" |  |
| A8.24 | The Act Lane | holds | honor · partial | #384 | tests/canon/act-lane.test.ts › "the count rides the Account title; ⧉ and ⇩ ride the page title; the search has its glyph (A8.24, partial)" |  |
| A9.1 | Groundwork face | holds | chain | #388 | tests/groundwork.test.ts › "the stage holds one account, its action line, then its reason line" +2 |  |
| A9.2 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "today's stamps only, oldest first; yesterday's and the readout's stamp never reach the wing" +1 |  |
| A9.3 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "the heat ladder: perishable signals burn, dated moves are this week, the rest keep; a carried move burns" +3 |  |
| A9.4 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "each name carries its trigger beneath it, and every row opens to the stage" |  |
| A9.5 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "A9.5 · the band's serif verb leads the masthead and the count follows it" |  |
| A9.6 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "A9.6 · the burn bar drains as the window empties, and waits full before the day" |  |
| A9.7 | Groundwork face | holds | honor · partial | #388 | tests/groundwork.test.ts › "A9.7 · inside the last five minutes the instrument turns late; never before the day or after it"; existing › "the bar is red whatever the motion setting" +1 |  |
| A9.8 | Groundwork face | holds | chain | #388 | tests/groundwork.test.ts › "A9.8 · the capsule facts ride the sub-row: Chicago clock, date, weather; no reading, no sky" |  |
| A9.9 | Groundwork face | holds | chain | #388 | tests/groundwork.test.ts › "the three ribbons, in order, each over its own content" + the pass 10 doors block |  |
| A9.10 | Groundwork face | holds | chain | #388 | tests/canon/groundwork.test.ts › "Groundwork is outbound only: no rule stages a reactive move (A9.10)" |  |
| A9.12 | Groundwork face | holds | chain | #388 | tests/groundwork.test.ts › "the newest research:<account> note is the account's live research read" +3 |  |
| A9.20 | Groundwork face | holds | chain | #388 | tests/groundwork.test.ts › "the Klaxon is the masthead; then the wings: done, the stage, waiting; then the deck and the foot" |  |
| A10.1 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "the route is a page, and the page paints the register: week head, day kickers, every touch" |  |
| A10.2 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "the Tallyfoot is a door to /sendbook that reads THIS WEEK · N WORKED · …" +1; tests/groundwork.test.ts › "a stale second record is its own door, to the drop's receipt on the Intranet" |  |
| A10.3 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "the route table holds no /sendbook row" +1 |  |
| A10.6 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "the chips are the decree's channels in its order, and every channel the register knows has one" +4 |  |
| A10.9 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "a record send today pre-answers; a tap, or yesterday's send, does not" +2 |  |
| A10.11 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "each tap reads as an awaiting outreach touch at its own moment" +2 |  |
| A10.18 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "the ask's only steps are the button, the channel and the who; a tap files a channel and a person" +1 |  |
| A10.19 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "a register line holds what happened and its annotations, and nothing ahead" +1 |  |
| A10.20 | The Sendbook | holds | honor · partial | #388 | tests/canon/sendbook.test.ts › "the take-back deletes today's stamp and the tap filed with it, and nothing else" +3 |  |
| A10.21 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "a stamp with no tap (a Copy stamp) takes nothing back but itself; the record's send stays" |  |
| A10.22 | The Sendbook | holds | chain | #388 | tests/canon/sendbook.test.ts › "✕ closes the channel row and the who row, and files nothing" +2 |  |
| A11.2 | Other standing decrees | broken → fixed | honor · partial | #387 | tests/canon/standing-decrees.test.ts › "every <Link> or <a> in src that reaches /accounts carries no glyph" +2. The sweep failed before the fix. |  |
| A11.3 | Other standing decrees | holds | honor · partial | #387 | tests/canon/standing-decrees.test.ts › "the ladder: one thread red, two amber, three or more green" +3 |  |
| A11.4 | Other standing decrees | holds | honor · partial | #387 | tests/room-parity.test.ts › "the drawers keep their decreed names — never Cadence" + tests/canon/standing-decrees.test.ts › "at rest the tab and its count wear the ink ladder's quiet steps" +1 |  |
| A11.6 | Other standing decrees | process | honor · partial | #387 | tests/canon/standing-decrees.test.ts › "prettier, tsc, eslint with no warnings, the tests, the build" +1 |  |
| A12.1 | The writing canon and plain-speech law on the ingest surfaces | holds | honor · partial | #386 | tests/ingest-faces.test.ts › "no string in scope carries a device, a hedge, a deadline, a dash aside, a parenthetical, retired words or a flourish" |  |
| A12.2 | The writing canon and plain-speech law on the ingest surfaces | holds | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries a device, a hedge, a deadline, …" |  |
| A12.3 | The writing canon and plain-speech law on the ingest surfaces | holds | honor | #386 | — (existing partial: tests/ingest-guard.test.ts › "the sanitizer: …") |  |
| A12.4 | The writing canon and plain-speech law on the ingest surfaces | holds | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries … a hedge …" |  |
| A12.5 | The writing canon and plain-speech law on the ingest surfaces | broken → fixed | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries … a dash aside, a parenthetical …" |  |
| A12.6 | The writing canon and plain-speech law on the ingest surfaces | holds | honor | #386 | — (out of scope: tests/canon/groundwork.test.ts › "every rule's action and reason line: six words a sentence, no aside, no deadline in the action") | Nothing in scope to pin: the ingest surfaces carry no action or reason line, and the held reason's nine-word cap is pinned. Groundwork's queue lines are pinned anyway (#388). |
| A12.7 | The writing canon and plain-speech law on the ingest surfaces | broken → fixed | honor · partial | #386, #389 | tests/ingest-faces.test.ts › "a held row left unpicked carries past the Chicago day and says since when (pass 10, A12.7)" +1; › "the Drop's held question survives a reload and the day line, and says since when (pass 10, A12.7)" +2 | The Chute's waiting rows (#386) and the Drop's held line (#389) carry past a reload and the day, saying Held since M/D. |
| A12.8 | The writing canon and plain-speech law on the ingest surfaces | holds | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries … retired words …" |  |
| A12.9 | The writing canon and plain-speech law on the ingest surfaces | holds | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries … retired words …" |  |
| A12.10 | The writing canon and plain-speech law on the ingest surfaces | holds | honor · partial | #386 | tests/ingest-faces.test.ts › "no string in scope carries …" |  |
| A12.11 | The writing canon and plain-speech law on the ingest surfaces | broken → fixed | chain | #386 | tests/ingest-faces.test.ts › "no string in scope carries a device …"; › "the sweep reaches every door: …" |  |
| A12.12 | The writing canon and plain-speech law on the ingest surfaces | broken → fixed | honor · partial | #386 | tests/ingest-faces.test.ts › "no string in scope carries … a flourish" |  |

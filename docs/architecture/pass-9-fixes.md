---
title: Pass 9 Fixes
status: Pass 9, 2026-10-07, main da6324e. Fixes for pass 8's findings, merged as #368 to #382.
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/pass-8-rewalk.md
  - docs/architecture/canon-scoreboard.md
---

# Pass 9 Fixes

On 2026-10-07 the founder ordered the fixes ("fix the problems. and on the things that need a ruling from me, make the smartest calls yourself. you have my approval"). Pass 9 made the fourteen calls first (#368), then fixed pass 8's live violations in eight slices (#369 to #376), closed the seams between the slices in three more PRs (#377 to #379), and fixed what a fresh re-score of the scoreboard then found (#380 to #382). Every fix landed with a chain test that failed on the code before it, apart from two missing pins added for behavior that was already right. The chain now runs every test file in the repo: 88 files, 2054 tests.

## 1. The PRs

| PR | Slice | What it closed |
|---|---|---|
| #368 | the calls | pass 8's fourteen questions, ruled by delegation into CLAUDE.md |
| #369 | house | every test file on the chain (the intranet suite's grab block fixed), a `verify` script, dead modules and retired functions out, getAppAccess memoized per request |
| #370 | the HomeRoom | off-board rows (call 1), H2, H4, H5, H8, X1 (room), X6 (room) |
| #371 | the read | H1, H3, H6, H7, H10, H12, X3 (first half), X5, G9, calls 6 and 7, only their acceptance books |
| #372 | Groundwork | G1 to G8, calls 4 and 11, C8 seats on a second-record-only exclusion, signals.ts's Chicago days |
| #373 | the second record | R1 to R5, A1, C4 (run), X4, call 14, X1 (second record); the re-drop check that skipped every changed account |
| #374 | the Chute | C1 to C6, H11, X1 (Chute), calls 3, 8, 9 and 13, the duplicate race, housekeeping |
| #375 | Accounts | A2 to A8, C19, X1 (Accounts), D15 (Act Lane), every play rewritten flat and linted |
| #376 | surfaces | S1, S2, X2 (C13), X6 to X9, call 12, X1 (partners) |
| #377 | seams, the room | the Drop backs up, opens its duplicate and take-back; released lines show; worked seats stay retired; only their acceptance settles; Due today |
| #378 | seams, ingest | the Sales Nav grab files per account; the grab's day; plain guard reason; ruling ids; brand rung chips; FILED THREAD |
| #379 | seams, the reads | one writer for the quiet flag and it reads both records; one answer for countries and products; one hide key; both research stores; the uncased fold; meetings are conversations; the touch's row key |
| #380 | the re-score's tail | the drawer and its Word file say PROMISED only when heard (D28); the Act Lane's HomeRoom fork lands in TODAY (A8.15, a live bug); the context pack reads the account read (A2.4); the channel-line stamp and the count of three pinned (D27, call 10) |
| #381 | the re-score's tail | heavy text travels in pieces and files whole (D4); a waiting file says so (D11); a filing runs its account's acted sweep at once |
| #382 | the re-score's tail | the Act Lane offers the HomeRoom only on a live deal; two dash asides |

## 2. Pass 8's live violations

Every row of pass-8-rewalk.md §3, by id.

| Id | Status | PR | Note |
|---|---|---|---|
| H1 | fixed | #371 | the drawer reads the read's own promise list |
| H2 | fixed | #370, #371 | no name stands in; our own acceptance books nothing |
| H3 | fixed | #371 | direction comes from the actors |
| H4 | fixed | #370 | filing and promoting spring TODAY |
| H5 | fixed | #370 | the queued asks and the stage gate open |
| H6 | fixed | #371, #377 | a release closes, a deferral moves; a released line shows its why |
| H7 | fixed | #371 | a typed date naming its hearer reads PROMISED |
| H8 | fixed | #370 | the edge tabs and tags take the brand palette; no "cadence" |
| H9 | fixed | #370, #372 | the HomeRoom takes the excluded off-board account (call 1); a second-record-only exclusion keeps its seat on the wing |
| H10 | fixed | #371 | machinery never asks |
| H11 | fixed | #374 | a due day starts at its first Chicago moment |
| H12 | fixed | #371 | the 40-character heuristic is gone |
| C1 | fixed | #374 | the receipt opens every count |
| C2 | fixed | #374, #377 | a duplicate opens the earlier filing, at both doors |
| C3 | fixed | #374 | the pact is short and true |
| C4 | fixed | #373, #374 | the activity lines are flat |
| C5 | fixed | #374, #377 | a take-back and a backup open what they report |
| C6 | fixed | #374 | "1 promise from them"; Send-it's duplicate is flat |
| A1 | fixed | #373 | the draft desk's line cites its row; the bare datetime never speaks |
| A2 | fixed | #375 | Send consumes the draft |
| A3 | fixed | #375 | Send stamps the gem acted |
| A4 | fixed | #375 | a closed card is not a live deal |
| A5 | fixed | #375, #379 | LAST HUMAN TOUCH and the verdict open; the touch fetches by row key |
| A6 | fixed | #375 | no ↗ |
| A7 | fixed | #375 | the Approach never withholds a play (C19) |
| A8 | fixed | #375, #379 | the lane carries the quiet flag, one writer, both records |
| G1 to G8 | fixed | #372 | colleague gems out, seats retire, the read's facts, chips drill to rows, the real count, both research stores, the move's own tap |
| G9 | fixed | #371 | a dayless promise says when it was made |
| S1 | fixed | #376 | flat Sendbook copy, brand amber |
| S2 | fixed | #376 | REPLIED and BOOKED open to their message |
| R1 to R5 | fixed | #373 | verify before swap, acted stamps survive, D19's order, the sweep's reach and key, stale digests leave the brain |
| X1 | fixed | #370, #373, #374, #375, #376 | hidden is hidden on every surface the re-walk named |
| X2 | fixed | #376 | a playbook citation opens in place (C13) |
| X3 | fixed | #371, #379 | a fallback archive is no call; countries and products give one answer |
| X4 | fixed | #373 | the dock is plain and its line opens |
| X5 | fixed | #371, #372 | every day is a Chicago day |
| X6 | fixed | #370, #376, #378, #379 | the room, the mark, the dots, the Playbook chips and the export's amber |
| X7 | fixed | #376 | no "steps" |
| X8 | fixed | #376 | every pad line stays reachable |
| X9 | fixed | #376, #378 | every block cites its rung; FILED THREAD for threads |

## 3. The fourteen calls

| Call | Built in |
|---|---|
| 1 the HomeRoom takes the excluded off-board account | #370 (#372 for the seat on a second-record-only exclusion) |
| 2 no action revalidates another surface | #372, #375, #376 |
| 3 readers hand on whole text | #374 (windowed only above the 4 MB transport limit, and the receipt says so) |
| 4 the bare datetime never quiets the drumbeat | #372 |
| 5 the acted sweep reads every first-record row | #373 |
| 6 the drawer reads the read's promise list | #371 |
| 7 the read hands its roster to the relationship read | #371 |
| 8 a failed filing backs up | #374, #377 |
| 9 the receipt opens every count | #374 |
| 10 two colleague counts, in D19's order | #373 |
| 11 the burn bar turns red and pulses | #372 |
| 12 the Sales Nav grab lands in the pipeline | #376, #378 (per account) |
| 13 "The read names {claim}." | #374, #378 |
| 14 campaign titles are redacted | #373 |

Pass 9 added two rulings of its own, both in CLAUDE.md: a Sales Nav grab splits per account through the router, and a grab records what was seen on its day, so a re-copy that day dedupes and a new day's grab files fresh (#378).

## 4. Pass 8's housekeeping

| Item (pass-8-rewalk.md §5) | Status | PR |
|---|---|---|
| The 25 off-chain suites; tests/intranet.test.ts red since #336 | fixed: every test file is on the chain, the grab block reads grabs.ts | #369 |
| The verify chain in package.json | fixed: `npm run verify` chains the five checks with &&; `lint` has --max-warnings 0 | #369 |
| Dead modules (look-into/live.ts, intel/research.ts, dashboard.module.css) | deleted | #369 |
| corpusFor, dealIntelFor, dialectOf, sourceFor | deleted; their pins call the live read | #369 |
| roomActionUndo; the unread `judged`; the optional door; built decree strings | removed, removed, required, literal | #374 |
| theirTurnFrom (test-only after #371) | deleted with its test block | #379 |
| The duplicate race | closed by a claim on the marker's unique key, no schema change | #374 |
| Mislabelled ruling ids | corrected in source and tests | #374, #378 |
| The getAppAccess memo | half built: memoized per request with React's cache | #369 |
| Stale comments | corrected where the fixes passed them | #370, #374, #379 |

## 5. Still open

What pass 9 did not close, and why. Nothing here is operator-visible except where it says so.

- **The getAppAccess upsert at sign-in.** The KEEP ruling's second half moves the user-row upsert to sign-in. Today every call forces the OWNER role and isActive, so moving it changes how a role set in the database sticks (it would make read-only sessions real) and needs handling for a missing user row. That is a change to access, so it waits for its own ruling.
- **The raw text on the model's path.** When the model's read returns entries for a capture that is not a call transcript, the pipeline files the entries; the whole raw text is kept as its own note only when there are no entries, and as the archive for a call. The vault keeps every dropped file whole either way. Whether D4's "the note keeps the text whole" asks for the raw text of a model-read paste as its own note is a ruling for the founder.
- **The Intranet's capture in one request.** Send-it still sends its text as one server-action argument, so a capture over about 4.4 MB would be refused by the platform before it reaches the server. The Chute and the Drop carry heavy text in pieces (#381).
- **A filing's stored deal facts.** The read honors a filing's own facts over the regex (#379), but no loader yet hands the Filing rows' facts to the read, so rows are still regex-mined; the stored read's signals sit on the Filing row unread.
- **Three canon suites read source text** (standing-decrees, chute, provenance), against the scaffold's no-source-reads rule. Several pass 9 pins are source reads too, where a behavior pin needs a DOM or a request the suite does not have.
- **The NEEDS THE DB queries** in the dead-code ledger still need a session that can reach the database.
- **Small residuals:** the clock's noon-anchored Outlook rows can land on the previous Chicago day between midnight and about 5 AM (src/lib/intel/clock.ts); a take-back sent with only a filing id leaves the duplicate marker (predates pass 9); a Sales Nav grab's notes carry the filing moment, not the grab's day, so a grab pasted a day late decays from the paste; the grab's date is read in US order; `orgInboundKey` is kept alive only by tests.
- **New spending, by design:** the second record's re-drop check used to skip every account that already had a rollup (#373 fixed it), so each weekly drop now distills the accounts whose rows changed. That was the original design.

## 6. The scoreboard after pass 9

Re-scored by a fresh walk at main 9852088 and for the tail PRs at da6324e, under pass 8's rule (a row moves only when a chain test pins the decree across its whole scope). The rows and their pins are in docs/architecture/canon-scoreboard.md.

| Table | Pass 8 | Pass 9 |
|---|---|---|
| Honor-system decrees (111) | 93 honor · 1 text · 15 chain · 2 retired | 82 honor · 1 text · 26 chain · 2 retired |
| Ungoverned behaviors (34) | 16 enforced · 15 encoded · 3 violated | 22 enforced · 12 encoded · 0 violated |
| Conflicting pairs (20) | 17 aligned · 1 encoded · 2 violated | 20 aligned |

The 82 honor rows are decrees no chain test pins across their whole scope yet, mostly faces and copy rules that a suite without a browser cannot render; thirteen of them carry partial pins. None of them is a known violation: every live violation pass 8 found is fixed, and the re-score's own finds were fixed in #380 to #382.

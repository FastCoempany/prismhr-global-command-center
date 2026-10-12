---
title: Pass 18 — the twenty pairs
status: Shipped 2026-10-12
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-17-encoded.md
---

# Pass 18 — the twenty pairs

The scoreboard's third section holds the twenty places where two decrees in CLAUDE.md contradicted each other. The founder ruled every one on 2026-09-25, each ruling was written into CLAUDE.md, and the code was brought to the ruling by passes 5 to 9. Since then the rows read **aligned** with a code cite and no test named. Pass 18 re-scored each pair against the chain as it stands and wrote the pinning test into its row, so an aligned pair is held by the suite and not by the walk that last read the code. Three rulings had no test of their own; each has one now.

## 1. Pinned before this pass

Seventeen rulings were held by tests written for the decree they sided with. The row now names them; nothing else moved.

| Pair | The ruling | The pins |
|---|---|---|
| C1 | LAST HUMAN TOUCH merges both records by latest | tests/second-record-faces.test.ts › the draft desk's last touched reads both records; tests/record-read.test.ts › the export row's key; tests/browser/accounts.test.ts › the column opens the entry it read |
| C2 | the roster reads the record's actors too | tests/ingest-route.test.ts › the roster the rungs read is the book's joined with the record's |
| C3 | the touch log merges with the record by latest | tests/record-read.test.ts › the touch log is the record too (C3); tests/canon/second-record.test.ts › the context pack's last outbound |
| C4 | ↩ REPLIED needs a substantive inbound | tests/canon/sendbook.test.ts › a closer warms and sets no annotation; tests/second-record-faces.test.ts › a bare datetime sets neither (D19) |
| C5 | machinery never warms and never replies | tests/canon/sendbook.test.ts › machinery never warms and never replies; tests/sendbook.test.ts › outbound alone never warms |
| C6 | an org-side inbound excludes; a colleague's inbox alone adds no row | tests/canon/groundwork.test.ts › the exclusion reads both records (C6); tests/room-read.test.ts › a colleague's inbox adds no row (C6) |
| C7 | two caps for two things | tests/canon/groundwork.test.ts › the two-slot cap governs rules; seats keep their own cap of three (C7); tests/act-lane.test.ts; tests/groundwork.test.ts |
| C8 | a seat follows its account to the HomeRoom | tests/canon/groundwork.test.ts › a seat follows its account (E6 + C8); tests/room-read.test.ts and tests/record-read.test.ts › the seat on the HomeRoom (C8) |
| C9 | the bearer has no candidate of its own; a vehicle never collides | tests/canon/groundwork.test.ts › the research bearer (C9); a vehicle never collides (D22) |
| C10 | the pad keeps figures | tests/canon/ted-doctrine.test.ts › the Scratchpaper's carve-out keeps figures, nothing else does |
| C13 | the citation opens in place to the bank's question | tests/canon/standing-decrees.test.ts › a playbook citation opens in place to the bank's question |
| C14 | one legend at the page foot | tests/canon/spring.test.ts › the per-row keybar is retired; one legend lives at the page foot |
| C15 | the hover glyph clause is retired text | tests/canon/act-lane.test.ts › no ⊞; the dashboard door is plain words; the open drilldown carries no arrow glyph |
| C16 | THEIRS is the account's people, in blue | tests/browser/room.test.ts › the THEIRS line: one blue mono line; tests/record-read.test.ts › THEIRS's lead skips a colleague's gem; only colleague gems: no line |
| C18 | the chip row offers the record's people too | tests/record-read.test.ts › the who chip row offers the record's people merged with the book's (C18) |
| C19 | the Approach is a fact, never a gate | tests/canon/act-lane.test.ts › the Approach is a fact, never a gate (A7; C19); tests/board-lift.test.ts |
| C20 | a waiting pick survives a reload | tests/canon/chute.test.ts › a waiting pick survives a reload with its text |

## 2. Pinned by this pass

| Pair | The ruling | What was open | The pin |
|---|---|---|---|
| C11 | "No redactions on the country wing": statutory facts render as authored; our money everywhere else never renders | The money scan held the product copy clean, and nothing checked that a statutory figure survives. A redaction added to the wing would have passed the suite. | tests/playbook-sheet.test.ts › "statutory facts render as authored; nothing on the wing redacts (C11)": every country's card carries the sheet's own values, value for value; at least one value is a figure the redaction would change; and the wing's three files (countries.ts, the country route, product-sheet.tsx) never import the redaction. The product-copy scan stands beside it. |
| C12 | the learned register keeps its names as cites; the universal-tool rule governs the authored surfaces only | The name scan held the authored sheet clean. tests/read-absorption.test.ts read the names out of the store, and nothing pinned that the page hands them to the face and the face renders them. | tests/playbook-sheet.test.ts › "a lesson keeps its account and a market fact its speaker, as cites (C12)": readPlaybook keeps who and accountName; the page passes both to the face; the face renders the lesson's account and the market fact's speaker beside the line; and the authored sheet never reads the register, so its names cannot cross. |
| C17 | the plain-speech law stands; the prospect's answer rows hedge, because real people do | Nothing on the Sheet read for hedging at all. A seller line reading "you might want to…" would have passed. | tests/playbook-sheet.test.ts › "the seller's lines never hedge; the prospect's answer rows may (C17)": every line the seller or the operator reads is clean against the lint's hedge regex; the cue field, the one place the prospect's words live, is exempt; and at least one cue does hedge, so the carve-out carries something. The regex is exported from src/lib/activity/lint.ts, so the Sheet reads the same rule the queue's acts and reasons do. |

No break was found: every ruling held in the code; what was missing was the test.

## 3. The scoreboard after

| | Before pass 18 | After |
|---|---|---|
| Conflicting pairs (20) | 0 open · 20 aligned · 17 with no test named | 0 open · 20 aligned · 20 pinned |

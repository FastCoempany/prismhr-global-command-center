---
title: Pass 17 — the twelve encoded rulings
status: Shipped 2026-10-12
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-16-honor.md
---

# Pass 17 — the twelve encoded rulings

The scoreboard's second section holds the 34 behaviors the code did that no rule covered, plus the price desk found by pass 12. The founder ruled on all of them on 2026-09-25 and each ruling is in CLAUDE.md. A ruling is **enforced** once a chain test or a construction pins every clause of it; one written in with a clause still open is **encoded**. Twelve rows were last scored at encoded by pass 9, on 2026-10-07, before passes 10 to 16 added their tests. Pass 17 re-scored each against the chain as it stands, clause by clause, and pinned what was still open. Every ruling is enforced.

## 1. Enforced as they stood

Six rows were pinned before this pass and only unscored:

| Row | Ruling | The pins |
|---|---|---|
| P1 | an archived surface leaves every tab list and revalidation list, and no live surface imports its actions | tests/canon/standing-decrees.test.ts › "an archived surface leaves every tab list and every revalidation list" (6), the import scan included |
| P2 | a capture naming an account files through the paste pipeline; one naming none stays an Intranet doc | tests/intranet-capture.test.ts › "the capture door: file when the route is sure, hold when it is unsure, keep when nothing names an account (P2)" (6), the Send-it action's route and the held dispute |
| D6 | vaulting is filing: an unreadable file vaults by its filename's rungs or waits for the pick, with a receipt | tests/vault.test.ts › "the chute vaults every drop and routes binaries by filename or pick"; tests/ingest-faces.test.ts › the vaulted and unfiled receipts, the ✕ that backs up |
| D7 | the duplicate check fails open and says so; a ✕-parked filing is on file and a re-drop is refused | tests/ingest-filing.test.ts › "a landed filing is on file; a ✕-parked one keeps its marker and stays on file (D7)", "a store that errors fails open, and the filing says so (D7)"; the receipt's DUPE_CHECK_SKIPPED line |
| D13 | routing runs on the server; the roster never ships | tests/ingest-route.test.ts › "routing runs on the server; the roster never ships to the browser" (3) |
| D10, the loops | their commitments are loops on their side with the promised day; one commitment is one loop; a blown one carries as PROMISED; an outcome files a marker only a click closes | tests/ingest-fanout.test.ts › "their commitments file as loops on their side (D10)" (7); tests/move-promise.test.ts; tests/read-absorption.test.ts › the marker read as fact, waved off, the unstamped card open |

## 2. Clauses pinned by this pass

| Row | The open clause | The pin |
|---|---|---|
| D2 | "both into the one activity pipeline" | tests/canon/chute.test.ts › "the two doors take the export into the one activity pipeline (D2)" (2): the Chute and the dock both probe the file and upload through the activity library posting to `activityStage`, and no third caller exists; the probe answers the export's own header and nothing else. The Drop's refusal, its backup and the pickers were pinned already. |
| D4 | "every reader hands on the text whole; only what goes to a model is windowed" | tests/ingest-filing.test.ts › "every reader hands on the text whole; only the model read is windowed (D4)" (2): the text reader returns every character of a file six times the model window, and neither the file reader nor the paste library carries a numeric cap or a window constant; the windows live in one module. |
| D8 | "a backup line carries no ↺; nothing takes a file back out of git" | tests/ingest-faces.test.ts › "a backup line carries no ↺, and nothing takes a file back out of git (D8)" (2): the vaulted and unfiled receipts render no take-back; the archive library exports no delete, its only DELETEs clean up its own failed draft, and the take-back never imports it. |
| D10 | "the read's signals file on the note" | tests/ingest-filing.test.ts › "the read's signals file on the note (D10)": `readOfNote` hands the signals back through the note's filing link, money-redacted. |
| D12 | "the fold shows every waiting row plus the two newest settled; receipts dismiss per row and all at once" | tests/browser/chute.test.ts › "D12 · the fold shows every waiting row and the two newest settled; receipts clear per row and all at once" (2), in the browser: two waiting picks and the two newest of four settled on arrival, Show all 6 behind the meter, ✕ on one, Clear all leaving the picks. |
| D14 | "the chip says 'Reads as a typed note.' before Enter; a jot stays an instant note; a pasted thread keeps its dialect; the ⚡ pane stamps nothing" | tests/browser/room.test.ts › "D14 · a typed note is a paste" (4), in the browser: a jot shows no chip and goes to roomCompose; a rich note's chip reads "Reads as a typed note. Enter runs the full read." and its paste carries the TYPED NOTE head; a pasted thread carries no typed head; the ⚡ pane files the same text without one. |
| D15 | "no action revalidates another surface", across the whole app | tests/canon/standing-decrees.test.ts › "every revalidatePath names the action's own route, and nothing revalidates a tag (D15, whole scope)": every file under src that revalidates is a page's own actions module naming its own route; the board's one computed path is its return page from a two-entry allowlist. The room's own pin (tests/canon/chute.test.ts) stands beside it. |

No break was found: every clause held in the code; what was missing was the test.

## 3. The scoreboard after

| | Before pass 17 | After |
|---|---|---|
| Ungoverned behaviors (35) | 0 open · 23 enforced · 12 encoded | 0 open · 35 enforced · 0 encoded |

With section 1 at 0 on honor (pass 16 and the ruleset) and section 3 at 20 of 20 aligned, every row of the scoreboard is pinned by a test, a construction or the ruleset.

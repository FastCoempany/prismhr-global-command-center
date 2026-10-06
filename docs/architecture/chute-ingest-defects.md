---
title: Chute Ingest Defects
status: Bug pass from audit pass 1, 2026-09-24; re-walked by pass 8, 2026-10-06
owner: Founder
related_docs:
  - docs/architecture/chute-architecture-map.md
  - docs/architecture/derived-fact-ledger.md
  - tests/ingest-defects.test.ts
  - tests/ingest-defects-deferred.test.ts
  - src/app/room/actions.ts
  - src/app/room/room-client.tsx
  - src/app/room/chute.tsx
---

# Chute Ingest Defects

The bug pass from audit pass 1, run 2026-09-24 on branch `claude/chute-ingest-defects-pass1` off main at 8fa2803 and merged as PR #329 (squash d126259). The map's §4 and its candidate list named eight defects in the ingest path; each was reproduced, classified FIX NOW / FIX IN REFACTOR / DESIGN, and either fixed in its own commit or deferred with a red test naming the refactor that closes it. Four were fixed, two are deferred, one did not reproduce and became a decision, and the verify chain runs 41 suites instead of six. Line numbers cited below are as of the branch head 3d55674, whose tree is main at d126259.

Three assumptions made and kept:

- **Two test files, not one.** The FIX NOW reproductions live in tests/ingest-defects.test.ts and run in the chain. The two FIX IN REFACTOR reproductions live in tests/ingest-defects-deferred.test.ts, outside the chain and never behind a skip, each naming the refactor that closes it. One file holding both would have left the chain red or the fixes uncovered.
- **Reproductions are source-scans, not calls.** roomPaste and roomPasteUndo gate on getAppAccess, which reads next/headers cookies, and on getPrisma, so neither can be called from a test. The suite reads the source the way misfile-guard and read-absorption already do, and calls judgeFiling where the behavior is pure.
- **Bug 1 sits in fileTo, which feeds the picker.** Classified FIX IN REFACTOR per the taxonomy. A one-line interim exists if it is wanted before the refactor lands: carry `text` on the mismatch patch at chute.tsx:236.

## The eight

| Bug | Reproduced (test) | Class | Reason | Fixed in / deferred to / decision | What the operator sees now |
|---|---|---|---|---|---|
| 1 Chute picker fall-through | yes: "a guard-rejected auto-route keeps its text for the pick" (deferred file) | FIX IN REFACTOR | The picker and fileTo are the code the shared verdict component replaces, map closer 3 candidate 9. | deferred to the shared verdict component | Unchanged: a guard-rejected auto-route still vaults under the picked account and never files. |
| 2 Drop files first readable only | yes: "every readable file in a drop is read, not just the first" (deferred file) | FIX IN REFACTOR | handleFiles' file loop is what the shared handleFiles/vault hook replaces, map closer 3 candidate 6. | deferred to the shared handleFiles hook | Unchanged: two .eml on a row file one and vault the other. |
| 3 Guard comments contradict canon | yes: "the stale sentences are gone", "the keyless early rung is described as keyless" | FIX NOW | The guard and its copy are in the spine the refactor keeps, map §4. | 5cfa0b8 | Rules-only receipt reads "The account check ran on the text's own evidence only. Undo if it landed on the wrong row." room-client.tsx:514. Behavior unchanged. |
| 4 "Cross it out" cannot work | yes: "the degraded transcript receipt points at a path that succeeds" | FIX NOW | The receipt copy belongs to roomPaste's result contract, which the refactor keeps, map §4. | dc3c4bd | "Undo this paste and drop it again when the reader is back." room-client.tsx:513. |
| 5 absorbRead on rules fallback | no: "did not reproduce: a keyless filing never reaches absorbRead" passes | DESIGN, decided | The keyless path leaves the read object null at actions.ts:264-275, so absorbRead never runs; the map's case is a live model read whose entry list came back empty. | option 1, 3d55674 | A filing whose entries came from the rules but whose actions and asks came from the model reads "Filed N entries by the rules, judgment by Claude." |
| 6 Undo is partial | yes: three tests under "bug 6 — undo is partial" | FIX NOW | roomPasteUndo and absorbRead are the spine the refactor keeps, map §4. | dd52e4c | Undo removes the entries, the asks, the playbook lines, the outcome marker and the opened actions, and says "Removed N entries and M actions." |
| 7 Chain runs six suites | yes, by the baseline run: 66 of 67 suites pass by hand, none of the ingest ones in the chain | FIX NOW | package.json is outside the refactor's blast radius. | 0b95754 | `npm test` runs 41 files, 852 tests, six seconds. |
| 8 Non-primary files vaulted twice | yes: "the waiting list excludes files already vaulted as unreadable" | FIX NOW | The vault's `waiting` set is in the FIX NOW list; both archiveFiles calls stay as vault.test.ts:92-98 decrees. | feb7d7e | One copy per file in the vault. room-client.tsx:601. |

**Force at the Chute picker is consistent with the canon.** On the "pick" state, force is necessary: the same evidence that produced no sure match would trip rung 2 again at misfile.ts:147-157 and bounce the pick back forever. On the "mismatch" state, force is the override misfile.ts's own contract names, now at misfile.ts:40-42. The wait happens, and the pick resolves it. No design item opened. The one gap is parity, not canon: the Chute's picker shows the claim but not the bound row's own evidence, while the Drop's banner shows both sides. That belongs to candidate 9.

**Bug 4, why the new path succeeds.** roomPasteUndo deletes the pastehash marker by prefix and first note id at actions.ts:939-944, so the re-drop passes the duplicate guard. The degraded transcript path returns its note id, so the undo button renders on that receipt at room-client.tsx:1568. Cross-out could not work because roomRecordDelete writes hide:note: and never touches the marker, and the ingest-defects suite pins that.

**Bug 6, attribution.** Every row roomPaste writes is now attributable. absorbRead collects the gap ids at actions.ts:573, the playbook ids at :600, and the outcome marker's id at :617, and roomPaste returns them in noteIds beside a new todoIds list at :464-474. The undo deletes notes on the account and its gaps: namespace by id, deletes a playbook line only when its tail names the account at :924, deletes the opened todos on the account at :933, and returns removed and retired counts. Both doors pass the todo ids, room-client.tsx:741 and chute.tsx:467, and the Chute persists them in its ledger. One row remains outside the undo's reach: a completion note that fileCompletion writes when the operator marks an opened todo done before undoing, actions.ts:628. It is keyed by todo id, so the undo could delete it by matching the todo ids against that key if that reach is wanted. Amended 2026-10-05: the completion note is attributable too since slice 6, through the marker that names it.

**Bug 5, the decision.** When the model returns without entries and the rules fill them in, `how` reads "rules" at actions.ts:277-278 while the model's actions, gaps and lessons still fan out at :461-463. The receipt then said "Filed N entries." with no "read by Claude" while actions opened. Two options were put up:

- Label the judgment: keep `how` as the entries' provenance and add "judgment by Claude" to the receipt whenever the read object is non-null.
- Treat an empty model read as a failed read: set readFailed and skip absorbRead, so a rules filing never opens work.

Decided by the founder 2026-09-24: option 1. roomPaste returns `judged: read !== null`, the Drop's receipt reads "Filed N entries by the rules, judgment by Claude." when `how` is rules and `judged` is set, and the keyless path is unchanged: no read, no judgment, no fan-out. Commit 3d55674; pinned by "option 1: the receipt names the model's judgment when the rules filed the entries" in tests/ingest-defects.test.ts.

## Suites added to the chain

Thirty-five joined the six that were there: accepted-invite, account-merge, activity-harness, activity-parse, activity-rollup, addressed-to-us, ai-clean, ai-noise, brief, closer, evidence-future, extract, followups, intel, intraday-court, live-motion, misfile-guard, move-line, paste-files, pipeline-fixes, provenance, read-absorption, room-engine, room-judgment, room-parity, room-read, route-capture, rules-read, second-record-faces, self-task-touch, sf-timeline, today-register, touch, vault, and the new ingest-defects. Selection rule: every suite that imports or scans an ingest-path module, from paste-files through activity/run. Twenty-seven passing suites remain outside because they do not touch ingest: account-facts, act-lane, activity-classify, activity-gems, ask-links, ask-live, ask-next, board-lift, claude-workspace, intranet, key-health, ledger, live-contacts, narrative, pipeline-build, pipeline-density, pipeline-edits, pipeline-report, playbook-program, presence, price-desk, relationship, room-grammar, room-sheet, route-notes, scratch, sendbook. Adding them is a one-line change in package.json.

read-absorption's stale assertion is fixed, not removed: the run date moved to the chip's tooltip at room-client.tsx:949-953 and the test now pins that at read-absorption.test.ts:657.

## Text pins versus behavior pins

Twenty-five of the ingest suites never read source and only call functions. A red there during the refactor means the refactor broke behavior: accepted-invite, account-merge, activity-harness, activity-parse, activity-rollup, addressed-to-us, ai-noise, brief, closer, extract, intel, intraday-court, live-motion, move-line, paste-files, pipeline-fixes, provenance, room-engine, room-judgment, room-read, route-capture, rules-read, self-task-touch, sf-timeline, touch.

Ten suites read source text and pin names, order or sentences. A red there means update the test unless the pinned thing was a decree:

- **misfile-guard**: pins roomPaste's order, early guard before the read and the guard before absorbRead and createAccountNoteRow, by slicing between the `roomPaste(` and `absorbRead(` literals at :122-154. Renaming absorbRead or splitting roomPaste breaks the slice. Also pins `readDroppedFile(f, [f])`, the archive-after-accept order and the mismatch banner literals at :111-127. Its behavior half calls judgeFiling.
- **ai-clean**: pins three sentences of the reader's contract inside ai-clean.ts at :109-124. Rewording the fulfillment rule breaks it.
- **followups**: reads fourteen files. Requires the `"TM"` and `"teams"` literals in room/actions.ts and `(OUTLOOK|TEAMS) THREAD` in sf-timeline.ts at :301-313. Candidate 1's shared dialect module must keep those literals reachable or rewrite these asserts.
- **second-record-faces**: pins chute.tsx identifiers reconcileSecondRecord, activityReceipt, visibilitychange, the `act: x.act` ledger line and the settled-state list at :901-933, plus the mirror.ts staged-slice covenant.
- **read-absorption**: reads sixteen files. Pins the export names roomGapsRefill, roomResearch, roomActionUndo and friends in room/actions.ts, the undo copy and the research chip in room-client.tsx, and sentences in deep-research.ts and ask-mint.ts.
- **room-parity**: pins the action names reaching room-client.tsx and that every cross-page form carries value="/room".
- **vault**: pins `void archiveFiles(unreadable)` and `void archiveFiles(waiting)`, the Chute's filename route and vault regex, the ledger's Omit shape, and the Chute import in intranet/page.tsx.
- **today-register** and **evidence-future**: small pins on room-client.tsx and evidence.ts respectively.
- **ingest-defects**: pins the five fixes by text in actions.ts, chute.tsx, room-client.tsx and misfile.ts.

One trap for the refactor: tests/ is outside the prettier scope in package.json, so `prettier --write` on a test file reflows the whole file. It happened on misfile-guard during this pass and was reverted.

## Branch and commits

Branch `claude/chute-ingest-defects-pass1`, off main at 8fa2803, merged as PR #329, squash d126259.

```
311d4c4 Reproduce the eight ingest defects from audit pass 1
5cfa0b8 Bug 3: the guard's comments and copy now match the decreed behavior
dc3c4bd Bug 4: the degraded transcript receipt points at undo, which works
dd52e4c Bug 6: the paste's undo takes back everything the filing wrote
feb7d7e Bug 8: the Drop's waiting list is the readable file alone
0b95754 Bug 7: the verify chain runs the ingest suites
3d55674 Bug 5: the receipt names the model's judgment on a rules-filed paste
```

The chain ran green before each commit: prettier, tsc, eslint at zero warnings, the test script, and next build. The misfile-guard suite's own title said "the guard never blocks"; it now reads "the guard returns a verdict, never throws", which is what its body asserts.

## Open after this pass

- Bug 2 waits on the refactor, red in tests/ingest-defects-deferred.test.ts as a behavior pin on splitDrop, run by hand: `npx tsx --test tests/ingest-defects-deferred.test.ts`. Bug 1 closed on 2026-09-25 when the C20 scaffold put the text on the row before the read (chute.tsx fileTo); tests/canon/chute.test.ts pins the ledger half. Recorded 2026-10-02 by the verification pass.
- The completion note fileCompletion writes is inside the undo's reach since slice 6 (2026-10-05): its marker names the note, and `undoCompletions` in src/lib/ingest/fanout.ts takes the line back with its todo; markers written before that slice name no note and stand.
- The Chute's picker shows the claim but not the bound row's evidence; the Drop's banner shows both. Candidate 9.

## Re-walk, pass 8

Re-walked 2026-10-06 against main at d119c52 (branch `claude/pass-8-recheck-1c0svk`), after pass 7, the Chute brains refactor (PRs #339 to #366). Line numbers are this tree's; the table above keeps its own. tests/ingest-defects.test.ts is in the verify chain (package.json:10) and passes alone on this tree, 11 tests. tests/ingest-defects-deferred.test.ts no longer exists: slice 8 (PR #348, squash 46510a5) deleted it, moved its two pins into tests/ingest-defects.test.ts re-aimed at the shared hooks, and added tests/ingest-hooks.test.ts to the chain, so no defect waits outside the chain. A "chain" pin below calls the code and checks what comes back; a "text" pin reads source with a string or a regex; "mixed" does both.

| Defect | Status | PR and code now | Pins (kind) | What the operator sees now |
|---|---|---|---|---|
| 1 Chute picker fall-through | closed | The C20 scaffold put the text on the row before the read (#335, ab281df), now chute.tsx:111-119; slice 8 moved the pick onto the shared request (#348): pickHeld files the row's text with force (chute.tsx:256-273), filingRequest (use-ingest.ts:107-114), holdVerdict (use-verdict.ts:52-64). | tests/ingest-defects.test.ts › "a disputed auto-route keeps its text for the pick, and the pick files it" (chain); tests/canon/chute.test.ts › "a mismatch row keeps its text and its state too" (chain) | A disputed auto-route waits in the held box with its text, survives a reload, and the pick files it to the chosen account. |
| 2 Drop files first readable only | closed | Slice 8 (#348, 46510a5): planDrop (use-ingest.ts:78-86) over splitDrop's `readables` (drop-plan.ts:24-36); the Drop reads every readable file, three at a time, each waiting on its own verdict (room-client.tsx:758). | tests/ingest-defects.test.ts › "every readable file in a drop is read, not just the first" (chain); tests/ingest-hooks.test.ts › "two readable files on a row both reach the pipeline" (chain) | Two .eml files dropped on a row file as two filings with two receipts. |
| 3 Guard comments contradict canon | closed | Fixed in #329 (5cfa0b8). The rules-only receipt sentence it rewrote retired with the receipt face (#360, ec2181b); a reader-down filing now carries READER_DOWN (receipt.tsx:31) on the amber line. The guard's comments say it holds (actions.ts:329-339, :401-415; guard.ts:1-17). | tests/ingest-defects.test.ts › "the blocking behavior is unchanged: a disputed read holds for the pick" (mixed: judgeFiling and readFreeVerdict called, roomPaste's order read from source), › "the keyless early rung stands on the text's own evidence" (chain); tests/ingest-guard.test.ts › "a keyless filing produces the text rung alone" (chain) | A keyless dispute holds with the text rung's reason; a filing the reader missed says "The reader was down. Only the text filed." |
| 4 "Cross it out" cannot work | closed | Fixed in #329 (dc3c4bd); its copy retired with the receipt face (#360). The take-back is ↺ on the receipt (receipt.tsx:118-127), which clears the pastehash marker (actions.ts:917-928); cross-out still writes `hide:note:` and leaves the marker (roomRecordDelete, actions.ts:1416). | tests/ingest-defects.test.ts › "why undo works and cross-out does not" (text) | ↺ takes the filing back and a re-drop files; nothing on the receipt points at cross-out. |
| 5 absorbRead on rules fallback | closed (decided option 1; its surface superseded) | Decided 2026-09-24 and built in #329 (3d55674). The receipt face (#360) retired the judgment sentence: the line carries the account, the counts, the day and the rung, and the reader never shows (receipt.tsx:8-19; CLAUDE.md:313). `judged: read !== null` is still returned (actions.ts:614) and nothing in src reads it. | tests/ingest-defects.test.ts › "did not reproduce: a keyless filing never reaches absorbRead" (text), › "option 1: the receipt names the model's judgment when the rules filed the entries" (text; it pins a flag no surface reads) | The receipt does not say whose read filed the entries. A filing whose model read found no entries files the rules' entries and still opens the model's actions and asks. |
| 6 Undo is partial | closed | Fixed in #329 (dd52e4c) and widened to the filing id: the Filing link (#342, 0fb8419), the fan-out module and the completion line (#344, e1b6de4), the shared undo (#348). roomPasteUndo (actions.ts:840-942), undoFiling (filing.ts:209-225), undoCompletions (fanout.ts:448), undoRequest (use-undo.ts:26-31). | tests/ingest-defects.test.ts › "absorbRead hands back the ids of everything it wrote" (text), › "roomPasteUndo takes back notes in every namespace the filing wrote, and the todos" (text), › "both doors hand the todo ids and the filing id to the undo" (mixed); tests/ingest-filing.test.ts › "undoFiling takes back every row and todo carrying the id, then the row, scoped to the account" (chain); tests/ingest-fanout.test.ts › "undoFiling over two filings on one account takes back one" (chain), › "a fileCompletion note keyed by an opened todo is taken back with its todo" (chain) | ↺ takes back the entries, the to-dos, their promises, the asks, the playbook lines, the outcome marker and any completion line, and the receipt reads "Taken back from {account}. N removed." (chute.tsx:280-288). |
| 7 Chain runs six suites | closed | #329 (0b95754) took it to 41 files; the scaffold to 51 (#335); the pass-5 close to 49, deleting tests/brief.test.ts and tests/format.test.ts (#336); pass 7 to 62 (package.json:10), adding tz, ingest-dialect, canon/provenance, db-migrate, ingest-filing, ingest-guard, ingest-fanout, ingest-route, record-read, ingest-hooks, intranet-capture, move-promise and ingest-faces. | none: no test reads package.json, so a suite dropped from the script would go unnoticed | — |
| 8 Non-primary files vaulted twice | closed | Fixed in #329 (feb7d7e); now planDrop sends the unreadable ones once (room-client.tsx:748) and each readable one waits on itself alone (:758); vaultAfterVerdict (drop-plan.ts:49-57). | tests/ingest-defects.test.ts › "the waiting list excludes files already vaulted as unreadable" (chain) | One copy per file in the vault. |

The two items this doc left open:

- **The Chute's picker showed the claim and not the bound row's evidence.** Closed by the held box (#360, ec2181b): the reason opens to groundsOf, each rung that spoke and then what the dropped-on row carries (held.tsx:71-92), at the Chute, the Drop and Send-it alike. Pinned by tests/ingest-faces.test.ts › "the reason opens to the grounds, each rung in plain words, then the row" (chain: renders the box). The force note above still holds: a pick files with force (chute.tsx:267; room-client.tsx:623), guardPlan runs no rung under force (guard.ts:197), and the read runs again, pinned by tests/ingest-guard.test.ts › "re-runs the read: the plan holds no read and runs no rung with force" (chain).
- **The completion note outside the undo's reach.** Closed in #344: fileCompletion's marker names the note (fanout.ts:401), and roomPasteUndo reads the filing's todos before the row goes and takes their lines back (actions.ts:894-902, :914). Pinned by tests/ingest-fanout.test.ts › "a fileCompletion note keyed by an opened todo is taken back with its todo" (chain) and › "roomPasteUndo reads the filing's todos before the row goes and takes their completion lines back" (text).

Found on the ingest path by pass 8, open (the map's pass-8 section carries the evidence):

- The receipt's ask and playbook counts open to a list that holds neither (receipt.tsx:66-67, :302-325; filing-actions.ts:36-47) [inferred]. The operator reads "2 asks" on a receipt, opens the line, and finds no ask.
- The Chute's pact names Today among the surfaces that re-read the record (chute.tsx:678); Today is retired (CLAUDE.md:614-615).
- A readable file whose filing fails for another reason, an empty body or a partial failure, is never vaulted (drop-plan.ts:56; chute.tsx:161-166) [inferred]. The operator sees the error line and the file is not in git.
- Two filings of one capture to one account in flight together both pass the duplicate check (actions.ts:304) before either stamps (:512, :542, :592), and fileFiling's upsert folds both onto one Filing row (filing.ts:141) [inferred]. The map's pass-1 race, unchanged.

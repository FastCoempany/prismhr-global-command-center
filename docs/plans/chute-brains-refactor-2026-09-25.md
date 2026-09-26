---
title: Chute Brains Refactor Plan
status: Draft
owner: Founder
related_docs:
  - docs/architecture/chute-architecture-map.md
  - docs/architecture/derived-fact-ledger.md
  - docs/architecture/decree-ledger.md
  - docs/architecture/dead-code-ledger.md
  - docs/architecture/scaffold-pass.md
  - docs/architecture/chute-ingest-defects.md
  - docs/architecture/canon-scoreboard.md
  - CLAUDE.md
---

# Chute Brains Refactor Plan

Pass 6, written 2026-09-25 on branch `claude/chute-brains-plan-1c0svk`, cut from main at ab281df (the scaffold merged). Every file:line below was checked on that tree after the scaffold; the pass-1 map's numbers have drifted and are not reused. Ledger cites name the pass and the section (pass 1 §4, pass 2 E, pass 3 C6, pass 4 G3, scaffold E). Every RULING in the ledgers and every dated entry in CLAUDE.md is settled and is treated as law here. Claims that come from code shape and not from a run are marked [inferred]. This pass writes one document and no code.

## 1. Where we are

The ingest path is one server pipeline with two client doors and a third intake that shares nothing with it.

**The server pipeline.** `roomPaste(accountId, raw, {force})` at src/app/room/actions.ts:138-141 is the only filing verb; both doors call it (chute.tsx:129, room-client.tsx:489). Inside it, in order: the dialect sniff over the head line (:172-180, and TEAMS CHAT falls to SF), the model's window (:186-191, 400,000 characters for a tape and 60,000 otherwise, with a truncation note appended), the duplicate guard on a `pastehash:` AccountDisposition marker that fails open (:208-232), an early misfile rung with an empty claim unless forced (:240-260), the model read or the rules fallback (:269-307), a late misfile rung on the read's own claim (:317-338), at most 40 entry notes through `createAccountNoteRow` (:416-453), the tape's archive note sliced to 150,000 characters (:351-376), the marker stamp (:461), and `absorbRead` whenever the read object exists (:462-464). The model's structured result, `AiCleanResult` at src/lib/intel/ai-clean.ts:22-33, is used for its entries and its fan-out and then dropped: `read.signals` is never read by anyone, and the object itself is never stored (pass 4 G3). The fan-out at :495-629 drops their commitments (:519), dedupes by `knowledgeKey` against open todos, gaps and playbook rows with three inline known-sets (:521-534, :572-578, :585-606), and writes an outcome marker (:612-625).

**The two doors.** The Chute (src/app/room/chute.tsx, 682 lines) routes in the browser with `routeCapture` over a roster the page serializes as a prop (room/page.tsx:841, intranet/page.tsx:120), reads three files at once through `runLimited` (:313-320), forks a probed .csv into the second record (:262), vaults through a GitHub grant the server hands to the browser (archive-actions.ts:19-27, chute.tsx:167-181), keeps a receipt ledger per Chicago day (chute-ledger.ts), and resolves a dispute with a picker whose every choice files with `force: true` (:493-553). The Drop, inside `Row` in src/app/room/room-client.tsx (2,825 lines), is pre-bound to the row, reads the first readable file only and vaults the rest unread (:588-610), holds a disputed read in a two-sided banner whose force button re-runs the whole read (:1987-2031), and keeps its receipt in component state (:316-338). Bugs 1 and 2 of the defects pass are still red in tests/ingest-defects-deferred.test.ts:29 and :40 because they live in exactly this fork (pass 1 §4, defects doc "Open after this pass").

**The reads after a filing.** Five surfaces still build their own corpus from the same rows: room/page.tsx:163-176 (full rows, hide-filtered, the home-side union), groundwork/page.tsx:238-256 (actors, recipients and homeSide dropped), src/lib/pipeline/build.ts:360-370 (the drawer), room/actions.ts:1233-1250 (`roomGapsRefill`, 40 raw rows, no hide filter), and src/app/intake/actions.ts:77-86 (no hide filter). Whose move is still spelled five ways: engine.ts:242-272, day.ts:371-402, sendbook/read.ts:279-287, pipeline/build.ts:517-547 and report.ts:237-315. The head alphabet is still sniffed in eleven modules (pass 1 candidate 1; the current list is in §2.3), and the source literal is re-read raw at meeting.ts:35-36, pipeline/build.ts:195-585, groundwork/file.ts:107-111, signals.ts:24 and groundwork/page.tsx:232.

**What the rulings changed and the code does not yet do.** The scaffold pinned 34 GOVERN rulings and 20 STANDS rulings where a pure seam existed (scaffold A). What it could not pin waits here: the roster ships to the browser against D13 (CLAUDE.md:303); the vault's token reaches the browser against D8 (:307, and the comment at chute.tsx:150-156 says otherwise); no note carries its door against P3 (:405; the model at prisma/schema.prisma:1092-1110 has no such column); the second record's rows are written bare at src/lib/activity/run.ts:192 and :210 against P4; the transcriber's prompt asks for OUTLOOK or TEAMS heads only at actions.ts:1737 against D3; `refresh()` still names three paths at actions.ts:66-70 with 24 callers against D15; the two guard rungs still produce two verdicts against D9; their commitments are still dropped against D10; the pick still re-reads against D5; the archive note and the no-entries note still cut the text against D4. Scaffold E lists the STANDS rulings the code does not follow: C1, C2, C6, C8's HomeRoom half, C13, C16, C18, C19.

**Why the structured read is the hinge.** Every one of the seven decisions below gets simpler once the model's read is a row instead of a return value. The single account read (decision 2) can stop regex-mining direction and kind from prose it wrote itself, because the read already holds them per entry. The fan-out (decision 5) becomes replayable from a stored read: an undo can take back by filing id instead of a list of ids the browser carried; a fan-out fixed after a bug pass can re-run. The one-verdict rule (D9) and the final pick (D5) need the read to run once and wait, which a held filing row is. The receipt's windows (D4) are facts about the read and belong with it. The intranet's extractor takes the stored read instead of paying for a second one (pass 4's ruling on G6: "a filed note's extractor takes the structured read stored with the note"). D10 says the read's signals file on the note; there is nowhere to file them today. None of that is possible while the read dies at actions.ts:481.

## 2. Decisions

### 2.1 The structured read (taken first)

**What is decided.** Whether the sanitized `AiCleanResult` is stored at filing time, where, and what links to it.

**Options.**

- A. Store nothing. The entries live on as note rows; the fan-out rows live on unlinked; the signals die. Costs: G3 and G6 stand; D10 has no home; undo keeps carrying id lists through the browser; the pick re-reads; the intranet re-reads.
- B. Store the read as a namespaced note, `read:<account>` with a JSON body, the way `research:`, `gems:` and `activity:` already do. Costs: the writer's money redaction rewrites comma-grouped numbers inside JSON (scaffold A.3, P4 row); a new namespace has to join `recordRowsWhere` and the D30 exclusion; per-account rows fold by the alias rules and pick up the narrow-read defects of pass 2 C; nothing links a note to its read except a body scan.
- C. Store the read in its own table, one row per filing, and link every row the filing wrote to it by a column. Costs: a migration (additive), and the founder runs `prisma migrate deploy` (package.json:18) since the session cannot reach the database; one more model in the schema.

**Pick: C.** A table named `Filing`: `id`, `accountId`, `fingerprint`, `door`, `dialect`, `how` (ai, rules, transcript), `status` (held, filed), `read` (Json, the sanitized result, null on a keyless filing), `windows` (Json, every window that cut something as `{what, read, of}`), `dupeCheck` (ran, skipped), `createdAt`, `filedAt`. Unique on `(accountId, fingerprint)`. `AccountNote.filingId` and `Todo.filingId`, nullable and indexed, link what the filing wrote. The intranet's local type `Filing` at src/lib/intranet/extract.ts:91 renames to `TopicFiling` so the generated client's name is free.

**Reason.** P3 and P4 (CLAUDE.md:405) rule that provenance is columns, and pass 2 C's 47-read sweep shows what namespaced notes cost every reader. The G6 ruling names "the structured read stored with the note," which is a column-linked row, not a body scan. D4 (:303) needs the windows kept somewhere the receipt can read them; D5 and D9 need a held read; D10 needs the signals kept. The pass-1 candidate 9 shape, "a read cached by fingerprint," is this table's held row.

**What would make it wrong.** If the founder wants no schema additions at all, B is the fallback and its JSON goes through the writer with `structured: true` (decision 5) so the redaction reads string values only. If the read's schema is meant to grow into per-entry deal facts (countries, products, headcounts) so the surfaces stop regex-mining, that growth changes what the model is asked and is deferred (§7, item 13); this decision stores what the model returns today.

**The pastehash marker stays.** The `pastehash:` AccountDisposition marker (actions.ts:114-136, :208-232) remains the duplicate key in this plan; the Filing row carries the same fingerprint, so moving the check onto the table's unique constraint is one later slice with a backfill (§7, item 2). The canon's letter at CLAUDE.md:294-295 names the marker, and tests/ingest-defects.test.ts:112 pins that cross-out never clears it.

### 2.2 The single account read

**What is decided.** One read per account per request that every surface consumes, its home, its signature, and the order in which the five corpora and five whose-move spellings migrate onto it.

**Options.**

- A. Leave `corpusFor` and `extractDealIntel` where they are and make every caller pass full rows and a homeSide. Costs: the five whose-move spellings stay; the hide filter stays per page; nothing folds the second record in.
- B. One pure module that takes the loaders' output for one account and returns the twenty fields of pass 2 E. Callers migrate one at a time; the old path stays until the last caller leaves. Costs: a large pure module; a parity test that pins the old answers on the way in; five migrations.
- C. B, but built inside `readDeal` (src/lib/room/engine.ts:193) so the room's engine is the read. Costs: the engine is room-shaped (move, thin, health) and Groundwork, the Sendbook and Accounts would import room copy to get facts.

**Pick: B.** Module `src/lib/record/read.ts`, pure and synchronous:

```ts
readAccount(input: {
  account: { id: string; name: string };
  notes: AccountNote[];        // the wide loader's folded rows for the account, every lane
  touches: Touch[];            // outreach:<id> and the label match, as room/page.tsx:167-171
  todos: Todo[];               // every todo on the account, done included
  dispositions: Map<string, Disposition>;
  secondRecord?: SecondRecord; // folded by canonical id (E17)
  homeSide: readonly string[]; // csms ∪ homeSideFrom, declared, never optional
  digest?: Digest;             // the seed the record outranks
  now: Date;
}): AccountRead
```

`AccountRead` carries the twenty fields of pass 2 E in its order: `docs` (each with `direction`, `sender`, `senderIsHome`, `machinery`, `closer`, `tape`, `at` from `effectiveAt`, `noteId`, `source`, `lane`, `actors`, `recipients`, `hidden`), `lastOutbound`, `lastInbound`, `whoseMove`, `warmth`, `lastMeeting`, `lastTouch`, `hidden`, `homeSide`, `today`, `intel`, `stage`, `relationship`, `theirPromise`, `lastAccepted`, `conversationExists`, `secondRecord`, `countries` and `products` and `headcounts` with the tape flag, `people`, `lastRecordAt`. The hide filter runs inside the read on the one grammar that survived the scaffold (`hide:note:` at room/actions.ts:1455; no `hide:acct:` writer remains), and `docs` keeps hidden rows with `hidden: true` so the Sendbook's warmth and the Accounts' engaged read can choose. `machinery` and `closer` are flags, not exclusions, so the Sendbook keeps warmth from the same doc (pass 2 E, the two-flag rule). `extractDealIntel` at src/lib/intel/extract.ts stays the deal-facts extractor over `docs`; `corpusFor` retires when its last caller leaves.

**Migration order, one slice each.** First room/page.tsx:163-176, because its corpus is already the widest spelling (full rows, hide-filtered, the union at :134-135) so the parity test proves the read changes nothing there. Second groundwork/page.tsx:238-256, because its three divergences (no actors, no recipients, no homeSide; pass 2 B rows 7 and 8) are the ones the Ted doctrine at CLAUDE.md:394-398 and C6 at :276 rule against. Third the drawer's build at pipeline/build.ts:360-370 with `roomGapsRefill` at room/actions.ts:1233-1250 and intake/actions.ts:77-86. Fourth src/lib/sendbook/read.ts over `docs` (warmth and ↩ REPLIED from the flags). Fifth `whoseMove` replaces engine.ts:242-272's input assembly and day.ts:371-402's, and the engine's court goes with it (D25, CLAUDE.md:367-369). Sixth accounts/page.tsx:345-352 reads `lastTouch` beside the rollup's `lastHuman` (C1, :483).

**Reason.** Pass 2 E's closing paragraph names the widest spelling the cites support; the read is that spelling written once. Pass 1 candidate 2's corrected shape is "one account read built per request with a declared homeSide and hide filter, and one whoseMove over it." The pass-4 DEFER on G2 and G4 says this read is the fix for the pipeline report built twice per /room load and the Sendbook built twice across two pages.

**What would make it wrong.** If a surface needs a fact the read does not carry and the fix is a private re-derivation, the read grows instead. If the parity test on room/page.tsx cannot be made to pass on the existing fixtures, the room's current answers were not the widest spelling and the divergence is written into the plan before the slice ships.

### 2.3 The dialect module

**What is decided.** One home for the head alphabet, one sniff, and the source-literal table, with the note grammar left byte-identical.

**Options.**

- A. Leave each reader's regex where it is and widen the legacy alphabet at provenance.ts:200 to accept CT and SN. Costs: eleven modules keep their own copies; the next producer head is another eleven edits.
- B. One module that exports the head alphabet, one sniff, the source-literal table and the predicates over it; every reader imports it; the writer keeps emitting exactly what it emits today. Costs: one PR touching twelve files; the followups suite's text pin on the `"TM"` and `"teams"` literals in room/actions.ts (tests/followups.test.ts:312-314) is rewritten to read the table.
- C. B plus new dialect tokens on the note head for spreadsheets, documents and typed notes. Costs: a grammar change every legacy reader has to learn.

**Pick: B.** `src/lib/ingest/dialect.ts` exports:

- `HEADS`: `OUTLOOK THREAD`, `TEAMS THREAD`, `TEAMS CHAT`, `CALL TRANSCRIPT`, `SALESNAV`, `SPREADSHEET`, `DOCUMENT`, and `TYPED NOTE` for D14's typed head (CLAUDE.md:303, "headed as typed at the row so the reader knows").
- `sniffHead(text)` returning `{ dialect, head }` where `dialect` is one of `OL | TM | CT | SN | SF` as the note head writes it today (actions.ts:172-180) and `head` names the producer head found, if any. TEAMS CHAT sniffs to TM (today it falls to SF).
- `SOURCE_OF(dialect, head, how)` returning the stored literal: `outlook`, `teams`, `call`, `salesnav`, `sf`, `sheet`, `doc`, `typed`, each with `-ai` when the model read it, plus the fixed literals the other writers use (`transcript`, `outcome`, `room`, `research`, `gap`, `playbook`, `activity`, `wire`, `sendbook`, `act-lane`, `scratch`, `touch`, `move`, `done`, `followup`, `disposition`, `sheet`, `pipeline`, `mail-template`).
- Predicates: `isTape`, `isCall`, `isPaste`, `isSalesNav`, `isWire`, and `GLYPH_RE` (`/^[✉✔☎☰] /u`), `LEGACY_HEAD_RE` (provenance.ts:200's shape with the alphabet `SF|OL|TM|CT|SN`).

The note head `${glyph} ${dialect} ${when} — ${subject} · ${actors}` at actions.ts:422-424 is unchanged. Spreadsheets and documents keep the SF token on the head and gain a source literal, so no legacy reader learns a new token. The transcriber's prompt at actions.ts:1737 reads its head names from `HEADS` and emits CALL TRANSCRIPT with a Recorded line when the document reads as a call (D3, :301).

**Readers this module replaces.** actions.ts:172-180 and :353; sf-timeline.ts:271; ai-clean.ts:338; normalize.ts:37-57; signals.ts:107; meeting.ts:15, :29, :35-36; extract.ts:54, :137; provenance.ts:200, :218, :225; clock.ts:15; sendbook/read.ts:102, :133, :175; day.ts:308; mirror.ts:52; pipeline/build.ts:195, :207, :396, :399, :404, :585; groundwork/file.ts:107-111; signals.ts:24; groundwork/page.tsx:232; paste-files.ts:12-34 (`sniffPaste`) and :49-50 (`HEAD_LINE_RE`).

**Reason.** Pass 1 candidate 1's corrected shape is "one dialect module exporting the head alphabet, one sniff, and the source-literal table." Pass 2 D's token table is the contract the module has to honor line by line, and it shows nobody reads CT or SN from the head today because the alphabet at provenance.ts:200 never accepted them. D23 (decree ledger D row 23) rules that `inferActors` exists only for rows filed before the columns, which is why the alphabet widens and nothing else about inference changes.

**What would make it wrong.** If a producer outside the repo (the bookmarklets at src/app/intake/capture-shelf.tsx:33, :98, :131 emit `OUTLOOK THREAD - captured …`, `TEAMS THREAD - …`, `SALESNAV ACCOUNTS - captured …`) changes its head, the table is the one place to add it; if the founder wants new tokens on the note head, that is option C and a grammar decree.

### 2.4 The doors

**What is decided.** Whether the Drop becomes the Chute pre-bound or the two doors become two faces over shared hooks, what the server contract is, and what each door does with a .csv, the roster and a pick.

**Options.**

- A. One component: the Chute takes a `bound` prop and the Drop is that component mounted in the row. Costs: the row's receipt carries affordances the Chute cannot host (pass 1 candidate 7's skeptics: the opened chips, the undo in the TODAY register at room-client.tsx:1568-1629); the face of both doors changes at once, which this plan cannot order.
- B. Two faces over shared hooks and one server contract: `useIngest` (accept, read, route, guard, file, vault, receipt), `useVerdict` (mismatch and pick), `useReceipts` (the ledger), `useUndo`. The faces keep today's look. Costs: two renderings of one verdict stay until the face pass; the hooks are new code beside 3,500 lines of client.
- C. B for the hooks and A for the verdict only (one picker component in both doors now). Costs: a face change without a ship order (CLAUDE.md:380-383).

**Pick: B.** The hooks live in `src/app/room/ingest/`. The server contract:

- `routeText(head, text)` server action (src/app/room/route-actions.ts): the roster never ships to the browser (D13, CLAUDE.md:303). The roster is `routingRoster()` (src/lib/book/roster.ts:20-45) joined with the record's actors and recipients per account (C2, :297), built per request from the AccountNote columns.
- `roomPaste(accountId, text, { force, door, filename })`: `door` is required and stamps every row (P3); the result carries `filingId`, `windows`, `dupeCheck`, and one verdict with both grounds when disputed (D9).
- `roomPasteHeld(filingId, accountId)`: the pick files a held read under the picked account without a second read and without a re-judge; the duplicate check still runs (D5, :303).
- `vaultFile(accountId, formData)`: the server uploads (D8, :307); `githubArchiveGrant` retires and no token leaves the server.
- `roomPasteUndo(filingId)`: takes back every row with that `filingId` (notes, gaps, playbook lines by tail, todos, the outcome marker) and clears the marker.

A .csv on the Drop is refused with "The export goes in the Chute." (read-file.ts:60-61, shipped in the scaffold) and is not vaulted, because a refusal is not a filing and D6 says vaulting is filing (assumption; §7, item 11). The Intranet mounts the same Chute with no roster prop (D1, :301). A pick never re-judges (D5). Bugs 1 and 2 close inside `useIngest` and `useVerdict`: every readable file in a drop is read, and a disputed auto-route keeps its text for the pick because the held filing keeps it on the server.

**Reason.** Pass 1 candidates 6, 7 and 9 give the hook shapes; the skeptics' finding on candidate 7 is why the faces stay two. The brief keeps the face out of this plan, and B is the only option whose plumbing ships behind today's faces unchanged.

**What would make it wrong.** If the face pass decides the two doors are one component, A is the next step and B's hooks are what it stands on; nothing in B is lost.

### 2.5 The fan-out

**What is decided.** Where `absorbRead` lives after the bug pass, who writes a Todo, who owns the gaps and playbook dedupe, and how the door marker is written.

**Options.**

- A. Leave `absorbRead` in room/actions.ts, keep the inline known-sets, keep the five direct `prisma.todo.create` sites, add the door column and stamp it at each writer. Costs: the three inline known-sets (actions.ts:521-534, :572-578, :585-606) stay beside the two other callers that rebuild them (:1183, :1219; playbook/actions.ts:23-34); the Todo tag codec keeps being assembled by hand.
- B. Move the fan-out to `src/lib/ingest/fanout.ts`; `fileGaps` and `filePlaybook` build their own known-sets; a `createTodoRow` sibling of `createAccountNoteRow` carries the tag codec; `createAccountNoteRow` requires `door`. Costs: one extra namespace read inside `fileGaps` and `filePlaybook` when the caller already had the rows (an optional `known` keeps those callers cheap).

**Pick: B.** Their commitments (owner `them`, dropped at actions.ts:519) file as Todo rows tagged `owner: them` with the promised day and the hearer's name from the read, linked by `filingId` (D10, CLAUDE.md:305); a repeated commitment is one loop by `knowledgeKey`; the court reads them through `theirPromise` once the read lands, and `owedByThem` (src/lib/room/owed.ts:88) reads them from the slice that writes them so no row is written with no reader (pass 4 G's rule). The read's signals stay on the Filing row the note links to (assumption on D10's "on the note"; §7, item 12). The outcome files a marker only (D10). `createAccountNoteRow` takes `door` as a required key and `structured?: true` for JSON bodies, under which the redaction runs over string values and never over numeric fields (P4; scaffold A.3's blocker). The three bare creates (draft-actions.ts:260; run.ts:192, :210) route through it.

**Reason.** Pass 1 candidate 3's corrected shape: "fileGaps and filePlaybook own their dedupe; a createTodoRow sibling of createAccountNoteRow carries the codec." The critic's addition there, that the intranet mirrors each opened Todo (runners.ts:173-192), is why the Todo shape needs one writer. P3 rules the door is a column (CLAUDE.md:405). The bug pass already made every row attributable (defects doc, bug 6); `filingId` makes the attribution a column instead of a list the browser carries.

**What would make it wrong.** If Todo must stay migration-free, the filing link rides in the tag codec as `from:<filingId>` (the Spring decree at CLAUDE.md:377-378 says tags survive edits verbatim), at the cost of a body scan on undo (§7, item 6).

### 2.6 Reaching the surfaces

**What is decided.** What "every tab re-derives" (CLAUDE.md:291) means per surface after a filing, and by what mechanism.

**Options.**

- A. Keep `refresh()` and its path list (actions.ts:66-70). Costs: D15 (:305) rules there is no revalidation list and `refresh()` retires; every page is already `force-dynamic`, so the list decides nothing for navigation.
- B. Retire `refresh()`; the door that filed calls `router.refresh()` once so its own page re-renders; every other page derives on its next request. Costs: one line in `useIngest`; 24 call sites edited.
- C. Push: a filing writes to the intranet and revalidates every surface. Costs: contradicts D15 and the intranet's pull design (pass 1 §8).

**Pick: B.** Per surface:

- /room: the door's `router.refresh()` after `roomPaste` returns re-renders the page in place; the registers, the move and THEIRS re-derive from the read (Next 16.2.9, package.json:33; a server action does not re-render the page on its own without a revalidate or a refresh [inferred from framework behavior]).
- /accounts, /groundwork, /sendbook, /playbook: `force-dynamic`; the next request derives; nothing is pushed.
- The Intranet: pull only. A filing reaches the brain on the next sweep (runners.ts:136-171 mirrors record rows through `recordRowsWhere`); the sweep's extractor takes the Filing row's read when `filingId` is set and pays for a model read only for documents with no read (pass 4 G6 ruling).
- The second record: untouched by a filing; the acted sweep (run.ts:1046-1066, `personMoved`) reads the new first-record rows on the next activity pass (D20).

**Reason.** D15 is ruled. The intranet is human-triggered by design (intranet-client.tsx:358-363, :857-866; no cron, no vercel.json). The Chute never calls `router.refresh` today (pass 1 §8), which is why /room relies on `refresh()` and why B must add the one call before the list goes.

**What would make it wrong.** If Next's client router cache is found to keep a dynamic page between navigations in this app's config (next.config sets no `staleTimes`), a `router.refresh()` on focus is the fix, not a path list.

### 2.7 The second record

**What is decided.** Whether this plan touches `src/lib/activity/`, and what the provenance gap costs if it does not.

**Options.**

- A. Do not touch it. Costs: P4 (CLAUDE.md:405) rules a bare row a defect; the writer-policy hole stays (a redaction or door change in write.ts misses run.ts:192 and :210); `fetchSecondRecords` keeps the raw-tail map at read.ts:48-90, so the single read's field 17 cannot fold by canonical id and C1's merge on Accounts reads a shell-keyed second record as absent.
- B. Route the two bare creates through the writer with `door: activity`, `structured: true`, lane `background`, source `activity`, and the export's actors and recipients (P4); fold `fetchSecondRecords` by canonical id (pass 2 E field 17). Leave staging (D17), the acted stamps' first-record store (D18) and the colleague roster (D19) to the second record's own plan.
- C. B plus D17 and D18. Costs: a second refactor inside this one; the staging swap and a new first-record store for acted stamps are not Chute brains.

**Pick: B.** The cost of the gap if untouched is small at read time, because namespaced rows never enter a corpus (`isNamespacedAccountId` at overlay.ts:112), and real at write time, because every P3 test that says "a bare row is a defect" would have to exempt run.ts. B closes that in one small slice.

**Reason.** Pass 1 candidate 10 was refuted on the same-job test but its fact stands: second-record rows carry no lane, actors or recipients, and the intranet digest reads them (runners.ts:263-296 in pass 1's numbering; :194-307 today). P4 is ruled.

**What would make it wrong.** If the second record's plan lands first and moves its writer, this slice becomes a no-op and is dropped.

## 3. Target module map and dependency sketch

New modules:

| Module | Holds | Imported by |
|---|---|---|
| src/lib/ingest/dialect.ts | HEADS, sniffHead, SOURCE_OF, predicates, GLYPH_RE, LEGACY_HEAD_RE | every reader in §2.3; the transcriber; paste-files |
| src/lib/ingest/doors.ts | `DOORS` and the `Door` type | notes/write, ingest/pipeline, act-actions, run.ts, intranet |
| src/lib/ingest/windows.ts | every named window with `{read, of}` (D4): READ_WINDOW_TAPE, READ_WINDOW, TRANSCRIBE_WINDOW, TRANSCRIBE_BYTES, SHEET_WINDOW, DOCX_WINDOW, ENTRY_CAP, TEXT_FLOOR | pipeline, read-file, paste-files, the transcriber |
| src/lib/ingest/guard.ts | `guardPlan({force, text, claim, bound, roster})`, pure, one verdict with both grounds (D9) | pipeline |
| src/lib/ingest/filing.ts | `holdFiling`, `fileFiling`, `undoFiling`, `findFiling`, `readOfNote` over the Filing table | pipeline, undo, intranet extractor |
| src/lib/ingest/fanout.ts | `absorbRead` moved; their loops; ids returned | pipeline |
| src/lib/ingest/pipeline.ts | `filePaste(...)`: sniff, window, fingerprint, dupe, read or rules, guard, rows, fan-out; returns `PasteResult` | room/actions.ts (`roomPaste`, `roomPasteHeld`), intranet capture |
| src/lib/ingest/route.ts | `routeText` over `routingRoster()` ∪ the record's roster (C2) | route-actions.ts, misfile.ts |
| src/lib/notes/write.ts | `createAccountNoteRow` with `door` required and `structured`; `createTodoRow` | every writer |
| src/lib/record/read.ts | `readAccount` and `AccountRead` | room/page, groundwork/page, pipeline/build, sendbook/read, engine, accounts/page, room/actions, intake, ask/live |
| src/lib/record/docs.ts | rows → `docs` with direction, flags, `effectiveAt` | record/read |
| src/lib/record/whose-move.ts | `whoseMove` over the read | record/read; engine; day.ts |
| src/app/room/ingest/use-ingest.ts | handleFiles, swallow, CHUTE_PARALLEL, csv fork by door, `router.refresh` | chute.tsx, room-client.tsx |
| src/app/room/ingest/use-verdict.ts | mismatch and pick state; `roomPasteHeld` | both doors |
| src/app/room/ingest/use-receipts.ts | the ledger over chute-ledger.ts | both doors |
| src/app/room/ingest/use-undo.ts | `roomPasteUndo(filingId)` | both doors |
| src/app/room/route-actions.ts | `routeText` server action | use-ingest |
| src/app/room/vault-actions.ts | `vaultFile` server upload | use-ingest |
| prisma: Filing; AccountNote.door, AccountNote.filingId; Todo.filingId | the structured read and the links | filing.ts, write.ts |

Retired when their last caller leaves: `corpusFor` and `dealIntelFor` (extract.ts:97-130, :436-443), `refresh()` (actions.ts:66-70), `githubArchiveGrant` (archive-actions.ts:13-28), `sniffPaste` and `HEAD_LINE_RE` (paste-files.ts:12-34, :49-50), the engine's `court` (engine.ts:65, :243-272, :424), the inline known-sets, the five direct `prisma.todo.create` sites, the two bare `accountNote.create` sites in run.ts and the one in draft-actions.ts.

```
paste-files (producers, fingerprint)          dialect ──► provenance · meeting · extract · sendbook/read · day
      │                                          │          pipeline/build · normalize · sf-timeline · ai-clean · mirror
      ▼                                          ▼
read-file (browser) ──► use-ingest ──► route-actions ──► ingest/route ◄── roster ∪ record columns
                            │
                            └──► roomPaste (thin door) ──► ingest/pipeline
                                                              ├── windows · fingerprint · filing (held/filed)
                                                              ├── guard (one verdict) · ai-clean | rules-read
                                                              ├── notes/write (door, filingId, structured)
                                                              └── fanout (todos, gaps, playbook, outcome, their loops)
                                                                       │
                                                                       ▼
                                             AccountNote(door, filingId) · Todo(filingId) · Filing(read, windows)
                                                                       │
                       overlay loaders ──► record/read (docs · whoseMove · intel · lastTouch · hidden · secondRecord)
                                                │
                                                ├──► room/page (registers, move, THEIRS) · engine
                                                ├──► groundwork/page · day.ts (exclusions, drumbeat, seats)
                                                ├──► pipeline/build (drawer) · roomGapsRefill · intake · ask/live
                                                ├──► sendbook/read (warmth, ↩ REPLIED)
                                                └──► accounts/page (LAST HUMAN TOUCH merge, engaged)
intranet runners ──► mirror ──► extract (takes Filing.read when filingId is set)
activity/run ──► notes/write (door activity, structured) ──► activity/read (folded by canonical id)
```

## 4. Slices

Dependency order first, then risk. Every slice is one PR: branch off main, chain green (prettier → tsc → eslint at zero warnings → tsx tests → next build), squash merge (CLAUDE.md:587-589). "Must stay green" names chain suites; a text pin the slice has to rewrite is named as such, and the rewrite is part of the slice. Honor-system decrees the slice could break are named with the check that guards them. Sizes: S under a day, M one to two days, L three or more [inferred].

### Slice 1 · The dialect module

- **Files changed:** new src/lib/ingest/dialect.ts; src/app/room/actions.ts:172-180, :353, :1737 (the transcriber emits CALL TRANSCRIPT with a Recorded line when the document reads as a call); src/lib/paste-files.ts:12-34, :49-50; src/lib/sf-timeline.ts:271; src/lib/intel/ai-clean.ts:338; src/lib/intranet/normalize.ts:37-57; src/lib/intel/meeting.ts:15, :29, :35-36; src/lib/intel/extract.ts:54, :137; src/lib/intel/provenance.ts:200, :218, :225 (alphabet widened to CT and SN); src/lib/intel/clock.ts:15; src/lib/sendbook/read.ts:102, :133, :175; src/lib/groundwork/day.ts:308; src/lib/groundwork/signals.ts:24, :107; src/lib/groundwork/file.ts:107-111; src/app/groundwork/page.tsx:232; src/lib/pipeline/build.ts:195, :207, :396, :399, :404, :585; src/lib/intranet/mirror.ts:52.
- **Unchanged:** the written head at actions.ts:422-424; every producer head in paste-files.ts:212-225, :317-335, :462-475, :488-507; the bookmarklets; the source literals already stored.
- **Must stay green:** paste-files, sf-timeline, rules-read, ai-clean, ai-noise, extract, provenance, closer, accepted-invite, room-read, pipeline-fixes, live-motion, touch, self-task-touch, canon/chute ("the same body under two filenames fingerprints equal" and its siblings), canon/sendbook, canon/ted-doctrine ("a note with actors produces a doc carrying those actors as its people and sender"). Text pin to rewrite: followups.test.ts:312-314 reads the `"TM"` and `"teams"` literals from the table instead of room/actions.ts.
- **Tests added:** tests/ingest-dialect.test.ts: every producer head sniffs to its dialect and TEAMS CHAT to TM; every stored source literal maps through the table and the predicates agree with meeting.ts's old answers on its fixtures; the legacy alphabet infers actors from a CT and an SN head; a byte-for-byte pin that the written head is unchanged on the read-absorption fixtures; the transcriber's prompt names every head from `HEADS`.
- **Decrees it could break:** the note grammar (pass 2 D) is held by the byte pin; the Chute's VTT clause (CLAUDE.md:283-285) by paste-files "vttToPaste heads the capture as a CALL TRANSCRIPT"; D23's "inferActors exists only for rows filed before the columns" holds because inference is still the load-time fallback at overlay.ts:149 and nothing new calls it; D3 (:301) is what the transcriber change delivers.
- **App verification:** drop a Teams chat copy on the Chute and see `☎ TM` on the row; drop a PDF of a call and see the tape's archive fold (`☰ Call transcript —`) and the recorded day on the note.
- **Rollback:** revert the squash; no data changes.
- **Size:** M.

### Slice 2 · One Chicago day

- **Files changed:** src/lib/tz.ts gains `chicagoDay(iso | Date)` beside `userDayKey`; the private copies at src/lib/room/loss.ts:41, sheet-view.ts:130, owed.ts:38, src/lib/scratch.ts:40, src/lib/intel/rules-read.ts:21, src/lib/intranet/ledger.ts:99 and src/app/room/chute-ledger.ts:85 import it.
- **Unchanged:** `dayStamp` at src/lib/today/build.ts:383 and `morningDoneKey`, which wait on the clock ruling pass 3 E flagged (tests/today.test.ts:655 pins UTC; §7, item 9).
- **Must stay green:** today, room-bind ("Chicago move-done key"), brief, closer ("the wall chip carries the promise"), scratch is hand-run, canon/chute ("the ledger is per Chicago day"), canon/closer-rule.
- **Tests added:** tests/tz.test.ts: the seven call sites' inputs give the same key at 19:30 and 00:30 Chicago either side of midnight.
- **Decrees it could break:** the closer rule's "All days are Chicago days" (CLAUDE.md:421) is what the fold serves; the UTC pin at today.test.ts:655 is untouched.
- **App verification:** the Scratchpaper's TODAY kicker and the Chute ledger's day agree at 7 PM Chicago.
- **Rollback:** revert.
- **Size:** S.

### Slice 3 · The door column and the writer contract

- **Files changed:** prisma/schema.prisma adds `AccountNote.door String @default("")` and a migration; new src/lib/ingest/doors.ts; src/lib/notes/write.ts makes `door` a required key of `NewAccountNote`, adds `structured?: true` (redaction over string values only), and adds `createTodoRow({ body, tags, accountId, remindAt, filingId? })` carrying `withTags` (src/lib/today/route-notes.ts:101) and `urgencyForDue` (src/lib/room/deliverables.ts:45); every caller of `createAccountNoteRow` names its door (room/actions.ts, sheet-actions.ts, ledger-actions.ts, pipeline-actions.ts, groundwork/actions.ts, accounts/act-actions.ts, scratch/actions.ts, room/gaps.ts, playbook/store.ts, dashboard/complete.ts); the five `prisma.todo.create` sites (room/actions.ts:547, :819, :1350, :1536; accounts/act-actions.ts:180; src/lib/today/mirror.ts:25) call `createTodoRow`; draft-actions.ts:260's bare create goes through the writer with `door: "hand"`.
- **Unchanged:** run.ts:192 and :210 (slice 17); the bodies and heads every writer emits.
- **Must stay green:** canon/ted-doctrine ("lane defaults to mine; provenance and recipients ride on the first tier", "a stated lane, actors, source and moment are kept", "the Scratchpaper's carve-out keeps figures", "an unmigrated table degrades tier by tier, still redacted"): the door rides on the provenance tier and the tier fallback keeps degrading; read-absorption's redact scan; act-lane; canon/act-lane; room-parity; followups.
- **Tests added:** tests/canon/provenance.test.ts: every `createAccountNoteRow` call in src passes a `door` from `DOORS` (a source scan); no `accountNote.create` exists outside write.ts and run.ts (run.ts leaves the exemption in slice 17); a structured body keeps `1,234` in a numeric field and redacts `$1,234` in a string; `createTodoRow` writes the tag codec `splitTags` reads back unchanged.
- **Decrees it could break:** the money doctrine (CLAUDE.md:582-583) is held by canon/ted-doctrine's redaction tests and the new structured-body test; P3 (:405) is what the slice delivers; the Spring's "tags survive verbatim" (:377-378) by the codec round-trip test.
- **App verification:** run the migration; file a paste on the Drop and see `door = drop` on the new rows in the database; open a todo from it and edit the line, tags intact.
- **Rollback:** revert the squash; the column stays and is harmless (default ""), or the down migration drops it.
- **Migration:** the founder runs `npm run db:migrate:deploy` against Supabase before the PR merges, or the build script gains `prisma migrate deploy` (§7, item 15).
- **Size:** M.

### Slice 4 · The Filing table and the stored read

- **Files changed:** prisma/schema.prisma adds `Filing` (§2.1), `AccountNote.filingId String?` with an index, `Todo.filingId String?` with an index, and a migration; src/lib/intranet/extract.ts:91 renames `Filing` to `TopicFiling` (with its importers); new src/lib/ingest/filing.ts and src/lib/ingest/windows.ts; src/app/room/actions.ts `roomPaste` writes the Filing row before the notes, stamps `filingId` on every row and todo the filing writes, stores the sanitized read, records every window that cut something (:186-191 and the transcriber's :1755) and the duplicate check's outcome (:230-232) on the row, returns `filingId`, `windows` and `dupeCheck`; the archive note (:351-376) and the no-entries note (:395-414) keep the text whole (D4); the receipts at chute.tsx:372-414 and room-client.tsx:502-521 carry the windows sentence and the D7 sentence.
- **Unchanged:** the pastehash marker and its check; the guard order; the fan-out (slice 6 moves it); the picker.
- **Must stay green:** ingest-defects ("absorbRead hands back the ids of everything it wrote", "roomPasteUndo takes back notes in every namespace the filing wrote, and the todos", "both doors hand the todo ids to the undo"); misfile-guard (the roomPaste slice pins hold because the function keeps its name and order); read-absorption; second-record-faces; vault; canon/chute; canon/ted-doctrine.
- **Tests added:** tests/ingest-filing.test.ts: a filing's read round-trips through the sanitizer unchanged; every row and todo the filing wrote carries its id; the windows list names what was cut of what arrived; a keyless filing stores a null read and `how: rules`; the tape's archive note is the whole text; the no-entries note is the whole text; the receipt sentence reads "Read 60,000 of 212,000 characters." and "The duplicate check didn't run." from the result.
- **Decrees it could break:** D4 and D7 (CLAUDE.md:303) are what it delivers; the Chute's "same pipeline a paste takes" (:287) holds because `roomPaste` is still the one door; the money doctrine holds because the stored read passes `sanitizeAiResult` (ai-clean.ts:214-218 redacts every string) and the archive note still passes `redactMoney`; the writing canon governs the two new receipt sentences (imperative not needed, they state facts; six words is not a budget for receipts, which are drilldown copy under the click-depth law).
- **App verification:** drop a 300,000-character transcript on the Chute and read the windows line on the receipt; file a paste twice and see the duplicate refusal still name "Already on file."; pull the database and see the Filing row with its read.
- **Rollback:** revert; the table and columns stay empty and harmless, or the down migration drops them.
- **Size:** L.

### Slice 5 · One verdict and the held read

- **Files changed:** new src/lib/ingest/guard.ts (`guardPlan`, pure); src/app/room/actions.ts `roomPaste` runs the read first when the key is on, then one `guardPlan` over the text and the read's claim, and on a dispute writes the Filing row as `held` with the read and returns one mismatch carrying both grounds, the candidates and `filingId`; new `roomPasteHeld(filingId, accountId)` files the held read under the picked account with no read and no re-judge, the duplicate check still running (D5); keyless sessions get the text rung alone; src/lib/intel/misfile.ts keeps its two rungs as functions `guardPlan` composes.
- **Unchanged:** the picker and the banner (slice 8 rewires them; until then both doors call `roomPaste` with `force: true` on a pick as today, which now files the held read by fingerprint lookup inside `roomPaste` rather than re-reading).
- **Must stay green:** misfile-guard's behavior half (`judgeFiling` returns a verdict, never throws; "the guard returns a verdict, never throws"); ingest-defects ("the blocking behavior is unchanged: a disputed read holds for the pick", "the keyless early rung stands on the text's own evidence"); route-capture; canon/chute. Text pins to rewrite: misfile-guard.test.ts:135-157 pins the early rung before the read; D9 is ruled, so the pin becomes "one verdict, both grounds, before anything shows" and "the guard runs before any row is written".
- **Tests added:** tests/ingest-guard.test.ts: a rival account above the floor and a claim that fails `accountMatches` produce one verdict with two grounds; a keyless filing produces the text rung alone; a held row filed by the pick writes no second read (the model client is a counter in the test); the pick against a duplicate under the picked account is refused; a held row older than its Chicago day is swept.
- **Decrees it could break:** "Nothing files blind" (CLAUDE.md:290-291) holds because a dispute still waits; D5 and D9 (:303) are what it delivers; the pass-4 duplicated-read count falls by the forced re-reads it counted.
- **App verification:** drop a thread that names another PEO on a bound row; see one banner with both grounds; pick; confirm in the database that one Filing row exists, `held` then `filed`, and the model was called once (the health latch's counter in the logs).
- **Rollback:** revert; held rows, if any, are swept by the next day's read.
- **Size:** L.

### Slice 6 · The fan-out module

- **Files changed:** new src/lib/ingest/fanout.ts (`absorbRead` moved from room/actions.ts:495-629); src/lib/room/gaps.ts `fileGaps` builds its own known-set (optional `known` accepted); src/lib/playbook/store.ts `filePlaybook` likewise; the callers at room/actions.ts:1183-1213 (`roomResearch`), :1219-1263 (`roomGapsRefill`) and src/app/playbook/actions.ts:23-34 drop their inline sets; their commitments file as Todo rows through `createTodoRow` with tags `owner: them`, the hearer's name and the promised day, linked by `filingId` (D10); `owedByThem` at src/lib/room/owed.ts:88 reads them beside its regex so the sheet's court sees them from this slice; `roomPasteUndo` (actions.ts:889-955) takes back by `filingId` and keeps accepting the id lists until slice 8 stops sending them.
- **Unchanged:** the outcome marker's marker-only rule; the Todo model beyond slice 4's column.
- **Must stay green:** ingest-defects (all nine); read-absorption (its pure-helper tests on the fan-out at :135-330 in the defects doc's numbering; it pins export names `roomGapsRefill`, `roomResearch`, `roomActionUndo`, which stay); misfile-guard (the `absorbRead(` literal moves: the roomPaste slice pin at :135-137 is rewritten to the new import name); room-judgment; room-sheet is hand-run; canon/closer-rule ("a hand-typed dated action past its day reads as a plain wall, never PROMISED"), which their-loop rows do not touch because they carry a hearer by construction.
- **Tests added:** tests/ingest-fanout.test.ts: a read with two owner-them actions writes two loops with the hearer and the day; the same commitment twice is one loop; `fileGaps` without `known` dedupes against its namespace; `filePlaybook` likewise; undo by filing id removes every row and todo it wrote and nothing else; a `fileCompletion` note keyed by an opened todo is taken back with its todo (the defects doc's open item).
- **Decrees it could break:** D10 (CLAUDE.md:305); D28 (:425, "PROMISED needs a hearer") holds because a their-loop names its hearer; "the record's own entries are never unwritten" (:352-353) holds because undo takes back only rows the filing wrote; the click-depth law is not touched because nothing new renders yet.
- **App verification:** file a thread where the prospect promises a document by Friday; see "Adam owes the model. / Promised Friday." in the move line (the engine reads `owedByThem` today) and no new register row yet (the register seat is the face's, §5.4); undo the paste and see the loop go.
- **Rollback:** revert.
- **Size:** M.

### Slice 7 · Routing and the vault on the server

- **Files changed:** new src/lib/ingest/route.ts (`routeText` over `routingRoster()` joined with a per-account roster read from the AccountNote `actors` and `recipients` columns, memoized per request); new src/app/room/route-actions.ts; new src/app/room/vault-actions.ts (`vaultFile(accountId, formData)` calling `archiveFileToGitHub` server-side with the token from env); src/lib/github/archive.ts loses the grant type; src/app/room/archive-actions.ts retires; chute.tsx:157-195 and room-client.tsx:560-586 call `vaultFile`; chute.tsx:45-51 drops the `roster` prop and :276-287 calls `routeText`; room/page.tsx:841 and intranet/page.tsx:120 stop passing the roster; src/lib/intel/misfile.ts:75-84 takes the joined roster.
- **Unchanged:** `routeCapture` itself (pure, src/lib/route-capture.ts); the rungs and their scores; the vault's path and collision rule (archive.ts:118-150).
- **Must stay green:** route-capture (all); canon/chute ("routingRoster() carries emails, domains, people and aka for every account", "the people rung routes a capture that only names a known person"); misfile-guard's behavior half. Text pins to rewrite: vault.test.ts:113-114 (`void archiveFiles(unreadable)` / `(waiting)`) and :368-369 (`<Chute roster=`), second-record-faces.test.ts:913-917 keep their identifiers.
- **Tests added:** tests/ingest-route.test.ts: an address the book lacks and the record holds routes by the email rung; a person the record names routes by the people rung; the joined roster is built from the columns and not from bodies; after the filing that taught an address is undone, the address routes nowhere (by construction: the rows are gone); no client module imports roster.ts (a source scan); no server action returns a token (a scan of archive-actions' absence and vault-actions' return type).
- **Decrees it could break:** D13 and C2 (CLAUDE.md:297, :303) and D8 (:307) are what it delivers; "pure rules, no API needed" (:285-286) holds because `routeText` calls no model; the vault's size lane (archive.ts:14, 25 MB) meets the platform's request cap for server functions, which is below it [inferred from Vercel's published limits]: files above the cap are §7, item 5.
- **App verification:** drop an .eml from an address only the record has seen; see it route without a pick; drop a 3 MB PDF and find it in the vault under the account; check the browser's network log for no GitHub request.
- **Rollback:** revert; the vault path is unchanged so nothing lands twice.
- **Size:** M.

### Slice 8 · The shared door hooks

- **Files changed:** new src/app/room/ingest/use-ingest.ts, use-verdict.ts, use-receipts.ts, use-undo.ts; src/app/room/chute.tsx (`swallow`, `handleFiles`, `fileTo`, `vaultTo`, the picker's handlers at :117-148, :260-321, :480-555) and the Drop in src/app/room/room-client.tsx (`filePaste`, `readDroppedFile`, `handleFiles`, `undoPaste`, the banner's handlers at :487-610, :742-765, :1987-2031) call the hooks; the Drop reads every readable file (bug 2); a disputed auto-route keeps its text through the held filing (bug 1); the pick calls `roomPasteHeld`; a refused .csv on the Drop is not vaulted (room-client.tsx:547); the read-only bar renders with "Read-only session" where the ⇪ button was (D29, chute.tsx:559); tests/ingest-defects-deferred.test.ts's two tests join package.json's chain.
- **Unchanged:** the look of both doors; the ledger codec (chute-ledger.ts); the second-record swallow (`swallowActivity`, chute.tsx:201-258, and the dock) beyond calling the shared reconcile.
- **Must stay green:** vault, second-record-faces (chute pins :913-917 stay: the identifiers move into use-ingest and the pin reads that file), ingest-defects, misfile-guard, canon/chute, room-parity (the action names reaching room-client.tsx change to the hooks' names: text pin rewritten), today-register (its small room-client pin). Text pins to rewrite: misfile-guard.test.ts:123-126 (`readDroppedFile(f, [f])`, the archive-after-accept order) and vault.test.ts:113-114, :156 (`type ChuteItem = LedgerRow & {`).
- **Tests added:** the two deferred tests go green and move into tests/ingest-defects.test.ts; tests/ingest-hooks.test.ts on the pure reducers inside the hooks: two readable files on a row both reach the pipeline; a verdict with both grounds renders once; a pick files the held id; a refused file is neither read nor vaulted; the read-only state renders the bar and no input.
- **Decrees it could break:** "The per-row Drop stays" (CLAUDE.md:292) holds: the Drop keeps its seat and look; "read on the spot" (:283) holds; D11 (three at once) by canon/chute's `runLimited` tests; D29 (:309) is what it delivers; the Spring's "filing anything springs TODAY open" (:364-365) holds because the row's receipt path is the same call.
- **BLOCKED ON FACE:** the unified verdict rendering (one component in both doors) and any change to the receipt's shape. The hooks ship behind today's two renderings.
- **App verification:** drop two .eml files on a row and see two receipts; drop a disputed thread on the Chute, reload, pick, and see it filed, not vaulted; open the room in a read-only session and see the bar.
- **Rollback:** revert.
- **Size:** L.

### Slice 9 · refresh() retires

- **Files changed:** src/app/room/actions.ts:66-70 and its 24 callers; src/app/room/ledger-actions.ts and sheet-actions.ts where they import it; use-ingest.ts calls `router.refresh()` once after `roomPaste` returns; the other doors that relied on it (the Act Lane's `router.refresh` at act-lane.tsx per pass 4 G9 already refreshes itself).
- **Unchanged:** every page's `force-dynamic`.
- **Must stay green:** room-parity; read-absorption; canon/standing-decrees ("every live row's href resolves to a page on disk").
- **Tests added:** a source scan in tests/canon/chute.test.ts: no `revalidatePath` call remains under src/app/room; use-ingest calls `router.refresh` after a filing.
- **Decrees it could break:** D15 (CLAUDE.md:305) is what it delivers; "every tab re-derives" (:291) holds by force-dynamic and the refresh; P1 (:590-591) holds because no revalidation list exists to name an archived surface.
- **App verification:** file on the Drop and see the row's registers update without a reload; navigate to /accounts and see the new note's LAST HUMAN TOUCH.
- **Rollback:** revert.
- **Size:** S.

### Slice 10 · The single read, part 1: the module and the HomeRoom

- **Files changed:** new src/lib/record/read.ts, docs.ts, whose-move.ts; src/app/room/page.tsx:114-176 builds `readAccount` per row and reads `docs`, `intel`, `hidden`, `lastTouch`, `relationship`, `people`, `lastAccepted`, `lastRecordAt`, `secondRecord` from it (:203-215, :252-271, :334-348, :382-397, :399, :521-545); THEIRS leads only with gems whose person is an account person and takes `var(--blue)` (C16: room.module.css:2182, page.tsx:521-524; the six other `#8a5a00` literals in that stylesheet at :817, :850, :853, :920, :934 and :1400 are not the THEIRS line and are outside C16's ruling, see §6); `latestResearchAt` and the research chip are untouched (already ruled and pinned).
- **Unchanged:** `corpusFor` and `extractDealIntel` (still called by the other four sites); `readDeal`'s inputs (slice 14 changes them); the row's markup.
- **Must stay green:** room-read, room-engine, room-judgment, intraday-court, move-line, accepted-invite, extract, intel, relationship is hand-run, brief, canon/ted-doctrine, canon/spring, second-record-faces (THEIRS pins: the ochre literal is a text pin to rewrite to the palette token).
- **Tests added:** tests/record-read.test.ts: parity, the read's `intel` equals `extractDealIntel(corpusFor(...))` on every fixture the extract and room-read suites hold; the hide filter inside the read matches page.tsx:159's; `docs` carries `machinery` and `closer` as flags on the closer suite's fixtures; `secondRecord` folds a shell-keyed drop under the canonical id; THEIRS's lead skips a colleague's gem.
- **Decrees it could break:** the Ted doctrine's widest-source clause (CLAUDE.md:394-398) is what it delivers; the closer rule (:411-416) by canon/closer-rule and the flags test; the research chip's "latest of both stores" (:374-376) untouched and pinned by canon/ted-doctrine; C16 (:485) is what the THEIRS change delivers; the design canon's palette (:11-16) by the token.
- **App verification:** open /room and compare every row's move, meta and THEIRS against the previous deploy on the same data; a colleague's gem no longer leads THEIRS.
- **Rollback:** revert; the read module stays unused.
- **Size:** L.

### Slice 11a · The single read, part 2: Groundwork and the exclusion

- **Files changed:** src/app/groundwork/page.tsx:225-260 reads `intel` from `readAccount` with the actors, recipients and the home-side union restored; src/lib/groundwork/day.ts:82-107 `liveMotionIds` reads the second record's attributed inbound (D19: a row with an attributed inbound body that passes the machinery and closer reads; an account-level datetime alone never excludes) beside the first record's; the seat that follows its account reads on the HomeRoom's TODAY register as the account's own action when the account is excluded (C8's HomeRoom half: src/lib/room/sheet-view.ts reads `seat:<id>` rows for excluded accounts); the who chip row at groundwork/page.tsx:797-806 offers the read's `people` merged with `contactsFor` and asks only when the merged set holds more than one name (C18).
- **Unchanged:** the org silence-bump at day.ts:371-402 (slice 11b); the queue rules' weights; the Klaxon.
- **Must stay green:** groundwork, live-motion, canon/groundwork (all sixteen), canon/sendbook, second-record-faces (the silence-bump org tests at its :452-487 in the pass-3 numbering stay until 11b), sendbook is hand-run.
- **Tests added:** in tests/record-read.test.ts: Groundwork's intel now equals the room's on the same account (the pass 2 B rows 7 and 8 fixtures: a CT send is the last outbound on both; an account-person-to-account-person mail is not inbound on both); an export row with an attributed inbound body excludes for 21 days; an account-level datetime alone does not; the who chip row asks with two names and not with one; a seat on an excluded account reads on the sheet as open.
- **Decrees it could break:** "The operator's own outbound never excludes" (CLAUDE.md:273-274) by live-motion; C6 (:276) and D19 (:489) are what it delivers; C8 (:521) the HomeRoom half; C18 (:356); the vehicle rule and the caps by canon/groundwork.
- **App verification:** an account whose reply landed in a colleague's inbox leaves the wing; its seat, if any, shows on the room's TODAY register; the Worked-it chip row asks who only when two names exist.
- **Rollback:** revert.
- **Size:** M.

### Slice 11b · The coordination move leaves Groundwork

- **Files changed:** src/lib/groundwork/day.ts:371-402's org variant of silence-bump retires; the read's `secondRecord` exposes colleague gems as coordination moves; the HomeRoom row renders them in the seat the face decides.
- **Must stay green:** canon/groundwork; second-record-faces (its org silence-bump tests are rewritten to the HomeRoom seat).
- **Tests added:** the coordination move never reaches `buildQueue`'s output; it reaches the room's row.
- **Decrees it could break:** "Yesterday carries. The room never quietly forgets" (CLAUDE.md:60-62): retiring the Groundwork move before the room shows it would forget a move, so this slice does not ship until the seat exists.
- **BLOCKED ON FACE:** the colleague coordination move's seat on the HomeRoom row (C16's ruling leaves it to pass 6; §5.5).
- **Size:** S once unblocked.

### Slice 12 · The single read, part 3: the drawer, the asks and intake

- **Files changed:** src/lib/pipeline/build.ts:347-370 reads `docs` and `intel` from the read the page already built (room/page.tsx:798-833 hands the reads down; pipeline-actions.ts:71-81 builds them); src/app/room/actions.ts:1220-1250 (`roomGapsRefill`) takes the read's `docs` (full rows, hidden filtered, the shell id folded); src/app/intake/actions.ts:77-86 likewise; src/lib/ask/live.ts:88-100 reads `relationship` and `lastInbound` from the read; build.ts:396-404 and :585 use `lastMeeting` and the dialect predicates; the pipeline report built twice per /room load (pass 4 G2) becomes once by construction.
- **Unchanged:** the drawer's markup; the minter's prompt.
- **Must stay green:** pipeline-fixes, pipeline-build is hand-run, pipeline-report is hand-run, ask-live is hand-run, read-absorption ("roomGapsRefill" name pin), room-read.
- **Tests added:** tests/record-read.test.ts: the drawer's `record` for a card equals the room's read on the same rows; the minter's corpus includes the CEO thread filed under the shell id (pass 2 C's actions.ts:1252 row); `ask/live` says "no reply has been filed" only when `lastInbound` is empty.
- **Decrees it could break:** the meat law (CLAUDE.md:468-475) untouched; the Ted doctrine's widest source is what it delivers; "the ask builder wants no inbound test" (pass 2 E) is kept as a comment on the read's `docs`, since `roomGapsRefill` never reads direction.
- **App verification:** open the drawer and compare rows with the previous deploy; press ⟳ on a row whose record sits under a shell id and see the minted asks cite it.
- **Rollback:** revert.
- **Size:** M.

### Slice 13 · The single read, part 4: the Sendbook

- **Files changed:** src/lib/sendbook/read.ts:97-170 (`recordSends`, `theirVoice`, `warmDates`, `inboundDates`) read `docs` and their flags: a send is a doc with `direction: out`, not a meeting, not self-addressed, at `effectiveAt`; warmth is any doc whose sender is not home and not machinery, closers kept; ↩ REPLIED needs a doc that is `in`, not machinery, not a closer; `orgSignals` folds through `secondRecord` under D19's gate; src/app/sendbook/page.tsx:70-105 and groundwork/page.tsx:209-214 build the register from the same read, so the two builds agree (pass 4 G4).
- **Unchanged:** the lanes' names and the step counting.
- **Must stay green:** canon/sendbook (all), sendbook is hand-run, touch, self-task-touch, groundwork.
- **Tests added:** in tests/canon/sendbook.test.ts: the register built from the read equals the register built from rows on every existing fixture; Groundwork's and /sendbook's registers agree on an account with an org inbound.
- **Decrees it could break:** the Sendbook's lane law (CLAUDE.md:346-352) and C4, C5 (:356) by canon/sendbook; "their voice" meaning the account's people (:485) by the `senderIsHome` flag.
- **App verification:** /sendbook and Groundwork's Tallyfoot agree on the week's counts.
- **Rollback:** revert.
- **Size:** M.

### Slice 14 · The single read, part 5: whose move

- **Files changed:** src/lib/room/engine.ts:193-280 takes `whoseMove`, `lastInbound`, `lastMeeting`, `lastAccepted`, `theirPromise` from the read and drops its own assembly at :199-233; the engine's `court` (:65, :243-272, :424) is deleted (D25); tests/room-read.test.ts:63, tests/pipeline-fixes.test.ts:186-212 and tests/accepted-invite.test.ts:415-483 assert the move line's who-and-when instead of the court string (scaffold A.3's first row); src/lib/groundwork/day.ts:371-402's drumbeat reads `whoseMove`; src/lib/pipeline/build.ts:498-547 and report.ts:237-315 read `theirPromise` and `whoseMove`.
- **Unchanged:** the move sentences at engine.ts:329-417.
- **Must stay green:** intraday-court (pins the move line since the scaffold), move-line, room-engine, room-judgment, accepted-invite (rewritten assertions), pipeline-fixes (rewritten), room-read (rewritten), canon/spring, canon/closer-rule.
- **Tests added:** tests/record-read.test.ts: the five whose-move fixtures from pass 2 B rows 1 to 5 give one answer each; a self-addressed SF task never flips the court; a colleague's mail never flips it; an acceptance books; a closer changes nothing; a same-day morning reply answers an afternoon send.
- **Decrees it could break:** the closer rule (CLAUDE.md:411-416); the Spring's retired court (:367-369) is what it delivers; "the move already says who and when" holds by intraday-court.
- **App verification:** the room's move lines are unchanged on the same data; the drawer's "they owe a reply" agrees with the room's move.
- **Rollback:** revert.
- **Size:** M.

### Slice 15 · The single read, part 6: Accounts

- **Files changed:** src/app/accounts/page.tsx:345-352 shows the later of the read's `lastTouch` and the rollup's `lastHuman` and whispers which record it came from (C1); :379 reads `conversationExists` for engaged; :229-232's newest-note clock reads `lastRecordAt`; :237's `relationshipFor` reads the read's `relationship`; src/app/accounts/accounts-client.tsx:1067-1086 renders the whisper.
- **Unchanged:** the three columns' names and order (CLAUDE.md:455-459).
- **Must stay green:** second-record-faces (the LAST HUMAN TOUCH pins are rewritten to the merged value), activity-rollup, account-facts is hand-run, board-lift is hand-run.
- **Tests added:** tests/record-read.test.ts: an .eml filed Sep 22 beats an export row of Sep 10 and whispers "record"; the export wins the other way and whispers "salesforce"; an inbound with no send reads engaged on both Accounts and Groundwork.
- **Decrees it could break:** C1 (CLAUDE.md:483) is what it delivers; the meat law's drills are untouched.
- **App verification:** file an .eml on a row and see /accounts's LAST HUMAN TOUCH move to today with the whisper.
- **Rollback:** revert.
- **Size:** M.

### Slice 16 · The Intranet's capture through the pipeline, and the extractor takes the read

- **Files changed:** src/app/intranet/actions.ts:103-204 (`intranetCapture`) calls `routeText`; a capture that names an account files through `filePaste` with `door: "intranet"`, routed, guarded and picked like the Chute's (a dispute returns the verdict to the Send-it box, which hands it to the mounted Chute's `useVerdict`); a capture that names none stays an `intranetDoc` and is never inbound (P2); src/app/intranet/runners.ts:688-699 and src/lib/intranet/extract.ts:209 take `Filing.read` for a mirrored note whose `filingId` is set and call the model only for documents with none; mirrorTodo (runners.ts:173-192) carries the note's read.
- **Unchanged:** the mirror's dedupe by checksum; the ⟳ trigger; the D30 exclusion.
- **Must stay green:** intranet (hand-run, and the chain's read-absorption pins on MODEL_EXTRACT), canon/chute ("every namespace the app defines is excluded"), canon/standing-decrees ("the roster has slots, and every one is Opus or better").
- **Tests added:** tests/intranet-capture.test.ts: a capture naming a known address files an AccountNote with `door: intranet`; one naming nothing writes an intranetDoc and no note; the extractor's model client is not called for a doc whose note has a read; the claims it emits from a stored read equal the claims it emitted from the model on the same fixture (parity on the extract suite's fixtures).
- **Decrees it could break:** P2 (decree ledger D, ruled) is what it delivers; "Opus or better" (CLAUDE.md:592-595) holds because the roster is unchanged; the intranet digest's "staged bodies never enter the brain" (:465-466) holds because the Filing read carries entries the note already carries, sanitized.
- **BLOCKED ON FACE:** how the Send-it box shows a dispute (§5.8); until then the capture files when routing is sure and stays an intranetDoc when it is not, with a receipt line saying so.
- **App verification:** paste a thread into Send-it; see it on the account's row; run the sweep and see no second model read in the logs for that note.
- **Rollback:** revert.
- **Size:** M.

### Slice 17 · The second record's writer

- **Files changed:** src/lib/activity/run.ts:186-214 (`replaceNote` and the manifest write) call `createAccountNoteRow` with `door: "activity"`, `structured: true`, lane `background`, source `activity`, and the export's actors and recipients (P4); the update path stays as the replace-forward write it is; src/lib/activity/read.ts:48-90 folds by canonical id (E17); the paired narrow reads at src/app/activity/evidence/route.ts and act-actions.ts:131 fold with it (pass 2 C).
- **Unchanged:** staging (D17), the acted stamps (D18), the colleague roster (D19's first half).
- **Must stay green:** activity-harness, activity-parse, activity-rollup, canon/second-record, second-record-faces, activity-gems is hand-run; tests/canon/provenance.test.ts loses its run.ts exemption.
- **Tests added:** in tests/canon/provenance.test.ts: a second-record row carries lane, actors, recipients, source and door; its JSON body keeps its counts and redacts a currency string in a campaign title; a drop keyed by a shell id reads under the canonical account.
- **Decrees it could break:** "bodies and recipients never do [upload]" (CLAUDE.md:489) holds because the writer takes the export's columns the slice already carries, not bodies; the money doctrine by the structured redaction test; P4 (:405) is what it delivers.
- **App verification:** drop the weekly export; pull a `gems:` row and see its provenance columns; the Accounts gem column is unchanged.
- **Rollback:** revert; rows written bare before the slice stay bare and are a known set.
- **Size:** S.

### Slice 18 · The verdict face and the receipt face

- **What it is:** one verdict component in both doors showing both grounds and the candidates; the receipt's shape at both doors (windows, door, rung, the undo); the read-only bar's look; their loops' register seat; the coordination move's seat; the Send-it box's dispute. Every mechanism it needs ships in slices 4 to 16.
- **BLOCKED ON FACE.** Not ordered here. The mockup triptych for it is the founder's to call (CLAUDE.md:379-383).

Order and count: 19 slices (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11a, 11b, 12, 13, 14, 15, 16, 17, 18). Slices 11b and 18 are BLOCKED ON FACE; slice 8 and slice 16 ship with one part each marked BLOCKED ON FACE and the rest live. Slices 1, 2, 3 and 17 can run in any order among themselves; 4 needs 3; 5 needs 4; 6 needs 3 and 4; 7 needs nothing but is placed before 8 because 8 wires its actions; 8 needs 5, 6 and 7; 9 needs 8; 10 needs 1 and 2; 11a to 15 need 10 in order; 16 needs 4, 7 and 10; 11b and 18 need the face.

## 5. Face questions

Each names today's behavior at the door with its cite, what the plumbing carries after the slices above, and what the mockup has to decide.

1. **The Chute's picker.** Today: a mismatch banner reads "Reads like {claim}. Pick the account." and shows the claim only (chute.tsx:482-485), a batch-mate button (:493-519) and a select (:520-553); every choice files with force. After: the verdict carries both grounds, the candidates with their rungs and whys, and the held filing's id; the pick files without a read. Decide: what a disputed filing looks like on the Chute, and whether it is the same component as the Drop's banner.
2. **The Drop's banner.** Today: a two-sided banner shows both accounts and their whys (room-client.tsx:1996-2001), "No — it's X's ✓" re-runs the read (:2003-2020), "keep it out ✕" drops the held files (:2021-2028). After: the same verdict object; the force button files the held read; the held files are vaulted or not by one rule. Decide: the banner's shape, and what "keep it out" does with the files.
3. **The receipt at both doors.** Today: the Chute's row (chute.tsx:372-414) carries the counts, the degraded line and the undo; the Drop's (room-client.tsx:1568-1629) carries the text, the opened chips and the undo; the ledger keeps waiting rows plus two settled (D12). After: the result carries `filingId`, `door`, `rung`, `windows`, `dupeCheck`, `judged`, `how`. Decide: which of those a receipt shows on arrival and which sit one click down (the click-depth law, CLAUDE.md:427-434), with the windows sentence and the D7 sentence as decreed substance.
4. **Their loops.** Today: dropped (actions.ts:519). After: Todo rows tagged `owner: them` with the hearer and the promised day; the move line reads them through `owedByThem`; the court reads them through `theirPromise`. Decide: whether their loops sit in the TODAY register with a their-side marker, on a line of their own beside THEIRS, or only in the move line; and how a blown one reads (PROMISED with its date is decreed, CLAUDE.md:419-421).
5. **The colleague coordination move.** Today: Groundwork's silence-bump org variant fires "Ask Anika what they said" (day.ts:371-402). After: the read exposes it as a coordination move off the wing (C6). Decide: its seat on the HomeRoom row (the C16 ruling leaves this to pass 6; THEIRS is reserved for the account's people).
6. **The read-only Chute bar.** Today: nothing renders without `canWrite` (chute.tsx:559). After: the bar and its receipts render; "Read-only session" where the ⇪ button was is decreed (D29). Decide: the bar's look in that state.
7. **The typed note's head.** Today: a rich typed note goes through `filePaste` with no head (room-client.tsx:397-403). After: the pipeline stamps the `TYPED NOTE` producer head and the `typed` source (D14). Decide: whether the paste pane says so before the operator presses "Read & file" (:1976-1983).
8. **The Intranet's Send-it box.** Today: `intranetCapture` writes intranetDoc rows and never a note (intranet/actions.ts:103-204; intranet-client.tsx:260). After: a capture naming an account files through the pipeline and can be disputed. Decide: whether Send-it becomes the Chute's paste door on that page, or keeps its own receipt and hands a dispute to the mounted Chute.
9. **The Drop's four buttons.** Today: ⚡ paste pane, ▢, ✸, ⇪ and a file input with no accept filter (room-client.tsx:1861-1924). After: `useIngest` applies the same accept verdict at both doors and refuses a .csv with the decreed sentence. Decide: whether the input filters by accept or lets the refusal speak.

## 6. What this plan does not do

- No face work. Slices 11b and 18 and the marked parts of 8 and 16 wait on a mockup and a ship order (CLAUDE.md:379-383).
- No Prisma drops. The NEEDS THE DB list (pass 4), PeoActivity, `scenario:`, `risk:`, LookIntoStatus.note and SignalSnooze.snoozedUntil are not touched. The only schema changes are additive: Filing, `AccountNote.door`, `AccountNote.filingId`, `Todo.filingId`.
- No growth of the model's read schema. The read stores what `sanitizeAiResult` returns today; per-entry deal facts are §7, item 13.
- No move of the pastehash marker onto the Filing table (§7, item 2).
- No second-record staging (D17), acted-stamp store (D18) or colleague roster (D19's first half). Those are the second record's own plan.
- No change to `morningDoneKey`'s clock without the ruling pass 3 E flagged (§7, item 9).
- No `getAppAccess` memo (a KEEP ruling in pass 4; a separate small PR).
- No C13 (the citation opens in place) and no C19 (the Approach is never a gate). Both are STANDS rulings the code does not follow (scaffold E) and both are outside the Chute's brains (§7, item 10).
- No SalesNav instruction rewrite (a KEEP ruling; copy only).
- No palette sweep. The six `#8a5a00` literals in src/app/room/room.module.css outside the THEIRS line (:817, :850, :853, :920, :934, :1400) are a design-canon matter for the face pass, not a Chute-brains change.
- No touch on `src/generated`, `antaeus-brand-kit`, lockfiles or `.next`.
- No copy beyond the decreed sentences and the two receipt facts in slice 4.

## 7. Decisions I need from you

Written plainly. Each says what happens today, then what yes and no mean. Yes is the default every time. The technical form of each lives in §2 and §4.

1. **Should the AI's reading of a file get its own storage spot?**
   - Today: when you drop a file, the AI reads it and writes up what it found. The app uses that write-up once and throws it away.
   - Yes: save it in its own new spot, and link every note it made back to it.
   - No: stuff it inside the notes as extra text.

2. **Should the "already filed" check stay where it is for now?**
   - Today: the app remembers every file you filed, so a second drop says "Already on file." That memory lives in its own little list.
   - Yes: leave that list alone during this work.
   - No: move it into the new storage spot now, which adds one more step.

3. **Should a wrong-company warning come once instead of twice?**
   - Today: the app checks the file before the AI reads it and again after. You can get warned twice about the same file.
   - Yes: let the AI read first, then check once and show one warning with every reason. The AI then reads every file, but question 4 reuses that reading.
   - No: keep the two checks.

4. **After a warning, should your pick reuse the first reading?**
   - Today: when you pick the right company, the AI reads the whole file a second time.
   - Yes: reuse the first reading. It's faster and costs nothing extra.
   - No: read it again.

5. **How should big files get backed up?**
   - Today: your browser uploads every file to the GitHub backup itself, so the browser holds the backup's secret key. You ruled the key must stay on the server. The server can only take a few megabytes at a time.
   - Yes: big files go to a Vercel holding spot first, and the server copies them to the backup from there.
   - Other choices: let the browser keep uploading only the big ones, or skip backing up big files and say so on the receipt.

6. **Should each to-do remember which file created it, in its own column?**
   - Today: Undo only works because the browser remembers a list of what a file made.
   - Yes: add a column to the to-do list that points at the file.
   - No: hide that pointer inside the to-do's text.

7. **Should the other side's promises become to-dos?**
   - Today: when a client says "I'll send the list Friday," the app throws it away. It only keeps your promises.
   - Yes: save their promises as to-dos marked as theirs, with who promised and the day.
   - No: save them as plain notes.

8. **In the saved Salesforce data, should the money blanker skip counts?**
   - Today: the app blanks out money everywhere it saves. The weekly Salesforce data is full of counts like 1,200, and the blanker can mistake those for money.
   - Yes: blank money in the words and leave the counts alone.
   - No: don't blank anything in that data, the way the scratchpad works.

9. **Should "done today" use Chicago time?**
   - Today: one part of the app starts a new day around 7 PM Chicago time, so something you check off at 8 PM counts as tomorrow's. Your rule says all days are Chicago days.
   - Yes: switch it to Chicago time.
   - Until you answer, it stays as it is.

10. **Should two unrelated fixes be their own small jobs?**
    - Today: two of your rulings aren't built yet. One makes a playbook question in the brain's answer open right where you click it. The other stops the app from hiding plays based on whether the CSM was briefed.
    - Yes: do them as two small separate jobs.
    - No: add them to this plan.

11. **If the Salesforce spreadsheet is dropped on one account, should it skip the backup?**
    - Today: the app turns it away with "The export goes in the Chute," but still backs it up.
    - Yes: don't back it up, since it was turned away.
    - No: back it up anyway.

12. **Should the AI's short hints be saved with its reading?**
    - Today: the AI also writes short hints like "they're talking to a competitor." Nobody saves them.
    - Yes: keep them in the new storage spot with the rest of the reading.
    - No: add them to the end of the note's text.

13. **Should we wait before asking the AI for more?**
    - Today: the app finds countries, products and headcounts by scanning the words in notes. The AI could list them directly instead.
    - Yes: wait until the rest of this plan is done before changing what we ask the AI.
    - No: add it now.

14. **Should the "ask your colleague" move wait for its new spot?**
    - Today: when a client replies to your colleague, Groundwork tells you "Ask Anika what they said." You ruled that belongs on the HomeRoom. The HomeRoom has no spot designed for it yet.
    - Yes: leave it on Groundwork until the spot is designed.
    - No: move it now onto that account's TODAY list.

15. **Will you run the database update yourself?**
    - Today: two steps in this plan add new columns to the database. Someone has to run one command so the live database gets them before those steps go live.
    - Yes: you run the command before each of those two merges.
    - No: the app runs it automatically every time it deploys.

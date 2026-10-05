---
title: Chute Brains Refactor Plan
status: Approved
approved: Founder, 2026-10-05, by answering the sixteen questions of section 7 in chat
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

Pass 6, written 2026-09-25 on branch `claude/chute-brains-plan-1c0svk`, cut from main at ab281df (the scaffold merged). Every file:line below was checked on that tree after the scaffold; the pass-1 map's numbers have drifted and are not reused. Ledger cites name the pass and the section (pass 1 §4, pass 2 E, pass 3 C6, pass 4 G3, scaffold E). Every RULING in the ledgers and every dated entry in CLAUDE.md is settled and is treated as law here, with one caveat: the eight rulings the dead-code ledger marks "assumed" were recorded without a per-item answer, and §7 item 16 asks for them. Claims that come from code shape and not from a run are marked [inferred]. This pass writes one document and no code.

Re-cited 2026-10-02 against main 00fe8b2 after pass 5 closed (PR #336). Approved 2026-10-05: the founder answered every question in §7; the answers are written into §2, §4 and §5 below and into CLAUDE.md the same day, and each §7 item carries its answer.

## 1. Where we are

The ingest path is one server pipeline with two client doors and a third intake that shares nothing with it.

**The server pipeline.** `roomPaste(accountId, raw, {force})` at src/app/room/actions.ts:139-142 is the only filing verb; both doors call it (chute.tsx:120, room-client.tsx:490). Inside it, in order: the dialect sniff over the head line (`dialectOf` at src/lib/room/paste.ts:52-63, called at actions.ts:173; TEAMS CHAT falls to SF), the model's window (:179-184, 400,000 characters for a tape and 60,000 otherwise, with a truncation note appended), the duplicate guard on a `pastehash:` AccountDisposition marker that fails open (:201-225), an early misfile rung with an empty claim unless forced (`readFreeVerdict` at paste.ts:23-48, called at actions.ts:233-240), the model read or the rules fallback (:243-287), a late misfile rung on the read's own claim (:297-315), at most 40 entry notes through `createAccountNoteRow` (:397-422, the source literal from `sourceFor` at paste.ts:67-79), the tape's archive note sliced to 150,000 characters (:331-357), the marker stamp (:431), and `absorbRead` whenever the read object exists (:432-434). The model's structured result, `AiCleanResult` at src/lib/intel/ai-clean.ts:22-33, is used for its entries and its fan-out and then dropped: `read.signals` is never read by anyone, and the object itself is never stored (pass 4 G3). The fan-out at :465-599 drops their commitments (:489), dedupes by `knowledgeKey` against open todos, gaps and playbook rows with three inline known-sets (:491-504, :540-546, :560-573), and writes an outcome marker (:581-595).

**The two doors.** The Chute (src/app/room/chute.tsx, 667 lines) routes in the browser with `routeCapture` over a roster the page serializes as a prop (room/page.tsx:815, intranet/page.tsx:120), reads three files at once through `runLimited` (:308-316), forks a probed .csv into the second record (:257), vaults through a GitHub grant the server hands to the browser (archive-actions.ts:16-31, chute.tsx:161-176), keeps a receipt ledger per Chicago day (chute-ledger.ts), and resolves a dispute with a picker whose every choice files with `force: true` (:465-530). Both doors now share the pure vault decisions in src/lib/room/drop-plan.ts (`splitDrop`, `vaultAfterVerdict`). The Drop, inside `Row` in src/app/room/room-client.tsx (2,807 lines), is pre-bound to the row, reads the first readable file only and vaults the rest unread (`splitDrop` at drop-plan.ts:18-26, called at room-client.tsx:599-605), holds a disputed read in a two-sided banner whose force button re-runs the whole read (:1985-2027), and keeps its receipt in component state (:316-339). The two deferred pins in tests/ingest-defects-deferred.test.ts have drifted from the bugs they stand for: bug 1's pin at :29 still reads red, but the text now rides on the filing patch (chute.tsx:118-120, the C20 scaffold) so the pick files it; bug 2's pin at :40 now reads green only because the `files.find(` literal moved into drop-plan.ts, while the Drop still reads one file per drop. Both pins are re-aimed in slice 8 (pass 1 §4, defects doc "Open after this pass").

**The reads after a filing.** Five surfaces still build their own corpus from the same rows: room/page.tsx:158-171 (full rows, hide-filtered, the home-side union), groundwork/page.tsx:238-256 (actors, recipients and homeSide dropped), src/lib/pipeline/build.ts:360-370 (the drawer), room/actions.ts:1190-1212 (`roomGapsRefill`, 40 raw rows, no hide filter), and src/app/intake/actions.ts:77-86 (no hide filter). Whose move is still spelled five ways: engine.ts:242-272, day.ts:364-436, sendbook/read.ts:279-287, pipeline/build.ts:498-547 and report.ts:237-315. The head alphabet is still sniffed in eleven modules (pass 1 candidate 1; the current list is in §2.3; pass 5 moved the pipeline's own sniff and source table from actions.ts into src/lib/room/paste.ts without folding any reader onto it), and the source literal is re-read raw at meeting.ts:35-36, pipeline/build.ts:195-585, groundwork/file.ts:107-111, signals.ts:24 and groundwork/page.tsx:232.

**What the rulings changed and the code does not yet do.** The scaffold pinned 34 GOVERN rulings and 20 STANDS rulings where a pure seam existed, scaffold A. Pass 5 closed what needed no new seam: every page signs in; the Board's actions left the retired surface for src/app/accounts/board-actions.ts; src/lib/activity/lint.ts carries the seven devices; `fingerprintBody` at src/lib/paste-files.ts:83-95 normalizes the Sent, To and Cc lines so the .eml and .msg twin dedupes, which is D16; `editOutcome` at src/lib/scratch.ts:46 keeps a click-away edit, which is D24; and the followups, misfile-guard and vault suites now pin behavior on src/lib/room/paste.ts and drop-plan.ts instead of source text. What waits here: the roster ships to the browser against D13, CLAUDE.md:303; the vault's token reaches the browser against D8, :307, as the comment at chute.tsx:145-151 says itself; the transcriber asks for OUTLOOK or TEAMS heads only at actions.ts:1707 against D3; no note carries its door against P3, :405, and prisma/schema.prisma:1092-1110 has no such column; run.ts:192 and :210 write bare rows against P4; `refresh()` names three paths at actions.ts:67-71 with 24 callers against D15; the guard still gives two verdicts against D9; their commitments are dropped at :489 against D10; the pick re-reads against D5; the archive and no-entries notes cut the text against D4; D14, D17, D18, D19, D29 and P2 have no code behind them. Scaffold E lists the STANDS rulings the code does not follow: C1, C2, C4 and C5 on the Sendbook's org-wide path, C6, C8's HomeRoom half, C13, C16, C18, C19.

**Why the structured read is the hinge.** Every one of the seven decisions below gets simpler once the model's read is a row instead of a return value. The single account read (decision 2) can stop regex-mining direction and kind from prose it wrote itself, because the read already holds them per entry. The fan-out (decision 5) becomes replayable from a stored read: an undo can take back by filing id instead of a list of ids the browser carried; a fan-out fixed after a bug pass can re-run. The pick re-reads by the founder's answer of 2026-10-05, so no read is held; the Filing row is written when a filing lands. The receipt's windows (D4) are facts about the read and belong with it. The intranet's extractor takes the stored read instead of paying for a second one (pass 4's ruling on G6: "a filed note's extractor takes the structured read stored with the note"). D10 says the read's signals file on the note; there is nowhere to file them today. None of that is possible while the read dies at actions.ts:441-451.

## 2. Decisions

### 2.1 The structured read (taken first)

**What is decided.** Whether the sanitized `AiCleanResult` is stored at filing time, where, and what links to it.

**Options.**

- A. Store nothing. The entries live on as note rows; the fan-out rows live on unlinked; the signals die. Costs: G3 and G6 stand; D10 has no home; undo keeps carrying id lists through the browser; the pick re-reads; the intranet re-reads.
- B. Store the read as a namespaced note, `read:<account>` with a JSON body, the way `research:`, `gems:` and `activity:` already do. Costs: the writer's money redaction rewrites comma-grouped numbers inside JSON (scaffold A.3, P4 row); a new namespace has to join `recordRowsWhere` and the D30 exclusion; per-account rows fold by the alias rules and pick up the narrow-read defects of pass 2 C; nothing links a note to its read except a body scan.
- C. Store the read in its own table, one row per filing, and link every row the filing wrote to it by a column. Costs: a migration (additive), run by the deploy (§7, item 15); one more model in the schema.

**Pick: C.** A table named `Filing`: `id`, `accountId`, `fingerprint`, `door`, `dialect`, `how` (ai, rules, transcript), `read` (Json, the sanitized result, null on a keyless filing), `windows` (Json, every window that cut something as `{what, read, of}`), `dupeCheck` (ran, skipped), `createdAt`, `filedAt`. Unique on `(accountId, fingerprint)`. `AccountNote.filingId` and `Todo.filingId`, nullable and indexed, link what the filing wrote. The intranet's local type `Filing` at src/lib/intranet/extract.ts:91 renames to `TopicFiling` so the generated client's name is free.

**Reason.** P3 and P4 (CLAUDE.md:405) rule that provenance is columns, and pass 2 C's 47-read sweep shows what namespaced notes cost every reader. The G6 ruling names "the structured read stored with the note," which is a column-linked row, not a body scan. D4 (:301) needs the windows kept somewhere the receipt can read them; D10 needs the signals kept. The founder answered §7 item 13 on 2026-10-05: the read's schema grows in slice 4 with per-entry deal facts (countries, products, headcounts, timing, promises with their hearer and day), so the single read takes the model's facts first and regex-mines only rows with no Filing.

**What would make it wrong.** If the founder wants no schema additions at all, B is the fallback and its JSON goes through the writer with `structured: true` (decision 5) so the redaction reads string values only. If the grown schema's facts disagree with the regex on the existing fixtures, the parity test in slice 10 decides which one the surfaces show, and the regex stays the fallback for every row filed before the Filing table.

**The pastehash marker stays.** The `pastehash:` AccountDisposition marker (actions.ts:115-137, :201-225) remains the duplicate key in this plan; the Filing row carries the same fingerprint, so moving the check onto the table's unique constraint is one later slice with a backfill (§7, item 2). The canon's letter at CLAUDE.md:294-295 names the marker, and tests/ingest-defects.test.ts:118-124 pins that cross-out never clears it.

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
  touches: Touch[];            // outreach:<id> and the label match, as room/page.tsx:162-166
  todos: Todo[];               // every todo on the account, done included
  dispositions: Map<string, Disposition>;
  secondRecord?: SecondRecord; // folded by canonical id (E17)
  homeSide: readonly string[]; // csms ∪ homeSideFrom, declared, never optional
  digest?: Digest;             // the seed the record outranks
  now: Date;
}): AccountRead
```

`AccountRead` carries the twenty fields of pass 2 E in its order: `docs` (each with `direction`, `sender`, `senderIsHome`, `machinery`, `closer`, `tape`, `at` from `effectiveAt`, `noteId`, `source`, `lane`, `actors`, `recipients`, `hidden`), `lastOutbound`, `lastInbound`, `whoseMove`, `warmth`, `lastMeeting`, `lastTouch`, `hidden`, `homeSide`, `today`, `intel`, `stage`, `relationship`, `theirPromise`, `lastAccepted`, `conversationExists`, `secondRecord`, `countries` and `products` and `headcounts` with the tape flag, `people`, `lastRecordAt`. The hide filter runs inside the read on the one grammar that survived the scaffold (`hide:note:` at room/actions.ts:1425; no `hide:acct:` writer remains), and `docs` keeps hidden rows with `hidden: true` so the Sendbook's warmth and the Accounts' engaged read can choose. `machinery` and `closer` are flags, not exclusions, so the Sendbook keeps warmth from the same doc (pass 2 E, the two-flag rule). `extractDealIntel` at src/lib/intel/extract.ts stays the deal-facts extractor over `docs`; `corpusFor` retires when its last caller leaves.

**Migration order, one slice each.** First room/page.tsx:158-171, because its corpus is already the widest spelling (full rows, hide-filtered, the union at :129-130) so the parity test proves the read changes nothing there. Second groundwork/page.tsx:238-256, because its three divergences (no actors, no recipients, no homeSide; pass 2 B rows 7 and 8) are the ones the Ted doctrine at CLAUDE.md:394-398 and C6 at :276 rule against. Third the drawer's build at pipeline/build.ts:360-370 with `roomGapsRefill` at room/actions.ts:1190-1212 and intake/actions.ts:77-86. Fourth src/lib/sendbook/read.ts over `docs` (warmth and ↩ REPLIED from the flags). Fifth `whoseMove` replaces engine.ts:242-272's input assembly and day.ts:364-436's, and the engine's court goes with it (D25, CLAUDE.md:367-369). Sixth accounts/page.tsx:345-352 reads `lastTouch` beside the rollup's `lastHuman` (C1, :483).

**Reason.** Pass 2 E's closing paragraph names the widest spelling the cites support; the read is that spelling written once. Pass 1 candidate 2's corrected shape is "one account read built per request with a declared homeSide and hide filter, and one whoseMove over it." The pass-4 DEFER on G2 and G4 says this read is the fix for the pipeline report built twice per /room load and the Sendbook built twice across two pages.

**What would make it wrong.** If a surface needs a fact the read does not carry and the fix is a private re-derivation, the read grows instead. If the parity test on room/page.tsx cannot be made to pass on the existing fixtures, the room's current answers were not the widest spelling and the divergence is written into the plan before the slice ships.

### 2.3 The dialect module

**What is decided.** One home for the head alphabet, one sniff, and the source-literal table, with the note grammar left byte-identical.

**Options.**

- A. Leave each reader's regex where it is and widen the legacy alphabet at provenance.ts:200 to accept CT and SN. Costs: eleven modules keep their own copies; the next producer head is another eleven edits.
- B. One module that exports the head alphabet, one sniff, the source-literal table and the predicates over it; every reader imports it; the writer keeps emitting exactly what it emits today. Costs: one PR touching twelve files; the followups suite's behavior pin on `dialectOf` and `sourceFor` (tests/followups.test.ts:500-502, reading src/lib/room/paste.ts since pass 5) moves its import to the table and keeps its assertions.
- C. B plus new dialect tokens on the note head for spreadsheets, documents and typed notes. Costs: a grammar change every legacy reader has to learn.

**Pick: B.** `src/lib/ingest/dialect.ts` exports:

- `HEADS`: `OUTLOOK THREAD`, `TEAMS THREAD`, `TEAMS CHAT`, `CALL TRANSCRIPT`, `SALESNAV`, `SPREADSHEET`, `DOCUMENT`, and `TYPED NOTE` for D14's typed head (CLAUDE.md:303, "headed as typed at the row so the reader knows").
- `sniffHead(text)` returning `{ dialect, head }` where `dialect` is one of `OL | TM | CT | SN | SF` as the note head writes it today (`dialectOf` at src/lib/room/paste.ts:52-63) and `head` names the producer head found, if any. TEAMS CHAT sniffs to TM (today it falls to SF).
- `SOURCE_OF(dialect, head, how)` returning the stored literal: `outlook`, `teams`, `call`, `salesnav`, `sf`, `spreadsheet`, `doc`, `typed`, each with `-ai` when the model read it, plus the fixed literals the other writers use (`transcript`, `outcome`, `room`, `research`, `gap`, `playbook`, `activity`, `wire`, `sendbook`, `act-lane`, `scratch`, `touch`, `move`, `done`, `followup`, `disposition`, `sheet`, `pipeline`, `mail-template`). The spreadsheet drop files as `spreadsheet`, not the `sheet` this list first gave it (amended 2026-10-05, slice 1): `sheet` is already the room's routed line at src/app/room/sheet-actions.ts:63, a dialect of its own, and one literal cannot name two.
- Predicates: `isTape`, `isCall`, `isPaste`, `isSalesNav`, `isWire`, and `GLYPH_RE` (`/^[✉✔☎☰] /u`), `LEGACY_HEAD_RE` (provenance.ts:200's shape with the alphabet `SF|OL|TM|CT|SN`).

The note head `${glyph} ${dialect} ${when} — ${subject} · ${actors}` at actions.ts:403-404 is unchanged. Spreadsheets and documents keep the SF token on the head and gain a source literal, so no legacy reader learns a new token. The transcriber's prompt at actions.ts:1707 reads its head names from `HEADS` and emits CALL TRANSCRIPT with a Recorded line when the document reads as a call (D3, :301).

**Readers this module replaces.** src/lib/room/paste.ts:52-63 (`dialectOf`) and :67-79 (`sourceFor`), with their callers at actions.ts:173 and :418 and the archive's own head regex at :333; sf-timeline.ts:271; ai-clean.ts:341; normalize.ts:37-57; signals.ts:107; meeting.ts:15, :29, :35-36; extract.ts:54, :137; provenance.ts:200, :218, :225; clock.ts:15; sendbook/read.ts:102, :133, :175; day.ts:308; mirror.ts:52; pipeline/build.ts:195, :207, :396, :399, :404, :585; groundwork/file.ts:107-111; signals.ts:24; groundwork/page.tsx:232; paste-files.ts:12-34 (`sniffPaste`) and :64-65 (`HEAD_LINE_RE`).

**Reason.** Pass 1 candidate 1's corrected shape is "one dialect module exporting the head alphabet, one sniff, and the source-literal table." Pass 2 D's token table is the contract the module has to honor line by line, and it shows nobody reads CT or SN from the head today because the alphabet at provenance.ts:200 never accepted them. D23 (decree ledger D row 23) rules that `inferActors` exists only for rows filed before the columns, which is why the alphabet widens and nothing else about inference changes.

**What would make it wrong.** If a producer outside the repo (the bookmarklets at src/app/intake/grabs.ts:17, :82, :118 emit `OUTLOOK THREAD - captured …`, `TEAMS THREAD - …`, `SALESNAV ACCOUNTS - captured …`) changes its head, the table is the one place to add it; if the founder wants new tokens on the note head, that is option C and a grammar decree.

### 2.4 The doors

**What is decided.** Whether the Drop becomes the Chute pre-bound or the two doors become two faces over shared hooks, what the server contract is, and what each door does with a .csv, the roster and a pick.

**Options.**

- A. One component: the Chute takes a `bound` prop and the Drop is that component mounted in the row. Costs: the row's receipt carries affordances the Chute cannot host (pass 1 candidate 7's skeptics: the opened chips, the undo in the TODAY register at room-client.tsx:1565-1614); the face of both doors changes at once, which this plan cannot order.
- B. Two faces over shared hooks and one server contract: `useIngest` (accept, read, route, guard, file, vault, receipt), `useVerdict` (mismatch and pick), `useReceipts` (the ledger), `useUndo`. The faces keep today's look. Costs: two renderings of one verdict stay until the face pass; the hooks are new code beside 3,500 lines of client.
- C. B for the hooks and A for the verdict only (one picker component in both doors now). Costs: a face change without a ship order (CLAUDE.md:380-383).

**Pick: B.** The hooks live in `src/app/room/ingest/`. The server contract:

- `routeText(head, text)` server action (src/app/room/route-actions.ts): the roster never ships to the browser (D13, CLAUDE.md:303). The roster is `routingRoster()` (src/lib/book/roster.ts:20-45) joined with the record's actors and recipients per account (C2, :297), built per request from the AccountNote columns.
- `roomPaste(accountId, text, { force, door, filename })`: `door` is required and stamps every row (P3); the result carries `filingId`, `windows`, `dupeCheck`, and a verdict at whichever rung disputes it, each verdict with a reason of nine words or fewer. The text rung's reason is built from the rung's own evidence ("Names Regis staff, not Simploy."). The read rung's reason comes from a model call, `verdictReason` in src/lib/ingest/verdict-reason.ts on an Opus slot with web search like deep-research.ts:227, fed the capture's head and first 2,000 characters, the bound account's page data (name, site, contacts, countries, the record's people) and the claimed account's, answering whether the file is the same company; when it says the same company, the read rung withdraws and the filing proceeds. This is the founder's answer of 2026-10-05 to §7 item 3, which supersedes D9's one-verdict rule.
- The pick re-runs `roomPaste` with `force` and the read runs again, to be sure (§7 item 4); no read is held, and the pick never re-judges (D5, :303).
- `vaultFile(accountId, formData)` and `vaultChunk(accountId, filename, index, total, formData)`: the server uploads (D8, :307); a file above the server's request cap arrives in pieces of at most 4 MB that stage in a `VaultChunk` table until the last one lands, then the server assembles the file, pushes it to GitHub and deletes the pieces; git is the home for every size (§7 item 5); `githubArchiveGrant` retires and no token leaves the server.
- `roomPasteUndo(filingId)`: takes back every row with that `filingId` (notes, gaps, playbook lines by tail, todos, the outcome marker) and clears the marker.

A .csv on the Drop is refused with "The export goes in the Chute." (read-file.ts:60-61, shipped in the scaffold), is vaulted under the row's account, is never filed there, and the receipt says so: "Not filed here. Backed up. Drop the export in the Chute." (§7 item 11). The Intranet mounts the same Chute with no roster prop (D1, :301). A pick never re-judges (D5). Bug 2 closes inside `useIngest`: every readable file in a drop is read. Bug 1 closed with the C20 scaffold, which put the text on the row before the read (chute.tsx:118-120).

**Reason.** Pass 1 candidates 6, 7 and 9 give the hook shapes; the skeptics' finding on candidate 7 is why the faces stay two. The brief keeps the face out of this plan, and B is the only option whose plumbing ships behind today's faces unchanged.

**What would make it wrong.** If the face pass decides the two doors are one component, A is the next step and B's hooks are what it stands on; nothing in B is lost.

### 2.5 The fan-out

**What is decided.** Where `absorbRead` lives after the bug pass, who writes a Todo, who owns the gaps and playbook dedupe, and how the door marker is written.

**Options.**

- A. Leave `absorbRead` in room/actions.ts, keep the inline known-sets, keep the six direct `prisma.todo.create` sites, add the door column and stamp it at each writer. Costs: the three inline known-sets (actions.ts:491-504, :540-546, :560-573) stay beside the two other callers that rebuild them (:1122-1128, :1236-1240; playbook/actions.ts:23-34); the Todo tag codec keeps being assembled by hand.
- B. Move the fan-out to `src/lib/ingest/fanout.ts`; `fileGaps` and `filePlaybook` build their own known-sets; a `createTodoRow` sibling of `createAccountNoteRow` carries the tag codec; `createAccountNoteRow` requires `door`. Costs: one extra namespace read inside `fileGaps` and `filePlaybook` when the caller already had the rows (an optional `known` keeps those callers cheap).

**Pick: B.** Their commitments (owner `them`, dropped at actions.ts:489) file as Todo rows tagged `owner: them` with the promised day and the hearer's name from the read, linked by `filingId` (D10, CLAUDE.md:305); a repeated commitment is one loop by `knowledgeKey`; the court reads them through `theirPromise` once the read lands, and `owedByThem` (src/lib/room/owed.ts:88) reads them from the slice that writes them so no row is written with no reader (pass 4 G's rule). The read's signals stay on the Filing row the note links to (assumption on D10's "on the note"; §7, item 12). The outcome files a marker only (D10). `createAccountNoteRow` takes `door` as a required key and `structured?: true` for JSON bodies, under which the redaction runs over string values and never over numeric fields (P4; scaffold A.3's blocker). The three bare creates (draft-actions.ts:260; run.ts:192, :210) route through it.

**Reason.** Pass 1 candidate 3's corrected shape: "fileGaps and filePlaybook own their dedupe; a createTodoRow sibling of createAccountNoteRow carries the codec." The critic's addition there, that the intranet mirrors each opened Todo (runners.ts:178-192), is why the Todo shape needs one writer. P3 rules the door is a column (CLAUDE.md:405). The bug pass already made every row attributable (defects doc, bug 6); `filingId` makes the attribution a column instead of a list the browser carries.

**What would make it wrong.** If Todo must stay migration-free, the filing link rides in the tag codec as `from:<filingId>` (the Spring decree at CLAUDE.md:377-378 says tags survive edits verbatim), at the cost of a body scan on undo (§7, item 6).

### 2.6 Reaching the surfaces

**What is decided.** What "every tab re-derives" (CLAUDE.md:289) means per surface after a filing, and by what mechanism.

**Options.**

- A. Keep `refresh()` and its path list (actions.ts:67-71). Costs: D15 (:305) rules there is no revalidation list and `refresh()` retires; every page is already `force-dynamic`, so the list decides nothing for navigation.
- B. Retire `refresh()`; the door that filed calls `router.refresh()` once so its own page re-renders; every other page derives on its next request. Costs: one line in `useIngest`; 24 call sites edited.
- C. Push: a filing writes to the intranet and revalidates every surface. Costs: contradicts D15 and the intranet's pull design (pass 1 §8).

**Pick: B.** Per surface:

- /room: the door's `router.refresh()` after `roomPaste` returns re-renders the page in place; the registers, the move and THEIRS re-derive from the read (Next 16.2.9, package.json:33; a server action does not re-render the page on its own without a revalidate or a refresh [inferred from framework behavior]).
- /accounts, /groundwork, /sendbook, /playbook: `force-dynamic`; the next request derives; nothing is pushed.
- The Intranet: pull only. A filing reaches the brain on the next sweep (runners.ts:136-171 mirrors record rows through `recordRowsWhere`); the sweep's extractor takes the Filing row's read when `filingId` is set and pays for a model read only for documents with no read (pass 4 G6 ruling).
- The second record: untouched by a filing; the acted sweep (run.ts:1046-1070, `personMoved`) reads the new first-record rows on the next activity pass (D20).

**Reason.** D15 is ruled. The intranet is human-triggered by design (intranet-client.tsx:322-350, :857-866; no cron, no vercel.json). The Chute never calls `router.refresh` today (pass 1 §8), which is why /room relies on `refresh()` and why B must add the one call before the list goes.

**What would make it wrong.** If Next's client router cache is found to keep a dynamic page between navigations in this app's config (next.config sets no `staleTimes`), a `router.refresh()` on focus is the fix, not a path list.

### 2.7 The second record

**What is decided.** Whether this plan touches `src/lib/activity/`, and what the provenance gap costs if it does not.

**Options.**

- A. Do not touch it. Costs: P4 (CLAUDE.md:405) rules a bare row a defect; the writer-policy hole stays (a redaction or door change in write.ts misses run.ts:192 and :210); `fetchSecondRecords` keeps the raw-tail map at read.ts:48-88, so the single read's field 17 cannot fold by canonical id and C1's merge on Accounts reads a shell-keyed second record as absent.
- B. Route the two bare creates through the writer with `door: activity`, `structured: true`, lane `background`, source `activity`, and the export's actors and recipients (P4); fold `fetchSecondRecords` by canonical id (pass 2 E field 17). Leave staging (D17), the acted stamps' first-record store (D18) and the colleague roster (D19) to the second record's own plan.
- C. B plus D17 and D18. Costs: a second refactor inside this one; the staging swap and a new first-record store for acted stamps are not Chute brains.

**Pick: B.** The cost of the gap if untouched is small at read time, because namespaced rows never enter a corpus (`isNamespacedAccountId` at overlay.ts:112), and real at write time, because every P3 test that says "a bare row is a defect" would have to exempt run.ts. B closes that in one small slice.

**Reason.** Pass 1 candidate 10 was refuted on the same-job test but its fact stands: second-record rows carry no lane, actors or recipients, and the intranet digest reads them (runners.ts:263-296 in pass 1's numbering; :266-307 today). P4 is ruled.

**What would make it wrong.** If the second record's plan lands first and moves its writer, this slice becomes a no-op and is dropped.

## 3. Target module map and dependency sketch

New modules:

| Module                                                                            | Holds                                                                                                                                                           | Imported by                                                                                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| src/lib/ingest/dialect.ts                                                         | HEADS, sniffHead, SOURCE_OF, predicates, GLYPH_RE, LEGACY_HEAD_RE                                                                                               | every reader in §2.3; the transcriber; paste-files                                                               |
| src/lib/ingest/doors.ts                                                           | `DOORS` and the `Door` type                                                                                                                                     | notes/write, ingest/pipeline, act-actions, run.ts, intranet                                                      |
| src/lib/ingest/windows.ts                                                         | every named window with `{read, of}` (D4): READ_WINDOW_TAPE, READ_WINDOW, TRANSCRIBE_WINDOW, TRANSCRIBE_BYTES, SHEET_WINDOW, DOCX_WINDOW, ENTRY_CAP, TEXT_FLOOR | pipeline, read-file, paste-files, the transcriber                                                                |
| src/lib/ingest/guard.ts                                                           | `guardPlan({force, text, claim, bound, roster})`, pure, a verdict per rung with its reason                                                                      | pipeline                                                                                                         |
| src/lib/ingest/verdict-reason.ts                                                  | `verdictReason`: the read rung's model call with web search, slot `MODEL_VERDICT` in doctrine.ts                                                                | pipeline                                                                                                         |
| src/lib/ingest/filing.ts                                                          | `fileFiling`, `undoFiling`, `findFiling`, `readOfNote` over the Filing table                                                                                    | pipeline, undo, intranet extractor                                                                               |
| src/lib/ingest/fanout.ts                                                          | `absorbRead` moved; their loops; ids returned                                                                                                                   | pipeline                                                                                                         |
| src/lib/ingest/pipeline.ts                                                        | `filePaste(...)`: sniff, window, fingerprint, dupe, read or rules, guard, rows, fan-out; returns `PasteResult`                                                  | room/actions.ts (`roomPaste`), intranet capture                                                                  |
| src/lib/ingest/route.ts                                                           | `routeText` over `routingRoster()` ∪ the record's roster (C2)                                                                                                   | route-actions.ts, misfile.ts                                                                                     |
| src/lib/notes/write.ts                                                            | `createAccountNoteRow` with `door` required and `structured`; `createTodoRow`                                                                                   | every writer                                                                                                     |
| src/lib/record/read.ts                                                            | `readAccount` and `AccountRead`                                                                                                                                 | room/page, groundwork/page, pipeline/build, sendbook/read, engine, accounts/page, room/actions, intake, ask/live |
| src/lib/record/docs.ts                                                            | rows → `docs` with direction, flags, `effectiveAt`                                                                                                              | record/read                                                                                                      |
| src/lib/record/whose-move.ts                                                      | `whoseMove` over the read                                                                                                                                       | record/read; engine; day.ts                                                                                      |
| src/app/room/ingest/use-ingest.ts                                                 | handleFiles, swallow, CHUTE_PARALLEL, csv fork by door, `router.refresh`                                                                                        | chute.tsx, room-client.tsx                                                                                       |
| src/app/room/ingest/use-verdict.ts                                                | mismatch and pick state; the pick re-runs `roomPaste` with force                                                                                                | both doors                                                                                                       |
| src/app/room/ingest/use-receipts.ts                                               | the ledger over chute-ledger.ts                                                                                                                                 | both doors                                                                                                       |
| src/app/room/ingest/use-undo.ts                                                   | `roomPasteUndo(filingId)`                                                                                                                                       | both doors                                                                                                       |
| src/app/room/route-actions.ts                                                     | `routeText` server action                                                                                                                                       | use-ingest                                                                                                       |
| src/app/room/vault-actions.ts                                                     | `vaultFile` and `vaultChunk` server upload                                                                                                                      | use-ingest                                                                                                       |
| prisma: Filing; VaultChunk; AccountNote.door, AccountNote.filingId; Todo.filingId | the structured read, the vault's staging and the links                                                                                                          | filing.ts, vault-actions.ts, write.ts                                                                            |

Retired when their last caller leaves: `corpusFor` and `dealIntelFor` (extract.ts:97-219, :436-443), `refresh()` (actions.ts:67-71), `githubArchiveGrant` (archive-actions.ts:16-31), `dialectOf` and `sourceFor` (src/lib/room/paste.ts:52-63, :67-79, folded into the dialect module), `sniffPaste` and `HEAD_LINE_RE` (paste-files.ts:12-34, :64-65), the engine's `court` (engine.ts:65, :243-272, :424), the inline known-sets, the six direct `prisma.todo.create` sites, the two bare `accountNote.create` sites in run.ts and the one in draft-actions.ts. `readFreeVerdict` (paste.ts:23-48) and the drop-plan helpers (drop-plan.ts:18-26, :39-46) are kept and composed, not retired: `guardPlan` calls the first and `useIngest` the second.

```
paste-files (producers, fingerprint)          dialect ──► provenance · meeting · extract · sendbook/read · day
      │                                          │          pipeline/build · normalize · sf-timeline · ai-clean · mirror
      ▼                                          ▼
read-file (browser) ──► use-ingest ──► route-actions ──► ingest/route ◄── roster ∪ record columns
                            │
                            └──► roomPaste (thin door) ──► ingest/pipeline
                                                              ├── windows · fingerprint · filing
                                                              ├── guard (a verdict per rung, each with a reason) · verdict-reason · ai-clean | rules-read
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

- **Files changed:** new src/lib/ingest/dialect.ts; src/lib/room/paste.ts:52-63 and :67-79 (`dialectOf` and `sourceFor` become re-exports of the module, so `readFreeVerdict` and the followups suite keep their import path); src/app/room/actions.ts:173, :333, :418, :1707 (the transcriber emits CALL TRANSCRIPT with a Recorded line when the document reads as a call); src/lib/paste-files.ts:12-34, :64-65; src/lib/sf-timeline.ts:271; src/lib/intel/ai-clean.ts:341; src/lib/intranet/normalize.ts:37-57; src/lib/intel/meeting.ts:15, :29, :35-36; src/lib/intel/extract.ts:54, :137; src/lib/intel/provenance.ts:200, :218, :225 (alphabet widened to CT and SN); src/lib/intel/clock.ts:15; src/lib/sendbook/read.ts:102, :133, :175; src/lib/groundwork/day.ts:308; src/lib/groundwork/signals.ts:24, :107; src/lib/groundwork/file.ts:107-111; src/app/groundwork/page.tsx:232; src/lib/pipeline/build.ts:195, :207, :396, :399, :404, :585; src/lib/intranet/mirror.ts:52.
- **Unchanged:** the written head at actions.ts:403-404; every producer head in paste-files.ts:247-260, :352-370, :497-510, :523-542, :582-586; the bookmarklets; the source literals already stored.
- **Must stay green:** paste-files, sf-timeline, rules-read, ai-clean, ai-noise, extract, provenance, closer, accepted-invite, room-read, pipeline-fixes, live-motion, touch, self-task-touch, canon/chute ("the same body under two filenames fingerprints equal" and its siblings), canon/sendbook, canon/ted-doctrine ("a note with actors produces a doc carrying those actors as its people and sender"); followups ("a Teams paste files as Salesforce activity" at :500-502, a behavior pin on `dialectOf` and `sourceFor` that holds through the re-export); misfile-guard's read-free rung tests (:158-198, on `readFreeVerdict`).
- **Tests added:** tests/ingest-dialect.test.ts: every producer head sniffs to its dialect and TEAMS CHAT to TM; every stored source literal maps through the table and the predicates agree with meeting.ts's old answers on its fixtures; the legacy alphabet infers actors from a CT and an SN head; a byte-for-byte pin that the written head is unchanged on the read-absorption fixtures; the transcriber's prompt names every head from `HEADS`.
- **Decrees it could break:** the note grammar (pass 2 D) is held by the byte pin; the Chute's VTT clause (CLAUDE.md:283-285) by paste-files "vttToPaste heads the capture as a CALL TRANSCRIPT"; D23's "inferActors exists only for rows filed before the columns" holds because inference is still the load-time fallback at overlay.ts:149 and nothing new calls it; D3 (:301) is what the transcriber change delivers.
- **App verification:** drop a Teams chat copy on the Chute and see `☎ TM` on the row; drop a PDF of a call and see the tape's archive fold (`☰ Call transcript —`) and the recorded day on the note.
- **Rollback:** revert the squash; no data changes.
- **Size:** M.

### Slice 2 · One Chicago day

- **Files changed:** src/lib/tz.ts gains `chicagoDay(iso | Date)` beside `userDayKey`; the private copies at src/lib/room/loss.ts:41, sheet-view.ts:130, owed.ts:38, src/lib/scratch.ts:59-60, src/lib/intel/rules-read.ts:21, src/lib/intranet/ledger.ts:99 and src/app/room/chute-ledger.ts:85 import it.
- **Files changed, continued:** `morningDoneKey` at src/lib/today/build.ts reads the Chicago day (§7 item 9, answered yes); tests/today.test.ts:591-602's UTC pins are rewritten to Chicago.
- **Unchanged:** `dayStamp` where it feeds week stamps.
- **Must stay green:** today, room-bind ("Chicago move-done key"), brief, closer ("the wall chip carries the promise"), scratch is hand-run, canon/chute ("the ledger is per Chicago day"), canon/closer-rule.
- **Tests added:** tests/tz.test.ts: the seven call sites' inputs give the same key at 19:30 and 00:30 Chicago either side of midnight.
- **Decrees it could break:** the closer rule's "All days are Chicago days" (CLAUDE.md:421) is what the fold and the morning key deliver.
- **App verification:** the Scratchpaper's TODAY kicker and the Chute ledger's day agree at 7 PM Chicago.
- **Rollback:** revert.
- **Size:** S.

### Slice 3 · The door column and the writer contract

- **Files changed:** prisma/schema.prisma adds `AccountNote.door String @default("")` and a migration; new src/lib/ingest/doors.ts; src/lib/notes/write.ts makes `door` a required key of `NewAccountNote`, adds `structured?: true` (redaction over string values only), and adds `createTodoRow({ body, tags, accountId, remindAt, filingId? })` carrying `withTags` (src/lib/today/route-notes.ts:101) and `urgencyForDue` (src/lib/room/deliverables.ts:45); every caller of `createAccountNoteRow` names its door (room/actions.ts, sheet-actions.ts, ledger-actions.ts, pipeline-actions.ts, groundwork/actions.ts, accounts/act-actions.ts, scratch/actions.ts, room/gaps.ts, playbook/store.ts, dashboard/complete.ts); the six `prisma.todo.create` sites (room/actions.ts:517, :789, :1320, :1506; accounts/act-actions.ts:180; src/lib/today/mirror.ts:25) call `createTodoRow`; src/app/accounts/draft-actions.ts:260's bare create goes through the writer with `door: "hand"`.
- **Unchanged:** run.ts:192 and :210 (slice 17); the bodies and heads every writer emits.
- **Must stay green:** canon/ted-doctrine ("lane defaults to mine; provenance and recipients ride on the first tier", "a stated lane, actors, source and moment are kept", "the Scratchpaper's carve-out keeps figures", "an unmigrated table degrades tier by tier, still redacted"): the door rides on the provenance tier and the tier fallback keeps degrading; read-absorption's redact scan; act-lane; canon/act-lane; room-parity; followups.
- **Tests added:** tests/canon/provenance.test.ts: every `createAccountNoteRow` call in src passes a `door` from `DOORS` (a source scan); no `accountNote.create` exists outside write.ts and run.ts (run.ts leaves the exemption in slice 17); a structured body keeps `1,234` in a numeric field and redacts `$1,234` in a string; `createTodoRow` writes the tag codec `splitTags` reads back unchanged.
- **Decrees it could break:** the money doctrine (CLAUDE.md:582-583) is held by canon/ted-doctrine's redaction tests and the new structured-body test; P3 (:405) is what the slice delivers; the Spring's "tags survive verbatim" (:377-378) by the codec round-trip test.
- **App verification:** run the migration; file a paste on the Drop and see `door = drop` on the new rows in the database; open a todo from it and edit the line, tags intact.
- **Rollback:** revert the squash; the column stays and is harmless (default ""), or the down migration drops it.
- **Migration:** the app applies it when the server starts: src/lib/db/migrate.ts lists every additive migration beside its file under prisma/migrations, and src/instrumentation.ts runs the list on the app's own connection, catalog-guarded so a column that exists costs one SELECT and no lock. The plan first had package.json:8's build script run `prisma migrate deploy` (§7, item 15); probed on two preview builds on 2026-10-05, Vercel's build sandbox cannot reach the database on either configured URL (P1001 on both ports), so a build-time migration would fail every deploy. Preview deployments share the database, so a preview applies it too; every migration in this plan is additive and idempotent, so that is safe.
- **Size:** M.

### Slice 4 · The Filing table and the stored read

- **Files changed:** prisma/schema.prisma adds `Filing` (§2.1), `AccountNote.filingId String?` with an index, `Todo.filingId String?` with an index, and a migration; src/lib/intranet/extract.ts:91 renames `Filing` to `TopicFiling` (with its importers); new src/lib/ingest/filing.ts and src/lib/ingest/windows.ts; src/lib/intel/ai-clean.ts's schema grows per-entry deal facts (countries, products, headcounts, timing, promises with their hearer and day) that `sanitizeAiResult` clamps to the lexicon (§7 item 13; the surfaces keep regex-mining until slice 10 reads them); src/app/room/actions.ts `roomPaste` writes the Filing row before the notes, stamps `filingId` on every row and todo the filing writes, stores the sanitized read, records every window that cut something (:179-184 and the transcriber's :1725) and the duplicate check's outcome (:223-225) on the row, returns `filingId`, `windows` and `dupeCheck`; the archive note (:331-357) and the no-entries note (:364-391) keep the text whole (D4); the receipts at chute.tsx:357-399 and room-client.tsx:502-525 carry the windows sentence and the D7 sentence.
- **Unchanged:** the pastehash marker and its check; the guard order; the fan-out (slice 6 moves it); the picker.
- **Must stay green:** ingest-defects ("absorbRead hands back the ids of everything it wrote", "roomPasteUndo takes back notes in every namespace the filing wrote, and the todos", "both doors hand the todo ids to the undo"); misfile-guard (its pins are behavior on `readFreeVerdict`, `judgeFiling` and drop-plan.ts since pass 5, and the guard order is unchanged here); read-absorption; second-record-faces; vault; canon/chute; canon/ted-doctrine. Source slices to keep true: ingest-defects.test.ts:40-41 slice actions.ts between `export async function roomPaste(` and `async function absorbRead(`, so both names stay in place in this slice.
- **Tests added:** tests/ingest-filing.test.ts: a filing's read round-trips through the sanitizer unchanged; every row and todo the filing wrote carries its id; the windows list names what was cut of what arrived; a keyless filing stores a null read and `how: rules`; the grown read round-trips and the sanitizer drops a country the lexicon does not know; the tape's archive note is the whole text; the no-entries note is the whole text; the receipt sentence reads "Read 60,000 of 212,000 characters." and "The duplicate check didn't run." from the result.
- **Decrees it could break:** D4 (CLAUDE.md:301) and D7 (:303) are what it delivers; the Chute's "same pipeline a paste takes" (:287) holds because `roomPaste` is still the one door; the money doctrine holds because the stored read passes `sanitizeAiResult` (ai-clean.ts:214-218 redacts every string) and the archive note still passes `redactMoney`; the writing canon governs the two new receipt sentences (imperative not needed, they state facts; six words is not a budget for receipts, which are drilldown copy under the click-depth law).
- **App verification:** drop a 300,000-character transcript on the Chute and read the windows line on the receipt; file a paste twice and see the duplicate refusal still name "Already on file."; pull the database and see the Filing row with its read.
- **Rollback:** revert; the table and columns stay empty and harmless, or the down migration drops them.
- **Size:** L.

### Slice 5 · Two verdicts, each with its reason

- **Files changed:** new src/lib/ingest/guard.ts (`guardPlan`, pure, composing `readFreeVerdict` and `judgeFiling`): the text rung before the read returns a mismatch whose `reason` is nine words or fewer, built from the rung's why; the read rung after the read returns a mismatch only when the read's claim fails `accountMatches` or a rival outranks the bound row, and its `reason` is the model's. New src/lib/ingest/verdict-reason.ts (`verdictReason`, slot `MODEL_VERDICT` in src/lib/intranet/doctrine.ts, Opus, `web_search` as at src/lib/intel/deep-research.ts:227): fed the capture's head and first 2,000 characters, the bound account's page data and the claimed or rival account's, it answers `{ sameCompany, reason }`; when `sameCompany` is true the read rung withdraws and the filing proceeds, and when the call fails the read rung's reason falls back to the rule's why. src/app/room/actions.ts `roomPaste` returns each verdict as it arises; the pick re-runs `roomPaste` with `force`, the read runs again (§7 item 4), the duplicate check still runs, and nothing re-judges (D5); keyless sessions get the text rung alone. The receipt sentence is the reason itself. Built 2026-10-05: the read rung's model say lives in `readRungVerdict` (verdict-reason.ts) so `roomPaste` stays a thin caller, `reasonFromWhy` takes the row's own `boundWhy` as a fourth argument so its sentence about the row says the truth, the claimed account's page is read by exact name only because `accountMatches` is looser than a page lookup can bear, and the record's people join the page data once slice 7's roster carries them.
- **Unchanged:** the picker and the banner (slice 8 rewires them; both doors call `roomPaste` with `force: true` on a pick as today); `readFreeVerdict` and `dialectOf` in src/lib/room/paste.ts keep their signatures, since `guardPlan` composes the first; the order the text rung runs in, before the read.
- **Must stay green:** misfile-guard's behavior half ("force (file it anyway) is the operator's; the guard returns a verdict, never throws", the people rung, the company rung, boundWhy, the tie); ingest-defects ("the blocking behavior is unchanged: a disputed read holds for the pick", "the keyless early rung stands on the text's own evidence"); route-capture; canon/chute; misfile-guard.test.ts:158-198 ("the evidence rung runs BEFORE the read spends a cent", "the guard runs before anything files or fans out") stay as they are, since the text rung still refuses before the model and the founder's answer keeps both rungs.
- **Tests added:** tests/ingest-guard.test.ts: the text rung's reason is nine words or fewer and names the rung's evidence; the read rung's reason is the stubbed model's and nine words or fewer; a stubbed `sameCompany: true` withdraws the read rung; a failed model call falls back to the rule's why; a keyless filing produces the text rung alone; the pick re-runs the read (the model client is a counter in the test and reads 2); the pick against a duplicate under the picked account is refused; the two reasons pass the writing canon's lint (no hedge, no em-dash aside). Amended 2026-10-05: `roomPaste` cannot be called from the suite (it gates on `getAppAccess`), so the counter is a read closure driven through `guardPlan` on both passes and the read's seat outside every `force` gate is pinned from the source, as tests/ingest-defects.test.ts pins the rest of the action.
- **Decrees it could break:** "Nothing files blind" (CLAUDE.md:290-291) holds because a dispute still waits; D5 (:303) holds because the pick never re-judges; D9 as amended 2026-10-05 (:303) is what it delivers; "Opus or better" (:592-595) holds because `MODEL_VERDICT` is a roster slot; the writing canon (:42-70) governs the two reasons.
- **App verification:** drop a thread that names another PEO on a bound row; see the first warning at once with its reason, then the second after the read with the model's reason; pick; confirm the read ran again in the logs and one Filing row exists.
- **Rollback:** revert.
- **Size:** L.

### Slice 6 · The fan-out module

- **Files changed:** new src/lib/ingest/fanout.ts (`absorbRead` moved from room/actions.ts:465-599); src/lib/room/gaps.ts `fileGaps` builds its own known-set (optional `known` accepted); src/lib/playbook/store.ts `filePlaybook` likewise; the callers at room/actions.ts:1122-1128 (`roomResearch`), :1236-1240 (`roomGapsRefill`) and src/app/playbook/actions.ts:23-34 drop their inline sets; their commitments file as Todo rows through `createTodoRow` with tags `owner: them`, the hearer's name and the promised day, linked by `filingId` (D10); `owedByThem` at src/lib/room/owed.ts:88 reads them beside its regex so the sheet's court sees them from this slice; `roomPasteUndo` (actions.ts:859-933) takes back by `filingId` and keeps accepting the id lists until slice 8 stops sending them.
- **Unchanged:** the outcome marker's marker-only rule; the Todo model beyond slice 4's column.
- **Must stay green:** ingest-defects (all nine); read-absorption (its pure-helper tests on the fan-out at :135-330 in the defects doc's numbering; it pins export names `roomGapsRefill`, `roomResearch`, `roomActionUndo`, which stay); ingest-defects's source slices (:40-41 cut actions.ts at `async function absorbRead(` and `async function fileCompletion(`; the slice boundaries are rewritten to the new import name and to fanout.ts); misfile-guard (behavior only since pass 5, untouched); room-judgment; room-sheet is hand-run; canon/closer-rule ("a hand-typed dated action past its day reads as a plain wall, never PROMISED"), which their-loop rows do not touch because they carry a hearer by construction.
- **Tests added:** tests/ingest-fanout.test.ts: a read with two owner-them actions writes two loops with the hearer and the day; the same commitment twice is one loop; `fileGaps` without `known` dedupes against its namespace; `filePlaybook` likewise; undo by filing id removes every row and todo it wrote and nothing else; a `fileCompletion` note keyed by an opened todo is taken back with its todo (the defects doc's open item).
- **Decrees it could break:** D10 (CLAUDE.md:305); D28 (:425, "PROMISED needs a hearer") holds because a their-loop names its hearer; "the record's own entries are never unwritten" (:352-353) holds because undo takes back only rows the filing wrote; the click-depth law is not touched because nothing new renders yet.
- **App verification:** file a thread where the prospect promises a document by Friday; see "Adam owes the model. / Promised Friday." in the move line (the engine reads `owedByThem` today) and no new register row yet (the register seat is the face's, §5.4); undo the paste and see the loop go.
- **Rollback:** revert.
- **Size:** M.
- **Built 2026-10-05, where it differs from the text above:** the their-loop row carries a fourth tag, `b:` (who owes it, as the record names them), because `owedByThem`'s `who` is the promiser and the move line cannot say "Adam owes" without it; the codec reads `⚑[d:<day>,o:them,h:<hearer>,b:<who>]` and a loop carries no `k:a`, so every reader of the operator's own sheet (the register, the accounts page's linked notes, the archive's search, the intranet mirror, the activity context pack, the ask's live read) leaves it alone and nothing new renders before the face decides (§5.4). `fileCompletion` moved to fanout.ts with its take-back, `undoCompletions`, and its marker now carries the line's note id so an undo can find the line; `roomActionUndo` takes the line back with its todo too. The engine's meeting move carries the loop's day as its reason ("Promised Friday." while the day stands, "PROMISED 10/9." once blown with a hearer, "The 10/9 wall passed." with none), and the pipeline report's `theirSide` reads the loops beside the Owed line. The source-slice boundaries in tests/ingest-filing.test.ts, tests/ingest-guard.test.ts and tests/canon/provenance.test.ts also cut at `async function absorbRead(` and were rewritten the way ingest-defects' were, boundaries only; tests/route-notes.test.ts's full-codec fixture (outside the chain, type-checked) grew the three tags.

### Slice 7 · Routing and the vault on the server

- **Files changed:** new src/lib/ingest/route.ts (`routeText` over `routingRoster()` joined with a per-account roster read from the AccountNote `actors` and `recipients` columns, memoized per request); new src/app/room/route-actions.ts; new src/app/room/vault-actions.ts (`vaultFile(accountId, formData)` calling `archiveFileToGitHub` server-side with the token from env, and `vaultChunk(accountId, filename, index, total, formData)` staging pieces of at most 4 MB in a new `VaultChunk` table, additive migration, until the last piece lands, when the server assembles the file, calls `archiveFileToGitHub` and deletes the pieces; `useIngest` cuts any file above 4 MB into pieces); src/lib/github/archive.ts loses the grant type; src/app/room/archive-actions.ts retires; chute.tsx:152-190 and room-client.tsx:565-588 call `vaultFile`; chute.tsx:48-54 drops the `roster` prop and :266-287 calls `routeText`; room/page.tsx:815 and intranet/page.tsx:120 stop passing the roster; src/lib/intel/misfile.ts:75-85 takes the joined roster.
- **Unchanged:** `routeCapture` itself (pure, src/lib/route-capture.ts); the rungs and their scores; the vault's path and collision rule (archive.ts:118-150).
- **Must stay green:** route-capture (all); canon/chute ("routingRoster() carries emails, domains, people and aka for every account", "the people rung routes a capture that only names a known person"); misfile-guard's behavior half; second-record-faces ("the chute reconciles stored second-record receipts against the live run", :932-960, a behavior pin on chute-ledger.ts that the roster change never touches). Pins to rewrite: vault.test.ts:205 mounts `<Chute roster canWrite>` and becomes the propless mount; vault.test.ts:146 (the serialized result never carries the env token) stays and gains `vaultFile`'s return as a second subject; ingest-defects.test.ts:189-192 (`void archiveFiles(unreadable)` / `(waiting)`, `readDroppedFile(f, [f])`) still hold here because the call names survive until slice 8.
- **Tests added:** tests/ingest-route.test.ts: an address the book lacks and the record holds routes by the email rung; a person the record names routes by the people rung; the joined roster is built from the columns and not from bodies; after the filing that taught an address is undone, the address routes nowhere (by construction: the rows are gone); no client module imports roster.ts (a source scan); no server action returns a token (a scan of archive-actions' absence and vault-actions' return type); a 10 MB file arrives in three pieces and lands as one GitHub PUT (a scripted fetch); a missing piece vaults nothing and the receipt says the backup did not finish.
- **Decrees it could break:** D13 and C2 (CLAUDE.md:297, :303) and D8 (:307) are what it delivers; "pure rules, no API needed" (:286-287) holds because `routeText` calls no model; D8 as amended 2026-10-05 (every size through the server, git the home) is what the pieces deliver; the vault's 25 MB lane and the release lane at archive.ts:118-215 are unchanged on the server side.
- **App verification:** drop an .eml from an address only the record has seen; see it route without a pick; drop a 3 MB PDF and find it in the vault under the account; check the browser's network log for no GitHub request.
- **Rollback:** revert; the vault path is unchanged so nothing lands twice.
- **Size:** M.
- **Amended 2026-10-05 (slice 7 as shipped):** the browser-side cut and the server-side staging live in src/lib/ingest/vault.ts beside the thin doors in vault-actions.ts so the suite can script both halves, the Chute takes the picker's names from the route action's reply and a `chuteBook()` action rather than any prop, and misfile.ts stays pure — the joined roster reaches `judgeFiling` through `guardPlan`'s callers in roomPaste.

### Slice 8 · The shared door hooks

- **Files changed:** new src/app/room/ingest/use-ingest.ts, use-verdict.ts, use-receipts.ts, use-undo.ts; src/app/room/chute.tsx (`swallow`, `handleFiles`, `fileTo`, `vaultTo`, the picker's handlers at :109-143, :255-316, :465-531) and the Drop in src/app/room/room-client.tsx (`filePaste`, `readDroppedFile`, `handleFiles`, `undoPaste`, the banner's handlers at :488-606, :738-761, :1985-2027) call the hooks; `useIngest` folds in what pass 5 already made pure rather than duplicating it: `splitDrop` and `vaultAfterVerdict` from src/lib/room/drop-plan.ts (the first widened so every readable file in a drop is read, bug 2) and `isSettled` and `reconcileActivityRows` from chute-ledger.ts:211-258 for the receipts; bug 1 is already closed, the text rides the filing patch at chute.tsx:118-120; the pick re-runs `roomPaste` with `force`; a refused .csv on the Drop is vaulted under the row's account and never filed there, and its receipt reads "Not filed here. Backed up. Drop the export in the Chute." (room-client.tsx:549; §7 item 11); the read-only bar renders with "Read-only session" where the ⇪ button was (D29, chute.tsx:544); tests/ingest-defects-deferred.test.ts's two pins are re-aimed at behavior (today :29 reads red though the text rides the row, and :40 reads green though `splitDrop` still hands the Drop one file) and join package.json's chain.
- **Unchanged:** the look of both doors; the ledger codec (chute-ledger.ts); the second-record swallow (`swallowActivity`, chute.tsx:196-253, and the dock) beyond calling the shared reconcile.
- **Must stay green:** vault, second-record-faces (the reconcile test at :932-960 pins chute-ledger.ts behavior and keeps reading it), ingest-defects, misfile-guard (behavior on drop-plan.ts; `splitDrop`'s widened return keeps "a readable drop archives only after the filing is accepted" and "a disputed drop holds its file with the question" true per file), canon/chute, room-parity (the action names reaching room-client.tsx change to the hooks' names: text pin rewritten), today-register (its small room-client pin). Source pins to rewrite: ingest-defects.test.ts:189-192 (`void archiveFiles(unreadable)` / `(waiting)`, `readDroppedFile(f, [f])`) read the hook instead of room-client.tsx; vault.test.ts:205 mounts the propless Chute.
- **Tests added:** the two deferred tests, re-aimed, go green and move into tests/ingest-defects.test.ts; tests/ingest-hooks.test.ts on the pure reducers inside the hooks: two readable files on a row both reach the pipeline; each verdict renders with its reason; a pick re-runs the filing with force; a refused .csv is vaulted and not read, and its receipt names the Chute; the read-only state renders the bar and no input.
- **Decrees it could break:** "The per-row Drop stays" (CLAUDE.md:291) holds: the Drop keeps its seat and look; "read on the spot" (:283) holds; D11 (three at once) by canon/chute's `runLimited` tests; D29 (:309) is what it delivers; the Spring's "filing anything springs TODAY open" (:364-365) holds because the row's receipt path is the same call.
- **BLOCKED ON FACE:** the unified verdict rendering (one component in both doors) and any change to the receipt's shape. The hooks ship behind today's two renderings.
- **App verification:** drop two .eml files on a row and see two receipts; drop a disputed thread on the Chute, reload, pick, and see it filed, not vaulted; drop the weekly export on a row and see it backed up, not filed, with the receipt pointing at the Chute; open the room in a read-only session and see the bar.
- **Rollback:** revert.
- **Size:** L.

### Slice 9 · refresh() retires

- **Files changed:** src/app/room/actions.ts:67-71 and its 24 callers, plus the two direct `revalidatePath` calls at :1607 and :1780 (`refresh()` is private to actions.ts; no other file under src/app/room revalidates); use-ingest.ts calls `router.refresh()` once after `roomPaste` returns; the other doors that relied on it (the Act Lane's `router.refresh` at src/app/accounts/act-lane.tsx:116, :125, :147 per pass 4 G9 already refreshes itself).
- **Unchanged:** every page's `force-dynamic`.
- **Must stay green:** room-parity; read-absorption; canon/standing-decrees ("every live row's href resolves to a page on disk").
- **Tests added:** a source scan in tests/canon/chute.test.ts: no `revalidatePath` call remains under src/app/room; use-ingest calls `router.refresh` after a filing.
- **Decrees it could break:** D15 (CLAUDE.md:305) is what it delivers; "every tab re-derives" (:289) holds by force-dynamic and the refresh; P1 (:590-591) holds because no revalidation list exists to name an archived surface.
- **App verification:** file on the Drop and see the row's registers update without a reload; navigate to /accounts and see the new note's LAST HUMAN TOUCH.
- **Rollback:** revert.
- **Size:** S.

### Slice 10 · The single read, part 1: the module and the HomeRoom

- **Files changed:** new src/lib/record/read.ts, docs.ts, whose-move.ts; src/app/room/page.tsx:109-171 builds `readAccount` per row and reads `docs`, `intel`, `hidden`, `lastTouch`, `relationship`, `people`, `lastAccepted`, `lastRecordAt`, `secondRecord` from it (:198-210, :247-266, :329-343, :377-392, :394, :516-540); THEIRS leads only with gems whose person is an account person and takes `var(--blue)` (C16: room.module.css:2160, page.tsx:516-540; the five other `#8a5a00` literals in that stylesheet at :830, :833, :900, :914 and :1378 are not the THEIRS line and are outside C16's ruling, see §6); `latestResearchAt` and the research chip are untouched (already ruled and pinned).
- **Unchanged:** `corpusFor` and `extractDealIntel` (still called by the other four sites); `readDeal`'s inputs (slice 14 changes them); the row's markup.
- **Must stay green:** room-read, room-engine, room-judgment, intraday-court, move-line, accepted-invite, extract, intel, relationship is hand-run, brief, canon/ted-doctrine, canon/spring, second-record-faces (its THEIRS fixtures carry `lastHuman` and gems, never the ochre literal; no text pin to rewrite).
- **Tests added:** tests/record-read.test.ts: parity, the read's `intel` equals `extractDealIntel(corpusFor(...))` on every fixture the extract and room-read suites hold; the hide filter inside the read matches page.tsx:154's; `docs` carries `machinery` and `closer` as flags on the closer suite's fixtures; `secondRecord` folds a shell-keyed drop under the canonical id; THEIRS's lead skips a colleague's gem.
- **Decrees it could break:** the Ted doctrine's widest-source clause (CLAUDE.md:394-398) is what it delivers; the closer rule (:411-416) by canon/closer-rule and the flags test; the research chip's "latest of both stores" (:374-376) untouched and pinned by canon/ted-doctrine; C16 (:485) is what the THEIRS change delivers; the design canon's palette (:11-16) by the token.
- **App verification:** open /room and compare every row's move, meta and THEIRS against the previous deploy on the same data; a colleague's gem no longer leads THEIRS.
- **Rollback:** revert; the read module stays unused.
- **Size:** L.
- **Amended 2026-10-05 (built):** the read's input carries three things the signature in §2.2 left out and the HomeRoom's parity needed — the book's seeds for the account under `account` (`contacts`, the roster the people index and the relationship join; `contact`, the seeded primary), a row's Filing facts as `notes[].facts` (field 18 reads them when a caller hands them; no loader does yet), and the board's card as `board?` (field 12 is null without it) — and `whoseMove(docs, todos, now, opts?)` takes the touch log and the roster through `opts`, because a logged touch with no message is not a doc; the THEIRS lead builder (`theirsLine`) sits beside `outreachGem` and `anyLiveGem` in src/lib/activity/read.ts, and the page calls it.

### Slice 11a · The single read, part 2: Groundwork and the exclusion

- **Files changed:** src/app/groundwork/page.tsx:225-260 reads `intel` from `readAccount` with the actors, recipients and the home-side union restored; src/lib/groundwork/day.ts:82-107 `liveMotionIds` reads the second record's attributed inbound (D19: a row with an attributed inbound body that passes the machinery and closer reads; an account-level datetime alone never excludes) beside the first record's; the seat that follows its account reads on the HomeRoom's TODAY register as the account's own action when the account is excluded (C8's HomeRoom half: src/lib/room/sheet-view.ts reads `seat:<id>` rows for excluded accounts); the who chip row at groundwork/page.tsx:797-806 offers the read's `people` merged with `contactsFor` and asks only when the merged set holds more than one name (C18).
- **Unchanged:** the org silence-bump at day.ts:382-400 (slice 11b); the queue rules' weights; the Klaxon, which reads `currentBand` from the one band table.
- **Must stay green:** groundwork, live-motion, canon/groundwork (all fifteen), canon/sendbook, second-record-faces (the silence-bump org test at :457-493 stays until 11b), sendbook is hand-run.
- **Tests added:** in tests/record-read.test.ts: Groundwork's intel now equals the room's on the same account (the pass 2 B rows 7 and 8 fixtures: a CT send is the last outbound on both; an account-person-to-account-person mail is not inbound on both); an export row with an attributed inbound body excludes for 21 days; an account-level datetime alone does not; the who chip row asks with two names and not with one; a seat on an excluded account reads on the sheet as open.
- **Decrees it could break:** "The operator's own outbound never excludes" (CLAUDE.md:273-274) by live-motion; C6 as amended 2026-10-05 (:276) and D19 (:489) are what it delivers; C8 (:521) the HomeRoom half; C18 (:356); the vehicle rule and the caps by canon/groundwork.
- **App verification:** an account whose reply landed in a colleague's inbox leaves the wing; its seat, if any, shows on the room's TODAY register; the Worked-it chip row asks who only when two names exist.
- **Rollback:** revert.
- **Size:** M.

### Slice 11b · The coordination move retires

- **Files changed:** src/lib/groundwork/day.ts:382-400, the org variant of silence-bump that stages "Ask Anika what they said.", is deleted; the `answeredOrg` test at :385 stays, because an org-side reply still silences the drumbeat and still excludes (C6's first half); `orgInboundHolder` (src/lib/activity/read.ts:169-175) loses its only caller and goes; room/page.tsx:516-540 stops offering colleague gems to the THEIRS line at all, beyond slice 10's lead filter; tests/second-record-faces.test.ts:457-493's org silence-bump test is rewritten: an org inbound silences the drumbeat and produces no move.
- **Unchanged:** the exclusion; the drumbeat on the operator's own threads; the Sendbook.
- **Must stay green:** canon/groundwork (all), live-motion, groundwork, second-record-faces (rewritten test), canon/second-record.
- **Tests added:** in tests/canon/groundwork.test.ts: an account whose reply landed org-side is excluded and `buildQueue` holds no item for it under any rule.
- **Decrees it could break:** the founder's answer of 2026-10-05 to §7 item 14 retires the move everywhere; CLAUDE.md:276, :442-443 and :485 are amended the same day to say a colleague's motion produces nothing for the operator to do; "Yesterday carries" (:60-62) is not touched because a retired move is not a forgotten one.
- **App verification:** an account whose reply went to a colleague shows on no wing and no HomeRoom row as a move; the drumbeat stays silent on it.
- **Rollback:** revert.
- **Size:** S. Not blocked; it can run any time after slice 10.

### Slice 12 · The single read, part 3: the drawer, the asks and intake

- **Files changed:** src/lib/pipeline/build.ts:350-370 reads `docs` and `intel` from the read the page already built (room/page.tsx:772-793 hands the reads down; pipeline-actions.ts:62-80 builds them); src/app/room/actions.ts:1190-1212 (`roomGapsRefill`) takes the read's `docs` (full rows, hidden filtered, the shell id folded); src/app/intake/actions.ts:77-86 likewise; src/lib/ask/live.ts:130-134 and :180-186 read `relationship` and `lastInbound` from the read; build.ts:396-404 and :585 use `lastMeeting` and the dialect predicates; the pipeline report built twice per /room load (pass 4 G2) becomes once by construction.
- **Unchanged:** the drawer's markup; the minter's prompt.
- **Must stay green:** pipeline-fixes, pipeline-build is hand-run, pipeline-report is hand-run, ask-live is hand-run, read-absorption ("roomGapsRefill" name pin), room-read.
- **Tests added:** tests/record-read.test.ts: the drawer's `record` for a card equals the room's read on the same rows; the minter's corpus includes the CEO thread filed under the shell id (pass 2 C's actions.ts:1252 row); `ask/live` says "no reply has been filed" only when `lastInbound` is empty.
- **Decrees it could break:** the meat law (CLAUDE.md:468-475) untouched; the Ted doctrine's widest source is what it delivers; "the ask builder wants no inbound test" (pass 2 E) is kept as a comment on the read's `docs`, since `roomGapsRefill` never reads direction.
- **App verification:** open the drawer and compare rows with the previous deploy; press ⟳ on a row whose record sits under a shell id and see the minted asks cite it.
- **Rollback:** revert.
- **Size:** M.
- **Amended 2026-10-05 (built):** the reads reach the drawer through `collectPipelineAccounts`'s `readFor` and ride on `PipelineAccount.read`, the page keeping its loop's reads in a map it hands down; the fresh pull, the minter, the intake prefill and the live read assemble theirs through one helper the module map did not list, src/lib/record/stores.ts (`readFromStores`, `declaredHomeSide`); the live read takes `lastTouch` and `lastMeeting` from the read as well, because its 25-row query is gone and nothing else is left to read them from; and build.ts's source checks were already on the dialect predicates since slice 1, so nothing changed there.

### Slice 13 · The single read, part 4: the Sendbook

- **Files changed:** src/lib/sendbook/read.ts:97-170 (`recordSends`, `theirVoice`, `warmDates`, `inboundDates`) read `docs` and their flags: a send is a doc with `direction: out`, not a meeting, not self-addressed, at `effectiveAt`; warmth is any doc whose sender is not home and not machinery, closers kept; ↩ REPLIED needs a doc that is `in`, not machinery, not a closer; `orgSignals` folds through `secondRecord` under D19's gate (today src/lib/sendbook/read.ts:223-228 pours the export's account-level datetime into the warm and inbound sets with no machinery or closer read, and :281-287 annotates ↩ REPLIED from it, so C4 and C5 hold on the first-record path only); src/app/sendbook/page.tsx:96-105 and groundwork/page.tsx:209-214 build the register from the same read, so the two builds agree (pass 4 G4).
- **Unchanged:** the lanes' names and the step counting.
- **Must stay green:** canon/sendbook (all), sendbook is hand-run, touch, self-task-touch, groundwork. Behavior pin to rewrite: tests/second-record-faces.test.ts:574-602 ("an org-side inbound flips the Sendbook lane and annotates the reply") pins today's defect, an org-side datetime with no body setting the lane and ↩ REPLIED; under D19 it becomes "an attributed inbound body sets them, a bare datetime does not".
- **Tests added:** in tests/canon/sendbook.test.ts: the register built from the read equals the register built from rows on every existing fixture; Groundwork's and /sendbook's registers agree on an account with an org inbound.
- **Decrees it could break:** the Sendbook's lane law (CLAUDE.md:346-352) and C4, C5 (:356) by canon/sendbook; "their voice" meaning the account's people (:485) by the `senderIsHome` flag.
- **App verification:** /sendbook and Groundwork's Tallyfoot agree on the week's counts.
- **Rollback:** revert.
- **Size:** M.

### Slice 14 · The single read, part 5: whose move

- **Files changed:** src/lib/room/engine.ts:193-280 takes `whoseMove`, `lastInbound`, `lastMeeting`, `lastAccepted`, `theirPromise` from the read and drops its own assembly at :199-233; the engine's `court` (:65, :243-272, :424) is deleted (D25); tests/room-read.test.ts:63, tests/pipeline-fixes.test.ts:173-213 and tests/accepted-invite.test.ts:444 and :489-525 assert the move line's who-and-when instead of the court string (scaffold A.3's first row); src/lib/groundwork/day.ts:364-436's drumbeat reads `whoseMove`; src/lib/pipeline/build.ts:498-547 and report.ts:237-315 read `theirPromise` and `whoseMove`.
- **Unchanged:** the move sentences at engine.ts:318-423.
- **Must stay green:** intraday-court (pins the move line since the scaffold), move-line, room-engine, room-judgment, accepted-invite (rewritten assertions), pipeline-fixes (rewritten), room-read (rewritten), canon/spring, canon/closer-rule.
- **Tests added:** tests/record-read.test.ts: the five whose-move fixtures from pass 2 B rows 1 to 5 give one answer each; a self-addressed SF task never flips the court; a colleague's mail never flips it; an acceptance books; a closer changes nothing; a same-day morning reply answers an afternoon send.
- **Decrees it could break:** the closer rule (CLAUDE.md:411-416); the Spring's retired court (:367-369) is what it delivers; "the move already says who and when" holds by intraday-court.
- **App verification:** the room's move lines are unchanged on the same data; the drawer's "they owe a reply" agrees with the room's move.
- **Rollback:** revert.
- **Size:** M.

### Slice 15 · The single read, part 6: Accounts

- **Files changed:** src/app/accounts/page.tsx:345-352 shows the later of the read's `lastTouch` and the rollup's `lastHuman` and whispers which record it came from (C1); :379 reads `conversationExists` for engaged; :229-232's newest-note clock reads `lastRecordAt`; :237's `relationshipFor` reads the read's `relationship`; src/app/accounts-client.tsx:1067-1086 renders the whisper.
- **Unchanged:** the three columns' names and order (CLAUDE.md:455-459).
- **Must stay green:** second-record-faces (the LAST HUMAN TOUCH pins are rewritten to the merged value), activity-rollup, account-facts is hand-run, board-lift is hand-run.
- **Tests added:** tests/record-read.test.ts: an .eml filed Sep 22 beats an export row of Sep 10 and whispers "record"; the export wins the other way and whispers "salesforce"; an inbound with no send reads engaged on both Accounts and Groundwork.
- **Decrees it could break:** C1 (CLAUDE.md:483) is what it delivers; the meat law's drills are untouched.
- **App verification:** file an .eml on a row and see /accounts's LAST HUMAN TOUCH move to today with the whisper.
- **Rollback:** revert.
- **Size:** M.

### Slice 16 · The Intranet's capture through the pipeline, and the extractor takes the read

- **Files changed:** src/app/intranet/actions.ts:103-230 (`intranetCapture`) calls `routeText`; a capture that names an account files through `filePaste` with `door: "intranet"`, routed, guarded and picked like the Chute's (a dispute returns the verdict to the Send-it box, which hands it to the mounted Chute's `useVerdict`); a capture that names none stays an `intranetDoc` and is never inbound (P2); src/app/intranet/runners.ts:688-699 and src/lib/intranet/extract.ts:209 take `Filing.read` for a mirrored note whose `filingId` is set and call the model only for documents with none; mirrorTodo (runners.ts:178-192) carries the note's read.
- **Unchanged:** the mirror's dedupe by checksum; the ⟳ trigger; the D30 exclusion.
- **Must stay green:** intranet (hand-run, and the chain's read-absorption pins on MODEL_EXTRACT), canon/chute ("every namespace the app defines is excluded"), canon/standing-decrees ("the roster has slots, and every one is Opus or better").
- **Tests added:** tests/intranet-capture.test.ts: a capture naming a known address files an AccountNote with `door: intranet`; one naming nothing writes an intranetDoc and no note; the extractor's model client is not called for a doc whose note has a read; the claims it emits from a stored read equal the claims it emitted from the model on the same fixture (parity on the extract suite's fixtures).
- **Decrees it could break:** P2 (decree ledger D, ruled) is what it delivers; "Opus or better" (CLAUDE.md:592-595) holds because the roster is unchanged; the intranet digest's "staged bodies never enter the brain" (:465-466) holds because the Filing read carries entries the note already carries, sanitized.
- **BLOCKED ON FACE:** how the Send-it box shows a dispute (§5.7); until then the capture files when routing is sure and stays an intranetDoc when it is not, with a receipt line saying so.
- **App verification:** paste a thread into Send-it; see it on the account's row; run the sweep and see no second model read in the logs for that note.
- **Rollback:** revert.
- **Size:** M.

### Slice 17 · The second record's writer

- **Files changed:** src/lib/activity/run.ts:186-214 (`replaceNote` and the manifest write) call `createAccountNoteRow` with `door: "activity"`, `structured: true`, lane `background`, source `activity`, and the export's actors and recipients (P4); the update path stays as the replace-forward write it is; src/lib/activity/read.ts:48-88 folds by canonical id (E17); the paired narrow reads at src/app/activity/evidence/route.ts and act-actions.ts:113-114 fold with it (pass 2 C).
- **Unchanged:** staging (D17), the acted stamps (D18), the colleague roster (D19's first half).
- **Must stay green:** activity-harness, activity-parse, activity-rollup, canon/second-record, second-record-faces, activity-gems is hand-run; tests/canon/provenance.test.ts loses its run.ts exemption.
- **Tests added:** in tests/canon/provenance.test.ts: a second-record row carries lane, actors, recipients, source and door; its JSON body keeps its counts and redacts a currency string in a campaign title; a drop keyed by a shell id reads under the canonical account.
- **Decrees it could break:** "bodies and recipients never do [upload]" (CLAUDE.md:489) holds because the writer takes the export's columns the slice already carries, not bodies; the money doctrine by the structured redaction test; P4 (:405) is what it delivers.
- **App verification:** drop the weekly export; pull a `gems:` row and see its provenance columns; the Accounts gem column is unchanged.
- **Rollback:** revert; rows written bare before the slice stay bare and are a known set.
- **Size:** S.

### Slice 18 · The verdict face and the receipt face

- **What it is:** one verdict component in both doors showing both grounds and the candidates; the receipt's shape at both doors (windows, door, rung, the undo); the read-only bar's look; their loops' register seat; the Send-it box's dispute. Every mechanism it needs ships in slices 4 to 16.
- **BLOCKED ON FACE.** Not ordered here. The mockup triptych for it is the founder's to call (CLAUDE.md:379-383).

Order and count: 19 slices (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11a, 11b, 12, 13, 14, 15, 16, 17, 18). Slice 18 is BLOCKED ON FACE; slice 8 and slice 16 ship with one part each marked BLOCKED ON FACE and the rest live. Slices 1, 2, 3 and 17 can run in any order among themselves; 4 needs 3; 5 needs 4; 6 needs 3 and 4; 7 needs nothing but is placed before 8 because 8 wires its actions; 8 needs 5, 6 and 7; 9 needs 8; 10 needs 1 and 2; 11a to 15 need 10 in order; 11b needs 10 and nothing else; 16 needs 4, 7 and 10; 18 needs the face.

## 5. Face questions

Each names today's behavior at the door with its cite, what the plumbing carries after the slices above, and what the mockup has to decide.

1. **The Chute's picker.** Today: a mismatch banner reads "Reads like {claim}. Pick the account." and shows the claim only (chute.tsx:467-472), a batch-mate button (:479-500) and a select (:505-530); every choice files with force. After: the verdict carries both grounds, the candidates with their rungs and whys, and each verdict's reason; the pick re-reads. Decide: what a disputed filing looks like on the Chute, and whether it is the same component as the Drop's banner.
2. **The Drop's banner.** Today: a two-sided banner shows both accounts and their whys (room-client.tsx:1992-1996), "No — it's X's ✓" re-runs the read (:1999-2016), "keep it out ✕" drops the held files (:2017-2025). After: the same verdict object with its reason; the force button re-runs the read; the held files are vaulted or not by one rule. Decide: the banner's shape, and what "keep it out" does with the files.
3. **The receipt at both doors.** Today: the Chute's row (chute.tsx:357-399) carries the counts, the degraded line and the undo; the Drop's (room-client.tsx:1565-1614) carries the text, the opened chips and the undo; the ledger keeps waiting rows plus two settled (D12). After: the result carries `filingId`, `door`, `rung`, `windows`, `dupeCheck`, `judged`, `how`. Decide: which of those a receipt shows on arrival and which sit one click down (the click-depth law, CLAUDE.md:427-434), with the windows sentence and the D7 sentence as decreed substance.
4. **Their loops.** Today: dropped (actions.ts:489). After: Todo rows tagged `owner: them` with the hearer and the promised day; the move line reads them through `owedByThem`; the court reads them through `theirPromise`. Decide: whether their loops sit in the TODAY register with a their-side marker, on a line of their own beside THEIRS, or only in the move line; and how a blown one reads (PROMISED with its date is decreed, CLAUDE.md:419-421).
5. **The read-only Chute bar.** Today: nothing renders without `canWrite` (chute.tsx:544). After: the bar and its receipts render; "Read-only session" where the ⇪ button was is decreed (D29). Decide: the bar's look in that state.
6. **The typed note's head.** Today: a rich typed note goes through `filePaste` with no head (room-client.tsx:399-404). After: the pipeline stamps the `TYPED NOTE` producer head and the `typed` source (D14). Decide: whether the paste pane says so before the operator presses "Read & file" (:1972-1980).
7. **The Intranet's Send-it box.** Today: `intranetCapture` writes intranetDoc rows and never a note (intranet/actions.ts:103-230; intranet-client.tsx:260). After: a capture naming an account files through the pipeline and can be disputed. Decide: whether Send-it becomes the Chute's paste door on that page, or keeps its own receipt and hands a dispute to the mounted Chute.
8. **The Drop's four buttons.** Today: ⚡ paste pane, ▢, ✸, ⇪ and a file input with no accept filter (room-client.tsx:1857-1920). After: `useIngest` applies the same accept verdict at both doors and refuses a .csv with the decreed sentence. Decide: whether the input filters by accept or lets the refusal speak.
9. **The BOOKED annotation.** Today: an acceptance sets ↩ REPLIED on the Sendbook line only through the org-wide path, and the first-record path treats it as machinery (src/lib/sendbook/read.ts:132-139). After: the read carries `lastAccepted` and a `machinery` flag per doc, so the Sendbook can mark a booked meeting without calling it a reply. Decide: whether a send answered by a calendar acceptance carries a BOOKED annotation, and how it reads. The C5 ruling left this to pass 6 (decree-ledger.md C row 5).
10. **The three stamp words.** Today: the wing stamps SEATED with its day, THEIRS with the gem's term, and ENGAGED · NEVER MET (src/lib/groundwork/stamp.ts:45-52). The D27 ruling fixed the rule, no empty label, and left the words to pass 6. Decide: keep these three or better them.

- Answer: yes.
- Answer: yes.
- Answer: no. Warn twice. Each warning explains, in nine words or fewer, why it thinks this is a different company than the one it was dropped on. The second reason comes from the AI, which reads the account's page data and the web to answer. See §2.4 and slice 5.
- Answer: no. Read it again to be sure. See §2.4 and slice 5.
- Answer: git is the home for every file, big ones included. Big files travel through the server in pieces and are glued back together before they land. See §2.4 and slice 7.
- Answer: yes.
- Answer: yes.
- Answer: yes.
- Answer: yes. Slice 2 switches `morningDoneKey` to Chicago and rewrites the UTC pins.
- Answer: yes.

## 6. What this plan does not do

- No face work. Slice 18 and the marked parts of 8 and 16 wait on a mockup and a ship order (CLAUDE.md:379-383).
- No Prisma drops. The NEEDS THE DB list (pass 4), PeoActivity, `scenario:`, `risk:` and LookIntoStatus.note are not touched; SignalSnooze.snoozedUntil stays for good, because the HomeRoom and Groundwork read it (§7 item 16). The only schema changes are additive: Filing, VaultChunk, `AccountNote.door`, `AccountNote.filingId`, `Todo.filingId`.
- No move of the pastehash marker onto the Filing table (§7, item 2).
- No second-record staging (D17), acted-stamp store (D18) or colleague roster (D19's first half). Those are the second record's own plan.
- No `getAppAccess` memo (a KEEP ruling in pass 4; a separate small PR).
- No C13 (the citation opens in place) and no C19 (the Approach is never a gate). Both are STANDS rulings the code does not follow (scaffold E) and both are outside the Chute's brains (§7, item 10).
- No SalesNav instruction rewrite (a KEEP ruling; copy only).
- No palette sweep. The five `#8a5a00` literals in src/app/room/room.module.css outside the THEIRS line (:830, :833, :900, :914, :1378) are a design-canon matter for the face pass, not a Chute-brains change.
- No touch on `src/generated`, `antaeus-brand-kit`, lockfiles or `.next`.
- No copy beyond the decreed sentences and the two receipt facts in slice 4.

## 7. Decisions I need from you

Written plainly. Each says what happens today, then what yes and no mean, and carries the founder's answer of 2026-10-05. The technical form of each lives in §2 and §4.

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
   - Until you answer, it stays as it is. The UTC pins are tests/today.test.ts:591-602.

10. **Should two unrelated fixes be their own small jobs?**
    - Today: two of your rulings aren't built yet. One makes a playbook question in the brain's answer open right where you click it. The other stops the app from hiding plays based on whether the CSM was briefed.
    - Yes: do them as two small separate jobs.
    - No: add them to this plan.

11. **If the Salesforce spreadsheet is dropped on one account, should it skip the backup?**
    - Today: the app turns it away with "The export goes in the Chute," but still backs it up.
    - Yes: don't back it up, since it was turned away.
    - No: back it up anyway.

- Answer: no. Back it up anyway, do not file it there, and show a notice that says it was dropped in the wrong place, will not be filed there, is backed up, and belongs in the Chute. See §2.4 and slice 8.

12. **Should the app keep the AI's hints about each file?**
    - Today: the AI writes a few short hints about each file, like "they named a competitor" or "the decision sits with their CFO." The app asks for them and then throws them away.
    - Yes: keep them in the new storage spot with the rest of the reading.
    - No: add them to the end of the note's text.

- Answer: yes.

13. **Should we wait before asking the AI for more?**
    - Today: the app finds countries, products and headcounts by scanning the words in notes. The AI could list them directly instead.
    - Yes: wait until the rest of this plan is done before changing what we ask the AI.
    - No: add it now.

- Answer: no. Ask the AI for more now. Slice 4 grows the read with countries, products, headcounts, timing and promises, and slice 10 reads them first. See §2.1.

14. **Should the "ask your colleague" move wait for its new spot?**
    - Today: when a client replies to your colleague, Groundwork tells you "Ask Anika what they said." You ruled that belongs on the HomeRoom. The HomeRoom has no spot designed for it yet.
    - Yes: leave it on Groundwork until the spot is designed.
    - No: move it now onto that account's TODAY list.

- Answer: retire "ask your coworker" everywhere; it was an early idea and is not needed. Slice 11b deletes it, and CLAUDE.md:276, :442-443 and :485 are amended.

15. **Will you run the database update yourself?**
    - Today: two steps in this plan add new columns to the database. Someone has to run one command so the live database gets them before those steps go live.
    - Yes: you run the command before each of those two merges.
    - No: the app runs it automatically every time it deploys.

- Answer: no. The deploy runs the update and the merge carries it. Slice 3 first put `prisma migrate deploy` in the build script; the build cannot reach the database (probed 2026-10-05), so the app applies each migration itself when the server starts (slice 3's Migration line).

16. **Do the eight batch-10 rulings stand?**
    - Today: the last batch of the ruling session was recorded as assumed, with no answer from you on each item (docs/architecture/dead-code-ledger.md, the "assumed:" lines). This plan leans on three of them: the intranet keeps its read and takes the stored one (decision 1 and slice 16), the double builds wait for the single read (decision 2), and getAppAccess stays as it is (section 6). Two removals already on main rest on two more: motions.ts and branches.ts.
    - Yes: they stand as recorded.
    - No: name the ones to strike, and the plan and the two removals get revisited.

- Answer: yes, the eight stand, with one amendment: the column SignalSnooze.snoozedUntil stays, because the HomeRoom and Groundwork read it; LookIntoStatus.note goes as ruled. The eight are recorded as confirmed in docs/architecture/dead-code-ledger.md.

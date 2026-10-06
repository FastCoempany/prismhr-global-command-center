---
title: Scaffold Pass
status: Audit pass 5, 2026-09-25; merged as PR #335 (squash ab281df) 2026-09-25; corrected 2026-10-02 by the verification pass; re-walked by pass 8, 2026-10-06
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/decree-ledger.md
  - docs/architecture/dead-code-ledger.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/rulings-sheet.md
---

# Scaffold Pass

Pass 5 of the Chute audit: the codebase made smaller and every decree the refactor could break pinned by a test that asserts behavior, so a red during the refactor means something. It reads the 2026-09-25 rulings in the pass-3 and pass-4 ledgers and the CLAUDE.md entries they made. Branch `claude/chute-scaffold-1c0svk`, cut from the audit branch tip (main plus the ruling session, 710fab5), 27 commits, all pushed. Every commit passed the verify chain (prettier → tsc → eslint at 0 warnings → the test chain → next build) before it was made; two commits (b5bf3ef, 6eed8b8) were first recorded with a stale `.next/types` breaking tsc and re-verified green on a rebuilt tree before anything else was stacked on them.

Closing counts: **51 suites in the chain** (41 before), **922 tests passing** (853 before; 97 new canon tests, 125 removed with the dead code they pinned or converted from text pins), **15,568 lines deleted and 4,817 added** in the squash (corrected 2026-10-02 by the verification pass from "17,700 lines removed"; `git diff --shortstat caa1818 ab281df`), **97 canon tests**, 4 decrees that could not be pinned without the design pass (twelve more named in §A.3 by the verification pass), 1 removal blocked on the database, 3 pass-4 misses reported.

## A. The decree tests

Ten files under tests/canon/, grouped by CLAUDE.md section, every one in package.json's test script. Every assertion is on what a function returns for an input; no test reads a source file for text. Where the code did not follow a decree, the smallest local change was made and is named in §A.2.

### A.1 The tests

| Decree (CLAUDE.md) | Test file · name | What it asserts | An input that would fail it |
|---|---|---|---|
| Groundwork face, ruled C7 (two caps) | canon/groundwork.test.ts · four seats: SEAT_SLOT_CAP lead, the fourth sinks below the next rule's hit | buildQueue with 4 seats and 1 wire hit: all[0..2] seated, all[3] wire-trigger, all[4] seated | a seat cap of 4, or a dropped seat |
| same | · three hits of one rule: RULE_SLOT_CAP lead, the third sinks below another rule | 3 wire hits + 1 intent-warm: all[0..1] wire, all[2] intent-warm, all[3] wire | a rule allowed three leading slots |
| Act Lane, ruled C8 (a seat follows its account) + ledger E6 | · a seat whose account is in excludedIds never seats | no item for the excluded account; the other seat still seats | the pre-change seat loop (ignored excludedIds) |
| Groundwork face, ruled D22 (a vehicle never collides) | · the research stamp drops for the day when every eligible account has its own move | two above-gate accounts each with stakeholder-gap at a stale book: no "Run the research pass." item | the old `?? bearers[0]` fallback |
| same | · the roundup slot rides the one free account on the roster, never an occupied one | roundup-slot lands on the free id; busy keeps its own move | roundup on the busier account |
| same | · the roundup slot drops for the day when the whole roster is occupied | no roundup-slot; `all` is exactly [stakeholder-gap] | the old `?? list[0]` fallback |
| same (bearer after seats) | · a seated account is never the research bearer | strongest above-gate account seated, weaker free: the stamp rides the weaker | `taken` computed before the seat loop |
| Groundwork face, ruled C9 | · the strongest account has its own move; the stamp rides the weaker free one · with every bearer free, the strongest carries it | exactly one research item, on the weaker when the strongest is busy, on the strongest when both are free | a bearer picked by strength alone |
| Groundwork face, ruled D26 (one band table) | · 8:00 Chicago is not the live send band; 10:00 is sends; 12:30 is people; 15:00 is research · the band edges, minute by minute · winter time reads the same wall clock | currentBand: 13:00Z (8a CDT) → null, 15:00Z → now, 17:30Z → eleven, 20:00Z → two; bandAt 539 → null, 540 → now, 660 → eleven, 840 → two; CST 14:30Z → null | the old 7:00 open, or a UTC read of the hour |
| Sendbook :331-332 + ruled D27 (no empty label) | · every rule the queue can fire has a non-empty subtext · the three once-silent rules speak · a rule the table does not know still speaks its own label | stampSubtext non-empty for every QueueRuleId; seated → "SEATED · 8/20"; gem → "THEIRS · PHR STALL"; engaged → "ENGAGED · NEVER MET" | the old `default: return ""` |
| Ted doctrine, ruled P3/D23 (provenance is columns) | canon/act-lane.test.ts · Send's row carries the operator as actor, the address as recipient, and no money · a blank subject still files as a send, addressed | actSendRow → actors "Antaeus Coe → pat@example.com", recipients set, lane mine, source act-lane, "$12,000" gone from the body | the pre-change fileActSend row (no recipients) |
| Act Lane :467-468 (three seats lead) | · a fourth seat sinks below the third — and below the next rule's own hit | seated positions [0,1,2], the wire hit at 3, the fourth seat at 4 | a cap of 2 or 4 |
| Second record, ruled D20 (the record has moved on a gem) | canon/second-record.test.ts · four tests under personMoved | "Natalie B." and "N. Borland" match "Natalie Borland"; an address matches actors or recipients; "Nat" matches nothing; "Natalie B." vs "Natalie Price" is false | the old `text.includes(w)` |
| Second record, ruled D21 (gem lines are operator copy) | · five tests under the lint | "Ask Greg, not Jane." fails antithesis; "Send the model — the close arrives." fails the dash hinge; "3 clients want EOR." fails the digit rule; "Aug 19 reply wants to discuss switching." and "Renewal meeting 9/12." pass | the pre-change lint |
| Closer rule, ruled D28 (PROMISED needs a hearer) | canon/closer-rule.test.ts · a hand-typed dated action past its day reads as a plain wall, never PROMISED · a paste-provenance row with a blown date reads PROMISED · a date still ahead is neither | buildAccountSheet: typed row → wall, promised undefined; paste row → promised true; future → due only | promised set on the typed row |
| Spring :343, ruled D25 (the court line is retired in full) | canon/spring.test.ts · six tests: the move line carries who and when | readDeal move text: "Answer Adam. They wrote today." / "…2 days ago." / "Wait on Melanie. You wrote today." / "Send Melanie the recap. You met today." / "Wait for the meeting. Melanie accepted." / "Hold for their follow-up. Promised yesterday." | any move line that drops the name or the day |
| Chute, ruled C20 (a waiting pick survives a reload) + ledger E10 | canon/chute.test.ts · a pick row with text comes back a pick row with the same text · a mismatch row keeps its text and its state · a row mid-read comes back interrupted · a pick whose text cannot be kept comes back interrupted · the dropped File never persists · the ledger is per Chicago day | saveLedger/loadLedger on an in-memory storage: pick → pick with text and candidates; reading → interrupted with a reason; text past LEDGER_TEXT_CAP → interrupted; no `file` key stored; day D+1 loads empty | the old codec (strips text, pick → interrupted) |
| Chute, ruled D12 (a settled row keeps no address or text) | · the stored JSON carries no address and no body text · the account, the counts, the day and the rung ride · every settled state drops its text and why · a row saved before the rung rode derives it from the why · a pick row still carries its text | stored JSON of a filed row has no "@" and no body; rung "email" survives; every settled state (filed, undone, vaulted, dupe, error) drops text and why | keeping `why` with an address on a settled row |
| Chute, ruled D11 (three at once) | · never more than three in flight, results in start order, all returned · a limit past the task count runs them all; a limit of one is serial | runLimited(7 tasks, 3): peak 3, order 0..6 | Promise.all (peak 7) |
| Chute, ruled D16 (the same capture is the same body) | · the same body under two filenames fingerprints equal · an .eml-shaped and an .msg-shaped head over one body fingerprint equal · a bookmarklet re-copy with a fresh capture moment is the same thread · two different bodies differ · a first line that is not a producer's head still counts as body | pasteFingerprint over emlToPaste/msgToPaste with different names and stamps | hashing the head line |
| Chute, ruled D2 (the Drop refuses a .csv) | · x.csv on the Drop is refused with a reason · x.eml on the Drop is read · the Chute's own door still reads a .csv that is not the export | readFileToText(File, readPdf, { door }) | the Drop reading a csv as text |
| Chute, ruled D1 (one Chute, one roster) | · routingRoster() carries emails, domains, people and aka for every account · the people rung routes a capture that only names a known person | every roster entry has the four arrays; a transcript naming a bound person routes with rung "person" | the Intranet's old inline roster |
| Chute, ruled D30 (the mirror excludes namespaced rows by construction) | · every namespace the app defines is excluded, and the predicate agrees · a plain account id is admitted, every account in the book | recordRowsWhere() rejects every `*_NS` id and admits every peo id | a fixed list missing a namespace |
| Ted doctrine + money decree, ledger E3 (no writer reaches AccountNote without redaction) | canon/ted-doctrine.test.ts · a body carrying $12,000 is stored redacted · lane defaults to mine · a stated lane, actors, source and moment are kept · the Scratchpaper's carve-out keeps figures, nothing else does · an unmigrated table degrades tier by tier, still redacted | createAccountNoteRow with a stub client | the old writer (no redaction) |
| Spring :348-350, ledger E9 (the research chip reads the latest of both stores) | · the sweep wins when it is newer · the deep pass wins when it is newer · one store alone; neither is undefined | latestResearchAt | the old deep-first read |
| Ted :368-371, ledger E2 (every corpus carries actors and a homeSide) | · a note with actors produces a doc carrying those actors as its people and sender · the operator's own send reads out | corpusFor with actors "Dana Ellis → Antaeus Coe" | a corpus reading people from the body only |
| Ted doctrine, ruled C3 (the touch log merges by latest) | · the log newer than the record's outbound: the log's date wins · the record newer than the log: the record's date wins | lastTouchRead | record-first regardless of date |
| Sendbook :326-327, ledger E5 (the Sendbook reads effectiveAt) | canon/sendbook.test.ts · a 9:44 AM send and a 10:39 AM reply at one noon anchor: the reply annotates · the same two entries the other way round | buildSendbook line at 09:44Z with repliedAt 10:39Z | reading createdAt (both noon) |
| Sendbook, ruled C4 (↩ REPLIED needs substance) | · a Thanks! after a send warms the lane and annotates nothing · a substantive reply annotates the send · a closer resets the drum all the same | gone-cold lane with repliedAt ""; substantive → repliedAt; a closer between sends → both step 1 | the old inboundDates (no closer gate) |
| Sendbook, ruled C5 (machinery never warms) | · acceptance / bounce / campaign alert / out-of-office: neither warms nor annotates · a person's own reply does both | warmDates and inboundDates empty; lane never-met | the old head regex (auto-reply only) |
| Scratchpaper :304-307, ledger E8 (nothing on the paper ever dies) | canon/scratchpaper.test.ts · the cross-out moves the row and changes nothing else · the move keeps the body and the timestamp · the struck row stays a namespaced row · against a stub client the ✕ makes one update and no delete · a line that is not on the paper moves nothing | strikeMove / strikeLine | a delete call |
| Other standing decrees, ruled P1 (an archived surface leaves every list) | canon/standing-decrees.test.ts · every live row's href resolves to a page on disk · every archived row still resolves · the table is well-formed · the page path is derived from the href alone | WAYFINDER_ROUTES against src/app | a live row with no page |
| Playbook face, ruled C13 (a citation opens in place to the bank's question) | · a bare question id resolves to the question's text and its gloss · the citation's own spelling resolves · every question resolves; an id the bank lacks is null | questionById | not stripping the question: prefix |
| Other standing decrees, Opus or better (one roster) | · the roster has slots, and every one is Opus or better · no slot names a lesser family | every MODEL_* export in doctrine.ts matches /^claude-(opus\|fable)-/ | a sonnet slot |

### A.2 The source changes the tests required

Each is the smallest change that made the code follow the decree it pins; none changes a surface's copy or shape beyond what its ruling names.

- src/lib/groundwork/day.ts — the seat loop skips excludedIds (C8); the research bearer is chosen after the seats and never falls back to an occupied account; the roundup slot drops for the day when its roster is occupied (D22, C9); QUEUE_RULE_IDS exported for the D27 test.
- src/lib/groundwork/bands.ts (new) — BAND_TABLE, bandAt, chicagoMinutes, currentBand (null before 9:00), pure so the Klaxon can import it from the browser; day.ts re-exports them; src/app/groundwork/instrument.tsx builds its bands from the table and counts down to 9:00 before the day opens (D26).
- src/lib/groundwork/stamp.ts (new) — stampSubtext: the page's switch extracted, with labels for seated, the gem rule and engaged-never-introduced (D27); groundwork/page.tsx calls it.
- src/lib/act/lane.ts — actSendRow, the Act Lane's send row with actors and recipients; act-actions.ts spreads it (D23/P3).
- src/lib/activity/acted.ts (new) — personMoved; run.ts's acted sweep reads addresses and normalized names through it (D20).
- src/lib/activity/lint.ts — antithesis, the dash hinge and the non-date digit (D21); no fixture adjusted.
- src/app/room/page.tsx and room-client.tsx — the court value no longer passes through; tests/intraday-court.test.ts pins the move line (D25). The engine half waits (§A.3).
- src/app/room/chute-ledger.ts (new) — the receipt ledger's codec and runLimited; chute.tsx imports both; waiting rows keep text, settled rows keep the rung and no address or body, three reads at once (C20, D12, D11).
- src/lib/paste-files.ts — HEAD_LINE_RE and fingerprintBody; pasteFingerprint hashes the body only (D16).
- src/app/room/read-file.ts — readFileToText takes a door and refuses a .csv on the Drop; room-client.tsx passes door "drop" (D2).
- src/app/intranet/page.tsx — the Chute takes routingRoster(); the inline roster is gone (D1).
- src/lib/notes/record-rows.ts (new) — recordRowsWhere and the namespace mark; overlay.ts's isNamespacedAccountId reads the same mark; the intranet mirror's findMany takes the where (D30).
- src/lib/notes/write.ts — createAccountNoteRow redacts every body itself, takes an optional client, and honors keepFigures for the Scratchpaper's carve-out; scratch/actions.ts passes it (E3).
- src/lib/intel/deep-research.ts — latestResearchAt; room/page.tsx uses it (E9).
- src/lib/intel/extract.ts — homeSide is a required key of corpusFor's options; three src call sites and nine test call sites declare it (E2, construction).
- src/lib/sendbook/read.ts — every clock is effectiveAt; theirVoice gates isMachinery for warm and inbound; isSignOff gates inboundDates (E5, C4, C5); tests/sendbook.test.ts's closer fixture became a substantive line.
- src/lib/scratch.ts — strikeMove, strikeLine; scratch/actions.ts's ✕ calls it (E8).
- src/components/wayfinder-routes.ts (new) — the route table with an archived flag; app-wayfinder.tsx renders from it (P1).
- src/lib/intel/bank.ts — questionById; brief.ts uses it (C13).
- src/lib/intranet/doctrine.ts — one model roster with a slot per caller; ai-clean.ts's modelFor, intranet/extract.ts's modelForOrigin and distill.ts's rich/light split are gone; wire.ts and partners/actions.ts read Opus slots instead of naming sonnet (Opus or better, always).
- Chain suites that scanned code these changes moved now read the data tables instead: read-absorption (modelFor cases → the roster; the wayfinder href scans → WAYFINDER_ROUTES), intranet (MODEL_EXTRACT; the working-row scan), followups (the HomeRoom label), second-record-faces and vault (the ledger row shape from chute-ledger.ts).

### A.3 Not pinned, and what the design pass has to change

| Decree | Why not now | What would have to change |
|---|---|---|
| D25, the engine half ("the engine no longer computes it") | readDeal still computes and returns `court` (src/lib/room/engine.ts:65, :243-272, :424); three chain suites outside pass 3's list read it: tests/room-read.test.ts:63, tests/pipeline-fixes.test.ts:186-187, :212, tests/accepted-invite.test.ts:415, :461-483 | convert those three suites' court assertions to move-line assertions, then delete the engine's court, agoChip and daysChip |
| D18 (the acted stamp survives the take-back) | the stamp is gem.actedDay inside the gems: note body; takeBackSecondRecord deletes every second-record namespace | a first-record store for acted stamps keyed by gem term that the take-back never touches and the next drop re-attaches by key |
| D5 (the pick is final; force skips the rungs but not the duplicate check) | roomPaste holds the guard decision and the duplicate check inline with DB calls (actions.ts:209-233, :241, :318); no pure seam | lift a pure guardPlan({force, text, claim, bound, roster}) out of the action |
| D28, the other half (a typed date that names its hearer reads PROMISED) | needs a way to read "the line names the person it was promised to" from a typed todo | the design pass's reading of a typed line's hearer |
| D24 (click-away keeps an edit) | inline onBlur in the client component (scratchpad.tsx:378); no pure seam | extract the edit reducer (keep/revert on Enter, Escape, blur) |
| P4, the second record's bare creates (run.ts:190, :208) | both bodies are ⟪act⟫ JSON blobs; the writer's redaction would rewrite comma-grouped numbers inside them | a structured-body flag for the second record's stores, or the P3/P4 column design |
| The closer classifier's own cases | already pinned in tests/closer.test.ts:19, :36, :39 | nothing |

Corrected 2026-10-02 by the verification pass: twelve more GOVERN rulings of 2026-09-25 stand unpinned and were left off this table. Each needs the design pass's code before a behavior test has anything to assert against.

| Decree | Why not now | What would have to change |
|---|---|---|
| P2 (CLAUDE.md:301; the file and the note stay whole, only the model's read is windowed and a cut window is on the receipt) | no receipt field or windowing seam exists; the pin has nothing to read | a windowing seam that returns what it cut, and a receipt field that carries it |
| P3 (:405; the door is its own column) | AccountNote carries lane, actors, recipients and source; no door column exists (prisma/schema.prisma) | the door column, its migration, and every writer stamping it |
| D3 (:301; the transcriber emits CALL TRANSCRIPT with the recorded day) | the PDF and image read returns text with no head; only the .vtt and the Drop's own readers stamp CALL TRANSCRIPT (paste-files.ts) | a transcriber seam that reads a call and stamps the head and the day |
| D4 (:301; the Intranet's capture is a door) | src/app/intranet/actions.ts never calls routeCapture; a paste there is an Intranet doc whatever it names | the Intranet capture routes, guards and picks through the one pipeline when the text names an account |
| D8 (:307; a server-side upload, no token in the browser) | src/app/room/archive-actions.ts hands the token to the browser's fetch | a server upload route the Chute posts the file to |
| D9 (:303; vaulting is filing, by the rungs or the pick, with a receipt and a take-back) | the vault ride is inline in chute.tsx with the GitHub and DB calls; no pure seam | a vault plan seam the Chute calls and the test drives |
| D13 (:303; receipts dismiss per row and all at once, the fold shows every waiting row plus the two newest settled) | the fold's shape is chute.tsx JSX; a per-row dismiss exists (:358) and nothing pure decides what the fold shows | a pure fold reducer over the ledger rows |
| D14 (:303; routing runs on the server, the roster never ships) | the Chute is a client component taking `roster` as a prop (intranet/page.tsx:120, the room page) | a server routing action the Chute calls with the text alone |
| D15 (:305; no revalidation list, every page derives on request) | twelve files call revalidatePath; the pin would be a source scan, which the canon tests forbid | the revalidatePath calls go, and the pages derive on request |
| D17 (:489; staging verifies before a slice replaces its predecessor, a refused upload leaves the prior drop) | activityStage writes through Prisma inline (src/app/activity/actions.ts:25); no pure plan seam | a pure staging plan the action applies, testable without the database |
| D19 (:489; a colleague is book-internal or on our domain, the two-accounts count is the fallback) | ingest.ts derives colleagues by the two-accounts count first and unions the book's CSMs after; no address read | the roster reads the book's internal names and our domain first, the count only for a row with no address |
| D29 (:309; a read-only session sees the bar and its receipts) | chute.tsx:559 `if (!canWrite) return null;` renders nothing read-only | the bar and the receipt fold render read-only with "Read-only session" where ⇪ was |

## B. Text pins on the ingest path

Seven suites, one commit each. A "text pin" is an assertion on a source file's text, on the exact wording of an operator-facing string, or on an order that is not the behavior. Each was rewritten as a behavior assertion where one exists and deleted where the text was all it checked. One source flag was added once, for four suites: RouteHit and the misfile verdict carry `rung` (email · domain · person · name · head · initials, or "claim"), the same fact the why sentence carried in words (src/lib/route-capture.ts, src/lib/intel/misfile.ts; commit 892b33d).

### route-capture (892b33d)

| Old assertion | New assertion |
|---|---|
| :35 `assert.match(r.best!.why, /dana@simploy\.com/)` | routeCapture(eml with dana@simploy.com).best.rung === "email" |
| :44 `assert.match(r.best!.why, /advocatepay\.com/)` | best.rung === "domain" |
| :100 `r.candidates.every((c) => /matches the initials/.test(c.why))` | every candidate's rung === "initials" |

### misfile-guard (a2624e9)

| Old assertion | New assertion |
|---|---|
| :55 `assert.match(v.why, /Chassie Smith is Simploy's contact/)` | v.rung === "person" and the evidence names the person (`/Chassie Smith/`) |
| :92 `assert.match(v.why, /the read names Advocate Pay/)` | v.rung === "claim" and v.claim === "Advocate Pay" |
| :128 `client.includes("holding out of the vault")` | deleted: checked text only |

### ingest-defects (39245ec)

| Old assertion | New assertion |
|---|---|
| :25 `read("src/lib/intel/misfile.ts")` and :72-78 "the stale sentences are gone" (five comment and copy scans) | deleted: checked text only |
| :94-101 "the keyless early rung is described as keyless" (indexOf "The read didn't complete.", /account check/i, doesNotMatch /did not run/) | judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster }) → ok false, rung "person", claim "Simploy", bound "Regis HR Group" |
| :105-110 "the degraded transcript receipt points at a path that succeeds" | deleted: checked text only |
| :118 `roomPaste.includes("Nothing filed twice.")` | deleted: checked text only (the marker pins stay) |
| :145 `client.includes("judgment by Claude")` | deleted: checked text only (`judged: read !== null` stays as the flag's contract) |
| :177 `!client.includes("The actions it opened stay")` | deleted: checked text only |

### paste-files (2ad8984)

| Old assertion | New assertion |
|---|---|
| :35 `assert.equal(s.label, "an email thread")` | deleted: checked text only (`kind === "outlook"` stays) |
| :246 `assert.equal(s.label, "a call transcript")` | deleted: checked text only (`kind === "transcript"` stays) |

### vault (cd9de12)

| Old assertion | New assertion |
|---|---|
| :52-54 exact release name and body | releaseMetaFor(...) name includes the account and the file name; body includes the file name and the day |
| :57-70 `lib.includes("draft: true")`, `"draft: false"`, their order, `'method: "DELETE"'` | archiveFileToGitHub with a scripted fetch: calls are exactly POST release (draft true), POST asset, PATCH release (draft false), no DELETE |
| :79 `client.includes("readableExts")` | readerFor("quarterly-call.mp4") === "unsupported"; readFileToText refuses it and reads a .eml headed OUTLOOK THREAD; the readPdf spy is never called |
| :85 `!lib.includes("process.env")` | with a decoy GITHUB_ARCHIVE_TOKEN in the environment, every recorded call carries `Authorization: Bearer <grant>` |
| :114 `chute.includes("routeCapture(f.name, roster)")` | routeCapture on a recording's filename routes by name; a bare GMT recording name yields no candidate |
| :115 `chute.includes("Pick its account for the vault")` | deleted: checked text only |
| :169 `r.detail.includes("landed")` | after the scripted thrown PUT the recorded log is exactly [GET, PUT, GET] on the path, r.kind "file", r.url from the verify GET |
| :192-193 `r.reason.includes("Drop it again")`, `!r.reason.includes("unreachable")` | deleted: checked text only (`fetch failed` carried stays) |

### read-absorption (0057a2c)

| Old assertion | New assertion |
|---|---|
| :650-652 "the paste's undo says it takes the opened actions back too" (`client.includes("the actions it opened included")`) | deleted: checked text only |

### second-record-faces (d2d4f57)

| Old assertion | New assertion |
|---|---|
| :921 `chute.includes("Clear this receipt. The record keeps everything that filed.")` | deleted: checked text only |

Left, with the reason: the server-action sequencing pins in ingest-defects and misfile-guard (roomPaste, roomPasteUndo and roomRecordDelete gate on cookies() and the DB; a judgeFiling rewrite would only duplicate the pure cases the suites hold); the component-wiring pins in ingest-defects, misfile-guard, vault and second-record-faces (chute.tsx and room-client.tsx import CSS modules and have no callable seam); ai-clean's prompt-text case (the behavior is the model's, the prompt the mechanism). tests/room-read.test.ts holds no text pins.

## C. Removals

Corrected 2026-10-02 by the verification pass: the content of every row below, of section B's per-suite commits and of section D's title landed on main in the squash ab281df (PR #335, merged 2026-09-25); the SHAs in this document name the pre-rebase commits on the scaffold branch, which are on no remote branch.

One commit each; the chain green before each. KEEP and DEFER items untouched.

| Item | Lines removed | Commit |
|---|---|---|
| SAFE NOW 1 · command-center.module.css dead-only rules (232 classes, 311 rules) | 1,850 | a1d49ee |
| SAFE NOW 2 · playbook.module.css (33 Call Sheet classes) | 221 | 7250e1c |
| SAFE NOW 3 · room.module.css (26 classes; court and c_you/c_them/c_quiet/c_none kept until tests/room-parity.test.ts stops enumerating them) | 180 | 939fc19 |
| SAFE NOW 4 · groundwork, dashboard, sf and account-notes stylesheets | 296 | 5ba3820 |
| SAFE NOW 5 · notes-client.tsx and createTodoNote, saveTodoNote, deleteTodoNote | 559 | 62bef42 |
| SAFE NOW 6 · the HML priority panel chain and the /prospect-field guard; four design docs note the removal | 361 | a6f8f02 |
| SAFE NOW 9 · partner-notes.tsx, aleks/one-on-one.ts, cloud-data-policy.ts | 187 | e0ab0e5 |
| SAFE NOW 10 · /book, /look-into and /dev/popover pages, the stash branch, the meeting alternative, the dl: key, the kickoff: schema comments | 132 | b5bf3ef |
| REMOVE · PUBLIC_ACCESS and its two branches | 17 | 3bf5a95 |
| REMOVE · the three no-op model splits and the two sonnet sites, "Opus or better" now one roster | in 528b910 (A, part 2) | 528b910 |
| SAFE NOW 7 · 33 of the 38 dead symbols in appendix §5 (the rest die with their files) | 270 | 13bc55c |
| REMOVE (batch 10, assumed) · motions.ts and its test block | 137 | e1a6d3e |
| REMOVE (batch 10, assumed) · branches.ts and the bank's NO_FILTERS, facetCounts, emptyBecause with their pins | 188 | b05fdfd |
| SAFE NOW 8 · 24 of the 35 test-only exports with the 41 cases that pinned them | 1,059 | a9455fd |
| REMOVE · /today (19 files), / the Board, /pipeline and dashboard-client.tsx; seventeen actions moved to src/app/room/ledger-actions.ts and sheet-actions.ts; "/" redirects to /room | 8,005 | 6eed8b8 |
| SAFE NOW 8 · the last five test-only exports and today-client's LocalClock and CopyLine | 186 | 54cdd99 |
| cascade · 41 symbols the removals orphaned and the five files they emptied (app/look-into/actions.ts, lib/look-into/status.ts, lib/field-notes/data.ts, lib/intel/live-context.ts, lib/paste.ts) | 911 | 4091097 |
| SAFE NOW 10 · the export keyword on 248 declarations no other file names; four symbols the keyword alone kept quiet | 294 (keyword) | cd350c6 |
| SAFE NOW 11 · the stale comments (section D below) | — | f6d65e0 |
| REMOVE · the risk: read (accounts/page.tsx:97-98) | **BLOCKED: the ruling makes the database count the first step and the database host is unreachable from this environment** | — |
| REMOVE (batch 10, assumed) · the scenario: read, PeoActivity's writes and model, LookIntoStatus.note and SignalSnooze.snoozedUntil | **out of scope: each needs the database count or a migration (F)** | — |

No removal was stopped for a reader pass 4 missed. Three pass-4 misses of another kind, reported not acted on: selectQuestions, productOf and sophOf in src/lib/intel/bank.ts have no reader in src (the appendix listed only the three filter helpers as test-only); src/lib/look-into/live.ts is now read only by the hand-run tests/narrative.test.ts; and the forty-one symbols of 4091097 were exported-but-unread before this pass, hidden from pass 4's scan by the keyword.

## D. Stale contracts (f6d65e0)

| file:line | Old claim | New comment |
|---|---|---|
| src/lib/intel/ai-clean.ts:1-8 | "The app's single LLM touchpoint … filed from Intake" | the paste read, one of the app's model calls, filed from the room (the inventory in dead-code-appendix.md §7) |
| src/lib/intel/ai-clean.ts:322-351 | the cheap/strong model split and "Opus or better" in a comment | one roster in doctrine.ts; the shape picks no model; canon since 2026-09-25 (:592-595) |
| src/lib/book/roster.ts:1-7 | "one build, every door (… the Intranet …)" | the routing roster's contract: one Chute, one roster, wherever it mounts (D1, :301); server-only |
| src/lib/groundwork/compose.ts:96-99 | "any saved lane draft outranks this composed fallback" | the stage reads the seat alone and composes from the gem |
| src/lib/intel/discovery-product.ts:14-19 | "/playbook?open= deep links" | the Call Sheet and its deep link are retired; a citation opens in place (C13, :572) |
| src/lib/command-center/types.ts:28-34, :60-61 | "channel permission gate … only after the CSM clears it"; "Today uses this" | the Approach is a fact, never a gate (C19, :247); nothing reads isGated (since removed) |
| src/lib/notes/write.ts:1-9 | "The one way to create an AccountNote" | the contract every writer is to take (P3/P4, :405), with the two bare creates named; the body is redacted here |
| src/app/archive/actions.ts:3-8 | "the only place a real delete lives" | the one delete offered as a delete; rows die elsewhere as housekeeping, listed |
| src/app/intake/capture-shelf.tsx:125-129 | the SalesNav grab "must never land in an account's ⚡ box" | one door: the grab pastes into the Chute or a Drop (pass 4's SalesNav ruling, :309) |
| src/lib/intranet/segment.ts:10-14 | "Mechanical first, model second" | mechanical only; the merge list is empty and mergeProbe had no caller (since removed) |
| src/lib/intel/meeting.ts:1-13 | "The app's ONE spelling … never a private copy" | the shared spelling, with the pipeline's private copy named |
| src/lib/pricing/quote.ts:1-9 | "the one sanctioned money surface" | the one surface carrying OUR money; the country wing renders statutory figures (C11) |
| src/lib/paste-files.ts:505-509 | "both doors … must never disagree" | the doors agree on everything but the .csv (D2, :301) |
| src/lib/paste-files.ts:37-43 | "a re-copy of the same thread" dedupes | the same capture is the same body with the head skipped (D16, :305) |
| src/lib/intranet/doctrine.ts:16-22; src/lib/intranet/extract.ts:30-33 | the roster with an unread slot and the split "so a future decree can raise the rich side" | the one roster, canonized; both slots Opus |
| src/app/room/chute.tsx:3-8, :244-250 | "the room's single intake"; the vault ride in comments only | one component mounted twice (D1); the vault is canon with a server-side upload (D8, :307) |
| src/app/room/theirs-line.tsx:3-12 | "the warm ochre the room once reserved for the other side's court" | THEIRS is the account's people in the palette's blue; the ochre was ours (c_you), blue was theirs (C16, :485); the stylesheet still paints ochre |
| 27 code sites citing "SECOND-RECORD-PLAN §3.x", "Appendix A", "§6", "§7" (run.ts, rollup.ts, distill.ts, upload.ts, ingest.ts, harness.ts, read.ts, stores.ts, types.ts, runners.ts, doctrine.ts, mirror.ts, ask/links.ts) | section numbers of a plan not in the repo | each restated as the rule it stood for, the 2026-08-20 blessing kept |
| .env.example | two NEXT_PUBLIC_SUPABASE_* names nothing reads; six names src reads missing | the seven variables src reads, each with a one-line comment (APP_AUTH_COOKIE_SECRET is the seventh; strike it if unwanted) |

Left as they were: src/lib/intel/evidence.ts:2 "the build spec (§2.2)" and src/lib/intel/lexicon.ts:259 — the ledger's claim was wrong; both resolve to docs/plan-intelligence-era.md (§2.2 at :231; rail 3 at :18). The operator-facing SalesNav copy at capture-shelf.tsx:189-190 and groundwork/page.tsx:679-683 (copy, not comments; still contradicts the ruling). The CSS comment at room.module.css:2324 (the brief kept CSS out). src/lib/campaigns/index.ts:22-23 "channel permission gate" is true of what ALLOWED does today and is named in the types.ts comment as the filter C19 retires.

## E. Superseded decrees against the code

For every STANDS ruling in pass 3 C, whether the code now follows the decree that stands. Nothing here was changed; a behavior change belongs to the design pass.

| Decree that stands (line) | Code (file:line) | Follows? | What would have to change |
|---|---|---|---|
| C1 · Ted :368-372, both records merge by latest | src/app/accounts/page.tsx:345-352 reads sr.rollup.lastHuman alone | no | the column reads the first record's last human touch beside the rollup's and shows the later, with its source whispered |
| C2 · Ted :363, the roster reads the record | src/lib/book/roster.ts:20-35 builds from peos, contactsFor and AKA only | no | a loader over the actors and recipients columns per account joins the roster's email and people rungs; an undo withdraws what the undone filing taught |
| C3 · Ted :371-372, the touch log merges by latest | src/lib/room/touch.ts:125 | yes (canon/ted-doctrine) | — |
| C4 · closer :381-387, ↩ REPLIED needs substance | src/lib/sendbook/read.ts inboundDates, isSignOff gate; the org-wide path at :223-228 and :283-290 takes the export's account-level inboundAt into the inbound set with no closer read | half (corrected 2026-10-02 by the verification pass): the first record's path, this pass (canon/sendbook); the org-wide path annotates on a datetime, pinned as behavior by tests/second-record-faces.test.ts:569 | the org signal carries only inbounds with an attributed body that passes isSignOff (D19, :489) |
| C5 · Ted :373-374 and :408, machinery never warms | src/lib/sendbook/read.ts theirVoice, isMachinery gate; the org-wide path at :223-228 takes the export's account-level inboundAt into the warm set with no machinery read | half (corrected 2026-10-02 by the verification pass): the first record's path, this pass (canon/sendbook); the org-wide path warms on a datetime, pinned as behavior by tests/second-record-faces.test.ts:569 | the org signal carries only inbounds with an attributed body that passes isMachinery (D19, :489) |
| C6 · Groundwork :258-260 with :268-271, an org inbound excludes; the coordination move lives in the HomeRoom | src/lib/groundwork/day.ts:82 liveMotionIds reads the first record only; the silence-bump's org variant still fires on Groundwork (:22-23, :38, :174) | no | liveMotionIds reads orgInboundKey (with D19's attributed-body rule); the org coordination move becomes a HomeRoom todo or THEIRS line |
| C7 · Act Lane :467-468, two caps | day.ts SEAT_SLOT_CAP and RULE_SLOT_CAP by branch | yes (canon/groundwork) | — |
| C8 · Groundwork :262-271, a seat follows its account | day.ts:517 the seat loop skips excludedIds | half: it leaves Groundwork (canon/groundwork); the HomeRoom does not yet carry it | the HomeRoom reads seat: notes for excluded accounts as the account's own action until worked or taken back |
| C9 · vehicle rule :446-449 | day.ts research bearer after the seats, no fallback | yes, this pass (canon/groundwork) | — |
| C10 · Scratchpaper :301-302 | scratch/actions.ts keepFigures; write.ts redacts everything else | yes (canon/ted-doctrine) | — |
| C11 · Playbook :519-525 | countries.ts, country/route.ts never redact | yes (tests/playbook-sheet) | — |
| C12 · Playbook face :516-518 | playbook-client.tsx, playbook/page.tsx name the account and speaker | yes | — |
| C13 · click-depth :397-399 with :511-516, the citation opens in place | src/lib/ask/links.ts:65-70 still offers no door; questionById exists (canon/standing-decrees) | no | the brain's answer renders the cited question and its gloss inline, one click, no page |
| C14 · Spring :344 | the four controls carry titles; the foot legend spells them | yes | — |
| C15 · Act Lane :474-476 | accounts-client.tsx:1199-1210 plain words in the drilldown | yes | — |
| C16 · design canon :11-16 and :37 with "their" at :387 and :430, THEIRS is the account's people in blue | src/app/room/room.module.css:2182 `color: #8a5a00`; src/app/room/page.tsx:521-524 the label leads with any live gem, colleague gems included | no | `.theirs` takes var(--blue); the line's lead filters whoKind !== "colleague"; the colleague gem's seat in the row is pass 6's |
| C17 · plain-speech :79-81 | answer rows hedge | yes | — |
| C18 · Ted :363, the who chip row offers the record's people | src/app/groundwork/page.tsx:507-515 passes contactsFor only | no | the chip row merges threads.people with the book's contacts and asks only when the merged set holds more than one name |
| C19 · direct doctrine :240-241, the Approach is a fact, never a gate | src/lib/campaigns/index.ts:24, :172 ALLOWED filters kits by approach; src/app/accounts/draft-actions.ts:73 seeds the CSM play first for NEEDS_CSM | no | kitsFor prefers the stage's direct play at every stage; ALLOWED becomes an ordering hint, never an exclusion; the CSM play is the alternative with the quiet flag when a live CSM thread exists; boardLift stays |
| C20 · Chute :283-284, a waiting pick survives a reload | src/app/room/chute-ledger.ts | yes, this pass (canon/chute) | — |

Eight of the twenty stand unfollowed (C1, C2, C6, C8's HomeRoom half, C13, C16, C18, C19); every one is a behavior change for the design pass. Corrected 2026-10-02 by the verification pass: the list above counts eight, not the seven first written, and C4 and C5 are only half-followed — the Sendbook's org-wide inbound path at src/lib/sendbook/read.ts:223-228 and :283-290 takes the export's account-level datetime into the warm and inbound sets with no machinery or closer read, and tests/second-record-faces.test.ts:569 pins that behavior — so ten of twenty stand unfollowed.

## The counts

| | Before | After |
|---|---|---|
| Suites in the chain | 41 | 51 |
| Tests passing | 853 | 922 |
| Canon tests | 0 | 97 |
| Lines changed in the squash | — | 15,568 deleted, 4,817 added (ab281df against caa1818; corrected 2026-10-02 by the verification pass from "17,700 removed") |
| Commits on the branch | — | 27 |

Branch `claude/chute-scaffold-1c0svk`, cut from 710fab5 (the audit branch's tip: main c9b82ed plus the ruling session's ten commits). The audit branch `claude/chute-architecture-audit-1c0svk` carries the rulings and the CLAUDE.md law and had no PR when this was written; its PR was to merge first, then the scaffold branch to rebase onto main and open its own. Corrected 2026-10-02 by the verification pass: that is what happened — the audit branch merged as PR #334 (caa1818), and the scaffold branch, rebased onto it, merged as PR #335 on 2026-09-25, squashed to ab281df.

## Re-walk, pass 8

Re-walked 2026-10-06 against main at d119c52 (branch `claude/pass-8-recheck-1c0svk`), after pass 7, the Chute brains refactor (PRs #339 to #366), and the pass-5 close before it (#336, 00fe8b2). The CLAUDE.md lines in the sections above are the scaffold's and have drifted; the cites here are this tree's. A pin is "chain" when a chain test calls the code and checks what comes back, "text" when it reads source.

**The canon suites.** All ten files the scaffold added are in package.json:10 and pass when run alone on this tree: groundwork 19, act-lane 3, second-record 14, closer-rule 3, spring 6, chute 28, ted-doctrine 12, sendbook 19, scratchpaper 10, standing-decrees 15; 129 tests where the scaffold closed with 97. tests/canon/provenance.test.ts (slice 3, #341) joined them in the chain, 24 tests, all passing. §A's rule that no canon test reads a source file is superseded: standing-decrees reads source since the pass-5 close (#336; the sign-in and retired-surface scans, standing-decrees.test.ts:84-145), chute since slice 9 (#350; the D15 scan at chute.test.ts:515-557, which its header declares at :1-6), and provenance was born with source scans in #341. The other seven read none.

### A.1 re-walked

| Scaffold row | Status | Now |
|---|---|---|
| C7 · four seats | holds | tests/canon/groundwork.test.ts › "four seats: SEAT_SLOT_CAP lead, the fourth sinks below the next rule's hit" |
| C7 · three hits of one rule | holds | › "three hits of one rule: RULE_SLOT_CAP lead, the third sinks below another rule" |
| C8 + E6 · an excluded seat never seats | holds | › "a seat whose account is in excludedIds never seats" (day.ts:278); the HomeRoom half is §E's C8 row |
| D22 · the research stamp drops | holds | › "the research stamp drops for the day when every eligible account has its own move" |
| D22 · the roundup rides the free account | holds | › "the roundup slot rides the one free account on the roster, never an occupied one" |
| D22 · the roundup drops | holds | › "the roundup slot drops for the day when the whole roster is occupied" |
| bearer after the seats | holds | › "a seated account is never the research bearer — the bearer is chosen after the seats" |
| C9 · the bearer | holds | › "the strongest account has its own move; the stamp rides the weaker free one", › "with every bearer free, the strongest carries it" |
| D26 · one band table | holds | › "8:00 Chicago is not the live send band; 10:00 is sends; 12:30 is people; 15:00 is research", › "the band edges, minute by minute", › "winter time reads the same wall clock (CST)" (bands.ts:12, :31, :38) |
| D27 · no empty label | superseded by pass 7 (#366, d119c52) | the stamp words changed on the ship order (CLAUDE.md:280): › "the three once-silent rules say what was done: the seat, the gem, the first conversation" asserts "WORKED THE MOVE FROM THE SHEET · SEATED 8/20", "ACTED ON {who}’S PHR STALL" and "OPENED THE FIRST CONVERSATION" where the scaffold asserted SEATED, THEIRS and ENGAGED · NEVER MET; › "no stamp is a bare noun: each opens on what the operator did" is new; the empty-label and unknown-rule tests hold |
| P3/D23 · the Act Lane's send row | holds | tests/canon/act-lane.test.ts › "Send's row carries the operator as actor, the address as recipient, and no money", › "a blank subject still files as a send, addressed" (act/lane.ts:24) |
| Act Lane · three seats lead | holds | › "a fourth seat sinks below the third — and below the next rule's own hit" |
| D20 · personMoved | holds | the four personMoved tests in tests/canon/second-record.test.ts (acted.ts:35) |
| D21 · gem lines are operator copy | holds | the five lint tests, and five more the pass-5 close added (#336): paradox, maxim, definitional flip, escalating triad, chiasmus |
| D28 · PROMISED needs a hearer | holds | the three tests in tests/canon/closer-rule.test.ts; the typed-hearer half is §A.3's |
| D25 · the move carries who and when | superseded in part by pass 7 (#359, 4f4779d) | five tests hold; › "their promise holds the await and says when it was made" now asserts "Wait on {who}. Promised yesterday." where the scaffold's asserted the retired "Hold for their follow-up." line (CLAUDE.md:435) |
| C20 + E10 · a waiting pick survives | holds | the six reload tests in tests/canon/chute.test.ts (saveLedger and loadLedger, chute-ledger.ts:217, :233) |
| D12 · a settled row keeps no address or text | holds | the five tests (storedRow, chute-ledger.ts:167) |
| D11 · three at once | holds | the two runLimited tests (chute-ledger.ts:254) |
| D16 · the same body | holds | the five fingerprint tests, and › "the .eml and the .msg of one mail fingerprint equal (a twin format dedupes)" from the pass-5 close (fingerprintBody, paste-files.ts:101) |
| D2 · the Drop refuses a .csv | holds | the three readFileToText tests (read-file.ts:68-69); since slice 8 the Drop refuses before any read too (planDrop, use-ingest.ts:78-86), tests/ingest-hooks.test.ts › "a refused .csv on the Drop is vaulted and not read, and its receipt names the Chute" (chain) |
| D1 · one Chute, one roster | holds | the two routingRoster() tests; since slice 7 neither mount passes a roster (#345; room/page.tsx:812, intranet/page.tsx:120), tests/ingest-route.test.ts › "the doors route through the action, and no roster prop rides either page" (text) |
| D30 · the mirror excludes namespaced rows | holds | the two tests (record-rows.ts:29; runners.ts:153) |
| E3 · no writer without redaction | holds | the five tests in tests/canon/ted-doctrine.test.ts; their fixtures gained `door: "hand"` when the door became required (#341) |
| E9 · the research chip | holds | the three latestResearchAt tests (deep-research.ts:27) |
| E2 · every corpus carries actors and a homeSide | holds as a test; superseded on the live path by pass 7 | both tests call corpusFor, which no src code calls since the single read (#346 to #354; extract.ts:99); the live classifier is docOf (record/docs.ts:164-221), held on the same fixture by tests/record-read.test.ts › "ted-doctrine: a reply to us with a declared roster, and our own send" (chain) |
| C3 · the touch log merges by latest | holds | the two lastTouchRead tests (touch.ts:114), which the read reaches through whoseMove (whose-move.ts:162) |
| E5 · the Sendbook reads effectiveAt | holds | the two tests, now through buildSendbook's rows door (docsFromRows, sendbook/read.ts:107; #354) |
| C4 · ↩ REPLIED needs substance | holds | the three tests |
| C5 · machinery never warms | holds | the machinery loop and its contrast test |
| E8 · nothing on the paper dies | holds | the five strike tests (scratch.ts:20, :35), and five edit tests the pass-5 close added for D24 |
| P1 · an archived surface leaves every list | holds | the scaffold's four tests, and three the pass-5 close added: › "the retired surfaces are in the table under no href", › "no page file exists for /today or /pipeline", › "no file under src/app imports a retired surface's actions" |
| C13 · questionById | holds | the three tests; questionById still has no src caller (bank.ts:30), so the decree stands unfollowed (§E) |
| the one model roster | holds | the two tests; the verdict slot joined the roster in #343 (doctrine.ts:39) |

### A.2 re-walked

| Source change | Status | Now |
|---|---|---|
| day.ts: seat loop, bearer, roundup, QUEUE_RULE_IDS | holds | day.ts:278, :556, :215 |
| bands.ts and the Klaxon | holds | bands.ts:12, :31, :38 |
| stamp.ts stampSubtext | superseded by pass 7 (#366) | stamp.ts:48 says what the operator did |
| act/lane.ts actSendRow | holds | act/lane.ts:24 |
| activity/acted.ts personMoved | holds | acted.ts:35 |
| activity/lint.ts | holds | four devices more since #336 |
| the court stops passing; the engine half waits | superseded by pass 7 (#354, 823a770) | the engine's court is deleted (engine.ts:7-8); see §A.3 |
| chute-ledger.ts | holds, grown | HeldVerdict :46, handOffRow :317 and seatHandOff :344 came with #360 and #363 |
| paste-files.ts HEAD_LINE_RE and fingerprintBody | superseded by pass 7 (#340, 292bfe5) | HEAD_LINE_RE lives in dialect.ts:65; fingerprintBody stays at paste-files.ts:101 and imports it |
| read-file.ts refuses a .csv on the Drop | holds | read-file.ts:68-69, under planDrop since #348 |
| intranet/page.tsx takes routingRoster() | superseded by pass 7 (#345, 105b7d7) | no roster prop at all; routing on the server (route-actions.ts:40) |
| notes/record-rows.ts | holds | record-rows.ts:22, :29 |
| notes/write.ts redacts, takes a client, keepFigures | holds, grown | door required and `structured` (#341), createTodoRow (write.ts:213) |
| deep-research.ts latestResearchAt | holds | deep-research.ts:27 |
| extract.ts homeSide required | holds on a function no src code calls | corpusFor's options (extract.ts:130); the read declares homeSide in its own input (read.ts:60) |
| sendbook/read.ts effectiveAt, theirVoice, isSignOff | superseded by pass 7 (#354) | the register reads the read's docs and their flags (theirVoice over RecordDoc at sendbook/read.ts:184; docsFromRows :107) |
| scratch.ts strikeMove and strikeLine | holds | scratch.ts:20, :35 |
| components/wayfinder-routes.ts | holds | wayfinder-routes.ts:29 |
| intel/bank.ts questionById | holds, with no src caller | bank.ts:30; brief.ts, its one caller, was deleted by the pass-5 close with its suite (#336) |
| intranet/doctrine.ts one roster | holds | doctrine.ts:28-54 |
| chain suites that read the data tables | holds [not re-walked line by line] | read-absorption, followups, second-record-faces and vault pass alone on this tree |

### A.3 re-walked

| Decree | Status | Now |
|---|---|---|
| D25, the engine half | superseded by pass 7 (#354) | the court and its chips are deleted (engine.ts:7-8); room-read, pipeline-fixes and accepted-invite assert the move line; tests/canon/spring.test.ts and tests/record-read.test.ts › "the five whose-move fixtures of pass 2 B rows 1 to 5 give one answer each" hold it |
| D18, the acted stamp survives the take-back | holds as unpinned and unbuilt | out of pass 7 by the plan's §6; takeBackSecondRecord still clears the second record (run.ts:1250) |
| D5, the pick is final | superseded by pass 7 (#343, 9a8beeb) | guardPlan (guard.ts:183, force at :197); tests/ingest-guard.test.ts › "re-runs the read: the plan holds no read and runs no rung with force", › "against a duplicate under the picked account is refused" (chain) |
| D28, the typed hearer | holds as unpinned and unbuilt; a live violation | sheet-view.ts:202 sets `promised` only for a "from M/D paste" line, so a typed date that names its hearer reads as a wall (CLAUDE.md:433) |
| D24, click-away keeps an edit | superseded by the pass-5 close (#336) | editOutcome (scratch.ts:48); tests/canon/scratchpaper.test.ts › "blur keeps the draft: a click-away never eats your words" (chain) |
| P4, the second record's bare creates | superseded by pass 7 (#352, 09bf0a2) | run.ts:294-307 through the writer with `structured`; tests/canon/provenance.test.ts › "a fresh key goes through the writer with the activity door and the export's people" (chain) |
| the closer classifier's own cases | holds | tests/closer.test.ts, in the chain |
| P2, only the model's read is windowed | superseded by pass 7 (#342, 0fb8419) | windows.ts; tests/ingest-filing.test.ts › "the tape's archive note is the whole text", › "the no-entries note is the whole text", › '"Read 60,000 of 212,000 characters." and "The duplicate check didn't run."' |
| P3, the door is a column | superseded by pass 7 (#341, 8db896e) | schema.prisma:1116, doors.ts:15; tests/canon/provenance.test.ts › "every createAccountNoteRow call in src passes a door from DOORS" (text), › "every door the roster names is stored, beside lane, actors, source and recipients" (chain) |
| D3, the transcriber emits CALL TRANSCRIPT | superseded by pass 7 (#340) | paste.ts:73-75; tests/ingest-dialect.test.ts, "the transcriber's ask" (chain on the prompt; transcribePdf itself is called by no test) |
| D4, the Intranet's capture is a door | superseded by pass 7 (#353, df38ecb) | capture-actions.ts:103-265; tests/intranet-capture.test.ts › "a capture naming a known address routes to its account and files" (chain) |
| D8, the server-side upload | superseded by pass 7 (#345) | vault-actions.ts, vault.ts; tests/ingest-route.test.ts › "the grant action is gone and nothing imports it" (text), › "a 10 MB file arrives in three pieces and lands as one GitHub PUT" (chain) |
| D9, vaulting is filing | superseded by pass 7 (#345, #348, #360) and amended | an unreadable file routes by filename or waits for the pick (chute.tsx:370-381); backups are permanent and carry no ↺ (receipt.tsx:235-252; CLAUDE.md:305, :309); tests/vault.test.ts › "the chute vaults every drop and routes binaries by filename or pick" (chain) |
| D13, the fold | holds as unpinned | the fold is still inline in chute.tsx:562-576 and no test pins "every waiting row plus the two newest settled"; per-row and all-at-once dismissals exist (use-receipts.ts:126-127) |
| D14, routing on the server | superseded by pass 7 (#345) | route-actions.ts:40; tests/ingest-route.test.ts › "an address the book lacks and the record holds routes by the email rung" (chain), › "no client module imports the book's roster or the server router" (text) |
| D15, no revalidation list | superseded in part by pass 7 (#350, 661940b) | nothing under src/app/room revalidates (tests/canon/chute.test.ts › "no file under src/app/room revalidates a path or a tag", text); 41 calls remain in ten files elsewhere (the map's pass-8 section) |
| D17, staging verifies first | holds as unpinned and unbuilt | out of pass 7 by the plan's §6 |
| D19, a colleague is book-internal or on our domain | half superseded by pass 7 (#349, #354) | the attributed-body half is built (the rollup's lastTheirs; tests/record-read.test.ts › "an export row with an attributed inbound body excludes for 21 days", tests/canon/sendbook.test.ts › "the account-level datetime alone sets neither (D19)"); the colleague roster still counts two accounts first (activity/ingest.ts:358-370) |
| D29, the read-only bar | superseded by pass 7 (#348) | chute.tsx:615-627; tests/ingest-hooks.test.ts › "the read-only state renders the bar and no input" (chain), tests/ingest-faces.test.ts › "↺ is absent in a read-only session" (chain) |

### B re-walked

| Suite | Status | Now |
|---|---|---|
| route-capture | holds | the rung asserts at route-capture.test.ts:35, :44, :102 |
| misfile-guard | holds | rung "person" at misfile-guard.test.ts:55; rung "claim" and the claim at :103-104 |
| ingest-defects | holds, re-aimed | the keyless rung is › "the keyless early rung stands on the text's own evidence" (ingest-defects.test.ts:171-183); slice 8 moved bugs 1 and 2 in as behavior on the hooks (#348) |
| paste-files | holds | the kind asserts stand (paste-files.test.ts:26, :50) |
| vault | holds | releaseMetaFor (vault.test.ts:61-73); the scripted release, POST, POST, PATCH (:315); readerFor and the reader's gate (:83, :114); the decoy token (:141-161); the recording routes by filename (:197-205); the landing log (:392) |
| read-absorption | holds | the deleted assertion stays deleted |
| second-record-faces | holds | the deleted assertion stays deleted |
| the pins left as text | holds, moved | the server-action sequencing pins still read actions.ts (ingest-defects.test.ts:164-169, :189-193, :206-218); the component-wiring pins now read the hook calls (`useUndo()`, ingest-defects.test.ts:263-266); ai-clean's prompt case stands |

### C re-walked

Every removal holds. Re-checked on this tree: src/app/today, src/app/pipeline, src/app/book/page.tsx, src/app/look-into, src/app/dev/popover, src/app/prospect-field, src/app/notes/notes-client.tsx, src/app/dashboard/dashboard-client.tsx, src/lib/public-access.ts, src/components/partner-notes.tsx, src/lib/aleks/one-on-one.ts, src/lib/cloud-data-policy.ts, src/lib/paste.ts and the four cascade files are absent, and no PUBLIC_ACCESS reference remains in src. Three rows moved since:

- **SAFE NOW 3.** The court classes kept for room-parity are gone: the pass-5 close removed `.court` and the c_you, c_them, c_quiet and c_none rules (#336), and tests/room-parity.test.ts no longer names them. The five `#8a5a00` rules outside the THEIRS line stand (room.module.css:830, :833, :900, :914, :1378), left to the face pass by the plan's §6.
- **REMOVE · the risk: read.** Still blocked and still in place (accounts/page.tsx:95-101).
- **The pass-4 misses.** selectQuestions (bank.ts:113) is still exported and called by nothing in src, with productOf and sophOf (:58, :61) behind it. src/lib/look-into/live.ts is now imported by nothing at all: the pass-5 close deleted tests/narrative.test.ts, its last reader (#336).

### D re-walked

| file | Status | Now |
|---|---|---|
| ai-clean.ts header | holds | ai-clean.ts:1-8 |
| ai-clean.ts model comment | holds | the slot is MODEL_READ from the roster (ai-clean.ts:13, :505) |
| book/roster.ts header | holds | roster.ts:1-7; the joined roster widens it on the server (route.ts:196-207) |
| groundwork/compose.ts | holds | compose.ts:96-99 |
| intel/discovery-product.ts | holds | discovery-product.ts:12-22 still names the missing door |
| command-center/types.ts | holds | types.ts:28-35 names ALLOWED as the filter C19 retires |
| notes/write.ts header | superseded by pass 7 (#341, #352) | write.ts:1-26: no bare create remains, the second record writes through the writer, the door is required, the Todo has its writer |
| archive/actions.ts | holds | archive/actions.ts:3-9 |
| intake/capture-shelf.tsx | moved, then went stale | the comment now lives at src/app/intake/grabs.ts:109-116; its last sentence, that the grab box's paste "files an Intranet capture, never an account note", is untrue since slice 16 (#353): a capture that names an account files through roomPaste |
| intranet/segment.ts | holds | segment.ts:10-15 |
| intel/meeting.ts | holds | meeting.ts:1-12, reading the dialect table since #340 |
| pricing/quote.ts | holds | quote.ts:1-9 |
| paste-files.ts, the doors agree but the .csv | holds | paste-files.ts:575 |
| paste-files.ts, the fingerprint | holds | paste-files.ts:57-75, HEAD_LINE_RE now the dialect table's |
| intranet/doctrine.ts and intranet/extract.ts | holds | doctrine.ts:28-54 |
| room/chute.tsx header | superseded by pass 7 (#348, #360) | chute.tsx:3-23 describes the door over the shared hooks and the two faces |
| room/theirs-line.tsx | superseded by pass 7 (#346, 6f5e42b) | the stylesheet paints the blue (room.module.css:2355-2358); theirs-line.tsx:3-12 says so |
| the 27 plan-section cites | holds | no "SECOND-RECORD-PLAN" or "Appendix A" cite remains in src |
| .env.example | holds | the seven variables (.env.example:3-30); GITHUB_ARCHIVE_REPO and GITHUB_ARCHIVE_TOKEN are read on the server alone now (vault-actions.ts:63-64) |

### E re-walked

| Decree | Status | Now |
|---|---|---|
| C1 · LAST HUMAN TOUCH reads both records (CLAUDE.md:494) | followed since pass 7 (#351, 395268a) | lastHumanTouch (record/accounts.ts:30; accounts/page.tsx:372); tests/record-read.test.ts › "an .eml filed Sep 22 beats an export row of Sep 10 and whispers record" (chain) |
| C2 · the roster reads the record (:299) | followed since pass 7 (#345) | joinRosters (route.ts:102); tests/ingest-route.test.ts › "an address the book lacks and the record holds routes by the email rung" (chain) |
| C3 · the touch log (:411) | holds | canon/ted-doctrine |
| C4 · ↩ REPLIED needs substance (:362) | followed on both paths since pass 7 (#354) | the org-wide path reads the attributed inbound (orgSignalsOf, sendbook/read.ts:275); tests/canon/sendbook.test.ts › "the account-level datetime alone sets neither (D19)", tests/second-record-faces.test.ts › "an attributed inbound body sets the Sendbook lane and ↩ REPLIED; a bare datetime sets neither (D19)" (chain) |
| C5 · machinery never warms (:362) | followed on both paths since pass 7 (#354) | the same pins |
| C6 · the exclusion reads both records (:276) | followed since pass 7 (#349, aa36489) | liveMotionIds reads the rollup's lastTheirs (day.ts:88; groundwork/page.tsx:380); the coordination move is retired; tests/canon/groundwork.test.ts › "their mail to a colleague's inbox is a real inbound on the first record: excluded, no item under any rule" (chain) |
| C7 · two caps (:278) | holds | canon/groundwork |
| C8 · a seat follows its account (:532) | followed in full since pass 7 (#349) | the HomeRoom half reads the seat on the sheet (sheet-view.ts:64-73); tests/record-read.test.ts › "excluded: the seat is an open line carrying the act, the seat row's own id" (chain) |
| C9 · the vehicle rule (:278, :489) | holds | canon/groundwork |
| C10 · the Scratchpaper's carve-out (:595) | holds | scratch/actions.ts:82 |
| C11 · the country wing (:595) | holds [not re-walked; pass 7 left the files alone] | tests/playbook-sheet.test.ts in the chain |
| C12 · the learned register keeps its names (:583) | holds [not re-walked; pass 7 left the files alone] | — |
| C13 · the citation opens in place (:583) | not followed; a live violation outside pass 7 by the plan's §6 | the ask links still skip a playbook citation (ask/links.ts:65-70) and questionById has no src caller; the operator sees a playbook citation on /asks or the pad's ask door that opens nothing |
| C14 · the Spring's controls (:379-381) | holds [not re-walked] | — |
| C15 · retired text (:498) | holds | the dashboard door is plain words in the drilldown (accounts-client.tsx:1234) |
| C16 · THEIRS is the account's people (:496) | followed since pass 7 (#346, #349) | `.theirs` takes the blue (room.module.css:2355-2358); theirsLine leads with an account person's gem only (activity/read.ts:430); tests/record-read.test.ts › "THEIRS's lead skips a colleague's gem, and the colleague's gem has no seat behind it" (chain) |
| C17 · answer rows hedge (:79-81) | holds [not re-walked] | — |
| C18 · the who chip row (:362) | followed since pass 7 (#349) | whoChipNames (sendbook/read.ts:450); tests/record-read.test.ts › "the record's person and a second name from the book: two names, the record first, the row asks" (chain) |
| C19 · the Approach is a fact (:247) | not followed; a live violation outside pass 7 by the plan's §6 | ALLOWED still filters the kits by approach, NEEDS_CSM reaching the CSM play alone (campaigns/index.ts:24-28, :171-174), and the draft desk seeds `kitsFor(stage, approach)[0]` (draft-actions.ts:63, :74), so a NEEDS_CSM account's composed draft seeds the CSM play where the decree makes the stage's direct play the default [inferred from code shape; not run] |
| C20 · a waiting pick survives (:301) | holds | canon/chute |

Of the ten the corrected count above left unfollowed, eight are followed now (C1, C2, C4, C5, C6, C8, C16, C18) and two are not (C13, C19), both outside pass 7 by the plan's §6 and both live.

### The counts, re-walked

| | Scaffold close | Pass 8 |
|---|---|---|
| Test files in the chain | 51 | 62 (package.json:10): the pass-5 close deleted brief and format (#336, 49), pass 7 added thirteen |
| Canon tests in the scaffold's ten files | 97 | 129, all passing alone |
| Canon files in the chain | 10 | 11 (with provenance, 24 tests) |
| Canon files that read source | 0 | 3 (standing-decrees, chute, provenance) |
| A.1 rows | 34 | 31 hold (C13's among them, its decree still unfollowed), 2 superseded by pass 7 (D27, D25 in part), 1 held only off the live path (E2) |
| A.3 rows | 19 | 12 superseded (11 by pass 7, D24 by the pass-5 close), 2 superseded in part by pass 7 (D15 outside src/app/room, D19's colleague roster), 4 still open (D18, D28's typed half, D13, D17), 1 needing nothing (the closer cases) |
| E rows | 20 | 18 followed (8 of them since pass 7), 2 not followed and live (C13, C19) |

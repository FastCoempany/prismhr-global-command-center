---
title: Decree Ledger Appendix
status: Audit pass 3 evidence tables, 2026-09-25
owner: Founder
related_docs:
  - docs/architecture/decree-ledger.md
---

# Decree Ledger Appendix

The evidence tables behind docs/architecture/decree-ledger.md that the ledger only summarizes: the full operator-facing string inventory of the ingest surfaces and its writing-canon findings (A12), the click-depth dead ends on those surfaces (A5), and the list of decrees the violations-only sweep checked and found clean, so the next pass need not re-check them. Cites are against main at 3726363, the tree pass 3 ran on.

## 1. Operator-facing strings on the ingest surfaces

Scope: the Chute (src/app/room/chute.tsx), the Drop inside src/app/room/room-client.tsx, roomPaste's returned reasons (src/app/room/actions.ts), the reader and vault reasons those surfaces render, and the dock and run receipts the Chute shows as its last line.

| file:line | String (verbatim) | Surface |
|---|---|---|
| chute.tsx:102 | A reload cut the read short. Drop the file again. | Chute receipt (interrupted) |
| chute.tsx:236 | Already on file. (fallback) | Chute receipt (dupe) |
| chute.tsx:239 | The file didn't take. (fallback) | Chute receipt (error) |
| chute.tsx:254 | vaulting {file}… | Chute vault line |
| chute.tsx:274 | pre-release · {detail} / vaulted · {detail} | Chute vault line |
| chute.tsx:294 | The activity report. Reading it here — blasts tally in the browser. | Chute receipt (activity) |
| chute.tsx:304 | The drop didn't take. (fallback) | Chute receipt |
| chute.tsx:310 | Nothing changed — the record already holds this drop. | Chute receipt (activity dupe) |
| chute.tsx:321 | {n} rows · {n} accounts · {n} carrying email text. Distilling… | Chute receipt |
| chute.tsx:332 | The second record is distilled. (fallback) | Chute receipt |
| chute.tsx:333 | The run stopped — the Intranet dock holds the receipt. (fallback) | Chute receipt |
| chute.tsx:338 | Distilling — {n} account(s) to go. | Chute receipt |
| chute.tsx:344 | The drop broke midway. Drop it again — staging replaces wholesale. | Chute receipt |
| chute.tsx:383 | The filing broke. Drop it again. | Chute receipt |
| chute.tsx:429 | title: Clear this receipt. The record keeps everything that filed. | Chute tooltip |
| chute.tsx:436 | Reading… | Chute receipt |
| chute.tsx:439 | Filing to {name}… ({why}) | Chute receipt |
| chute.tsx:444 | ✓ {name} · {n} filed | Chute receipt |
| chute.tsx:446 | · the reader was down — raw text only, nothing routed; ↩ undo and re-drop when it's back | Chute receipt (degraded) |
| chute.tsx:448 | · transcript on file | Chute receipt |
| chute.tsx:451 | · {n} action(s) opened | Chute receipt |
| chute.tsx:454 | · {n} ask(s) queued | Chute receipt |
| chute.tsx:456 | · {n} to the playbook | Chute receipt |
| chute.tsx:457 | · {why} | Chute receipt |
| chute.tsx:462 | title: Wrong account? Takes back everything this filing wrote. | Chute tooltip |
| chute.tsx:471-475 | Taken back from {name}. {n} removed, {n} action(s) retired. | Chute receipt (undone) |
| chute.tsx:480 | ↩ undo | Chute button |
| chute.tsx:488 | Vaulted to {name}. / its account | Chute receipt |
| chute.tsx:494-497 | {n} rows · {n} accounts · {n} carrying email text. + This drop read nothing. / {reason} | Chute receipt (activityDone) |
| chute.tsx:498 | The receipt waits on the Intranet. | Chute receipt link |
| chute.tsx:504 | title: Press again to clear it. Earlier drops are not kept, so nothing is restored. | Chute tooltip |
| chute.tsx:505 | title: Take this drop back. Clears every account's second-record read. | Chute tooltip |
| chute.tsx:517 | {r.lines[0]} Nothing was restored — earlier drops are not kept. | Chute receipt |
| chute.tsx:518 | The take-back failed. (fallback) | Chute receipt |
| chute.tsx:523 | ↩ sure? / ↩ take it back | Chute button |
| chute.tsx:532-535 | ⇪ {vault.text} + open | Chute vault line |
| chute.tsx:547 | The pick did not survive. Drop the file again. | Chute receipt |
| chute.tsx:554 | Reads like {claim / "another account"}. Pick the account. | Chute banner (mismatch) |
| chute.tsx:557 | No sure match. Pick the account. | Chute banner (pick) |
| chute.tsx:560 | A file the reader can't open. Pick its account for the vault. | Chute banner |
| chute.tsx:570 | title: The rest of this drop filed there. | Chute tooltip |
| chute.tsx:577 | the rest of this drop went there | Chute receipt (why) |
| chute.tsx:584 | File to {name} | Chute button |
| chute.tsx:600 | your call | Chute receipt (why) |
| chute.tsx:609 | Pick the account… | Chute select |
| chute.tsx:613 | {name} · {why} | Chute select option |
| chute.tsx:644 | THE CHUTE | Chute kicker |
| chute.tsx:646 | Throw files here. They find their account. | Chute bar line |
| chute.tsx:653 | ⇪ Files | Chute button |
| chute.tsx:668-683 | The pact paragraph (three sentences of about sixty words each, quoted in full in the ledger's A12 row 5) | Chute standing text |
| chute.tsx:695/697/699 | {n} running · {n} need(s) your pick · {n} settled today | Chute meter |
| chute.tsx:727 | Fold the ledger / Open the ledger · {n} | Chute button |
| chute.tsx:740 | Clear the receipts | Chute button |
| room-client.tsx:429/633/762 | The undo didn't take. (fallback) | Drop note |
| room-client.tsx:504-510 | Filed {n} entry/entries + , read by Claude / by the rules, judgment by Claude + . | Drop receipt |
| room-client.tsx:512 | {n} action(s) opened. | Drop receipt |
| room-client.tsx:514 | {n} new ask(s) queued. | Drop receipt |
| room-client.tsx:515 | {n} to the playbook. | Drop receipt |
| room-client.tsx:516 | Reads {status}. Confirm below. | Drop receipt |
| room-client.tsx:519 | The reader is down, so the raw text filed as one line and nothing routed. Undo this paste and drop it again when the reader is back. | Drop receipt |
| room-client.tsx:520 | The read didn't complete. The rules filed the entries. Nothing was opened or asked. The account check ran on the text's own evidence only. Undo if it landed on the wrong row. | Drop receipt |
| room-client.tsx:533 | The paste didn't file. (fallback) | Drop note |
| room-client.tsx:544 | {read.reason} | Drop note |
| room-client.tsx:570 | Archiving {file} to the vault… | Drop vault line |
| room-client.tsx:579 | {file} archived[ as a pre-release] · {detail} | Drop vault line |
| room-client.tsx:753-757 | Paste undone. Removed {n} entry/entries[ and {n} action(s)]. | Drop receipt |
| room-client.tsx:1495 | routed → {name}'s record | Drop receipt |
| room-client.tsx:1503 | ↩ undo | Drop button |
| room-client.tsx:1510 | ✸ make it an action → | Drop button |
| room-client.tsx:1577 | title: Takes back everything this paste filed, the actions it opened included. | Drop tooltip |
| room-client.tsx:1579 | ↩ undo paste | Drop button |
| room-client.tsx:1589 | opened → | Drop receipt chip head |
| room-client.tsx:1609 | title: Take it back. The read got this one wrong. | Drop tooltip |
| room-client.tsx:1626 | Collapse ▴ / Show {n} more ▸ | Drop button |
| room-client.tsx:1858 | THE DROP · FILES TO {NAME}, EVERYWHERE | Drop kicker |
| room-client.tsx:1867 | title: The bolt — paste anything. It reads and files to {name}. | Drop tooltip |
| room-client.tsx:1879 | title: Note — a line for the record on {name}. | Drop tooltip |
| room-client.tsx:1892 | title: Action — open work on the sheet for {name}. | Drop tooltip |
| room-client.tsx:1907 | title: File — email, PDF, transcript, spreadsheet, document, or image. | Drop tooltip |
| room-client.tsx:1929-1930 | Enter files to {First} · Shift+Enter newline · drop a file anywhere on the Drop | Drop hint |
| room-client.tsx:1942 | placeholder: Type the second it happens: call notes, Teams pastes, stray thoughts… | Drop placeholder |
| room-client.tsx:1947 | Reads as {label}. Enter runs the full read. | Drop hint |
| room-client.tsx:1957 | placeholder: Paste the Salesforce capture, an email, or meeting notes. Or drop a .eml, .msg, or .pdf file. It files to {name}. | Drop placeholder |
| room-client.tsx:1961 | Reads as {label}. | Drop hint |
| room-client.tsx:1973 | Cancel | Drop button |
| room-client.tsx:1981 | Reading… / ✨ Read & file | Drop button |
| room-client.tsx:1995-1996 | This reads like {claim}, not {bound}[ — {why}]. | Drop mismatch banner |
| room-client.tsx:1998 | For {bound}: {boundWhy}. | Drop mismatch banner |
| room-client.tsx:1999 | Nothing in the text points to {bound}. | Drop mismatch banner |
| room-client.tsx:2000 | Nothing filed yet, and the file is holding out of the vault. | Drop mismatch banner |
| room-client.tsx:2007 → :2031 | {bound} — reading it again → renders Reading {bound} — reading it again… | Drop status |
| room-client.tsx:2018 | Filing… / No — it's {bound}'s ✓ | Drop button |
| room-client.tsx:2026 | keep it out ✕ | Drop button |
| room-client.tsx:2031 | Reading {file}… | Drop status |
| room-client.tsx:2034/2039 | ⇪ {arch.text} + open on GitHub | Drop vault line |
| paste-files.ts:15-33 | a call transcript / an Outlook thread / a Teams chat / a Sales Nav grab / an email thread / Salesforce activity / a transcript / notes | Drop hint (Reads as …) |
| actions.ts:198 | That row isn't bound to a known account. | roomPaste reason |
| actions.ts:201 | Paste something first. | roomPaste reason |
| actions.ts:203/909/1799-1813 | Read-only session. | roomPaste, undo, reader reason |
| actions.ts:228 | Already on file.[ Filed M/D.] Nothing filed twice. | roomPaste reason |
| actions.ts:259/337 | This reads like {claim}, not {name} — {why}. | roomPaste mismatch reason; not rendered at either door (both render from r.mismatch) |
| actions.ts:404 | Nothing recognizable to file. | roomPaste reason |
| actions.ts:488 | Filing failed partway. Check the account page. | roomPaste reason |
| actions.ts:907 | Nothing to undo. | roomPasteUndo reason |
| actions.ts:962 | The undo didn't take. Try again. | roomPasteUndo reason |
| actions.ts:1736 | The reader is unreachable. Paste the text instead. | PDF reader reason |
| actions.ts:1738 | That file is over 8 MB. Export a smaller one. | PDF reader reason |
| actions.ts:1741 | The reader takes PDFs and images here. | PDF reader reason |
| actions.ts:1776 | The reader declined this document. | PDF reader reason |
| actions.ts:1786 | Nothing readable came back from the document. | PDF reader reason |
| actions.ts:1789 | The document read failed. Paste the text instead. | PDF reader reason |
| actions.ts:1802/1813 | No file arrived. | PDF reader reason |
| misfile.ts:142 | the read names {claim} | why → Drop banner |
| route-capture.ts:153 | {email} is {name}'s contact | why → Chute and Drop |
| route-capture.ts:161 | {domain} address in the text | why |
| route-capture.ts:164 | {Person} is {name}'s contact | why |
| route-capture.ts:174 | named in the text | why |
| route-capture.ts:184 | “{head}” appears in the text | why |
| route-capture.ts:189 | “{init}” matches the initials | why |
| read-file.ts:57 | Can't read {file}. Drop email, PDF, transcript, spreadsheet, document, image, or plain text. | Drop note |
| read-file.ts:99 | {file} couldn't be decoded in this browser. Screenshot it as JPG or PNG instead. | Drop note |
| read-file.ts:107 | The image read failed. Paste the text instead. | Drop note |
| read-file.ts:134 | The document read failed. Paste the text instead. | Drop note |
| read-file.ts:139 | {file} came back empty. Paste the text instead. | Drop note |
| read-file.ts:142 | Reading {file} failed. Paste the text instead. | Drop note |
| archive-actions.ts:18 | Read-only session. | vault line |
| archive-actions.ts:24-25 | The vault isn't configured — GITHUB_ARCHIVE_REPO and GITHUB_ARCHIVE_TOKEN. | vault line |
| archive.ts:107 | {file} is over GitHub's 2GB asset cap. | vault line |
| archive.ts:144/175 | GitHub said: {message} | vault line |
| archive.ts:149/214 | accounts/{account}/{file} / {tag} | vault line |
| archive.ts:193 | The asset upload failed — {msg}. The draft was cleared; drop it again. | vault line |
| archive.ts:208 | The upload landed but publishing failed — {msg}. The release sits in drafts on GitHub. | vault line |
| archive.ts:234/249 | {path} · landed; the reply was lost on the way back | vault line |
| archive.ts:261 | The GitHub call broke off{said}. The vault shows no copy. Drop it again. | vault line |
| dock.tsx:41 | A run was interrupted — {n} accounts still wait. Drop again or press ⟳. | dock line |
| dock.tsx:54 | The second record is distilled. | dock line |
| dock.tsx:55 | The run stopped — see the receipt. (fallback) | dock line |
| dock.tsx:60 | Distilling — {n} account(s) to go. Watch the gadget. | dock line |
| dock.tsx:68 | {file} isn't a .csv — the dock takes the activity export only. | dock line |
| dock.tsx:75 / ingest.ts:130 | This isn't the activity report — 18 Digit ID / Subject missing. Check the export's columns. | dock line / Chute error |
| dock.tsx:80 | The activity report. Reading it here — blasts tally in the browser and never upload. | dock line |
| dock.tsx:89 | The drop didn't take. Drop it again. (fallback) | dock line |
| dock.tsx:93 | Nothing changed — the record already holds this drop. | dock line |
| dock.tsx:98 | {n} rows · {n} accounts · {n} carrying email text. {n} to distill, {n} tally-only. | dock line |
| dock.tsx:102 | The drop broke midway. Drop the file again — staging replaces wholesale. | dock line |
| dock.tsx:126 | THE SECOND RECORD | dock kicker |
| dock.tsx:130 | Last drop {day} · distilled / · {phase} | dock line |
| dock.tsx:131 | Drop the weekly activity export here. | dock empty state |
| dock.tsx:139 | ⇪ File | dock button |
| dock.tsx:147 | title: Press again to clear it. Earlier drops are not kept — nothing is restored. | dock tooltip |
| dock.tsx:148 | title: Take back this drop. Clears every account's second-record read. | dock tooltip |
| dock.tsx:154 | Press ↩ again to clear the second record. Earlier drops are not kept, so nothing is restored. | dock line |
| dock.tsx:163 | The take-back failed. (fallback) | dock line |
| dock.tsx:172 | ↩ sure? / ↩ | dock button |
| dock.tsx:179 | title: Continue the interrupted run. | dock tooltip |
| dock.tsx:194 | Fold the receipt / Receipt · {n} | dock button |
| upload.ts:74 | Reading… {n} MB in, {n} rows. | progress |
| upload.ts:100 | Parsed {n} rows. Sealing the slices… | progress |
| upload.ts:109 | The file held no readable rows. | reason |
| upload.ts:139 | Uploading slice batch {i} of {n}… | progress |
| upload.ts:150 | A batch didn't land. (fallback) | reason |
| activity/actions.ts:21/32/48/76 | Read-only session. / Staging failed — {msg}. / The pass failed — {msg}. / The take-back failed — {msg}. | reason |
| run.ts:331 | Upload incomplete — {n} of {m} batches missing. Drop the file again. | dock receipt |
| run.ts:332 | {n} account slice(s) failed verification. Drop the file again. | dock receipt |
| run.ts:361 | Nothing changed — the record already holds this drop. | dock receipt |
| run.ts:402-403 | The drop landed — {n} rows across {m} accounts, {k} of them carrying email text[, {d} identical repeats kept (multi-recipient sends look alike)]. | dock receipt |
| run.ts:406 | NOT ONE ROW CARRIED TEXT — this drop read nothing. Check the export's Full Comments column and drop it again. | dock receipt |
| run.ts:410 | Missing columns this drop: {cols} — those readings run dark. | dock receipt |
| run.ts:413 | New columns ignored: {cols}. | dock receipt |
| run.ts:416-420 | {n} rows matched no book account: {name} ({rows}), … | dock receipt |
| run.ts:424-425 | Name collisions (unresolved either side): {names}. | dock receipt |
| run.ts:439-440 | Lane drift: {lane} {n}% → {n}% — check the report's filters before trusting this drop. | dock receipt |
| run.ts:445-446 | Same file re-dropped — staging refreshed; {n} accounts already covered stay covered. | dock receipt |
| run.ts:448-449 | {n} accounts changed and wait for distillation; {m} need only their tallies refreshed. | dock receipt |
| run.ts:574/580/600 | No store. / No drop staged. / The drop is still uploading. | reason |
| run.ts:881 (+:108) | The key is dead — the API said: {err}. This build is {sha}; its workspace id is set ({id}…)/NOT SET. The rest of this drop completes arithmetically and gems hold from the last funded pass. | dock receipt |
| run.ts:892 | Every distillation failed — {err}. Fix it and run again. | dock receipt |
| run.ts:957 | {n} accounts distilled — {g} hold confirmed gems, {v} filed honest verdicts, {d} candidates died in refutation. | dock receipt |
| run.ts:963 | The distiller was down for {n} account(s) — their gems hold from the last funded pass. Re-drop the file once the key is back and they re-judge. | dock receipt |
| run.ts:964 | The distiller was down for {n} account(s), and {e} of them hold NO gem — there was no funded pass to fall back on. Fix the key and drop the file again; nothing was judged this run. | dock receipt |
| run.ts:969 | Distiller quality flag: {d} of {b} candidates died. Read the receipt before trusting this drop's gems. | dock receipt |
| run.ts:975 | COVERAGE FAILED — {n} active account(s) hold neither a gem nor a verdict: {names}. | dock receipt |
| run.ts:985 | Coverage: 100% — but {n} account(s) held, so {x} of {y} were judged this run. The rest read their old gems. | dock receipt / Chute last line |
| run.ts:986 | Coverage: 100% — every active account holds a gem or an honest verdict. | dock receipt / Chute last line |
| run.ts:1136 | {n} {label} removed. | dock receipt |
| run.ts:1142 | There was no second record to take back. | dock line |
| run.ts:1151-1153 | Took back the drop of {file} from {day} — {n} rows, {m} accounts. / Took back the second record. | dock line |
| run.ts:1157 | The second record is empty. Earlier drops are not kept, so nothing was restored — every other surface reads what it read before any export was filed. | dock receipt |

## 2. Writing-canon and plain-speech findings on those strings

A dash was flagged only where its clause is an interrupting or appended aside (rule 5), a hinge delivering an implication as a beat, or where the composed line needs a second read; label dashes, evidence-after-claim and reason-after-statement were treated as ordinary punctuation (CLAUDE.md:112-114).

| Rule or device (CLAUDE.md:line) | file:line | String | Why it trips |
|---|---|---|---|
| 1 imperative mood (47-48) | actions.ts:203, 909, 1800, 1811; archive-actions.ts:18; activity/actions.ts:21 | Read-only session. | a verbless noun fragment [inferred: a status, not an action line] |
| 1 (47-48) | run.ts:574, 580 | No store. / No drop staged. | same shape |
| 4 no hedging (55-56) | room-client.tsx:1995; chute.tsx:554; room-client.tsx:516, 1947, 1961 | This reads like … / Reads like … / Reads … / Reads as … | the "this account appears to" form; the counter is that a disputed verdict awaiting the pick is a fact about the read [inferred either way] |
| 5 em-dash asides (57) | chute.tsx:669-670 | PDFs and images — screenshots included, HEIC converts on the way in — read through Claude. | interrupting aside |
| 5 (57) | chute.tsx:670-671 | Every file routes by the book — contact email, then company domain, then account name — and files like a paste | interrupting aside |
| 5 (57) | chute.tsx:675-677 | Nothing files blind — no sure match waits for your pick — nothing files twice — a re-drop … is refused — receipts survive a reload, … | two nested asides in one sentence |
| 5 parentheticals (57) | chute.tsx:681-682 | (2GB is the ceiling per file) | parenthetical |
| 5 second read (57) | chute.tsx:671-675 | and files like a paste: with the API key on, Claude splits the thread … ; without the key the record still files by rules. | a sixty-word sentence with a colon and a semicolon |
| 5 (57) | chute.tsx:446 | · the reader was down — raw text only, nothing routed; ↩ undo and re-drop when it's back | aside plus a semicolon-spliced imperative |
| 5 parentheticals (57) | chute.tsx:439 | Filing to {name}… ({why}) | parenthetical |
| 5 second read (57) | room-client.tsx:2007 → 2031 | Reading {bound} — reading it again… | doubled verb by composition [inferred] |
| 5 parentheticals (57) | run.ts:402-403; :424-425 | (multi-recipient sends look alike); Name collisions (unresolved either side): | parentheticals |
| 5 second read (57) | run.ts:881 + 108 | The key is dead — the API said: {err}. This build is {sha}; its workspace id is set ({id}…). … | three chained sentences with a raw error, a sha and a truncated id |
| 5 second read (57) | run.ts:1157 | … nothing was restored — every other surface reads what it read before any export was filed. | dash-appended clause on a long sentence [mild] |
| consequence closer (96-97) | dock.tsx:147 | Earlier drops are not kept — nothing is restored. | statement, dash, implication; the same fact is carried flat with "so" at chute.tsx:504 and dock.tsx:154 [inferred] |
| two halves restating one idea (114-116) | run.ts:406 | NOT ONE ROW CARRIED TEXT — this drop read nothing. | the second half restates the first [inferred] |
| invented slang (104-105) | run.ts:410 | those readings run dark | nothing on screen defines it |
| invented slang (104-105) | dock.tsx:60 | Watch the gadget. | "gadget" is only an identifier, never a rendered label [inferred] |
| invented slang (104-105) | chute.tsx:681 | rides as a pre-release | the repo's own idiom [mild] |
| invented slang (104-105) | chute.tsx:675-676 | Nothing files blind | coined; also the decree's own wording at CLAUDE.md:284 [inferred] |
| constructed phrasing (105-106) | room-client.tsx:2000 | the file is holding out of the vault | pinned verbatim by tests/misfile-guard.test.ts:128 |
| constructed phrasing (105-106) | run.ts:881, 963, 964 | completes arithmetically / funded pass | engineering phrasing surfaced as operator copy |
| constructed phrasing (105-106) | chute.tsx:344; dock.tsx:102 | staging replaces wholesale | borderline |
| constructed phrasing (105-106) | chute.tsx:669; :678-679 | read free in your browser; the Intranet mirroring it on its next sync | [mild] |
| reassurance flourish (106-107, 116-118) | run.ts:957, 986 | honest verdicts | the adjective performs [mild] |
| maxim (93) | actions.ts:228; chute.tsx:675-676 | Nothing filed twice. | slogan-shaped; decreed verbatim at CLAUDE.md:289 and pinned by tests/ingest-defects.test.ts:126; reported for coverage |

Compliant on these surfaces: rules 2, 3, 6 (receipts are not action lines; the two action-shaped lines at chute.tsx:646 and dock.tsx:131 are within budget), 8, 9, 10; antithesis (the mismatch banner names two real accounts, which the boundary at :114-115 calls content), paradox, definitional flip, escalating triad, chiasmus. Adjacent to rule 7: chute.tsx:91 discards the ledger when the day changes, so a pick left unanswered yesterday does not return today [inferred]. Dead copy: actions.ts:259 and :337 mismatch reasons never reach a surface; room-client.tsx:1957's placeholder still names three file types while the ⇪ tooltip at :1907 and DROP_ACCEPT list many more.

Enforcement on these strings: tests/ingest-defects.test.ts pins "The read didn't complete." (:107 with "account check" by presence and "did not run" by absence), "The reader is down" (:117 with /undo/i by presence), "Nothing filed twice." (:126), "judgment by Claude" (:151), and the absence of "The actions it opened stay" (:182); tests/misfile-guard.test.ts pins "holding out of the vault" (:128), "the read names …" and "… is {name}'s contact"; tests/vault.test.ts pins "Pick its account for the vault"; tests/second-record-faces.test.ts pins "Clear this receipt. The record keeps everything that filed." Everything else on the surfaces is pinned by nothing. src/lib/activity/lint.ts:103 lints "steps", "-shaped", "their own book" and "domestic-only" on gem act lines only.

## 3. Click-depth dead ends on the ingest surfaces

| file:line | The compressed thing | Opens to, or dead end |
|---|---|---|
| chute.tsx:444 | ✓ {account} · {N} filed | dead end; noteIds serve only ↩ undo |
| chute.tsx:450-452 | · N actions opened | dead end; todoIds serve only undo |
| chute.tsx:453-455 | · N asks queued | dead end |
| chute.tsx:456 | · N to the playbook | dead end |
| chute.tsx:447 | · transcript on file | dead end (the vault line at :527-540 has its own open link) |
| chute.tsx:236 ← actions.ts:228 | Already on file. Filed M/D. Nothing filed twice. | dead end; no door to the prior filing |
| chute.tsx:564-572 | batch-mate button | a control, not a door to what filed |
| chute.tsx:490-498 | N rows · N accounts · N carrying email text. | dead end for the counts; the link at :498 opens the page, not the rows |
| chute.tsx:695-699, :727 | N running · N need your pick · N settled today / Open the ledger · N | opens: the fold shows every receipt |
| dock.tsx:98 | N rows · N accounts · N carrying email text. N to distill, N tally-only. | dead end |
| dock.tsx:130 | Last drop {day} · distilled | dead end |
| dock.tsx:41 | A run was interrupted — N accounts still wait. | dead end |
| dock.tsx:194 | Receipt · N | opens: the fold at :209-215 |
| room-client.tsx:504-510 | Filed N entries, read by Claude. | dead end; noteIds serve only undo |
| room-client.tsx:511-512 → :1584-1612 | N actions opened. | opens: receipt chips list the rows, cut at 60 characters with no expansion |
| room-client.tsx:513-514 | N new asks queued. / N to the playbook. | dead end |
| room-client.tsx:1263, :1300 | UNKNOWN · N queued | dead end; the held-back asks have no fold |
| room-client.tsx:1329-1334 | STAGE GATE · N BEHIND IT | dead end |
| room-client.tsx:1428-1430 | TODAY N · M done | opens: the sprung list |
| room-client.tsx:948-969 | RESEARCH ⟳ | date only in the tooltip; the click runs the pass, no drill to the note |
| room/theirs-line.tsx:73-81, :92-108 | THEIRS · {label} | opens: gems → cites → excerpt via /activity/evidence |
| groundwork/evidence-chips.tsx:167-176, :214-244 | ◆ N GEMS | opens: gems → cites → excerpt |
| evidence-chips.tsx:178-187, :246-283 | ▮ SUPPORT N · SPIKE M/D | opens: case list → timeline |
| evidence-chips.tsx:189-198, :286-299 | INTENT · O N · C N · 30D | opens: campaign table |
| evidence-chips.tsx:199-212, :303-313 | ⚠ …'S THREAD · M/D / MKTG CADENCE LIVE · N THIS WEEK | opens one layer to prose; no drill to the colleague's row [inferred] |
| src/lib/ask/links.ts:65-70 | a playbook citation in the brain's answer | no door, by decree (CLAUDE.md:514-516) |

## 4. Checked and found clean (violations-only sweep)

So the next pass need not re-check them. Design canon: the field #F5F7FB with one theme (antaeus-brand-kit/css/tokens.css:24; no prefers-color-scheme or data-theme anywhere in src; config/design-tokens.css:5 `color-scheme: light`); the ink ladder (tokens.css:31-35); the four role accents (tokens.css:50-57); the type trio (src/app/layout.tsx:2, src/app/room/page.tsx:2, config/design-tokens.css:94-97) with the one Arial fallback at src/lib/flags.tsx:98 reported; no Grounded-A mark exists in src (config/design-tokens.css:8-11 forbids it; the masthead mark is ProductMark); the banned hexes appear only in .module.css files (src/components/account-notes.module.css:2-3; src/app/command-center.module.css:2753, 2934, 3072-3074, 3170-3171), out of that sweep's scope; no stationery metaphors or progress-wash ribbons (Groundwork's `styles.ribbon` at groundwork/page.tsx:1054 is a flex section head). Playbook authoring canon: 5,025 names from book.json and contacts.json grepped against src/lib/playbook/products.ts, zero hits; no money figures in products.ts; "steps" guarded by tests/playbook-sheet.test.ts:134-137; (∅) used at product-sheet.tsx:35, 136, 143; no consequence closers in spoken lines. Direct doctrine: no "ride it, never around it" copy anywhere. Playbook face: five doors and two contractor doors (products.ts PRODUCTS; tests/playbook-sheet.test.ts:68); arrival copy at product-sheet.tsx:588; the door tick orange at product-sheet.module.css:360-362; the middle's order at product-sheet.tsx:312-410; the right panel from the tapes at :417-472, :564-568; the between-us foot fixed at :474-501, :644; the country wing as a GET (src/app/playbook/country/route.ts:19; product-sheet.tsx:542) with no server action serving cards; lead lines first, the sixteen behind one line, "the rest" at :153-169, :110-114; Puerto Rico at countries.ts:70-74; (∅) and not-covered lines at product-sheet.tsx:133-146; the Call Sheet retired with no route, stylesheet link or ?open= link in src (comments only) and the brain's playbook citation offering no door (src/lib/ask/links.ts:65-70); no redactMoney under src/app/playbook or src/lib/playbook; tests/playbook-sheet.test.ts:129-132 in the chain. Other standing decrees: no ↗ on an account name (SfLink has no consumers; accounts-client.tsx:1838 is a contact, :1304 a URL host); MULTI and its ladder at room/page.tsx:208 and groundwork/page.tsx:904-910; the edge tab names at room-client.tsx:2795-2797; the second record's staged bodies redacted at run.ts:297; the HomeRoom note writers redact (room/actions.ts:80 via cleanLogBody, :361, :398, :432; act-actions.ts:52, :108, :217; pipeline-actions.ts:134; playbook store input arrives redacted from ai-clean.ts:215). Gaps in the sweep's own coverage: tests/playbook-sheet.test.ts:120 scans names of five or more characters with a space, so single-word account names are never scanned, and spokenLines() excludes cite text; the data is clean today.

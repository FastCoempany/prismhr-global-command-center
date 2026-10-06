---
title: Decree Ledger Appendix
status: Audit pass 3 evidence tables, 2026-09-25; re-walked by pass 8, 2026-10-06 (section 5)
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

## 5. Re-walk, pass 8 (2026-10-06, main d119c52)

Pass 8 re-walked sections 2 and 3 on main at d119c52, after pass 5 (#335, #336) and pass 7, the Chute brains refactor (#339 to #366), and swept the operator copy pass 7 added on the ingest surfaces. Cites are against d119c52; CLAUDE.md lines are current lines on that tree (617 lines), not the pass-3 lines the sections above carry. Status words: fixed (the string or the dead end is gone and what replaced it complies), removed (the string or surface is gone), stands (still there, at the line given). Nothing above is struck. The ledger's section F holds the ranked violations and the test list.

### 5.1 The findings of sections 2 and 3, now

Section 2, the writing-canon and plain-speech findings (26 rows, in their order):

| §2 row | Pass-3 cite · string | Now | file:line now |
|---|---|---|---|
| 1 | actions.ts:203 and five more · "Read-only session." | stands | src/app/room/actions.ts:293, :864, :1812, :1823; src/app/room/route-actions.ts:42; src/app/room/vault-actions.ts:55; src/app/activity/actions.ts:21. archive-actions.ts is gone (#345). D29 (CLAUDE.md:311) now decrees the same words on the Chute bar (src/app/room/chute.tsx:623). |
| 2 | run.ts:574, :580 · "No store." / "No drop staged." | stands | src/lib/activity/run.ts:677, :685. |
| 3 | room-client.tsx:1995; chute.tsx:554; room-client.tsx:516, :1947, :1961 · "This reads like …" / "Reads like …" / "Reads …" / "Reads as …" | stands, two sites removed | The Drop's two-sided banner, the Chute's "Reads like {claim}. Pick the account." and "Reads {status}. Confirm below." went with #360. "Reads as …" stands on the Drop's chips (src/app/room/room-client.tsx:2062-2069, :2082), and the held box's fallback reason is "This reads like {claim}." (src/lib/ingest/guard.ts:151, :180). |
| 4 | chute.tsx:669-670 · the screenshots aside in the pact | stands | src/app/room/chute.tsx:669-670. |
| 5 | chute.tsx:670-671 · "Every file routes by the book — contact email, then company domain, then account name — and files like a paste" | stands | chute.tsx:670-672; #345 re-flowed it to "the book and the record" and added "then a known person", aside kept. |
| 6 | chute.tsx:675-677 · "Nothing files blind — no sure match waits for your pick — nothing files twice — …" | stands | chute.tsx:676-678. |
| 7 | chute.tsx:681-682 · "(2GB is the ceiling per file)" | stands | chute.tsx:682. |
| 8 | chute.tsx:671-675 · the sixty-word sentence with a colon and a semicolon | stands | chute.tsx:672-676. |
| 9 | chute.tsx:446 · "· the reader was down — raw text only, nothing routed; ↩ undo and re-drop when it's back" | fixed | src/app/room/ingest/receipt.tsx:31 "The reader was down. Only the text filed." on the receipt's second line (#360). |
| 10 | chute.tsx:439 · "Filing to {name}… ({why})" | fixed | receipt.tsx:277 "{file} · Filing to {name}…" (#360). |
| 11 | room-client.tsx:2007 → :2031 · "Reading {bound} — reading it again…" | fixed | room-client.tsx:621-622 → :2124 "Reading the file again for {name}…" (#360). |
| 12 | run.ts:402-403; :424-425 · "(multi-recipient sends look alike)"; "Name collisions (unresolved either side):" | stands | run.ts:503, :526. |
| 13 | run.ts:881 + :108 · "The key is dead — the API said: {err}. This build is {sha}; …" | stands | run.ts:994 with :114-117. |
| 14 | run.ts:1157 · "… nothing was restored — every other surface reads what it read …" | stands | run.ts:1280. |
| 15 | dock.tsx:147 · "Earlier drops are not kept — nothing is restored." | stands | src/app/activity/dock.tsx:147; the Chute's own copy says it flat with "so" (chute.tsx:460). |
| 16 | run.ts:406 · "NOT ONE ROW CARRIED TEXT — this drop read nothing." | stands | run.ts:507. |
| 17 | run.ts:410 · "those readings run dark" | stands | run.ts:511. |
| 18 | dock.tsx:60 · "Watch the gadget." | stands | dock.tsx:60. |
| 19 | chute.tsx:681 · "rides as a pre-release" | stands | chute.tsx:681-682. The pre-release lane is still real (src/app/room/vault-actions.ts:86; src/lib/github/archive.ts:31-33). |
| 20 | chute.tsx:675-676 · "Nothing files blind" | stands | chute.tsx:676. |
| 21 | room-client.tsx:2000 · "the file is holding out of the vault" | removed | The banner gave way to the held box in #360, and the misfile-guard pin on the string went with it; neither src nor tests carries it. |
| 22 | run.ts:881, :963, :964 · "completes arithmetically" / "funded pass" | stands | run.ts:994, :1076, :1077. |
| 23 | chute.tsx:344; dock.tsx:102 · "staging replaces wholesale" | stands | chute.tsx:349; dock.tsx:102. |
| 24 | chute.tsx:669; :678-679 · "read free in your browser"; "the Intranet mirroring it on its next sync" | stands | chute.tsx:669, :679. The same sentence still names Today, a retired surface (CLAUDE.md:614-615), among the pages that "re-read the record at once" (chute.tsx:678-679). |
| 25 | run.ts:957, :986 · "honest verdicts" | stands | run.ts:1070, :1099. |
| 26 | actions.ts:228; chute.tsx:675-676 · "Nothing filed twice." | stands | src/app/room/actions.ts:321; chute.tsx:676-677; and a third site, the Send-it fallback src/app/intranet/capture-actions.ts:136 (#360). Decreed verbatim at CLAUDE.md:296-297. |

The section's closing notes, now. The rule-7 adjacency stands and is pinned: the ledger loads empty when its stored day is not today's (src/app/room/chute-ledger.ts:225), tests/canon/chute.test.ts › "the ledger is per Chicago day: yesterday's rows do not come back" pins it in the chain, and a pick held yesterday does not come back today saying so (CLAUDE.md:60-61). The dead mismatch reason stands at src/lib/room/paste.ts:46 ("This reads like {claim}, not {name} — {why}."), which guardPlan replaces with reasonFromWhy (src/lib/ingest/guard.ts:204-219), so it still reaches no surface; the chain still pins its text (tests/misfile-guard.test.ts › "the evidence rung runs BEFORE the read spends a cent", at :173). The Drop's paste placeholder still names three file types (src/app/room/room-client.tsx:2078) while neither picker filters by type since #366 (CLAUDE.md:315).

Section 3, the click-depth dead ends (26 rows, in their order):

| §3 row | Pass-3 cite · the compressed thing | Now | file:line now |
|---|---|---|---|
| 1 | chute.tsx:444 · ✓ {account} · {N} filed | fixed | The receipt line opens in place to what the filing wrote (src/app/room/ingest/receipt.tsx:145-224, read by src/app/room/filing-actions.ts:23-53 through src/lib/ingest/wrote.ts:73-86); chain tests/ingest-faces.test.ts › "the line opens in place to what the filing wrote" (#360). |
| 2 | chute.tsx:450-452 · · N actions opened | fixed | Now "N to-do(s)" (receipt.tsx:64), listed whole under To-dos when the line opens (:305). |
| 3 | chute.tsx:453-455 · · N asks queued | stands | Now "N asks" (receipt.tsx:66). The opened line lists no asks: the read returns entries, to-dos and their promises (wrote.ts:18-25) from the account's own notes and todos (filing-actions.ts:35-48). |
| 4 | chute.tsx:456 · · N to the playbook | stands | receipt.tsx:67; the playbook rows the filing wrote are not read back. |
| 5 | chute.tsx:447 · · transcript on file | removed | The string is gone; the tape's archive entry lists under Filed when the line opens (wrote.ts:56-69). |
| 6 | chute.tsx:236 ← actions.ts:228 · Already on file. Filed M/D. Nothing filed twice. | stands | receipt.tsx:260-262 renders it with no door to the prior filing; src/app/room/actions.ts:321. |
| 7 | chute.tsx:564-572 · the batch-mate button | stands, as a control | Now "Same batch" in the held box's account list and the solid button's suggestion (src/app/room/ingest/held.tsx:125-132, :190-195); a choice, not a door, as before. |
| 8 | chute.tsx:490-498 · N rows · N accounts · N carrying email text. | stands | chute.tsx:450-454; the link opens the Intranet page, not the rows. |
| 9 | chute.tsx:695-699, :727 · the meter and "Open the ledger · N" | stands, a door | chute.tsx:551-595: the meter is the fold's button whenever a row is hidden. |
| 10 | dock.tsx:98 · N rows · N accounts · … N to distill, N tally-only. | stands | src/app/activity/dock.tsx:98. |
| 11 | dock.tsx:130 · Last drop {day} · distilled | stands | dock.tsx:130. |
| 12 | dock.tsx:41 · A run was interrupted — N accounts still wait. | stands | dock.tsx:41. |
| 13 | dock.tsx:194 · Receipt · N | stands, a door | dock.tsx:194. |
| 14 | room-client.tsx:504-510 · Filed N entries … | fixed | The Drop's filing receipt is the same receipt line (src/app/room/room-client.tsx:583-600, painted at :1715), which opens (#360). |
| 15 | room-client.tsx:511-512 → :1584-1612 · N actions opened. | fixed | The to-dos list whole under To-dos (receipt.tsx:305); the 60-character chips are gone. |
| 16 | room-client.tsx:513-514 · N new asks queued. / N to the playbook. | stands | As rows 3 and 4: receipt.tsx:66-67. |
| 17 | room-client.tsx:1263, :1300 · UNKNOWN · N queued | stands | room-client.tsx:1403, :1440. |
| 18 | room-client.tsx:1329-1334 · STAGE GATE · N BEHIND IT | stands | room-client.tsx:1471-1475. |
| 19 | room-client.tsx:1428-1430 · TODAY N · M done | stands, a door | room-client.tsx:1566-1576. |
| 20 | room-client.tsx:948-969 · RESEARCH ⟳ | stands | room-client.tsx:1084-1098: the date lives in the title and the click runs the pass. |
| 21 | theirs-line.tsx:73-81, :92-108 · THEIRS · {label} | stands, a door | src/app/room/theirs-line.tsx:80-81, :99. |
| 22 | evidence-chips.tsx:167-176, :214-244 · ◆ N GEMS | stands, a door | src/app/groundwork/evidence-chips.tsx:171, :214. |
| 23 | evidence-chips.tsx:178-187, :246-283 · ▮ SUPPORT N · SPIKE M/D | stands, a door | evidence-chips.tsx:74, :247. |
| 24 | evidence-chips.tsx:189-198, :286-299 · INTENT · O N · C N · 30D | stands, a door | evidence-chips.tsx:112, :285. |
| 25 | evidence-chips.tsx:199-212, :303-313 · the collision chip | stands | evidence-chips.tsx:199-211, :303-312: one layer of prose, no drill to the colleague's row. |
| 26 | src/lib/ask/links.ts:65-70 · a playbook citation in the brain's answer | stands, now against a ruling | C13 (CLAUDE.md:583) rules the citation opens in place, one click, to the cited question and its gloss. links.ts:65-70 still skips it, and questionById (src/lib/intel/bank.ts:30) has no caller in src; only tests/canon/standing-decrees.test.ts › "a bare question id resolves to the question's text and its gloss" calls it. |

Tally: section 2, 26 rows: 3 fixed, 1 removed, 22 stand (row 3 with two of its sites removed). Section 3, 26 rows: 4 fixed, 1 removed, 13 dead ends stand, 7 rows that were doors stay doors, 1 control stays a control.

### 5.2 The copy pass 7 added on the ingest surfaces

Swept against the writing canon (CLAUDE.md:42-70), the plain-speech law (:72-120) and the click-depth law (:437-444). A string the founder decreed verbatim is marked decreed; a finding names the rule it breaks. Enforcement on this copy: tests/ingest-faces.test.ts › "no operator string in these components carries an em-dash, a parenthetical or the word steps" renders the held box and the receipt and scans the literals of held.tsx, receipt.tsx and hand-off.ts; tests/ingest-guard.test.ts › "each passes the writing canon's lint, with and without the row's own evidence" lints every text-rung reason; tests/move-promise.test.ts › "six words or fewer per sentence, no dash aside, no parenthetical" lints the promise lines; all three are in the chain. Nothing lints the dock, the stamp words or the Send-it receipts.

The held box (src/app/room/ingest/held.tsx, with the reasons it shows from src/lib/ingest/guard.ts):

| file:line | String | Verdict |
|---|---|---|
| held.tsx:221 | Held | decreed (the amber HELD kicker, CLAUDE.md:313) |
| guard.ts:134-150, :170-171 | The read names {claim}. · {claim}'s contact address is in the text. · {claim}'s contact address is here. · {claim}'s contact is here. · {who} is {claim}'s contact. · {who} is {claim}'s. · A {claim} email address is in the text. · A {claim} address is here. · {claim} is named in the text. · {claim} is named. · “{head}” in the text points to {claim}. · “{head}” points to {claim}. · “{initials}” matches {claim}'s initials. · {row} shows up too. · Nothing points to {row}. | compliant; nine words or fewer by construction (guard.ts:159-181) and linted in the chain |
| guard.ts:151, :180 | This reads like {claim}. | finding, contested as in §2 row 3: writing canon rule 4 (CLAUDE.md:55-56) names "this account appears to"; the counter is that it states a classifier verdict awaiting the pick [inferred either way] |
| src/lib/ingest/verdict-reason.ts:124-145 | the read rung's reason, the model's sentence | compliant by gate: capped at nine words and run through lintReason before it shows; chain tests/ingest-guard.test.ts › "the sanitizer: redacted, grammar-stripped, trimmed, nine words, canon-clean" |
| held.tsx:233 | WHY ▾ / WHY ▴ | compliant; the reason is the door to its grounds (:238-249), one click, as CLAUDE.md:313 asks |
| held.tsx:229 | Show the evidence / Hide the evidence (title) | compliant |
| held.tsx:79, :81, :82, :86 | From the read · Web check · In the text · For {row} | compliant |
| held.tsx:56-65 | The read names {x}. · {who} is the book's contact for {account}. · A {domain} address is in the text. · {name} is named in the text. · “{head}” appears in the text. · “{initials}” matches {name}'s initials. | compliant |
| held.tsx:89 | Nothing in the text names {row} or its people. | compliant |
| held.tsx:34 | No sure match. Pick the account. | compliant; pass-3 copy kept, the action imperative |
| held.tsx:36 | A file the reader can't open. Pick its account for the vault. | compliant |
| held.tsx:260 | File to {name} | decreed (CLAUDE.md:313) |
| held.tsx:270 | Keep on {name} | decreed |
| held.tsx:283 | Another account ▾ / Pick the account ▾ | decreed ("Another account"); compliant |
| held.tsx:99-104 | Address · Domain · Person · Name | compliant |
| held.tsx:125, :129, :131, :194 | Dropped here · Same batch · A suggestion. The rest of this drop filed there. | compliant |
| held.tsx:30 | Don't file it. It still backs up. (the ✕'s title) | decreed ("Don't file it."), the second sentence a fact; compliant |
| held.tsx:32 | Don't file it. It stays in the brain. | compliant |
| held.tsx:318 | Search the book… | compliant |

The receipt (src/app/room/ingest/receipt.tsx, src/lib/ingest/wrote.ts, the window sentences in src/lib/ingest/windows.ts, and the Chute's own receipt lines):

| file:line | String | Verdict |
|---|---|---|
| receipt.tsx:165-185, :88 | ✓ {account} · {counts} · {M/D} · {rung} | decreed shape (CLAUDE.md:313) |
| receipt.tsx:63 | {n} filed | compliant; opens to the Filed list |
| receipt.tsx:64 | {n} to-do / {n} to-dos | compliant; opens to the To-dos list |
| receipt.tsx:65 | {n} their promise / {n} their promises | finding [mild]: constructed phrasing (CLAUDE.md:105-106); "1 their promise" is not how a person counts. The door holds: it opens to Their promises |
| receipt.tsx:66 | {n} ask / {n} asks | finding: click-depth law (CLAUDE.md:439-441). The opened line lists no asks, because filingWrote reads the account's own notes and todos (filing-actions.ts:35-48) and wroteFrom returns entries, to-dos and promises only (wrote.ts:18-25, :73-86) |
| receipt.tsx:67 | {n} to the playbook | finding: click-depth law, as the row above |
| receipt.tsx:35-53 | address · domain · person · name · picked | compliant; the rung word stands in for the router's why, which a settled row may not keep (D12, CLAUDE.md:305), so it opens to nothing by decree |
| receipt.tsx:31 | The reader was down. Only the text filed. | compliant |
| windows.ts:95 | Read {n} of {m} characters[ of {what}]. | compliant; D4's "what was read of what arrived" (CLAUDE.md:303) |
| windows.ts:102 | The duplicate check didn't run. | compliant; D7 (CLAUDE.md:305) |
| receipt.tsx:121 | Take back everything this filing wrote (↺ title) | compliant |
| receipt.tsx:131 | Clear this receipt (✕ title) | compliant |
| receipt.tsx:180 | Show what this filing wrote / Hide what this filing wrote | compliant |
| receipt.tsx:195, :201, :206 | File · · Backed up · open | compliant |
| receipt.tsx:216, :218, :310 | Reading… · Nothing on file for this filing. | compliant |
| receipt.tsx:304-306 | Filed · To-do · To-dos · Their promise · Their promises | compliant |
| wrote.ts:56-69 | {subject} · {people} · {M/D}, with "No subject" for an empty head (:64) | compliant; addresses scrubbed (:41-49) |
| receipt.tsx:238-246 | ⇪ Backed up · {file} · {M/D} · open | compliant |
| receipt.tsx:251 | ⇪ Not filed. Backed up. · {file} · {M/D} | compliant |
| receipt.tsx:254 | Not filed. Kept in the brain. · {file} · {M/D} | compliant |
| receipt.tsx:257 ← chute.tsx:284, room-client.tsx:882 | ↺ Taken back from {account}. {n} removed. | finding: click-depth law (CLAUDE.md:439-441); "N removed" opens to nothing, and since #360 it sums the removed rows and the retired to-dos into one number |
| receipt.tsx:260-262 ← actions.ts:321 | {file} · Already on file. Filed {M/D}. Nothing filed twice. | carried from §2 row 26 and §3 row 6: the maxim is decreed verbatim; no door to the prior filing |
| receipt.tsx:277-278 | {file} · Filing to {account}… · {file} · Reading… | compliant |
| receipt.tsx:287 | Backed up under {account}. (title) | compliant |
| chute.tsx:185, :188 | Backing up {file}… · Backing up {file}… {sent} of {total} | compliant |
| chute.tsx:249 | The backup broke off. Drop it again. | compliant |
| chute.tsx:231 | That didn't land. | compliant |
| chute.tsx:287; room-client.tsx:884 | The take-back didn't go through. | compliant |
| chute.tsx:551-561 | {n} files · {n} filed · {n} held · {n} reading / {n} receipts · today | compliant; the meter is the fold's door whenever a row is hidden (:581-592) |
| chute.tsx:587 | Hide the older receipts / Show all {n} | compliant |
| chute.tsx:600, :603 | Clear every settled receipt. The record keeps everything that filed. · Clear all | compliant |

Send-it's hand-off (src/app/room/ingest/hand-off.ts, the Intranet's capture door and its client):

| file:line | String | Verdict |
|---|---|---|
| src/lib/intranet/capture-door.ts:40 | Held in the Chute above. | decreed (CLAUDE.md:313) |
| hand-off.ts:24 | Send-it paste (the held row's name) | compliant |
| capture-door.ts:35, :54 | Kept in the brain. · Kept in the brain. Nothing names an account. | compliant |
| capture-door.ts:66-68 | Filed to {account}. · Filed to {account}. The reader was down, so only the text filed. | compliant |
| src/app/intranet/capture-actions.ts:110 | Nothing there to keep. | compliant |
| capture-actions.ts:136 | Already on file. Nothing filed twice. (fallback) | carried from §2 row 26 |
| capture-actions.ts:141 | That didn't land. | compliant |
| capture-actions.ts:185 | Already in the brain — nothing new to add. | finding [mild]: writing canon rule 5 (CLAUDE.md:57), an em-dash appended clause whose second half restates the first (CLAUDE.md:114-116); added with the door in #353 |
| chute.tsx:517 → held.tsx:32 | Don't file it. It stays in the brain. (the ✕ on a Send-it hold) | compliant |

src/app/intranet/intranet-client.tsx adds no visible copy in pass 7; the hand-off rides an event (intranet-client.tsx:275-296) and the box keeps capture-door.ts's line.

The move line's promise sentences (src/lib/room/engine.ts, pressOf at :222-256 and doorLine at :261-289):

| file:line | String | Verdict |
|---|---|---|
| engine.ts:231 | Chase {who}. PROMISED {M/D}. | decreed (CLAUDE.md:435) |
| engine.ts:236 | Chase {who}. The {M/D} wall passed. | decreed |
| engine.ts:240 | Wait on {who}. Due today. | decreed |
| engine.ts:245 | Wait on {who}. Promised {weekday / M/D}. | decreed |
| engine.ts:254-255 | Chase {who}. Promised {N days ago}. · Wait on {who}. Promised {today / yesterday / N days ago}. | finding [mild, inferred]: writing canon rule 5, a sentence needing a second read (CLAUDE.md:57). In the dated line "Promised Friday" names the day the thing is due; in these dayless lines "Promised yesterday" names the day the promise was made, so "Wait on {who}. Promised today." can be read as due today |
| engine.ts:597 | {line} +{N} | decreed (" +N counts the rest", CLAUDE.md:435); the door opens every promise (:598; src/app/room/room-client.tsx:1194-1218) |
| engine.ts:151-157 | (after a meeting move) Promised {day}. · PROMISED {M/D}. · The {M/D} wall passed. | compliant |
| engine.ts:261-289 | {owner} · {what}. · via {first name} · Promised to {hearer} · {Today M/D / weekday M/D / M/D} · {On tape / Filed thread / Call notes} {M/D}; Due {when} · no hearer on record; No day given | compliant; the cite words are the evidence ladder's own (engine.ts:205-209; CLAUDE.md:224-226) and the line is money-redacted (:288) |

The CSV refusal receipt:

| file:line | String | Verdict |
|---|---|---|
| src/app/room/ingest/use-ingest.ts:70-71 → receipt.tsx:80-82, :141-143 | Not filed here. Backed up. Drop the export in the Chute. | compliant; carries D2's three facts (CLAUDE.md:303); chain tests/ingest-hooks.test.ts › "a refused .csv on the Drop is vaulted and not read, and its receipt names the Chute" |
| receipt.tsx:238-246 | ⇪ {file} · {M/D} (the refused export's first line) | finding [mild]: click-depth law (CLAUDE.md:439-441); the second line says "Backed up." but the line drops the "open" link every other backup carries (:239 tests `!row.note`), so the backup opens from nowhere; pinned that way by tests/ingest-faces.test.ts › "the refused export keeps its decreed line as the amber second line" |
| src/app/room/read-file.ts:56 | The export goes in the Chute. | compliant (the reader's belt; planDrop refuses first) |

The typed-note chip (src/app/room/room-client.tsx):

| file:line | String | Verdict |
|---|---|---|
| room-client.tsx:2062-2069 | Reads as a typed note. Enter runs the full read. | compliant; the decreed chip (CLAUDE.md:315) with pass 3's tail; "Reads as" is the contested rule-4 form already logged at §2 row 3 |
| src/lib/paste-files.ts:49 | TYPED NOTE — typed on the Drop (the note's head) | compliant; a label dash |

BOOKED (src/app/sendbook/page.tsx):

| file:line | String | Verdict |
|---|---|---|
| page.tsx:235 | BOOKED {M/D} | finding: click-depth law (CLAUDE.md:439-441); the badge carries a title and no door to the acceptance row, as ↩ REPLIED beside it has none (:228) |
| page.tsx:233 | Their calendar accepted a meeting after this send. The calendar answered, so it doesn't count as a reply and doesn't warm the account. (title) | compliant |

The stamp words (src/lib/groundwork/stamp.ts; the wing renders them as plain text, src/app/groundwork/page.tsx:751):

| file:line | String | Verdict |
|---|---|---|
| stamp.ts:54-55 | WORKED THE MOVE FROM THE SHEET · SEATED {M/D} | decreed (CLAUDE.md:280) |
| stamp.ts:62-63 | ACTED ON {WHO}’S {TERM} · ACTED ON THEIR {TERM} · ACTED ON THEIR LATEST ACTIVITY | decreed shape |
| stamp.ts:70-71 | OPENED THE FIRST CONVERSATION · {N} SUPPORT CASES | decreed; the count opens nothing (click-depth law, CLAUDE.md:439-441), logged because the decree spells the count and not the missing door |
| stamp.ts:76-77 | SENT THE NEWS NOTE · {HEADLINE} · SENT A NOTE ABOUT THEIR NEWS | compliant |
| stamp.ts:82-83 | SENT THE READING-US NOTE · {N} SALES NAV READS · SENT THE READING-US NOTE · SALES NAV SHOWS THEM READING US | finding [mild]: constructed phrasing (CLAUDE.md:105-106); nothing else on screen is called a "reading-us note", and the count opens nothing |
| stamp.ts:88-89 | ASKED INTO THE COLLEAGUE'S OPEN DEAL · CLOSES {DATE} | finding [mild]: constructed phrasing ("asked into") |
| stamp.ts:94 | NUDGED THE '{SUBJECT}' THREAD · NO REPLY SINCE {DATE} | compliant |
| stamp.ts:99 | REVIVED THE '{SUBJECT}' THREAD · QUIET SINCE {DATE} | compliant |
| stamp.ts:104-105 | BRIEFED {CSM} ON THIS ACCOUNT · BRIEFED THE PARTNER MANAGER ON THIS ACCOUNT | compliant |
| stamp.ts:110-111 | REFRESHED THE ACCOUNT RESEARCH · WAS {N} DAYS OLD · RAN THE BOOK-WIDE RESEARCH PASS | compliant |
| stamp.ts:114 | DUG UP A SECOND CONTACT NAME | compliant |
| stamp.ts:116 | SENT FIRST COLD EMAIL · STEP 1 | compliant; "STEP 1" is the Sendbook's decreed subtext grammar (CLAUDE.md:351) and the "steps" ban (:587) names the plural [contested] |
| stamp.ts:119-123 | {RULE ID, spaced} · WORKED | compliant |

Tally of 5.2: 87 rows, each a string or a family of one string's variants: 59 compliant, 15 decreed (one, OPENED THE FIRST CONVERSATION, with a click-depth note on its count), 2 carried from section 2 (the duplicate refusal on the receipt and on Send-it), and 11 findings: 5 against the click-depth law (the asks count, the playbook count, "N removed", the refused export's missing door, BOOKED), 3 against the plain-speech law's constructed-phrasing ban ("their promise", "the reading-us note", "asked into"), 2 against writing canon rule 5 ("Already in the brain — nothing new to add." and the dayless "Promised yesterday" [inferred]), and the contested rule-4 fallback "This reads like {claim}." All 11 are on copy pass 7 added. Three are pinned in their current shape in the chain: "1 their promise" (tests/ingest-faces.test.ts › "a filing's line carries exactly the account, each count, the day and the rung"), "Taken back from … N removed." (› "the other receipts read as the face draws them") and the refused export's line (› "the refused export keeps its decreed line as the amber second line").

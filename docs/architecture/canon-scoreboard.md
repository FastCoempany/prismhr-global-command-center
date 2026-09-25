---
title: Canon Scoreboard
status: Living; opened 2026-09-25 after audit pass 3
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/decree-ledger.md
  - docs/architecture/derived-fact-ledger.md
  - docs/architecture/chute-architecture-map.md
  - docs/architecture/chute-ingest-defects.md
---

# Canon Scoreboard

The three audits said one thing from three angles: 111 of 187 decrees in scope are honor system, the ingest path has 34 behaviors nobody has ruled on, and 20 pairs of decrees contradict each other. This file keeps the three counts and the rows behind them, and it is the only place they move. Every row was generated from docs/architecture/decree-ledger.md at main 3726363 and carries that ledger's row id (A1.9 is section A1, row 9; C4 and D17 likewise; P1 to P4 are the four ungoverned behaviors pass 1 found first). Read the ledger for the cites; this file holds the state.

## The numbers

| Ledger | At pass 3 (main 3726363) | Now |
|---|---|---|
| Honor-system decrees | 111 of 187 | 111 of 187 |
| Ungoverned behaviors | 34 open | 26 open · 8 ruled |
| Conflicting pairs | 20 open | 0 open · 20 ruled |

## How a row moves

- A **honor-system decree** leaves its list when a suite in the verify chain (package.json `test`) pins it by behavior, or a type, schema or shape makes the violation impossible to write. A hand-run test does not move it; add the suite to the chain first. A text pin moves it to "text" and stays on the list.
- An **ungoverned behavior** is ruled when the founder decides it here, and closes when the ruling is written into CLAUDE.md with its line. It then joins the decree ledger as a new honor-system row until a test pins it.
- A **conflicting pair** is ruled when the founder picks a side here, and closes when CLAUDE.md is amended with its line and the code follows it with a cite.
- Every move carries the commit that made it. Nothing is struck; a closed row keeps its line with its status changed.
- The counts at the top are arithmetic over the tables below and are re-derived whenever a row moves.

Violations are not tracked here; they live in the passes' own documents and close through bug passes.

## 1. Honor-system decrees (111)

Status is one of: honor · text (a text pin exists, not behavior) · chain (pinned by behavior in the verify chain) · construction · retired (the decree itself was withdrawn).

| Ledger row | Section | Decree (line) | Compliant at pass 3 | Status | Moved by | Pin |
|---|---|---|---|---|---|---|
| A1.1 | The Chute | "The HomeRoom carries ONE intake at the top: the Chute." (276) | yes | honor | — | — |
| A1.3 | The Chute | "are read on the spot" (277) | yes | honor | — | — |
| A1.8 | The Chute | "and every tab re-derives" (283) | in effect only | honor | — | — |
| A1.11 | The Chute | "The receipt ledger survives a reload (per Chicago day" (285-286) | yes | honor | — | — |
| A2.4 | The Ted doctrine | "Derived facts (who the relationship is, when we last touched, whether a reply is owed, whether a deal is over … | no | honor | — | — |
| A2.8 | The Ted doctrine | "New surfaces are audited against this doctrine before they ship." (374-375) | not verifiable | honor | — | — |
| A3.9 | The closer rule | "'no rush, next month' is a reschedule." (388) | no | honor | — | — |
| A4.1 | The second record, the meat law, the vehicle rule | "It inherits every law of the first: the record outranks every seed" (406-407) | partly | honor | — | — |
| A4.6 | The second record, the meat law, the vehicle rule | "A colleague's motion produces coordination moves; an account person's motion produces outreach moves." (409-4 … | partly | honor | — | — |
| A4.9 | The second record, the meat law, the vehicle rule | "the browser tallies the blast 81% and never uploads it" (412-413) | rows yes; tally travels | honor | — | — |
| A4.11 | The second record, the meat law, the vehicle rule | "an incomplete upload refuses to run" (413-414) | yes | honor | — | — |
| A4.14 | The second record, the meat law, the vehicle rule | "staleness/acted (the first record kills the nag)" (417-418) | partly | honor | — | — |
| A4.16 | The second record, the meat law, the vehicle rule | "Groundwork — the Evidence Chips (a mono chip row beneath the stage's reason, each chip a door)" (423-424) | partly | honor | — | — |
| A4.17 | The second record, the meat law, the vehicle rule | "Accounts — three columns (MODEL and PRISMHR retire into the drilldown" (424-425) | yes | honor | — | — |
| A4.18 | The second record, the meat law, the vehicle rule | "+ Dashboard is a hover glyph at the name" (425) | no, by later decree | honor | — | — |
| A4.19 | The second record, the meat law, the vehicle rule | "LAST HUMAN TOUCH · THE SIGNAL · ACT take the width, the gem folds open beneath the row" (425-427) | yes | honor | — | — |
| A4.20 | The second record, the meat law, the vehicle rule | "HomeRoom — the THEIRS line (one ochre mono line atop the register panel; the move keeps its seat unconditiona … | yes | honor | — | — |
| A4.21 | The second record, the meat law, the vehicle rule | "the draft desk's one cited line" (429) | yes | honor | — | — |
| A4.23 | The second record, the meat law, the vehicle rule | "the roundup brief's folded CSM prep" (431) | yes | honor | — | — |
| A4.25 | The second record, the meat law, the vehicle rule | "the Playbook's draft queue (approve by hand, nothing auto-publishes)" (432-433) | yes | honor | — | — |
| A4.27 | The second record, the meat law, the vehicle rule | "every citation, theme, count, and case on every surface drills to row-level meat" (436-439) | partly | honor | — | — |
| A4.30 | The second record, the meat law, the vehicle rule | "served only by the evidence route (a GET, never a server action) — the one place staged bodies leave the stor … | yes for bodies | honor | — | — |
| A4.31 | The second record, the meat law, the vehicle rule | "Arrival budgets never grow" (442-443) | unverifiable | honor | — | — |
| A5.1 | The click-depth law | "Every compression opens." (397) | no on the ingest surfaces | honor | — | — |
| A5.2 | The click-depth law | "every shortened thing on every surface is a door to its evidence, exactly one click deep" (397-399) | partly | honor | — | — |
| A5.3 | The click-depth law | "Nothing compressed is ever a dead end" (399) | no | honor | — | — |
| A5.4 | The click-depth law | "nothing deep ever surfaces uninvited" (399-400) | yes where checked | honor | — | — |
| A6.1 | The Spring | "Each register — UNKNOWN, COMPARABLE (only when peers exist), TODAY — rests as ONE summary line: mono kicker, … | yes | honor | — | — |
| A6.3 | The Spring | "Filing or composing anything springs TODAY open so receipts never land behind a fold." (340-341) | partly | honor | — | — |
| A6.4 | The Spring | "The court line is retired — the move already says who and when." (343) | yes on the surface | honor | — | — |
| A6.5 | The Spring | "The per-row icon keybar is retired; ONE legend lives at the page foot." (344) | yes | honor | — | — |
| A6.6 | The Spring | "Minimalist controls: 'not this deal' is a hover-revealed ✕; 'ask the brain' is ⌕; 'mint sharper asks' is ⟳; ' … | yes at the controls | honor | — | — |
| A6.8 | The Spring | "reading the LATEST of both stores — the on-demand deep pass (research: notes) AND the book-wide sweep." (348- … | no | honor | — | — |
| A6.10 | The Spring | "Sheet lines are editable in place (✎ on hover): the visible text changes, tags and routing markers survive ve … | yes | honor | — | — |
| A6.11 | The Spring | "Concepts never ship; winners do." (353) | mostly | honor | — | — |
| A6.12 | The Spring | "mockup work NEVER ships without an explicit ship order" (355-357) | not verifiable | honor | — | — |
| A7.1 | The Scratchpaper | "The stash floater is retired — component, actions, and lib deleted." (293) | mostly | honor | — | — |
| A7.3 | The Scratchpaper | "A ✎ button bottom-right opens one running pad" (294-295) | yes | honor | — | — |
| A7.7 | The Scratchpaper | "outside every account view and the intranet mirror by construction" (297-298) | yes in effect | honor | — | — |
| A7.8 | The Scratchpaper | "The pact: it stays there and only there; nothing routes, nothing files, nothing becomes an action." (298-299) | yes for the paper | honor | — | — |
| A7.9 | The Scratchpaper | "scratch lines are NOT money-redacted" (301-302) | yes | honor | — | — |
| A7.10 | The Scratchpaper | "the ask door still redacts, because asks leave the paper." (302) | yes | honor | — | — |
| A7.11 | The Scratchpaper | "Lines are editable in place (✎ on hover, decreed 2026-08-21): Enter keeps, Escape puts it back" (303-304) | yes, plus an undecreed path | honor | — | — |
| A7.13 | The Scratchpaper | "✕ is per line and deliberate — and it archives, never destroys (2026-08-19): the line moves to `scratch:gone` … | yes | honor | — | — |
| A7.14 | The Scratchpaper | "readable under the pad's STRUCK fold, restorable by ↺." (306-307) | yes | honor | — | — |
| A8.1 | The Act Lane | "The ACT column is the Move Chip (Concept I): the gem's act as a fixed-edge chip, orange left tick" (453-454) | yes | honor | — | — |
| A8.2 | The Act Lane | "source line whispered beneath" (455) | yes | honor | — | — |
| A8.3 | The Act Lane | "hover ✓ stamps acted (the gems store's own actedDay" (455-456) | yes | honor | — | — |
| A8.4 | The Act Lane | "the acted sweep can re-stamp from the record any time it truly speaks" (456-457) | partly | honor | — | — |
| A8.5 | The Act Lane | "every stamp carries ↺" (457) | yes | honor | — | — |
| A8.6 | The Act Lane | "Clicking the chip opens the Act Lane — a sticky workbench beside the sheet" (457-458) | yes | honor | — | — |
| A8.7 | The Act Lane | "evidence up top (citations drill to cleaned excerpts by the meat law)" (458-459) | yes | honor | — | — |
| A8.8 | The Act Lane | "the editable draft mid (TO/SUBJECT/BODY seeded from the relationship contact and the act)" (459-460) | yes | honor | — | — |
| A8.9 | The Act Lane | "Send/File/fork at the foot" (460-461) | yes | honor | — | — |
| A8.11 | The Act Lane | "a touched draft saves on close or chip-hop — the pad never eats your words" (462-463) | yes | honor | — | — |
| A8.12 | The Act Lane | "Send consumes it" (463) | NO | honor | — | — |
| A8.13 | The Act Lane | "Send files a real ✉ outbound to the record and opens mail" (463-464) | yes, one caveat | honor | — | — |
| A8.14 | The Act Lane | "the record then clears the nag itself" (464) | partly | honor | — | — |
| A8.15 | The Act Lane | "a board account's move lands as a HomeRoom action todo" (464-466) | yes, one caveat | honor | — | — |
| A8.18 | The Act Lane | "a seat counts as the account's own move so no vehicle rule swallows it" (468-469) | yes by the letter | honor | — | — |
| A8.19 | The Act Lane | "it rides until worked, taken back, or the record shows the outbound after it." (469-470) | NO | honor | — | — |
| A8.20 | The Act Lane | "Retired from the sheet the same day: the Stage, Next-action, and Play columns (Play reads in the drilldown's … | yes | honor | — | — |
| A8.21 | The Act Lane | "the filter rail (the Filter Door — one mono FILTERS ▾ ... lit and named while a filter is live)" (472-473) | yes | honor | — | — |
| A8.22 | The Act Lane | "the Sort dropdown (column titles are the only sort)" (474) | yes | honor | — | — |
| A8.23 | The Act Lane | "the header subtext, the hot-signal bar, and the hover ⊞ (the dashboard door is plain words in the drilldown)" … | yes | honor | — | — |
| A8.24 | The Act Lane | "The count rides the Account column title; ⧉/⇩ ride the page title; the search bar carries depth." (476-477) | yes | honor | — | — |
| A9.1 | Groundwork face | "one account center stage with an action line and a reason line" (250) | yes | honor | — | — |
| A9.2 | Groundwork face | "a left wing holding the day's worked stamps" (251) | yes | honor | — | — |
| A9.3 | Groundwork face | "a right wing holding the waiting queue heat-mapped (solid amber burns today, half amber dated this week, quie … | yes | honor | — | — |
| A9.4 | Groundwork face | "each name with its trigger whispered beneath" (253) | yes | honor | — | — |
| A9.5 | Groundwork face | "the band's command and countdown run the masthead — serif verb left, orange count right" (254-255) | yes | honor | — | — |
| A9.6 | Groundwork face | "a full-width burn bar draining as the window empties" (255-256) | yes | honor | — | — |
| A9.7 | Groundwork face | "red and throbbing inside the last five minutes" (256-257) | yes, count only | honor | — | — |
| A9.8 | Groundwork face | "the capsule facts (Chicago clock · date · weather) ride the sub-row" (257) | yes | honor | — | — |
| A9.9 | Groundwork face | "The room keeps the lower deck (the wire · the institutions · State of play)" (258) | yes | honor | — | — |
| A9.10 | Groundwork face | "Groundwork is outbound only — activities the operator initiates today to build pipeline" (258-259) | partly | honor | — | — |
| A9.11 | Groundwork face | "reactive account motion (replies owed, decision windows, meeting prep) belongs to the HomeRoom" (259-260) | partly | honor | — | — |
| A9.12 | Groundwork face | "The accounts page's stores and the deep-research notes (`research:<account>`) are backbone inputs to the queu … | yes | honor | — | — |
| A9.18 | Groundwork face | "means the deal is being worked — the HomeRoom's job, whatever the lagging board says" (270-271) | yes | honor | — | — |
| A9.20 | Groundwork face | "the winged stage won the variations" / "The instrument is the Klaxon" (249-254) | yes | honor | — | — |
| A10.1 | The Sendbook | "The outreach register lives at `/sendbook`" (311) | yes | honor | — | — |
| A10.2 | The Sendbook | "doored from Groundwork's page-foot Tallyfoot line (`THIS WEEK · N WORKED · …`)" (311-312) | yes | honor | — | — |
| A10.3 | The Sendbook | "never in the top wayfinder" (312) | yes | honor | — | — |
| A10.6 | The Sendbook | "the Channel Ask — Groundwork's Worked-it springs a chip row (EMAIL · CALL · VOICEMAIL · TEXT · LINKEDIN · INM … | yes | honor | — | — |
| A10.8 | The Sendbook | "a second chip row asks who only when the book knows more than one name" (317-318) | yes | honor | — | — |
| A10.9 | The Sendbook | "The pre-answer rule: an outbound the record already holds today answers the ask before it opens" (318-320) | yes | honor | — | — |
| A10.11 | The Sendbook | "Tapped touches are synthesized into the queue's drumbeat clocks at read time, never written to the touch log. … | yes | honor | — | — |
| A10.15 | The Sendbook | "and a CSM intro doesn't either" (325-326) | partly | honor | — | — |
| A10.16 | The Sendbook | "prior warmth marks the line GONE COLD" (326) | yes | honor | — | — |
| A10.18 | The Sendbook | "outcomes are never asked" (327) | yes | honor | — | — |
| A10.19 | The Sendbook | "The register tells what happened; what is due next stays Groundwork's." (327-328) | yes | honor | — | — |
| A10.20 | The Sendbook | "every stamp carries a hover ↺ that returns the move to the queue and withdraws its tap" (328-329) | yes, one caveat | honor | — | — |
| A10.21 | The Sendbook | "the record's own entries are never unwritten" (330) | yes | honor | — | — |
| A10.22 | The Sendbook | "the chip rows carry ✕ to close without filing" (330-331) | yes | honor | — | — |
| A10.23 | The Sendbook | "The wing never stamps mutely: no channel line means the rule's own label speaks." (331-332) | no | honor | — | — |
| A11.2 | Other standing decrees | "Account names are plain links — no ↗ arrows or affordance glyphs." (533) | yes | honor | — | — |
| A11.3 | Other standing decrees | "Threading badge reads exactly `MULTI`, colored by the semantic ladder (red 1 thread / amber 2 / green 3+)." ( … | yes | honor | — | — |
| A11.4 | Other standing decrees | "Edge tabs (Roundups · Check-ins) are thin AND inconspicuous — quiet ink, color on hover only. Names stay 'Rou … | names yes; hover color no | honor | — | — |
| A11.6 | Other standing decrees | "Ship pattern: branch ... → PR → Vercel CI green → squash merge = live production. Verify chain uses `&&`: pre … | not encoded | honor | — | — |
| A12.1 | The writing canon and plain-speech law on the ingest surfaces | "Imperative mood. ... Verbs, never noun-forms" (47-48) | mostly | honor | — | — |
| A12.2 | The writing canon and plain-speech law on the ingest surfaces | "An action line never carries a deadline" (49-51) | yes | honor | — | — |
| A12.3 | The writing canon and plain-speech law on the ingest surfaces | "The reason is the trigger, not a description" (52-54) | yes | honor | — | — |
| A12.4 | The writing canon and plain-speech law on the ingest surfaces | "No hedging, no framing: cut ... 'this account appears to.'" (55-56) | contested | honor | — | — |
| A12.5 | The writing canon and plain-speech law on the ingest surfaces | "No em-dash asides, no parentheticals, no sentence needing a second read." (57) | no | honor | — | — |
| A12.6 | The writing canon and plain-speech law on the ingest surfaces | "Top-level action and reason lines: six words or fewer." (58-59) | yes | honor | — | — |
| A12.7 | The writing canon and plain-speech law on the ingest surfaces | "Yesterday carries." (60-61) | adjacent gap | honor | — | — |
| A12.8 | The writing canon and plain-speech law on the ingest surfaces | "'X-shaped' is retired" (62-63) | yes | honor | — | — |
| A12.9 | The writing canon and plain-speech law on the ingest surfaces | "The two-tier law ... Say 'internal'; never 'their own book.'" (64-67) | yes | honor | — | — |
| A12.10 | The writing canon and plain-speech law on the ingest surfaces | "No property-talk about history." (68-70) | yes | honor | — | — |
| A12.11 | The writing canon and plain-speech law on the ingest surfaces | The seven devices: antithesis, paradox, maxim, definitional flip, consequence closer, escalating triad, chiasm … | mostly | honor | — | — |
| A12.12 | The writing canon and plain-speech law on the ingest surfaces | "invented slang ..., constructed non-conversational phrasing ..., and performative reassurance flourishes" (10 … | no | honor | — | — |

## 2. Ungoverned behaviors (34: 26 open · 8 ruled)

Status is one of: open · ruled (the founder decided; the ruling is quoted) · encoded (CLAUDE.md carries it; line cited) · enforced (a chain test or construction pins the new decree).

| Ledger row | What the code does | Nearest decree | Ruling needed | Status | Ruling | Encoded at | Moved by |
|---|---|---|---|---|---|---|---|
| P1 | The wayfinder archives /today (app-wayfinder.tsx:86-100) while refresh() revalidates it (actions.ts:68) and it runs full derivation (today/page.tsx:65 … | Chute (283) | Whether /today is a surface or an archive, and whether a filing still owes it a refresh. | ruled | GOVERN: archived means out of every tab and revalidation list | — | batch 4 · 2026-09-25 |
| P2 | The Intranet's Send-it box writes intranetDoc rows and never files an AccountNote [pass-1 cite, intranet/actions.ts:103-245] | Chute (276, 281) | Whether Send-it is an intake, and if so that it files through roomPaste. | ruled | GOVERN: a capture naming an account files through the paste pipeline | — | batch 4 · 2026-09-25 |
| P3 | A note carries no record of which door filed it: createAccountNoteRow (write.ts:26-58) takes no door field and `source` names the dialect | Ted doctrine (359-375) | Whether the record must say which door filed a note. | ruled | GOVERN: every note records its door in its own column | — | batch 4 · 2026-09-25 |
| P4 | Second-record rows are written bare with kind "mine", source "activity" and no lane, actors or recipients (run.ts:190-191, :208-209) | Second record (404-419); Ted doctrine | Whether namespaced store rows may wear a record kind, or must carry one no first-record reader recognizes. | ruled | GOVERN: second-record rows carry full provenance | — | batch 4 · 2026-09-25 |
| D1 | The Intranet mounts a second Chute with an inline roster that lacks people and aka (intranet/page.tsx:118-138); a chain test pins the mount (vault.tes … | "ONE intake at the top" (276) | Whether the Intranet carries a Chute at all, and if so that it must take routingRoster(). | ruled | GOVERN: one Chute, one roster, wherever it mounts (R11 A) | — | batch 4 · 2026-09-25 |
| D2 | A .csv that probes as the activity report leaves roomPaste for the second record (chute.tsx:356-359; upload.ts:14-24); the ActivityDock is a second do … | Second record (404-419); Chute (281) | Which doors take the export, and what the Drop does with one. | ruled | GOVERN: Chute or dock take the export; the Drop refuses .csv (R12 A) | — | batch 4 · 2026-09-25 |
| D3 | PDFs and images go to the model before any routing (chute.tsx:360; actions.ts:1732-1791): 8 MB cap, claude-opus-5, a 60,000 slice, and a prompt that a … | "read on the spot" (277); the VTT clause (277-279) | What a PDF or image transcript is and whether it earns the CALL TRANSCRIPT path. | ruled | GOVERN: the transcriber emits CALL TRANSCRIPT for a call (R4 A) | — | batch 4 · 2026-09-25 |
| D4 | Caps with no receipt: 60,000 / 400,000 with a truncation note (actions.ts:187-192); docx 60,000 (read-file.ts:93); sheets 4 tabs / 400 rows / 30,000 ( … | (277) | What may be cut on the way in and whether every cut appears on the receipt. | ruled | GOVERN: file and text kept whole; only the model read is windowed, on the receipt | — | batch 4 · 2026-09-25 |
| D5 | The picker and the batch-mate button file with force: true (chute.tsx:578, :600), skipping both guard rungs but never the duplicate guard; the batch-m … | "waits for the operator's pick" (284); routing (279-281) | Whether a pick is final and unguarded, and whether batch siblings are a routing signal. | open | — | — | — |
| D6 | Unreadable files route by filename and vault with no guard and no pick when a name matches (chute.tsx:361-368) | "Nothing files blind" (284) | Whether vaulting counts as filing. | open | — | — | — |
| D7 | The duplicate guard and its marker both fail open (actions.ts:231-233, :133-136); a ✕-parked filing keeps its marker (:1486-1491) | (287-289) | Guard or gate; and whether a parked filing is "on file". | open | — | — | — |
| D8 | The GitHub vault: browser-carried raw bytes under accounts/<Account>/<file>, a 25 MB / 2 GB split, a token handed to the browser (archive-actions.ts:1 … | none | Canonize the vault: naming, lanes, the browser-held token, and the money boundary. | open | — | — | — |
| D9 | Two verdicts per filing: a keyless early rung with an empty claim (actions.ts:241-261) and a late rung on the read's claim (:318-339); keyless session … | (283-284) | Whether a filing may be disputed twice. | open | — | — | — |
| D10 | Owner "them" actions are dropped from the fan-out (actions.ts:520); read.signals is never stored (ai-clean.ts:22); fan-out dedupes against open todos, … | (281-283) | Where their commitments and the read's signals live; whether a repeated commitment is one; confirm the marker-not-close rule. | open | — | — | — |
| D11 | Unbounded parallel swallows: N concurrent model reads and N grant calls before grantRef fills (chute.tsx:388-391, :255-264) | (277) | A concurrency ceiling. | open | — | — | — |
| D12 | Per-receipt ✕ and "Clear the receipts" (chute.tsx:409-434, :733-743), decreed 2026-09-01 in a comment and pinned in chain (second-record-faces.test.ts … | (285-286) | Canonize receipt dismissal, the receipt fold's budget, and what the ledger may keep. | open | — | — | — |
| D13 | routingRoster() with contact emails, domains and people is serialized as a client prop (room/page.tsx:793, :842) while roster.ts:2-3 says contacts.jso … | none | Whether the book's contact emails may ship in the RSC payload. | open | — | — | — |
| D14 | Typed rich notes route through roomPaste and its guard and dedupe (room-client.tsx:394-403) | (281) | Whether a typed note is a paste. | open | — | — | — |
| D15 | refresh() names five paths (actions.ts:65-71) and every page is force-dynamic, so the list decides nothing today | "every tab re-derives" (283) | Whether refresh() is the canonical tab list or dead code. | open | — | — | — |
| D16 | The fingerprint hashes the head line including the filename (paste-files.ts:42-53, :196, :309, :478), so a renamed file or an .eml/.msg twin of one ma … | "the same capture" (288) | What "the same capture" means. | open | — | — | — |
| D17 | Second-record slices overwrite per account at run.ts:298 before the manifest verifies at :306-342; a refused or abandoned upload leaves new slices und … | "an incomplete upload refuses to run" (413-414) | Whether staging must verify before any slice replaces its predecessor. | open | — | — | — |
| D18 | The take-back deletes all four second-record spans (run.ts:1131-1137), including the operator's hand actedDay stamps (act-actions.ts:127-142); srdraft … | "every stamp carries ↺" (457); "the record's own entries are never unwritten" (330) | Whether the operator's acted stamps are the first record or die with the second. | open | — | — | — |
| D19 | The colleague roster is "assigned on two or more accounts" (ingest.ts:100-105, :359-362); lastOrgInbound is the export's account-level Last Email Rece … | (409-410); Ted 373-374; closer rule | Whether an account person seen on two accounts is a colleague, and whether an account-level datetime counts as "their voice". | open | — | — | — |
| D20 | The acted match is `text.includes(w)` over the who and head of the 60 newest notes (run.ts:1033-1052); "Natalie B." never matches gem who "Natalie Bor … | (417-418); (412-413) | What counts as the record moving on a gem's person; whether campaign titles are "the blast". | open | — | — | — |
| D21 | Gem act, reason, what and signal are model prose rendered verbatim (day.ts:343-344; evidence-chips.tsx:219-220); the canon lint checks mood, length, h … | (418-419); writing canon; plain-speech law | Whether the seven devices are linted on gem lines, and whether digits in gem prose are "rendered counts". | open | — | — | — |
| D22 | The vehicle fallback `?? list[0]` / `?? bearers[0]` (day.ts:537, :604) lets a 70-weight slot outrank an account's own 52 move when no free account exi … | Vehicle rule (446-449) | Whether a vehicle may ever collide or must drop for the day. | open | — | — | — |
| D23 | The Act Lane's ✉ head carries no dialect token (act-actions.ts:108), so provenance.ts:200-211 cannot infer its actors from the body; CT and SN heads a … | "Send files a real ✉ outbound" (463-464); the note grammar | Whether every writer must emit a head the legacy inferrer accepts, or every reader must keep the actors column. | open | — | — | — |
| D24 | The pad's ASK THE APP register routes (padAsk, scratch/actions.ts:164-200) under a pact that says nothing routes; onBlur keeps an edit (scratchpad.tsx … | Scratchpaper (298-299, 303-304) | Whether the ask door is part of the paper, and whether click-away keeps. | open | — | — | — |
| D25 | The engine computes a court line the client never renders (engine.ts:242-272; room/page.tsx:605; room-client.tsx:120), pinned by a chain test (intrada … | Spring (343) | Whether the retired court line is dead code to delete or an engine fact the move lines must carry. | open | — | — | — |
| D26 | The Klaxon opens the send window at 7:00 (instrument.tsx:18-24) while the band table says 9:00 to 11:00 (day.ts:168-178) and the chain pins 10a/12:30p … | Groundwork face (254-257) | One clock for the band. | open | — | — | — |
| D27 | Sheet stamps for seated, second-record-gem and engaged-never-introduced carry no subtext (groundwork/page.tsx:420-471 default "") | "The wing never stamps mutely" (331-332) | The label each of those three rules speaks. | open | — | — | — |
| D28 | Hand-typed dated actions never read PROMISED (sheet-view.ts:176), only paste-provenance rows | Closer rule (389-390) | Whether a date the operator heard and typed is a promise. | open | — | — | — |
| D29 | The Chute renders nothing without canWrite (chute.tsx:627); read-only sessions have no intake and no receipt ledger | (276) | What a read-only session sees at the top of the HomeRoom. | open | — | — | — |
| D30 | scratch rows and every other namespaced row consume the intranet mirror's 400-row budget before being skipped (runners.ts:146-151) [inferred] | Scratchpaper (297-298); Chute (283) | Whether namespaced rows are excluded in the query rather than after it. | open | — | — | — |

## 3. Conflicting pairs (20: 0 open · 20 ruled)

Status is one of: open · ruled (which side, quoted) · encoded (CLAUDE.md amended; line cited) · aligned (the code follows the ruling; cite).

| Ledger row | Decree 1 | Decree 2 | Code follows at pass 3 | Status | Ruling | Encoded at | Moved by |
|---|---|---|---|---|---|---|---|
| C1 | Ted, 368-372 | Second record faces, 424-426 | The face: accounts/page.tsx:345-352 → rollup.ts:124-158; touch.ts is n … | ruled | Ted 368-372 stands; the column merges both records by latest | — | batch 1 · 2026-09-25 |
| C2 | Chute, 279-281 | Ted, 363 | The Chute: roster.ts:24-35 builds from peos, contactsFor and AKA; no f … | ruled | Ted 363 stands; the roster reads the record's actors too (R1 B) | — | batch 1 · 2026-09-25 |
| C3 | Ted, 364-368 | Ted, 371-372 | Merge by latest: touch.ts:125 `outAt > logAt` | ruled | 371-372 stands; the touch log merges by latest (R5 A) | — | batch 1 · 2026-09-25 |
| C4 | Closer, 381-382 | Sendbook, 326-327 | The Sendbook's literal reading: read.ts:136-149 has no closer test → : … | ruled | closer rule stands; ↩ REPLIED needs substance (R6 A) | — | batch 1 · 2026-09-25 |
| C5 | Ted, 373-374 | Second ring, 429-431 | The comment: read.ts:118-132 excludes AUTO_RE only, so acceptances, no … | ruled | 373-374 and 408 stand; machinery never warms, acceptance is machinery | — | batch 1 · 2026-09-25 |
| C6 | Groundwork, 258-260 | Second record, 409-410 | The second record: day.ts:389-408 fires the org-answered silence-bump … | ruled | 258-260 stands; org inbound excludes, the move goes to the HomeRoom (R8 C) | — | batch 1 · 2026-09-25 |
| C7 | Groundwork, 265-266 | Act Lane, 467-468 | Both by branch: day.ts:664 `ruleId === "seated" ? SEAT_SLOT_CAP : RULE … | ruled | Act Lane 467-468 stands; two caps for two things | — | batch 2 · 2026-09-25 |
| C8 | Groundwork, 262-264 and 268-271 | Act Lane, 469-470 | The Act Lane: day.ts:561-576 pushes seats with no excludedIds check | ruled | Groundwork 262-271 stands; a seat follows its account to the HomeRoom | — | batch 2 · 2026-09-25 |
| C9 | Groundwork, 266-268 | Vehicle rule, 446-449 | The vehicle rule with a fallback: day.ts:536-537 `bearers.find(p => !t … | ruled | vehicle rule stands; the bearer has no candidate of its own | — | batch 2 · 2026-09-25 |
| C10 | Scratchpaper, 301-302 | Other standing decrees, 538-539 | The Scratchpaper: scratch/actions.ts:70, :296 no redact; :171 redacts … | ruled | Scratchpaper 301-302 stands; the pad keeps figures | — | batch 3 · 2026-09-25 |
| C11 | Playbook face, 519-525 | Other standing decrees, 538-539 | The face: countries.ts:165-179 and country/route.ts:28-30 never call r … | ruled | Playbook 519-525 stands; statutory facts render as authored | — | batch 3 · 2026-09-25 |
| C12 | Playbook authoring canon, 124-126 | Playbook face, 516-518 | The face: playbook-client.tsx:153, :176-177; playbook/page.tsx:158, :1 … | ruled | Playbook face 516-518 stands; the register's names are cites | — | batch 3 · 2026-09-25 |
| C13 | Click-depth, 397-399 | Playbook face, 514-516 | The carve-out: src/lib/ask/links.ts:65-70; tests/ask-links.test.ts:28 … | ruled | both stand; the citation opens in place to the bank's question | — | batch 3 · 2026-09-25 |
| C14 | Spring, 345-347 | Spring, 344 | Both: controls carry only `title=` (room-client.tsx:1270, :1279, :1365 … | ruled | 344 stands; nothing superseded, the legend is the one place | — | batch 2 · 2026-09-25 |
| C15 | Second record faces, 425 | Act Lane, 474-476 | The Act Lane: accounts-client.tsx:1199-1210 | ruled | Act Lane 474-476 stands; the hover glyph clause is retired text | — | batch 2 · 2026-09-25 |
| C16 | Second record faces, 427-428 | Design canon, 11-16 and 37 | The face: room.module.css:2330 `#8a5a00` | ruled | design canon stands; THEIRS is the account's people, in blue | — | batch 2 · 2026-09-25 |
| C17 | Writing canon 4, 55-56 | Plain-speech law, 79-81 | The carve-out [answer-row copy not re-read this pass] | ruled | plain-speech 79-81 stands; answer rows hedge | — | batch 3 · 2026-09-25 |
| C18 | Sendbook, 317-318 | Ted, 363 | The Sendbook's "the book": groundwork/page.tsx:828-831 passes contacts … | ruled | Ted 363 stands; the chip row offers the record's people too | — | batch 1 · 2026-09-25 |
| C19 | Direct doctrine, 240-241 | Act Lane, 477-479 | The gate: campaigns/index.ts:22-25; accounts-client.tsx:425-429 | ruled | direct doctrine stands; the Approach is a fact, never a gate | — | batch 2 · 2026-09-25 |
| C20 | Chute, 283-284 | Chute, 285-287 | Interrupted: chute.tsx:84, :96-97 | ruled | 283-284 stands; a waiting pick survives a reload (R14 A) | — | batch 2 · 2026-09-25 |

## Log

- 2026-09-25 · opened from the pass-3 ledger at main 3726363. 111 · 34 · 20.
- 2026-09-25 · ruling session, batch 1 (pass 3 C): C1, C2, C3, C4, C5, C6, C18 ruled. 111 · 34 · 13 open + 7 ruled.
- 2026-09-25 · ruling session, batch 2 (pass 3 C): C7, C8, C9, C14, C15, C16, C19, C20 ruled. 111 · 34 · 5 open + 15 ruled.
- 2026-09-25 · ruling session, batch 3 (pass 3 C): C10, C11, C12, C13, C17 ruled. Section C is fully ruled. 111 · 34 · 0 open + 20 ruled.
- 2026-09-25 · ruling session, batch 4 (pass 3 D): P1, P2, P3, P4, D1, D2, D3, D4 ruled. 111 · 26 open + 8 ruled · 0 open + 20 ruled.

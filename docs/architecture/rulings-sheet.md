---
title: Rulings Sheet
status: In session, 2026-09-25; rulings recorded in decree-ledger.md as they land
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/decree-ledger.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/chute-architecture-map.md
---

# Rulings Sheet

Seventeen decisions that decide what the Chute refactor builds. Each comes from a row of the pass-3 decree ledger (C is a pair of decrees that contradict, D an ingest behavior no decree governs), and each names what runs today, the options, what every option changes in code, and a default. The default is offered, not decided: take it, strike it, or write a third thing. Nothing here amends CLAUDE.md; once a row is ruled, the amendment lands in one line with the ruling's date, the scoreboard row moves, and the test pass pins it.

To answer, fill the form at the foot or reply in chat as `R1 B, R2 A, …`. A row can also be answered "later", which parks it and lets the refactor keep today's behavior behind a named test.

Grouped by the piece of the refactor each row gates. Cites are against main at 741f3ad; the ledger row holds the full evidence.

## 1. What the record is (candidate 1, the head and source grammar)

### R1 · C2 · Routing reads the seed only

**Question.** When the Chute routes a file, may the record's own actors and recipients vote, or is routing the one seed-first read?

**Today.** Seed only. routingRoster() builds from book.json, contacts.json and the AKA table (src/lib/book/roster.ts:24-35). An address the record holds but the seed lacks falls to "No sure match. Pick the account."

| | Option | Code |
|---|---|---|
| A | Seed only, as today. Amend the Ted doctrine with the carve-out: routing is the one seed-first read, because a misfiled note must not be able to teach the router. | None. |
| B | Seed plus record. The roster adds every email and person the record's actors and recipients columns hold, per account. The guard still judges the result. | roster.ts gains a loader over the actors and recipients columns; the router's email and people rungs read both. One test: a correspondent the seed lacks routes by the record. |
| C | Record first, seed fallback, the doctrine's letter. As B, and a record hit outranks a seed hit on a tie. | As B plus a tie rule in route-capture.ts. |

**Default.** B.

### R2 · D16 · What "the same capture" means

**Question.** Is a renamed file, or the .eml and .msg of one mail, or a re-copied thread with a fresh bookmarklet date in its head, the same capture?

**Today.** No. The fingerprint hashes the normalized text including the head line, and the head carries the filename (src/lib/paste-files.ts:42-53, :196, :309, :478).

| | Option | Code |
|---|---|---|
| A | As today: same normalized text, head included. Amend :288 to say a rename or a twin format is a new capture. | None. |
| B | Body only: the fingerprint skips the head line. A rename, a twin format and a re-copy with a fresh date all dedupe. | pasteFingerprint drops the first line; one test per case. |
| C | Body plus dialect: as B, but an .eml and its Teams paste stay distinct. | As B, with the dialect token folded in. |

**Default.** B.

### R3 · D23 · Which side owns provenance, the head or the column

**Question.** Must every writer emit a head line the legacy inferrer accepts, or must every reader keep the actors and recipients columns?

**Today.** Half of each. CT, SN and the Act Lane's ✉ heads never infer (src/lib/intel/provenance.ts:200-211; act-actions.ts:108); Groundwork drops the columns and infers from the head (src/app/groundwork/page.tsx:238-243), so its clocks miss every call and every Act Lane send.

| | Option | Code |
|---|---|---|
| A | The column is the record; the head is display. Every reader keeps actors and recipients; inferActors exists only for rows filed before the columns. | Candidate 2's one read carries the columns; Groundwork's projection dies; no writer changes. |
| B | The head is the record. The inferrer accepts every dialect the write block emits and the Act Lane emits one. | provenance.ts:200 alphabet; act-actions.ts:108 head; readers may keep stripping. |

**Default.** A. It is the cheaper half of candidate 2 and it retires a regex.

### R4 · D3 · PDFs and images

**Question.** Is a PDF of a call recording a CALL TRANSCRIPT, with the tape's cap, its archive note and its recorded day?

**Today.** No. The transcriber asks for OUTLOOK THREAD or TEAMS THREAD heads only (src/app/room/actions.ts:1769), so a PDF'd call files as dialect SF under the 60,000 cap with no archive.

| | Option | Code |
|---|---|---|
| A | The transcriber sniffs the document and emits CALL TRANSCRIPT when it reads as a call (speaker-labelled lines), with the recorded day when the document carries one. | The prompt at :1769 and the head branch; the CT cap and archive then apply on their own. |
| B | PDFs are documents, never tapes. Amend :277 to say a recording reaches the Chute as .vtt or not at all. | None. |

**Default.** A.

## 2. Whose move (candidate 2, the one account read)

### R5 · C3 · The touch log against the record

**Question.** When the outreach touch log is newer than the record's last outbound, which wins: the log because it is later, or the record because it spoke?

**Today.** Latest wins (src/lib/room/touch.ts:125). The doctrine says both things (:364-368 and :371-372).

| | Option | Code |
|---|---|---|
| A | Latest wins. Amend the stand-in list at :364-365: the touch log is the operator's own hand, not a stand-in, and merges by latest. | None. |
| B | The record wins whenever it holds any outbound; the log only fills the gap before the record speaks. | touch.ts:125 one condition; day.ts:382-385 the same. |

**Default.** A.

### R6 · C4 · Is ↩ REPLIED state or warmth

**Question.** Does a courtesy sign-off ("Thanks!") annotate the send before it as replied?

**Today.** Yes. inboundDates has no closer test (src/lib/sendbook/read.ts:136-149), and a hand-run test pins it by fixture accident (tests/sendbook.test.ts:113, :128).

| | Option | Code |
|---|---|---|
| A | Warmth only. A closer warms the lane and does nothing else; ↩ REPLIED needs a substantive message. | inboundDates gains the isCloser gate; warmDates keeps closers; the fixture at sendbook.test.ts:28-33 gets a substantive body. |
| B | A reply is a reply. Amend :381-382 to name the Sendbook's annotation as the one place a closer sets state. | None. |
| C | Both shown: ↩ REPLIED for a substantive message, ↩ SIGNED OFF for a closer. | As A plus a second annotation and its label. |

**Default.** A.

### R7 · C5 · Machinery and the lane

**Question.** Does a calendar acceptance, a bounce, or a campaign alert warm the lane or count as a reply?

**Today.** Both. The Sendbook excludes auto-replies by a head regex only (read.ts:114); acceptances, notices and alerts pass, warm, and set ↩ REPLIED. The court already treats them as machinery.

| | Option | Code |
|---|---|---|
| A | Machinery never warms and never replies. A calendar acceptance annotates the send as BOOKED, not REPLIED, since a human did click it. | inboundDates and warmDates gain isMachinery; the acceptance path annotates BOOKED. |
| B | An acceptance warms (a person answered), bounces and alerts do not. | As A without the BOOKED annotation; acceptance stays in warm. |
| C | As today. Amend :373-374 to except the Sendbook. | None. |

**Default.** A.

### R8 · C6 · The org-side inbound

**Question.** When an account person replies into a colleague's inbox (the second record), is the account in motion for Groundwork's 21-day exclusion, or does it get a coordination move on the outbound-only surface, as today?

**Today.** The coordination move fires on Groundwork (src/lib/groundwork/day.ts:389-408) and the account never leaves the queue, because liveMotionIds reads the first record alone (:81-106).

| | Option | Code |
|---|---|---|
| A | It excludes like any inbound; the coordination move moves to the HomeRoom. | liveMotionIds reads orgInboundKey; the silence-bump's org variant becomes a HomeRoom todo or a THEIRS line. |
| B | As today: coordination is outbound-shaped work. Amend :258-260 to admit it. | None. |
| C | Both: the account leaves the queue and the HomeRoom's THEIRS line carries "Ask Anika what they said." | As A. |

**Default.** C.

### R9 · CLAUDE.md:391 · The clock

**Question.** "All days are Chicago days, theirs or ours." Which UTC readers does that retire?

**Today.** Six stand, two of them pinned in the chain: morningDoneKey (src/lib/today/build.ts:447-450; tests/today.test.ts:655), daysBetween as a millisecond floor (src/lib/room/engine.ts:89-93; tests/room-engine.test.ts:206), passedWall at T23:59:59Z (src/lib/room/sheet-view.ts:119-127), businessDaysBetween on UTC weekdays (src/lib/groundwork/signals.ts:70-79; src/lib/intel/brief.ts:62-71), the pipeline's dayOf (src/lib/pipeline/build.ts:107-109; report.ts:352, :381), the meeting sibling day (src/lib/intel/meeting.ts:157-164).

| | Option | Code |
|---|---|---|
| A | All of them. One Chicago day helper; the noon-UTC anchor stays as the storage convention and every comparison converts. The two chain tests are rewritten, not deleted. | The six sites above; src/lib/tz.ts becomes the one helper; today.test.ts:655 and room-engine.test.ts:206 assert Chicago. |
| B | The operator-facing ones only: done keys, court chips, PROMISED, business days. The pipeline report and the meeting sibling stay UTC. | Four of the six. |
| C | Retire nothing. Amend :391 to say the day anchor is UTC noon and the keys follow it. | None. |

**Default.** A.

### R10 · C1 · LAST HUMAN TOUCH

**Question.** Does the Accounts column merge the first record, or read the export alone as the face decreed?

**Today.** Export alone (src/app/accounts/page.tsx:345-352). An .eml filed Sep 22 shows the export's Sep 10.

| | Option | Code |
|---|---|---|
| A | Merge by latest, the doctrine. The column reads candidate 2's lastTouch beside the rollup's lastHuman and shows the later, with its source whispered. | The column reads both; one test. |
| B | Export alone. Amend :368-372 with the carve-out and rename the column LAST TOUCH IN SALESFORCE so it says what it reads. | The header label. |

**Default.** A.

## 3. The doors (candidates 4, 5, 9)

### R11 · D1 · The Intranet's Chute

**Question.** Does the Intranet carry a Chute, and if so with which roster?

**Today.** It does, with an inline roster of emails and domains only (src/app/intranet/page.tsx:121-138), so a tape that routes by a person on the HomeRoom falls to the pick there.

| | Option | Code |
|---|---|---|
| A | One Chute, two mounts, one roster. | intranet/page.tsx takes routingRoster(); tests/vault.test.ts:238 stays. |
| B | The Intranet has the dock only. | Delete the mount; amend :276. |
| C | As today. Amend :276 to name both mounts and the reduced roster. | None. |

**Default.** A.

### R12 · D2 · Where the activity export enters

**Question.** Which doors take the weekly export, and what does the Drop do with one?

**Today.** The Chute and the dock both take it; the Drop never probes and files it as an SF note (src/lib/paste-files.ts:502-505).

| | Option | Code |
|---|---|---|
| A | Chute and dock both; the Drop refuses a .csv with "The export goes in the Chute." | DROP_ACCEPT drops csv, or the Drop probes and refuses. |
| B | Chute only; the dock retires. | Delete dock.tsx and its mount. |
| C | Dock only; the Chute's probe retires. | Delete the probe branch at chute.tsx:356-359. |

**Default.** A.

### R13 · D5 · Force at the picker

**Question.** After the operator picks an account for a disputed or unmatched file, is the filing judged again?

**Today.** No. Every pick files with force, skipping both guard rungs (chute.tsx:578, :600).

| | Option | Code |
|---|---|---|
| A | The pick is final; the guard never re-runs. Amend :284. | None. |
| B | Re-judge against the picked account from a read cached by fingerprint; a second dispute shows both sides, the Drop's banner shape. | Candidate 9's verdict component plus a roomPaste option; the cache. |
| C | Re-judge on the free early rung only; the model's claim is not re-spent. | roomPaste honors force for the late rung only. |

**Default.** C.

### R14 · C20 · A pick across a reload

**Question.** Does a file waiting on the operator's pick survive a reload?

**Today.** No. The ledger strips the text and converts the wait to interrupted (chute.tsx:84, :96-97), against :284.

| | Option | Code |
|---|---|---|
| A | The wait survives. The ledger keeps text for pick and mismatch rows; a binary file cannot survive and the row says so. | chute.tsx:84 and :96-97; a size guard for localStorage. |
| B | As today. Amend :286 to say a waiting pick comes back as interrupted. | None. |

**Default.** A.

### R15 · D7 · Guard or gate

**Question.** When the duplicate guard's read fails, or its marker write fails, does the filing proceed?

**Today.** It proceeds silently, both ways (src/app/room/actions.ts:231-233, :133-136).

| | Option | Code |
|---|---|---|
| A | Fail open, but say so: the receipt carries "The duplicate check didn't run." | One flag on the result; one receipt line. |
| B | Fail closed: refuse with "The duplicate check didn't run. Drop it again." | The catch returns a refusal. |

**Default.** A.

### R16 · D8 · The vault

**Question.** The GitHub vault is decreed only in comments. Canonize it, and if so with the token in the browser and raw bytes past the money boundary?

**Today.** The browser PUTs the raw file under accounts/<Account>/<file> with a short grant (src/lib/github/archive.ts:97-150; archive-actions.ts:13-28); the money doctrine at :538-539 does not know it exists.

| | Option | Code |
|---|---|---|
| A | Canonize as is: one decree paragraph, and the money doctrine gets a carve-out because the vault is evidence, not a surface. | None. |
| B | Canonize with a server-side upload so the token never reaches the browser. | The PUT moves into a route handler; the grant retires. |
| C | Retire the vault. | Delete archive.ts, archive-actions.ts and both call sites; tests/vault.test.ts. |

**Default.** A now, B inside the refactor.

## 4. Groundwork

### R17 · C8 · Seats against exclusion

**Question.** When a seated account becomes excluded (demo or later, a stamp, live motion, not-mine, snoozed), does the seat ride or leave?

**Today.** It rides (day.ts:561-576 never checks excludedIds).

| | Option | Code |
|---|---|---|
| A | It leaves, and comes back if the exclusion lifts before it is worked. | The seat loop checks excludedIds; one test. |
| B | It rides regardless. Amend :262-271 to except seats. | None. |

**Default.** A.

## The form

| Row | Ledger | Ruling | Note |
|---|---|---|---|
| R1 | C2 | B | ruled 2026-09-25 · decree-ledger C2 |
| R2 | D16 | | |
| R3 | D23 | A | ruled 2026-09-25 · decree-ledger P3 |
| R4 | D3 | A | ruled 2026-09-25 · decree-ledger D3 |
| R5 | C3 | A | ruled 2026-09-25 · decree-ledger C3 |
| R6 | C4 | A | ruled 2026-09-25 · decree-ledger C4 |
| R7 | C5 | A, acceptance is machinery; BOOKED not ruled | ruled 2026-09-25 · decree-ledger C5 |
| R8 | C6 | C | ruled 2026-09-25 · decree-ledger C6 |
| R9 | :391 | | |
| R10 | C1 | A | ruled 2026-09-25 · decree-ledger C1 |
| R11 | D1 | A | ruled 2026-09-25 · decree-ledger D1 |
| R12 | D2 | A | ruled 2026-09-25 · decree-ledger D2 |
| R13 | D5 | | |
| R14 | C20 | A | ruled 2026-09-25 · decree-ledger C20 |
| R15 | D7 | | |
| R16 | D8 | | |
| R17 | C8 | a third option: the seat follows its account to the HomeRoom | ruled 2026-09-25 · decree-ledger C8 |

Not on this sheet, deliberately: the other three conflicting pairs and seventeen ungoverned behaviors on the scoreboard. None of them changes what candidates 1 and 2 build; they wait for the passes that touch them.

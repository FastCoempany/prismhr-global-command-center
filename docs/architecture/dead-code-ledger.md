---
title: Dead Code Ledger
status: Audit pass 4, 2026-09-25
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/chute-architecture-map.md
  - docs/architecture/derived-fact-ledger.md
  - docs/architecture/decree-ledger.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/dead-code-appendix.md
---

# Dead Code Ledger

Audit pass 4, taken on main at 741f3ad on 2026-09-25 (the two docs commits since carry no code). Two purposes: what can come out before the Chute refactor so the refactor touches less, and where the app spends work nobody reads. This pass reports; it deletes nothing.

Method. Unused files and exports came from two knip runs (one counting tests as readers, one not) cross-checked by a name-based scan over every `export` in src, with each dead claim re-verified by a targeted grep; the compiler with `--noUnusedLocals` reports zero unused non-exported symbols, so every dead symbol here is an export. CSS classes were computed, not read: every class selector in every `.module.css` against every `styles.name`, `styles["name"]` and `styles[`prefix${…}`]` reference in its importers, then the fourteen `styles[expr]` dynamic accesses were resolved by hand from their value maps. Prisma models were counted by delegate call (`.model.find|create|update|upsert|delete|count`) across src, prisma and scripts. Five readers took the tests outside the chain, the head-token and comment contracts, the routes and archived pages, the store namespaces and marker families, and the work-with-no-reader question. Cites are against main at 741f3ad; [inferred] marks a claim from code shape rather than a run. CLAUDE.md was checked before anything was called dead: DEAD means no reader and no decree; DORMANT BY DECREE cites the line that keeps it; DORMANT WITHOUT A DECREE means nothing reads it and nothing rules on it; NEEDS THE DB means a production count has to come first.

Pass 1's finds, confirmed: the fifteen Prisma models between prisma/schema.prisma:268 and :760 have no delegate call in src, but prisma/seed.ts writes every one of them (a hand-run script, package.json:19), so their tables may hold rows; `risk:` is read at src/app/accounts/page.tsx:97-98 and `inst:` at src/app/groundwork/page.tsx:167-169 with no writer anywhere; the four surfaces the wayfinder archives (src/components/app-wayfinder.tsx:86-118) all still run and /today still runs the full derivation head (src/app/today/page.tsx:591-1094); `modelFor` voids its argument (src/lib/intel/ai-clean.ts:348-351) and the classifier its comment describes, `looksLikeNotes` (:333), has no caller in src; two head tokens are emitted and never read (SPREADSHEET, DOCUMENT), one is read and never emitted (TEAMS CHAT), and one is emitted for a door that never reads it (SALESNAV, below).

One correction to pass 2: its A10 table listed `sfStageForStates` (src/lib/dashboard/stages.ts:132) as a stage-derivation path the app runs. Nothing in src calls it; only tests/today.test.ts does. It is test-only dead code, not a derivation.

## A. Dead code

### A1. Modules nothing imports

| Item (file:line) | Classification | Decree if dormant | How checked | What removing it touches |
|---|---|---|---|---|
| src/app/notes-client.tsx (493 lines): NotesPanel, a `/notes` client for a route that does not exist | DEAD | none; CLAUDE.md has no notes panel | knip both runs; `rg notes-client src tests` → 0 | Its three server actions become dead with it: createTodoNote, saveTodoNote, deleteTodoNote (src/app/today/actions.ts:876-955, ~80 lines) have no other consumer; smartPaste (src/lib/paste.ts) keeps its other importer, today/day-sheet.tsx:25 |
| src/components/hml-priority-panel.tsx (112) | DEAD | none; CLAUDE.md never mentions HML | knip; `rg hml-priority-panel src` → 0 | Pulls three more dead files with it (next three rows) and the `/prospect-field` link at src/lib/hml-priority.ts:64, whose route does not exist yet is guarded by src/lib/access-proxy.ts:5 |
| src/lib/hml-priority.ts (76) | DEAD | none | only importer is the panel | Enum imports from the generated client (HmlCategory, HmlValue, SourceConfidence) that only the dead models define |
| src/components/field-glyph.tsx (138) | DEAD | none, but docs/architecture/field-glyphs.md and design-brand-audit.md:77-78 describe it as the design system's glyph set | only importer is the panel | Two design docs go stale; the design canon (CLAUDE.md:3-40) does not name the glyph set |
| src/components/ui/badge.tsx (29) | DEAD | none | only importer is the panel (`rg "ui/badge" src` → 1) | none |
| src/app/today/partner-notes.tsx (91): a Focus-card partner-notes fold | DEAD | none | knip; `rg partner-notes src` → 0 | deletePartnerNote (src/app/partners/actions.ts) loses its only importer outside /partners |
| src/lib/aleks/one-on-one.ts (90): curated prose from 1:1 sessions, "appended after each 1:1" | DEAD | none; docs/automation-map.md:35 mentions the Aleks 1:1 as a future automation, a plan not a decree | knip; `rg one-on-one src tests` → only research.json prose | none in code; the record of those sessions is lost from the repo |
| src/lib/cloud-data-policy.ts (6): a constant naming Supabase as the store | DEAD | none | knip | none; it names `browserLocalStorageAllowed: false` while the Chute ledger uses localStorage (chute.tsx:78-138) |

Total: 8 files, 1,035 lines, plus about 80 lines of orphaned actions.

### A2. Exported symbols nothing references anywhere

Zero references in src, tests, prisma or scripts beyond the definition, checked by knip and by `rg -w` per name. Line spans include the leading comment block.

| Item (file:line) | Lines | Classification | Decree if dormant | What removing it touches |
|---|---|---|---|---|
| src/app/today-client.tsx:201 CopyLine; :158 LocalClock | 41 | DEAD | none | none; the file's other exports are live (ChiClock, EditableMessage, LocalTime) |
| src/app/today/sheet-actions.ts:230 promoteSheetTodo | 22 | DEAD | none | none |
| src/app/today/actions.ts:994 deleteLedgerNote | 22 | DEAD | none | none |
| src/app/accounts/act-actions.ts:78 discardActDraft | 14 | DEAD | none | none |
| src/app/dashboard/actions.ts:221 moveCard | ~30 | DEAD | none | the comment at :353 that names it |
| src/app/auth/actions.ts:41 signOut, with the wayfinder's onSignOut prop (app-wayfinder.tsx:8, :22, :125) that no page passes | 4 + 3 | DEAD | none | the app has no sign-out door; keep the action if one is wanted, delete the prop otherwise |
| src/lib/intranet/store.ts:219 docBody; :168 claimsInTopic; :28 storeAvailable | 31 | DEAD | none | none |
| src/lib/groundwork/wire-keywords.ts:78 registrySummary | 13 | DEAD | none | none |
| src/lib/intranet/decompose.ts:150 unsplitPlan | 10 | DEAD | none | none |
| src/lib/groundwork/file.ts:237 workedStamp | 9 | DEAD | none | none |
| src/lib/intranet/segment.ts:115 mergeProbe; :181 daysBetweenIso; src/lib/intranet/doctrine.ts:26 MODEL_SEGMENT | 16 | DEAD | none; segment.ts:10-12 says the server action merges segments, and the action passes an empty merge list (src/app/intranet/actions.ts:174) | the stale comment at segment.ts:10-12 and the roster comment at doctrine.ts:15-19 |
| src/lib/intranet/playbook-in.ts:119 PROSPECT_ROOT; :128 PROSPECT_SHAPE_TOPICS; :167 isDemoOrigin | 20 | DEAD | none | none |
| src/lib/intranet/index-topics.ts:133 stalePending | 8 | DEAD | none | none |
| src/lib/intel/branches.ts:74 branchNext | 7 | DORMANT WITHOUT A DECREE: the module is the Call Sheet's branch map (header :1); CLAUDE.md:511-513 keeps "the bank" of questions, not the branches | see C and F: tests/playbook-program.test.ts:211 (hand) is its only importer | the hand-run suite |
| src/lib/intranet/bridges.ts:79 askKey | 6 | DEAD | none | none |
| src/lib/intel/bank.ts:29 SOPH_LABEL | 6 | DEAD | CLAUDE.md:511-513 keeps the bank as a library; this label is not the bank | none |
| src/lib/dashboard/outcome.ts:30 OUTCOME_SF_STAGE | 6 | DEAD | none | none |
| src/components/ui/field.tsx:33 Textarea | 6 | DEAD | none | none |
| src/lib/intranet/time.ts:169 verdictDismissKey | 5 | DEAD | none | none |
| src/lib/command-center/types.ts:58 isGated; :86 intentLabel; :95 priorityTier | 9 | DEAD; isGated is also retired by the direct doctrine (CLAUDE.md:237 "The CSM gate is down") and its comment at :56-57 names a consumer that does not exist | — | the stale comment |
| src/lib/sidekick-v3/index.ts:63 getV3Screen; :70 v3Modules; src/lib/payroll-demo-sidekick/index.ts:63 getPayrollDemoStep; :67 questionsForStep | 13 | DEAD | none | none |
| src/lib/pipeline/docx.ts:368 DOC_ACCENT_UNUSED | 4 | DEAD, and named so | none | none |
| src/lib/look-into/live.ts:109 liveHighCount | 4 | DEAD | none | none |
| src/lib/intranet/mirror.ts:298 goneStamp | 4 | DEAD | none | none |
| src/lib/auth.ts:98 hasAccessCookieValue | 3 | DEAD | none | none |
| src/lib/collateral/canon.ts:181 CANON_SOURCE | 2 | DEAD | none | none |
| src/lib/intel/meeting.ts:9 MEETING_SOURCE | 1 | DEAD; the file's own header (:1-2) calls it "the app's ONE spelling", and isMeetingNote inlines the literals at :34-35 | — | the stale header; pass 2 D flagged it |

Total: 38 symbols, 286 lines.

### A3. Exports kept alive only by tests

Dead in the app; a test imports each. Where the test is in the chain, the chain is pinning code the app never runs.

| Item (file:line) | Lines | Pinned by | Classification | What removing it touches |
|---|---|---|---|---|
| src/lib/dashboard/stages.ts:132 sfStageForStates | 11 | tests/today.test.ts (chain) | DEAD in src; pass 2 listed it as a live derivation, corrected above | the test |
| src/lib/today/build.ts:826 aleksLineGuidance; :243 partnerAngle; :492 isWeekKickoff | 48 | today.test.ts (chain) | DEAD in src | the test |
| src/lib/today/follow-ups.ts:85 daysUntilIso | 5 | today.test.ts (chain) | DEAD in src | the test |
| src/app/room/actions.ts:1080 roomReopen | 28 | tests/read-absorption.test.ts (chain), by name only | DEAD in src | the test |
| src/lib/intel/ai-clean.ts:333 looksLikeNotes, with SHAPED_HEAD, SF_CHROME, NOTE_SCENT (:327-331) and the voided modelFor (:348-351) | ~30 | read-absorption.test.ts:72-93 (chain), which pins modelFor returning the same model for both shapes | DEAD routing (pass 1 §5) | the two tests and the routing comment at :321-326 |
| src/lib/intel/bank.ts:65 NO_FILTERS; :149 facetCounts; :176 emptyBecause | 36 | read-absorption.test.ts (chain), tests/playbook-program.test.ts (hand) | DORMANT BY DECREE: CLAUDE.md:511-513 keeps the bank as a library that "still feeds the battlecard harvest, the ask room's citations and the intranet"; these three are the retired Call Sheet's filter helpers, not the bank's questions [inferred] | the tests |
| src/lib/room/deliverables.ts:43 hasFallback; :49 fallbackMove | 9 | read-absorption.test.ts (chain) | DEAD in src | the test |
| src/lib/dashboard/outcome.ts:78 stripOutcome | 5 | read-absorption.test.ts (chain) | DEAD in src | the test |
| src/lib/intel/motions.ts:100 motionsFor (the module's only entry; nothing in src imports motions.ts) | 17 | tests/intel.test.ts:18 (chain) | DORMANT WITHOUT A DECREE | the test; the module |
| src/lib/groundwork/day.ts:171 currentBand; src/lib/groundwork/institutions.ts:20 instNoteBody | 11 | tests/groundwork.test.ts (chain) | currentBand DEAD in src; instNoteBody DORMANT BY DECREE (CLAUDE.md:258 keeps "the institutions"; institutions.ts:3-4 says the write actions "grow with use") | the test |
| src/lib/format.ts:56 formatContributingSignal | 13 | tests/format.test.ts (chain) | DEAD in src | the test |
| src/lib/activity/classify.ts:155 actorKindOf | 15 | tests/activity-classify.test.ts (hand) | DEAD in src | the test |
| src/lib/pipeline/plain.ts:100 arrivalWords | 15 | tests/pipeline-build.test.ts (hand); pins the click-depth arrival budget (CLAUDE.md:400-402) on the pipeline report | DORMANT WITHOUT A DECREE: a test-only measure of a decree | the test |
| src/lib/pipeline/report.ts:193 nextStepFrom; :223 waitingOn | 30 | tests/pipeline-report.test.ts:84-128 (hand) | DEAD in src (build.ts:459 calls isOtherTeamWork directly) | the test |
| src/lib/today/ledger.ts:33 nextRoundupDueIso | 6 | tests/ledger.test.ts:53-63 (hand) | DEAD in src | the test |
| src/lib/intranet/index-topics.ts:79 mergeCandidates; :101 proposeTopic; :127 readyToPromote; :144 resolveTopic; src/lib/intranet/time.ts:90 readTime; src/lib/intranet/doctrine.ts:51 NOTHING_DELETED; src/lib/intranet/evals.ts:144 scoreCase; :190 summarise; src/lib/intranet/playbook-in.ts:173 isPlaybookNamespace; src/lib/intranet/verdicts.ts:200 summaryStale; src/lib/intranet/synthesize.ts:69 readConfidence; src/lib/intranet/mirror.ts:304 goneLine; src/lib/intranet/ledger.ts:124 groupByDay | 127 | tests/intranet.test.ts (hand) | DEAD in src | the suite (2,236 lines, 193 tests) |

Total: 35 exports, about 401 lines; 15 of them pinned by chain suites.

### A4. Exports kept alive only by the seed script

| Item | Classification | How checked | What removing it touches |
|---|---|---|---|
| src/lib/hml.ts (651 lines): the ten `classify*` exports (:221-606) and their enums; src/lib/hml-rules-config.ts (13); src/lib/prospect-scoring.ts (imported only by hml.ts) | DEAD in the app; kept by prisma/seed.ts:46 and tests/hml.test.ts (chain, 204 lines) | `rg "lib/hml\b" src prisma tests` → seed.ts and the test only | The fifteen dead models' enums are what these files import; they go together (B, NEEDS THE DB) |

### A5. Superfluous export keywords

Eighty symbols are exported and used only inside their own file. They are not dead code; the `export` is. Listed by file so a refactor knows which are private today: src/app/dashboard/actions.ts moveCard is in A2; src/app/intake/payroll-form.tsx FORM_URL; src/app/room/actions.ts roomLog; src/components/brand.tsx ProductMark; src/components/presence/engine.tsx ensureStarted, resetDesk, usePresence; src/components/sf.tsx SfLink; src/lib/activity/classify.ts INTENT_RE, RECEIPT_RE; src/lib/activity/distill.ts MODEL_DISTILL_RICH, MODEL_DISTILL_LIGHT, MODEL_REFUTE; src/lib/activity/parse.ts ANCHOR_HEADERS, FINGERPRINT_MIN_MATCHES, LOAD_BEARING, sha256Hex; src/lib/activity/read.ts INTENT_WARM_THRESHOLD, INTENT_HALF_LIFE_DAYS, ENI_MIN_CASES, ENI_FRESH_DAYS; src/lib/activity/run.ts actedSweep; src/lib/activity/stores.ts ROLLUP_CAP, GEMS_CAP, SUPPORT_CAP, INTENT_CAP, NO_ONE; src/lib/auth.ts hasAccessSession; src/lib/collateral/canon.ts PRODUCT_CANON, CANADA_DELIVERY_NOTE, PAYROLL_PRICING_PROCESS, CANON_FACTS; src/lib/github/archive.ts ASSET_CAP_BYTES; src/lib/groundwork/day.ts BUMP_QUIET_DAYS, REVIVAL_QUIET_DAYS, RESEARCH_STALE_DAYS, MOTION_INBOUND_DAYS, MOTION_MEETING_DAYS, WIRE_FRESH_DAYS, RULE_SLOT_CAP; src/lib/groundwork/signals.ts DECAY_DAYS, newestReadIso; src/lib/groundwork/wire.ts WIRE_STALE_HOURS, newestWireIso; src/lib/intel/bank.ts productOf, sophOf; src/lib/intel/deep-research.ts EMPTY_FINDING; src/lib/intel/meeting.ts MEETING_RE; src/lib/intel/provenance.ts cleanNameToken; src/lib/intranet/doctrine.ts CONFIDENCES, ASK_SHAPES, ORIGINS; src/lib/intranet/mirror.ts stripHead; src/lib/intranet/normalize.ts detectOrigin, stripScaffolding; src/lib/intranet/retrieve.ts EMPTY_PLAN, planAvailable; src/lib/intranet/segment.ts renderSegment; src/lib/intranet/synthesize.ts renderCandidates, WORLD_SYSTEM; src/lib/intranet/verdicts.ts quotesBoth; src/lib/paste.ts htmlToPlainText; src/lib/pipeline/build.ts BOOK_CLOSE_DATE; src/lib/room/deliverables.ts FALLBACK_GLYPH, PROVENANCE_GLYPH; src/lib/room/gaps.ts GAP_NS, GAP_SHOW_CAP, gapBody; src/lib/room/loss.ts OUTCOME_MARK_LOST, OUTCOME_MARK_WON; src/lib/salesforce.ts isRealSfContactId; src/lib/sendbook/read.ts RUN_RESET_DAYS, chicagoWeekStart; src/lib/sidekick-v3/index.ts v3Screens, v3Flows; src/lib/today/build.ts HCM_CLIENT_IDS, STRONG_DEMAND, ROUNDUP_PINS, ROUNDUP_BULLETS; src/lib/today/overlay.ts isLoadedDispositionStatus; src/lib/today/route-notes.ts MAX_ACCOUNT_ROUTES. The queue and Sendbook constants (RULE_SLOT_CAP, MOTION_INBOUND_DAYS, MOTION_MEETING_DAYS, RUN_RESET_DAYS, RESEARCH_STALE_DAYS) should stay exported: pass 3 noted no test asserts them by name, and the test pass will.

### A6. Unused type exports

148 exported types and interfaces that no other file imports (knip, both runs), about 949 lines of definitions, in 68 files. Local use inside their own file was not checked, so they are superfluous exports, not certainly dead definitions. The heaviest files: src/lib/intranet/extract.ts (Statement, Filing, LiberalRead, ReadInput), src/lib/pipeline/report.ts (Provenance, Field, OpenItem, TheirTurn, TurnNote), src/lib/today/build.ts (Commitment, StepHold, PartnerKickoff, Narrative, StateOfPlay), src/lib/groundwork/readout.ts (five), src/lib/paste-files.ts (five), src/lib/room/touch.ts (TouchSource, NoteForTouch, TouchRead), src/lib/sendbook/read.ts (five). The full list by file and line is in docs/architecture/dead-code-appendix.md, with the full dead-class lists behind E.

### A7. Dependencies knip flags

`@prisma/client` (needed: the generated client imports `@prisma/client/runtime/client`, src/generated/prisma/client.ts:18), `pg` and `@types/pg` (needed: peer of `@prisma/adapter-pg`, src/lib/db.ts:1 [inferred]), `tailwindcss` (needed: src/app/globals.css:1 `@import "tailwindcss"` through @tailwindcss/postcss). No dependency is dead.

## B. Dead data

"No code reads it" is not "the table is empty." Every model row below needs a production count before a drop; this pass cannot take one.

| Item | Classification | Decree if dormant | How checked | What removing it touches |
|---|---|---|---|---|
| TerritoryAccount (prisma/schema.prisma:268), SourceEvidence (:311), Note (:331), PermissionHistory (:357), InternalUnknown (:371), CSMPartner (:406), PEO (:444), PEOClient (:482), Opportunity (:507), FollowUpPromise (:551), BoundaryRule (:584), DiscoveryFramework (:626), PitchAsset (:652), DailyServe (:676), HmlClassification (:722) | NEEDS THE DB. Zero delegate calls in src; prisma/seed.ts writes all fifteen (`db:seed`, hand-run, package.json:19); no `include:` loads them; no type import outside the dead HML chain | none | delegate grep across src, prisma, scripts, tests; relation scan of the schema | A drop migration in FK order (HmlClassification → InternalUnknown → DailyServe → Note → SourceEvidence → PermissionHistory → FollowUpPromise → BoundaryRule → Opportunity → PEOClient → PEO → CSMPartner → DiscoveryFramework → PitchAsset → TerritoryAccount, or CASCADE); User's four back-relation fields (:262-265); twelve enums nothing else uses (CanonStatus, NoteSensitivity, TerritoryAccountStatus, ProductRelevance, EvidenceType, NoteType, CsmPartnerStatus, OpportunitySourceType, ApprovalStatus, PitchAudience, PitchAssetType, BoundaryScopeType) plus the HML enums; src/lib/hml.ts, hml-rules-config.ts, prospect-scoring.ts, hml-priority.ts, the panel, tests/hml.test.ts (in the chain), and a rewrite of prisma/seed.ts (2,087 lines) |
| PeoActivity (:902) | NEEDS THE DB; write-only: two `create` calls (src/app/book/actions.ts:74, :110), no read, no include | DORMANT WITHOUT A DECREE | delegate grep | the two writes; FK to PeoState |
| StashItem (:1075) | NEEDS THE DB; zero calls anywhere, and no migration in prisma/migrations ever created it (19 migrations, none names it), so the table may not exist | The decree says it is gone: CLAUDE.md:293 "The stash floater is retired — component, actions, and lib deleted" | delegate grep; `rg -i stash prisma/migrations` → 0 | `SELECT to_regclass('"StashItem"')` first; then the model line and the `from Stash` label at src/app/partners/page.tsx:76, :87 |
| `inst:<slug>` AccountNote namespace | read-never-written: parsed at src/app/groundwork/page.tsx:167-169; the only body builder, instNoteBody (src/lib/groundwork/institutions.ts:20), has no caller | DORMANT BY DECREE: CLAUDE.md:258 keeps "the institutions" in the lower deck; institutions.ts:3-4 says phase one reads and the writes grow with use | `rg "inst:" src tests prisma docs` | the read and the empty ladder |
| `risk:<acct>` AccountNote namespace | read-never-written: src/app/accounts/page.tsx:97-98 reads the newest body's head as a Salesforce risk level; no writer in the repo | DORMANT WITHOUT A DECREE; the comment at :92-94 describes an importer that does not exist | repo-wide grep | the read; NEEDS THE DB for a nonzero count (`WHERE "accountId" LIKE 'risk:%'`), which would prove an out-of-repo writer |
| `scenario:<acct>` AccountDisposition family | read-never-written: src/app/room/actions.ts:1246-1250 findUnique; no writer | DORMANT BY A CODE COMMENT, not the canon: src/app/playbook/actions.ts:3-5 "The binding feature is retired (founder-decreed 2026-08-22)… Old scenario:<id> rows stay readable" | grep | the read, after `SELECT count(*) FROM "AccountDisposition" WHERE "accountId" LIKE 'scenario:%'` |
| Touch.subjectKey `acct:<acct>` | read-never-written: compat arms at src/app/page.tsx:102, src/app/today/page.tsx:661, src/app/intake/actions.ts:81; no writer mints it (today/page.tsx:990 builds a TaskDone id, not a subjectKey); pass 1 flagged the read | DORMANT WITHOUT A DECREE | grep | three `\|\|` arms; NEEDS THE DB (`WHERE "subjectKey" LIKE 'acct:%'`) |
| Touch.subjectKey `kickoff:<week>:<partner>` | comment-only: prisma/schema.prisma:1035 and :973 describe it; no writer, no reader | DEAD | grep | two schema comments; NEEDS THE DB for stale rows |
| Todo tag `dl:` | parse-only: the codec reads it (src/lib/today/route-notes.ts:85-124); every writer clears it to "" (src/app/room/actions.ts:1527; src/app/today/actions.ts:179, :195, :1134); no `.delay` reader; the reason moved to `row-delay:` dispositions | DEAD codec key | grep `delay:` | the codec; old bodies may carry a `dl:` tail, harmless |
| `pastehash:` and `presence:` disposition families | LIVE, but both write a status outside LOADED_DISPOSITION_STATUSES (src/lib/today/overlay.ts:225-229): "filed" (room/actions.ts:123-126) and "presence" (src/app/presence/actions.ts:41-43). They survive only because their readers are findUnique | — | writer and loader read | nothing to remove; a refactor of loadDispositions must keep them out of the map or keep the narrow reads |
| LookIntoStatus.note column | never written (src/app/look-into/actions.ts:31-34 writes `resolved` only); read at src/lib/look-into/status.ts:18 | DORMANT WITHOUT A DECREE | grep | one column; legacy curated ids (`NOT LIKE 'li-live:%'`) NEEDS THE DB |
| SignalSnooze.snoozedUntil | written, only formatted (src/app/today/page.tsx:2525); no reader compares it to now, so the schema's "resurfaces when snoozedUntil passes" (:981-982) has no implementation [inferred] | DORMANT WITHOUT A DECREE | grep | the schema comment or a reader |
| TaskDone `morning:<day>:<moveKey>` keys | LIVE, never pruned: per-day keys accumulate | — | writers src/app/today/actions.ts:320-322, src/lib/dashboard/complete.ts:56-57 | NEEDS THE DB for growth (`count(*), min("doneAt") WHERE key LIKE 'morning:%'`) |
| PeoState `@@index([nextActionDate])` (:899) | backs no query (no `where: { nextActionDate` in src) [inferred] | DORMANT WITHOUT A DECREE | grep | one index |
| Seed fields nothing reads: book.json `count`; contacts.json `owner`; research.json `verified` (on all 132 records, absent from DemandRecord at src/lib/book/research.ts:4-11) | DEAD fields | none | per-field grep | the JSON only |

## C. Dead surfaces

Every page except five (login, book, look-into, sidekick/flows/prismhr-global, payroll-demo-sidekick) is force-dynamic, so `revalidatePath` purges nothing anywhere; it only marks the client router cache, which dynamic pages already treat as stale [inferred from Next's contract, not exercised].

| Item (file:line) | Classification | Decree if dormant | How checked; what it still does | What removing it touches; who would notice |
|---|---|---|---|---|
| /today (src/app/today/page.tsx, 2,640 lines): archived row (app-wayfinder.tsx:97); linked from /partners, /archive, the /look-into redirect, and `done()` in today/actions.ts:54 whenever a form omits returnTo | DORMANT WITHOUT A DECREE | none; "All four stay reachable and stay quiet" is a code comment (app-wayfinder.tsx:86-92); tests/read-absorption.test.ts:557-562, :741-744 pin the file | Per request: 15 DB round trips including two `user.upsert` writes (loadDashboard and loadFieldNotes each call getAppAccess), then the whole derivation head: corpusFor and extractDealIntel per card (:647-679), buildMorningBrief (:681), weeklyBrief (:691-723), liveLookInto (:727), askNextForAccount per focus account (:737-747), narrative, roundups, the ledger (:1076-1094), relationshipFor for all 151 accounts (:1310-1334). Revalidated by room/actions.ts:68 on every filing and by 17 other sites | The HomeRoom imports 14 of its actions (room-client.tsx:19-34: addFollowUp, archiveThread, delayFollowUp, dismissTriage, followUpAddBoard, followUpDone, followUpDrop, followUpWaveOff, logTouch, markReplied, markResponded, muteRoundupPartner, snoozeSignal, unmuteRoundupPartner); Accounts imports clearDisposition (:34); room/actions.ts:781 imports routeSheetNote from today/sheet-actions; today/actions.ts:21 imports roomCompose back, a cycle. Retiring the page means moving the actions first. Nobody notices the page itself [inferred] |
| / the Board (src/app/page.tsx; dashboard-client.tsx, 810 lines): archived row (:104), and the brand mark on every page links here (:28), as does the Groundwork link labelled "HomeRoom" (groundwork/page.tsx:681) | DORMANT WITHOUT A DECREE | none; read-absorption.test.ts:575-584 pins `/` as the first main-row href | Per request: 7 round trips (one upsert); per non-archived card corpusFor, digestFor, extractDealIntel, suggestChecks, liveContextFor, askNextFor, researchPrompt (:50-135), all computed before the unauthenticated check at :149. Revalidated by room/actions.ts:70 and six other sites | dashboard/actions.ts (dismissSuggestion, saveNote, toggleCheck, addCard, setCardStage) is imported by room-client.tsx:35, accounts-client.tsx:24, today/page.tsx:100, today/account-chip.tsx:14; loadDashboard is imported by room, groundwork, accounts, build.ts and pipeline-actions. The mark and the mislabeled nudge both land here |
| /pipeline (src/app/pipeline/page.tsx): archived row (:111) only | DORMANT WITHOUT A DECREE | none; read-absorption.test.ts:586-600 pins it | 3 round trips (loadCommand); filter and sort only. Revalidated by book/actions.ts:79, :114 | nothing imports from it; the HomeRoom has its own Pipeline tab (room/pipeline-tab.tsx) |
| /intake Capture (src/app/intake/page.tsx): archived row (:118), yet the HomeRoom ⊕ menu offers it twice (room-client.tsx:2672-2687, one item still reading "File a paste") and the Groundwork Sales Nav nudge sends the operator there (:680) | LIVE-linked, archived in nav, no decree | none | 1 round trip; the bookmarklets (capture-shelf.tsx) and the payroll form's getDealIntel on demand. Never revalidated | the bookmarklet shelf is the only door to the SalesNav grab (D) |
| /book (src/app/book/page.tsx) redirects to /accounts; /look-into (src/app/look-into/page.tsx) redirects to /today#lookinto | DEAD routes | none | no inbound link to either; book/actions.ts:78, :113 revalidates a redirect | book/actions.ts (savePeo, applyPlay) is live through accounts/actions.ts:3; look-into/actions.ts is live through today/look-into-band.tsx:11. Delete the two page files only |
| /dev/popover (src/app/dev/popover/page.tsx): unlinked dev harness, unguarded, seeded names | DEAD | none; pass 3 B44 | header :1-3 "Not linked from anywhere" | imports today/account-chip, which stays |
| src/app/notes-client.tsx | DEAD | — | A1 | — |
| signOut door (auth/actions.ts:41; wayfinder onSignOut) | DEAD | — | A2 | — |
| `/prospect-field` in src/lib/access-proxy.ts:5 | DEAD guard for a page that does not exist; the only link to it is in the dead hml-priority.ts:64 | none | route inventory | one entry in the guarded list |
| /partners, /archive, /asks: not in the wayfinder, linked from Accounts (:458), the HomeRoom record fold (room-client.tsx:2169), the pad (scratchpad.tsx:495) and Today | LIVE-linked, no decree | none | /partners: 5 round trips plus a raw sonnet fetch on the draft button; /archive: 5; /asks: 2 | /partners' actions are imported by archived Today only (today/atc-rail.tsx:14, today/partner-notes.tsx:10, the latter dead) |
| /demos, /sidekick/flows/prismhr-global, /payroll-demo-sidekick: primary-row Demos and its children | LIVE, unguarded: no getAppAccess and the middleware guards only `/` and `/prospect-field` (access-proxy.ts:5) | none | route inventory | three pages render demo flows and talk tracks to anyone with the URL; pass 3 caught only /dev/popover |
| src/app/today-client.tsx (490 lines) | LIVE: a shared client kit (ChiClock, EditableMessage, LocalTime) imported by room-client, accounts, partners, filed under an archived page's name | — | importers grep | none; naming only |

## D. Dead contracts

| Item (file:line) | Classification | Decree if dormant | How checked | What removing it touches |
|---|---|---|---|---|
| Head token TEAMS CHAT: read at src/lib/paste-files.ts:18 (sniffPaste chip label) and src/lib/intel/ai-clean.ts:328 (SHAPED_HEAD, reached only through the dead looksLikeNotes); no producer; roomPaste's sniff (actions.ts:174-182) does not know it, so it would file as SF | DEAD | none | `rg "TEAMS CHAT" src tests` | two regex alternatives |
| Head tokens SPREADSHEET (paste-files.ts:529) and DOCUMENT (src/app/room/read-file.ts:93): emitted, no consumer; both fall through to dialect SF and the SF anchor grammar | DEAD contract, live producers | none names spreadsheets or documents | grep | the head lines stay as display unless the dialect module (candidate 1) names them |
| Head token SALESNAV ACCOUNTS: emitted by the bookmarklet (src/app/intake/capture-shelf.tsx:130) whose window.open target is the Intranet, and the Intranet never reads it (src/lib/intranet/normalize.ts:37-38 knows TEAMS and OUTLOOK only; intranetCapture writes intranetCapture rows, never an AccountNote). The only consumer is roomPaste (actions.ts:180), reached by pasting at a room ⚡ box, which capture-shelf.tsx:125-128 forbids and groundwork/page.tsx:679-681 instructs | DORMANT WITHOUT A DECREE, with three operator-facing instructions that disagree (capture-shelf.tsx:125-128; groundwork/page.tsx:679-681; src/lib/groundwork/signals.ts:1-4) | none | grep salesnav; read all three | the queue rules that read `salesnav` notes (day.ts:18, :355) depend on the Groundwork instruction winning |
| Source literal `stash`: tested at src/app/partners/page.tsx:76, never written | DEAD branch; the decree retired it (CLAUDE.md:293) | — | grep | three lines |
| Source literal `meeting` in the pipeline's `/transcript\|call-ai\|meeting/` (src/lib/pipeline/build.ts:396): never written | DEAD alternative; pass 2 flagged the regex family | — | grep | one alternative; folds into R3 |
| modelFor (ai-clean.ts:348-351) voids its argument; modelForOrigin (src/lib/intranet/extract.ts:33-37) returns the same model on both branches (doctrine.ts:20-21 are both "claude-opus-5"); distill's `rich ? MODEL_DISTILL_RICH : MODEL_DISTILL_LIGHT` (src/lib/activity/distill.ts:161) likewise (:16-17) | DEAD routing ×3; the comments at ai-clean.ts:321-326 and extract.ts:30-32 keep the split "so a future decree can raise the rich side" | none in CLAUDE.md; "Opus or better, always — founder-decreed 2026-07-31" lives only in comments (ai-clean.ts:345-346; doctrine.ts:16-19; extract.ts:30) and is contradicted by claude-sonnet-5 at src/lib/groundwork/wire.ts:147, :156 and src/app/partners/actions.ts:140 | read constants | the three call sites and the comments |
| MODEL_SEGMENT (doctrine.ts:26), mergeProbe (segment.ts:115): the server action passes an empty merge list (src/app/intranet/actions.ts:174), so the model merge that segment.ts:10-12 describes never runs | DEAD + STALE COMMENT | — | read actions.ts:172-175 | A2 |
| PUBLIC_ACCESS (src/lib/public-access.ts:5 `= false`, no env read): the public branches at src/lib/auth.ts:131-133 and src/lib/access-proxy.ts:23-26 cannot fire | DORMANT WITHOUT A DECREE; the comment at :1-4 says "temporarily-public" honestly | none | grep | two branches or the switch |
| NOTHING_DELETED (doctrine.ts:51 `= true`): read by tests only | DORMANT WITHOUT A DECREE: a doctrine assertion, not a switch | — | grep | one test |
| Stale headers and comments, each describing wiring that does not exist: ai-clean.ts:1-2 "the app's single LLM touchpoint" (thirteen modules call the model, twelve through messages.create and one raw fetch at partners/actions.ts:131) and "filed from Intake" (filing runs from /room); src/lib/book/roster.ts:1-2 "one build, every door (… the Intranet …)" (the Intranet builds its own, intranet/page.tsx:122-136); src/lib/groundwork/compose.ts:96-98 "any saved lane draft outranks this composed fallback at the stage" (the stage never reads actdraft; groundwork/page.tsx:78 imports only the seat); src/lib/intel/discovery-product.ts:15-16 "/playbook?open= deep links" (retired, CLAUDE.md:510-511); src/lib/command-center/types.ts:56-57 "Today uses this" (isGated has no consumer); src/lib/notes/write.ts:1 "The one way to create an AccountNote" (bare creates at draft-actions.ts:259, run.ts:190, :208); src/app/archive/actions.ts:3-4 "the only place a real delete lives" (today/actions.ts:705-710 deleteAccountNote and five more deleteMany sites); capture-shelf.tsx:125-128 (above); segment.ts:10-12 (above); meeting.ts:1-2 with :9 (above; the pipeline carries the private copies the header bans); src/lib/pricing/quote.ts:1-2 "the one sanctioned money surface" (the country wing is a second since CLAUDE.md:519-524); paste-files.ts:502-503 "both doors … must never disagree about what the app can swallow" (they disagree on .csv: chute.tsx:356 probes, the Drop files it as text); paste-files.ts:37-40 "a re-copy of the same thread" dedupes (the bookmarklets stamp a fresh date into the head, capture-shelf.tsx:33, :98, :130); doctrine.ts:15-19 the model roster (one slot unread, two identical) | STALE COMMENT ×14 | — | each claim verified by grep or import trace | the comments |
| Doc references from code that resolve to nothing: "SECOND-RECORD-PLAN §3" and its subsections at CLAUDE.md:412-413 and 27 code sites (run.ts:7-1019, rollup.ts, distill.ts, upload.ts, ingest.ts, harness.ts, read.ts, stores.ts, types.ts, runners.ts:261, doctrine.ts:94, mirror.ts:316, ask/links.ts:55); "Appendix A" (stores.ts:4); "the build spec (§2.2)" (src/lib/intel/evidence.ts:2; groundwork-build-spec.md has no 2.2) | STALE REFERENCE; the plan is not in the repo (pass 3 noted it) | CLAUDE.md:412 cites the plan | grep docs/ | either the plan is added under docs/ or the section numbers become prose |
| .env.example: names NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, which nothing reads; omits six vars src reads (ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID, GITHUB_ARCHIVE_REPO, GITHUB_ARCHIVE_TOKEN, NEXT_PUBLIC_SF_BASE_URL, APP_ACCESS_*) | STALE FILE | — | grep process.env | the example file |
| Two canon lines the code contradicts, reported not resolved: CLAUDE.md:510-511 "The three panes, their stylesheet and the `?open=` deep link are gone" while src/app/playbook/playbook.module.css keeps 33 Call Sheet classes (E); CLAUDE.md:293 "component, actions, and lib deleted" while the StashItem model (B) and the "from Stash" label (partners/page.tsx:87) remain | — | the decrees themselves | E and B | — |

## E. Dead styles

Computed by reference, not by reading: every `.class` selector in the module against every `styles.x`, `styles["x"]` and template access in its importers; the fourteen `styles[expr]` accesses were resolved from their value maps (KIND_CLS, DECK_KIND_CLS, TONE_DOT, TONE_ROW, GLYPHS, VERDICT_CLASS, NodeState, tier, rung) before counting. Line counts are the rules whose every selector class is dead.

| Module | Classes / dead | Lines in dead-only rules | Classification | How checked; what removing it touches |
|---|---|---|---|---|
| src/app/command-center.module.css (40 importers) | 1,042 / 232 | ~2,142 | DEAD: retired Today and Board faces (aleks*, kickoff*, mv*, fu*, sop*, rollup*, look*, cad*, it*, todo*, tag*, deck* siblings, the tabBar family, focusMini, triage…) | tests/followups.test.ts:321 and tests/intranet.test.ts:858, :2034 read this file for specific live rules; `itDockNote` and `itKicker` appear in the hand-run intranet suite, verify before deleting those two |
| src/app/playbook/playbook.module.css (2 importers) | 48 / 33 | ~262 | DEAD, and the decree says so: CLAUDE.md:510-511 "their stylesheet … gone" (scen*, bind*, chip*, facet*, filters, grid, card*, follow, listen, q, relay, tag*, why, inline, count*) | tests/read-absorption.test.ts:622 asserts used → defined only, so deletion is safe |
| src/app/room/room.module.css (5 importers) | 294 / 30 | ~248 | DEAD; keybar and court retired by CLAUDE.md:343-344 (court, keybar, c_none, c_quiet, c_them, c_you, askBox, askFoot, askMore, closedct, ctl, donenow, gSend, gateDone, meta, mode, modeOn, outst, peerRule*, pipeGate, pipeSrc*, rsrch*, urgOn, urgc, when) | tests/room-parity.test.ts:140-158 (chain) enumerates `c_you/c_them/c_quiet/c_none` as used and asserts they exist, so those four cannot go until that enumeration is edited; second-record-faces:929 and pipeline-density:165 pin live rules only |
| src/app/groundwork/groundwork.module.css (6 importers) | 130 / 27 | ~182 | DEAD: pre-winged-stage faces (band*, gauge*, instr*, lay, queue*, row*, carry, file*, intent) | none |
| src/app/dashboard.module.css (1 importer) | 100 / 12 | ~114 | DEAD (action*, active/done/todo *Text, bullet, cardAcctLink, checklist, drillState, nameBtn, saveBtn, saveRow); the module itself rides the archived Board | none |
| src/components/sf.module.css (1 importer) | 10 / 5 | ~39 | DEAD (chk, chkStrong, icon, lead, text) | none |
| src/components/account-notes.module.css (1 importer) | 20 / 2 | ~14 | DEAD (head, tag) | none |
| The other twelve modules (dock, asks, demos, payroll-demo, product-sheet, sendbook, sidekick ×3, ask-next, presence, scratchpad) | 674 / 0 | 0 | clean after dynamic resolution (product-sheet's rung and verdict classes and sidekick's tiers are reached through `styles[expr]`) | — |

Total: 2,015 classes, 341 dead, about 3,001 lines of dead-only rules.

## F. Dead tests

Sixty-nine suites exist; the chain runs 41; 28 sit outside. All 28 were run. None fails, so none is stale; none is dominantly redundant or text-only. Twenty-seven pin a module or a decree no chain suite covers and should be in the chain; one is red by design.

| Suite (lines) | Run | Classification | Evidence | How checked |
|---|---|---|---|---|
| relationship (76) | 6/6 | SHOULD BE IN THE CHAIN | the Ted doctrine's own test (CLAUDE.md:359-375): `r.source === "record"` over a book seeding Ted | `rg relationshipFor` in chain → none |
| sendbook (175) | 11/11 | SHOULD BE IN THE CHAIN | 45-day reset, account-speaking reset, NEVER MET after ten sends, tap folds into the same-day send (CLAUDE.md:310-333) | chain covers only the org-side flip (second-record-faces:569-597) |
| act-lane (129) | 7/7 | SHOULD BE IN THE CHAIN | `seat.weight === 95`, `SEAT_SLOT_CAP === 3` (CLAUDE.md:466-468) | none in chain |
| board-lift (30) | 2/2 | SHOULD BE IN THE CHAIN | boardLift (CLAUDE.md:477-479) | none |
| scratch (36) | 6/6 | SHOULD BE IN THE CHAIN | Chicago day labels (CLAUDE.md:295-296) | none |
| room-sheet (251) | 13/13 | SHOULD BE IN THE CHAIN; one cap test overlaps move-line | delayed/HELD, doneToday, hide:todo, money never leaks | chain uses buildAccountSheet for settle and wall only |
| pipeline-report (407) | 42/42 | SHOULD BE IN THE CHAIN; 7 tests pin the orphans nextStepFrom and waitingOn | closer rule on answeredSince (:385-393), machinery never answers | none |
| activity-classify (218) | 12/12 | SHOULD BE IN THE CHAIN | the 60-row golden set; "machinery is never a person" (CLAUDE.md:407) | chain asserts `.lane` once incidentally |
| activity-gems (372) | 17/17 | SHOULD BE IN THE CHAIN; lint tests partly overlap activity-harness | store grammars, SECOND_RECORD_SPANS, the namespace-collision guard, lintAct's "steps" ban (CLAUDE.md:532) | none call lintAct or the parse/render pairs |
| pipeline-build (618) | 48/48 | SHOULD BE IN THE CHAIN | the whole report build; money doctrine and the arrival budget | none |
| route-notes (239) | 26/26 | SHOULD BE IN THE CHAIN | the spray regression, tag and marker grammars | chain uses withTags as a fixture only |
| intranet (2,236) | 193/193 | SHOULD BE IN THE CHAIN; 30 of 193 are text-pins on src/app/intranet and the wayfinder; 13 of its imports are test-only exports (A3) | fifteen intranet modules | second-record-faces imports one other mirror function |
| playbook-program (227) | 15/15 | SHOULD BE IN THE CHAIN; partly redundant with intel and read-absorption; pins the orphaned bank.ts and branches.ts | retired ids never return; spliced ids exist | — |
| pipeline-density (182) | 11/11 | SHOULD BE IN THE CHAIN; 4 of 11 text-pin css and label widths | joinEntries, oneLine | none |
| account-facts (135) | 12/12 | SHOULD BE IN THE CHAIN; 2 of 12 text-pin import strings | sheet-vs-brain parity | none |
| narrative (160) | 5/5 | SHOULD BE IN THE CHAIN | money redacted in the weekly brief | none |
| ask-links (106) | 9/9 | SHOULD BE IN THE CHAIN | the retired Call Sheet's no-door ruling (CLAUDE.md:514-516) | none |
| ask-next (86) | 5/5 | SHOULD BE IN THE CHAIN | money doctrine on the research prompt | none |
| room-grammar (118) | 10/10 | SHOULD BE IN THE CHAIN | parseLogInput, nextRemindIso, buildStageRail | chain pins the string only |
| pipeline-edits (94) | 8/8 | SHOULD BE IN THE CHAIN | strike survives; `PIPELINE_EDIT_NS === "pipeline:"` | none |
| ledger (75) | 11/11 | SHOULD BE IN THE CHAIN; 3 tests pin the orphan nextRoundupDueIso | withAsk, splitAsk, sortEvents | none |
| live-contacts (54) | 4/4 | SHOULD BE IN THE CHAIN | the roster clause | none |
| key-health (71), claude-workspace (54) | 7/7, 2/2 | SHOULD BE IN THE CHAIN; claude-workspace could fold into key-health | the latch | none; both mutate process.env, safe per-process |
| presence (74) | 10/10 | SHOULD BE IN THE CHAIN | the walls and the Chicago day key | none |
| price-desk (65) | 7/7 | SHOULD BE IN THE CHAIN | redactMoney on the one sanctioned surface | none |
| ask-live (41) | 4/4 | SHOULD BE IN THE CHAIN (small) | matchAccountIn | none |
| ingest-defects-deferred (43) | 0/2 | DEFERRED BY DESIGN: both red on purpose until the refactor (chute.tsx:238 mismatch without text; room-client.tsx:594 one file per drop) | — | documented in chute-ingest-defects.md |

Chain suites that pin code the app never runs (A3): read-absorption (roomReopen by name, hasFallback, fallbackMove, NO_FILTERS, facetCounts, emptyBecause, looksLikeNotes, stripOutcome, modelFor), today (partnerAngle, isWeekKickoff, aleksLineGuidance, sfStageForStates, daysUntilIso), intel (motionsFor), groundwork (currentBand, instNoteBody), format (formatContributingSignal), hml (the whole of src/lib/hml.ts). Promoting all 27 costs about 10.5 seconds serial, dominated by tsx boot; intranet and pipeline-build are the only heavy ones.

## G. Work with no reader

Anchors: the Sendbook decree implies daily outbound work (CLAUDE.md:309-332); the second record is a weekly drop (:404-406); the room is opened many times a day; Groundwork runs a daily window. Book size 151 accounts. Page loads per week [inferred]: /room ~50, /groundwork ~25, /accounts ~15, /sendbook ~5, /intranet ~5, the archived pages ~0-3; about 105 in all. Chute filings ~20 a week [inferred]. Ranked by cost times frequency.

| # | What runs (file:line) | What it costs | How often | Who reads the output |
|---|---|---|---|---|
| 1 | getAppAccess() does `prisma.user.upsert` on every call with no per-request memo (src/lib/auth.ts:130-175, upsert :157-175; no `cache()` in src). Per page load: the page plus loadCommand/loadDashboard plus three layout-mounted calls (layout.tsx:42-43: scratchList → padAccess, GET /scratch/feed → padAccess, GET /presence/beat → accessLevel). Every server action adds one (requireWrite). Polling: the presence flush every 60 s (src/components/presence/engine.tsx:148), the intranet pulse every 2 s during a run (intranet-client.tsx:197), and every /room tab focus (chute.tsx:186 → activityReceipt) | one DB write and a cookie parse per call | 4-6 per page load (~500/wk) + ~2,400/wk presence flushes [inferred: 8 hours × 5 days] + ~30/min during intranet runs | the first call's result in the same request; calls two to six re-upsert the same row |
| 2 | /room builds the pipeline report a second time per request, then the drawer throws it away: page.tsx:799-820 → collectPipelineAccounts re-runs readOutcome, cardNextStep, the hide filter and readGaps the page already ran (:241, :232, :159, :487), then buildPipelineReport re-runs corpusFor + extractDealIntel per active card (src/lib/pipeline/build.ts:360-369; the page did it at :163-176) and peopleFor a third time; on drawer open, freshPipeline() (room/pipeline-tab.tsx:514-535 → pipeline-actions.ts:50-83) reloads five stores and rebuilds all of it | a full corpus pass over every active card, twice per load, then a third with five fresh loads | ~50/wk + every drawer open | the served rows reach only the edge count (room-client.tsx:2785-2786) and a placeholder until fresh rows replace them |
| 3 | The model's structured read is discarded and regex-mined back on every request: aiCleanTimeline's result object is never stored (ai-clean.ts:392-393; actions.ts:274), `read.signals` is dropped, and corpusFor per note runs inferActors, isAddressedToUs, isMachinery, isCloser and effectiveAt (extract.ts:140-175) then extractDealIntel (:256-432) at seven sites: room/page.tsx:163-176, app/page.tsx:94-107, today/page.tsx:653-673, groundwork/page.tsx:226-251 (all 151 accounts), build.ts:360-369, actions.ts:1265-1281, intake/actions.ts:77 | CPU over every note of every account, no shared result | every page load × accounts × notes | rendered, but re-derived identically at seven sites (pass 2 E) |
| 4 | Groundwork per load: buildSendbook over all accounts without orgSignals (groundwork/page.tsx:208-212) while /sendbook builds the same register with them (sendbook/page.tsx:96-105); dealIntelFor ×151 (:226-251); liveMotionIds over the unfiltered map (:325); recordSends per seat (:351); buildQueue (:357-375) | full corpus plus the queue brain, ~10 round trips | ~25/wk; the Sendbook rebuild ~5/wk | all consumed; the two Sendbook builds are one register computed twice, and disagreeing (pass 3 B7) |
| 5 | A Chute filing routes the same text five times: chute.tsx:366 routeCapture in the browser; the early judgeFiling (actions.ts:242-247 → misfile.ts:80 over the roster, :93 over the bound row); the late judgeFiling (:320-325 → :80, :93 again on identical inputs, only the claim rung new) | five scoring passes over 151 accounts | ~20 filings/wk → ~100 passes, 40 exact repeats | the late pair recomputes the early pair |
| 6 | A filed note is model-read twice, its fan-out three and four times: aiCleanTimeline at filing (actions.ts:274); then the intranet mirrors the note (runners.ts:146-166 → mirror.ts:78-110) and runRead reads it again on the next sweep (runners.ts:685 → src/lib/intranet/extract.ts:224-266); each opened todo (mirrorTodo, runners.ts:168-182), each playbook row (ingestPlaybook, :463-490) and each gems note, itself a distill+refute output, is mirrored and runRead as its own document. No shared cache, different output shapes | one to three extra opus-class calls per filing; up to 151 per drop for digests | ~80 runRead/wk from filings [inferred] + up to 151/wk from the drop | the claims table; the duplicate is the second model spend on content the first read structured |
| 7 | actedSweep() runs at the head of every runActivityPass (run.ts:614 → :1022-1060): findMany gems (≤400) then, per note with live gems, findMany 60 notes and recordSends. The dock and the Chute loop passes until done (dock.tsx:46-63; chute.tsx:320-335), so one drop sweeps once per pass with nothing changing between | 1 + G reads per pass | 1 drop/wk × ~5-10 passes [inferred] | pass 1's stamps; later passes re-read and re-stamp nothing |
| 8 | /accounts: nine sequential loaders (accounts/page.tsx:86-222, not Promise.all); the board read three times (:74; command-center/data.ts:44; dashboard/data.ts:138); three getAppAccess; per account relationshipFor → peopleFor then peopleFor again (:237, :410); `blended` (:414) passed and never rendered (accounts-client.tsx:249 type only) | ~12 round trips + 302 people scans | ~15/wk | rendered, except blended and the second and third board reads |
| 9 | router.refresh() after an action that already revalidated the route: act-lane.tsx:116, :147, :158 after fileActSend/forkAct/undoForkAct (act-actions.ts:36-38 revalidates /accounts already); intranet-client.tsx:342 refreshes /intranet after every catch-up pass (up to 60, :328), a full page render per pass while the pulse already narrates | one extra full /accounts derivation per Act Lane click; one /intranet render per pass | ~5-10/wk; catch-ups ~5/wk × N passes | the second render replaces the first; nothing changed |
| 10 | Every page load pre-fetches the Scratchpaper: scratchpad.tsx:96-121 fires scratchList (padAccess + accountNote.findMany) and GET /scratch/feed (padAccess + intranetAsk.findMany + taskDone.findUnique) on mount app-wide; presence mount GET (engine.tsx:104) | 5 round trips + 3 user upserts per page load | ~105/wk | before ✎ is pressed: one boolean and the desk clock |
| 11 | Chute focus reconcile: chute.tsx:184-188 calls reconcileSecondRecord on every return to the tab → activityReceipt → getAppAccess + the manifest read; with no drop it returns early; with a drop but no activity row on the day's ledger, the setItems map changes nothing | 1 write + 1 read | every /room tab focus, ~100/wk [inferred] | nobody unless a second-record receipt is on the ledger |
| 12 | Presence flush (engine.tsx:148 → presence/actions.ts:26-50): accessLevel upsert + disposition findUnique + upsert, a read-modify-write instead of an increment | 3 DB ops per minute per active tab | ~2,400/wk → ~7,200 ops | the desk meter (consumed); listed for the RMW and the upsert per flush |
| 13 | Intranet pulse (intranet-client.tsx:197 → pulse/route.ts:13 → intranetPulse: user.upsert + capture findUnique + doc count) | 3 DB ops per 2 s during any run | ~30/min during runs; a 20-minute catch-up is 600 polls | the gadget; the count and the upsert repeat unchanged between ticks |
| 14 | refresh() at room/actions.ts:65-71 revalidates /room, /accounts, /today, /groundwork and / on every filing and 20 other verbs; all five are force-dynamic, two are archived | ≈0 | every action | nobody; derivation happens on visit regardless |
| 15 | roomResearch writes twice: `research:<id>` (actions.ts:1165-1170) and a plain account note with the same body (:1174-1180) | one extra row per pass | ~2-5/wk | both read; the plain copy enters every corpusFor as a background note, so research prose is regex-mined on every page |
| 16 | Dead filter arms evaluated on every load: `acct:` Touch keys (app/page.tsx:102, today/page.tsx:661, intake/actions.ts:81), `risk:` and `inst:` (accounts/page.tsx:94-100, groundwork/page.tsx:167-168) | ≈0 | every load | nobody; always empty |
| 17 | The engine computes a court line the client never renders (engine.ts:242-272 → room/page.tsx:605 → room-client.tsx:120) | small, per card per load | ~50/wk | nobody; pinned by tests/intraday-court.test.ts (pass 3 D25) |
| 18 | `prisma generate` runs in both `typecheck` and `build` (package.json:8, :11); the verify chain generates twice and `next build` type-checks again | seconds per verify | per verify | the second generate produces the same client |

Every model call in the app has a consumer; the waste is duplication, not silence. Duplicated opus-class reads per week: roughly 100 to 250 [inferred], made of runRead over note documents the filing read already structured (~20-80), runRead over todo and playbook documents that carry the same read's fan-out (~40), runRead over gems digests that distill and refute already produced (tens, up to 151 per drop), the transcribePdf-then-aiCleanTimeline pair on every PDF (~2), and a forced re-read whenever the late guard refused and the operator picked (a few).

## SAFE NOW

Removals with no decree keeping them, no reader, and no migration. Ranked by lines removed.

1. Dead-only CSS rules in command-center.module.css, ~2,142 lines / 232 classes (verify `itDockNote` and `itKicker` against the hand-run intranet suite first).
2. Dead-only rules in playbook.module.css, ~262 lines / 33 classes; the decree at CLAUDE.md:510-511 already says they are gone.
3. Dead-only rules in room.module.css, ~230 lines / 26 classes, leaving `c_you/c_them/c_quiet/c_none` until tests/room-parity.test.ts:146-149 stops enumerating them (the court line is retired by CLAUDE.md:343, so that edit is a test fix, not a behavior change).
4. Dead-only rules in groundwork.module.css (~182 lines / 27), dashboard.module.css (~114 / 12), sf.module.css (~39 / 5), account-notes.module.css (~14 / 2).
5. src/app/notes-client.tsx (493) with createTodoNote, saveTodoNote and deleteTodoNote in today/actions.ts (~80).
6. The HML priority panel chain: hml-priority-panel.tsx, field-glyph.tsx, hml-priority.ts, ui/badge.tsx (355), plus the `/prospect-field` entry in access-proxy.ts:5; amend docs/architecture/field-glyphs.md and design-brand-audit.md:77-78, which describe the glyph component. src/lib/hml.ts itself waits on the models (NEEDS THE DB).
7. The 38 dead symbols in A2 (286 lines), including the sign-out door, moveCard, deleteLedgerNote, promoteSheetTodo, discardActDraft, the three unreachable command-center helpers, MEETING_SOURCE and the intranet orphans.
8. The 35 test-only exports in A3 (~401 lines) together with the tests that pin them: read-absorption.test.ts:72-93 (modelFor and looksLikeNotes), the today, intel, groundwork and format pins in the chain, and the hand-run ledger, pipeline-report, activity-classify, pipeline-build and intranet pins. bank.ts's three filter helpers and instNoteBody stay (dormant by decree).
9. partner-notes.tsx (91), aleks/one-on-one.ts (90), cloud-data-policy.ts (6).
10. The dead routes /book and /look-into page files (12 lines; their actions stay), /dev/popover (pass 3 B44), the `stash` branch at partners/page.tsx:76-87, the `meeting` alternative at build.ts:396, the `dl:` codec key, the `kickoff:` schema comments, the two Supabase lines in .env.example, and the 148 superfluous type exports and 80 superfluous export keywords (no lines removed, the keyword only).
11. The fourteen stale comments in D, each a one-line edit; a stale comment is a defect here.

## NEEDS A RULING

Dormant without a decree, one sentence each.

- /today, / (the Board), /pipeline and dashboard-client.tsx: retire or keep; retiring means moving fourteen actions the HomeRoom imports and breaking the today↔room action cycle first.
- /intake: archived in the nav but offered twice from the HomeRoom and once from Groundwork; a surface or an archive.
- /partners, /archive, /asks: three live-linked pages with no nav entry and no decree.
- /demos and its two child pages render demo flows with no auth gate; gate them or accept it.
- `risk:` and `inst:` reads: name the writer that was meant to exist or drop the reads; `inst:` is decreed (CLAUDE.md:258), `risk:` is not.
- `scenario:` dispositions: promote the 2026-08-22 retirement from a code comment to the canon or drop the read after the count.
- src/lib/intel/bank.ts and branches.ts: CLAUDE.md:511-513 keeps the bank; whether it keeps the branch map and the Call Sheet's filter helpers is unstated.
- src/lib/intel/motions.ts: kept by one chain test only.
- "Opus or better, always" (2026-07-31) exists only in comments and is contradicted by two sonnet call sites; canonize it or delete the comments and the three no-op model splits.
- PUBLIC_ACCESS: keep the switch or delete the branches it can never take.
- The SalesNav grab has three contradicting instructions (capture-shelf.tsx:125-128, groundwork/page.tsx:679-681, signals.ts:1-4); one door.
- PeoActivity: a write-only table; read it somewhere or stop writing it.
- LookIntoStatus.note and SignalSnooze.snoozedUntil: columns whose readers were never written.
- getAppAccess's upsert per call (G1): memoize per request or make the upsert once per session; the single most repeated unit of work in the app.
- The pipeline report built twice per /room load (G2) and the Sendbook built twice across two pages (G4): candidate 2's one read is the natural home for both.
- The intranet's second model read of every filed note and its fan-out (G6): share the structured read or accept the spend.

## NEEDS THE DB

- The fifteen models: for each, `SELECT count(*), max("createdAt") FROM "<Table>"`; a nonzero count means someone ran the seed in production. Drop in the FK order in B, with src/lib/hml.ts, hml-rules-config.ts, prospect-scoring.ts, hml-priority.ts, the panel, tests/hml.test.ts and prisma/seed.ts in the same change.
- PeoActivity: `SELECT count(*), max("createdAt") FROM "PeoActivity"`.
- StashItem: `SELECT to_regclass('"StashItem"')` first; the table may never have existed.
- `SELECT count(*) FROM "AccountDisposition" WHERE "accountId" LIKE 'scenario:%'`.
- `SELECT count(*) FROM "Touch" WHERE "subjectKey" LIKE 'acct:%' OR "subjectKey" LIKE 'kickoff:%'`.
- `SELECT count(*) FROM "AccountNote" WHERE "accountId" LIKE 'risk:%' OR "accountId" LIKE 'inst:%'`; nonzero means an out-of-repo writer exists.
- `SELECT count(*) FROM "LookIntoStatus" WHERE "itemId" NOT LIKE 'li-live:%'`.
- `SELECT count(*), min("doneAt") FROM "TaskDone" WHERE key LIKE 'morning:%'` for growth, not for a drop.

## The numbers

Dead exports: 38 symbols nothing references (286 lines), 35 kept alive only by tests (~401 lines, 15 of them by chain suites), 10 kept alive only by the seed (all of src/lib/hml.ts), 80 superfluous export keywords, 148 unused type exports. Dead files: 8 (1,035 lines). Dead models: 17 needing a count (15 seed-only, PeoActivity write-only, StashItem never migrated). Dead CSS classes: 341 of 2,015 (~3,001 lines), 4 of them pinned by a chain test. Suites outside the chain: 28 (27 should be in it, 1 red by design). Model calls per week with no reader: none; duplicated opus-class reads about 100 to 250 a week [inferred].

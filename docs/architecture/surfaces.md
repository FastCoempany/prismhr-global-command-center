---
title: Surfaces Registry
status: Living; opened 2026-10-08 by pass 12
owner: Founder
related_docs:
  - CLAUDE.md
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/derived-fact-ledger.md
  - docs/architecture/pass-12-honor.md
---

# Surfaces Registry

Every page route under src/app has one row here. The row records when the surface was audited against the Ted doctrine ("New surfaces are audited against this doctrine before they ship") and what order put its face in production ("mockup work NEVER ships without an explicit ship order"). tests/canon/standing-decrees.test.ts reads this table: a page.tsx with no row, or a row with an empty audit or ship-order cell, fails the chain. A new route cannot ship until its row is written.

The Ted-doctrine audit asks one question of a surface: does every fact it derives about an account read the widest live record, with seeds only as stand-ins? The derived-fact gate (tests/canon/ted-doctrine.test.ts, "every derived fact comes from the account read or a named adapter (A2.4, whole scope)") enforces the answer in code for every surface; the audit cell records the human read.

The ship-order rule was decreed 2026-08-19. A face that first shipped before that day predates the rule and says so.

| Route | Face | Ted-doctrine audit | Ship order |
|---|---|---|---|
| / | none; redirects to /room | pass 12: redirect only, derives nothing | predates the rule (scaffold, 2026-06-16) |
| /accounts | three columns, the Act Lane | pass 8, derived-fact-ledger.md §F1 (A9, A10, A12a, A12e); pass 9 | three columns: ship order 2026-08-20; the Act Lane: ratified 2026-10-08 (#260, #391) |
| /archive | the archive list | pass 8, pass-8-rewalk.md X1 (✕-parked rows) | predates the rule (#129, 2026-07-22) |
| /asks | the asks bank | pass 12: lists the brain's own asks and answers (intranetAsk) with the account's name; derives no record fact | predates the rule (#215, 2026-08-18) |
| /demos | the demos picker | pass 12: static links to the demo tabs; reads no account data | predates the rule (#148, 2026-07-27) |
| /groundwork | the winged stage, the Klaxon, the Evidence Chips | pass 8, derived-fact-ledger.md §F1 (A1, A3, A9, A10, A12e); pass 9 | the Klaxon and the stage predate the rule (2026-08-10, 2026-08-11); the Evidence Chips: ship order 2026-08-20; the stamp words: ship order 2026-10-06 |
| /intake | the bookmarklet shelf | pass 8, derived-fact-ledger.md §F1 (A7, A11) | predates the rule (#132, 2026-07-23) |
| /intranet | the brain, the dock, the Chute | pass 8, derived-fact-ledger.md table A (mirror speaker); pass 9 | predates the rule (#172, 2026-07-30); the held box and the receipt: ship order 2026-10-06 |
| /intranet/health | the brain's meter | pass 12: evals, store counts and the model roster; no account fact | predates the rule (#172, 2026-07-30) |
| /intranet/pastes | the paste ledger | pass 12: the brain's own paste ledger by day; derives no account fact | predates the rule (#184, 2026-07-31) |
| /login | the sign-in form | pass 12: no account data | predates the rule (2026-06-17) |
| /partners | the relationship map | pass 8, derived-fact-ledger.md §F1 (A12a, partners/page.tsx) | predates the rule (2026-06-17) |
| /payroll-demo-sidekick | the payroll demo | pass 12: static demo data (src/lib/payroll-demo-sidekick); no record | predates the rule (#135, 2026-07-24) |
| /playbook | the Sheet | pass 8; pass 12: the draft queue reads the second record's rollup only | the Sheet: ship order 2026-09-15; the draft queue: ship order 2026-08-20 |
| /pricing | the EOR pricing room | pass 12: renders our price list, the third money carve-out with the price desk (founder-decreed 2026-08-21; CLAUDE.md since 2026-10-09); no account fact | predates the rule (#11, 2026-07-02) |
| /room | the HomeRoom: the Spring, the THEIRS line | pass 8, derived-fact-ledger.md §F1 (A1 to A12); pass 9 | the Spring predates the rule (2026-08-13); THEIRS: ship order 2026-08-20; their promise on the move line: ship order 2026-10-06 |
| /sendbook | the register | pass 8, derived-fact-ledger.md §F1 (A3, A12b, A12d) | the triptych winner and its ship, 2026-08-19 (#226); BOOKED: ship order 2026-10-06 |
| /sidekick | the demo sidekick | pass 12: reads the demo tables (demoAccount, demoNote, demoPin, demoPlaybook, demoScreenOverride), never the record | predates the rule (2026-07-01) |
| /sidekick-v3 | the flow-first sidekick | pass 12: the same demo tables as /sidekick, never the record | predates the rule (2026-07-10) |
| /sidekick/flows/prismhr-global | the account-neutral demo flow | pass 12: static flow (src/lib/sidekick-flows); no account data | predates the rule (2026-07-10) |

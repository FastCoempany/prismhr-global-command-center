# Architecture

This folder holds architecture and implementation planning docs.

Current files:

- brand-identity.md
- canon-scoreboard.md
- chute-architecture-map.md
- chute-ingest-defects.md
- dead-code-appendix.md
- dead-code-ledger.md
- decree-ledger.md
- derived-fact-ledger.md
- design-brand-audit.md
- design-system.md
- field-glyphs.md
- product-lexicon.md
- rulings-sheet.md

## The Chute audit

Every audit pass gets its own document here, in the order it ran:

1. chute-architecture-map.md — audit pass 1, the architecture map of the
   ingest path: entry points, the data layer, the ingest trace, blast-radius
   files, and the ten refactor candidates.
2. chute-ingest-defects.md — the bug pass from audit pass 1: the eight
   defects reproduced, classified and fixed or deferred (PR #329).
3. derived-fact-ledger.md — audit pass 2, one layer down: every derived fact
   the app renders, where each is computed, where the paths diverge, the
   narrow reads, the note grammar, and the fields one account read must
   expose (refactor candidate 2).
4. decree-ledger.md — audit pass 3, CLAUDE.md against the code: every
   in-scope decree with how it is enforced, the violations ranked, the
   decrees that conflict with each other, the ingest behaviors no decree
   governs, and the tests the next pass should write.
5. dead-code-ledger.md — audit pass 4, what can come out before the
   refactor and where the app spends work nobody reads: dead code, data,
   surfaces, contracts, styles and tests, each classified against the
   canon, plus the SAFE NOW, NEEDS A RULING and NEEDS THE DB lists.

Beside the passes, one living file: canon-scoreboard.md keeps the three
counts the audits produced (honor-system decrees, ungoverned behaviors,
conflicting pairs) and every row behind them, and is the only place those
rows move.

rulings-sheet.md holds the seventeen decisions that gate the Chute
refactor's first two candidates, each with its options, what every option
changes in code, and a default; the founder rules, then CLAUDE.md is
amended and the scoreboard moves.

dead-code-appendix.md carries pass 4's full working lists (unused types,
dead classes, test-only and seed-only exports) so the ledger's counts have
their rows in the repo.

The sequence after pass 4, as recommended on 2026-09-25 and not yet
decided: (1) the founder rules on the rulings sheet, since a refactor now
would bake in whichever side of each conflicting pair the code happens to
be on; (2) a test pass, first adding the 27 hand-run suites to the chain,
then writing the ten tests pass 3 lists and one for every decree the
first two refactor candidates will move, then fixing the ruling-free
violations (pass 3 B5, B7, B12, B14, B16, B17, B21, B42, B43) with a test
in front of each; (3) the SAFE NOW removals from pass 4; (4) the refactor,
candidate 1 (the dialect and head-token module) then candidate 2 (one
account read with a declared home side and hide filter), then candidates
3 through 9 in pass-1 order.

Likely future files:

- data-model.md
- signal-engine.md
- permission-states.md
- hml-scoring-rules.md
- mvp-build-plan.md

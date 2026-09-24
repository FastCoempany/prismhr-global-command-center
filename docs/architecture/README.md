# Architecture

This folder holds architecture and implementation planning docs.

Current files:

- brand-identity.md
- chute-architecture-map.md
- chute-ingest-defects.md
- decree-ledger.md
- derived-fact-ledger.md
- design-brand-audit.md
- design-system.md
- field-glyphs.md
- product-lexicon.md

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

Likely future files:

- data-model.md
- signal-engine.md
- permission-states.md
- hml-scoring-rules.md
- mvp-build-plan.md

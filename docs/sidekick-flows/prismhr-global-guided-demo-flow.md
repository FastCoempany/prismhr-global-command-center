# PrismHR Global Guided Demo Flow

An **account-neutral**, curated walkthrough of the PrismHR Global platform demo —
21 screens in presentation order, distilled from a real recorded demo and reviewed
frame by frame. It is the master flow any rep can run for any prospect; nothing in
it is tied to a specific account.

## Where it lives

| Layer | Path |
| --- | --- |
| Curated source of truth | `tools/sidekick-import/curated/prismhr-global-master-demo-flow.v1.{json,md}` |
| Runtime data (read-only copy) | `src/lib/sidekick-flows/prismhr-global-master-demo-flow.v1.json` + `src/lib/sidekick-flows/index.ts` |
| App view | `/sidekick/flows/prismhr-global` (`src/app/sidekick/flows/prismhr-global/page.tsx`) |
| Link from Demo Sidekick | sidebar link “Curated Flow: PrismHR Global” on `/sidekick` |

## What the view shows

For each of the 21 keep-screens, in order: title, timestamp range, source moments,
recommended Sidekick module, screen type, visual summary, demo purpose, suggested
screenshot frame (as text only — no images are committed), a verbatim transcript
anchor, and the draft say / what / capabilities / strategic points /
discovery-executive notes / branching content. A cuts section lists the moment
ranges deliberately excluded from the flow (pre-demo context, a pricing Q&A kept
as an objection note, and the close/follow-up tail).

## Provenance

The flow was produced review-first from a Zoom demo recording:

1. The recording was extracted into a dense frame pack (1 frame / 0.25 s) plus
   `transcript.vtt` — see `docs/sidekick-imports/sidekick-assets-dense-20260708-213650.md`.
2. `npm run sidekick:import:draft` (`tools/sidekick-import/build-draft.mjs`)
   deterministically produced draft moments from the transcript + frame manifest.
3. A human frame review curated those moments into this 21-screen flow; talk
   tracks are grounded in verbatim transcript windows
   (`tools/sidekick-import/curated/enrichment-audit.md`).
4. The curated map was normalized to be account-neutral (names and
   account-specific framing removed; recording facts and country examples kept).

Moment numbers reference the full dense-pack importer run. Suggested frame
filenames are computed from the 4 fps cadence — verify against
`frame_manifest.csv` before using them.

## Guarantees

- **Read-only.** The page renders static JSON; it performs no database reads or
  writes and does not touch the editable Sidekick catalog
  (`src/lib/catalog/catalog.json`).
- **No bulky assets.** No frames, screenshots, MP4s, M4As, or ZIPs are committed;
  raw media stays in the GitHub release / local capture folders.
- **Versioned.** This is `v1`. Revisions should land as new `v2` files alongside,
  not silent edits, so demo prep links stay stable.

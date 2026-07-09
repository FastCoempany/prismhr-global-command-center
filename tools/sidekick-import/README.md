# Sidekick import — Zoom recording → draft catalog entries

A **local, review-first** importer. It reads the extracted dense frame pack from a
Zoom demo recording and deterministically produces **draft** Demo Sidekick catalog
entries for human review. It never writes to the database and never uploads
anything — output is JSON/Markdown on disk, and the bulky output folder is
gitignored.

Asset provenance: see `docs/sidekick-imports/sidekick-assets-dense-20260708-213650.md`
and the GitHub release `sidekick-assets-dense-20260708-213650` (raw media and
frames are intentionally kept out of git).

## Where the pack must live

Download + extract the release archive locally. The importer defaults to:

```
C:\Users\tanya\prismhr-global-command-center\PrismHR Global Demo\_sidekick_import_dense_20260708-213650
```

…and expects inside it:

- `transcript.vtt` (or `GMT20260707-162904_Recording.transcript.vtt`)
- `frame_manifest.csv`
- `frames_dense_025s/` — the 14,674 dense frames (1 per 0.25 s / 4 FPS)

Any other location works via `--pack` or `SIDEKICK_PACK_DIR`.

## Run it

```bash
npm run sidekick:import:draft                              # default path above
npm run sidekick:import:draft -- --pack "D:\some\other\pack"
SIDEKICK_PACK_DIR=/mnt/pack npm run sidekick:import:draft  # env form
```

Smoke test without the real pack (tiny committed fixture):

```bash
npm run sidekick:import:draft -- --pack tools/sidekick-import/fixture
```

## What it produces (in `tools/sidekick-import/output/`, gitignored)

| File | What it is |
| --- | --- |
| `transcript_segments.json` | Every VTT cue, cleaned (speaker split out), with its nearest start/mid/end frame |
| `frame_index.json` | Every frame with its timestamp (manifest-driven; filename/cadence fallback) |
| `screen_state_candidates.json` | Candidate demo moments with sampled frame refs to eyeball |
| `draft_catalog_entries.json` | Full draft entries (machine-readable) |
| `draft_catalog_entries.md` | The same drafts as a review document |

## How the deterministic pass works

1. Parse `transcript.vtt` cues by timestamp (Zoom `<v Name>` voice tags and
   `Name:` prefixes handled).
2. Parse `frame_manifest.csv` tolerantly (column names/order sniffed); if absent,
   scan `frames_dense_025s/` and infer times from filenames or the 0.25 s cadence.
3. Map each cue to its nearest frames (binary search on timestamps).
4. Group nearby cues into candidate moments — a new moment starts after an
   ≥8 s silence gap, or when a moment would exceed 75 s; trailing one-cue
   fragments fold into the previous moment.
5. Guess a module per moment by keyword hits against the real catalog module
   list (`src/lib/catalog/catalog.json`); confidence = none/low/medium/high by
   distinct hits.
6. Emit draft entries: module guess, title guess, timestamp range, transcript
   excerpt, ≤12 evenly-sampled frame refs, a `visibleScreenNotes` placeholder,
   and `say` / `what` / `capabilities` / `sp` / `de` / `branching` placeholders
   matching the Sidekick screen shape — plus the confidence field.

## Review loop

1. Run the importer.
2. Open `draft_catalog_entries.md`; for each moment, eyeball its listed frames in
   `frames_dense_025s/`, fill **visible screen notes**, correct the module/title,
   and write the real `say`/`what`/lists.
3. Nothing is imported anywhere until a curated set is explicitly applied in a
   later step (not part of this tool yet — by design).

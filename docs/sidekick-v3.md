# v3 Sidekick

The unified demo sidekick — one canonical screen store, flow-first navigation,
the account/playbook layer, and the companion material (discovery brief,
objections, follow-ups) in a single tab: **v3 Sidekick** → `/sidekick-v3`.

It merges the three earlier surfaces:

| Predecessor | What v3 took from it |
| --- | --- |
| Demo Sidekick (`/sidekick`) | accounts, per-account notes, playbooks, audience toggle, presenter mode, editable overrides, screenshots |
| New Sidekick Test (`/sidekick-test`, now removed) | flow-first ordering, video timestamps, the module lens as secondary |
| Guided flow page (`/sidekick/flows/prismhr-global`) | the 21 curated account-neutral screens, transcript anchors, visual summaries, demo purposes, cuts |

## Architecture — one store, flows as references

```
src/lib/sidekick-v3/
  screens.json     ← canonical screen store (21 records, account-neutral)
  flows.json       ← flows reference screen ids in order (never copy content)
  companion.json   ← discovery brief / objections / follow-ups (from the cuts)
  index.ts         ← types + accessors (module lens reuses the real catalog labels)
```

- **Screens** carry the union card: title, module, screen type, timestamp range,
  source moments, suggested frame, transcript anchor, visual summary, demo
  purpose, say/what/capabilities/sp/de/branching.
- **Flows** are ordered id lists. The master flow
  (`prismhr-global-master`) is the account-neutral walkthrough in recorded
  order. New curated flows = new entries in `flows.json`, no content duplication.
- **Companion** folds the curated map's cuts into three working affordances:
  a discovery-brief template (moments 1–21 pattern), an objection library
  (moment 45 pattern, each linked to its flow step), and a follow-up checklist
  (moments 52–55 pattern).

## Account layer (existing Demo* tables, v3-namespaced)

All per-account data reuses the existing tables — every v3 row is keyed by a
`pgd-…` screen id, which never collides with the original Sidekick's numeric
ids, so the two apps can't touch each other's data:

- **Notes** — per account per screen.
- **Playbooks** — *a playbook is a forked flow.* "Fork the master flow" creates
  an account playbook pre-filled with all 21 steps to reorder/trim per prospect;
  selecting a playbook makes it the presentation order (prev/next, presenter).
- **Overrides** — say/what/capabilities/sp/de/branching are editable in-app
  (global, like the original Sidekick); "Reset to curated content" reverts.

## Screenshots

The v3 card shows `/demo-screens/v3/<screenId>.jpg` when present. To populate:

```bash
npm run sidekick:frames:v3                      # default local pack path
npm run sidekick:frames:v3 -- --pack <dir>      # explicit pack path
```

This copies each screen's curated frame out of the local dense pack
(`frames_dense_025s/`, never committed) into `public/demo-screens/v3/`.
These 21 small JPEGs **are** meant to be committed — review each, swap any
that missed the moment, then commit the folder. Until then the card shows the
frame reference as text and hides the image slot.

## Presenter mode

`▶ Presenter` (or `p`) — full-screen step view: say track, top 3
audience-filtered points, first branching escape hatch, next-step preview.
Arrow keys walk the active order; `Esc` exits. The audience toggle
(Both / PEO / SMB) filters strategic points vs discovery/executive notes
everywhere, including presenter mode.

## What was removed

`src/app/sidekick-test/` and `src/lib/catalog-demo/` are deleted, and the
"New Sidekick Test" tab is replaced by "v3 Sidekick". That catalog was
account-specific (it named the source call's attendees); its flow-first ideas
now live here on top of the neutral store. The original Demo Sidekick tab and
the read-only guided-flow page remain untouched.

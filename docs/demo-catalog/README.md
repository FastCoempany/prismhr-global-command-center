# Demo Catalog

The categorized inventory of **every screen, tab, drill-down, and overlay** in the
PrismHR Global demo. It is the foundation the demo visual guide is built on: phase 1
fills the facts, phase 2 hangs the value scripts on them.

## The two phases

1. **Phase 1 — catalog (facts).** Walk the demo with `tools/demo-capture` (runs on your
   machine; the cloud env is egress-blocked from the demo host). Each captured screen
   becomes one entry here, classified against `taxonomy.yaml`. Done when every
   `children_frontier` item in `index.md` has its own entry.
2. **Phase 2 — script (value).** Fill each entry's Markdown body with the product-led
   value narrative, branching, and talk track. Product-focused only — what the product
   *does* and why it matters, never discovery or assumed customer needs.

## Layout

| Path | What it is |
|------|------------|
| `taxonomy.yaml` | Controlled vocabulary — modules, types, value tiers, audiences, statuses. The single source of allowed values. |
| `entry.schema.json` | JSON Schema validating each entry's frontmatter. |
| `SCHEMA.md` | Plain-language field reference for an entry. |
| `_template.md` | Blank entry to copy. |
| `index.md` | Coverage tracker + master traversal checklist (the "nothing-missed" list). |
| `entries/NNN-slug.md` | One file per screen. `001-dashboard.md` is the first real entry. |

## How captures become entries

After a walk, hand back the lightweight capture artifacts — `text/`, `a11y/`, and
`manifest.jsonl` (PNGs can stay local). Each captured screen is turned into an entry:
its frontmatter classified and its `capture:` paths pointed back at the artifacts. The
verbatim text and accessibility tree make this fast and exact — no guessing from a
blurry screenshot.

## Working the index

`index.md` is both a status table and a checklist. As each module is walked, append its
newly discovered tabs/drilldowns/overlays as frontier items, then check them off when
their entry exists. A node is never "done" while it still has an unchecked child — that
discipline is what makes the catalog exhaustive.

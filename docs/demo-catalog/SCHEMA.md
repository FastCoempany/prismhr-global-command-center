# Catalog Entry — Field Reference

Each screen of the demo becomes one file in `entries/NNN-slug.md`. The file has two
parts: **YAML frontmatter** (structured facts, validated by `entry.schema.json`) and a
**Markdown body** (the value script, authored in phase 2). Copy `_template.md` to start.

## Frontmatter fields

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | Zero-padded stable id, matches the filename (`001`). |
| `title` | yes | Human name of the screen, e.g. "Dashboard (Home)". |
| `status` | yes | `captured` → `classified` → `scripted` (the entry's lifecycle stage). |
| `type` | yes | What kind of node this is — `page`, `tab`, `drilldown`, `modal`, `overlay`, `table`, `field`, `button`. |
| `module` | yes | Top-level product area (see `taxonomy.yaml`). |
| `nav_path` | yes | Breadcrumb from login to here, e.g. `[Team, "Employee detail", Compensation]`. |
| `parent` | no | Parent entry id, or `null` for a top-level node. Builds the tree. |
| `children_frontier` | no | Clickables here that lead somewhere new. **This is the completeness engine** — every item listed must eventually get its own entry. |
| `elements` | no | Notable UI on the screen: `{ name, kind, actions }`. |
| `states` | no | Variations worth noting, e.g. `populated`, `empty`, `error`. |
| `value_tier` | yes | `high` / `medium` / `low` — how much script weight the screen deserves. |
| `audiences` | no | `service_provider` and/or `direct_employer` — who the value narrative targets. |
| `capture` | no | Paths back to the capture artifacts (`text`, `dom`, `a11y`, `screenshot`). |
| `tags` | no | Free-form keywords for cross-cutting search. |

## Body sections (phase 2)

- **What this screen is** — one factual sentence, no spin.
- **Capabilities shown** — what the product *does* here.
- **Value narrative (product-led, not discovery)** — why it matters, split by audience.
  Product-focused only: we never script around what the customer might need.
- **Branching** — `**If** <product-capability condition> **then** emphasize <point>`.
- **Say-this (talk track)** — the words you'd actually say on screen.

## Lifecycle

1. **captured** — capture artifacts exist (from `tools/demo-capture`); frontmatter stub created.
2. **classified** — facts + taxonomy filled in. **This is phase 1 done.**
3. **scripted** — value narrative + branching + talk track written. **This is phase 2 done.**

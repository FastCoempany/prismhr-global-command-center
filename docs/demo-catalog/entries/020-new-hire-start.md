---
id: "020"
title: New Hire — Worker Type
status: classified
type: page
module: new-hire
nav_path: [New Hire]
parent: null
children_frontier:
  - "EOR wizard: Employee Info (Select Employee)"
  - "Contractor wizard: start (Select Contractor)"
elements:
  - { name: "Worker type chooser", kind: card, actions: ["Select Employee", "Select Contractor"] }
  - { name: "Employee option", kind: card, actions: ["Select Employee"] }
  - { name: "Contractor option", kind: card, actions: ["Select Contractor"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/068.txt
  dom: dom/068.html
  a11y: a11y/068.yaml
  screenshot: screenshots/068.png
tags: [new-hire, eor, contractor, global-hiring, wizard-entry]
---

## What this screen is
The entry point of the New Hire flow, asking whether to hire an **Employee** (EOR) or a
**Contractor** before branching into the matching wizard.

## Capabilities shown
- Single starting point for two compliant global-hiring motions
- **Employee** path: `Hire employees compliantly in over 180 countries` via `Select Employee`
- **Contractor** path: `Classify and hire contractors compliantly in over 180 countries` via
  `Select Contractor`
- Worker-type choice made up front, before any data entry

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One screen shows your clients can hire abroad — as an employee or a contractor — through
  the exact global capability you now promote, with zero build on your side.
- Both compliant motions live in one product, so a lead you pass covers whatever work
  arrangement the client needs; PrismHR delivers either path.
- The `over 180 countries` promise is the headline before any data entry — an easy, credible
  message to carry to your client book.

### For the SMB client (via their PEO)
- Whether your next hire abroad is a full employee or a contractor, you start in the same
  place and the platform handles the compliant path for either.
- No entity, no local legal team — the choice on this screen is the entire decision, and the
  180+ country reach means expansion is a click, not a project.

## Branching
- **If** the client's need is ongoing headcount abroad **then** take `Select Employee` (EOR)
  and lead with the compliant six-step onboarding wizard.
- **If** the client engages independent workers **then** take `Select Contractor` and
  emphasize compliant classification across `over 180 countries`.

## Say-this (talk track)
> "This is where every global hire your clients make begins — one decision, employee or
> contractor. Pick either and we hire them compliantly in over 180 countries. That's the
> whole story you get to tell your clients: they extend into global through you, and the hard
> part — local compliance — is already built into whichever path they choose."

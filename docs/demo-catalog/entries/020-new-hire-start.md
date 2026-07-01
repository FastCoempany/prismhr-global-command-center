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
- **Employee** path: hire employees compliantly in over 180 countries
- **Contractor** path: classify and hire contractors compliantly in over 180 countries
- Worker-type choice made up front, before any data entry

## Value narrative (product-led, not discovery)

### For service providers
- One flow lets you originate both EOR employment and contractor engagements for your
  clients — the same product covers the full spectrum of global work arrangements you resell.
- Compliant classification and hiring across 180+ countries is the headline before a
  single field is filled in.

### For direct employers
- Whether the next hire is a full employee or a contractor, you start in the same place and
  the product handles the compliance path for either.
- The 180+ country reach is stated at the door, so global expansion is a choice on this
  screen rather than a project.

## Branching
- **If** the audience hires primarily full-time staff abroad **then** take the **Employee**
  (EOR) path and lead with the six-step compliant onboarding wizard.
- **If** the audience relies on contractors **then** take the **Contractor** path and
  emphasize compliant classification across 180+ countries.

## Say-this (talk track)
> "Every global hire starts here with one decision — employee or contractor. Pick either and
> we hire them compliantly in over 180 countries. That's the whole point: the hard part,
> local compliance, is built into whichever path you choose."

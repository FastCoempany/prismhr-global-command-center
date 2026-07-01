---
id: "090"
title: Reports (Hub)
status: classified
type: page
module: reports
nav_path: [Reports]
parent: null
children_frontier:
  - Worker Report
  - Contractor Report
  - EOR Report
  - Payroll Report
  - Hour Log Report
  - Report Settings
elements:
  - { name: "Report Settings", kind: button, actions: ["Open report settings"] }
  - { name: "Worker Report card", kind: card, actions: ["Open Worker Report"] }
  - { name: "Contractor Report card", kind: card, actions: ["Open Contractor Report"] }
  - { name: "EOR Report card", kind: card, actions: ["Open EOR Report"] }
  - { name: "Payroll Report card", kind: card, actions: ["Open Payroll Report"] }
  - { name: "Hour Log Report card", kind: card, actions: ["Open Hour Log Report"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/223.txt
  dom: dom/223.html
  a11y: a11y/223.yaml
  screenshot: screenshots/223.png
tags: [reports, eor, contractor, payroll, hour-log, reporting]
---

## What this screen is
The reporting hub at `/reports`, a card grid that routes to every report family —
Worker, Contractor, EOR, Payroll, and Hour Log — plus a Report Settings control.

## Capabilities shown
- One entry point to five report families spanning the whole workforce
- **Worker Report** — information across all workers regardless of engagement type
- **Contractor Report** — view and download contractor data
- **EOR Report** — employer-of-record reporting (gross, gross-to-net, GL, variance)
- **Payroll Report** — organization-wide payroll reporting
- **Hour Log Report** — hours logged by worker
- Report Settings for configuring output

## Value narrative (product-led, not discovery)

### For service providers
- Every report family a client could ask for lives behind one hub — you answer
  "show me the numbers" for a global book without leaving the platform.
- The same hub covers EOR, contractor, and payroll motions, so reporting scales
  with the breadth of engagements you resell.

### For direct employers
- Reporting across a multi-country, multi-engagement workforce starts from a single
  screen — no separate tools per country or per worker type.
- The card layout maps directly to how you think about the business: workers,
  contractors, EOR obligations, payroll, and hours.

## Branching
- **If** the audience runs an EOR-heavy workforce **then** open the **EOR Report**
  card and lead with employer gross and variance.
- **If** the audience is contractor-heavy **then** route to the **Contractor Report**
  and its export.

## Say-this (talk track)
> "This is your reporting hub. Everything you need to see about a global workforce —
> workers, contractors, EOR costs, payroll, hours logged — is one click from here.
> No stitching reports together across countries or systems."

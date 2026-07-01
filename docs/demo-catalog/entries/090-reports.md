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
The reporting hub at `/reports`, a card grid that routes to every report family — Worker, Contractor, EOR, Payroll, and Hour Log — plus a Report Settings control.

## Capabilities shown
- One entry point to five report families spanning the whole workforce
- **Worker Report** — information across all workers regardless of engagement type
- **Contractor Report** — view and download contractor data
- **EOR Report** — employer-of-record reporting (Employer Gross, Gross to Net, General Ledger, Variance)
- **Payroll Report** — organization-wide payroll reporting
- **Hour Log Report** — hours logged by worker
- **Report Settings** for configuring output

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every report a client could ask for about a global workforce already lives behind one hub — no build on your side, so you can stand up cross-border reporting for your book by promoting what PrismHR already runs.
- EOR, contractor, and payroll reporting share the same shelf, so the breadth of the global offering you extend to clients reads in a single screen — an easy story to demo and resell.
- These are the clean cost, GL, and variance views you can put in front of clients and stand behind, inside the PrismHR ecosystem they already trust.

### For the SMB client (via their PEO)
- Everything about your cross-border workforce — total cost, per-person net, GL, hours, variance — is one click from here, so you get finance-grade reporting **without building finance ops**.
- The card layout maps to how you already think about the business (workers, contractors, EOR obligations, payroll, hours), so nothing has to be learned or assembled.
- It is the same trusted safety net your PEO gives you domestically, now covering every country you employ in.

## Branching
- **If** the audience runs an EOR-heavy workforce **then** open the **EOR Report** card and lead with Employer Gross and Variance.
- **If** the audience is contractor-heavy **then** route to the **Contractor Report** and its download.
- **If** accounting or month-end close is the theme **then** jump to a **General Ledger** report to show chart-of-accounts mapping.

## Say-this (talk track)
> "This is the reporting hub. Everything you'd want to see about a global workforce — workers, contractors, EOR costs, payroll, hours logged — is one click from here, and none of it is something you had to build. Your PEO can hand you this the same way they hand you domestic reporting: it's already running inside PrismHR, ready to open."

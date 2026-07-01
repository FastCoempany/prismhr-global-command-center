---
id: "099"
title: EOR General Ledger Report
status: classified
type: page
module: reports
nav_path: [Reports, EOR Report, General Ledger]
parent: "093"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "GL-coded per-country table", kind: table, actions: [] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/017.txt
  dom: dom/017.html
  a11y: a11y/017.yaml
  screenshot: screenshots/017.png
tags: [reports, eor, general-ledger, chart-of-accounts, gl-codes, accounting, export]
---

## What this screen is
The EOR General Ledger Report at `/reports/eor/general-ledger` — a filterable, exportable
report that maps each EOR worker's payroll components to GL account codes, grouped by
country, for a selected period.

## Capabilities shown
- Columns carry **GL account codes** in the header: Gross Wages (1000), Benefits (2000),
  One-Time Payment (3000), Reimbursements (4000), Employer Taxes & Contributions (5000)
- Per-worker rows through to a **Total** that includes gross plus employer taxes and
  contributions (e.g. Chris Reed $4,141.86 wages + $662.72 employer taxes = $4,804.58)
- Results **grouped by country** (Canada, Egypt, Mexico, United States) with per-country totals
- Period selection, Compensation / Countries / Pay Frequency filters, Search, Export

## Value narrative (product-led, not discovery)

### For service providers
- EOR payroll drops straight into a client's accounting: every component is pre-coded to a
  chart-of-accounts number, per country, ready to export and post — no manual journal building.
- One report format serves every client's GL, across the whole multi-country book.

### For direct employers
- Finance gets a ledger-ready breakdown mapped to your chart of accounts, including the
  employer-side taxes and contributions, so cross-border payroll posts without rework.
- The full employer cost (wages + employer taxes) rolls up per country in the Total column.

## Branching
- **If** accounting integration or month-end close is the theme **then** anchor here and point
  at the GL codes in the headers.
- **If** they want to prove employer cost **then** walk the Total column (gross + employer
  taxes & contributions).

## Say-this (talk track)
> "This is the accounting view of your EOR payroll — every line already mapped to a
> chart-of-accounts code, employer taxes and contributions included, grouped by country. Your
> finance team exports it and posts it; there's no rebuilding journals by hand."

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

### For the PEO partner (channel)
- EOR payroll drops straight into a client's accounting: every component is pre-coded to a chart-of-accounts number — Gross Wages `1000`, One-Time Payment `3000`, Reimbursements `4000`, Employer Taxes & Contributions `5000` — per country, ready to export and post, with no build on your side.
- One GL format serves every client across their whole multi-country book, so the accounting story you resell is consistent and defensible.
- Handing a client's finance team a ledger-ready file is exactly the clean, stand-behind-it output that makes you the hero inside the PrismHR relationship they trust.

### For the SMB client (via their PEO)
- Finance gets a ledger-ready breakdown mapped to your chart of accounts, employer-side taxes and contributions included, so cross-border payroll posts **without rework and without you building finance ops**.
- The full employer cost (wages + employer taxes) rolls up per country in the **Total** column — e.g. Chris Reed's `$4,141.86` wages + `$662.72` employer taxes = `$4,804.58`.
- It's the done-for-you accounting hand-off your PEO gives you domestically, now covering every country you employ in.

## Branching
- **If** accounting integration or month-end close is the theme **then** anchor here and point at the GL codes (`1000`, `3000`, `4000`, `5000`) in the headers.
- **If** they want to prove employer cost **then** walk the **Total** column (gross + **Employer Taxes & Contributions**).
- **If** the client fears global will complicate close **then** show the export and how it posts as-is.

## Say-this (talk track)
> "This is the accounting view of your EOR payroll — every line already mapped to a chart-of-accounts code, employer taxes and contributions included, grouped by country. Your finance team exports it and posts it; there's no rebuilding journals by hand and nothing you had to set up. It's the clean hand-off your PEO gives you domestically, now global."

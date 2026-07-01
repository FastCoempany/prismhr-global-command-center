---
id: "104"
title: Payroll General Ledger Report
status: classified
type: page
module: reports
nav_path: [Reports, Payroll Report, General Ledger]
parent: "096"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "GL-coded per-country table", kind: table, actions: [] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/022.txt
  dom: dom/022.html
  a11y: a11y/022.yaml
  screenshot: screenshots/022.png
tags: [reports, payroll, general-ledger, chart-of-accounts, gl-codes, multi-currency, accounting, export]
---

## What this screen is
The organization-wide General Ledger Report at `/reports/payroll/general-ledger` — the same
GL-coded report as the EOR suite, run across the whole payroll population, grouped by country,
for a selected period.

## Capabilities shown
- Columns carry **GL account codes** in the header: Gross Wages (1000), Benefits (2000),
  One-Time Payment (3000), Reimbursements (4000), Employer Taxes & Contributions (5000)
- Per-worker rows to a **Total** including employer taxes and contributions
  (e.g. Ximena Fisher £145,043.27 wages → £211,763.32 total with £66,720.05 employer taxes)
- **Grouped by country** (Egypt, United Kingdom, United States) with per-country totals, each
  in **native local currency** (EGP, GBP, USD)
- Period selection, Compensation / Countries / Pay Frequency filters, Search, Export

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Organization-wide payroll drops straight into accounting: pre-coded to a chart of accounts — Gross Wages `1000`, One-Time Payment `3000`, Reimbursements `4000`, Employer Taxes & Contributions `5000` — per country, in local currency, the same GL format used across the EOR suite, with no build on your side.
- One consistent ledger export whether the worker is EOR or on the client's own payroll, so the accounting story you resell holds across a client's whole book.
- A ledger-ready file per client is the clean, defensible output that makes you the trusted extension of their finance operation.

### For the SMB client (via their PEO)
- Finance gets a ledger-ready breakdown mapped to your chart of accounts, employer taxes and contributions included, for the whole organization — no rework to post it and **no finance ops for you to build**.
- Per-worker rows roll into a per-country **Total** that includes employer taxes (e.g. Ximena Fisher `£145,043.27` wages → `£211,763.32` total with `£66,720.05` employer taxes), each in native currency — **EGP**, **GBP**, **USD**.
- It's the same accounting hand-off your PEO gives you domestically, now covering every country and currency you employ in.

## Branching
- **If** month-end close or accounting integration is the theme **then** anchor here and point at the GL codes (`1000`, `3000`, `4000`, `5000`) in the headers.
- **If** the audience thinks org-wide rather than EOR-only **then** demo here; the format matches `/reports/eor/general-ledger`.
- **If** multi-currency is the concern **then** show the per-country totals in **EGP / GBP / USD**.

## Say-this (talk track)
> "This is the accounting view of your whole payroll — every line coded to a chart-of-accounts number, employer taxes and contributions included, grouped by country and in local currency. Export it and it posts, with nothing for you to set up. It's the clean ledger hand-off your PEO gives you domestically, now global."

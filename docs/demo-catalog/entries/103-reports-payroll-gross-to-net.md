---
id: "103"
title: Payroll Employee Gross to Net Report
status: classified
type: page
module: reports
nav_path: [Reports, Payroll Report, Gross-to-Net]
parent: "096"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "Per-country worker table", kind: table, actions: [] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/019.txt
  dom: dom/019.html
  a11y: a11y/019.yaml
  screenshot: screenshots/019.png
tags: [reports, payroll, gross-to-net, net-pay, multi-currency, taxes, contributions, export]
---

## What this screen is
The organization-wide Employee Gross to Net Report at `/reports/payroll/gross-to-net` — the
same gross-to-net report as the EOR suite, run across the whole payroll population, grouped by
country, for a selected period.

## Capabilities shown
- Per-worker line from **Gross Wages → Bonus → Recurring → One-Time → Reimbursements →
  Gross Total → Taxes & Contributions → Net**
- **Grouped by country** (Egypt, United Kingdom, United States) with per-country Total rows
- **Native local currency** per market (EGP, GBP, USD) shown side by side
- Period selection, Compensation / Countries / Pay Frequency filters, Search, Export

## Value narrative (product-led, not discovery)

### For service providers
- The same gross-to-net breakdown available for EOR is available org-wide — one consistent
  report shape whether the worker is EOR or on the client's own payroll.
- Multi-currency, multi-country pay reads in one report you can export per client.

### For direct employers
- Every employee's full pay story — gross to net, in their own currency — for the whole
  organization, in one exportable report.
- No stitching together payroll runs from different countries to see net pay.

## Branching
- **If** the audience thinks org-wide rather than EOR-only **then** demo here; the report shape
  is identical to `/reports/eor/gross-to-net`.
- **If** multi-currency operations are the hot button **then** point at the EGP / GBP / USD
  totals shown natively per country.

## Say-this (talk track)
> "At the organization level you get the same gross-to-net report — every employee walked from
> gross wages to net, grouped by country and shown in local currency. Pick your period, filter,
> and export."

---
id: "105"
title: Payroll Variance Report
status: classified
type: page
module: reports
nav_path: [Reports, Payroll Report, Variance]
parent: "096"
children_frontier:
  - "Export"
elements:
  - { name: "Period comparison label", kind: field, actions: [] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "Per-country worker table", kind: table, actions: [] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/024.txt
  dom: dom/024.html
  a11y: a11y/024.yaml
  screenshot: screenshots/024.png
tags: [reports, payroll, variance, period-comparison, multi-currency, anomalies, export]
---

## What this screen is
The organization-wide Variance Report at `/reports/payroll/variance` — a report that places
each worker's current-period payroll total next to the prior period's total to surface changes.
The capture compares **June 2026 to May 2026**.

## Capabilities shown
- Explicit period comparison header: **"Comparing June 2026 to May 2026"**
- Per-worker columns (Wages, Bonus, Recurring, One-Time, Reimbursements, Benefits, Employer
  Taxes & Contributions) ending in a **Total** and a **Previous Month Total** side by side
  (e.g. Jane Employee $3,641.94 this month vs $4,583.82 previous)
- **Grouped by country** (Egypt, United Kingdom, United States) with per-country totals in
  **native local currency** (EGP, GBP, USD)
- Compensation / Countries / Pay Frequency filters, Search, Export

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every pay period is automatically checked against the last — anomalies, spikes, and drops surface across a client's whole multi-country book, per worker and per country, before they reach the client, with no build on your side.
- A built-in control you can run for every client each month, not a spreadsheet you rebuild — clean variance you can stand behind with clients.
- Catching a shift and explaining it on the client's behalf is exactly the trusted, done-for-you value that keeps them in your ecosystem.

### For the SMB client (via their PEO)
- Month-over-month payroll change is visible per employee and per country in one report — a fast way to catch a mistake or explain a shift before finance signs off, **without building any reconciliation of your own**.
- Current **Total** and **Previous Month Total** sit side by side in native currency — **EGP**, **GBP**, **USD** — with no manual comparison (e.g. Jane Employee `$3,641.94` this month vs `$4,583.82` previous).
- It's the same payroll safety net your PEO gives you domestically, now watching your global payroll across every country and currency.

## Branching
- **If** finance/audit rigor or payroll controls are the theme **then** anchor here and point at a worker whose **Total** differs from **Previous Month Total**.
- **If** the audience runs many entities or currencies **then** show how variance rolls up per country in native currency (**EGP / GBP / USD**).
- **If** the client fears global will be hard to control **then** frame this as the automatic month-over-month check they get for free.

## Say-this (talk track)
> "This compares this period to the last one automatically — here, June against May — for every worker and every country. Current total next to previous total, in local currency, so a spike or a drop jumps out before it becomes a problem. You didn't set any of it up; it's the same safety net your PEO gives you domestically, now on your global payroll."

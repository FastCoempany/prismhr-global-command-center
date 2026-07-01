---
id: "098"
title: EOR Employee Gross to Net Report
status: classified
type: page
module: reports
nav_path: [Reports, EOR Report, Gross-to-Net]
parent: "093"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "Per-country worker table", kind: table, actions: [] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/015.txt
  dom: dom/015.html
  a11y: a11y/015.yaml
  screenshot: screenshots/015.png
tags: [reports, eor, gross-to-net, net-pay, multi-country, taxes, contributions, export]
---

## What this screen is
The EOR Employee Gross to Net Report at `/reports/eor/gross-to-net` — a filterable,
exportable report showing each EOR worker's gross wages through to net pay, grouped by
country, for a selected period (June 2026 in the capture).

## Capabilities shown
- Per-worker line from **Gross Wages → Bonus → Recurring → One-Time → Reimbursements →
  Gross Total → Taxes & Contributions → Net**
- Results **grouped by country** (Canada, Egypt, Mexico, United States) with a per-country
  Total row
- Period selection via Start Date / End Date
- Filters for Compensation, Countries (All, or pick specific markets), Pay Frequency (Monthly)
- Search and Export

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every EOR worker's full pay breakdown — gross to net — is reportable across a client's whole multi-country book from one screen, grouped by country and exportable per client, with nothing for you to build.
- Filtering by **Countries** lets you hand each client the exact slice of their global workforce they care about — clean, defensible numbers you can stand behind.
- Walking a worker from **Gross Wages** through **Taxes & Contributions** to **Net** is a simple, trust-building demo you deliver inside the PrismHR relationship they already have.

### For the SMB client (via their PEO)
- See exactly what each employee earns and nets in each country — Canada, Egypt, Mexico, United States in the capture — in local currency, for the period, **without rebuilding gross-to-net from raw payroll data**.
- Country grouping with per-country **Total** rows means a cross-border workforce reads cleanly in one report, not a stack of country spreadsheets.
- It's the done-for-you pay transparency your PEO gives you domestically, now covering every worker abroad — whether that's one hire or hundreds.

## Branching
- **If** the room cares about employee-level pay transparency **then** anchor here and walk a single worker's line from **Gross Wages** to **Net**.
- **If** they operate in specific markets **then** use the **Countries** filter (All, Canada, Egypt, Mexico, United States) to narrow before exporting.
- **If** the client is small today **then** show that even a single worker's full gross-to-net is here with no setup.

## Say-this (talk track)
> "For your EOR population this walks every worker from gross wages all the way to net — bonuses, recurring pay, reimbursements, taxes and contributions — grouped by country and in local currency. You didn't build any of it; your PEO gives you this the same way they give you domestic pay reporting. Pick a period, filter the markets you care about, and export it."

---
id: "094"
title: EOR Employer Gross Report
status: classified
type: page
module: reports
nav_path: [Reports, EOR Report, EOR Employer Gross Report]
parent: "093"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/245.txt
  dom: dom/245.html
  a11y: a11y/245.yaml
  screenshot: screenshots/245.png
tags: [reports, eor, employer-gross, total-cost, taxes, contributions, export]
---

## What this screen is
The EOR Employer Gross Report at `/reports/eor/employer-gross` — a filterable, exportable report of total payroll costs for EOR-managed workers, including gross wages, taxes, and contributions.

## Capabilities shown
- Period selection via **Start Date / End Date** (defaulted to June 2026)
- Filters for **Compensation**, **Countries**, **Pay Frequency**
- **Search** and **Export**
- Aggregates the true employer cost: gross wages plus **Employer Taxes & Contributions**, per country

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Your client sees the fully loaded cost of their EOR workforce — not just wages, but every tax and contribution PrismHR handles in-country — in one exportable report you didn't have to build.
- Filtering by **Countries** lets you show cost per market across a client's global book, the kind of clean cross-border cost visibility you can stand behind with them.
- It makes you the hero: the client gets true employer cost with zero finance build, delivered through the PrismHR relationship they already trust.

### For the SMB client (via their PEO)
- The real cost of employing across borders — wages plus employer taxes and statutory contributions — lands in one place, per period, **without you building any finance ops**.
- No assembling employer-side costs country by country; the report rolls it up for you and exports straight to whoever owns the numbers.
- It's the done-for-you compliance and cost picture your PEO gives you domestically, now spanning every country you employ in.

## Branching
- **If** total cost of global employment is the hot button **then** anchor the demo on this report and filter by **Countries** to show cost per market.
- **If** finance owns the room **then** demonstrate **Export** for the selected period.
- **If** the client is early-stage with a first hire abroad **then** show that even a single worker's fully loaded employer cost is here without any setup.

## Say-this (talk track)
> "This is what your EOR workforce actually costs — gross wages plus every employer tax and contribution, per country, for the period you pick. You didn't build any of it; your PEO can hand you this fully-loaded cost view the same way they give you domestic reporting. Filter to the markets you care about and export it to finance."

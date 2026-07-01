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
The EOR Employer Gross Report at `/reports/eor/employer-gross` — a filterable,
exportable report of total payroll costs for EOR-managed workers, including gross
wages, taxes, and contributions.

## Capabilities shown
- Period selection via Start Date / End Date (defaulted to June 2026)
- Filters for Compensation, Countries, Pay Frequency
- Search and Export
- Aggregates the true employer cost: gross wages plus taxes and contributions

## Value narrative (product-led, not discovery)

### For service providers
- Clients see the fully loaded cost of their EOR workforce — not just wages, but the
  taxes and contributions you handle in each country — in one exportable report.
- Filtering by country makes it easy to show cost by market for a global book.

### For direct employers
- The real cost of employing across borders — wages, employer taxes, statutory
  contributions — is reported in one place, per period, ready to export to finance.
- No manually assembling employer-side costs country by country.

## Branching
- **If** the hot button is total cost of global employment **then** anchor the whole
  demo on this report and filter by Countries to show cost per market.
- **If** finance owns the room **then** demonstrate Export for the selected period.

## Say-this (talk track)
> "This is what your EOR workforce actually costs you — gross wages plus every employer
> tax and contribution, per country, for the period you pick. One report, fully loaded,
> exportable to finance."

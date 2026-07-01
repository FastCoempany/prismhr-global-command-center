---
id: "092"
title: Contractor Report
status: classified
type: page
module: reports
nav_path: [Reports, Contractor Report]
parent: "090"
children_frontier:
  - "Export"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Engagement", "Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/239.txt
  dom: dom/239.html
  a11y: a11y/239.yaml
  screenshot: screenshots/239.png
tags: [reports, contractor, export, multi-country]
---

## What this screen is
The Contractor Report at `/reports/contractor` — a filterable, exportable report
scoped to contractor engagements over a selected period.

## Capabilities shown
- Period selection via Start Date / End Date (defaulted to June 2026)
- Filters for Engagement, Compensation, Countries, Pay Frequency
- Search across contractors
- Export the report

## Value narrative (product-led, not discovery)

### For service providers
- A dedicated contractor view lets you report on the contractor slice of a client's
  book without noise from EOR or payroll populations.
- Period-scoped export means clients get clean contractor records for any month.

### For direct employers
- Your contractor spend and roster is reportable and exportable on its own — filtered
  by country, compensation, and pay frequency.
- One consistent report regardless of where contractors sit.

## Branching
- **If** the workforce is contractor-heavy **then** lead here and filter by Countries
  to show the geographic spread.
- **If** finance needs records **then** demonstrate the Export for the selected period.

## Say-this (talk track)
> "When you just need the contractor picture — who they are, where they are, what
> they're paid — this report isolates it, filters by country and pay frequency, and
> exports in one click."

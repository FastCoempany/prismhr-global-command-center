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

### For the PEO partner (channel)
- A dedicated contractor view isolates the contractor slice of your client's global book
  from EOR and payroll noise — clean records you can stand behind, with the in-country
  work already handled by PrismHR.
- Period-scoped **Export** means your client walks away with tidy contractor records for
  any month, reinforcing the trusted-ecosystem story you extend into global.

### For the SMB client (via their PEO)
- Your contractor roster and spend is reportable and exportable on its own — filtered by
  **Countries**, **Compensation**, and **Pay Frequency** — with no finance ops to build.
- One consistent report no matter where a contractor sits, so your first international
  contractor and your hundredth read the same way.

## Branching
- **If** the workforce leans contractor **then** use the **Countries** filter to show the
  geographic spread across the contractor population.
- **If** finance needs clean records **then** set **Start Date / End Date** to the period
  and use **Export**.
- **If** they pay on mixed schedules **then** use the **Pay Frequency** filter to isolate
  a cadence.

## Say-this (talk track)
> "When you just need the contractor picture — who they are, where they are, what they're
> paid — this report isolates it. Pick the month with the date range, filter by country or
> pay frequency, and export in one click. It's the clean cross-border record your PEO can
> hand you without either of you building a reporting stack."

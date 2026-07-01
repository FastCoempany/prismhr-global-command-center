---
id: "095"
title: EOR Variance Report
status: classified
type: page
module: reports
nav_path: [Reports, EOR Report, Variance Report]
parent: "093"
children_frontier:
  - "Export"
elements:
  - { name: "Comparison period", kind: field, actions: ["Comparing June 2026 to May 2026"] }
  - { name: "Filters", kind: field, actions: ["Compensation", "Countries", "Pay Frequency"] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Export", kind: button, actions: ["Export"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/247.txt
  dom: dom/247.html
  a11y: a11y/247.yaml
  screenshot: screenshots/247.png
tags: [reports, eor, variance, period-comparison, controls, export]
---

## What this screen is
The EOR Variance Report at `/reports/eor/variance` — a period-over-period comparison
that tracks payroll changes for EOR employees to flag inconsistencies or trends.

## Capabilities shown
- Period comparison built in ("Comparing June 2026 to May 2026")
- Filters for Compensation, Countries, Pay Frequency
- Search and Export
- Surfaces payroll changes across periods for review

## Value narrative (product-led, not discovery)

### For service providers
- Variance across periods is computed for you, so you can proactively flag changes in
  a client's EOR payroll before they become questions — a controls story you can resell.
- Country filtering isolates where the movement happened across a global book.

### For direct employers
- What changed in EOR payroll from one period to the next is a report, not a
  spreadsheet reconciliation — anomalies and trends surface automatically.
- A built-in check on payroll accuracy across every country you employ in.

## Branching
- **If** payroll accuracy or audit is the theme **then** lead with the June-vs-May
  comparison and show how a change is flagged.
- **If** the workforce spans many countries **then** filter by Countries to localize
  the variance.

## Say-this (talk track)
> "Every period, this compares your EOR payroll to the last one and flags what moved —
> June against May, here — so a change never slips by unnoticed. That's payroll
> controls built into the platform, across every country."

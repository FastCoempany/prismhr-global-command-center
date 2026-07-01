---
id: "091"
title: Worker Report
status: classified
type: page
module: reports
nav_path: [Reports, Worker Report]
parent: "090"
children_frontier:
  - "Show Map"
  - "Download Report"
  - "Pagination (Next/Previous, pages 1-3)"
elements:
  - { name: "Date range filters", kind: field, actions: ["Start Date", "End Date"] }
  - { name: "Filters", kind: field, actions: ["Engagement", "Status", "Countries", "Pay Frequency"] }
  - { name: "Show Map", kind: button, actions: ["Show Map"] }
  - { name: "Summary tiles", kind: card, actions: [] }
  - { name: "Search", kind: field, actions: ["Search"] }
  - { name: "Download Report", kind: button, actions: ["Download Report"] }
  - { name: "Worker table", kind: table, actions: ["Sort", "Paginate"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/225.txt
  dom: dom/225.html
  a11y: a11y/225.yaml
  screenshot: screenshots/225.png
tags: [reports, worker, multi-country, multi-currency, engagement-mix]
---

## What this screen is
The Worker Report at `/reports/worker-detail` — a filterable, downloadable table of
every worker with summary tiles and a per-worker detail grid.

## Capabilities shown
- Summary tiles across the whole workforce: Total Workers (42), Pending Contracts (9),
  Contractor (12), Contractor+ (5), EOR (9), Payroll (7)
- One table listing every engagement type side by side (Contractor, EOR, Payroll)
- **Multi-currency** base pay shown natively (USD, GBP, CAD, NIO)
- **Multi-country** coverage (UK, US, Canada, Nicaragua, Taiwan) in one grid
- Filters for date range, Engagement, Status, Countries, Pay Frequency
- Show Map, Search, Download Report, and paginated results

## Value narrative (product-led, not discovery)

### For service providers
- A single roster shows every worker across every client engagement type and country —
  the composition of the global book is one export away.
- Summary tiles quantify the mix (EOR vs. contractor vs. payroll) at a glance, so you
  can speak to the breadth of what you're running.

### For direct employers
- Your entire cross-border headcount sits in one grid — native currencies, home
  countries, and engagement types — with no per-country spreadsheets.
- Filters and download turn "how many workers, where, on what terms" into a
  two-second answer.

## Branching
- **If** engagement mix is the story **then** anchor on the summary tiles and filter
  by Engagement to show EOR and contractor populations separately.
- **If** multi-currency operations matter **then** scroll the base-pay column to show
  USD/GBP/CAD/NIO side by side.

## Say-this (talk track)
> "Here's every worker you have, anywhere in the world, in one report. Forty-two people
> across the UK, US, Canada, Nicaragua, Taiwan — EOR, contractors, payroll — each paid
> in their local currency. Filter it, map it, download it. That's your whole workforce
> on one screen."

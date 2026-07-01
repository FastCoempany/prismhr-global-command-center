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

### For the PEO partner (channel)
- One roster shows every worker your client engages across every country and engagement
  type — Contractor, EOR, Payroll — so you can stand behind your client's global
  headcount with clean visibility and zero build on your side.
- The summary tiles quantify the mix (**EOR (9)**, **Contractor (12)**, **Payroll (7)**)
  at a glance, giving you a credible, at-a-glance view of what your client's international
  book actually looks like.

### For the SMB client (via their PEO)
- Your entire cross-border headcount sits in one grid — native currencies (USD, GBP, CAD,
  NIO), home countries (UK, US, Canada, Nicaragua, Taiwan), engagement types — with no
  finance ops or per-country spreadsheets to build.
- Filters and **Download Report** turn "how many people, where, on what terms" into a
  two-second answer — the same simplicity your PEO gives you domestically, now global.

## Branching
- **If** the workforce mix is the point **then** use the **Engagement** filter to split
  the roster into EOR, Contractor, and Payroll populations.
- **If** geographic spread matters **then** use **Show Map** and the **Countries** filter
  to plot where workers sit.
- **If** finance wants the raw records **then** use **Download Report** to hand off the
  full multi-currency roster.

## Say-this (talk track)
> "Here's every worker in one report — forty-two people across the UK, US, Canada,
> Nicaragua, and Taiwan, paid in their own currency, whether they're EOR, contractor, or
> on payroll. The tiles up top break down the mix instantly. Filter it, map it, download
> it — that's the whole workforce on one screen, without you building a thing."

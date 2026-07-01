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
The EOR Variance Report at `/reports/eor/variance` — a period-over-period comparison that tracks payroll changes for EOR employees to flag inconsistencies or trends.

## Capabilities shown
- Period comparison built in (**"Comparing June 2026 to May 2026"**)
- Filters for **Compensation**, **Countries**, **Pay Frequency**
- **Search** and **Export**
- Surfaces payroll changes across periods for review

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Variance across periods is computed for you, so you can proactively flag a change in a client's EOR payroll before it becomes a question — a clean controls story you can stand behind with clients, with no build.
- The **Countries** filter isolates where the movement happened across a client's global book, so you localize the answer instantly.
- Catching and explaining month-to-month shifts on the client's behalf is exactly the trusted, done-for-you value that keeps them in your ecosystem.

### For the SMB client (via their PEO)
- What changed in EOR payroll from one period to the next is a report, not a spreadsheet reconciliation you have to run — anomalies and trends surface automatically, **without you building finance ops**.
- It's a built-in check on payroll accuracy across every country you employ in — the safety net your PEO gives you domestically, now watching your global payroll.
- Comparing **June 2026 to May 2026** side by side means a spike or a drop is visible before you ever have to go looking for it.

## Branching
- **If** payroll accuracy or audit is the theme **then** lead with the June-vs-May comparison and show how a change is flagged.
- **If** the workforce spans many countries **then** filter by **Countries** to localize the variance.
- **If** the client worries global will be hard to control **then** frame this as the automatic month-over-month check they get for free.

## Say-this (talk track)
> "Every period this compares your EOR payroll to the last one and flags what moved — June against May, right here — so a change never slips by. You didn't set any of it up; it's the same kind of safety net your PEO already gives you domestically, now running on your global payroll across every country."

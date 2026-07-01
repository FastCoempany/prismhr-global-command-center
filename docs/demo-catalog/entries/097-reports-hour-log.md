---
id: "097"
title: Hour Log Report
status: classified
type: page
module: reports
nav_path: [Reports, Hour Log Report]
parent: "090"
children_frontier:
  - "Pay Periods selector"
  - "Worker hour-log row"
elements:
  - { name: "Pay Periods selector", kind: field, actions: ["Select pay period (64 available)"] }
  - { name: "Hour Logs list", kind: table, actions: ["View worker hour logs"] }
  - { name: "Current View", kind: field, actions: ["Current View"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/255.txt
  dom: dom/255.html
  a11y: a11y/255.yaml
  screenshot: screenshots/255.png
tags: [reports, hour-log, time-tracking, hourly, pay-periods]
---

## What this screen is
The Hour Log Report at `/reports/hour-log` — a per-worker view of hours logged,
selectable across 64 pay periods, listing each hourly worker with role, start date,
and hourly rate.

## Capabilities shown
- Pay Periods selector spanning many months (64 periods available)
- Per-worker hour-log entries: name, role, start date, hourly rate
- Hourly workers across the organization (e.g. Ulrich Cooper $36.61/hr, Felix Hunt
  $22.49/hr, Paul Miller $25.43/hr)
- Current View toggle for the selected period

## Value narrative (product-led, not discovery)

### For service providers
- Logged hours per worker per pay period are reportable directly, so you can back up
  hourly billing and payroll for a client's workforce with the underlying records.
- Deep period history (dozens of pay periods) means you can answer questions about any
  past cycle.

### For direct employers
- For hourly workers, the hours behind each pay run are visible per person and per
  period — the source data for what you paid.
- Selecting any of the historical pay periods reconstructs that cycle's hour logs.

## Branching
- **If** the workforce is hourly-heavy **then** lead here and pick a prior pay period
  to show the audit trail of logged hours.
- **If** the theme is payroll accuracy **then** tie hour logs back to the payroll and
  variance reports as the underlying evidence.

## Say-this (talk track)
> "For your hourly workers, every hour logged is here, per person, per pay period — and
> you can go back across dozens of periods. It's the source of truth behind what you
> paid and what you billed."

---
id: "070"
title: Time Tracking
status: classified
type: page
module: time-tracking
nav_path: [Dashboard, Time Tracking]
parent: null
children_frontier:
  - "Manage Labels"
  - "Pay Period selector"
  - "Worker row: View (time-card detail)"
  - "Import"
  - "Export"
elements:
  - { name: "Pay Period selector", kind: field, actions: ["Select pay period"] }
  - { name: "Label filter", kind: field, actions: ["Work Type", "Priority"] }
  - { name: "Total Hours summary", kind: card, actions: [] }
  - { name: "Worker hours list", kind: table, actions: ["View"] }
  - { name: "Time-card detail", kind: drilldown, actions: [] }
  - { name: "Toolbar", kind: button, actions: ["Manage Labels", "Import", "Export"] }
states: [populated, empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/213.txt
  dom: dom/213.html
  a11y: a11y/213.yaml
  screenshot: screenshots/213.png
tags: [time-tracking, timesheets, hours, labels, contractor, approvals]
---

## What this screen is
The timesheet screen, showing logged hours per worker for a selected pay period, with a
per-worker drilldown into individual dated time entries.

## Capabilities shown
- **Pay Period selector** listing periods with their state — `Scheduled`, `Pending
  approval`, `Complete` — and engagement (Contractor)
- **Total Hours** roll-up for the period (e.g. 1079 across the team)
- Per-worker rows with initials, name, period, and hours (e.g. Ulrich Cooper 142, Felix
  Hunt 138), each with **View**
- Drilldown to a worker's time card: date, work description, hours, and **Label** (e.g.
  `Business Domain`) per entry
- **Label** filters (Work Type, Priority) that narrow the list and recompute Total Hours
- **Import** and **Export**, plus a link to **Manage Labels**
- Empty state when a period has no cards ("No Time Cards logged for this Pay Period.")

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Contractor and worker hours roll up per pay period in one place across the global book, so
  timesheet administration is ready without a separate tool — **zero build**, low lift to
  fold into what you already offer clients.
- Labels plus **Import**/**Export** let time data be shaped and moved to fit each client's
  reporting, so global timekeeping fits the trusted PrismHR workflow they know.

### For the SMB client (via their PEO)
- You see **Total Hours** for the period and can drill into any worker to verify exactly what
  was logged, day by day, before it feeds pay — done-for-you accuracy, no chasing timesheets.
- Pay-period states (`Scheduled` / `Pending approval` / `Complete`) make it clear what still
  needs attention, whether you have one contractor abroad or a full team.

## Branching
- **If** the client bills by time **then** open a worker's time card and show the dated,
  labeled entries that back the total.
- **If** the client manages many workers **then** stay on the roll-up and show Total Hours
  plus the label filters recomputing the view.

## Say-this (talk track)
> "Pick a pay period and you get total hours for the whole team, then hours per worker. Click
> into anyone and you see every dated entry with its label and description. Filter by work
> type, import or export — it's the full timesheet workflow in one screen, the same trusted
> way you already run things, now across your global workers."

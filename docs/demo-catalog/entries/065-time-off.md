---
id: "065"
title: Time Off
status: classified
type: page
module: time-off
nav_path: [Dashboard, Time Off]
parent: null
children_frontier:
  - "Pending request: Approve"
  - "Pending request: Decline"
  - "Time Off Calendar tab"
  - "History tab"
  - "History: Export"
  - "History: worker row drilldown"
elements:
  - { name: "Section tabs", kind: nav, actions: ["Pending Requests", "Time Off Calendar", "History"] }
  - { name: "Pending Requests list", kind: card, actions: ["Approve", "Decline"] }
  - { name: "Calendar", kind: card, actions: ["Previous month", "Next month", "Today"] }
  - { name: "Who's Out panel", kind: card, actions: [] }
  - { name: "History table", kind: table, actions: ["Export"] }
  - { name: "All Workers filter", kind: field, actions: ["Select worker"] }
  - { name: "Engagement filter", kind: field, actions: ["Filter by engagement"] }
  - { name: "Leave Type filter", kind: field, actions: ["All", "Annual Leave", "Sick Leave"] }
  - { name: "Status filter", kind: field, actions: ["All", "Approved", "Declined", "Cancelled"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/201.txt
  dom: dom/201.html
  a11y: a11y/201.yaml
  screenshot: screenshots/201.png
tags: [time-off, leave, approvals, calendar, eor, contractor, payroll]
---

## What this screen is
The leave-management screen, with three views — Pending Requests to approve, a month
Calendar with a "Who's Out" panel, and a filterable History of all leave records.

## Capabilities shown
- **Pending Requests** across engagement types (Contractor, EOR, Payroll) with leave
  dates, leave type (Holidays, Vacation, Annual Leave, Personal, Family time), and inline
  **Approve / Decline**
- **Time Off Calendar**: month grid with Previous/Next/Today navigation and a **Who's Out**
  panel counting workers out **today and tomorrow**
- **History**: table of every request — name, leave type, requested-on, leave dates, day
  count, and status (`Approved by Demo Hr Manager`), paginated (27 results shown)
- Filters across all workers, **Engagement**, **Leave Type** (Annual/Sick), and **Status**
  (Approved/Declined/Cancelled), plus a date range and **Export**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One leave queue spans every engagement type (EOR, payroll, contractor) across the global
  book, so time-off administration comes ready-made — **zero build**, no separate leave tool
  to extend into your offering.
- **History** plus filters and **Export** give an auditable leave record per client out of
  the box, so global time off feels like the same trusted PrismHR your clients already run.

### For the SMB client (via their PEO)
- Every leave request that needs a decision is in one list with the context to decide — who,
  when, what type — and you **Approve** or **Decline** in place, done-for-you and simple.
- The **Calendar** and **Who's Out** panel tell you at a glance who is unavailable today and
  tomorrow across the whole workforce, so coverage is handled without spreadsheets — the same
  safety net your PEO gives you at home, now for your global people.

## Branching
- **If** the client worries about coverage **then** open the Calendar and Who's Out panel to
  show at-a-glance visibility of who's out.
- **If** the client needs auditability **then** open History, apply the Status filter, and
  show the exportable record with approver attribution (`Approved by Demo Hr Manager`).

## Say-this (talk track)
> "Time off lives in one place. Everything awaiting a decision is here — across EOR, payroll,
> and contractors — approve or decline in a click. Flip to the calendar to see who's out
> today and tomorrow, and History gives you a filterable, exportable record of every request
> with who approved it. It's the same simple safety net you already trust, now global."

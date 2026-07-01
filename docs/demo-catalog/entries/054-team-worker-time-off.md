---
id: "054"
title: Worker Profile — Time Off
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Time Off]
parent: "050"
children_frontier:
  - "View Details (public holidays)"
  - "Create Request"
  - "Filter (history)"
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Balance cards", kind: card, actions: ["View Details"] }
  - { name: "Pending Requests", kind: card, actions: ["Create Request"] }
  - { name: "History table", kind: table, actions: ["Filter"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/186.txt
  dom: dom/186.html
  a11y: a11y/186.yaml
  screenshot: screenshots/186.png
tags: [team, worker-profile, time-off, leave, public-holidays, balances]
---

## What this screen is
The **Time Off** tab of a worker's profile (here **Paul Davis**), showing leave balances,
pending requests, and a filterable history of past time-off requests with their outcomes.

## Capabilities shown
- **Leave balances** by category: `Public Holidays` (7 days), `Sick Leave` (3.8 days),
  `Annual Leave` (2.5 days)
- **View Details** on `Public Holidays` — the country-specific holiday calendar for this worker
- **Pending Requests** area with a **Create Request** action and an empty state
  (`No Pending Time Off Requests`)
- **History** table — `CATEGORY NAME`, `DATES REQUESTED`, `TIME REQUESTED`,
  `APPROVE/DECLINE DATE`, `STATUS` (e.g. `Annual leave`, Aug 27 – Sep 8 2026, `9.0 days`,
  `Approved`), with a **Filter** control
- Worker context header (work email, start date, position, worker ID, manager) alongside
  the profile tab strip

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every client's workers carry their own leave balances, local holiday entitlement, and full
  request history right on the profile — so you can extend time-off administration across your
  entire client base **with zero build**; PrismHR already tracks it per country.
- Public holidays come with their own in-country calendar, so the compliance detail your
  clients would otherwise have to research is handled inside the ecosystem they already trust.

### For the SMB client (via their PEO)
- You can see exactly where a global team member stands on holidays, sick, and annual leave —
  plus every past request and its outcome — without a separate leave tool or a legal team to
  interpret local entitlements.
- Local `Public Holidays` are pre-loaded per worker, so a hire abroad gets the **same
  done-for-you safety net your PEO gives you at home**, now applied to another country.

## Branching
- **If** country-specific compliance is the theme **then** open **View Details** on
  `Public Holidays` to show the local holiday calendar carried per worker.
- **If** the audience runs approvals **then** walk a **History** row (requested → `Approved`
  with dates) to show the built-in audit trail.
- **If** the audience wants day-to-day simplicity **then** show **Create Request** and the
  live balance cards updating leave in one place.

## Say-this (talk track)
> "Time off for this worker sits right on their profile — balances up top for public holidays,
> sick, and annual leave, then any pending requests, and a full history of what was requested
> and whether it was approved. The public holidays even carry their own country calendar, so
> local entitlements are handled for you. For your PEO, that means you can offer global leave
> management to every client without building any of it — it's already here, per country."

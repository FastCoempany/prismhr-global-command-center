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
The Time Off tab of a worker's profile, showing leave balances, pending requests, and a
filterable history of past time-off requests with their outcomes.

## Capabilities shown
- **Leave balances** by category: Public Holidays (7 days), Sick Leave (3.8 days),
  Annual Leave (2.5 days)
- **View Details** on public holidays (country-specific holiday calendar)
- **Pending Requests** area with a **Create Request** action and an empty state
  ("No Pending Time Off Requests")
- **History** table with category, dates requested, time requested, approve/decline
  date, and status (e.g. Annual leave, 9.0 days, Approved), with a Filter control

## Value narrative (product-led, not discovery)

### For service providers
- Each worker's leave balances, holiday entitlement, and full request history are on
  their profile, so you administer time off across many clients and countries from one place.
- Public holidays are tracked per worker with their own calendar, so country-specific
  entitlements are handled without you maintaining them by hand.

### For direct employers
- You can see exactly where a global team member stands on holidays, sick, and annual
  leave — plus every past request and its outcome — without a separate leave tool.
- Requests can be created and tracked to Approved right on the profile, so leave for
  international staff is managed the same way for everyone.

## Branching
- **If** country-specific compliance is the theme **then** open **View Details** on
  Public Holidays to show the local holiday calendar.
- **If** the audience runs approvals **then** walk the History row (requested → Approved
  with dates) to show the audit trail.

## Say-this (talk track)
> "Time off for this worker: their balances up top — public holidays, sick, annual —
> then any pending requests, and a full history with what was requested and whether it
> was approved. Public holidays even carry their own country calendar, so local
> entitlements are handled for you."

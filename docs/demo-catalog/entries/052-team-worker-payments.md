---
id: "052"
title: Worker Profile — Payments
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Payments]
parent: "050"
children_frontier:
  - "Pagination: Previous / Next"
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Payments table", kind: table, actions: [] }
  - { name: "Pagination", kind: nav, actions: ["Previous", "Next"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/182.txt
  dom: dom/182.html
  a11y: a11y/182.yaml
  screenshot: screenshots/182.png
tags: [team, worker-profile, payments, payroll, pay-history, multi-currency, mxn]
---

## What this screen is
The Payments tab of a worker's profile: a paginated pay history listing every pay period
with its contract, pay period dates, distribution date, and gross payment amount.

## Capabilities shown
- Full **pay history** per worker, one row per pay period (monthly here)
- Columns for **Contract, Pay Period, Distributed At, Gross Payment**
- Amounts shown in the worker's **local currency** (MXN) natively
- Distinguishes **distributed** periods (with a Distributed At date) from **upcoming**
  ones (no distribution date yet), across past and future months
- Paginated across a long history (2025 through 2026 visible)

## Value narrative (product-led, not discovery)

### For service providers
- Every payment ever made to a worker is on their record, in their local currency, so
  answering "what did we pay them and when" is instant across your whole client book.
- Distributed vs. upcoming periods are visibly different, so you can see what has settled
  and what's still scheduled without leaving the profile.

### For direct employers
- A complete, per-period pay history sits on each global team member's profile — in the
  currency they're actually paid in — so cross-border pay is transparent and auditable.
- Past and future pay periods appear together, giving a running picture of what's been
  paid and what's coming.

## Branching
- **If** multi-currency is the hot button **then** anchor on the native **MXN** amounts
  and note each worker's history shows in their own currency.
- **If** the audience is operational **then** point at the **Distributed At** column to
  show settled vs. scheduled periods.

## Say-this (talk track)
> "This is the worker's full pay history — every period, the dates, when it was
> distributed, and the gross amount, right in their local currency. You can see what's
> already been paid and what's still scheduled, all on their profile."

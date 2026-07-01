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

### For the PEO partner (channel)
- Cross-border payroll runs on PrismHR's in-country infrastructure and lands as a clean
  per-period history in the worker's own currency (here **MXN**) — a global pay capability
  your clients get with zero build on your side.
- Because every payment is on the record, your clients can answer "what did we pay them and
  when" themselves, so extending into global adds value to your book without adding support
  load.

### For the SMB client (via their PEO)
- A complete, per-period pay history sits on each global team member's profile — with
  **Contract**, **Pay Period**, **Distributed At**, and **Gross Payment** — in the currency
  they're actually paid in, so paying someone abroad is as transparent as paying at home.
- **Distributed** periods (with a **Distributed At** date) and **upcoming** ones appear
  together across 2025 into 2026, giving a running picture of what's settled and what's
  scheduled — done for you, no international payroll expertise required.

## Branching
- **If** multi-currency is the hot button **then** anchor on the native **MXN** amounts
  and note each worker's history shows in their own currency.
- **If** the audience is operational **then** point at the **Distributed At** column to
  show settled vs. scheduled periods.

## Say-this (talk track)
> "This is the worker's full pay history — every period, the dates, when it was
> distributed, and the gross amount, right in their local currency, MXN here. You can see
> what's already been paid and what's still scheduled, all on their profile. Your clients
> get compliant global payroll done for them — the same trusted pay experience you give
> them domestically, now across borders, with nothing for them to stand up."

---
id: "055"
title: Worker Profile — Expense Reimbursements
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Expense Reimbursements]
parent: "050"
children_frontier:
  - "View (open an expense)"
  - "Pagination: Previous / Next"
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Expenses table", kind: table, actions: ["View"] }
  - { name: "Pagination", kind: nav, actions: ["Previous", "Next"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/188.txt
  dom: dom/188.html
  a11y: a11y/188.yaml
  screenshot: screenshots/188.png
tags: [team, worker-profile, expenses, reimbursements, multi-currency, mxn]
---

## What this screen is
The **Expense Reimbursements** tab of a worker's profile (here **Paul Davis**): a table of
their submitted expenses with date, amount, description, and a **View** action per row.

## Capabilities shown
- Per-worker **expense list** with `Expense Date`, `Amount`, `Description`, and **View**
- Amounts shown in the worker's **local currency** (`MXN`) natively — e.g. `$1,965.88 MXN`
  office supply purchase, `$1,078.45 MXN` flight booking for a workshop
- Rich, itemized descriptions (office supplies, flights, hotels, client entertainment,
  software subscription renewals, internet charges for remote work)
- **Previous / Next** pagination across many entries (21 lines captured here)

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every expense a worker submits is itemized on their profile in their local currency, so you
  can offer reimbursement across your clients' cross-border staff **without adding an expense
  tool or an FX process** — PrismHR handles the currency natively.
- Line-item descriptions and dates give the reviewer full context, so this is a clean,
  low-lift capability to extend to clients inside the platform they already trust.

### For the SMB client (via their PEO)
- Your global team's expenses live right on each person's record, in the currency they were
  incurred, so reimbursing someone in Mexico works exactly like reimbursing anyone at home —
  the **same simple safety net, now global**.
- The full itemized list makes cross-border spend transparent and easy to review, with no
  manual conversion and no separate system to reconcile.

## Branching
- **If** multi-currency spend is the theme **then** anchor on the native `MXN` amounts per
  line and the absence of any conversion step.
- **If** the audience reviews expenses **then** open **View** on a row to show the individual
  expense detail.
- **If** volume is the concern **then** page through with **Next** to show the full expense
  ledger held per worker.

## Say-this (talk track)
> "Here are the worker's expense reimbursements — every submission with the date, the amount
> in their local currency, and what it was for, right down to the line item. You can open any
> one to review it. It's the same flow whether they're in Mexico or anywhere else you employ
> people, with no currency conversion to manage. For your PEO, that's another everyday capability
> you can extend to clients without building or bolting on a thing."

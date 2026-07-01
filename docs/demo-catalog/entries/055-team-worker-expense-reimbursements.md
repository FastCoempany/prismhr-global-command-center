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
The Expense Reimbursements tab of a worker's profile: a table of their submitted
expenses with date, amount, description, and a View action per row.

## Capabilities shown
- Per-worker **expense list** with Expense Date, Amount, Description, and **View**
- Amounts shown in the worker's **local currency** (MXN) natively
- Rich descriptions (office supplies, flights, hotels, client entertainment, software
  subscriptions, internet for remote work)
- Paginated across many entries

## Value narrative (product-led, not discovery)

### For service providers
- Every expense a worker submits is itemized on their profile in their local currency, so
  you can review and reimburse across clients and countries without a separate expense tool.
- Line-item descriptions and dates give you the context to approve each **View** without
  chasing the worker for details.

### For direct employers
- Your global team's expenses live right on each person's record, in the currency they
  incurred them, so reimbursing someone in Mexico works exactly like anyone else.
- The full itemized list makes cross-border spend transparent and easy to review.

## Branching
- **If** multi-currency spend is the theme **then** anchor on the native **MXN** amounts
  per line.
- **If** the audience reviews expenses **then** open **View** on a row to show the
  individual expense detail.

## Say-this (talk track)
> "Here are the worker's expense reimbursements — every submission with the date,
> amount in their local currency, and what it was for. You can open any one to review it.
> Same flow whether they're in Mexico or anywhere else you employ people."

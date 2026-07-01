---
id: "060"
title: Invoices
status: classified
type: page
module: invoices
nav_path: [Dashboard, Invoices]
parent: null
children_frontier:
  - "Invoice row drilldown (e.g. Jun 30, 2026 Monthly Contractors Fee)"
  - "Invoice detail: Download"
  - "Invoice detail: Send Email"
elements:
  - { name: "Invoices table", kind: table, actions: ["Open invoice"] }
  - { name: "Invoice detail panel", kind: drilldown, actions: ["Download", "Send Email"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/193.txt
  dom: dom/193.html
  a11y: a11y/193.yaml
  screenshot: screenshots/193.png
tags: [invoices, billing, eor, contractor, payroll, per-worker-fees]
---

## What this screen is
The billing ledger for the client, listing every PrismHR invoice by pay period, with a
detail view that itemizes an invoice down to per-worker fees.

## Capabilities shown
- Full invoice history in one table: **created date, invoice number, status, pay period,
  invoice type, total amount**
- Invoice types span the whole engagement mix — **EOR, Payroll, Contractor, Monthly
  Contractors Fee** — billed side by side
- Every invoice carries a status (all `Invoiced` here) and a native currency (USD)
- Drilldown to a formatted invoice showing PrismHR as biller, the client as **Bill To**,
  payment status (`Unpaid`), and **line items per worker** (e.g. `Monthly CONTRACTOR_PLUS
  Fee: Ximena Martin — $225.00`, `Monthly CONTRACTOR Fee: Alex Developer — $45.00`)
- Invoice actions: **Download** and **Send Email**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One ledger covers every global billing motion — **EOR, Payroll, Contractor, Monthly
  Contractors Fee** — through the same surface, so you extend into global with **zero build**
  and no separate billing system to stand up.
- Per-worker line items make every invoice self-explaining, so you can hand a client an
  invoice that spells out exactly who was charged and at which fee tier — a clean story that
  makes you the hero and reinforces the trusted PrismHR ecosystem.

### For the SMB client (via their PEO)
- Every cross-border charge lands in one running history you can open, **Download**, or
  **Send Email** — no chasing finance for backup, the same done-for-you simplicity your PEO
  gives you domestically.
- The itemized detail shows precisely what you are paying for each worker (e.g. `Monthly
  CONTRACTOR_PLUS Fee: Ximena Martin — $225.00`), so cost is transparent down to the
  individual whether you have one worker abroad or many.

## Branching
- **If** the client is fee-sensitive **then** open an invoice and walk the per-worker
  `CONTRACTOR` vs `CONTRACTOR_PLUS` line items to show fee transparency.
- **If** the client runs mixed EOR + contractor populations **then** stay on the list and
  point at the `INVOICE TYPE` column carrying all motions in one place.

## Say-this (talk track)
> "Here's every invoice on this account — EOR, payroll, contractors, all in one ledger. Open
> any one and it itemizes down to the individual worker and their fee tier, then you download
> it or email it. No separate billing tool, no reconciliation — the same clarity your PEO
> already gives you, now for your global spend."

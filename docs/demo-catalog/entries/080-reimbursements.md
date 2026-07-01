---
id: "080"
title: Reimbursements
status: classified
type: page
module: reimbursements
nav_path: [Dashboard, Reimbursements]
parent: null
children_frontier:
  - "Pending request: Approve"
  - "Pending request: Decline"
  - "Pending request: row drilldown (e.g. Nina Thompson)"
  - "Request detail: View Receipt"
  - "History tab"
  - "History: Export"
  - "History: worker row drilldown"
elements:
  - { name: "Section tabs", kind: nav, actions: ["Pending Requests", "History"] }
  - { name: "Pending Requests list", kind: card, actions: ["Approve", "Decline", "Open request"] }
  - { name: "Request detail panel", kind: drilldown, actions: ["View Receipt", "Approve", "Decline"] }
  - { name: "Receipt preview", kind: overlay, actions: ["Close"] }
  - { name: "History table", kind: table, actions: ["Export"] }
  - { name: "All Workers filter", kind: field, actions: ["Select worker"] }
  - { name: "Engagement filter", kind: field, actions: ["Filter by engagement"] }
  - { name: "Status filter", kind: field, actions: ["Filter by status"] }
  - { name: "Sort control", kind: field, actions: ["Sort"] }
states: [populated, empty]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/055.txt
  dom: dom/055.html
  a11y: a11y/055.yaml
  screenshot: screenshots/055.png
tags: [reimbursements, expenses, approvals, multi-currency, receipts, eor, contractor, payroll]
---

## What this screen is
The expense-reimbursement screen, with a Pending Requests queue to approve or decline and
a filterable History of all reimbursements, both spanning engagement types and currencies.

## Capabilities shown
- **Pending Requests** across engagement types (Contractor, Contractor+, EOR, Payroll)
  shown with **native currency side by side** — USD ($632.69), GBP (£1,190.15) — plus
  request date and note (e.g. "Internet charges for remote work")
- Inline **Approve / Decline** per request
- Row drilldown to a request detail showing worker, engagement, amount, client, expense
  date, note, and **View Receipt** — which opens a receipt image preview (Close)
- **History**: full ledger — name, date requested, date distributed (`Not Yet` when
  unpaid), expense date, notes, amount, status (`Approved by Demo Hr Manager`), paginated
  (763 results), with even more currencies (MXN, NIO, GBP)
- Filters by worker, **Engagement**, **Status**, a **Sort** control, date range, and **Export**
- Empty state ("No Pending Expense Reimbursements Requests")

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One reimbursement queue spans every engagement type (Contractor, Contractor+, EOR, Payroll) and currency, so the global expense motion you extend to clients runs on **PrismHR with zero build** — no separate system, no manual FX.
- Receipt preview plus an exportable 700+ row history gives each client an auditable expense trail with approver attribution, so you deliver enterprise-grade controls and look like the hero inside the PrismHR ecosystem they already use.

### For the SMB client (via their PEO)
- Every expense awaiting a decision is in one queue, in the currency it was incurred (USD, GBP, MXN, NIO), with the **receipt one click away** — approve or decline with full context, the same trusted safety net your PEO gives you domestically, now global.
- History with filters, sort, and export means every cross-border expense is traceable from request to distribution without chasing paperwork — simple whether you reimburse one worker or hundreds.

## Branching
- **If** multi-currency operations are the hot button **then** stay on Pending Requests and
  point at USD and GBP amounts side by side in one queue.
- **If** the buyer cares about audit and controls **then** open a request, show View
  Receipt, then flip to History and show the exportable trail with distribution status.

## Say-this (talk track)
> "Every expense that needs you is right here — across EOR, payroll, and contractors, each
> in the currency it was spent, no conversion in your head. Open one to see the receipt,
> then approve or decline. History keeps the whole trail — hundreds of records, filterable,
> exportable, with who approved and when it was paid."

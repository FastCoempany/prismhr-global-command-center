---
id: "208"
title: Worker Portal — Payments
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Payments]
parent: null
children_frontier:
  - "Banner: Link Bank Account"
  - "Payment row drilldown (payslip)"
elements:
  - { name: "Worker navigation", kind: nav, actions: ["Dashboard", "Payments", "Time Off", "Time Tracking", "Reimbursements", "Resources", "Logout"] }
  - { name: "Bank account banner", kind: banner, actions: ["Link Bank Account"] }
  - { name: "Payment filters", kind: field, actions: ["Start Date", "End Date", "Company", "Status", "Search"] }
  - { name: "Payments table", kind: table, actions: [] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/075.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/075.yaml
  screenshot: ""
tags: [worker-portal, self-service, payments, payslips, pay-history, employee-experience]
---

## What this screen is
The worker-facing pay history in the Worker Portal, where an employee views and filters their own past payments and payslips — shown empty ("No payments have been issued yet") for a new worker.

## Capabilities shown
- Self-service pay history for the end worker, filterable by `Start Date`, `End Date`, `Company`, and `Status` (with `Search`)
- Total-payments count (`TOTAL PAYMENTS: 0`) so the worker sees their full pay record at a glance (empty state: `No payments have been issued yet.`)
- A persistent `Link Bank Account →` prompt so pay can be deposited before the first run
- Worker-scoped view driven off the same data as the admin-side payroll

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The pay experience your clients' overseas workers get is fully self-serve — workers look up their own payslips across companies without a question routed anywhere — a transparency story you can promote that adds zero support load as you extend global.
- Every payment processed on the admin side surfaces to the worker automatically, so this polished payroll transparency comes free with the offering you resell.

### For the SMB client (via their PEO)
- Your overseas people answer their own "when was I paid / where's my payslip" questions instead of pinging the SMB, the same trusted, transparent record your PEO gives you domestically, now global.
- Filters by `Company` and date let a worker paid across entities see one consolidated pay record, done-for-you rather than assembled by the SMB.

## Branching
- **If** the buyer's workers are paid in multiple currencies or entities **then** emphasize the `Company` filter and unified pay history.
- **If** payroll-support volume is the pain **then** anchor on self-serve payslip retrieval deflecting routine requests off the SMB.
- **If** the worker is pre-first-run (empty state) **then** point to the `Link Bank Account →` prompt driving pay setup.

## Say-this (talk track)
> "Here's the worker's own pay history. They filter by company, date, and status and pull any payslip themselves — no email to the SMB or to you. Everything run on the admin side lands here automatically, so your client's overseas workers always have a transparent, self-serve record of how and when they were paid. That's the kind of polished experience that keeps clients happy and sticky."

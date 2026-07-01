---
id: "003"
title: Pay Period Approval
status: classified
type: page
module: dashboard
nav_path: [Dashboard, Pay Period Approval]
parent: "001"
children_frontier:
  - "Detailed Currency View (overlay)"
  - "Reimbursement Details (row drilldown, e.g. Pablo Contractorplus)"
  - "Import Distribution data"
  - "Add one-time distribution"
  - "Approve $58,579.23 USD (submits approval)"
elements:
  - { name: "Approve action", kind: button, actions: ["Approve $58,579.23 USD"] }
  - { name: "Import Distribution data", kind: button, actions: ["Import"] }
  - { name: "See detailed view", kind: button, actions: ["Open Detailed Currency View"] }
  - { name: "Additional Payments section", kind: table, actions: ["Worker", "Description", "Amount"] }
  - { name: "One time Payments section", kind: table, actions: ["Worker", "Description", "Amount"] }
  - { name: "Hourly Workers section", kind: table, actions: ["Billing rate", "Hours logged", "Approved hours", "Amount"] }
  - { name: "Fixed Rate Workers section", kind: table, actions: ["Billing rate", "Approved amount", "Amount"] }
  - { name: "Reimbursements section", kind: table, actions: ["Worker", "Description", "Date", "Status", "Amount"] }
  - { name: "Add one-time distribution", kind: button, actions: ["Add distribution"] }
  - { name: "Detailed Currency View", kind: overlay, actions: ["Global currency total", "Approx. (USD)"] }
  - { name: "Reimbursement Details", kind: overlay, actions: ["Amount", "Requested by", "Expense date", "Description", "Close"] }
states: [populated, detailed-currency-view, reimbursement-drilldown]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/032.txt
  dom: dom/032.html
  a11y: a11y/032.yaml
  screenshot: screenshots/032.png
tags: [pay-periods, approval, multi-currency, fx, hourly, fixed-rate, reimbursements, one-time-payment, contractor]
---

## What this screen is
The full approval view for a monthly pay period, itemizing every payment component — additional allowances, one-time payments, hourly and fixed-rate wages, and reimbursements — behind a single "Approve" action for the whole run's total.

## Capabilities shown
- One approvable total ("Approve $58,579.23 USD") covering an entire pay period in a single action
- Distinct itemized sections: Additional Payments (allowances), One time Payments (bonuses), Hourly Workers (rate x hours), Fixed Rate Workers (monthly rate, with proration noted, e.g. "prorated from starting date Jun 15, 2026"), and Reimbursements
- Line items across many currencies (USD, CAD, GBP, EGP) shown natively, including a one-time Equipment payment ($200.00) flowing in from the Add One-Time Payment flow
- **Detailed Currency View** overlay that rolls native amounts into a global total with an approximate USD conversion, flagged as an FX estimate that may fluctuate
- Per-row **Reimbursement Details** drilldown (amount, status, requester, expense date, description)
- "Import Distribution data" and "Add one-time distribution" to adjust the run before approving

## Value narrative (product-led, not discovery)

### For service providers
- The entire pay run — wages, bonuses, allowances, reimbursements, across currencies — resolves to one number and one approval, so you clear a client's period without reconciling separate systems.
- The Detailed Currency View turns a mixed-currency run into an auditable global total, which is exactly the multi-country visibility you resell.

### For direct employers
- You approve a whole month of global pay in one click, while still being able to open any line item — an hourly worker's hours, a reimbursement's receipt detail — before you commit.
- Native currencies plus an approximate USD roll-up mean you see both what each person is paid locally and what the run costs you overall.

## Branching
- **If** cost control / FX exposure is the theme **then** open the Detailed Currency View and anchor on the global total with its FX-estimate disclaimer.
- **If** the workforce mixes employment models **then** walk the Hourly, Fixed Rate, and One time Payment sections to show one queue absorbing every pay type.
- **If** expense governance matters **then** drill into a Reimbursement Details row to show the approved receipt trail feeding the same run.

## Say-this (talk track)
> "This is a full month of pay for the whole team — hourly hours, fixed salaries, allowances, bonuses, reimbursements, in every currency they were incurred. It all rolls into one number. Want to see it in one currency? Detailed view gives you the global total. Want to check a single receipt? Click the row. Then one Approve, and the period is cleared."

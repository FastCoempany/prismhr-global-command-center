---
id: "057"
title: Contract Detail
status: classified
type: drilldown
module: team
nav_path: [Team, "Worker profile", Contracts, "Contract detail"]
parent: "053"
children_frontier:
  - "Sign and send the contract"
  - "View Contract"
  - "Change Job Title (Update / View History)"
  - "Change Pay Rate (Update / View History)"
  - "Request Off-board / Off-board"
  - "Additional Payment: Edit / Delete"
elements:
  - { name: "Contract summary", kind: card, actions: ["View Contract"] }
  - { name: "Signatures", kind: card, actions: ["Sign and send the contract"] }
  - { name: "Change Job Title", kind: button, actions: ["Update", "View History"] }
  - { name: "Change Pay Rate", kind: button, actions: ["Update", "View History"] }
  - { name: "Off-board", kind: button, actions: ["Request Off-board", "Off-board"] }
  - { name: "Distributions table", kind: table, actions: [] }
  - { name: "Additional Payments", kind: card, actions: ["Edit", "Delete"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/228.txt
  dom: dom/228.html
  a11y: a11y/228.yaml
  screenshot: screenshots/228.png
tags: [team, contracts, contractor, signatures, pay-rate, off-board, distributions, multi-currency, usd]
---

## What this screen is
The full contract detail for a single worker's engagement, showing contract terms,
signature status, in-contract change actions (job title, pay rate, off-board), and a
complete distributions ledger.

## Capabilities shown
- Contract **summary**: worker type (Contractor), country (United Kingdom), rate
  ($3,909.97 USD/month), start date, payment frequency (Fixed Rate, last business day
  of month), job title, seniority, and scope of work
- **Signatures** section — Issuer and Contractor signatures with "Sign and send the
  contract"
- In-contract changes: **Change Job Title** and **Change Pay Rate**, each with
  **Update** and **View History**
- **Request Off-board / Off-board** to end the engagement
- **Distributions** ledger of every payout — Wages, One Time, Reimbursement — each with
  status (**GENERATED** / **SENT**), distribution date or confirmation number, and amount
  in local currency (USD)
- **Additional Payments** (recurring items like a monthly Transportation Allowance) with
  Edit / Delete

## Value narrative (product-led, not discovery)

### For service providers
- One screen holds the whole contract lifecycle — terms, signatures, mid-contract changes,
  additional payments, off-boarding, and the full distribution ledger — so you administer
  a client's engagement end to end without leaving it.
- **Change Pay Rate** and **Change Job Title** carry **View History**, giving an auditable
  trail of amendments you can defend to any client or authority.

### For direct employers
- Everything about a global engagement lives here: what you agreed, who has signed, every
  payment made (in the worker's currency), and how to change terms or off-board — all in
  one view.
- The distributions ledger shows exactly what was paid and when (GENERATED vs. SENT), so
  cross-border pay is fully transparent and traceable.

## Branching
- **If** the story is managing change over time **then** show **Change Pay Rate** with
  **View History** and the **Additional Payments** (Transportation Allowance).
- **If** the story is transparency / audit **then** scroll the **Distributions** ledger to
  show every Wages / One Time / Reimbursement line with status and amount.
- **If** the story is ending an engagement cleanly **then** point to **Request Off-board**.

## Say-this (talk track)
> "This is the whole contract in one place — the terms, the signatures, and every change
> you can make: adjust the job title or pay rate, each with a full history, add recurring
> payments, or off-board the worker. Below it is the complete distribution ledger — every
> wage, one-time payment, and reimbursement, with status and amount, right in their
> currency."

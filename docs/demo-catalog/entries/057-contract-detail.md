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
The full contract detail for a single worker's engagement (here **Aaron Taylor**, a UK
contractor), showing contract terms, signature status, in-contract change actions (job title,
pay rate, off-board), and a complete distributions ledger.

## Capabilities shown
- Contract **summary**: worker type (`Contractor`), country (`United Kingdom`), rate
  (`$3,909.97 USD/month`), start date (`Oct 11, 2025`), payment frequency (`Fixed Rate`,
  `Last Business Day Of The Month`), job title (`Direct Identity Strategist`), seniority
  (`Supervisor`), and scope of work
- **Signatures** section — `Issuer signature` and `Contractor signature` with
  **Sign and send the contract** and **View Contract**
- In-contract changes: **Change Job Title** and **Change Pay Rate**, each with **Update** and
  **View History**
- **Request Off-board** / **Off-board** to end the engagement
- **Distributions** ledger of every payout — `Wages`, `One Time`, `Reimbursement` — each with
  status (`GENERATED` / `SENT`), a distribution date or confirmation number, and amount in
  local currency (`USD`); recurring monthly wages of `$3,909.97 USD` are visible line by line
- **Additional Payments** — a recurring `Transportation Allowance` (`Monthly`, `$64.03 USD`,
  Fixed Payment) with **Edit** / **Delete**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One screen holds a client's entire contract lifecycle — terms, signatures, mid-contract
  changes, additional payments, off-boarding, and the full distribution ledger — so you can
  offer clients end-to-end management of a global engagement **without owning the entity or the
  paperwork**; PrismHR does.
- **Change Pay Rate** and **Change Job Title** each carry **View History**, giving an auditable
  amendment trail your clients can rely on — a trusted, defensible record inside your ecosystem.

### For the SMB client (via their PEO)
- Everything about a global engagement lives here: what you agreed, who has signed, every payment
  made in the worker's currency, and how to change terms or off-board — all in one view, **no
  legal team required**.
- The distributions ledger shows exactly what was paid and when (`GENERATED` vs. `SENT`), so
  cross-border pay is fully transparent and traceable — the same accountability your PEO gives
  you at home.

## Branching
- **If** the story is managing change over time **then** show **Change Pay Rate** with
  **View History** and the recurring **Additional Payments** (`Transportation Allowance`).
- **If** the story is transparency / audit **then** scroll the **Distributions** ledger to show
  every `Wages` / `One Time` / `Reimbursement` line with status and amount.
- **If** the story is ending an engagement cleanly **then** point to **Request Off-board**.

## Say-this (talk track)
> "This is the whole contract in one place — the terms, the signatures, and every change you can
> make: adjust the job title or pay rate, each with a full history, add a recurring payment like
> this transportation allowance, or off-board the worker. Below it is the complete distribution
> ledger — every wage, one-time payment, and reimbursement, with status and amount, right in the
> worker's currency. Your PEO can hand clients this level of control over a global engagement
> without ever owning the in-country entity — PrismHR does that part."

---
id: "053"
title: Worker Profile — Contracts
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Contracts]
parent: "050"
children_frontier:
  - "Contract card (open contract detail)"
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Contract card", kind: card, actions: ["Open contract"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/184.txt
  dom: dom/184.html
  a11y: a11y/184.yaml
  screenshot: screenshots/184.png
tags: [team, worker-profile, contracts, pay-rate, signatures, payroll]
---

## What this screen is
The Contracts tab of a worker's profile, showing the worker's contract as a card with
its pay rate, engagement/rate type, and current status.

## Capabilities shown
- Per-worker **contract card** with initials, pay rate, and status
- **Pay rate in local currency** with cadence (e.g. $66,272.69 MXN/month)
- Engagement/rate descriptor (**Payroll - Fixed rate**)
- Contract lifecycle **status** surfaced on the card (**Awaiting Signatures**)
- Card is the entry point into the full contract detail

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The in-country employment contract is generated and managed on PrismHR's platform — rate,
  engagement type, signing status — so your clients get compliant global agreements without
  you owning entities, drafting contracts, or building anything.
- The status chip (**Awaiting Signatures**) makes the state of any hire obvious at a glance,
  so onboarding across your book stays trackable with no added lift for you.

### For the SMB client (via their PEO)
- The commercial terms for a global hire — pay rate in local currency ($66,272.69
  **MXN**/month), **Payroll - Fixed rate** — live right on the worker's profile, so what
  you're paying and on what basis is never ambiguous.
- A visible **Awaiting Signatures** status makes it obvious when a contract still needs
  signing, so your first hire abroad moves forward with the same done-for-you clarity your
  PEO gives you at home.

## Branching
- **If** signature/approval flow is the point **then** open the card into the contract
  detail to show the Signatures section and pay-rate change.
- **If** keeping it high level **then** read the rate, type, and status off the card and move on.

## Say-this (talk track)
> "Here's the worker's contract — the rate in their local currency, MXN here, the fact
> it's a fixed-rate payroll engagement, and the status. This one's Awaiting Signatures, so
> it's not fully executed yet. Click in and you get the full contract. The point for your
> clients: PrismHR generates and manages the in-country agreement, so they get a compliant
> global contract without owning an entity or drafting a thing."

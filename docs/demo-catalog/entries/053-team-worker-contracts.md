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

### For service providers
- Each worker's contract, its rate, and its signing status are one click from the
  profile, so you can confirm terms and chase signatures without hunting in a separate
  contract system.
- The status chip (Awaiting Signatures) tells you immediately whether a contract is still
  blocking, across any client.

### For direct employers
- The commercial terms for a global hire — rate, cadence, type — live on their profile in
  their local currency, so what you're paying and on what basis is never ambiguous.
- A visible status makes it obvious when a contract still needs signatures to be complete.

## Branching
- **If** signature/approval flow is the point **then** open the card into the contract
  detail to show the Signatures section and pay-rate change.
- **If** keeping it high level **then** read the rate, type, and status off the card and move on.

## Say-this (talk track)
> "Here's the worker's contract — the rate in their local currency, the fact it's a
> fixed-rate payroll engagement, and the status. This one's Awaiting Signatures, so we
> know it's not fully executed yet. Click in and you get the full contract."

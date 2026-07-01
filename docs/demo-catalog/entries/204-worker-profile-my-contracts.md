---
id: "204"
title: Worker Profile / Contracts
status: classified
type: tab
module: worker-portal
nav_path: [Worker Portal, Profile, Contracts]
parent: "200"
children_frontier:
  - "Filter"
  - "Contract row drilldown (e.g. Engineer)"
elements:
  - { name: "Profile tabs", kind: nav, actions: ["Personal", "Contracts", "Bank & Tax Info", "Security", "Assignments"] }
  - { name: "Active Contracts count", kind: card, actions: [] }
  - { name: "Contracts list", kind: table, actions: ["Filter"] }
  - { name: "Contract row", kind: card, actions: [] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/071.txt
  dom: ""
  a11y: capture-output-topup/a11y/071.yaml
  screenshot: ""
tags: [worker-portal, profile, contracts, compensation, multi-currency, eor]
---

## What this screen is
The **Contracts** tab of the worker's own Profile, listing their active contract(s) with role, employer, pay type, compensation, country, and status.

## Capabilities shown
- **Active Contracts count** (`ACTIVE CONTRACTS: 1`) with a `Filter` control
- Per-contract detail: role (`Engineer`), employer (`Antaeus Service Provider - Main Client`), pay type (`Payroll`), **compensation in local currency** (`BZ$3,500.00 BZD/month`), country (`Belize`), and status (`Offer Accepted`)
- Native **multi-currency / in-country** contract display shown to the worker themselves

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Every overseas worker sees their own contract terms — role, pay, country, status — self-service, so the transparent experience you extend to clients needs zero build and generates zero status-chasing for anyone.
- Compensation renders in the local currency of the engagement, proof the global offering you're reselling handles genuinely cross-border contracts, not just domestic ones.

### For the SMB client (via their PEO)
- Your overseas hire has a single source of truth for their contract — what they're paid, in what currency, in which country — so the SMB doesn't field "what are my terms?" questions.
- Contract state (e.g. `Offer Accepted`) is visible to the worker, giving them the same trusted transparency your PEO provides domestically, now for a global hire, done-for-you.

## Branching
- **If** global / multi-country hiring is the hot button **then** emphasize the local-currency amount (`BZD`) and country (`Belize`) on the contract card.
- **If** transparency is the theme **then** point to worker-visible contract status and compensation resolving questions before they reach the SMB.
- **If** the workforce is larger **then** note the `Filter` control scaling the same view across many contracts.

## Say-this (talk track)
> "The worker pulls up their own contract — their role, that they're paid BZ$3,500 a month in Belize, and that their offer's accepted. Their SMB never gets asked about terms, and for you it's a transparent, in-currency, in-country experience you can promote to clients without building a thing."

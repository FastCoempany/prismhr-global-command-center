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
The Contracts tab of the worker's Profile, listing their active contract(s) with role,
employer, pay type, compensation, country, and status.

## Capabilities shown
- **Active Contracts count** (ACTIVE CONTRACTS: 1) with a Filter control
- Per-contract detail: role (Engineer), employer (Antaeus Service Provider – Main
  Client), pay type (Payroll), **compensation in local currency** (BZ$3,500.00 BZD/month),
  country (Belize), and status (Offer Accepted)
- Native **multi-currency / in-country** contract display for the worker

## Value narrative (product-led, not discovery)

### For service providers
- Every worker you administer can see their own contract terms — role, pay, country,
  status — without asking you to dig up the paperwork.
- Compensation shows in the local currency of the engagement, reinforcing that the
  platform handles genuinely global contracts, not just domestic ones.

### For direct employers
- Employees have a single source of truth for their contract: what they're paid, in what
  currency, in which country, and where the offer stands.
- Contract state (e.g. Offer Accepted) is transparent to the worker, reducing status
  questions to HR.

## Branching
- **If** global / multi-country hiring is the hot button **then** emphasize the
  local-currency amount and country on the contract card.
- **If** transparency is the theme **then** point to worker-visible contract status and
  compensation.

## Say-this (talk track)
> "The worker can pull up their own contract — their role, that they're paid BZ$3,500 a
> month in Belize, and that their offer's accepted. It's their contract, in their
> currency, in their country, visible to them without a single email to HR."

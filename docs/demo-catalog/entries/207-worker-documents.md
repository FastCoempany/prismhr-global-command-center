---
id: "207"
title: Worker Portal — My Documents
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Documents]
parent: null
children_frontier:
  - "Banner: Link Bank Account"
elements:
  - { name: "Worker navigation", kind: nav, actions: ["Dashboard", "Payments", "Time Off", "Time Tracking", "Reimbursements", "Resources", "Logout"] }
  - { name: "Bank account banner", kind: banner, actions: ["Link Bank Account"] }
  - { name: "My Documents list", kind: table, actions: [] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/078.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/078.yaml
  screenshot: ""
tags: [worker-portal, self-service, documents, employee-experience]
---

## What this screen is
The worker-facing document library inside the Worker Portal ("Switch to Worker"), where an employee retrieves their own contracts, payslips, and legal paperwork — shown empty here for a freshly onboarded worker.

## Capabilities shown
- Self-service document access for the end worker, on their own login
- A persistent bank-account prompt guiding the worker to complete their pay setup
- Worker-scoped context tied to the client ("Antaeus Service Provider - Main Client")
- Consistent worker nav (Dashboard, Payments, Time Off, Time Tracking, Reimbursements, Resources)

## Value narrative (product-led, not discovery)

### For service providers
- The experience your clients' employees get is a branded, self-serve document vault — workers pull their own paperwork without opening a ticket to you or your client's HR team.
- One portal covers documents across every client you run, so worker support scales without adding headcount.

### For direct employers
- Your workers see one place for every document you issue them — contracts and payslips live where the worker already logs in.
- The link-bank-account nudge keeps onboarding moving without HR chasing it manually.

## Branching
- **If** the buyer worries about worker support load **then** emphasize that document self-service deflects the routine "can I get a copy of my…" requests.
- **If** the worker is mid-onboarding (empty state) **then** point to the bank-account banner as the guided next step the portal drives on its own.

## Say-this (talk track)
> "This is what your workers see when they switch into their own portal. Every document you give them — contract, payslips, tax forms — lives right here, self-serve. Notice the portal is already nudging this new hire to link their bank account, so the pay setup finishes without anyone chasing them."

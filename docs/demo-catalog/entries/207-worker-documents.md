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
- Self-service **My Documents** library for the end worker, on their own login (shown empty for a freshly onboarded worker)
- A persistent `Link Bank Account →` prompt guiding the worker to complete their pay setup
- Worker-scoped context tied to the client (`Antaeus Service Provider - Main Client`)
- Consistent worker nav (`Dashboard`, `Payments`, `Time Off`, `Time Tracking`, `Reimbursements`, `Resources`)

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The experience your clients' overseas workers get is a polished, self-serve document vault — workers pull their own paperwork without a ticket — a differentiator you can promote that makes clients stickier with zero build.
- One portal covers documents across every client's workforce, so a happier worker experience scales as you extend global to your book without adding support headcount.

### For the SMB client (via their PEO)
- Your overseas hire sees one place for every document you issue them — contracts, payslips, tax forms — so the SMB doesn't field "can I get a copy of my…" requests.
- The `Link Bank Account →` nudge keeps onboarding moving on its own, the guided, done-for-you next step so the SMB isn't chasing pay setup.

## Branching
- **If** the buyer worries about worker support load **then** emphasize that document self-service deflects routine copy requests off the SMB entirely.
- **If** the worker is mid-onboarding (empty state) **then** point to the `Link Bank Account →` banner as the guided next step the portal drives itself.
- **If** the PEO wants a differentiator **then** frame the branded self-serve vault as something they promote to clients.

## Say-this (talk track)
> "This is what your client's overseas workers see when they switch into their own portal. Every document — contract, payslips, tax forms — lives right here, self-serve, so the SMB never has to hand copies out. Notice the portal is already nudging this new hire to link their bank account, so pay setup finishes without anyone chasing them. For you, that polished worker experience is exactly the kind of thing you can promote to clients."

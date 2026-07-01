---
id: "200"
title: Worker Dashboard (Home)
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Dashboard]
parent: null
children_frontier:
  - Time Off
  - Time Tracking
  - Reimbursements
  - Payments
  - Resources
  - "Onboarding: Continue (Complete Profile Details / Add Bank Account Details)"
  - "Links: Contracts"
  - "Banner: Link Bank Account"
  - "Header: account menu (Switch to Client, Profile, Sign out)"
elements:
  - { name: "Primary navigation", kind: nav, actions: ["Dashboard", "Payments", "Time Off", "Time Tracking", "Reimbursements", "Resources", "Worker Portal", "Logout"] }
  - { name: "Bank account banner", kind: header, actions: ["Link Bank Account"] }
  - { name: "Onboarding task card", kind: card, actions: ["Continue"] }
  - { name: "Reminders card", kind: card, actions: [] }
  - { name: "Upcoming Payments card", kind: card, actions: [] }
  - { name: "Links card", kind: card, actions: ["Time Off", "Track Time", "Reimbursement", "Contracts"] }
  - { name: "Account menu", kind: header, actions: ["Switch to Client", "Profile", "Sign out"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/061.txt
  dom: ""
  a11y: capture-output-topup/a11y/061.yaml
  screenshot: ""
tags: [worker-portal, self-service, onboarding, employee-experience, eor]
---

## What this screen is
The post-login home an SMB's international hire lands on ("Hello, Antaeus Coe!"), scoped to their client ("Antaeus Service Provider - Main Client"), surfacing onboarding progress, reminders, next payday, and quick links to self-service actions.

## Capabilities shown
- **Guided onboarding** with a `0% COMPLETED` tracker and a `Next up: Complete Profile Details` step (Complete Profile Details → Add Bank Account Details), driven from a **Continue** button
- Persistent **Link Bank Account** banner ("You need to set your Bank Account") until payment setup is done
- **Upcoming Payments** card showing next payday (`Friday, Jul 31`) and pay period (`Jul 1 - Jul 31`), client-labeled
- **Reminders** card ("Don't forget to track your time.")
- **Links** launchpad — **Time Off**, **Track Time**, **Reimbursement**, **Contracts** — each with a plain-language description
- Worker-scoped primary nav: **Dashboard**, **Payments**, **Time Off**, **Time Tracking**, **Reimbursements**, **Resources**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- This polished, self-service worker home is a differentiator you can promote to your PEO clients — the same trusted, guided experience they already get domestically, now for their overseas people, with zero build on your side.
- Workers who onboard and self-serve themselves mean less admin and happier clients — a stickier, more retained book that you extended into global without owning entities or experts.

### For the SMB client (via their PEO)
- Your international hire lands on a branded home that walks them through onboarding and tells them exactly when they're paid, so your team isn't the help desk for people in another country.
- Every common question — "when do I get paid, how do I request time off, where's my contract" — is answered from one screen the worker owns, done-for-you.

## Branching
- **If** the client worries about supporting overseas hires **then** anchor on the Links launchpad and Upcoming Payments as pure self-service the worker drives alone.
- **If** onboarding a first international employee is the concern **then** lead with the `0% COMPLETED` tracker and the `Next up` Continue flow that guides the worker step by step.

## Say-this (talk track)
> "This is what your client's overseas hire sees the moment they log in — a clean, branded home that guides them through onboarding, shows them their next payday, and puts time off, timesheets, reimbursements, and their contract one click away. Your PEO client gets to give their international people the same polished safety net they already give domestically, and neither you nor they had to build a thing to do it."

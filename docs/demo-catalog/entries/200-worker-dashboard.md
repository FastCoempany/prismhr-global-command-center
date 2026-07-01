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
The post-login home for an end worker (Antaeus Coe), scoped to their employer of
record ("Antaeus Service Provider – Main Client"), surfacing onboarding progress,
reminders, next payday, and quick links to self-service actions.

## Capabilities shown
- **Guided onboarding** with a percent-complete tracker and a "Next up" step (Complete
  Profile Details → Add Bank Account Details), driven from a Continue button
- Persistent **Link Bank Account** banner until payment setup is done
- **Upcoming Payments** card showing next payday and pay period, employer-labeled
- **Reminders** (e.g. track your time) surfaced on the home screen
- **Links** launchpad to Time Off, Track Time, Reimbursement, and Contracts
- Account menu to **Switch to Client** view, open Profile, and sign out

## Value narrative (product-led, not discovery)

### For service providers
- The self-service worker experience your clients' employees get is built in — one
  branded home that onboards them, tells them when they're paid, and routes every
  common action, with no extra portal for you to build or support.
- The single sign-on flips between Client and Worker views, so the same platform serves
  both your admin operators and the workers they pay.

### For direct employers
- New hires land on a guided onboarding flow that walks them to a completed profile and
  linked bank account without HR chasing them.
- Employees answer their own "when do I get paid, how do I request time off, where's my
  contract" questions from one screen, cutting inbound HR load.

## Branching
- **If** onboarding/time-to-productivity is the hot button **then** anchor on the
  percent-complete tracker and the "Next up" Continue flow.
- **If** the buyer worries about worker support burden **then** lead with the Links
  launchpad and Upcoming Payments as pure self-service deflection.

## Say-this (talk track)
> "This is what your workers see when they log in. They're guided through onboarding
> step by step, they can see exactly when their next payday is, and every common
> request — time off, timesheets, reimbursements, contracts — is one click away. It's a
> self-service experience your people get out of the box, so your team isn't fielding
> the same questions over and over."

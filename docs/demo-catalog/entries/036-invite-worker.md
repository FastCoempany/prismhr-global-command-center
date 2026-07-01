---
id: "036"
title: Invite Worker
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Invite Worker"]
parent: "035"
children_frontier:
  - "Onboarding Success (after Send Invite Now)"
elements:
  - { name: "Invite prompt", kind: card, actions: ["Invite {name} to join PrismHR (email prefilled)"] }
  - { name: "Send invite", kind: button, actions: ["Send Invite Now"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/044.txt
  dom: capture-output-topup/dom/044.html
  a11y: capture-output-topup/a11y/044.yaml
  screenshot: capture-output-topup/screenshots/044.png
tags: [new-hire, onboarding, invite, worker-portal, self-service]
---

## What this screen is
The post-onboard hand-off: a **"What's next?"** screen that invites the newly created
worker to join PrismHR at their captured email.

## Capabilities shown
- Prefilled invite to the new worker (name and email carried from the wizard —
  Antaeus / antaeus.coe@prismhr.com)
- Single action: **Send Invite Now**
- Scoped to the client context ("Antaeus Service Provider - Main Client")

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The moment the hire is approved, the worker is pulled into self-service onboarding —
  neither you nor your client chases email addresses or sets up portal access by hand, so
  extending into global stays genuinely low-lift.
- The whole hand-off is one button in the same trusted platform, so your client looks like
  the hero to their new international employee with zero effort from your team.

### For the SMB client (via their PEO)
- One click — **`Send Invite Now`** — hands the rest of onboarding to the employee: they
  complete their own profile so they can start getting paid, no legal team or manual setup
  on your side.
- The invite goes to the email already captured in the wizard (e.g. antaeus.coe@prismhr.com),
  so nothing is re-keyed and the new hire's first experience is smooth.

## Branching
- **If** self-service onboarding is the point **then** send the invite live and show the
  Success screen's "what happens next" for the employee.

## Say-this (talk track)
> "The hire's approved, so here's what's next — your client invites the employee to join.
> One click, the invite goes to the email we already captured, and the new hire finishes
> their own profile. No portal setup, no chasing — the client just made a global hire and
> looks like a hero doing it."

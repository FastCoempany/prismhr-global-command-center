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

### For service providers
- The moment the hire is approved, the worker gets pulled into self-service onboarding —
  your team doesn't chase email addresses or set up portal access by hand.

### For direct employers
- One click hands the rest of onboarding to the employee: they complete their own
  profile so they can start getting paid.

## Branching
- **If** self-service onboarding is the point **then** send the invite live and show the
  Success screen's "what happens next" for the employee.

## Say-this (talk track)
> "The hire's done, so here's what's next — we invite the employee to join. One click,
> the invite goes to the email we already captured, and they finish their own profile."

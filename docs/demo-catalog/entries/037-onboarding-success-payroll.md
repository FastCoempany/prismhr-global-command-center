---
id: "037"
title: Onboarding Success (Payroll)
status: classified
type: page
module: onboarding
nav_path: [New Hire, Employee, Payroll, "Onboarding Success"]
parent: "036"
children_frontier:
  - "Dashboard (Go to Dashboard)"
elements:
  - { name: "Success confirmation", kind: card, actions: [] }
  - { name: "What happens next", kind: card, actions: ["Invitation to Join PrismHR", "Employee Information (completes profile → receives payments)"] }
  - { name: "Support link", kind: card, actions: ["Contact us"] }
  - { name: "Return", kind: button, actions: ["Go to Dashboard"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/045.txt
  dom: capture-output-topup/dom/045.html
  a11y: capture-output-topup/a11y/045.yaml
  screenshot: capture-output-topup/screenshots/045.png
tags: [onboarding, payroll, success, confirmation, next-steps]
---

## What this screen is
The terminal **Success!** screen of the Payroll new-hire path, confirming the hire and
laying out what happens next.

## Capabilities shown
- Explicit "**Success!**" confirmation that the payroll hire is complete
- **"Here's what happens next"** steps:
  - **Invitation to Join PrismHR** — the employee receives an invite to the platform
  - **Employee Information** — once they complete their profile, they can start
    receiving payments
- Reassurance ("We'll keep you updated every step of the way") and a **Contact us**
  support link
- **Go to Dashboard** returns the admin to the approvals home

## Value narrative (product-led, not discovery)

### For service providers
- Closes the loop with a clear statement of what the platform now does on its own —
  invite the worker, collect their profile, enable payment — so your team can move to the
  next client.

### For direct employers
- You know exactly what's left before the employee gets paid (they complete their
  profile) and that PrismHR drives the remaining steps.

## Branching
- **If** the demo is showing the end-to-end motion **then** land here to prove the hire
  is complete and pivot to Go to Dashboard and the approvals home.

## Say-this (talk track)
> "Done. From here the platform invites the employee, they complete their profile, and
> they're ready to be paid — we keep you updated the whole way. Back to the dashboard."

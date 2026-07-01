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
The terminal **Success!** screen of the Payroll new-hire path, confirming the hire and laying out exactly what the platform does next.

## Capabilities shown
- Explicit "**Success!**" confirmation that the payroll hire is complete
- **"Here's what happens next"** steps:
  - **Invitation to Join PrismHR** — "The employee will receive an invitation to join the PrismHR platform."
  - **Employee Information** — "Once the employee completes their profile, they can start receiving payments."
- Reassurance ("We'll keep you updated every step of the way") and a **Contact us** support link
- **Go to Dashboard** returns the admin to the approvals home

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The screen closes the loop by stating what PrismHR now does on its own — invite the worker, collect their profile, enable payment — so your client's team never touches the mechanics and you deliver a hero moment with zero added lift.
- A finished hire that runs itself from here is the proof point you want in front of your book: refer the client, PrismHR carries it to payment.

### For the SMB client (via their PEO)
- You see exactly what's left before your new hire gets paid — they complete their profile — and that PrismHR drives every remaining step, so nothing is left on your desk.
- The confirmation and **Contact us** link mean the same done-for-you safety net your PEO gives you domestically is clearly carrying this global hire to completion.

## Branching
- **If** the demo is showing the end-to-end motion **then** land here to prove the hire is complete, then click **Go to Dashboard** to return to the approvals home.
- **If** the client worries about follow-up work **then** point at the two "what happens next" steps as the guaranteed, hands-off path to a paid worker.

## Say-this (talk track)
> "Done. From here the platform invites the employee to join PrismHR, they complete their profile, and they're ready to be paid — and we keep you updated every step of the way. Nothing else lands on your client's desk. Back to the dashboard."

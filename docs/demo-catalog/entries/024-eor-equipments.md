---
id: "024"
title: EOR — Equipment
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, Equipment]
parent: "023"
children_frontier:
  - "EOR wizard: Benefits (Next)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "Equipment policy", kind: field, actions: ["Client wants to provide the equipment", "New hire will use their personal equipment for work", "Client will provide a reimbursement for equipment purchase"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/132.txt
  dom: dom/132.html
  a11y: a11y/132.yaml
  screenshot: screenshots/132.png
tags: [new-hire, eor, equipment, policy]
---

## What this screen is
Step 04 of the EOR wizard: choose the **equipment policy** for the new hire from a single
dropdown.

## Capabilities shown
- One dropdown captures how equipment is handled, with three options:
  - the client provides the equipment,
  - the new hire uses their personal equipment for work, or
  - the client provides a reimbursement for equipment purchase
- Option labels are scoped to the client name (e.g. "Antaeus Service Provider - Main Client")

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Equipment handling is a single per-hire policy field, and the options are labeled with the
  specific client (e.g. `Antaeus Service Provider - Main Client`) — the flow stays scoped to
  whose hire it is across your whole book.
- `will provide a reimbursement for equipment purchase` ties device provisioning back into the
  same pay/reimbursement machinery, so global hires need no separate tooling from you.

### For the SMB client (via their PEO)
- Deciding who supplies the laptop is one dropdown, not a side conversation — the answer travels
  with the offer.
- BYO-device (`use their personal equipment for work`) and reimbursement models are first-class
  options, so remote and in-office setups abroad are both covered without leaving the wizard.

## Branching
- **If** the client runs a BYO-device or reimbursement model **then** show that option and
  connect `provide a reimbursement for equipment purchase` to the dashboard reimbursements flow.
- **If** equipment isn't a talking point **then** treat this as a quick single-select step and
  move to `Benefits`.

## Say-this (talk track)
> "Equipment is one dropdown. Your client provides it, the hire uses their own, or your client
> reimburses them — pick one and it's baked into the offer. No separate procurement thread, no
> extra system for you to run."

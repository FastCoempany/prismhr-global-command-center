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

### For service providers
- Equipment handling is a per-hire policy captured in one field, and the options are labeled
  with the specific client — the flow stays scoped to whose hire this is.
- Reimbursement-for-equipment is a built-in choice, so device provisioning ties back into the
  same pay/reimbursement machinery you already run.

### For direct employers
- Deciding who supplies the laptop is a single dropdown, not a side conversation — the answer
  travels with the offer.
- BYO-device and reimbursement models are first-class options, so remote and in-office setups
  are both covered without leaving the wizard.

## Branching
- **If** the audience runs a BYO-device or reimbursement model **then** show that option and
  connect it to the reimbursements flow shown on the dashboard.
- **If** equipment isn't a talking point **then** treat this as a quick single-select step and
  move to Benefits.

## Say-this (talk track)
> "Equipment is one dropdown. You provide it, they use their own, or you reimburse them — pick
> one and it's baked into the offer. No separate procurement thread."

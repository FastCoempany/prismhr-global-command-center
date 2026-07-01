---
id: "027"
title: Contractor — Contractor Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, Contractor, "Contractor Info"]
parent: "020"
children_frontier:
  - "Contractor wizard: Job Info (Next)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Contractor Info", "Job Info", "Compensation", "Review"] }
  - { name: "First name", kind: field, actions: [] }
  - { name: "Last name", kind: field, actions: [] }
  - { name: "Email address", kind: field, actions: [] }
  - { name: "Tax residence", kind: field, actions: ["Select a Country (175+ countries incl. sub-regions: Canada provinces, Australia states, China Shanghai/Guangzhou, Switzerland Geneva/Zurich)"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Next"] }
states: [empty, "filled"]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/161.txt
  dom: dom/161.html
  a11y: a11y/161.yaml
  screenshot: screenshots/161.png
tags: [new-hire, contractor, global-hiring, tax-residence, country-selection]
---

## What this screen is
Step 01 of the four-step Contractor wizard: capture the contractor's name, email, and **tax
residence**; this information is used to send the contract.

## Capabilities shown
- Four-step progress stepper (Contractor Info → Job Info → Compensation → Review)
- **Tax residence** picker covering 175+ countries, including sub-national jurisdictions
  (Canadian provinces, Australian states, China Shanghai/Guangzhou, Switzerland Geneva/Zurich)
- Note that the entered details are used to send the contract
- Save & Exit to resume the draft later

## Value narrative (product-led, not discovery)

### For service providers
- The contractor motion opens with tax residence, so the engagement is anchored to the right
  jurisdiction from field one — the basis for compliant classification you resell.
- The same 175+ country reach as the employee path means one product covers a client's whole
  contractor base, anywhere.

### For direct employers
- Onboarding a contractor abroad starts with just name, email, and tax residence — the contract
  is generated from there.
- Global coverage down to sub-region level means engaging a contractor in another country is a
  form, not a project.

## Branching
- **If** the audience engages contractors globally **then** open the tax-residence list to show
  the 175+ country reach mirroring the employee path.
- **If** speed is the theme **then** show how three fields are enough to start generating the
  contract.

## Say-this (talk track)
> "Contractors start the same way — name, email, and tax residence. That last one anchors the
> whole engagement to the right country, and the list is the same 175-plus we saw for employees.
> Three fields and we're ready to build the contract."

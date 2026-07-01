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
Step 01 of the four-step Contractor wizard: capture the contractor's **First name**, **Last name**, **Email address**, and **Tax residence** — the details used to generate and send the contract.

## Capabilities shown
- Four-step progress stepper: **Contractor Info** → **Job Info** → **Compensation** → **Review**
- **Tax residence** picker covering **175+ countries**, including sub-national jurisdictions (Canadian provinces, Australian states, China Shanghai/Guangzhou, Switzerland Geneva/Zurich)
- Just three fields plus tax residence; the entered details are used to send the contract
- **Save & Exit** to park the draft and resume later, or **Next** to continue

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Your SMB client can engage a contractor in any of 175+ countries from the same platform you already deliver — no in-country entity, no legal team, and zero build on your side, since PrismHR owns the compliance behind that tax-residence list.
- The contractor path opens exactly like the employee path (name, email, jurisdiction), so it's one simple story to promote across your book: refer, and PrismHR delivers global hiring.

### For the SMB client (via their PEO)
- Anchoring on **Tax residence** from field one means the engagement is classified against the right country automatically — done-for-you compliance instead of research you can't afford to get wrong.
- Whether it's your first international contractor or your fiftieth, engaging one abroad is three fields and a country, not a legal project — the same trusted safety net your PEO gives you domestically, now global.

## Branching
- **If** the client's contractors span multiple countries **then** open the **Tax residence** list to show the 175+ country reach, sub-region level included, all covered by PrismHR's in-country entities.
- **If** speed is the theme **then** show that name, email, and tax residence are enough to start generating the contract.

## Say-this (talk track)
> "Contractors start the same simple way — first name, last name, email, and tax residence. That last field anchors the whole engagement to the right country, and the list is 175-plus countries deep, right down to provinces and states. PrismHR already owns the entities and the compliance behind every one of them, so your client just tells us who and where, and we build the contract from there."

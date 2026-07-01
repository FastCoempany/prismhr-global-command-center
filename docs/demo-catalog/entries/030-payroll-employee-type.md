---
id: "030"
title: Payroll — Employee Type (Payroll vs EOR)
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, "Employee type"]
parent: null
children_frontier:
  - "Onboard Employer of Record (EOR path)"
  - "Onboard to Payroll (Payroll path → Employee Info)"
elements:
  - { name: "Worker type", kind: field, actions: ["Employee (Select Employee)", "Contractor (Select Contractor)"] }
  - { name: "Employee type", kind: field, actions: ["Employer of Record (EOR) — Onboard Employer of Record", "Payroll — Onboard to Payroll"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/027.txt
  dom: capture-output-topup/dom/027.html
  a11y: capture-output-topup/a11y/027.yaml
  screenshot: capture-output-topup/screenshots/027.png
tags: [new-hire, payroll, eor, worker-type, engagement-model]
---

## What this screen is
The engagement-model fork in the New Hire flow: after choosing **Employee** (vs
Contractor), the admin chooses whether PrismHR is the **Employer of Record (EOR)** or
whether the employee is run on the client's **own entity via Payroll**.

## Capabilities shown
- Question framed plainly: **"What type of employee?"** with two cards
- **Employer of Record (EOR)** — "PrismHR hires the employee in-country as the employer
  of record on your behalf"; action **`Onboard Employer of Record`**. No local entity
  required.
- **Payroll** — "Administer payroll, deliver benefits, and oversee contracts for your
  own entities"; action **`Onboard to Payroll`**. The client already has an in-country
  entity.
- Both branches live inside the same New Hire wizard — one flow, one platform, chosen
  per hire

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One platform covers both models across your client book — clients with a local entity
  run **Payroll**, clients without one use **EOR** — so you extend into global with zero
  build and no in-house global specialists.
- The fork is self-service and explicit, so a client's first international hire doesn't
  need a country-by-country consult from you — the same trusted PrismHR ecosystem your
  clients already know just widens to global.

### For the SMB client (via their PEO)
- If you have a local entity abroad, keep it and run **Payroll** through PrismHR; if you
  don't, hand the hire to **EOR** — either way you're hiring compliantly without standing
  up a legal team.
- One decision, made once at the top of the flow, and PrismHR carries the rest — the
  same done-for-you safety net your PEO gives you domestically, now for a hire overseas.

## Branching
- **If** the client already has an in-country entity **then** take **`Onboard to
  Payroll`** and run the payroll wizard (Employee Info → Job → Compensation → Agreement
  → Review).
- **If** the client has no local entity **then** take **`Onboard Employer of Record`**
  and PrismHR employs the worker in-country on their behalf.

## Say-this (talk track)
> "First we say this is an employee, not a contractor. Then one question: does your
> client have a local entity in that country, or not? If they do, we run payroll on their
> entity. If they don't, PrismHR becomes the employer of record for them — no entity, no
> legal team required. Same platform your clients already trust, you just pick the model
> per hire."

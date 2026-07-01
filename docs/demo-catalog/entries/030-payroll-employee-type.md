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
whether the employee is run on the customer's **own entity via Payroll**.

## Capabilities shown
- Two-level worker classification: first **Employee vs Contractor**, then, for
  employees, **EOR vs Payroll**
- **EOR**: "PrismHR hires the employee in-country as the employer of record on your
  behalf" — no local entity required
- **Payroll**: "Administer payroll, deliver benefits, and oversee contracts for your
  own entities" — the customer already has an in-country entity
- Both paths advertised across **180+ countries**

## Value narrative (product-led, not discovery)

### For service providers
- One product covers both models — resell EOR where the client has no entity and run
  payroll on the client's own entities where they do, without switching platforms.
- The fork makes the choice explicit and self-service, so onboarding a worker doesn't
  require your team to route the deal to a specialist first.

### For direct employers
- Where you already have a local entity, keep it and run payroll, benefits, and
  contracts through PrismHR; where you don't, hand the hire to EOR — same flow, same
  screens.
- The model decision is made once, up front, and drives the rest of the wizard.

## Branching
- **If** the customer has in-country entities **then** take the **Onboard to Payroll**
  branch and follow the payroll wizard (Employee Info → Job → Compensation → Agreement
  → Review).
- **If** they have no local entity **then** point at **Onboard Employer of Record** and
  cross-reference the EOR wizard.

## Say-this (talk track)
> "First we say this is an employee, not a contractor. Then one decision: do you have a
> local entity or not? If you do, we run payroll on your entity. If you don't, we become
> the employer of record for you. Same platform, you pick the model per hire."

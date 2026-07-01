---
id: "028"
title: Contractor — Job Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, Contractor, "Job Info"]
parent: "027"
children_frontier:
  - "Contractor wizard: Compensation (Next)"
  - "Assign Manager"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Contractor Info", "Job Info", "Compensation", "Review"] }
  - { name: "Job title", kind: field, actions: [] }
  - { name: "Seniority", kind: field, actions: ["Not Applicable", "Junior", "Mid", "Senior", "Lead", "Principal", "Director", "Department Head", "Vice President", "Senior Vice President"] }
  - { name: "Job description", kind: field, actions: [] }
  - { name: "Division", kind: field, actions: ["Select division", "Engineering Division", "Product Division"] }
  - { name: "Location", kind: field, actions: ["Unassigned", "San Francisco Office", "New York Office"] }
  - { name: "Reporting Manager", kind: field, actions: ["Assign Manager"] }
  - { name: "Start date", kind: field, actions: ["date picker"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "filled"]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/166.txt
  dom: dom/166.html
  a11y: a11y/166.yaml
  screenshot: screenshots/166.png
tags: [new-hire, contractor, job, seniority, org-structure, start-date]
---

## What this screen is
Step 02 of the Contractor wizard: describe the engagement — **Job title**, **Seniority**, **Job description**, optional **Division** and **Location**, **Reporting Manager**, and **Start date**.

## Capabilities shown
- **Seniority** ladder identical to the employee path: Not Applicable, Junior, Mid, Senior, Lead, Principal, Director, Department Head, Vice President, Senior Vice President
- **Job description** carried into the agreement ("included in the original agreement so please be descriptive")
- Optional org assignment: **Division** (Engineering / Product) and **Location** (Unassigned / San Francisco / New York)
- **Reporting Manager** auto-assigned by org structure, or set via **Assign Manager**
- **Start date** with a note that visa and/or work-permit requirements may cause delays
- Wizard actions: **Save & Exit**, **Exit**, **Back**, **Next**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Contractors are described with the same structured role fields as employees, so your client's mixed workforce — domestic and global, contractor and EOR — lives in one consistent shape you can support without a separate playbook.
- The visa/work-permit note is a live example of the in-country expertise PrismHR bakes in, so you extend your clients into global engagements without owning any of that specialist knowledge yourself.

### For the SMB client (via their PEO)
- Defining a contractor uses the same seniority and org tools as any hire — no separate mental model, no learning curve, just the trusted flow your PEO already gives you, now reaching abroad.
- The **Job description** flows straight into the original agreement, so scope is documented exactly where the contract is generated — done-for-you paperwork instead of drafting terms yourself.

## Branching
- **If** the client runs mixed employee/contractor teams **then** highlight that the job step mirrors the employee path so onboarding feels identical regardless of worker type.
- **If** scope or agreement clarity matters **then** emphasize that the **Job description** is written directly into the original agreement.

## Say-this (talk track)
> "The contractor's role is captured just like an employee's — same seniority ladder, same division and location, same manager assignment. What you write in the description goes straight into the agreement, so scope is on paper from the start. And notice the start-date note about visas and work permits — that's the kind of in-country detail PrismHR handles so your client never has to."

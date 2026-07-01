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
Step 02 of the Contractor wizard: describe the engagement — job title, seniority, job
description, optional division/location, reporting manager, and start date.

## Capabilities shown
- Same **seniority** ladder as the employee path: Not Applicable, Junior, Mid, Senior, Lead,
  Principal, Director, Department Head, Vice President, Senior Vice President
- Job description carried into the agreement ("included in the original agreement so please be
  descriptive")
- Optional org assignment: Division (Engineering / Product) and Location (Unassigned / San
  Francisco / New York)
- Reporting Manager auto-assigned by org structure, or set via **Assign Manager**
- Start date with a note that visa and/or work-permit requirements may cause delays

## Value narrative (product-led, not discovery)

### For service providers
- Contractors are described with the same structured role fields as employees, so a mixed
  workforce lives in one consistent shape across your clients.
- Org placement and reporting manager attach to the contractor too, keeping approvals and
  structure uniform regardless of worker type.

### For direct employers
- Defining a contractor engagement uses the same seniority and org tools as an employee hire —
  no separate mental model for contractors.
- The role description flows straight into the agreement, so scope is documented where the
  contract is generated.

## Branching
- **If** the audience runs mixed employee/contractor teams **then** highlight that the job step
  mirrors the EOR path for consistency.
- **If** scope/agreement clarity matters **then** emphasize that the description is written into
  the original agreement.

## Say-this (talk track)
> "The contractor's role is captured just like an employee's — same seniority ladder, same org
> placement, same manager assignment. What you write here as the description goes straight into
> the agreement, so scope is on paper from the start."

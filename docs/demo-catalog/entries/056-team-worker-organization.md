---
id: "056"
title: Worker Profile — Organization (Assignments)
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Assignments]
parent: "050"
children_frontier:
  - "Create assignment"
  - "Reporting Line (view)"
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Org view toggle", kind: nav, actions: ["Organization Structure", "Assignments", "Reporting Line"] }
  - { name: "Org structure graph", kind: overlay, actions: ["Drag to pan", "Scroll to zoom"] }
  - { name: "Create assignment", kind: button, actions: ["Create assignment"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/190.txt
  dom: dom/190.html
  a11y: a11y/190.yaml
  screenshot: screenshots/190.png
tags: [team, worker-profile, organization, assignments, reporting-line, org-structure]
---

## What this screen is
The **Assignments** tab (Organization) of a worker's profile (here **Paul Davis**): a visual
org structure showing the divisions, departments, and sub-departments assigned to the worker,
with views for structure, assignments, and reporting line.

## Capabilities shown
- Three views: **Organization Structure**, **Assignments**, and **Reporting Line**
- Interactive **org graph** with the categories assigned to this worker highlighted
  (`Engineering Division` / `Backend Development`, `Product Division` / `Product Design`)
- Category tiers: `DIVISION`, `DEPARTMENT`, `SUB_DEPARTMENT`
- **Create assignment** to attach the worker to org categories
- Pan/zoom canvas (`Drag to pan · Scroll to zoom`)

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Each of your clients' workers can be placed into a real org structure — divisions,
  departments, reporting lines — so you can offer full org modeling and reporting inside the
  **same platform that runs their global pay**, with nothing to build.
- Because assignments and reporting line live on the worker record, org context travels with
  the person, so your clients aren't pushed into a separate HRIS to see how their team is structured.

### For the SMB client (via their PEO)
- You can see and set where a global team member sits in your organization and who they report
  to, so structure isn't lost just because someone is employed across a border.
- The visual graph makes each person's place in the org immediately legible — the **same
  clarity you'd expect domestically, extended to your international hires**.

## Branching
- **If** the audience cares about org modeling / reporting **then** toggle **Reporting Line**
  and **Assignments** to show structure travels with the worker record.
- **If** onboarding a new hire **then** show **Create assignment** to place them into the
  `DIVISION` / `DEPARTMENT` / `SUB_DEPARTMENT` tiers.
- **If** scale is the concern **then** pan and zoom the graph to show the same view holds
  whether the client has a few workers or a large org.

## Say-this (talk track)
> "This is where the worker sits in the organization — division, department, sub-department,
> and their reporting line — as a visual you can pan and zoom. You assign people into the
> structure right here, so org context lives on the same record that runs their pay. For your
> PEO, that means your clients get real org modeling for their global team without adopting a
> separate HRIS."

---
id: "206"
title: Worker Profile / Assignments
status: classified
type: tab
module: worker-portal
nav_path: [Worker Portal, Profile, Assignments]
parent: "200"
children_frontier:
  - "Assignments (sub-view)"
  - "Reporting Line (sub-view)"
elements:
  - { name: "Profile tabs", kind: nav, actions: ["Personal", "Contracts", "Bank & Tax Info", "Security", "Assignments"] }
  - { name: "Organization Structure toggle", kind: nav, actions: ["Assignments", "Reporting Line"] }
  - { name: "Assignments view", kind: card, actions: [] }
  - { name: "Reporting Line view", kind: card, actions: [] }
states: [populated, empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/074.txt
  dom: ""
  a11y: capture-output-topup/a11y/074.yaml
  screenshot: ""
tags: [worker-portal, profile, org-structure, reporting-line, assignments]
---

## What this screen is
The Assignments tab of the worker's Profile (Organization Structure), which toggles
between the worker's assignment categories and their reporting line.

## Capabilities shown
- **Organization Structure** with two views: Assignments and Reporting Line
- **Assignments** view highlighting the categories the worker is assigned to (empty
  state: "No assignment categories yet.")
- **Reporting Line** view showing the worker's manager relationship (Demo Admin →
  antaeus coe, engineer)
- Both empty and populated states represented in the capture

## Value narrative (product-led, not discovery)

### For service providers
- Workers can see where they sit in the org and who they report to, so structure
  questions resolve in the portal instead of routing to your team.
- Assignment categories give a flexible way to place workers within a client's structure.

### For direct employers
- Employees see their reporting line and org placement at a glance, reinforcing
  structure for distributed teams without a separate org chart tool.
- Assignment categories capture how a worker maps into the organization.

## Branching
- **If** org clarity for distributed teams is the theme **then** show the Reporting Line
  view with the manager relationship.
- **If** flexible structuring is the interest **then** point to the Assignments
  categories view.

## Say-this (talk track)
> "The worker can see exactly where they fit — their assignment categories and their
> reporting line up to their manager. For a distributed team, that org clarity lives
> right in the worker's own profile."

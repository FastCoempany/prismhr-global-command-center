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
The **Assignments** tab of the worker's own Profile (`Organization Structure`), which toggles between the worker's assignment categories and their reporting line.

## Capabilities shown
- **Organization Structure** with two views: `Assignments` and `Reporting Line`
- **Assignments** view highlighting the categories the worker is assigned to (empty state included in the capture)
- **Reporting Line** view showing the worker's manager relationship (`Demo Admin` (Manager) → `antaeus coe`, `engineer`)
- Both empty and populated states represented, driven off the same admin-side org data

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Workers see where they sit and who they report to without asking anyone, so this org clarity is another self-service differentiator you extend to clients with no build.
- Assignment categories give a flexible structure that works across every client's workforce, keeping the offering consistent as you resell it.

### For the SMB client (via their PEO)
- Your overseas hire sees their reporting line and org placement at a glance, so the SMB gets structure for a distributed team without standing up a separate org-chart tool.
- Assignment categories capture how the worker maps into the organization, handled for you inside the portal the worker already uses.

## Branching
- **If** org clarity for distributed teams is the theme **then** show the `Reporting Line` view with the `Demo Admin` manager relationship.
- **If** flexible structuring is the interest **then** point to the `Assignments` categories view.
- **If** the buyer is small today **then** note the same view scales as the SMB's overseas headcount grows.

## Say-this (talk track)
> "The worker can see exactly where they fit — their assignment categories and their reporting line up to their manager. For your SMB client's distributed team, that org clarity lives right in the worker's own portal, so nobody has to maintain a separate chart. It's the kind of done-for-you structure that makes global feel handled."

---
id: "116"
title: Settings — Assignments (Categories)
status: classified
type: page
module: settings
nav_path: [Dashboard, Settings, Assignments, Categories]
parent: "110"
children_frontier:
  - Locations
  - Category Assignments
  - "Add New Category Type"
elements:
  - { name: "Assignments sub-nav", kind: nav, actions: ["Categories", "Locations", "Category Assignments"] }
  - { name: "Add New Category Type", kind: button, actions: ["Add New Category Type"] }
  - { name: "Division category", kind: card, actions: ["Add DIVISION", "Engineering Division", "Product Division"] }
  - { name: "Department category", kind: card, actions: ["Add DEPARTMENT"] }
  - { name: "Sub-department category", kind: card, actions: ["Add SUB_DEPARTMENT"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: text/301.txt
  dom: dom/301.html
  a11y: a11y/301.yaml
  screenshot: screenshots/301.png
tags: [settings, org-structure, categories, divisions, departments, admin]
---

## What this screen is
The Categories tab of Assignments, where the organization defines its structural categories — divisions, departments, and sub-departments — and sees how many workers sit in each.

## Capabilities shown
- Category types: **DIVISION**, **DEPARTMENT**, **SUB_DEPARTMENT**, each with a worker count
- Divisions expand to specific entries (e.g. Engineering Division — 1 Worker, Product Division — 0 Workers) with per-node add actions
- **Add New Category Type** to extend the taxonomy; Add controls per category and node
- Assignments sub-navigation to Categories, Locations, and Category Assignments

## Value narrative (product-led, not discovery)

### For service providers
- Model each client's org structure to their own preference, so reporting and worker grouping reflect how the business is actually organized.

### For direct employers
- Define your own divisions, departments, and sub-departments and see headcount per node, giving structure to workers for reporting and assignment.

## Branching
- **If** the audience has a complex org **then** show the nested Division → entries structure and Add New Category Type.
- **Else** treat as a completeness screen.

## Say-this (talk track)
> "This is where you shape the org to match your business — divisions, departments, sub-departments, however you're structured. Each shows its headcount, and you can add your own category types. It's the backbone for grouping and reporting on your workforce."

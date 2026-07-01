---
id: "120"
title: Support Cases (List)
status: classified
type: page
module: support-cases
nav_path: [Dashboard, Support Cases]
parent: null
children_frontier:
  - "Create Case"
elements:
  - { name: "Cases table", kind: table, actions: ["Open case"] }
  - { name: "Search cases", kind: field, actions: ["Search cases"] }
  - { name: "Status filter", kind: button, actions: ["Status"] }
  - { name: "Type filter", kind: button, actions: ["Type"] }
  - { name: "Create Case", kind: button, actions: ["Create Case"] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/306.txt
  dom: dom/306.html
  a11y: a11y/307.yaml
  screenshot: screenshots/307.png
tags: [support, cases, tickets, help]
---

## What this screen is
The Support Cases list, showing all support cases in a table (Case ID, Subject, Type, Status, Created) with search and filters — here in its empty state.

## Capabilities shown
- Case table columns: **Case ID, Subject, Type, Status, Created**
- **Search** cases, plus **Status** and **Type** filters
- **Create Case** action (also surfaced in the empty state as "Create your first support case to get started")

## Value narrative (product-led, not discovery)

### For service providers
- Support requests are tracked in the same platform your clients work in — no separate helpdesk portal — so you can see and manage cases where the work happens.

### For direct employers
- In-product support means you raise and track issues without leaving the platform, filtered by status and type so nothing gets lost.

## Branching
- **If** the account is new **then** the empty state guides the user straight to Create Case.
- **If** support responsiveness is a concern **then** point to the status/type filtering as evidence cases are tracked and triaged.

## Say-this (talk track)
> "Support lives right inside the platform. Every case you raise shows up here with its type and status, searchable and filterable. No separate portal, no lost emails — you open a case and track it to resolution in one place."

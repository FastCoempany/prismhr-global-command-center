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
- Case table columns: `Case ID`, `Subject`, `Type`, `Status`, `Created`
- **Search** cases, plus **Status** and **Type** filters
- **Create Case** action (also surfaced in the empty state as
  "Create your first support case to get started")
- Empty state shown here: `No cases found`

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Support for global employment is tracked inside the same platform your clients already work
  in — no separate helpdesk portal to stand up or support — so you extend a done-for-you support
  channel to clients **with zero build**, backed by PrismHR's in-country experts.
- Cases are searchable and filterable by `Status` and `Type`, so the support layer you resell
  looks and behaves like the trusted PrismHR ecosystem your clients already rely on.

### For the SMB client (via their PEO)
- In-product support means you raise and track global-employment issues without leaving the
  platform — the **same safety net your PEO gives you domestically**, now covering questions
  across borders.
- Every case is filterable by status and type, so nothing gets lost and you always know where
  a request stands, without a legal or HR team of your own.

## Branching
- **If** the account is new **then** the empty state (`No cases found`) guides the user straight
  to **Create Case**.
- **If** support responsiveness is a concern **then** point to the `Status` / `Type` filtering as
  evidence cases are tracked and triaged.
- **If** volume matters **then** show **Search** as the way to find any past case fast.

## Say-this (talk track)
> "Support lives right inside the platform. Every case you raise shows up here with its type and
> status, searchable and filterable. No separate portal, no lost emails — you open a case and
> track it to resolution in one place. For your PEO, that means the expert support behind global
> employment is something you can extend to clients without building or staffing a help desk of
> your own."

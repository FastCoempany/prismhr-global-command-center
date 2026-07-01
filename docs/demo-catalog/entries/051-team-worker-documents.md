---
id: "051"
title: Worker Profile — Documents
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Documents]
parent: "050"
children_frontier: []
elements:
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Documents list", kind: table, actions: [] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/180.txt
  dom: dom/180.html
  a11y: a11y/180.yaml
  screenshot: screenshots/180.png
tags: [team, worker-profile, documents, compliance]
---

## What this screen is
The Documents tab of a worker's profile, listing the documents required for that
worker's contract (shown here in an empty "No Documents Requested" state).

## Capabilities shown
- A per-worker view of **documents required in this contract**
- **Empty state** handling: "No Documents Requested" when nothing is outstanding
- Document requirements are scoped to the **individual contract**, not a global folder

## Value narrative (product-led, not discovery)

### For service providers
- Compliance documents live on the worker's own record and are tied to that contract, so
  you can see at a glance whether a given hire has outstanding paperwork.
- The clear empty state means "nothing owed" reads instantly, keeping document chase-downs
  targeted only at workers who actually have gaps.

### For direct employers
- Each worker's required documents sit right on their profile alongside pay, contract, and
  leave — no separate document system to reconcile against the employee.
- When there's nothing outstanding, the tab says so plainly, so you're not left guessing.

## Branching
- **If** the audience cares about compliance paperwork **then** open a worker who has
  requested documents to contrast with this empty state.
- **If** keeping the tour brief **then** note the tab exists per-worker and move on to
  Payments or Contracts.

## Say-this (talk track)
> "Every worker has a Documents tab tied to their contract. This one's clean — 'No
> Documents Requested' — so you know there's nothing outstanding for this person. When a
> contract does require paperwork, it surfaces right here on their record."

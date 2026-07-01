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

### For the PEO partner (channel)
- The compliance paperwork that varies by country is handled inside PrismHR's platform and
  tied to each contract, so your clients get in-country document requirements managed for
  them — an offering you extend with zero build.
- A clear "**No Documents Requested**" state means clients can see at a glance who has
  outstanding paperwork, so your book stays audit-ready without you tracking it.

### For the SMB client (via their PEO)
- Each worker's required documents sit right on their profile, next to pay, contract, and
  leave — the same done-for-you compliance your PEO gives you domestically, now for a hire
  abroad, with no separate document system to reconcile.
- When there's nothing outstanding, the tab says so plainly ("**No Documents Requested**"),
  so you're never guessing whether a compliance gap is hiding on a global hire.

## Branching
- **If** the audience cares about compliance paperwork **then** open a worker who has
  requested documents to contrast with this **No Documents Requested** empty state.
- **If** keeping the tour brief **then** note the **Documents** tab exists per-worker,
  tied to the contract, and move on to **Payments** or **Contracts**.

## Say-this (talk track)
> "Every worker has a Documents tab tied to their contract. This one's clean — 'No
> Documents Requested' — so there's nothing outstanding for this person. When a country's
> rules require paperwork, it surfaces right here on the record. That's the in-country
> compliance your PEO already handles domestically, now done for your clients abroad —
> without them owning any of it."

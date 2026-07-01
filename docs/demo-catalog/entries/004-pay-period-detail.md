---
id: "004"
title: Pay Period Detail
status: classified
type: page
module: dashboard
nav_path: [Dashboard, Pay Period]
parent: "001"
children_frontier:
  - "Approve (opens Pay Period Approval)"
  - "Invoice"
  - "Distribute"
  - "Upload"
elements:
  - { name: "Key dates", kind: field, actions: ["Pay Period Id", "Target Distribution Date", "Required Approval Date", "Anticipated Invoice Date"] }
  - { name: "Lifecycle actions", kind: button, actions: ["Approve", "Invoice", "Distribute"] }
  - { name: "Pending Approval notice", kind: card, actions: ["Deadline messaging"] }
  - { name: "Upload", kind: button, actions: ["Upload"] }
states: [pending-approval]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/040.txt
  dom: dom/040.html
  a11y: a11y/040.yaml
  screenshot: screenshots/040.png
tags: [pay-periods, status, lifecycle, approval-deadline, distribution]
---

## What this screen is
The status detail for a single pay period, showing its key dates and lifecycle stage (here, "Pending Approval") with the Approve, Invoice, and Distribute steps.

## Capabilities shown
- Key dates for the period: Pay Period Id, Target Distribution Date, Required Approval Date, and Anticipated Invoice Date
- The pay period lifecycle exposed as ordered actions: **Approve → Invoice → Distribute**
- A Pending Approval notice tying the required approval date to on-time collection and distribution by the payment partner (Listo)
- An Upload action for supporting distribution data

## Value narrative (product-led, not discovery)

### For service providers
- Every period carries its own dated status card, so across a book of clients you can see at a glance which runs are still pending and when each must be approved to distribute on time.
- The Approve/Invoice/Distribute sequence makes the operational chain explicit, so the workflow you operate on clients' behalf is legible rather than opaque.

### For direct employers
- One glance tells you where the period stands and the exact date you must act by to keep pay on schedule.
- The deadline is framed around the outcome — on-time collection and distribution — so the consequence of the approval date is spelled out, not left to you to infer.

## Branching
- **If** the conversation is about missed-deadline risk **then** anchor on the Required Approval Date and the Pending Approval notice.
- **If** the audience wants to see the end-to-end run **then** use Approve here as the jump into the full Pay Period Approval view (003).

## Say-this (talk track)
> "Each pay period has a status page like this. It tells you the dates that matter — when it has to be approved, when it invoices, when it distributes — and where it is right now. This one's pending approval, and it's clear you need to approve by the 23rd to keep pay on time. From here you move it down the line: approve, invoice, distribute."

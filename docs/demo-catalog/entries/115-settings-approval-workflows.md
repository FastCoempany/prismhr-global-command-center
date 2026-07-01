---
id: "115"
title: Settings — Approval Workflows
status: classified
type: page
module: settings
nav_path: [Dashboard, Settings, Approval Workflows]
parent: "110"
children_frontier:
  - "Edit Workflow (Time off Requests)"
  - "Edit Workflow (Pay Period Approvals)"
  - "Edit Workflow (Reimbursements)"
elements:
  - { name: "Time off Requests workflow", kind: card, actions: ["Edit Workflow", "+ Add Approver", "Add notification recipient"] }
  - { name: "Pay Period Approvals workflow", kind: card, actions: ["Edit Workflow", "+ Add Approver", "Add notification recipient"] }
  - { name: "Reimbursements workflow", kind: card, actions: ["Edit Workflow", "+ Add Approver", "Add notification recipient"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/296.txt
  dom: dom/296.html
  a11y: a11y/297.yaml
  screenshot: screenshots/297.png
tags: [settings, approvals, workflows, notifications, admin]
---

## What this screen is
A configuration page defining the approval flow and notification recipients for three request types: time off, pay periods, and reimbursements.

## Capabilities shown
- Three configurable workflows — **Time off Requests** (vacation, sick leave, personal time), **Pay Period Approvals**, and **Reimbursements** (additional expenses and one-time payments)
- Each has an **Approval Flow** with **+ Add Approver** and a **Will Receive Notifications** list with an add-recipient control
- **Edit Workflow** per request type

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Each client's approval chain is codified once — who signs off on time off, pay runs, and reimbursements — so operations run consistently and notifications reach the right people, all configurable with **zero build** on your side.

### For the SMB client (via their PEO)
- Approvals aren't ad hoc: you define the chain of **Approvers** and the **Will Receive Notifications** list per request type, so payroll, time off, and expenses all route the way your controls require — the same trusted sign-off discipline your PEO gives you, now global.

## Branching
- **If** financial controls / multi-level sign-off is the hot button **then** anchor on **Pay Period Approvals** and the **+ Add Approver** flow.
- **If** the audience is people-ops led **then** lead with **Time off Requests**.

## Say-this (talk track)
> "Approvals are configurable per request type. Time off, pay periods, and reimbursements each get their own approval chain and their own notification list — so the right people sign off, and the right people get told, every time. It's the same control you already trust, applied to your global operations."

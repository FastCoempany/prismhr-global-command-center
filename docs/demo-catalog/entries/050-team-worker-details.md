---
id: "050"
title: Worker Profile — Details
status: classified
type: tab
module: team
nav_path: [Team, "Worker profile", Details]
parent: null
children_frontier:
  - "Documents (tab)"
  - "Payments (tab)"
  - "Contracts (tab)"
  - "Time Off (tab)"
  - "Expense Reimbursements (tab)"
  - "Assignments (tab -> Organization)"
  - "Assign Location"
  - "Manager (open manager)"
elements:
  - { name: "Profile header", kind: header, actions: ["Assign Location", "Manager"] }
  - { name: "Worker tabs", kind: nav, actions: ["Details", "Documents", "Payments", "Contracts", "Time Off", "Expense Reimbursements", "Assignments"] }
  - { name: "Personal Info", kind: card, actions: [] }
  - { name: "Emergency Contact Info", kind: card, actions: [] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/178.txt
  dom: dom/178.html
  a11y: a11y/178.yaml
  screenshot: screenshots/178.png
tags: [team, worker-profile, details, personal-info, multi-country, record]
---

## What this screen is
The default tab of a worker's profile, showing the person's employment header (email,
start date, position, worker ID, manager, location) plus their personal and emergency
contact details.

## Capabilities shown
- A single worker record spanning workers in different countries (e.g. Paul Davis in
  Mexico, Aaron Taylor in the United Kingdom) with the **same layout**
- Employment header: **Work Email, Start Date, Position, Worker ID, Manager, Location**
- **Assign Location** and a clickable **Manager** directly from the header
- Tabbed profile linking to **Documents, Payments, Contracts, Time Off, Expense
  Reimbursements, and Assignments** (organization)
- **Personal Info** (full name, phone, address, birthday, nationality) and
  **Emergency Contact Info** in structured fields

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Your clients get one consistent worker record for every international hire — a Mexican
  payroll employee and a UK contractor look identical — so extending your domestic PEO
  relationship into global feels seamless, with zero platform to build.
- The tab strip is the entire worker lifecycle (**Details**, **Documents**, **Payments**,
  **Contracts**, **Time Off**, **Expense Reimbursements**, **Assignments**), all on
  PrismHR's in-country infrastructure, so your client book gets a global capability you
  never had to stand up.

### For the SMB client (via their PEO)
- One profile holds everything about a global team member — **Position**, **Worker ID**,
  **Manager**, **Location**, personal and **Emergency Contact Info** — the same
  done-for-you record your PEO already gives you domestically, now across borders.
- The layout is identical whether the person sits in Mexico or the UK, so your first
  international hire feels no different from managing your team at home — no entity, no
  legal team, no new system to learn.

## Branching
- **If** the emphasis is breadth of the worker record **then** run the tab strip left to
  right (Details → … → Assignments) as a tour of the full lifecycle.
- **If** comparing engagement models **then** open the same Details tab on a payroll
  worker and a contractor to show one consistent record across types.

## Say-this (talk track)
> "This is a single worker's profile. Up top is the employment snapshot — position,
> worker ID, manager, location — and below it their personal and emergency details.
> Notice the tabs: documents, payments, contracts, time off, expenses, org structure.
> Everything about this person lives in one record, and it looks exactly the same whether
> they're in Mexico or the UK. For your clients, that means their first hire abroad feels
> just like managing their team at home — same safety net, now global, and nothing for
> them to build."

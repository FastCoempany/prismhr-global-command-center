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

### For service providers
- Every worker across every client and country resolves to one consistent profile, so
  your team supports a UK contractor and a Mexican payroll employee from the same screen.
- The tab strip is the whole worker lifecycle — documents, pay, contracts, leave,
  expenses, org — in one place, so you answer any client question without switching tools.

### For direct employers
- One profile holds everything about a global team member: who they are, where they
  are, who they report to, and every downstream record via the tabs.
- The layout is identical whether the person sits in Mexico or the UK, so managing an
  international team feels like managing one team.

## Branching
- **If** the emphasis is breadth of the worker record **then** run the tab strip left to
  right (Details → … → Assignments) as a tour of the full lifecycle.
- **If** comparing engagement models **then** open the same Details tab on a payroll
  worker and a contractor to show one consistent record across types.

## Say-this (talk track)
> "This is a single worker's profile. Up top is the employment snapshot — position,
> worker ID, manager, location — and below it their personal and emergency details.
> Notice the tabs: documents, payments, contracts, time off, expenses, org structure.
> Everything about this person, in one record, and it looks the same whether they're in
> Mexico or the UK."

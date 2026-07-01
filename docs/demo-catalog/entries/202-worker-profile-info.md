---
id: "202"
title: Worker Profile / Personal
status: classified
type: tab
module: worker-portal
nav_path: [Worker Portal, Profile, Personal]
parent: "200"
children_frontier:
  - "Change user photo"
  - "Personal (tab)"
  - "Contracts (tab)"
  - "Bank & Tax Info (tab)"
  - "Security (tab)"
  - "Assignments (tab)"
elements:
  - { name: "Profile summary", kind: card, actions: ["Change user photo"] }
  - { name: "Profile tabs", kind: nav, actions: ["Personal", "Contracts", "Bank & Tax Info", "Security", "Assignments"] }
  - { name: "Personal Info section", kind: card, actions: [] }
  - { name: "Emergency Contact Info section", kind: card, actions: [] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/070.txt
  dom: ""
  a11y: capture-output-topup/a11y/070.yaml
  screenshot: ""
tags: [worker-portal, profile, personal-info, self-service]
---

## What this screen is
The Personal tab of the worker's Profile, showing their identity summary (name, work
email, joined date, position, worker ID, manager, location) alongside personal details
and emergency contact fields.

## Capabilities shown
- **Worker identity summary** — work email, joined date, position, Worker ID, manager,
  location — in a persistent profile header
- **Personal Info** fields: full name, phone, preferred name, address, birthday, gender,
  nationality
- **Emergency Contact Info** fields (name, email, phone)
- **Change user photo** control
- Tabbed profile: Personal, Contracts, Bank & Tax Info, Security, Assignments

## Value narrative (product-led, not discovery)

### For service providers
- Workers maintain their own personal and emergency-contact details, so your team isn't
  re-keying employee data your clients could keep current themselves.
- One profile ties identity, contracts, banking, security, and org placement together
  for every worker you administer.

### For direct employers
- Employees own their record — address, phone, emergency contact — reducing stale data
  and HR update tickets.
- The profile header keeps the essentials (manager, worker ID, position, join date)
  visible in one place for both the worker and anyone assisting them.

## Branching
- **If** data accuracy / self-maintenance is the theme **then** emphasize worker-owned
  Personal Info and Emergency Contact fields.
- **If** the buyer wants the full profile story **then** use the tab row to preview
  Contracts, Bank & Tax, Security, and Assignments.

## Say-this (talk track)
> "This is the worker's profile. Their key details — manager, worker ID, position — sit
> right up top, and they maintain their own personal and emergency-contact information.
> From these tabs they reach their contracts, banking and tax info, security settings,
> and where they sit in the org — all in one place."

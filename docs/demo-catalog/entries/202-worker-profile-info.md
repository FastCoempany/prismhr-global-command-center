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

### For the PEO partner (channel)
- A worker-owned profile — identity, **Personal Info**, **Emergency Contact Info**, all self-maintained — is a professional experience you can promote to clients, and it means the global offering runs itself rather than adding admin.
- One profile ties identity, **Contracts**, **Bank & Tax Info**, **Security**, and **Assignments** together for every overseas worker, so the polished experience is consistent across all your PEO clients with zero build.

### For the SMB client (via their PEO)
- Your international hire keeps their own record current — address, phone, emergency contact — so stale data and update requests don't come back to your team.
- The profile header keeps the essentials (**Manager**, **Worker ID**, **Position**, **Joined Date**) visible in one place, so the worker self-serves and your SMB never has to build HR operations abroad.

## Branching
- **If** self-maintenance and data accuracy is the theme **then** emphasize worker-owned **Personal Info** and **Emergency Contact Info** the hire keeps current themselves.
- **If** the client wants the full profile story **then** use the tab row to preview **Contracts**, **Bank & Tax Info**, **Security**, and **Assignments** — everything the worker self-serves in one place.

## Say-this (talk track)
> "This is your client's overseas hire's own profile. Their key details — manager, worker ID, position — sit right up top, and they maintain their own personal and emergency-contact information. From these tabs they reach their contracts, banking, security, and where they sit in the org — all self-service. So the SMB gives their international people a clean, done-for-them experience without ever standing up HR operations in another country."

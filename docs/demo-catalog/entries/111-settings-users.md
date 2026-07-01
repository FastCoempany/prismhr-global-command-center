---
id: "111"
title: Settings — Users
status: classified
type: page
module: settings
nav_path: [Dashboard, Settings, Users]
parent: "110"
children_frontier:
  - "User detail (e.g. Sarah Admin)"
  - "Invite User (modal)"
elements:
  - { name: "Users table", kind: table, actions: ["Open user detail"] }
  - { name: "Search users", kind: field, actions: ["Search users"] }
  - { name: "Sort", kind: button, actions: ["Sort"] }
  - { name: "Filter", kind: button, actions: ["Filter"] }
  - { name: "Invite User", kind: button, actions: ["+ Invite User"] }
  - { name: "Row role selector", kind: field, actions: ["Super Admin", "Manager", "HR", "Admin", "Onboard Only", "Finance"] }
  - { name: "Row manager selector", kind: field, actions: ["Demo Admin", "Mike SuperAdmin", "Sarah Admin", "Demo HR Manager", "John Manager", "Alex Demo Worker", "Demo Finance Manager", "Emma Onboard"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/287.txt
  dom: dom/287.html
  a11y: a11y/289.yaml
  screenshot: screenshots/289.png
tags: [settings, users, rbac, roles, manager-hierarchy, admin]
---

## What this screen is
A table of the organization's admin users showing name, status, assigned role, and reporting manager, with inline controls to change role and manager and to invite new users.

## Capabilities shown
- User list with **Status** (Active / Invited), **Role**, and **Manager** per row (Account Owner shown as a fixed role)
- Change a user's **Role** inline from a selector — Super Admin, Manager, HR, Admin, Onboard Only, Finance
- Reassign a user's **Manager** inline from the roster of other users
- **Invite User**, plus Search, Sort, and Filter over the list

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Delegated administration at a glance: each SMB client can staff its own account with the right mix of roles and reporting lines, and grant scoped access (e.g. **Onboard Only**) rather than all-or-nothing logins — so global access control is self-serve and safe with no lift from you.
- Inviting and role-assigning users inline means a client team stands up in minutes, on the platform you already promote.

### For the SMB client (via their PEO)
- You control exactly who touches payroll, onboarding, and finance — and who they report to — from one table, with **Role** and **Manager** both editable inline (**Super Admin**, **Manager**, **HR**, **Admin**, **Onboard Only**, **Finance**).
- **Status** (Active / Invited) makes it obvious who has accepted their invite versus who is still pending — the same simple, safe control you're used to, now over your global team.

## Branching
- **If** least-privilege access matters **then** open a **Role** selector, walk the six roles, then jump to a user detail to show the permission matrix.
- **If** approval routing matters **then** highlight the **Manager** column as the backbone of the approval workflows.

## Say-this (talk track)
> "Here's everyone with access to the account. Each person has a role — **Super Admin**, **HR**, **Finance**, **Manager**, **Onboard Only** — and a manager, and you can change both right here in the row. Invite someone in seconds and give them exactly the access they need, nothing more. Same peace of mind your PEO gives you at home, now for your global operation."

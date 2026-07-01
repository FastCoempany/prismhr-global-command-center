---
id: "113"
title: Settings — Roles and Permissions
status: classified
type: page
module: settings
nav_path: [Dashboard, Settings, Roles and Permissions]
parent: "110"
children_frontier:
  - "Role detail (e.g. Owner)"
elements:
  - { name: "Roles table", kind: table, actions: ["Open role", "View Permissions"] }
  - { name: "Role rows", kind: field, actions: ["Owner", "Super Admin", "Admin", "HR", "Manager", "Finance", "Onboard Only"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/290.txt
  dom: dom/290.html
  a11y: a11y/291.yaml
  screenshot: screenshots/291.png
tags: [settings, roles, permissions, rbac, admin]
---

## What this screen is
A table of the available admin roles, each with a plain-language description and a way to view its permissions.

## Capabilities shown
- Seven roles listed with descriptions: **Owner** (all permissions + can delete account), **Super Admin** (all permissions), **Admin** (most, but no company settings), **HR** (all People Management, Payments, some Finance), **Manager** (onboard and view onboarding status), **Finance** (all Finance, most Payments), **Onboard Only** (People Management/Payments/some Finance, scoped to assigned team members)
- **View Permissions** action per role to open the detailed matrix

## Value narrative (product-led, not discovery)

### For service providers
- A ready-made role library means you can standardize access across every client without designing permission sets from scratch.

### For direct employers
- Predefined roles map to how organizations actually split responsibility — HR, Finance, Managers, onboarders — so you assign access by job, not by guesswork.

## Branching
- **If** access-control depth matters **then** open a role (e.g. Owner) to show the full permission matrix behind the description.
- **If** delegated / scoped access is the point **then** contrast Onboard Only ("only for assigned team members") with Super Admin.

## Say-this (talk track)
> "Access is role-based out of the box. Owner and Super Admin see everything; Admin stops short of company settings; HR, Finance, and Manager each get what their job needs; and Onboard Only is scoped to just their assigned people. Click into any role to see exactly what it can do."

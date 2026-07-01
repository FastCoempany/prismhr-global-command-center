---
id: "114"
title: Settings — Role Detail
status: classified
type: drilldown
module: settings
nav_path: [Dashboard, Settings, Roles and Permissions, "Role detail"]
parent: "113"
children_frontier: []
elements:
  - { name: "Back to Users", kind: button, actions: ["Back to Users"] }
  - { name: "Role header", kind: card, actions: [] }
  - { name: "Permission groups (read-only)", kind: field, actions: ["Administration", "Communication", "Finance", "Payments", "People Management"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: text/292.txt
  dom: dom/292.html
  a11y: a11y/293.yaml
  screenshot: screenshots/292.png
tags: [settings, roles, permissions, rbac, admin]
---

## What this screen is
The read-only detail view for a single role (e.g. Owner), listing every permission the role has access to, grouped by area.

## Capabilities shown
- Role name and description header (e.g. "Owner — Has all Administration, People Management, Payments, and Finance permissions, and can delete account")
- **Has Access** view of the permission matrix grouped by **Administration, Communication, Finance, Payments, People Management** — showing the specific capabilities included (e.g. Invite users, Can delete account, Pay invoices, View compensation calculator, Onboard new hires, Approve/decline time-off requests)

## Value narrative (product-led, not discovery)

### For service providers
- Concrete, auditable evidence of exactly what a role grants — the answer to "what can this person do?" without reverse-engineering it.

### For direct employers
- Confirms, permission by permission, that a role matches the responsibility you intend to delegate.

## Branching
- **If** the audience challenges what a role covers **then** open this view and read down the group that concerns them.
- **Else** treat as supporting detail for the Roles screen.

## Say-this (talk track)
> "This is the full picture behind a role. Owner, for example, has every permission across Administration, Finance, Payments, and People Management — including the ability to delete the account. Nothing is hidden; you can see each capability spelled out."

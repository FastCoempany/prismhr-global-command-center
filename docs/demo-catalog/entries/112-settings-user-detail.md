---
id: "112"
title: Settings — User Detail
status: classified
type: drilldown
module: settings
nav_path: [Dashboard, Settings, Users, "User detail"]
parent: "111"
children_frontier: []
elements:
  - { name: "Back to Users", kind: button, actions: ["Back to Users"] }
  - { name: "User header", kind: card, actions: ["Set as Inactive"] }
  - { name: "Role selector", kind: field, actions: ["Super Admin", "Manager", "HR", "Admin", "Onboard Only", "Finance"] }
  - { name: "Permission groups", kind: field, actions: ["People Management", "Finance", "Payments", "Administration", "Communication", "Select All"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: text/283.txt
  dom: dom/283.html
  a11y: a11y/283.yaml
  screenshot: screenshots/283.png
tags: [settings, users, permissions, rbac, admin]
---

## What this screen is
The detail view for a single user (e.g. Sarah Admin, Invited, Admin), showing their role and the full per-permission checkbox matrix that role grants.

## Capabilities shown
- User header with initials, name, status, email, current role, and a **Set as Inactive** action
- Role selector (Super Admin / Manager / HR / Admin / Onboard Only / Finance) with a plain-language description of what the role can do
- Granular permission matrix grouped into **People Management, Finance, Payments, Administration, Communication**, each with Select All and individual toggles (e.g. Onboard new hires, Approve/decline time-off requests, Pay invoices, View compensation calculator, Invite users, View/edit company settings)
- Checkboxes reflect the selected role — e.g. Admin has most permissions but the Administration group's user/account controls are off

## Value narrative (product-led, not discovery)

### For service providers
- You can prove exactly what a given user can and can't do, permission by permission — useful when a client asks who can approve payments or edit company settings.

### For direct employers
- Fine-grained control: start from a role, then confirm or tune the exact capabilities, so access maps precisely to responsibility.

## Branching
- **If** governance / SoD (separation of duties) is the concern **then** contrast a role that has Pay invoices with one that only has View invoices.
- **Else** keep this brief — it's the evidence behind the Users and Roles screens.

## Say-this (talk track)
> "Drill into any user and you see exactly what their role grants — every permission, grouped by area. Sarah's an Admin: she can run people and payments, but she can't touch company settings or delete the account. It's role-based, and it's transparent."

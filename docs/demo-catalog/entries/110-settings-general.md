---
id: "110"
title: Settings — General
status: classified
type: page
module: settings
nav_path: [Dashboard, Settings, General]
parent: null
children_frontier:
  - Users
  - Roles and Permissions
  - Approval Workflows
  - Assignments
elements:
  - { name: "Settings sub-nav", kind: nav, actions: ["General", "Users", "Roles and Permissions", "Approval Workflows", "Assignments"] }
  - { name: "Account overview", kind: card, actions: ["Copy email to clipboard"] }
  - { name: "Entity Details form", kind: field, actions: ["Name", "Tax ID Number", "Address 1", "Address 2", "City", "Postal Code", "State"] }
  - { name: "Entity Type selector", kind: field, actions: ["LLC", "S-corp", "C-corp", "Sole Proprietorship", "LTD", "unknown"] }
  - { name: "Country selector", kind: field, actions: ["150+ countries and regions"] }
  - { name: "Billing Contact Info", kind: field, actions: ["Primary Email", "Add Another Email"] }
  - { name: "Update", kind: button, actions: ["Update"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: text/305.txt
  dom: dom/305.html
  a11y: a11y/305.yaml
  screenshot: screenshots/305.png
tags: [settings, account, entity, billing, admin]
---

## What this screen is
The General settings tab showing account overview details plus editable entity and billing-contact information for the client.

## Capabilities shown
- Read-only account **Overview**: Account Owner's Name, Email (with copy-to-clipboard), Client ID
- **Entity Details** form: Name, Entity Type (LLC / S-corp / C-corp / Sole Proprietorship / LTD / unknown), Tax ID Number, full address, and a Country selector spanning 150+ countries and regions
- **Billing Contact Info**: primary invoice email plus Add Another Email
- Settings sub-navigation to Users, Roles and Permissions, Approval Workflows, Assignments

## Value narrative (product-led, not discovery)

### For service providers
- Client entity and billing configuration lives in the same platform as operations, so onboarding a new client's legal details is self-contained.

### For direct employers
- One place to keep your legal entity and invoice-routing details current, with country coverage broad enough for wherever your entity sits.

## Branching
- **If** the account setup / legal-entity story is relevant **then** show the breadth of the Entity Type and Country selectors.
- **Else** treat this as a completeness screen and move on to Users or Roles.

## Say-this (talk track)
> "This is your account's home base — who owns it, your client ID, your legal entity and where invoices go. It's the plumbing; the interesting control lives in the next tabs, Users and Roles."

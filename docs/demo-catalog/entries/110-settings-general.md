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
  - { name: "Country selector", kind: field, actions: ["130+ countries and sub-national regions"] }
  - { name: "Billing Contact Info", kind: field, actions: ["Primary Email", "Add Another Email"] }
  - { name: "Update", kind: button, actions: ["Update"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/053.txt
  a11y: capture-output-topup/a11y/053.yaml
tags: [settings, account, entity, billing, admin]
---

## What this screen is
The General settings tab for the client (here "Antaeus Service Provider - Main Client"),
showing a read-only account overview plus editable legal-entity and billing-contact forms.

## Capabilities shown
- Read-only account **Overview** ("General information about your account"): Account Owner's
  Name (`Demo Admin`), Email (`antaeus.coe@prismhr.com`, copy-to-clipboard), and Client ID
  (`10500048`)
- **Entity Details** form: Name, **Entity Type** (`Select` / `LLC` / `S-corp` / `C-corp` /
  `Sole Proprietorship` / `LTD` / `unknown`), Tax ID Number, Address 1, Address 2, City,
  Postal Code, State, and a **Country** selector
- **Country** selector spans ~130 countries and sub-national regions — including
  state/province granularity for Australia (New South Wales, Queensland, South Australia,
  Victoria, Western Australia), Canada (Alberta, BC, Ontario, Quebec, Manitoba, Nova Scotia,
  and more), China (Shanghai, Guangzhou), and Switzerland (Geneva, Zurich)
- **Billing Contact Info**: "Enter the email address(es) that invoices should be sent to" —
  a Primary Email plus **Add Another Email**
- An **Update** button commits the entity/billing edits
- Settings sub-navigation to **Users**, **Roles and Permissions**, **Approval Workflows**,
  **Assignments**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Each SMB client's legal identity — **Entity Type**, **Tax ID Number**, registered address,
  **Country** — and its invoice-routing emails live in the same platform you promote, so
  standing up a client on global is self-contained rather than tracked off-system.

### For the SMB client (via their PEO)
- One place to keep your legal entity and invoice recipients current, with a **Country** list
  granular enough (down to state/province) to match wherever your entity is registered — the
  same tidy, done-for-you setup your PEO gives you domestically.

## Branching
- **If** the legal-entity / account-setup story is relevant **then** open the **Entity Type**
  and **Country** selectors to show the breadth, including sub-national regions.
- **Else** treat this as a completeness screen and move on to **Users** or **Roles and Permissions**.

## Say-this (talk track)
> "This is your account's home base — the owner, your Client ID, your legal entity, and where
> invoices go. Entity type, tax ID, registered address right down to the state or province,
> and as many billing emails as you need. It's the plumbing that keeps things clean; the
> interesting control lives in the next tabs, **Users** and **Roles**."

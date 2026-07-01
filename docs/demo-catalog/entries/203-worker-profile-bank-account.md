---
id: "203"
title: Worker Profile / Bank & Tax Info
status: classified
type: tab
module: worker-portal
nav_path: [Worker Portal, Profile, Bank & Tax Info]
parent: "200"
children_frontier:
  - "Add a Bank Account"
  - "Identification: Front of ID / Back of ID (uploads)"
elements:
  - { name: "Profile tabs", kind: nav, actions: ["Personal", "Contracts", "Bank & Tax Info", "Security", "Assignments"] }
  - { name: "Bank Accounts section", kind: card, actions: ["Add a Bank Account"] }
  - { name: "National ID section", kind: card, actions: [] }
  - { name: "Identification section", kind: card, actions: ["Front of ID", "Back of ID"] }
states: [populated, empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/069.txt
  dom: ""
  a11y: capture-output-topup/a11y/069.yaml
  screenshot: ""
tags: [worker-portal, profile, bank-account, tax-id, kyc, payments]
---

## What this screen is
The **Bank & Tax Info** tab of the worker's own Profile, where the end worker adds bank account(s) for payment, records a National ID / tax identifier, and uploads front and back of an ID document.

## Capabilities shown
- **Add a Bank Account** with a default-bank concept — `Payments from PrismHR will be issued to the default bank of your choosing`, supporting one or more accounts
- **National ID** / tax identifier capture, framed as required for a work engagement — the worker's personal ID number or an entity's tax ID (e.g. `123456`)
- **Identification** document upload — `Front of ID` and `Back of ID` (e.g. `Baseball (2).jpg` shown for both)
- Persistent `Link Bank Account →` prompt across the portal tying this tab back to the worker's pay setup

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The worker collects their own banking, tax ID, and identity documents at the source, so a polished self-service experience becomes something you can promote to clients — less admin, cleaner pay data, and no HR-ops build on anyone's part.
- One consistent capture flow works for every client's overseas workers, so extending global to your book means the compliance-sensitive data arrives correctly without your team touching it.

### For the SMB client (via their PEO)
- Your overseas hire self-serves their bank account, picks a default for payments, and records their tax ID, so you don't field or manually handle sensitive payment details.
- National ID and ID-document capture up front means the compliance basics of a cross-border engagement are done-for-you rather than something you research or chase.

## Branching
- **If** compliance / KYC is the concern **then** emphasize the National ID capture and the Front/Back ID document upload as worker-driven collection.
- **If** payment accuracy is the theme **then** anchor on the default-bank selection driving where `PrismHR` issues payments.
- **If** the buyer worries about admin lift **then** point to the worker completing all of this themselves against the persistent bank-account prompt.

## Say-this (talk track)
> "This is the worker's own profile. They add their bank account and pick which one is the default for payments, record their tax ID, and upload the front and back of their ID — all themselves. For your SMB clients that means their overseas people get a clean self-service experience and the SMB never handles the sensitive details. For you, it's a polished, compliant onboarding you can put your name on without building any of it."

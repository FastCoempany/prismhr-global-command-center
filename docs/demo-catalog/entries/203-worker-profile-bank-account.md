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
The Bank & Tax Info tab of the worker's Profile, where the worker adds bank account(s)
for payment, records a National ID / tax identifier, and uploads front and back of an
ID document.

## Capabilities shown
- **Add a Bank Account** with a default-bank concept — "Payments from PrismHR will be
  issued to the default bank of your choosing"
- **National ID / tax identifier** capture, framed as required for a work engagement
  (personal ID number or an entity's tax ID)
- **Identification document upload** — Front of ID and Back of ID (e.g. images shown)
- Empty-then-populated flow tied to the dashboard's "Link Bank Account" onboarding task

## Value narrative (product-led, not discovery)

### For service providers
- Workers supply their own payment and tax details plus ID documents, so the data you
  need to pay them compliantly is collected at the source, not chased by your operators.
- Bank, tax ID, and identity verification are captured in one place per worker, feeding
  the same platform that runs the pay run.

### For direct employers
- New hires self-serve their banking and tax identifiers with a default-account choice,
  so payments route correctly without HR handling sensitive details manually.
- Collecting the National ID and ID document up front supports the compliance
  requirements of a cross-border work engagement.

## Branching
- **If** compliance / KYC is the concern **then** emphasize National ID capture and the
  Front/Back ID document upload.
- **If** payment accuracy is the theme **then** anchor on the default-bank selection
  driving where payments are issued.

## Say-this (talk track)
> "The worker adds their own bank account and picks which one is the default for
> payments, records their tax ID, and uploads their ID document — front and back. That's
> everything needed to pay them compliantly, collected by the worker themselves rather
> than passed around over email."

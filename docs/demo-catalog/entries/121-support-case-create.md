---
id: "121"
title: Support Case — Create
status: classified
type: page
module: support-cases
nav_path: [Dashboard, Support Cases, Create Case]
parent: "120"
children_frontier: []
elements:
  - { name: "Case Type selector", kind: field, actions: ["Onboarding", "Tax Forms", "Schedule a Meeting", "Product Feedback", "Other", "Letters", "Change Request", "Benefits"] }
  - { name: "Subject", kind: field, actions: ["Enter subject"] }
  - { name: "Issue Description", kind: field, actions: ["Describe issue"] }
  - { name: "Cancel", kind: button, actions: ["Cancel"] }
  - { name: "Create Case", kind: button, actions: ["Create Case"] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/308.txt
  dom: dom/308.html
  a11y: a11y/312.yaml
  screenshot: screenshots/312.png
tags: [support, cases, create, categories, help]
---

## What this screen is
The form for creating a new support case: pick a category, enter a subject and a detailed description, then submit.

## Capabilities shown
- **Case Type** category selector: `Onboarding`, `Tax Forms`, `Schedule a Meeting`,
  `Product Feedback`, `Other`, `Letters`, `Change Request`, `Benefits`
- **Subject** ("Brief description of your issue") and **Issue Description** (guided prompt:
  "describe your issue in detail… include any relevant information that might help us resolve
  it faster")
- **Create Case** to submit, or **Cancel**
- Reassurance copy: "Our team will review it and get back to you"

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The **Case Type** list — `Onboarding`, `Tax Forms`, `Letters`, `Change Request`,
  `Schedule a Meeting`, `Benefits` — mirrors the real work of running global employment, so
  requests land pre-triaged for the right expert team; you resell that expertise **without
  building or staffing it**.
- Structured intake keeps the support experience consistent and trustworthy across your whole
  client base, extending your role as the hero inside the PrismHR ecosystem to global questions too.

### For the SMB client (via their PEO)
- Raising a case is structured, not a blank email — the category and guided description mean your
  issue reaches the right people with the context to resolve it faster, **no in-house global HR or
  legal team required**.
- Case types like `Tax Forms`, `Letters`, and `Schedule a Meeting` mean the same done-for-you
  support you trust domestically now covers cross-border questions.

## Branching
- **If** the audience worries about service coverage **then** run the **Case Type** dropdown to
  show the breadth — from `Tax Forms` to `Letters` to `Schedule a Meeting`.
- **If** they want a human **then** highlight `Schedule a Meeting` as a case type.
- **If** onboarding is the concern **then** pick `Onboarding` to show intake routes straight to
  the right team.

## Say-this (talk track)
> "Need help? Creating a case is structured. Pick the type — onboarding, tax forms, a letter
> request, even scheduling a meeting — give it a subject and the details, and it routes to the
> right team. It's categorized from the start, so you get the right answer faster. For your PEO,
> that expert support behind every category is something you extend to clients without staffing a
> global-HR help desk yourself."

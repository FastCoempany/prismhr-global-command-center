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
- **Case Type** category selector: Onboarding, Tax Forms, Schedule a Meeting, Product Feedback, Other, Letters, Change Request, Benefits
- **Subject** ("Brief description of your issue") and **Issue Description** (guided prompt for relevant detail)
- **Create Case** to submit, or Cancel
- Reassurance copy: "Our team will review it and get back to you"

## Value narrative (product-led, not discovery)

### For service providers
- The category list (Onboarding, Tax Forms, Letters, Change Request, Schedule a Meeting, Benefits) mirrors the real work of running global employment, so requests land pre-triaged for the right team.

### For direct employers
- Raising a case is structured, not a blank email — the category and guided description mean your issue reaches the right people with the context to resolve it faster.

## Branching
- **If** the audience worries about service coverage **then** run the Case Type dropdown to show the breadth — from Tax Forms to Letters to Schedule a Meeting.
- **If** they want a human **then** highlight "Schedule a Meeting" as a case type.

## Say-this (talk track)
> "Need help? Creating a case is structured. Pick the type — onboarding, tax forms, a letter request, even scheduling a meeting — give it a subject and the details, and it routes to the right team. Categorized from the start, so you get the right answer faster."

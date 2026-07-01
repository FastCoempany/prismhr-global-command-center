---
id: "210"
title: Worker Portal — Accept Payroll: Personal Information
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Accept Payroll, Personal Information]
parent: null
children_frontier:
  - "Next → Address (step 02)"
  - "Cancel"
elements:
  - { name: "Onboarding stepper", kind: nav, actions: ["01 Personal Information", "02 Address", "03 Identification"] }
  - { name: "Offer summary", kind: card, actions: [] }
  - { name: "Personal information form", kind: field, actions: ["Preferred Name", "Phone Number", "Date Of Birth", "Gender"] }
  - { name: "Form actions", kind: button, actions: ["Cancel", "Next"] }
states: [populated, error]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/063.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/063.yaml
  screenshot: ""
tags: [worker-portal, onboarding, accept-payroll, self-service, offer, contract, employee-experience]
---

## What this screen is
Step 01 of a new worker's onboarding-acceptance flow, where the incoming hire confirms their offer details and fills in personal information so the platform can draft their contract.

## Capabilities shown
- A three-step onboarding stepper (Personal Information → Address → Identification) the worker walks through themselves
- The offer laid out on-screen: full name, email, salary in local currency (BZ$3,500.00 BZD/month), start date, job title, payment currency
- Guided personal-info capture (preferred name, phone, date of birth, gender) that feeds contract drafting
- Inline field validation ("What is the date of birth?") keeping the worker's entries clean
- Native local-currency offer display (BZD) for a cross-border hire

## Value narrative (product-led, not discovery)

### For service providers
- The onboarding experience your clients' employees get is a clean, guided acceptance flow — the worker confirms their own details and the platform drafts the contract, so you onboard global hires without manual paperwork per country.
- Local-currency, local-detail capture is built in, so the same acceptance motion works whoever the client and wherever the worker sits.

### For direct employers
- Your new hire self-drives their own onboarding: they see the exact offer — salary in their currency, start date, title — and complete their details in three clear steps.
- Data the worker enters here flows straight into the contract, so you're not re-keying offer details or chasing missing fields.

## Branching
- **If** the buyer hires across borders **then** emphasize the native local-currency offer (BZD/month) and the country-agnostic guided flow.
- **If** onboarding effort is the pain **then** anchor on the worker self-completing details that auto-draft the contract, with inline validation preventing bad data.

## Say-this (talk track)
> "This is what a new hire sees when they accept. Their offer is right in front of them — salary in their own currency, start date, title — and they confirm their own details in three guided steps. What they enter here drafts their contract automatically, so onboarding a worker anywhere in the world is self-serve, not a paperwork project."

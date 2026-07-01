---
id: "212"
title: Worker Portal — Accept Payroll: Address
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Accept Payroll, Address]
parent: "210"
children_frontier:
  - "Next → Identification (step 03)"
  - "Back → Personal Information (step 01)"
elements:
  - { name: "Onboarding stepper", kind: nav, actions: ["Personal Information", "02 Address", "03 Identification"] }
  - { name: "Personal address form", kind: field, actions: ["Street Address 1", "Street Address 2", "City", "State / Province", "Zip / Postal Code", "Country"] }
  - { name: "Country selector", kind: field, actions: ["Country / region + sub-region list"] }
  - { name: "Form actions", kind: button, actions: ["Back", "Next"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/064.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/064.yaml
  screenshot: ""
tags: [worker-portal, onboarding, accept-payroll, address, global-coverage, employee-experience]
---

## What this screen is
Step 02 (Address) of the new worker's onboarding-acceptance flow, where the hire enters their legal residence address and selects their country from the platform's global list.

## Capabilities shown
- Structured legal-residence capture (street 1/2, city, state/province, zip/postal, country)
- A broad country selector spanning the platform's global coverage, including regional sub-entries (e.g. Australia, Canada, China, Switzerland states/provinces)
- Worker-driven, guided address entry sandwiched between Personal Information and Identification
- Back/Next navigation letting the worker move through the stepper at their own pace

## Value narrative (product-led, not discovery)

### For service providers
- The address step your clients' employees get reflects the platform's global reach — the worker picks from a country list covering the markets you can sell into, including sub-regional payroll jurisdictions.
- Structured address capture keeps the residence data consistent across every client's workforce.

### For direct employers
- Your new hire enters their own legal address against a global list that already knows the regional distinctions (state, province) that drive local compliance.
- The address the worker self-enters flows into their record, so cross-border hires are captured accurately without your team formatting foreign addresses.

## Branching
- **If** the buyer hires into many countries **then** emphasize the breadth of the country list and its regional sub-entries as proof of global coverage.
- **If** local compliance is the hot button **then** point to state/province granularity (Canada, Australia, Switzerland) that address entry captures up front.

## Say-this (talk track)
> "Step two is the worker's legal address. They pick from a country list that spans everywhere the platform operates — right down to the provinces and states that change how payroll and compliance work locally. The worker captures their own address accurately, so a cross-border hire is recorded correctly from the start."

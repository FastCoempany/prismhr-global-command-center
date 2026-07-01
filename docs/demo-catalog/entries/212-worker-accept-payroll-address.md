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
- Structured legal-residence capture (`Street Address 1/2`, `City`, `State / Province`, `Zip / Postal Code`, `Country`), prompted with `Use your legal residence address.`
- A broad `Country` selector spanning the platform's global coverage (Albania through Zimbabwe), including regional sub-entries (e.g. `Australia - Victoria`, `Canada - Ontario`, `China - Shanghai`, `Switzerland - Zurich`)
- Worker-driven, guided address entry sandwiched between `Personal Information` and `Identification`
- `Back`/`Next` navigation letting the worker move through the stepper at their own pace

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The address step your clients' overseas hires get reflects the platform's global reach — the worker picks from a country list covering the markets you can extend clients into, including sub-regional payroll jurisdictions — proof the global offering you resell is genuinely worldwide with no build.
- Structured address capture keeps residence data consistent across every client's workforce, so the same guided step works whoever the client is.

### For the SMB client (via their PEO)
- Your new overseas hire enters their own legal address against a global list that already knows the regional distinctions (state, province) that drive local compliance, so the SMB isn't formatting foreign addresses.
- The address the worker self-enters flows into their record, so cross-border hires are captured accurately as a done-for-you step rather than SMB effort.

## Branching
- **If** the buyer hires into many countries **then** emphasize the breadth of the country list and its regional sub-entries as proof of global coverage.
- **If** local compliance is the hot button **then** point to state/province granularity (`Canada`, `Australia`, `Switzerland`) captured up front.
- **If** the SMB is small or first-hire **then** stress the worker self-enters accurately with no address handling required from the SMB.

## Say-this (talk track)
> "Step two is the worker's legal address. They pick from a country list that spans everywhere the platform operates — right down to the provinces and states that change how payroll and compliance work locally. The worker captures their own address accurately, so your SMB client's cross-border hire is recorded correctly from the start without anyone formatting a foreign address. For you, that breadth is proof the global offering you're extending is truly worldwide."

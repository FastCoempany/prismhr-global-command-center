---
id: "021"
title: EOR — Employee Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, "Employee Info"]
parent: "020"
children_frontier:
  - "EOR wizard: Job Info (Next)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "First name", kind: field, actions: [] }
  - { name: "Last name", kind: field, actions: [] }
  - { name: "Email address", kind: field, actions: [] }
  - { name: "Employee nationality", kind: field, actions: ["Select a Country (175+ countries incl. sub-regions: Australia states, Canada provinces, China Shanghai/Guangzhou, Switzerland Geneva/Zurich)"] }
  - { name: "Working country", kind: field, actions: ["Select a Country (same 175+ country list)"] }
  - { name: "Work authorization (Singapore)", kind: field, actions: ["Yes", "No"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Next"] }
states: [empty, "filled", "country-specific note (Singapore)"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/081.txt
  dom: dom/081.html
  a11y: a11y/081.yaml
  screenshot: screenshots/081.png
tags: [new-hire, eor, global-hiring, country-selection, compliance, singapore]
---

## What this screen is
Step 01 of the six-step EOR wizard: capture the employee's name, email, **nationality**, and
**working country**, with country-specific compliance prompts appearing based on the selection.

## Capabilities shown
- Six-step progress stepper (Employee Info → Job Info → Compensation → Equipment → Benefits → Submit)
- Nationality and working-country pickers covering **175+ countries**, including sub-national
  jurisdictions (Australian states, Canadian provinces, China Shanghai/Guangzhou, Switzerland
  Geneva/Zurich)
- Country-aware compliance: selecting **Singapore** surfaces a note about local rules on
  vacation, annual bonuses, severance, and benefits, links the **Global Hiring Guide**, and
  asks whether the employee is authorized to work there
- Save & Exit to resume the draft later

## Value narrative (product-led, not discovery)

### For service providers
- The same intake form services any of 175+ countries, down to the sub-region level — you
  onboard a client's hire in Quebec or New South Wales without a country-specific process.
- Local nuance is delivered inline (the Singapore rules note) so your team doesn't need to be
  the in-country expert to run the hire.

### For direct employers
- Nationality and work location are separated, so cross-border situations (a Mexican national
  working from Singapore) are handled as a first-class case, not an exception.
- The moment you pick a country, the product tells you what's different about it — compliance
  guidance shows up where you're working, not in a separate manual.

## Branching
- **If** hiring into a jurisdiction with distinctive rules (e.g. Singapore) **then** show the
  inline country note and Global Hiring Guide link as proof the compliance is built in.
- **If** the audience operates sub-nationally (Canada, Australia, China) **then** open the
  country list and show province/state-level entries.

## Say-this (talk track)
> "First step, who are they and where do they work. That country list is 175-plus deep — right
> down to Canadian provinces and Australian states. And watch: pick Singapore and the product
> immediately flags the local rules on bonuses, severance, and benefits. You don't have to know
> every country's law — the platform does."

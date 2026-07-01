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

### For the PEO partner (channel)
- Your client onboards a hire anywhere — Quebec, New South Wales, `Singapore` — on one intake
  form, with no country-specific process for you to build or staff.
- In-country expertise is baked in: the inline `Note about Singapore` and `Global Hiring
  Guide` link mean neither you nor your client has to be the local law expert.
- The same 175+ country reach across every client makes this a global capability you promote
  once and PrismHR delivers everywhere.

### For the SMB client (via their PEO)
- `Employee nationality` and `Working country` are separate fields, so a cross-border case (a
  Mexican national working from Singapore) is handled as normal, not an exception.
- The moment you pick a country the platform tells you what's different — local rules on
  vacation, bonuses, severance, and benefits surface right where you're hiring, no manual to
  hunt through.

## Branching
- **If** the client is hiring into a jurisdiction with distinctive rules (e.g. `Singapore`)
  **then** show the inline country note and `Global Hiring Guide` link as proof compliance is
  built in.
- **If** the client operates sub-nationally (Canada, Australia, China) **then** open the
  `Select a Country` list and show province/state-level entries.

## Say-this (talk track)
> "First step — who are they and where do they work. That country list is 175-plus deep, right
> down to Canadian provinces and Australian states. And watch: pick Singapore and the platform
> immediately flags the local rules on bonuses, severance, and benefits. Your client doesn't
> have to know every country's law, and neither do you — that's what they're getting through
> you."

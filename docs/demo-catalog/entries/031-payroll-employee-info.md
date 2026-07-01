---
id: "031"
title: Payroll — Employee Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Employee Info"]
parent: "030"
children_frontier:
  - "Payroll wizard: Job Info (Next)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Upload Agreement", "Review"] }
  - { name: "First name", kind: field, actions: [] }
  - { name: "Last name", kind: field, actions: [] }
  - { name: "Email address", kind: field, actions: ["validates format — 'Not a valid email address'"] }
  - { name: "Employee nationality", kind: field, actions: ["Select a Country (180+ countries incl. sub-regions e.g. Canada - Nova Scotia)"] }
  - { name: "Working country", kind: field, actions: ["Select a Country (drives country-specific rules)"] }
  - { name: "Work authorization", kind: field, actions: ["Is the employee authorized to work in {country}? — Yes", "No"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Next"] }
states: [empty, "field prompts / validation", "working country selected (Belize)", "work-authorization + country note shown"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/031.txt
  dom: capture-output-topup/dom/031.html
  a11y: capture-output-topup/a11y/031.yaml
  screenshot: capture-output-topup/screenshots/031.png
tags: [new-hire, payroll, employee-info, nationality, working-country, work-authorization, compliance, global-hiring-guide]
---

## What this screen is
Step 01 of the Payroll wizard: capture the employee's identity (name, email),
**nationality**, and **working country** — with the working country driving
country-specific compliance prompts.

## Capabilities shown
- Basic identity: first name, last name, **email** (validated — "Not a valid email
  address")
- **Nationality** and **working country** each selected from a 180+ country list that
  includes sub-national regions (e.g. Canada - Nova Scotia, Australia - Victoria,
  Switzerland - Zurich)
- Working country drives an inline **country note** and a **work-authorization**
  question — e.g. for Belize: a note that "Belize has many different rules and
  regulations around vacation, annual bonuses, severance, and benefits" with a link to
  the **Global Hiring Guide**, plus "Is the employee authorized to work in Belize?
  (Yes / No)"
- Five-step progress stepper: Employee Info → Job Info → Compensation → Upload
  Agreement → Review

## Value narrative (product-led, not discovery)

### For service providers
- The country picker and the country-specific note mean local rules surface inside the
  onboarding flow — your team isn't the one memorizing Belize's severance and bonus
  law.
- Sub-national regions (Canadian provinces, Australian states, Swiss cantons) are
  first-class, so multi-jurisdiction clients are handled without workarounds.

### For direct employers
- Pick where the person actually works and the platform tells you what's different
  about that country before you go further, including whether work authorization is a
  question you have to answer.
- Nationality and working country are separate fields, so a cross-border hire (Canadian
  national working in Belize) is captured correctly from the start.

## Branching
- **If** compliance is the hot button **then** select a country with a note (Belize)
  and show the inline Global Hiring Guide callout and the work-authorization gate.
- **If** the audience is multi-region within one country **then** open the picker and
  scroll the Canadian provinces / Australian states to show sub-national coverage.

## Say-this (talk track)
> "Name, email, and two country fields — where they're a national and where they
> actually work. Watch what happens when I pick Belize: the platform tells me Belize has
> its own rules on vacation, bonuses, and severance, links me to the hiring guide, and
> asks whether they're authorized to work there. Compliance shows up before I've typed a
> salary."

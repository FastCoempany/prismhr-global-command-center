---
id: "101"
title: Compensation Calculator
status: classified
type: page
module: tools-resources
nav_path: [Dashboard, Tools & Resources, Compensation Calculator]
parent: "100"
children_frontier: []
elements:
  - { name: "Hire-in country selector", kind: field, actions: ["Argentina", "Australia", "Brazil", "Canada", "France", "Germany", "India", "Mexico", "Singapore", "South Africa", "United Kingdom", "United States", "…70+ countries"] }
  - { name: "State / Region selector (optional)", kind: field, actions: ["British Columbia", "Capital Federal", "…in-country regions"] }
  - { name: "Gross salary amount", kind: field, actions: ["Enter amount"] }
  - { name: "Currency selector", kind: field, actions: ["ARS", "CAD", "…local currency"] }
  - { name: "Pay frequency", kind: field, actions: ["Monthly", "Annually"] }
  - { name: "Calculate", kind: button, actions: ["Calculate"] }
  - { name: "Cost Breakdown", kind: card, actions: ["Reset calculator", "Monthly", "Annually"] }
states: [empty, populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/273.txt
  dom: dom/273.html
  a11y: a11y/273.yaml
  screenshot: screenshots/273.png
tags: [compensation, employer-cost, take-home, multi-country, multi-currency, pre-sales]
---

## What this screen is
A calculator that estimates the total employer cost and the employee's net take-home pay for a hire in a chosen country, based on a gross salary, currency, and pay frequency.

## Capabilities shown
- Pick a **hire-in country** from 70+ options, an optional **state/region**, a gross salary, **local currency**, and Monthly/Annually frequency, then Calculate
- **Employer pays** breakdown: Gross salary + Employer Contributions = Total Employer Cost (e.g. Canada 120,000 CAD + 9,670.2 = 129,670.2 CAD annually)
- **Employee gets** breakdown: Gross salary − Deductions = Net salary (e.g. Canada 86,138.88 CAD net)
- Toggle results between **Monthly** and **Annually**; Reset calculator to start over
- Country-specific math — Argentina, Canada, and others each apply their own contribution and deduction rates

## Value narrative (product-led, not discovery)

### For service providers
- A concrete pre-sales asset: model the fully-loaded cost of a hire in any of 70+ countries in local currency, live, in the same platform you'd operate the hire from.
- The split of employer contributions vs. employee deductions makes the true cost of global expansion tangible, which is exactly the number that moves a deal.

### For direct employers
- Before you commit to a hire, you see the total employer cost and the candidate's net pay side by side, in the local currency, with in-country contributions and deductions already applied.
- No guesswork on statutory on-costs — the calculator encodes the country-specific rates so budgeting a cross-border role is a two-minute exercise.

## Branching
- **If** the prospect is weighing which country to hire in **then** run the same salary through two countries (e.g. Canada vs. Argentina) to show the cost delta.
- **If** the audience cares about candidate experience / offers **then** emphasize the "Employee gets" net-pay side.
- **If** they operate multi-region within a country **then** show the state/region selector (e.g. Canada → British Columbia).

## Say-this (talk track)
> "Say you're thinking about a hire in Canada at 120,000 a year. One click and here's the whole picture — your total employer cost with contributions is about 129,670 CAD, and your employee takes home roughly 86,000 after deductions. Change the country and the math changes with it, in local currency. That's the real cost of going global, before you've signed a thing."

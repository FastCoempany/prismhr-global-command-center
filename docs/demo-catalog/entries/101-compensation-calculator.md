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

### For the PEO partner (channel)
- A client-facing pre-sales asset you can put in front of your SMB book: model the fully-loaded cost of a hire in any of 70+ countries, in local currency, live — an instant, credible answer that turns a "should we go global?" conversation into a lead.
- The **Employer pays** vs. **Employee gets** split makes global expansion tangible with zero build on your side — PrismHR Global already owns the in-country rates, so you look like the hero who made the cost question easy.

### For the SMB client (via their PEO)
- Before you commit to a hire, you get an instant "what will this hire actually cost" answer — **Total Employer Cost** (e.g. `129,670.2 CAD`) and the employee's **Net salary** (e.g. `86,138.88 CAD`) side by side, in local currency, with in-country contributions and deductions already applied.
- No legal team, no entity, no statutory-oncost guesswork — the calculator encodes each country's rates, so budgeting your first international role (or your fiftieth) is a two-minute exercise on the platform you already trust.

## Branching
- **If** the client is weighing which country to hire in **then** run the same gross salary through two countries (e.g. **Canada** vs. **Argentina**) to show the **Total Employer Cost** delta.
- **If** the conversation is about the offer / candidate experience **then** emphasize the **Employee gets** net-pay side.
- **If** they hire across regions within a country **then** show the optional **State / Region** selector (e.g. Canada → **British Columbia**).

## Say-this (talk track)
> "Here's the tool your PEO can hand you before you commit to anything. Say you're thinking about a hire in Canada at 120,000 a year — one click on **Calculate** and here's the whole picture: your total employer cost with contributions is about `129,670 CAD`, and your employee takes home roughly `86,000` after deductions. Change the country and the math changes with it, in local currency. That's the real cost of going global, answered in two minutes, before you've signed a thing — no entity, no lawyers."

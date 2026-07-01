---
id: "100"
title: Tools & Resources (Hub)
status: classified
type: page
module: tools-resources
nav_path: [Dashboard, Tools & Resources]
parent: null
children_frontier:
  - Compensation Calculator
  - Holidays Calendar
elements:
  - { name: "Compensation Calculator card", kind: card, actions: ["Open Compensation Calculator"] }
  - { name: "Holidays Calendar card", kind: card, actions: ["Open Holidays Calendar"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/259.txt
  dom: dom/259.html
  a11y: a11y/259.yaml
  screenshot: screenshots/259.png
tags: [tools, self-serve, compensation, holidays, pre-sales]
---

## What this screen is
The Tools & Resources landing page, a hub with two self-serve utilities: a Compensation Calculator and a Holidays Calendar.

## Capabilities shown
- Entry point to a **Compensation Calculator** that estimates employer cost and employee take-home pay by country, amount, and pay frequency
- Entry point to a **Holidays Calendar** covering public holidays across the countries where a team operates
- Each tool is described in-line so users know what it does before opening it

## Value narrative (product-led, not discovery)

### For service providers
- A ready-made set of client-facing tools you can put in front of prospects and existing clients without building anything yourself.
- Estimation and holiday-planning utilities live inside the same platform as payroll and onboarding, so the value story is one login, not a toolkit of disconnected calculators.

### For direct employers
- Practical, always-available utilities for planning global hires and schedules sit right next to the operational screens you use every day.

## Branching
- **If** the conversation is pre-sales / cost-modeling **then** open the Compensation Calculator first.
- **If** the audience runs distributed teams across time zones **then** lead with the Holidays Calendar.

## Say-this (talk track)
> "Beyond the day-to-day workflows, we give you a couple of tools right in the platform — a compensation calculator to model the true cost of a hire in any country, and a holiday calendar so you always know who's off where. No spreadsheets, no separate logins."

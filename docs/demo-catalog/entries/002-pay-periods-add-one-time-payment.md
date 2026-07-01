---
id: "002"
title: Add One-Time Payment
status: classified
type: page
module: dashboard
nav_path: [Dashboard, Add One-Time Payment]
parent: "001"
children_frontier:
  - "Confirm One-Time Payment (step 2)"
  - "Payment Confirmed (success modal)"
  - "Add Another Payment"
  - "Close (returns to Dashboard)"
elements:
  - { name: "Pay Period Type selector", kind: field, actions: ["Last day of the month - EOR", "Last day of the month - CONTRACTOR", "Last day of the month - PAYROLL"] }
  - { name: "Pay Period selector", kind: field, actions: ["[Current] period", "[Next] period"] }
  - { name: "Worker search", kind: field, actions: ["Search workers"] }
  - { name: "Countries filter", kind: button, actions: ["Filter by country"] }
  - { name: "Sort control", kind: button, actions: ["Sort Name"] }
  - { name: "Worker table", kind: table, actions: ["Payment type per worker", "Amount per worker"] }
  - { name: "Payment Type per row", kind: field, actions: ["Signing Bonus", "Commission", "Spiff", "Performance", "Holiday", "Equipment", "Other"] }
  - { name: "Amount input per row", kind: field, actions: ["Enter amount", "Currency locked to worker's local currency"] }
  - { name: "Step navigation", kind: button, actions: ["Back", "Next"] }
  - { name: "Confirm step", kind: button, actions: ["Confirm Payment"] }
states: [details-entry, confirm, confirmed]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/019.txt
  dom: dom/019.html
  a11y: a11y/019.yaml
  screenshot: screenshots/019.png
tags: [pay-periods, one-time-payment, bonus, multi-currency, multi-country, eor, contractor, payroll]
---

## What this screen is
A three-step flow for adding an ad-hoc payment (bonus, commission, equipment, etc.) to a chosen pay period, entering a type and amount per worker in each worker's local currency, then reviewing and confirming.

## Capabilities shown
- Pick the pay period by **type** (EOR, CONTRACTOR, PAYROLL) and by **cycle** (current or next), scoping the worker list accordingly
- Per-worker rows spanning many countries (UK, US, Canada by province, Nicaragua, Taiwan, Egypt, Mexico) with each worker's local currency (GBP, USD, CAD, NIO, TWD) locked to the row
- A fixed set of payment types per worker: Signing Bonus, Commission, Spiff, Performance, Holiday, Equipment, Other
- Search, country filter, and name sort to find workers in a large roster
- A confirm step ("Confirm One-Time Payment") that summarizes each payment converted to local currency, shows total pay and next pay date, and rolls up a currency total before processing
- Success state confirming the payment will land in each worker's next paycheck, with "Add Another Payment" or "Close"

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One flow issues off-cycle pay across **EOR, CONTRACTOR, and PAYROLL** worker types and across countries, so the global bonus/commission motion you extend to clients runs on **PrismHR's in-country entities and experts** — zero build on your side.
- Each amount is entered and confirmed in the worker's own currency and the product handles the conversion, so you can enable clients to reward talent worldwide and look like the hero, with PrismHR absorbing the operational complexity.

### For the SMB client (via their PEO)
- Rewarding a team member in another country is a few clicks on the **same screen you already run payroll from** — no wire, no local intermediary, no new tool to learn.
- The confirm step shows exactly what each worker receives in local currency (GBP, USD, CAD, NIO, TWD) and in which paycheck, so an ad-hoc bonus carries no surprise about timing or FX — done-for-you, whether it's one person or many.

## Branching
- **If** the workforce is contractor-heavy **then** set Pay Period Type to `CONTRACTOR` and issue a bonus across several countries in one pass.
- **If** multi-currency is the theme **then** dwell on the per-row currency lock (GBP/USD/CAD/NIO/TWD) and the local-currency conversion called out on the confirm step.
- **If** payment variety matters **then** open the payment-type dropdown to show `Signing Bonus`, `Commission`, `Spiff`, `Performance`, `Holiday`, `Equipment`, and `Other` all handled in one flow.

## Say-this (talk track)
> "Say you want to hand out a spot bonus. Pick the pay period, find the worker, choose the payment type, type the amount — in their currency, not yours. We show you exactly what they'll receive and in which paycheck, you confirm, and it's done. Same screen whether they're an employee in the UK or a contractor in Taiwan — no entities to set up, no FX to work out yourself."

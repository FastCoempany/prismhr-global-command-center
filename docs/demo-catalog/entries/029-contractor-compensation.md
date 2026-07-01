---
id: "029"
title: Contractor — Compensation
status: classified
type: page
module: new-hire
nav_path: [New Hire, Contractor, Compensation]
parent: "028"
children_frontier:
  - "Contractor wizard: Review (Next)"
  - "Add Additional Payment"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Contractor Info", "Job Info", "Compensation", "Review"] }
  - { name: "Contract type", kind: field, actions: ["Fixed", "Hourly"] }
  - { name: "Payment frequency", kind: field, actions: ["Monthly", "Semi-Monthly", "Bi-Weekly"] }
  - { name: "Payment option (pay date)", kind: field, actions: ["Last business day of the month", "5th business day of the month"] }
  - { name: "Contract payment amount", kind: field, actions: ["USD United States (currency/country selector)"] }
  - { name: "Additional payment", kind: field, actions: ["Add Additional Payment"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "filled", "amount validation error"]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/168.txt
  dom: dom/168.html
  a11y: a11y/168.yaml
  screenshot: screenshots/168.png
tags: [new-hire, contractor, compensation, listopay, multi-currency, invoicing, payments]
---

## What this screen is
Step 03 of the Contractor wizard: set how the contractor is paid — contract type, frequency,
pay date, amount and currency — which drives the monthly invoice totals.

## Capabilities shown
- **Contract type**: Fixed (a fixed amount each month) or Hourly
- **Payment frequency**: Monthly, Semi-Monthly, Bi-Weekly
- **Pay date** option: Last business day of the month (default; "most of your contractors use
  this") or 5th business day of the month
- **Contract payment amount** with a currency/country selector (e.g. USD / United States, "Per
  Month"); amount field validates numeric input
- **Add Additional Payment** for other payments, commissions, or benefits
- Payment rails: contractors are paid through the **ListoPay** digital wallet ("Global payments
  made simple with ListoPay"), with a Learn More link
- Note that these details determine the totals generated for the monthly invoices

## Value narrative (product-led, not discovery)

### For service providers
- Contractor pay terms feed directly into monthly invoice totals, so what you configure here is
  what your client is billed — one flow from setup to invoice.
- Global payout runs on ListoPay's digital wallet, so paying a contractor anywhere is built in
  rather than bolted on.

### For direct employers
- Fixed or hourly, on a chosen pay date, in the currency you pay — contractor comp is set once
  and drives invoicing automatically.
- Cross-border payout is handled through ListoPay, so you pay a contractor abroad without wiring
  up your own international rails.

## Branching
- **If** the audience cares about payment logistics **then** highlight the ListoPay digital
  wallet and the pay-date options.
- **If** invoicing/billing is the theme **then** stress that these inputs generate the monthly
  invoice totals directly.

## Say-this (talk track)
> "Set the contractor's pay — fixed or hourly, the frequency, the pay date, the amount and
> currency. That directly builds your monthly invoice totals. And payout runs on ListoPay's
> digital wallet, so you're paying contractors anywhere in the world without standing up your
> own payment rails."

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
Step 03 of the Contractor wizard: set how the contractor is paid — **Contract type**, **Payment frequency**, pay date, amount, and currency — which "determine the totals generated for your monthly invoices."

## Capabilities shown
- **Contract type**: **Fixed** ("Pay contractors a fixed amount each month") or **Hourly**
- **Payment frequency**: **Monthly**, **Semi-Monthly**, **Bi-Weekly**
- Pay date option: **Last business day of the month** ("Most of your contractors use this") or **5th business day of the month**
- **Contract payment amount** with a currency/country selector (e.g. **USD** / **United States**, "Per Month")
- **Add Additional Payment** for other payments, commissions, or benefits
- Global payout through the **ListoPay digital wallet** ("Global payments made simple with ListoPay") with a **Learn More** link
- Explicit note that these inputs drive the monthly invoice totals
- Wizard actions: **Save & Exit**, **Exit**, **Back**, **Next**

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Contractor pay terms feed straight into monthly invoice totals, so your client gets one clean flow from setup to billing — new revenue from your book with none of the payment infrastructure to build, because PrismHR runs the rails.
- Global payout is built in through **ListoPay**, so you can promise clients they can pay a contractor anywhere without you or they standing up international banking — a real "extend into global with zero build" story.

### For the SMB client (via their PEO)
- Fixed or hourly, on a chosen pay date, in the currency you pay — comp is set once and the monthly invoice generates itself, so paying someone abroad is as simple as paying someone at home.
- Cross-border payout runs on **ListoPay**, so you pay a contractor in another country without wiring up your own international rails or FX — done-for-you, the same safety net your PEO already gives you.

## Branching
- **If** the client cares about payment logistics **then** highlight the **ListoPay** digital wallet and the two pay-date options.
- **If** billing is the theme **then** stress that these inputs generate the monthly invoice totals directly, so setup and invoicing are one flow.

## Say-this (talk track)
> "Here you set the contractor's pay — fixed or hourly, the frequency, the pay date, the amount and the currency. Those choices directly build your monthly invoice totals, so setup and billing are the same flow. And payout runs on ListoPay's digital wallet, which means your client pays a contractor anywhere in the world without ever standing up their own international payment rails — that's all PrismHR."

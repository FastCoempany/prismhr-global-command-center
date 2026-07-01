---
id: "023"
title: EOR — Compensation
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, Compensation]
parent: "022"
children_frontier:
  - "EOR wizard: Equipment (Next)"
  - "Add Additional Payment (modal)"
  - "Amount confirmation / FX (modal)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "Compensation type", kind: field, actions: ["Hourly", "Salary"] }
  - { name: "Local currency", kind: field, actions: ["SGD Singapore (locked to local currency)"] }
  - { name: "Gross monthly salary / Hourly rate", kind: field, actions: [] }
  - { name: "Employment type", kind: field, actions: ["Full-time", "Part-time"] }
  - { name: "Contract term", kind: field, actions: ["Indefinite", "Fixed Term (adds End date)"] }
  - { name: "Additional payment", kind: field, actions: ["Add Additional Payment"] }
  - { name: "Add Additional Payment modal — Pay type", kind: modal, actions: ["Variable Bonus", "Mobile Allowance", "Internet Allowance", "Other Allowance", "Signing Bonus"] }
  - { name: "Add Additional Payment modal — Frequency", kind: modal, actions: ["One Time", "Monthly", "Bi Monthly", "Quarterly", "Semi Annually", "Annually", "Semi Monthly", "Bi Weekly"] }
  - { name: "Vacation and paid time-off", kind: field, actions: ["Edit", "Want to offer Unlimited PTO?"] }
  - { name: "Salary breakdown", kind: card, actions: [] }
  - { name: "Amount confirmation (FX) modal", kind: modal, actions: ["Go Back", "Confirm Amount"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "salary filled with breakdown", "hourly", "fixed-term (end date)", "additional payment added", "add-payment modal open", "PTO edit", "unlimited PTO note", "FX confirmation modal"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/120.txt
  dom: dom/120.html
  a11y: a11y/120.yaml
  screenshot: screenshots/120.png
tags: [new-hire, eor, compensation, local-currency, multi-currency, pto, statutory, benefits, fx]
---

## What this screen is
Step 03 of the EOR wizard: set pay in the employee's **local currency** — salary or hourly,
employment type, contract term, additional payments, and paid time-off — with a live cost
breakdown and an FX confirmation.

## Capabilities shown
- **Local-currency comp**: amount is entered/paid in the employee's local currency (e.g. SGD),
  with a note that pay is in local currency as required by law and excludes contributions/deductions
- Compensation type (Hourly / Salary), Employment type (Full-time / Part-time), Contract term
  (Indefinite / Fixed Term, which adds an End date)
- **Live salary breakdown** showing employer side (gross + total employer contribution =
  total monthly cost, e.g. S$2,000 + S$345 = S$2,345 SGD) and employee side (gross − employee
  contribution, e.g. S$2,000 − S$400 = S$1,600 SGD), with "All calculations are estimates and
  are not guaranteed"
- **Additional payments** via modal — Pay type (Variable Bonus, Mobile/Internet/Other
  Allowance, Signing Bonus) × Frequency (One Time, Monthly, Bi Monthly, Quarterly, Semi
  Annually, Annually, Semi Monthly, Bi Weekly); note that allowances are subject to local tax
  and social security
- **Statutory PTO** surfaced automatically (e.g. Singapore: all local public holidays + 20
  paid days for year one), with fields to add extra days or offer Unlimited PTO (with its own
  informal-arrangement caveat)
- **FX confirmation modal**: converts the local-currency pay to the payer's currency (e.g.
  SGD 2,000.00 the employee receives ≈ USD $1,503.61 you pay), flagged as subject to FX rates

## Value narrative (product-led, not discovery)

### For service providers
- Comp is built and validated in the worker's local currency, with employer-vs-employee cost
  and the payer's-currency equivalent shown side by side — you quote a fully-loaded global cost
  to your client without a spreadsheet.
- Statutory holidays and minimum PTO for the working country pre-populate, so your team isn't
  the one tracking each country's leave law.

### For direct employers
- Enter pay the way the employee experiences it (their currency, their statutory leave) and see
  instantly what it costs you in your own currency including contributions.
- Bonuses and allowances carry their own frequency and tax treatment, so total cost of the hire
  is complete before you move on.

## Branching
- **If** total cost of a global hire is the hot button **then** anchor on the salary breakdown
  (employer contribution + total monthly cost) and the FX confirmation modal.
- **If** local compliance is the concern **then** highlight the auto-populated statutory PTO and
  the "paid in local currency as required by law" and allowance-tax notes.

## Say-this (talk track)
> "Pay is in their local currency — Singapore dollars here — because that's the law. Type the
> salary and the breakdown shows you the real cost: two thousand gross, employer contributions
> on top, total monthly cost. Their statutory holidays and twenty days of leave are already in.
> And before we continue, we show you what that costs in your currency — about fifteen hundred
> US dollars — at today's FX. Full loaded cost, no spreadsheet."

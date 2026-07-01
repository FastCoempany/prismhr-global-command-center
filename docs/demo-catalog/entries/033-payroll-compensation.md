---
id: "033"
title: Payroll — Compensation
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Compensation"]
parent: "032"
children_frontier:
  - "Payroll wizard: Upload Agreement (Next)"
  - "Add Additional Payment (modal)"
  - "Amount confirmation / FX (modal)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Upload Agreement", "Review"] }
  - { name: "Compensation type", kind: field, actions: ["Hourly", "Salary"] }
  - { name: "Currency", kind: field, actions: ["BZD Belize (locked to working-country local currency)"] }
  - { name: "Gross Monthly Salary / Hourly rate", kind: field, actions: [] }
  - { name: "Employment type", kind: field, actions: ["Full-time", "Part-time"] }
  - { name: "Vacation and paid time-off", kind: field, actions: ["Additional Paid Time-off (Days)", "Edit", "Save Changes", "Want to offer Unlimited PTO?"] }
  - { name: "Additional payment", kind: field, actions: ["Add Additional Payment"] }
  - { name: "Add Additional Payment modal — Pay type", kind: modal, actions: ["Variable Bonus", "Mobile Allowance", "Internet Allowance", "Other Allowance", "Signing Bonus"] }
  - { name: "Add Additional Payment modal — Frequency", kind: modal, actions: ["One Time", "Monthly", "Bi Monthly", "Quarterly", "Semi Annually", "Annually", "Semi Monthly", "Bi Weekly"] }
  - { name: "Amount confirmation (FX) modal", kind: modal, actions: ["Go Back", "Confirm Amount"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "PTO edit (Save Changes)", "unlimited PTO note", "add-payment modal open", "FX confirmation modal"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/040.txt
  dom: capture-output-topup/dom/040.html
  a11y: capture-output-topup/a11y/040.yaml
  screenshot: capture-output-topup/screenshots/040.png
tags: [new-hire, payroll, compensation, local-currency, multi-currency, pto, statutory, fx, allowances]
---

## What this screen is
Step 03 of the Payroll wizard: set pay in the employee's **local currency** — salary or
hourly, employment type, statutory + additional PTO, and additional payments — with an
**FX confirmation** before the amount is locked.

## Capabilities shown
- Compensation type (**Hourly / Salary**) with the note "Compensation is paid in local
  currency as required by law. This amount does not include contributions and
  deductions"
- **Currency locked to the working country** (BZD / Belize) — the amount is entered in
  local currency
- Employment type (Full-time / Part-time) with a note that full/part-time hours "may
  vary by country"
- **Statutory PTO surfaced automatically**: "Employees in Belize are legally entitled to
  all local public holidays"; add extra days via **Additional Paid Time-off** (Edit /
  Save Changes) or **offer Unlimited PTO** (with an informal-arrangement caveat: enter
  zero additional days; usable only once statutory vacation is exhausted)
- **Additional payments** via modal — Pay type (Variable Bonus, Mobile/Internet/Other
  Allowance, Signing Bonus) × Frequency (One Time, Monthly, Bi Monthly, Quarterly, Semi
  Annually, Annually, Semi Monthly, Bi Weekly); note that "all allowances added here are
  subject to local tax and social security"
- **FX confirmation modal**: converts the local-currency pay to the payer's currency
  (e.g. BZD 3,500.00/month the employee receives ≈ USD $1,741.86/month you pay), flagged
  as an estimate "subject to foreign exchange rates, which may fluctuate"

## Value narrative (product-led, not discovery)

### For service providers
- Pay is built in the worker's local currency and confirmed against the payer's currency
  in one modal — you quote a client's real cost without a spreadsheet or a separate FX
  lookup.
- Statutory public holidays for the working country pre-populate and allowances carry a
  local-tax note, so your team isn't tracking each country's leave and tax treatment by
  hand.

### For direct employers
- Enter pay the way the employee experiences it — their currency, their statutory
  holidays — and see what it costs you in your own currency before you commit.
- Bonuses and allowances each get their own frequency and a local-tax flag, so the full
  cost of the hire is on the table before the next step.

## Branching
- **If** cross-border cost is the hot button **then** enter the local amount and open the
  FX confirmation modal (BZD → USD) at today's rate.
- **If** local compliance is the concern **then** highlight the auto-populated statutory
  holidays, the "paid in local currency as required by law" note, and the allowance
  local-tax disclaimer.

## Say-this (talk track)
> "Pay is in their local currency — Belize dollars — because that's the law, and their
> public holidays are already in. Add a bonus or allowance with its own frequency, and
> note the local-tax flag. Before I lock it, we show what it costs in your currency:
> about seventeen hundred US dollars a month, at today's rate. Loaded cost, no
> spreadsheet."

---
id: "093"
title: EOR Report
status: classified
type: page
module: reports
nav_path: [Reports, EOR Report]
parent: "090"
children_frontier:
  - Employer Gross Report
  - Employee Gross to Net Report
  - General Ledger Report
  - Variance Report
elements:
  - { name: "Employer Gross Report card", kind: card, actions: ["Open Employer Gross Report"] }
  - { name: "Employee Gross to Net Report card", kind: card, actions: ["Open Gross to Net Report"] }
  - { name: "General Ledger Report card", kind: card, actions: ["Open General Ledger Report"] }
  - { name: "Variance Report card", kind: card, actions: ["Open Variance Report"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/242.txt
  dom: dom/242.html
  a11y: a11y/242.yaml
  screenshot: screenshots/242.png
tags: [reports, eor, employer-gross, gross-to-net, general-ledger, variance]
---

## What this screen is
The EOR Report sub-hub at `/reports/eor` — a card grid routing to the four
employer-of-record reports: Employer Gross, Employee Gross to Net, General Ledger,
and Variance.

## Capabilities shown
- **Employer Gross Report** — total payroll costs for EOR-managed workers, including
  gross wages, taxes, and contributions
- **Employee Gross to Net Report** — gross pay, deductions, and net pay per worker
- **General Ledger Report** — accounting-ready output mapped to your general ledger
- **Variance Report** — payroll changes across periods to flag inconsistencies or trends

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The full EOR reporting suite — **Employer Gross**, **Employee Gross to Net**,
  **General Ledger**, **Variance** — is packaged behind one card, so the finance-grade
  cross-border output your client needs is already built, in-country, by PrismHR.
- GL-ready and variance reports let you back your client's accounting and controls, not
  just payroll execution — clean numbers you can stand behind with the client book you
  introduced.

### For the SMB client (via their PEO)
- Everything finance asks about EOR employment — true employer cost, what employees net,
  what hits the ledger, what changed period over period — is one screen, done for you.
- No exporting raw data and rebuilding it: each report is shaped for an accounting job,
  the same done-for-you safety net your PEO gives you at home, now global.

## Branching
- **If** the conversation is about total cost of employment **then** open **Employer
  Gross Report**.
- **If** the conversation is about finance/audit rigor **then** show **General Ledger
  Report** and **Variance Report** as the accounting-ready pair.
- **If** they care about employee-level pay transparency **then** open **Employee Gross
  to Net Report**.

## Say-this (talk track)
> "For your EOR population this is the whole finance suite in one place: employer gross
> cost, gross-to-net per employee, a general-ledger-ready export, and a variance report
> that flags what changed period to period. It's already built and run in-country, so
> everything your accounting team needs is here without you standing up a thing."

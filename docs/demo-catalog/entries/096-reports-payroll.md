---
id: "096"
title: Payroll Report
status: classified
type: page
module: reports
nav_path: [Reports, Payroll Report]
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
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/251.txt
  dom: dom/251.html
  a11y: a11y/251.yaml
  screenshot: screenshots/251.png
tags: [reports, payroll, employer-gross, gross-to-net, general-ledger, variance]
---

## What this screen is
The Payroll Report sub-hub at `/reports/payroll` — a card grid routing to four
organization-wide payroll reports: Employer Gross, Employee Gross to Net, General
Ledger, and Variance.

## Capabilities shown
- **Employer Gross Report** — total payroll costs for the organization, including
  gross wages, taxes, and contributions
- **Employee Gross to Net Report** — individual earnings, deductions, and net pay
  across a selected period
- **General Ledger Report** — ledger-friendly breakdown mapped to your chart of accounts
- **Variance Report** — compare payroll changes across periods to spot anomalies

## Value narrative (product-led, not discovery)

### For service providers
- The same finance-grade report set (gross, net, GL, variance) is available at the
  organization level, mirroring the EOR suite — consistent reporting across the book.
- Chart-of-accounts mapping means output drops straight into a client's accounting.

### For direct employers
- Organization-wide payroll reporting — total cost, per-employee net, GL mapping, and
  period variance — sits behind one hub.
- Reports are shaped for finance, not raw data you have to reshape.

## Branching
- **If** the audience thinks org-wide rather than EOR-only **then** demo here instead
  of `/reports/eor`, same report shapes.
- **If** accounting integration matters **then** open **General Ledger** and its
  chart-of-accounts mapping.

## Say-this (talk track)
> "At the whole-organization level you get the same finance suite — employer gross,
> gross-to-net, a general-ledger export mapped to your chart of accounts, and variance
> across periods. Reporting that finance can use as-is."

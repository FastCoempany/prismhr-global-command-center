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
Four report cards, each with its own description on the hub:
- **Employer Gross Report** — "View total payroll costs for your organization, including
  gross wages, taxes, and contributions."
- **Employee Gross to Net Report** — "See individual employee earnings, deductions, and net
  pay across a selected period."
- **General Ledger Report** — "Download a ledger-friendly breakdown of payroll data, mapped to
  your chart of accounts."
- **Variance Report** — "Compare payroll changes across periods to spot anomalies, trends, or
  unexpected shifts."

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The same finance-grade set (gross, net, GL, variance) is available org-wide, mirroring the EOR suite — one consistent reporting shape across a client's whole book, whether workers are EOR or on their own payroll, with nothing for you to build.
- The **General Ledger** card's own promise — a ledger-friendly breakdown mapped to your chart of accounts — means output drops straight into the client's accounting, and the **Variance** card is a built-in anomaly check you can run for every client each period.
- Four self-describing cards make this an easy demo: clean cross-border cost, net, GL, and variance views you can put in front of clients and stand behind.

### For the SMB client (via their PEO)
- Organization-wide payroll reporting — total cost, per-employee net, GL mapping, and period-over-period variance — sits behind one hub of four cards, so you get finance-grade output **without building finance ops**.
- Each card is shaped for a finance job (total cost, net pay, chart-of-accounts export, anomaly detection), not raw data you have to reshape.
- It's the same reporting your PEO gives you domestically, now covering your whole cross-border payroll in one place.

## Branching
- **If** the audience thinks org-wide rather than EOR-only **then** demo here instead of `/reports/eor`, same report shapes.
- **If** accounting integration matters **then** open **General Ledger** and its chart-of-accounts mapping.
- **If** payroll controls / audit rigor is the theme **then** open **Variance** to show automatic period-over-period anomaly detection.

## Say-this (talk track)
> "At the whole-organization level you get the same finance suite — employer gross for total cost, gross-to-net per employee, a general-ledger export mapped to your chart of accounts, and a variance report that spots anomalies across periods. Every card is a finance job already done for you, not raw data to reshape — the same reporting your PEO hands you domestically, now global."

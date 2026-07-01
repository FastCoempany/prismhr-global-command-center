---
id: "209"
title: Worker Portal — Time Tracking
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Time Tracking]
parent: null
children_frontier:
  - "Banner: Link Bank Account"
  - "Track Time (log entry)"
elements:
  - { name: "Worker navigation", kind: nav, actions: ["Dashboard", "Payments", "Time Off", "Time Tracking", "Reimbursements", "Resources", "Logout"] }
  - { name: "Bank account banner", kind: banner, actions: ["Link Bank Account"] }
  - { name: "Time filters", kind: field, actions: ["Start Date", "End Date", "Company", "Label"] }
  - { name: "Track Time", kind: button, actions: ["Track Time"] }
  - { name: "Timecards list", kind: table, actions: [] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/076.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/076.yaml
  screenshot: ""
tags: [worker-portal, self-service, time-tracking, timecards, employee-experience]
---

## What this screen is
The worker-facing time-tracking screen in the Worker Portal, where an employee logs and reviews their own hours — shown empty ("No time has been logged yet") for a new worker.

## Capabilities shown
- Self-service time entry for the end worker via a "Track Time" action
- Filtering of logged time by date range, company, and label
- A persistent bank-account prompt tying time work back to pay setup
- Worker-entered time that feeds the same platform admins run payroll from

## Value narrative (product-led, not discovery)

### For service providers
- The time experience your clients' employees get lets workers log their own hours, so the timecard data flowing into the payroll you run originates at the source.
- One portal handles time entry across every client, keeping the collection step consistent no matter whose workforce it is.

### For direct employers
- Your workers record their own time, labelled and dated, feeding straight into payroll instead of through spreadsheets.
- The company and label filters let a worker split time across entities or projects.

## Branching
- **If** the workforce is hourly or project-based **then** emphasize worker-entered time flowing straight into the pay run.
- **If** multi-entity operations matter **then** point to the company filter on logged time.

## Say-this (talk track)
> "Workers log their own time right here with Track Time — labelled, dated, tied to the right company. That data feeds straight into the payroll you run, so you're not collecting hours over email or spreadsheets. It's self-serve at the source."

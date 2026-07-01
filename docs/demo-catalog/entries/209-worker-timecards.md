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
- Self-service time entry for the end worker via a `Track Time` action
- Filtering of logged time by `Start Date`, `End Date`, `Company`, and `Label`
- A persistent `Link Bank Account →` prompt tying time work back to pay setup
- Worker-entered time that feeds the same platform admins run payroll from (empty state: `No time has been logged yet.`)

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The time experience your clients' overseas workers get lets them log their own hours, so the timecard data flowing into payroll originates at the source — a clean, self-serve collection step you extend to clients with no build.
- One portal handles time entry across every client's workforce, keeping the experience consistent as you resell the global offering.

### For the SMB client (via their PEO)
- Your overseas workers record their own time — labelled and dated — feeding straight into payroll instead of through spreadsheets the SMB has to wrangle.
- The `Company` and `Label` filters let a worker split time across entities or projects, so the SMB gets structured hours without building a time process.

## Branching
- **If** the workforce is hourly or project-based **then** emphasize worker-entered time flowing straight into the pay run.
- **If** multi-entity operations matter **then** point to the `Company` filter on logged time.
- **If** the buyer worries about collection effort **then** anchor on `Track Time` putting entry in the worker's hands, off the SMB's plate.

## Say-this (talk track)
> "Workers log their own time right here with Track Time — labelled, dated, tied to the right company. That data feeds straight into payroll, so nobody at the SMB is collecting hours over email or spreadsheets. It's self-serve at the source, and for you it's one more polished piece of the worker experience you can promote to clients."

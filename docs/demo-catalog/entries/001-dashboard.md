---
id: "001"
title: Dashboard (Home)
status: classified
type: page
module: dashboard
nav_path: [Login, Dashboard]
parent: null
children_frontier:
  - New Hire
  - Onboarding
  - Team
  - Invoices
  - Time Off
  - Time Tracking
  - Reimbursements
  - Reports
  - Tools & Resources
  - Settings
  - Support Cases
  - "Pay Periods: Add One-Time Payment (modal)"
  - "Pay Periods: pay run drilldown"
  - "Reimbursements: View Requests"
  - "Reimbursements: row drilldown (e.g. Nina Thompson)"
  - "Time Off: View Requests"
  - "Time Off: row drilldown (e.g. John Contractor)"
  - "Reminders: dismiss (x)"
  - "Header: notifications bell"
  - "Header: support headset"
  - "Header: account menu (DA)"
elements:
  - { name: "Primary navigation", kind: nav, actions: ["Dashboard", "New Hire", "Onboarding", "Team", "Invoices", "Time Off", "Time Tracking", "Reimbursements", "Reports", "Tools & Resources"] }
  - { name: "Secondary navigation", kind: nav, actions: ["Settings", "Support Cases", "Logout"] }
  - { name: "Pay Periods card", kind: card, actions: ["Add One-Time Payment"] }
  - { name: "Reimbursements card", kind: card, actions: ["View Requests"] }
  - { name: "Time Off card", kind: card, actions: ["View Requests"] }
  - { name: "Reminders card", kind: card, actions: ["Dismiss"] }
  - { name: "Links card", kind: card, actions: [] }
  - { name: "Header", kind: header, actions: ["Notifications", "Support", "Account menu"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/001.txt
  dom: dom/001.html
  a11y: a11y/001.yaml
  screenshot: screenshots/001.png
tags: [landing, approvals, multi-currency, eor, contractor]
---

<!-- Value sections below are a PHASE-2 SEED drafted from the screenshot, to show
     the format end to end. They get refined once the real capture artifacts land. -->

## What this screen is
The post-login landing screen for an admin, scoped to a service provider's client
("Antaeus Service Provider – Main Client"). It surfaces everything awaiting action —
pay periods, reimbursements, time-off requests — plus country-aware holiday reminders
and quick links.

## Capabilities shown
- One approval queue spanning **EOR and contractor** pay runs in a single view
- **Multi-currency** amounts (GBP, USD) shown natively, side by side
- Country-aware **holiday reminders** (Canada Day, US Independence Day)
- Client-scoped context ("Service Provider – Main Client")
- Action-first home: pending counts and "Ready to Approve" states up front

## Value narrative (product-led, not discovery)

### For service providers
- One login shows the whole book of client activity that needs action — you operate
  many clients' global payroll without stitching together separate systems.
- EOR and contractor pay runs share one queue: the breadth of the global motion you
  can resell is visible in the first five seconds.

### For direct employers
- The moment you log in, every cross-border obligation that needs a decision is in
  front of you — multi-currency, multi-country, no hunting.
- Local compliance surfaces as reminders (in-country holidays) instead of something
  you have to track yourself.

## Branching
- **If** the workforce is contractor-heavy **then** open the `CONTRACTOR | MONTHLY`
  pay run from this card and show the unified queue, rather than leading with EOR.
- **If** multi-entity / multi-currency operations are the hot button **then** anchor
  on the side-by-side GBP/USD reimbursements and the single approval surface.

## Say-this (talk track)
> "This is the first thing you see when you log in. Notice we're not on a menu hunt —
> every pay run, reimbursement, and time-off request that needs you is right here,
> across EOR and contractors, in whatever currency it was incurred. One screen, your
> entire global book, ready to action."

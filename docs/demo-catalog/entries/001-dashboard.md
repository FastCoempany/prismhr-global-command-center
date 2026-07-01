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

## What this screen is
The post-login landing screen for an admin, scoped to a client ("Antaeus Service Provider – Main Client"), surfacing everything awaiting action — pay periods, reimbursements, time-off requests — plus country-aware holiday reminders and quick links.

## Capabilities shown
- One approval home spanning **EOR and contractor** pay runs in a single view
- **Multi-currency** amounts (GBP, USD) shown natively, side by side, with no manual conversion
- The **Pay Periods** card with `Add One-Time Payment`, plus **Reimbursements** and **Time Off** cards that jump straight into their queues
- Country-aware **holiday reminders** (Canada Day, US Independence Day) surfaced automatically per the workforce's countries
- Client-scoped context banner and a `Links` quick-access card
- Header with notifications, in-product support, and account menu

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One login shows the entire global book of client activity that needs action, so you can promote and even run PrismHR Global for your client base **without building a payroll platform** — the queue is already here.
- EOR and contractor pay runs share one home screen, so the full breadth of the global offering you can extend to clients is visible in the first five seconds — an easy story to demo and resell.
- The client-scoped landing sits inside the trusted PrismHR ecosystem your clients already use, so global becomes a natural extension of what you deliver, not a new vendor.

### For the SMB client (via their PEO)
- The moment you log in, every cross-border obligation that needs a decision is in front of you — multi-currency, multi-country, no hunting — the **same trusted safety net your PEO gives you domestically, now global**.
- In-country **holiday reminders** appear automatically, so local compliance is handled for you instead of something you have to research per country.
- Whether you have one worker abroad or many across countries, the same simple home surfaces exactly what needs you.

## Branching
- **If** the workforce is contractor-heavy **then** open the `CONTRACTOR | MONTHLY` pay run from the Pay Periods card to show the unified queue rather than leading with EOR.
- **If** multi-currency operations are the theme **then** anchor on the side-by-side GBP/USD amounts and the single approval surface.
- **If** in-country compliance is the point **then** point at the auto-generated holiday reminders as a live example of done-for-you local awareness.

## Say-this (talk track)
> "This is the first thing you see when you log in. Notice we're not on a menu hunt — every pay run, reimbursement, and time-off request that needs you is right here, across EOR and contractors, in whatever currency it was incurred. It's even flagging local holidays in the countries you employ people. One screen, your entire global book, ready to action — inside the same PrismHR you already trust."

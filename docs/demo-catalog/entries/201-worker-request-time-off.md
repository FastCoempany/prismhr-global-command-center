---
id: "201"
title: Worker Time Off / Request Time Off
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Time Off]
parent: "200"
children_frontier:
  - "Public Holidays: View Details"
  - "Create Request / Request Time (modal)"
  - "History: Filter (All, Approved, Declined, Cancelled)"
elements:
  - { name: "Create Request", kind: button, actions: ["Create Request", "Request Time"] }
  - { name: "Public Holidays balance", kind: card, actions: ["View Details"] }
  - { name: "Additional Leave balance", kind: card, actions: ["Request Time"] }
  - { name: "Pending Requests list", kind: table, actions: [] }
  - { name: "History list", kind: table, actions: ["Filter"] }
  - { name: "History filter", kind: overlay, actions: ["All", "Approved", "Declined", "Cancelled"] }
  - { name: "Request Time Off form", kind: modal, actions: ["Start Date", "End Date", "Leave Type", "Reason", "Full Day(s)", "Partial Day(s)", "Cancel", "Submit"] }
states: [populated, empty]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/058.txt
  dom: ""
  a11y: capture-output-topup/a11y/058.yaml
  screenshot: ""
tags: [worker-portal, time-off, leave, self-service, public-holidays]
---

## What this screen is
The worker's self-service time-off screen, showing leave balances (Public Holidays and
Additional Leave), pending requests, request history, and a Request Time Off form for
submitting new leave.

## Capabilities shown
- Separate **leave balances** shown up front — Public Holidays (13 days) and Additional
  Leave (3.0 days) — with View Details / Request Time entry points
- **Request Time Off form** with Start/End Date, Leave Type, Reason, and Full Day(s) or
  Partial Day(s) options
- Live **total and projected balance remaining** ("Balance Remaining if request is
  approved: 3.0 days") calculated as the worker fills the form
- Clarifying note that **balances reflect approved time off only** — pending requests
  aren't deducted
- **Pending Requests** and **History** lists with a filter (All, Approved, Declined,
  Cancelled), both empty in this state

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- A polished, locally-aware leave experience — with **Public Holidays** broken out separately from **Additional Leave** — is exactly the kind of professional worker touch you can promote to your PEO clients as part of the global offering.
- The whole leave lifecycle lives in the same platform that runs the worker's pay, so your clients extend into global time-off management with zero build and their overseas people just self-serve.

### For the SMB client (via their PEO)
- Your international hire requests leave themselves against correct balances and sees exactly what they'd have left ("**Balance Remaining (if request is approved): 3.0 days**") before submitting — so your team isn't tracking foreign leave in a spreadsheet.
- Public-holiday entitlement is handled separately from discretionary leave, so a hire in another country gets locally-correct balances without you having to know the local rules.

## Branching
- **If** the client's hires span multiple countries **then** emphasize the separate **Public Holidays** balance as evidence of locally-aware leave the worker sees automatically.
- **If** manager or admin burden is the concern **then** show the live **Balance Remaining (if request is approved)** and the **Pending Requests** / **History** lifecycle that keeps leave off email.

## Say-this (talk track)
> "Your client's overseas hire just opens **Time Off**, sees their public-holiday and additional-leave balances, and submits a request. As they pick dates, the portal tells them what they'll have left if it's approved — and it's clear only approved time counts against the balance. Everything they've requested, pending or historical, is right here — so the same self-service safety net their PEO gives them at home now covers their people abroad, with no spreadsheet on anyone's desk."

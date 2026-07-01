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

### For service providers
- Your clients' employees request leave themselves against country-appropriate balances
  (public holidays are broken out separately), so leave administration doesn't land on
  your service desk.
- The full request lifecycle — submit, pending, approved/declined history — lives in the
  same platform that runs their payroll, keeping leave and pay in one system of record.

### For direct employers
- Workers see exactly how much leave they have and what a request would leave them with
  before they submit — fewer over-requests and back-and-forth with managers.
- Public-holiday entitlement is tracked separately from discretionary leave, so
  cross-border teams get locally correct balances without manual bookkeeping.

## Branching
- **If** the buyer's teams span multiple countries **then** emphasize the separate
  Public Holidays balance as evidence of locally-aware leave.
- **If** approval workflow / manager burden is the concern **then** show the live
  "Balance Remaining if approved" and the Pending/History lifecycle.

## Say-this (talk track)
> "Your worker just opens Time Off, sees their public-holiday and leave balances, and
> submits a request. As they pick dates, the system tells them what they'll have left if
> it's approved — and it's clear that only approved time counts against the balance.
> Everything they've requested, pending or historical, is right here. No email, no
> spreadsheet."

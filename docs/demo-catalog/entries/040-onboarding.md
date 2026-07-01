---
id: "040"
title: Onboarding
status: classified
type: page
module: onboarding
nav_path: [Dashboard, Onboarding]
parent: null
children_frontier:
  - "Continue (resume a draft hire)"
  - "View Worker (open an invited worker)"
  - "Send Reminder (nudge worker for signature)"
  - "Delete (discard a draft)"
  - "Search Workers"
  - "Sort"
  - "Filters"
  - "Pagination: Previous / Next"
elements:
  - { name: "Worker-type tabs", kind: nav, actions: ["All", "Contractor", "Contractor+", "Employer of Record", "Payroll"] }
  - { name: "Search", kind: field, actions: ["Search Workers"] }
  - { name: "Sort", kind: button, actions: ["Sort"] }
  - { name: "Filters", kind: button, actions: ["Filters"] }
  - { name: "Onboarding row", kind: table, actions: ["Continue", "View Worker", "Send Reminder", "Delete"] }
  - { name: "Pagination", kind: nav, actions: ["Previous", "Next"] }
states: [all, filtered_eor, filtered_contractor_plus, filtered_payroll]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/156.txt
  dom: dom/156.html
  a11y: a11y/156.yaml
  screenshot: screenshots/156.png
tags: [onboarding, eor, contractor, contractor-plus, payroll, multi-country, hiring, pipeline]
---

## What this screen is
The onboarding pipeline: a single list of in-progress hires across every worker
type — Contractor, Contractor+, Employer of Record, and Payroll — each showing its
country, engagement type, and current onboarding stage.

## Capabilities shown
- One pipeline for **four engagement models** (Contractor, Contractor+, EOR, Payroll),
  filterable by tab
- Per-worker **country** shown on every row (United Kingdom, Switzerland, Uganda,
  Uzbekistan, Mexico, Singapore, Canada - Nova Scotia, Taiwan, Philippines, United States)
- Stage tracking with distinct states: **In Draft**, **Employee Invited**,
  **Awaiting Offer Letter**, **Awaiting Worker Signature**
- Stage-aware step chips (Contract, Offer Letter, Agreement, Start Date, Employee Info)
- Stage-appropriate actions per row: **Continue** a draft, **View Worker**,
  **Send Reminder** for a pending signature, or **Delete**
- Search, Sort, and Filters over the whole pipeline

## Value narrative (product-led, not discovery)

### For service providers
- Every client's global hires — contractors, EOR employees, and local payroll —
  move through one pipeline, so you run onboarding as a single motion regardless of
  engagement model or country.
- The tab filter lets you slice by worker type instantly, so you can operate a mixed
  book (a Contractor+ in Mexico next to an EOR hire in Singapore) without leaving the view.

### For direct employers
- New hires in the UK, Mexico, Singapore, Uganda, and beyond sit in one list with a
  clear stage on each — you always know exactly what's blocking a start date.
- Actions are stage-aware: the system tells you whether to Continue a draft, invite,
  or Send Reminder, so nothing stalls waiting on you to figure out the next step.

## Branching
- **If** the audience is contractor-heavy **then** filter to the **Contractor** /
  **Contractor+** tabs and show the same pipeline narrowing to independent workers.
- **If** the story is compliant employment across borders **then** filter to
  **Employer of Record** and walk the EOR stages (Offer Letter → Agreement → Start Date).

## Say-this (talk track)
> "Every hire you have in flight lives here — contractors, EOR employees, local
> payroll — across every country, in one pipeline. Each row tells you exactly what
> stage it's in and what to do next: continue a draft, invite the worker, or send a
> reminder. Flip the tabs and you can run just your contractors, or just your EOR
> employees, without leaving the screen."

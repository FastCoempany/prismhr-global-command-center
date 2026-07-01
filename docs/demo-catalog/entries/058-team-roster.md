---
id: "058"
title: Team (Roster)
status: classified
type: page
module: team
nav_path: [Team]
parent: null
children_frontier:
  - "Worker row drilldown (e.g. Yasmin Moore) → Worker Profile — Details"
  - "Row actions: View Profile"
  - "Row actions: View Contract"
  - "Export"
  - "Filter: Countries"
  - "Filter: Type"
  - "Filter: Location"
  - "Filter: Status"
  - "All Workers selector"
  - "Sort"
  - "Pagination: Page 2"
  - "Pagination: Page 3"
elements:
  - { name: "Search people", kind: field, actions: ["Search"] }
  - { name: "All Workers selector", kind: field, actions: ["All", "pick a named worker (20 listed)"] }
  - { name: "Countries filter", kind: field, actions: ["All", "Canada", "Egypt", "Mexico", "Philippines", "United Kingdom", "United States"] }
  - { name: "Type filter", kind: field, actions: ["All", "Contractor", "Contractor+", "EOR", "Payroll"] }
  - { name: "Location filter", kind: field, actions: ["Location"] }
  - { name: "Status filter", kind: field, actions: ["All", "On Hold", "Draft", "Offer Draft", "Offer Sent", "Offer Accepted", "Awaiting Signatures", "Agreement Draft", "Pending Release", "Active", "Offboarded", "Offboard In Progress"] }
  - { name: "Sort", kind: field, actions: ["Newest", "Oldest", "A - Z", "Z - A"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "Worker table", kind: table, actions: ["Open worker profile", "Row actions (…)"] }
  - { name: "Columns", kind: table, actions: ["Name", "Country", "Type", "Location", "Manager", "Contracts", "Status", "Actions"] }
  - { name: "Row actions menu", kind: button, actions: ["View Profile", "View Contract"] }
  - { name: "Pagination", kind: nav, actions: ["Previous", "1", "2", "3", "Next", "7 per page"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/007.txt
  a11y: capture-output-topup/a11y/007.yaml
tags: [team, roster, directory, workforce, multi-country, eor, contractor, export, status]
---

## What this screen is
The Team roster — a searchable, filterable directory of the client's entire workforce
(here **TOTAL WORKERS: 20**) spanning countries and engagement types, paginated 7 per page
across 3 pages, with per-worker status and a drilldown into each profile.

## Capabilities shown
- One roster across **four engagement types side by side** — the **Type** filter offers
  `Contractor`, `Contractor+`, `EOR`, and `Payroll` (all present in the data: e.g. Yasmin
  Moore is Contractor, Alex Demo Worker is EOR, Yasmin Hunt is Contractor+, Jane Employee is
  Payroll)
- **Multi-country** in one directory — the **Countries** filter lists `Canada`, `Egypt`,
  `Mexico`, `Philippines`, `United Kingdom`, `United States`
- Columns: **Name** + job title, **Country**, **Type**, **Location**, **Manager**,
  **Contracts** count, **Status**, **Actions**
- **Status** spans the full worker lifecycle — the filter exposes `On Hold`, `Draft`,
  `Offer Draft`, `Offer Sent`, `Offer Accepted`, `Awaiting Signatures`, `Agreement Draft`,
  `Pending Release`, `Active`, `Offboarded`, `Offboard In Progress` (roster here shows
  mostly `Active` with several `Awaiting Signatures`)
- **Search**, an **All Workers** picker (jump straight to a named worker), **Sort**
  (`Newest`, `Oldest`, `A - Z`, `Z - A`), and one-click **Export**
- Row **Actions (…)** menu → `View Profile` / `View Contract`, plus click-through to the
  full worker profile

## Value narrative (product-led, not discovery)

### For service providers
- A client's whole global workforce in one directory — Contractor, Contractor+, EOR, and
  Payroll together — so you manage the entire book from a single list instead of stitching
  country-by-country tools.
- The Status filter tracks every worker from `Offer Sent` through `Awaiting Signatures` to
  `Active` and on to `Offboarded`, so onboarding progress across the book is one filter away,
  and Export turns the roster into a client-ready report in one click.

### For direct employers
- Your entire distributed team on one screen: who they are, what country, which engagement
  type, who manages them, and exactly where they sit in the onboarding lifecycle — all
  filterable and exportable.
- No separate system per country — one roster spanning the US, UK, Canada, Mexico, Egypt,
  and the Philippines, every worker, every border.

## Branching
- **If** the prospect has a **mixed workforce** **then** open the **Type** filter to show
  Contractor, Contractor+, EOR, and Payroll coexisting in one unified roster.
- **If** cross-country **visibility** is the concern **then** open the **Countries** filter
  to show the six-country spread, then Export.
- **If** **onboarding / lifecycle tracking** is the hot button **then** open the **Status**
  filter and walk the full progression from `Offer Draft` to `Active` to `Offboarded`.

## Say-this (talk track)
> "This is your entire global team in one list — twenty workers here across the US, UK,
> Canada, Mexico, Egypt, and the Philippines, whether they're EOR, a contractor,
> contractor-plus, or on payroll, with their manager and status right there. Filter by
> country, type, or status — you can pull up everyone who's still awaiting signatures versus
> everyone active — sort it, and export it in a single click. There's no separate system per
> country; it's one roster for your whole global workforce."

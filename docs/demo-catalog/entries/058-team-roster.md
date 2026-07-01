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
  - "Export"
  - "New Hire"
  - "Row actions menu (…)"
  - "Filter: Countries"
  - "Filter: Type"
  - "Filter: Location"
  - "Filter: Status"
  - "Sort"
elements:
  - { name: "Search people", kind: field, actions: ["Search"] }
  - { name: "Filter bar", kind: field, actions: ["All Workers", "Countries", "Type", "Location", "Status", "Sort"] }
  - { name: "Export", kind: button, actions: ["Export"] }
  - { name: "Worker table", kind: table, actions: ["Open worker profile", "Row actions (…)"] }
  - { name: "Columns", kind: table, actions: ["Name", "Country", "Type", "Location", "Manager", "Contracts", "Status", "Actions"] }
  - { name: "Pagination", kind: nav, actions: ["Page 1", "Page 2", "Page 3"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/team-roster.txt
  dom: dom/team-roster.html
  a11y: a11y/team-roster.yaml
  screenshot: screenshots/team-roster.png
tags: [team, roster, directory, workforce, multi-country, eor, contractor, export, status]
---

<!-- Cataloged from a screenshot to close the Team-roster gap; enrich when the
     top-up walk captures the full artifacts (all 3 pages + filter options). -->

## What this screen is
The Team roster — a searchable, filterable directory of the client's entire workforce
(here 20 workers) spanning countries and engagement types, with per-worker status and a
drilldown into each profile.

## Capabilities shown
- One roster across **all engagement types side by side** — EOR, Contractor, Contractor+
- **Multi-country** at a glance (country flags: US, UK, Canada, Mexico…)
- Columns: Name + role, Country, Type, Location, Manager, Contracts count, **Status**
  (`Active`, `Awaiting Signatures`)
- **Search**, filters (Countries, Type, Location, Status), **Sort** (e.g. Newest), and **Export**
- Row **Actions (…)** and click-through to the full worker profile; paginated (20 results)

## Value narrative (product-led, not discovery)

### For service providers
- A client's whole global workforce in one directory — EOR and contractors together — so
  you manage the entire book from a single list instead of country-by-country tools.
- Status column surfaces who's `Active` vs `Awaiting Signatures`, and Export turns the
  roster into a client-ready report in one click.

### For direct employers
- Your entire distributed team on one screen: who they are, what country, which engagement,
  who manages them, and whether they're fully onboarded — filterable and exportable.
- No separate system per country — one roster, every worker, every border.

## Branching
- **If** the prospect has a **mixed workforce** (employees + contractors) **then** point at
  the Type column showing EOR, Contractor, and Contractor+ in one unified roster.
- **If** cross-country **visibility** is the concern **then** use the Countries filter and the
  flag column to show the global spread, then Export.

## Say-this (talk track)
> "This is your entire global team in one list — every worker, every country, whether they're
> EOR, a contractor, or contractor-plus, with their manager and status right there. Filter by
> country or type, and export it in a single click. There's no separate system per country —
> it's one roster for your whole global workforce."

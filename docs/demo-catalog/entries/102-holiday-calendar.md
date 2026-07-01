---
id: "102"
title: Holidays Calendar
status: classified
type: page
module: tools-resources
nav_path: [Dashboard, Tools & Resources, Holidays Calendar]
parent: "100"
children_frontier: []
elements:
  - { name: "Country chips", kind: field, actions: ["Canada - Nova Scotia", "Canada", "Canada - Ontario", "United States", "Singapore", "United Kingdom", "Mexico", "Netherlands", "Egypt", "Philippines", "Nicaragua", "Taiwan", "Remove country"] }
  - { name: "Add country selector", kind: field, actions: ["Add country / region"] }
  - { name: "Month navigation", kind: nav, actions: ["Previous month", "Next month"] }
  - { name: "Calendar grid", kind: table, actions: ["View holiday on day"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/275.txt
  dom: dom/275.html
  a11y: a11y/275.yaml
  screenshot: screenshots/275.png
tags: [holidays, calendar, multi-country, scheduling, compliance]
---

## What this screen is
A month-view calendar that overlays public holidays for a selected set of countries and in-country regions onto a single grid.

## Capabilities shown
- Add and remove **countries and regions** as chips (e.g. Canada, Canada - Nova Scotia, Canada - Ontario, United States, Singapore, United Kingdom, Mexico, Netherlands, Egypt, Philippines, Nicaragua, Taiwan)
- Month-by-month navigation (Previous / Next month)
- Holidays render **on their date with a country flag** — e.g. Canada Day (CA-NS and CA-ON) on Jul 1, US Independence Day, Egypt and Nicaragua Revolution Day — so overlapping holidays are visible at a glance
- Region-level granularity within a country (Nova Scotia vs. Ontario shown separately)

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- One calendar shows the public-holiday picture across any set of countries your SMB clients hire into, so the global-coverage advice you'd normally have to source from experts is built into the platform you already promote.
- It's another client-facing tool that comes free with the offering — no build, no local calendars to maintain — reinforcing that extending your clients into global is genuinely low-lift.

### For the SMB client (via their PEO)
- You see, in one grid, which of your global teammates are off and when — including region-specific holidays (e.g. **Canada - Nova Scotia** vs. **Canada - Ontario**) — so scheduling and deadlines account for local time off without you tracking a dozen national calendars.
- Each holiday renders **on its date with a country flag**, so a gap is obvious at a glance — the same done-for-you safety net your PEO gives you domestically, now covering wherever you hire.

## Branching
- **If** the client hires across several countries **then** stack multiple country chips and point out overlapping/staggered holidays in the same month (e.g. Canada Day and US Independence Day).
- **If** they operate within one country across regions **then** show the region-level chips (e.g. **Nova Scotia** vs. **Ontario**).

## Say-this (talk track)
> "As you add people around the world, this is where you see everyone's public holidays on one calendar. Add the countries and regions you care about — right down to Nova Scotia versus Ontario — and every holiday shows up on its date with the flag, so you always know who's off before you plan a pay run or a deadline. It's the kind of local knowledge you'd normally chase down yourself, already built in."

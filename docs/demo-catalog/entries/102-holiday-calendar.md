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

### For service providers
- One calendar shows the holiday picture across an entire multi-country book, so you can advise clients on coverage and pay-run timing without chasing local calendars.

### For direct employers
- You see, in one grid, which of your teams are off and when — including region-specific holidays — so scheduling and deadlines account for local time off automatically.
- Country flags on each holiday make it obvious at a glance where a gap falls, rather than tracking a dozen national calendars yourself.

## Branching
- **If** the team spans several countries **then** stack multiple country chips and point out overlapping/staggered holidays in the same month.
- **If** the audience operates within one country across regions **then** show the region-level chips (e.g. Nova Scotia vs. Ontario).

## Say-this (talk track)
> "If your team is spread across countries, this is where you see everyone's public holidays on one calendar. Add the countries you care about — you can even go region by region — and every holiday shows up on its date with the flag, so you always know who's off before you plan a pay run or a deadline."

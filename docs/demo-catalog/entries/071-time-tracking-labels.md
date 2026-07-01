---
id: "071"
title: Manage Labels
status: classified
type: page
module: time-tracking
nav_path: [Dashboard, Time Tracking, Manage Labels]
parent: "070"
children_frontier:
  - "Create New Label"
  - "Save"
elements:
  - { name: "Labels list", kind: table, actions: ["Edit label"] }
  - { name: "Create New Label", kind: button, actions: ["Create"] }
  - { name: "Save", kind: button, actions: ["Save"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: text/217.txt
  dom: dom/217.html
  a11y: a11y/217.yaml
  screenshot: screenshots/217.png
tags: [time-tracking, labels, configuration]
---

## What this screen is
The configuration screen for time-tracking labels, where the categories used to tag time
entries are created and edited.

## Capabilities shown
- List of existing labels: Business Domain, Client Project, Delivery Phase, Priority,
  Sprint Objective, Work Type
- **Create New Label** and **Save** to add or change labels
- These are the labels applied to time entries and used as filters on the Time Tracking
  screen

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- The time-tracking taxonomy is defined once, so hours across every client can be categorized
  and filtered consistently the way each engagement needs — configurable, not custom-built.

### For the SMB client (via their PEO)
- You control how time is classified — by **Work Type**, **Client Project**, **Delivery
  Phase**, or **Priority** — so timesheets report in your own terms, simply.

## Branching
- **If** the client asks how time is categorized **then** show this screen as the source of
  the labels and filters seen on Time Tracking.

## Say-this (talk track)
> "The labels you filter time cards by aren't fixed — you manage them here. Add a label,
> save, and it's immediately available to tag and slice hours your way."

---
id: "022"
title: EOR — Job Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, "Job Info"]
parent: "021"
children_frontier:
  - "EOR wizard: Compensation (Next)"
  - "Assign Manager (modal)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "Job title", kind: field, actions: [] }
  - { name: "Seniority level", kind: field, actions: ["Not Applicable", "Junior", "Mid", "Senior", "Lead", "Principal", "Director", "Department Head", "Vice President", "Senior Vice President"] }
  - { name: "Job description", kind: field, actions: [] }
  - { name: "Division", kind: field, actions: ["Select division", "Engineering Division", "Product Division"] }
  - { name: "Sub-division (dependent)", kind: field, actions: ["Backend Development"] }
  - { name: "Location", kind: field, actions: ["Unassigned", "San Francisco Office", "New York Office"] }
  - { name: "Reporting Manager", kind: field, actions: ["Assign Manager"] }
  - { name: "Assign Manager modal", kind: modal, actions: ["Search", "Assign", "Cancel", "Confirm Selection"] }
  - { name: "Target start date", kind: field, actions: ["date picker"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "filled", "assign-manager modal open", "date picker open"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/101.txt
  dom: dom/101.html
  a11y: a11y/101.yaml
  screenshot: screenshots/101.png
tags: [new-hire, eor, job, seniority, org-structure, manager, start-date]
---

## What this screen is
Step 02 of the EOR wizard: define the role — job title, **seniority level**, description,
optional org assignment (division/location), reporting manager, and target start date.

## Capabilities shown
- **Seniority** picker spanning the full ladder: Not Applicable, Junior, Mid, Senior, Lead,
  Principal, Director, Department Head, Vice President, Senior Vice President
- Job description carried into the contract ("This section will be included in the original
  agreement")
- Optional **org assignment**: Division (Engineering / Product) with a dependent sub-division
  (e.g. Backend Development), and a Location (Unassigned / San Francisco / New York)
- **Assign Manager** modal listing existing org members with roles (HR, Finance, Admin, Super
  Admin, Owner, Manager, Onboard Only) — the chosen manager approves the hire's time-off,
  reimbursements, etc.; otherwise auto-assigned by org structure
- **Target start date** picker that disables unavailable dates and warns that regulatory,
  visa, or work-permit requirements may delay the earliest start

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- A global hire maps straight onto the client's existing org — divisions, locations, and a
  reporting manager drawn from the client's own team — so the international hire feels like
  part of their business, delivered through you.
- The `Target start date` picker flags visa/work-permit delays inline, so realistic timelines
  are set inside the flow without you fielding the compliance question.

### For the SMB client (via their PEO)
- A full seniority ladder (`Junior` through `Senior Vice President`) and org placement mean a
  cross-border hire slots into your structure exactly like a domestic one.
- Assigning a manager here wires up approvals from day one — that person automatically owns the
  new hire's time-off and reimbursement approvals, the same safety net you already have at home.
- The start date warning about visa/permit timing sets honest expectations up front, so there
  are no surprises after the offer.

## Branching
- **If** org structure and reporting lines matter to the client **then** open `Assign Manager`
  and show role-tagged members and downstream approval routing.
- **If** timelines are the concern **then** open the `Target start date` picker and surface the
  visa/work-permit delay warning as proof of built-in compliance realism.

## Say-this (talk track)
> "Now the role. Pick a seniority from Junior all the way to SVP, drop them into a division and
> office, and assign a manager — that manager approves their time off and expenses from here on,
> just like your client's domestic team. Notice the start date even warns when visa or permit
> timing could push things out. It's role-building and compliance in one step, and it's all
> yours to offer."

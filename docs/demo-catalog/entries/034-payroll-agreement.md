---
id: "034"
title: Payroll — Upload Agreement
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Upload Agreement"]
parent: "033"
children_frontier:
  - "Payroll wizard: Review (Next / Skip)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Upload Agreement", "Review"] }
  - { name: "Custom contract upload", kind: field, actions: ["Upload a Custom Contracts (PDF, PNG, JPG up to 10MB)"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Skip", "Next"] }
states: [empty]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/041.txt
  dom: capture-output-topup/dom/041.html
  a11y: capture-output-topup/a11y/041.yaml
  screenshot: capture-output-topup/screenshots/041.png
tags: [new-hire, payroll, agreement, document-upload, optional]
---

## What this screen is
Step 04 of the Payroll wizard: **optionally** attach a signed employment agreement
before review.

## Capabilities shown
- Upload a **custom contract** — PDF, PNG, or JPG up to 10MB
- Step is explicitly **optional**: a **Skip** action sits alongside Next
- Uploaded document is attached to the employee record (a later "Employment agreement
  uploaded successfully" confirmation appears at Review)

## Value narrative (product-led, not discovery)

### For service providers
- Clients who bring their own paper can attach it here; those who don't just skip — the
  wizard doesn't force a document format on either.

### For direct employers
- Your existing signed agreement rides along with the hire and lands on the employee
  record, without leaving the flow.

## Branching
- **If** the customer uses their own contracts **then** upload here and reference the
  success confirmation at Review.
- **If** they don't **then** hit Skip and move straight to Review — the step is
  optional.

## Say-this (talk track)
> "If you already have a signed agreement, drop it here and it attaches to the record. If
> not, skip it — this step is optional. Either way we go to review."

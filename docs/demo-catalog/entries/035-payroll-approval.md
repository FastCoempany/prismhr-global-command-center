---
id: "035"
title: Payroll — Review & Approval
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Review"]
parent: "034"
children_frontier:
  - "Invite Worker (after Onboard Employee)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Upload Agreement", "Review"] }
  - { name: "Employee Info summary", kind: card, actions: ["Name, Email, Nationality, Working country"] }
  - { name: "Job Info summary", kind: card, actions: ["Job title, Seniority, Description, Sub-department, Direct manager, Start date"] }
  - { name: "Compensation summary", kind: card, actions: ["Compensation type, Contract amount (per month), Employment type, Contract term"] }
  - { name: "Agreement upload confirmation", kind: modal, actions: ["Success — Employment agreement uploaded successfully", "Close"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Onboard Employee"] }
states: [populated, "upload success confirmation"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/042.txt
  dom: capture-output-topup/dom/042.html
  a11y: capture-output-topup/a11y/042.yaml
  screenshot: capture-output-topup/screenshots/042.png
tags: [new-hire, payroll, review, approval, offer-letter, submit]
---

## What this screen is
Step 05 of the Payroll wizard: a **single review** of the whole hire — titled "Submit
Offer Letter to {approver} for Approval" — before **Onboard Employee** commits it.

## Capabilities shown
- Consolidated read-only summary across all prior steps:
  - **Employee Info**: Name (Antaeus Coe), Email, Nationality (Canada - Nova Scotia),
    Working country (Belize)
  - **Job Info**: Job title (Engineer), Seniority (Senior), Description, Sub-department,
    Direct manager (Demo Admin), Start date (Jul 9, 2026)
  - **Compensation**: type (Salary), Contract amount ($3,500.00 per month), Employment
    type (Full-time), Contract term (Indefinite)
- Header frames the submission as **"Submit Offer Letter to {approver} for Approval"** —
  the hire is routed to an approver, not silently created
- Confirms the attached agreement ("Employment agreement uploaded successfully")
- **Onboard Employee** commits the hire and hands off to the worker invite

## Value narrative (product-led, not discovery)

### For service providers
- Everything the client's approver needs to sign off — identity, role, manager, pay,
  currency, term — is on one screen, so approval is a single decision instead of a
  document chase.
- Submitting routes the offer for approval, keeping the client's sign-off in the loop
  rather than bypassing it.

### For direct employers
- One final look at the whole hire — cross-border identity, role, and fully-loaded
  monthly pay — before you commit; nothing is buried across steps.
- Onboarding the employee moves straight into inviting them to the platform.

## Branching
- **If** approval governance is the hot button **then** anchor on the "Submit Offer
  Letter for Approval" header and the single consolidated summary.
- **If** speed is the point **then** show how one screen captures the entire hire before
  Onboard Employee.

## Say-this (talk track)
> "One screen, the whole hire — who they are, the role, their manager, and pay:
> thirty-five hundred a month, salaried, indefinite term. This goes to your approver as
> an offer letter, not straight into the system. Approve it and we onboard the employee
> and invite them in."

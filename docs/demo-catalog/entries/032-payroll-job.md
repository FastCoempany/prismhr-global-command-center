---
id: "032"
title: Payroll — Job Info
status: classified
type: page
module: new-hire
nav_path: [New Hire, Employee, Payroll, "Job Info"]
parent: "031"
children_frontier:
  - "Payroll wizard: Compensation (Next)"
  - "Assign Manager (modal)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Upload Agreement", "Review"] }
  - { name: "Job title", kind: field, actions: [] }
  - { name: "Seniority level", kind: field, actions: ["Not Applicable", "Junior", "Mid", "Senior", "Lead", "Principal", "Director", "Department Head", "Vice President", "Senior Vice President", "C-Level Executive"] }
  - { name: "Job description", kind: field, actions: [] }
  - { name: "Manager (Optional)", kind: field, actions: ["Assign Manager"] }
  - { name: "Assign Manager modal", kind: modal, actions: ["Demo Admin (Owner)", "Demo HR Manager (HR)", "Demo Finance Manager (Finance)", "Alex Demo Worker (Manager)", "Sarah Admin (Admin)", "Mike SuperAdmin (Super Admin)", "John Manager (Manager)", "Emma Onboard (Onboard Only)", "Cancel", "Confirm Selection"] }
  - { name: "Employment start date", kind: field, actions: ["date picker (Previous/Next Month)"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [empty, "assign-manager modal open", "manager assigned (Demo Admin)", "start-date picker open"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/033.txt
  dom: capture-output-topup/dom/033.html
  a11y: capture-output-topup/a11y/033.yaml
  screenshot: capture-output-topup/screenshots/033.png
tags: [new-hire, payroll, job-info, seniority, manager, start-date, approvals]
---

## What this screen is
Step 02 of the Payroll wizard: define the role — job title, **seniority level**, job
description, an optional **direct manager**, and the **employment start date**.

## Capabilities shown
- Job title and free-text job description ("Write a few sentences explaining the role")
- **Seniority level** from a fixed ladder (Not Applicable → Junior, Mid, Senior, Lead,
  Principal, Director, Department Head, VP, SVP, C-Level Executive)
- **Assign Manager** modal that picks the employee's direct report from existing users
  (Demo Admin/Owner, Demo HR Manager, Demo Finance Manager, John Manager, etc.), with
  the note that this manager "will approve time-off requests, reimbursements, etc."
- **Employment start date** via a month calendar picker

## Value narrative (product-led, not discovery)

### For service providers
- Manager assignment wires the new hire into the client's existing approval structure —
  time-off and reimbursement requests route to the right person on day one, no manual
  routing setup.
- Seniority is a controlled ladder, so roles stay consistent across the many workers
  and clients you run.

### For direct employers
- The direct manager you pick here becomes the approver for that employee's requests, so
  the org and the workflow are set together in one step.
- Role, seniority, and start date are captured up front and carry into the review and
  the signed record.

## Branching
- **If** approval hierarchy matters **then** open the Assign Manager modal and show the
  note that the manager approves this employee's time-off and reimbursements.
- **If** consistency across a large workforce is the point **then** show the fixed
  seniority ladder.

## Say-this (talk track)
> "Title, seniority off a standard ladder, a quick description, and who they report to.
> Assigning a manager here isn't cosmetic — that person will approve this employee's
> time off and reimbursements. Set the start date and we're ready for pay."

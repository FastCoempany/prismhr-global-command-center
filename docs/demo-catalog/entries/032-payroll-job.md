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

### For the PEO partner (channel)
- Manager assignment wires the new hire into the client's own approval structure — the
  same manager-approves-requests model your clients already run domestically now extends
  to their global hire, with no routing setup for you.
- Seniority is a controlled ladder, so roles stay consistent across every client and
  every hire you promote PrismHR Global into — low lift, trusted structure.

### For the SMB client (via their PEO)
- The direct manager you pick here becomes the approver for that employee's time-off and
  reimbursement requests, so your org and your workflow are set together in one step —
  the same simple structure your PEO gives you at home, now for someone abroad.
- Role, seniority, and start date are captured once and carry straight into review and
  the signed record — no re-keying, no legal team.

## Branching
- **If** the client cares about approval hierarchy **then** open the **`Assign Manager`**
  modal and show the note that the manager approves this employee's time-off and
  reimbursements.
- **If** consistency across a growing team is the point **then** show the fixed seniority
  ladder (Junior through C-Level Executive).

## Say-this (talk track)
> "Title, seniority off a standard ladder, a quick description, and who they report to.
> Assigning a manager here isn't cosmetic — that person will approve this employee's time
> off and reimbursements, exactly the way your client already runs approvals at home. Set
> the start date and we're ready for pay."

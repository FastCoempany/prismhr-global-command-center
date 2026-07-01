---
id: "026"
title: EOR — Submit Offer
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, Submit]
parent: "025"
children_frontier:
  - "Submit offer to PrismHR for approval"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "Offer summary", kind: card, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Submit"] }
states: [populated]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/149.txt
  dom: dom/149.html
  a11y: a11y/149.yaml
  screenshot: screenshots/149.png
tags: [new-hire, eor, offer, review, approval, submit]
---

## What this screen is
Step 06, the final EOR step: a read-only recap of the whole offer — **Submit Offer Letter to
PrismHR for Approval** — before submission.

## Capabilities shown
- Single review surface consolidating every prior step:
  - **Employee Info:** name, email, nationality, working country (e.g. nationality Mexico,
    working country Singapore)
  - **Job Info:** job title, seniority, description, sub-department, direct manager, start date
  - **Compensation:** compensation type, contract amount (e.g. $2,000.00 per month), employment
    type, contract term (e.g. Indefinite)
  - **Equipment:** policy (e.g. Yes (Reimbursed))
  - **Benefits:** benefit package (e.g. Premium)
- Submit routes the offer to **PrismHR for approval** (the EOR/backer handles the compliant
  employment), with Back to correct any step

## Value narrative (product-led, not discovery)

### For service providers
- The entire cross-border offer — comp, benefits, equipment, start date — is verified on one
  screen before it goes out, so what your client sees is exactly what was assembled.
- Submit hands the compliant employment to PrismHR: you originate and review, the EOR carries
  the legal-employer burden.

### For direct employers
- One glance confirms the whole global hire is right before it's submitted; no toggling between
  steps to double-check comp against benefits.
- Approval flows to PrismHR as the employer of record, so you extend the offer without standing
  up a local entity.

## Branching
- **If** the audience worries about compliance liability **then** emphasize that Submit routes
  to PrismHR for approval as the employer of record.
- **If** speed-to-offer is the theme **then** show how the full package is reviewed and sent
  from this one screen in seconds.

## Say-this (talk track)
> "Last step — everything we built is on one page. Nationality Mexico, working from Singapore,
> two thousand a month, Premium benefits, reimbursed equipment. Looks right? Hit Submit and it
> goes to PrismHR for approval as the employer of record. You made the offer; we carry the
> compliance."

---
id: "041"
title: Onboarding Success (EOR)
status: classified
type: page
module: onboarding
nav_path: [Dashboard, Onboarding, "New Hire (EOR)", "Success"]
parent: "040"
children_frontier:
  - "Go to Onboarding"
  - "Contact us (support)"
elements:
  - { name: "Success confirmation", kind: card, actions: [] }
  - { name: "What happens next steps", kind: card, actions: [] }
  - { name: "Go to Onboarding", kind: button, actions: ["Go to Onboarding"] }
  - { name: "Contact us", kind: button, actions: ["Contact us"] }
states: [populated]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: text/152.txt
  dom: dom/152.html
  a11y: a11y/152.yaml
  screenshot: screenshots/152.png
tags: [onboarding, eor, success, offer-letter, guided, cx-support]
---

## What this screen is
The post-submit confirmation shown after starting an Employer of Record hire, laying
out the sequence of steps that will happen next to complete onboarding.

## Capabilities shown
- Explicit **"what happens next"** sequence: Offer Letter Generated → Invitation to
  Join PrismHR → Onboarding → Employment Agreement Signed
- Offer letter is **auto-generated** from the information already entered and routed
  back for review and approval
- **Candidate invitation** flow: the worker is invited to review the offer, accept,
  and complete their personal information
- **CX team involvement** — a support team guides the candidate through onboarding,
  with the client kept in CC on all communications
- Direct path back via **Go to Onboarding** and a **Contact us** support link

## Value narrative (product-led, not discovery)

### For service providers
- After you submit an EOR hire, the platform tells your client exactly what happens
  next and takes the manual choreography off your plate — offer letter, invitation,
  candidate onboarding, signature.
- The CX team runs the candidate hand-holding with you kept in CC, so you scale global
  hiring without staffing a country-by-country onboarding desk.

### For direct employers
- Submitting an EOR hire isn't the end of a form — it kicks off a guided sequence, and
  this screen sets expectations so you know an offer letter is coming for your approval.
- You stay informed (CC'd on all communications) while a support team walks the new hire
  through onboarding, so the work of getting someone compliantly employed abroad is handled.

## Branching
- **If** the concern is "what happens after I hit submit" **then** walk the four numbered
  steps top to bottom as the guaranteed path to a signed agreement.
- **If** the buyer worries about support burden **then** emphasize the **CX team** guiding
  the candidate with the client kept in CC.

## Say-this (talk track)
> "The moment you submit an EOR hire, you get this. We generate the offer letter from
> what you entered, send it to you to approve, then invite the candidate to accept and
> complete their info. Our CX team guides them through onboarding and keeps you in CC the
> whole way — you'll always know it ends with a signed employment agreement."

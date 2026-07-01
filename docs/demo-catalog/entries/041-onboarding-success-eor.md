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
The **Success!** confirmation shown after starting an Employer of Record hire, laying out the sequence of steps that will happen next to complete onboarding.

## Capabilities shown
- Explicit **"Here's what happens next"** sequence: **Offer Letter Generated** → **Invitation to Join PrismHR** → **Onboarding** → **Employment Agreement Signed**
- **Offer Letter Generated** — auto-created "based on the information you have provided" and sent back to the client for review and approval
- **Invitation to Join PrismHR** — after approval, the candidate is invited to join, review, and accept the offer, then is led into onboarding to gather their personal information
- **Onboarding** — "The CX team will reach out to the candidate to guide and support them throughout their onboarding process, and you will be kept in CC on all communications."
- **Employment Agreement Signed** — "Once signed, the onboarding process is complete!"
- Reassurance ("We'll keep you updated every step of the way") plus **Go to Onboarding** and a **Contact us** support link

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- After the EOR hire is submitted, the platform takes the manual choreography off everyone's plate — offer letter, invitation, candidate onboarding, signature — so you extend clients into compliant global employment with zero build and almost no lift on your side.
- PrismHR's **CX team** runs the candidate hand-holding while the client stays in CC, so you can promote EOR across your book without staffing a country-by-country onboarding desk — PrismHR owns the entities and the experts.

### For the SMB client (via their PEO)
- Submitting an EOR hire isn't the end of a form — it kicks off a guaranteed, guided sequence, and this screen tells you an **Offer Letter** is coming for your approval next, so nothing is ambiguous.
- You stay CC'd on all communications while the **CX team** walks your new hire through onboarding to a signed **Employment Agreement** — the same done-for-you safety net your PEO gives you domestically, now getting someone compliantly employed abroad.

## Branching
- **If** the concern is "what happens after I hit submit" **then** walk the four steps top to bottom as the guaranteed path from **Offer Letter Generated** to **Employment Agreement Signed**.
- **If** the client worries about support burden **then** emphasize the **CX team** guiding the candidate with the client kept in CC on all communications.

## Say-this (talk track)
> "The moment your client submits an EOR hire, they get this. We generate the offer letter from what they entered, send it back for their approval, then invite the candidate to join, accept, and complete their info. Our CX team guides that candidate through onboarding and keeps your client in CC the whole way — and it always ends with a signed employment agreement. That's a fully compliant hire abroad with no entity and no legal team on their side."

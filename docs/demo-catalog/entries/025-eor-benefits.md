---
id: "025"
title: EOR — Benefits
status: classified
type: page
module: new-hire
nav_path: [New Hire, EOR, Benefits]
parent: "024"
children_frontier:
  - "EOR wizard: Submit (Next)"
elements:
  - { name: "Progress stepper", kind: nav, actions: ["Employee Info", "Job Info", "Compensation", "Equipment", "Benefits", "Submit"] }
  - { name: "Offer benefits toggle", kind: field, actions: ["Yes", "No"] }
  - { name: "Standard plan", kind: card, actions: ["Select Standard", "View Standard Plan"] }
  - { name: "Premium plan (Most Popular)", kind: card, actions: ["Select Premium", "View Premium Plan"] }
  - { name: "Premium + Maternity plan", kind: card, actions: ["Select Premium+", "View Premium+ Plan"] }
  - { name: "Wizard actions", kind: button, actions: ["Save & Exit", "Exit", "Back", "Next"] }
states: [populated, "tier selected (Premium)"]
value_tier: high
audiences: [service_provider, direct_employer]
capture:
  text: text/148.txt
  dom: dom/148.html
  a11y: a11y/148.yaml
  screenshot: screenshots/148.png
tags: [new-hire, eor, benefits, supplemental, tiers, pricing, safetywing]
---

## What this screen is
Step 05 of the EOR wizard: optionally add **private supplemental benefits** by choosing from
three priced tiers.

## Capabilities shown
- Optional benefits toggle (Yes / No) — "Do you want to offer private supplemental benefits?
  (Optional)"; benefits may include medical, dental, vision, and maternity
- Three priced tiers, each with coverage and a plan link (SafetyWing):
  - **Standard** — from $130/month — Inpatient Treatments, Outpatient Cover, Dental & Vision Cover
  - **Premium** (MOST POPULAR) — from $210/month — Inpatient Treatments, Outpatient Cover,
    Dental & Vision Cover
  - **Premium + Maternity** — from $260/month — the Premium coverage plus Maternity and Newborn Cover
- Pricing disclaimer on each tier: "*Priced for ages 18-39"
- Per-tier select actions (Select Standard / Premium / Premium+); selecting a tier marks it chosen

## Value narrative (product-led, not discovery)

### For service providers
- Supplemental benefits are a packaged, priced add-on you can attach to any global hire in one
  click — a resellable line item, not a plan you have to source or administer.
- Transparent monthly pricing per tier lets you position benefits to clients on the spot.

### For direct employers
- Competitive private coverage (medical, dental, vision, maternity) is available as three clear
  tiers with upfront pricing — you enrich a cross-border offer without a broker.
- Choosing a tier is optional and reversible in-flow, so benefits are a decision you make at
  offer time, not a separate procurement.

## Branching
- **If** the audience competes on benefits **then** walk the three tiers and land on Premium +
  Maternity to show breadth (maternity and newborn cover).
- **If** cost control is the theme **then** show the transparent per-tier monthly pricing and
  the Optional Yes/No toggle.

## Say-this (talk track)
> "Benefits are optional and packaged. Three tiers — Standard at a hundred thirty a month,
> Premium at two-ten, Premium plus Maternity at two-sixty — each with clear coverage and pricing
> right here. One click adds real private medical, dental, and vision to the offer. No broker,
> no separate plan to stand up."

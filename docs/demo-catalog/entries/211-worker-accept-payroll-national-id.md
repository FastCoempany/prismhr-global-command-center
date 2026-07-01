---
id: "211"
title: Worker Portal — Accept Payroll: National ID
status: classified
type: page
module: worker-portal
nav_path: [Worker Portal, Accept Payroll, National ID]
parent: "212"
children_frontier:
  - "Submit (complete acceptance)"
  - "Back → Address (step 02)"
elements:
  - { name: "Onboarding stepper", kind: nav, actions: ["Personal Information", "Address", "03 Identification"] }
  - { name: "National ID Number field", kind: field, actions: [] }
  - { name: "Front ID upload", kind: field, actions: ["Upload a Front ID"] }
  - { name: "Back ID upload", kind: field, actions: ["Upload a Back ID"] }
  - { name: "Upload confirmation", kind: modal, actions: ["Close"] }
  - { name: "Form actions", kind: button, actions: ["Back", "Submit"] }
states: [populated, error]
value_tier: medium
audiences: [service_provider, direct_employer]
capture:
  text: tools/demo-capture/capture-output-topup/text/067.txt
  dom: ""
  a11y: tools/demo-capture/capture-output-topup/a11y/067.yaml
  screenshot: ""
tags: [worker-portal, onboarding, accept-payroll, identification, compliance, kyc, employee-experience]
---

## What this screen is
Step 03 (Identification) of the new worker's onboarding-acceptance flow, where the hire supplies a national ID number and uploads front and back images of an accepted identity document to satisfy compliance.

## Capabilities shown
- National ID number capture plus front/back document upload (PDF, PNG, JPG up to 10MB)
- Multiple accepted ID types spelled out for the worker (Driver's License, Passport, National ID Card)
- Required-field validation ("Front image of ID card is required") and per-file confirmation ("ID Front uploaded successfully")
- Uploaded-file management (Remove | View) before submission
- A final Submit that completes the acceptance flow

## Value narrative (product-led, not discovery)

### For service providers
- The compliance step your clients' employees get is worker-driven document collection — the hire uploads their own ID against clear requirements, so you gather the identity paperwork every country demands without manual back-and-forth.
- Framed as regulatory compliance and guided by accepted-document lists and validation, the step lands the same way for any client's workforce.

### For direct employers
- Your new hire submits their own identity documents against a clear checklist, with upload confirmation and validation, so you're not emailing to collect and chase ID files.
- Front/back capture and file management put the compliance burden on a guided self-serve step rather than your HR team.

## Branching
- **If** the buyer operates in ID/KYC-heavy jurisdictions **then** emphasize worker-driven document collection with accepted-type guidance and validation.
- **If** onboarding friction is the concern **then** point to the upload confirmation and remove/view controls that make the worker's step self-correcting.

## Say-this (talk track)
> "The last step is compliance. The worker enters their ID number and uploads the front and back themselves — we tell them exactly what documents we accept, validate that both sides are there, and confirm each upload. So the identity paperwork every country requires gets collected by the worker, correctly, without your team chasing files."

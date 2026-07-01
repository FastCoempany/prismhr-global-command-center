---
id: "205"
title: Worker Profile / Security
status: classified
type: tab
module: worker-portal
nav_path: [Worker Portal, Profile, Security]
parent: "200"
children_frontier:
  - "Change Password"
  - "Change Email"
elements:
  - { name: "Profile tabs", kind: nav, actions: ["Personal", "Contracts", "Bank & Tax Info", "Security", "Assignments"] }
  - { name: "Change Password", kind: button, actions: ["Change Password"] }
  - { name: "Change Email", kind: button, actions: ["Change Email"] }
states: [populated]
value_tier: low
audiences: [service_provider, direct_employer]
capture:
  text: capture-output-topup/text/072.txt
  dom: ""
  a11y: capture-output-topup/a11y/072.yaml
  screenshot: ""
tags: [worker-portal, profile, security, account-management, self-service]
---

## What this screen is
The Security tab of the worker's Profile, where the worker manages their own account
credentials.

## Capabilities shown
- **Change Password** — set a unique password to protect the account
- **Change Email** — update the email address used for account notifications

## Value narrative (product-led, not discovery)

### For service providers
- Workers manage their own credentials, so password and email changes never become
  service-desk tickets for your operators.

### For direct employers
- Employees self-serve account security — password and notification email — keeping
  their own access current without IT or HR involvement.

## Branching
- **If** account-management overhead is raised **then** note that credential changes are
  fully worker-owned here.

## Say-this (talk track)
> "Account security is self-service too — the worker changes their own password and the
> email that notifications go to, right from their profile."

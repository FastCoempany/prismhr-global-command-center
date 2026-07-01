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
The **Security** tab of the worker's own Profile, where the end worker manages their own account credentials.

## Capabilities shown
- **Change Password** — `Choose a unique password to protect your account`
- **Change Email** — `Update your email address for account notifications`
- Both grouped under an `Account Security` section the worker owns end to end

## Value narrative (product-led, not discovery)

### For the PEO partner (channel)
- Workers manage their own passwords and notification email, so credential changes never become tickets for you — a self-sufficient experience you can promote as part of the global offering.
- Account self-management is the same across every client's workforce, so the low-lift story holds no matter how many overseas workers you're supporting.

### For the SMB client (via their PEO)
- Your overseas hire keeps their own access current — password and notification email — so the SMB isn't pulled into IT or HR tasks for a remote worker.
- Self-service security is one more thing the portal handles for you rather than something the SMB has to stand up.

## Branching
- **If** account-management overhead is raised **then** note that credential changes are fully worker-owned here, off the SMB's and your plate.
- **If** security posture is questioned **then** point to the worker setting their own unique password and controlling the notification email.

## Say-this (talk track)
> "Account security is self-service too — the worker changes their own password and the email their notifications go to, right from their profile. Nobody at the SMB or on your side gets pulled in. It's a small thing, but it's the kind of polish that makes the whole worker experience feel like a product you'd happily put your brand on."

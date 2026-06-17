# PrismHR Global Command Center

Internal product planning and build repo for a ground-up partner-motion command center.

## Purpose

This app is intended to help manage a CSM-owned PEO channel motion for PrismHR Global and prospect the Chicagoland area for high-fit potential clients.

It is designed around:

- borrowed trust
- CSM relationship ownership
- PEO readiness
- permission states
- off-limits rules
- daily serves
- discovery frameworks
- HML signal intelligence
- external channel development
- Chicago territory prioritization
- Chicagoland prospecting
- internal ambiguity tracking

## Canonical Reading Order

Codex should read these files in order:

1. docs/product/prismhr-global-codex-canon.md
2. docs/research/deep-research-report.md
3. docs/product/updated-master-codex-prompt.md
4. docs/product/ground-up-build-prompt-scaffold.md

## File Roles

### docs/product/prismhr-global-codex-canon.md

Defines what Codex should treat as canon, what remains a hypothesis, and what must be verified internally.

### docs/research/deep-research-report.md

Strategic field manual for the PEO ecosystem, CSM-owned relationship dynamics, external channels, HML signal logic, and operating risks.

### docs/product/updated-master-codex-prompt.md

Main product prompt for planning the app.

### docs/product/ground-up-build-prompt-scaffold.md

Build scaffold that governs how Codex should move from planning to implementation.

## Current Status

Master MVP plan approved. Phase 1A and the first Phase 1B access-control pass are implemented.

Active implementation contract:

- docs/plans/master-mvp-plan.md

Implementation may begin against the approved plan. New product, schema, permission, HML, or note-sensitivity decisions should continue to use the Decision Log process.

The approved plan covers:

- product definition
- MVP scope
- data model
- UX architecture
- technical architecture
- phased implementation plan

## Access Control

Prospect Field is protected by a server-validated access code and an HTTP-only session cookie. A valid code maps to the internal owner `User` row for now.

Required Vercel env:

- `DATABASE_URL`
- `DIRECT_URL`
- `APP_ACCESS_CODE`

Recommended Vercel env:

- `APP_AUTH_COOKIE_SECRET`
- `APP_ACCESS_USER_EMAIL`

Set `APP_ACCESS_CODE` to the shared code. Set `APP_AUTH_COOKIE_SECRET` to a long random value so session cookies are signed independently from the code. Set `APP_ACCESS_USER_EMAIL` when the code session should map to a real owner email instead of the placeholder owner.

## Prime Directive

Do not build CRM soup.

Build a trust-and-signal command center.

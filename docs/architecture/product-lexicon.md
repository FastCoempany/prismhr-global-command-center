---
title: Field Signal Product Lexicon
status: Draft
owner: Antaeus
related_docs:
  - docs/architecture/brand-identity.md
  - docs/architecture/design-system.md
---

# Field Signal Product Lexicon

## Purpose

This lexicon keeps the app out of generic CRM language.

Words in the interface should reinforce the operating model:

- prospecting with evidence;
- relationship motion through CSM-owned trust paths;
- permission before action;
- explainable HML signal;
- daily usefulness;
- internal ambiguity as a real risk.

## Naming Rules

- Prefer nouns that describe operating reality.
- Prefer verbs that describe deliberate action.
- Avoid hype, sales slang, and automation language.
- Avoid language that implies the app touches internal company systems.
- Avoid language that implies outreach is automated.

## Product Name

Use:

- Field Signal
- Field Signal for PrismHR Global

Avoid:

- Prism CRM
- Global CRM
- Lead Command
- Pipeline Center
- Sales OS
- AI Command Center

## Navigation Labels

Use these labels for primary navigation:

- Today
- Prospect Field
- Partner Rooms
- Provider Network
- Opportunities
- Daily Serves
- Promises
- Signal Feed
- Pitch Rail
- Boundaries
- Unknowns
- Governance

Avoid:

- Dashboard as the only home label if `Today` better captures daily work.
- Leads
- Accounts, unless referring to territory accounts specifically.
- Campaigns
- Sequences
- Forecast
- Activities

## Domain Terms

### Prospecting

Use:

- Prospect
- Prospect Field
- Qualification Signal
- Account Signal
- Source Evidence
- Source Confidence
- Watchlist
- Parked
- Channel Path
- Boundary Risk
- Product Relevance

Avoid:

- Lead
- Hot lead
- Cold lead
- Lead score
- Lead source machine
- Scrape target

### Relationship Motion

Use:

- Trust Path
- Relationship Owner
- Permission Posture
- Intro Path
- Private Debrief
- Next Safest Action
- Owner Consent
- CSM Context Needed
- Ownership Unclear

Avoid:

- Bypass
- Sneak around
- Workaround
- Push through
- Contact anyway

### HML Signal

Use:

- High attention
- Medium attention
- Low attention
- High priority
- Medium priority
- Low priority
- High caution
- Signal explanation
- Contributing signals
- Confidence

Avoid:

- AI score
- Magic score
- Engagement score
- Heat score without explanation
- Prediction
- Probability unless mathematically supported

### Boundaries

Use:

- Boundary Rule
- Off-limits
- Hold / sensitive
- Approval required
- Allowed alternative
- Review date
- Set by
- Reason

Avoid:

- Blocker as a generic label.
- Red flag unless paired with explanation.
- Compliance issue unless truly compliance-related.

### Internal Unknowns

Use:

- Internal Unknown
- Needs Owner Decision
- Needs CSM Input
- Needs Internal Confirmation
- Deferred
- Decided
- No Longer Relevant
- Blocks Implementation
- Blocks Action

Avoid:

- TODO as the primary label.
- Mystery.
- TBD everywhere without owner/status.

## CTA Language

### Primary CTAs

- Add prospect
- Add qualification signal
- Record source
- Set permission posture
- Add boundary rule
- Create next safest action
- Log daily serve
- Record outcome
- Add private debrief
- Create promise
- Resolve unknown
- Promote to canon

### Secondary CTAs

- Park for later
- Add to watchlist
- Mark reviewed
- Link provider
- Link partner room
- Add source evidence
- Update confidence
- Create shareable summary

### Forbidden CTAs

- Auto-send
- Blast
- Sequence
- Push to CRM
- Launch campaign
- Enrich automatically
- Scrape contacts
- Close deal
- Crush pipeline

## Status Labels

### Permission Posture

- Research only
- CSM context needed
- CSM approved for discussion
- CSM approved for intro
- Provider engaged
- Client engaged
- Direct contact allowed
- Direct contact not allowed
- Hold / sensitive
- Off-limits
- Ownership unclear

### Source Confidence

- Confirmed
- Strong source
- Medium confidence
- Low confidence
- Unverified
- Inferred
- Hypothesis

### Qualification Signals

- Strong qualification signal
- Moderate qualification signal
- Weak qualification signal
- Watch
- Parked
- Needs research
- Boundary risk

### HML

- High attention
- Medium attention
- Low attention
- High caution
- Confidence: High
- Confidence: Medium
- Confidence: Low

## Empty-State Copy Patterns

Empty states should invite the next useful action.

### Prospect Field

Use:

> Add a Chicagoland prospect and record the first qualification signal.

Avoid:

> No leads yet.

### Partner Rooms

Use:

> Add the first CSM context note, cadence, and known do/dont.

Avoid:

> No activity logged.

### Signal Feed

Use:

> Signals appear after records include source, permission, and action context.

Avoid:

> No insights yet.

### Unknowns

Use:

> Track unresolved facts that could affect permission, schema, data visibility, or external messaging.

Avoid:

> Nothing to show.

## Table Column Naming

Preferred columns:

- Name
- Fit
- Attention
- Permission
- Boundary
- Owner
- Source
- Confidence
- Next Safest Action
- Last Reviewed

Avoid columns:

- Lead Score
- Activity Count
- Last Touch
- AI Rank
- Forecast
- Probability

## Microcopy Rules

- Put the reason near the status.
- Prefer "because" explanations.
- Use human-scale next actions.
- Do not describe features in empty prose.
- Do not describe implementation details, architecture, build phase, storage mode, auth mode, or developer guardrails in product UI.
- Do not imply certainty when source confidence is low.
- Do not use "AI" as an authority.
- Do not use "global" as vague flavor; attach it to a real signal.

Examples:

- Good: "Strong qualification signal because the company is hiring in Canada and has contractor-heavy engineering roles."
- Good: "Permission needed because the related provider is owned by a CSM and no intro path is recorded."
- Bad: "This account is hot."
- Bad: "AI recommends immediate outreach."
- Bad: "Cloud database connected."
- Bad: "Owner writes enabled."

## Error And Warning Language

Use:

- "This action needs permission context first."
- "A boundary rule applies."
- "Source confidence is low."
- "Create a shareable summary instead of using private debrief notes."
- "This recommendation would bypass the relationship owner."

Avoid:

- "Something went wrong" without next step.
- "Forbidden" as user-facing copy unless it is a technical auth failure.
- "You cannot do this" without explaining the safe alternative.

## Review Checklist

- Does the label sound like Field Signal rather than a CRM?
- Does it preserve relationship ownership?
- Does it avoid implying automation?
- Does it explain source or confidence when needed?
- Does it name the next useful action?
- Does it avoid hype?

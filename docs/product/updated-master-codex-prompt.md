# Updated Master Codex Prompt — PrismHR Global Partner-Motion Command Center

## How To Feed Codex The Source Files

Place these files in the repo or upload them into the Codex task context:

```text
/docs
  /research
    deep-research-report.md
  /product
    prismhr-global-codex-canon.md
    updated-master-codex-prompt.md
```

Then paste this prompt into Codex.

Important file-handling instruction for Codex:

```text
Before producing a spec or code, read:

1. /docs/product/prismhr-global-codex-canon.md
2. /docs/research/deep-research-report.md
3. /docs/product/updated-master-codex-prompt.md

Use the canon file as the doctrine layer.
Use the deep research report as supporting background.
Use this updated master prompt as the active task.

Do not code yet.

First, confirm which files you were able to read.
Then summarize:
- what you are treating as canon
- what you are treating as working hypothesis
- what is unclear
- what you recommend for the smallest credible MVP

If you cannot read any referenced file, stop and ask me to paste or upload the missing file.
```

### Source Hierarchy

When sources conflict, use this order:

1. **Internal confirmed facts** — future internal confirmations from PrismHR/Vensure/product/CSM leadership.
2. **`prismhr-global-codex-canon.md`** — doctrine layer.
3. **This updated master prompt** — active task and product request.
4. **`deep-research-report.md`** — supporting research and field-manual background.
5. **Rough notes** — raw source material.

Do not turn public research or inferred strategy into internal fact.

---

# Role

You are my senior product architect, full-stack engineer, sales-ops systems designer, and partner-motion strategist.

I am giving you rough notes, a deep research report, and a canon/hypothesis document for a ground-up internal app.

Do **not** start coding yet.

Your first job is to convert the notes, field manual, and doctrine into:

- a clear product definition
- an MVP scope
- a technical architecture
- a data model
- a UX structure
- a phased build plan
- a set of clarification questions that materially affect architecture, data model, permissions, security, or MVP scope

Treat rough notes as raw material, not final requirements.

Treat the canon file as operating doctrine.

Treat the deep research report as background intelligence.

---

# Context

I am on the inaugural PrismHR Global team of 3.

My title is:

**Global Partner Business Consultant**

The products our team sells are:

- EOR
- Contractor Management
- Contractor Management+

The sales/channel motion is still being built.

Pricing, positioning, internal operating rules, territory/purview, and engagement norms are still evolving.

The app should help me operate, manage, and scale this new PrismHR Global partner/channel motion from the ground up.

---

# Business Motion

A typical lead flow appears to work like this:

1. A CSM checks or gauges a PEO client’s interest in PrismHR Global products.
2. That interest is pushed to me as the PrismHR Global Partner Business Consultant.
3. A meeting is set up with:
   - the CSM
   - the PEO or PEO client
   - me
4. I then run the sales-cycle work:
   - discovery
   - connecting pain to value
   - demoing
   - use-case framing
   - next steps
   - follow-up

Important relationship context:

- CSMs each manage one or more PEOs.
- Those PEOs have large client bases.
- CSMs help their PEOs with growth and development needs.
- PrismHR Global is a new offering the CSMs can introduce to their PEOs.
- When a PEO is interested, we may gain access to the PEO’s client opportunities.
- CSMs may be protective of their PEO relationships.
- The culture, relationship norms, and off-limits rules are not yet fully clear.

---

# Operating Doctrine / Canonical Field Manual

This app must be built from the following operating doctrine.

## Core Strategic Truth

This is not a normal direct-sales motion.

This is a **relationship-owned channel motion** where the scarce asset is borrowed trust.

The app must be designed around this reality:

- CSMs own relationship context.
- CSMs own account politics.
- CSMs own intro timing.
- CSMs own permission boundaries.
- I own specialist diagnosis, use-case framing, product mapping, discovery execution, and recommended next-step design.
- Every introduction spends political capital.
- Every sloppy message creates cleanup debt.
- Every premature ask can damage trust.
- The safest useful specialist wins.

The app should help me become the safest, sharpest, most useful specialist a CSM can bring into their PEO relationships.

## Non-Negotiable Product Philosophy

Do not build a generic CRM.

Do not build an activity tracker pretending to be intelligence.

Do not build a decorative dashboard.

Build a **partner-motion command center** that helps me manage:

- borrowed trust
- relationship permission
- CSM confidence
- PEO readiness
- PEO protectiveness
- off-limits rules
- channel boundaries
- intro paths
- discovery quality
- daily usefulness
- opportunity momentum
- internal ambiguity
- external channel signal
- Chicago territory prioritization

The app should make the invisible operating dynamics visible.

## Relationship Ownership

The app must track:

- who owns the relationship
- who controls access
- who must approve next steps
- who should be in the thread
- who should receive a private debrief before external follow-up

## Permission Status

Every account, PEO, PEO client, opportunity, and channel should have a permission state.

Suggested permission states:

- Research only
- CSM context needed
- CSM approved for discussion
- CSM approved for intro
- PEO engaged
- PEO client engaged
- Direct contact allowed
- Direct contact not allowed
- Hold / sensitive
- Off-limits

## Boundary / Off-Limits Rules

Off-limits rules must be structured, not buried in notes.

Track:

- who is off-limits
- what is off-limits
- when it is off-limits
- why it is off-limits
- who set the boundary
- whether it is temporary or permanent
- whether it applies to a CSM, PEO, client, geography, product, channel, or timing window
- what action is allowed instead
- when the boundary should be reviewed again

## Trust Surface

The app should help protect the CSM’s trust surface.

Track:

- CSM protectiveness level
- CSM communication style
- preferred intro motion
- preferred follow-up motion
- messaging sensitivity
- relationship cadence
- relationship tone
- do’s and don’ts
- what makes this CSM feel supported
- what makes this CSM feel exposed
- whether the CSM wants to stay in every thread
- whether the CSM requires private debriefs before external follow-up

## Daily Serve

The daily serve is not a task. It is a trust-building ritual.

A daily serve is something useful I provide to a CSM that makes their job easier while also advancing the PrismHR Global motion.

Track:

- CSM served
- PEO or account context
- serve category
- content
- why it is useful
- whether it was sent
- whether it was used
- whether it was forwarded
- whether it generated a reply
- whether it created a next step
- whether it improved relationship heat

The app should reward usefulness, not volume.

## HML Signal Meter / Living Digest

HML means **High / Medium / Low**.

HML is not HTML.

HML is not activity volume.

The HML Signal Meter is a living intelligence layer that reads across the entire app and turns scattered inputs into prioritized signal.

The app should “live and breathe” by learning from every input across:

- CSM partner notes
- PEO notes
- PEO client records
- opportunity updates
- external channel activity
- territory research
- discovery notes
- meeting follow-ups
- off-limits rules
- pitch updates
- daily serves
- product/use-case notes
- country/regulatory notes
- internal unknowns

The HML Meter should classify:

- **High** — urgent, high-value, high-risk, or high-probability motion
- **Medium** — meaningful but not immediate
- **Low** — weak, early, unclear, stale, or low-priority signal

It should continuously surface:

- which CSM relationships are warming up
- which CSMs may be protective or slow-moving
- which PEOs show signs of readiness
- which PEOs require caution
- which accounts appear high-potential
- which opportunities are gaining momentum
- which external channels are becoming useful
- which follow-ups are overdue
- which off-limits rules may affect a move
- which Chicago accounts deserve immediate attention
- which product use cases are appearing repeatedly
- which discovery themes are emerging
- where PrismHR Global vs. Vensure Global boundaries may need clarification

Every HML label must explain itself.

No black-box scoring.

## Fact vs. Inference vs. Unknown

The app must distinguish:

- confirmed fact
- public research finding
- CSM-provided context
- internal team-provided context
- reasonable inference
- open question
- unverified assumption

Do not allow inferred information to appear as confirmed truth.

## Internal Ambiguity

The app should track unresolved internal questions as operating risks.

Examples:

- What exactly is PrismHR Global versus Vensure Global?
- Who owns pricing authority?
- Who owns exceptions?
- Who owns opportunity records?
- Who can contact whom directly?
- What is formally off-limits?
- What does Contractor Management+ include?
- What data can be stored in the app?
- Which notes require restricted visibility?

---

# Core App Purpose

Build an internal operating system for managing the PrismHR Global partner motion.

The app should behave less like a static CRM and more like a living partner-motion command center: every note, activity, relationship update, opportunity movement, and territory input should feed an app-wide signal system that helps me see what is High, Medium, or Low priority.

The app should help me:

- manage CSM relationships
- manage PEO relationships
- track interest and readiness
- track lead flow
- identify external channel opportunities
- prioritize territory work, especially Chicago
- build repeatable discovery frameworks
- organize product-specific sales motions
- understand what is off-limits
- serve CSM partners with useful material
- track activity and momentum
- interpret relationship signal
- avoid stepping on CSM-owned trust paths
- document internal unknowns before they become dangerous assumptions

---

# Key Product Areas

## 1. Deck Intake

There is a deck from 12JUN26.

The app should have a place to ingest, summarize, or reference deck-derived content, especially:

- key discovery questions
- product-specific use cases
- international by-country implications
- contractor regulations by country
- payroll intricacies by country
- data/privacy laws by country

For now, assume deck content will be pasted manually or uploaded later.

## 2. CSM Partner Room

Each CSM partner should have a dedicated page or workspace.

Track:

- CSM name
- assigned PEOs
- relationship notes
- communication cadence with each PEO
- PEO protectiveness level
- PrismHR Global interest level
- do’s and don’ts
- off-limits accounts or client types
- preferred intro motion
- preferred follow-up motion
- messaging sensitivity
- open opportunities
- daily serves
- follow-up promises
- next actions
- permission states
- CSM private debrief requirements

The app should help me ask CSMs brief, careful questions such as:

- “What are your do’s and don’ts with this PEO?”
- “What’s your communication cadence with them?”
- “Why this PEO more frequently than that one?”
- “What’s your sense of their interest level in PrismHR Global?”
- “Are there accounts, client types, or situations that are off-limits?”
- “When are they off-limits?”
- “Who specifically is off-limits?”
- “What would make a PrismHR Global resource genuinely useful to you here?”
- “Would you prefer I send a short use-case blurb, discovery cheat sheet, or email language?”

## 3. PEO / Client Network Map

The app should model the network:

- CSMs
- PEOs
- PEO clients
- external channel partners
- potential lead sources
- internal ownership / territory constraints
- permission states
- intro paths
- off-limits rules

It should show how opportunities move from:

```text
CSM → PEO → PEO client → PrismHR Global opportunity → active sales cycle
```

Also track non-CSM-associated PEOs and external channels we may be allowed to pursue.

## 4. External Channel Room

We need to build at least 3 lead-feeder sources outside of the CSM motion.

Known example:

- Chicago Global Chamber

Track:

- channel name
- contact point
- relationship status
- source type
- audience fit
- potential use cases
- conflict risk
- next action
- source quality
- referrals generated
- events/webinars/opportunities
- whether it creates education, direct leads, referrals, or market intelligence

The app should support adding more external channel sources.

## 5. Territory Map

Prioritize Chicago.

The app should include a territory workspace that helps categorize potential clients in Chicago by:

- company
- category
- visible international activity
- contractor intensity
- hiring velocity
- compliance complexity
- likely global workforce need
- relevance to EOR
- relevance to Contractor Management
- relevance to Contractor Management+
- channel path
- boundary risk
- priority score
- next action
- source confidence

It should also help clarify PrismHR Global vs. Vensure Global territory/purview where relevant.

## 6. Discovery Frameworks

Create reusable discovery frameworks by:

- product
- use case
- client shape
- global scenario type
- country/regulatory complexity
- buyer type
- risk type

Products:

- EOR
- Contractor Management
- Contractor Management+

The app should let me create, edit, and reuse discovery question sets.

## 7. Persistent Pitch Column

Every major page should have a persistent side column called **The Pitch**.

This should contain:

- current PrismHR Global pitch
- product-specific talk tracks
- value props
- objection handling
- positioning notes
- meeting prep notes
- CSM-safe version
- PEO-client version
- approved messaging assets
- source/confidence status
- last updated date

This column should be easy to update as messaging evolves.

## 8. Daily Serve System

The app should generate or track daily serves.

Serve categories may include:

- PEO talking point
- client-fit signal
- product explainer
- use-case blurb
- discovery question
- market insight
- compliance watchout
- objection response
- short email language
- meeting prep note
- follow-up language

Track outcomes, not just creation.

## 9. HML Signal Meter / Living Digest

The HML Meter should include:

### Live Signal Feed

- chronological digest of important app-wide updates
- each item tagged High, Medium, or Low
- each item explains why it was classified that way

### Priority Digest

- daily summary of what deserves attention now
- recommends what to do next
- separates Do Now, Do Today, and Watch

### Relationship Heat

- HML classification for CSMs, PEOs, external channels, and territory accounts
- updates as new notes, activities, and outcomes are added

### Opportunity Momentum

- HML classification for opportunity movement
- considers meeting status, follow-up status, interest level, stakeholder engagement, timing, and risk

### Risk / Caution Signals

Surface:

- protective CSM
- unclear ownership
- off-limits account
- weak interest
- stale activity
- Vensure/PrismHR ambiguity
- regulatory complexity
- missing next step
- overdue promise
- messaging sensitivity
- direct-contact restriction

### Explainability

Every signal must include:

- classification
- reason
- contributing signals
- related records
- confidence level
- recommended next action

## 10. Internal Unknowns Tracker

Create a dedicated area for unresolved internal questions.

Each unknown should include:

- question
- category
- current best answer
- source
- confidence
- risk level
- owner
- next verification step
- due date
- resolution status

## 11. Operating Questions

The app should keep these questions visible:

- What is off-limits?
- Who is off-limits?
- When are they off-limits?
- Which PEOs are ready?
- Which CSMs are open?
- Which CSMs are protective?
- Which external channels can feed leads?
- Which Chicago accounts are highest potential?
- Where does PrismHR Global own the motion vs. Vensure Global?
- What can I safely do next?
- What requires permission before action?

---

# Requested Output Before Coding

Produce the following before writing code.

## 1. Product Definition

Include:

- what the app is
- primary user
- secondary users, if any
- core job-to-be-done
- what pain it solves
- what it should not try to be
- how the operating doctrine shapes the product

## 2. MVP Scope

Break features into:

- Must-have for v1
- Should-have for v1.5
- Later
- Explicitly out of scope

The smallest credible MVP should prioritize:

1. CSM Partner Rooms
2. PEO records
3. Permission states
4. Off-limits rules
5. Daily serve tracking
6. HML signal feed
7. Follow-up promises
8. Pitch column
9. Discovery frameworks
10. Internal unknowns tracker

Do not overbuild maps, dashboards, AI summaries, or forecasting before the trust-and-signal layer works.

## 3. Core Data Model

Define the main objects, fields, and relationships.

Likely objects include:

- User
- CSM Partner
- PEO
- PEO Client
- Opportunity
- External Channel
- Territory Account
- Discovery Framework
- Product
- Country / Regulatory Note
- Daily Serve
- Daily Serve Outcome
- Activity
- Pitch Asset
- Off-Limits Rule
- Boundary Rule
- Permission State
- Relationship Owner
- Trust Surface
- Intro Path
- Signal Event
- HML Classification
- HML Explanation
- Internal Unknown
- Source Type
- Source Confidence
- Note Sensitivity
- Follow-Up Promise
- CSM Private Debrief
- Approved Messaging Asset

Add or remove objects if needed.

## 4. UX / App Structure

Propose the main rooms/pages.

Likely rooms:

- Dashboard
- CSM Partner Rooms
- PEO Network
- External Channels
- Territory Map
- Discovery Frameworks
- Daily Serve
- Pitch Library
- HML Signal Feed
- Rules / Off-Limits
- Internal Unknowns
- Follow-Up Promises

For each room, define:

- purpose
- key components
- data shown
- main user actions
- empty states
- HML signals surfaced
- permission/boundary logic surfaced

## 5. Workflow Design

Define the core workflows:

- new CSM relationship setup
- new PEO mapping
- CSM-sourced lead flow
- external-channel lead flow
- daily serve workflow
- discovery prep workflow
- meeting follow-up workflow
- territory prioritization workflow
- off-limits rule capture workflow
- internal unknown verification workflow
- HML signal generation workflow
- private CSM debrief workflow

## 6. HML Signal Engine

Design a v1 rules-based signal engine.

For each category, define:

- input signals
- scoring rules
- High criteria
- Medium criteria
- Low criteria
- caution criteria
- explanation examples
- recommended next action
- data dependencies

Categories:

- CSM relationship heat
- PEO readiness
- PEO protectiveness / caution
- opportunity momentum
- external channel quality
- Chicago territory account potential
- follow-up urgency
- boundary / off-limits risk
- product/use-case frequency
- country/regulatory complexity
- internal ambiguity risk

## 7. Technical Architecture

Recommend a practical stack.

Default preference unless there is a strong reason to change:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Supabase or Postgres
- Prisma if appropriate
- Auth if needed
- Vercel deployment

Include:

- frontend structure
- backend/API structure
- database approach
- auth/permissions approach
- note sensitivity approach
- file/deck intake approach
- HML signal-engine approach
- future AI-assisted summary architecture
- deployment approach

Include an internal signal engine.

For v1, this should be rules-based and explainable.

Later, design so AI-generated summaries and recommendations can be added without rebuilding the data model.

## 8. Build Plan

Create a phased implementation plan:

- Phase 0: project setup
- Phase 1: schema and database
- Phase 2: core CRUD rooms
- Phase 3: permission states, off-limits rules, and follow-up promises
- Phase 4: HML signal engine and dashboard digest
- Phase 5: discovery frameworks and pitch column
- Phase 6: daily serve system
- Phase 7: internal unknowns tracker
- Phase 8: polish, testing, deployment

Do not code until I approve.

## 9. Clarifying Questions

Ask no more than 12 questions.

Only ask questions that materially affect:

- architecture
- data model
- user permissions
- note sensitivity
- MVP scope
- integrations
- security
- deployment

## 10. Recommended Product Name

Suggest 10 internal app names.

Tone:

- serious
- tactical
- premium
- operator-focused
- not cute

---

# Rules

- Do not overbuild.
- Do not assume this is a CRM replacement.
- Design this as a command center for a new partner/channel motion.
- Keep the UI practical, fast, and executive-grade.
- Favor structured operating clarity over decorative dashboards.
- Separate confirmed requirements from assumptions.
- Flag contradictions, unclear areas, and missing information.
- Where notes are vague, propose a sensible default.
- Treat internal ambiguity as a product requirement.
- Treat permission as a product requirement.
- Treat HML explainability as a product requirement.
- Do not write production code until the spec and build plan are approved.

---

# First Required Response From Codex

Your first response must use this exact structure:

```text
# Source Check

## Files I Was Able To Read
- ...

## Files I Could Not Read
- ...

# Canon I Am Treating As Fixed
- ...

# Working Hypotheses I Will Not Hard-Code
- ...

# Key Product Interpretation
- ...

# Smallest Credible MVP Recommendation
- ...

# Open Questions That Matter
1. ...
```

Stop after that first response. Do not produce code.

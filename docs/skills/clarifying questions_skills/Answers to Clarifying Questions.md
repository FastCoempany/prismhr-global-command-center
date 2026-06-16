# Answers to Clarifying Questions

## Operating Assumption

I am the sole product owner, business owner, approver, and final authority for this project.

There are no current teammates, no separate Product team, no separate Legal approver, no assigned CSM approver, and no engineering team involved yet.

Therefore:

* I am the canonical approver.
* I am the owner of canon.
* I am the owner of HML thresholds.
* I am the owner of working-hypothesis promotion.
* I am the owner of build approval.
* I am the owner of exceptions.
* I am the owner of relationship-risk decisions.

That said, the system should still be designed as if future team members, CSMs, Legal, Product, or Engineering could be added later.

The app should not hard-code “solo operator forever.”
It should support “solo operator now; multi-role governance later.”

---

# Clarifying Questions — `prismhr-canon-guardian`

## 1. Should this skill enforce required metadata at CI-time, or only provide advisory checks?

For now, this skill should provide **mandatory advisory checks**, not CI-time enforcement.

The skill should force Codex to label product decisions, fields, workflows, and assumptions as one of:

* Canon
* Public research
* Internal note
* CSM-provided context
* Reasonable inference
* Working hypothesis
* Internal unknown
* Unverified assumption

However, it should not block commits through CI yet.

This is still a planning/pre-build project. CI enforcement would be overkill before the core data model and app structure exist.

Later, once implementation begins, we can introduce lightweight checks for high-risk areas, especially:

* schema changes
* permission-state logic
* off-limits logic
* HML scoring rules
* sensitive note visibility
* canon/hypothesis metadata

For v1, the rule is:

> Advisory in Git. Mandatory in reasoning. No CI blocking yet.

## 2. Which team or role is the canonical owner for moving items from `[Hypothesis]` → `[Canon]`?

I am the canonical owner.

The app and docs should refer to this role as:

**Product Owner / Canon Owner**

For now, that means me.

Future-proofing:

* If the project later includes Product, Legal, CSM leadership, or Engineering, they may become reviewers.
* But until explicitly changed, final canon promotion authority remains with me.

## 3. What evidence or artifacts are required to promote a hypothesis to canon?

A hypothesis can become canon only when there is a clear evidence trail.

Acceptable evidence includes:

1. **Direct internal confirmation**

   * A clear answer from leadership, product, enablement, legal, operations, or another authorized internal stakeholder.

2. **CSM-confirmed operating reality**

   * A CSM explicitly confirms a relationship norm, off-limits rule, PEO preference, intro path, cadence, or account boundary.

3. **Official internal documentation**

   * Decks, enablement materials, pricing docs, rules-of-engagement docs, Slack/email statements, product sheets, or internal process docs.

4. **Repeated field pattern**

   * The same pattern appears across multiple CSMs, PEOs, or opportunities and I intentionally approve it as operational doctrine.

5. **Explicit owner decision**

   * I decide that a working assumption should become canon for v1 because it is stable enough to build around.

Each promoted canon item should include:

* Canon statement
* Former hypothesis
* Evidence source
* Date promoted
* Promoted by
* Confidence level
* Notes / caveats
* Whether it can be revised later

Nothing should become canon merely because Codex inferred it.

---

# Clarifying Questions — `no-crm-soup`

## 1. Should the check be advisory only, or should CI block PRs missing required metadata?

For now: **advisory only**.

The `no-crm-soup` skill should challenge generic CRM thinking during planning, product design, schema design, and feature proposals.

It should not block PRs yet.

Later, once we have a working app, I may want CI or checklist enforcement for required metadata on key objects.

Potential future required metadata:

* relationship owner
* permission state
* off-limits status
* source type
* confidence level
* HML explanation
* next safest action
* sensitivity level

For now, the check should be treated as a required design review, not an automated CI gate.

## 2. Who is the canonical owner for relationship ownership disputes: CSM, Product, or Legal?

For this project, I am the owner of how the app models relationship ownership.

But in the actual business motion, the app should assume:

* The CSM owns the relationship context.
* The CSM owns intro timing.
* The CSM owns account nuance.
* The CSM owns permission boundaries until otherwise clarified.
* I own the app’s operating model and how those dynamics are represented.

If there is a dispute, the app should not pretend to adjudicate reality.

It should mark the relationship as:

**Ownership unclear / requires verification**

Default behavior:

* Do not allow direct-contact assumptions.
* Do not recommend bypassing the CSM.
* Escalate the item into “Internal Unknowns” or “Boundary Risk.”
* Recommend a clarification conversation.

Future state:

* If Legal, Product, CSM leadership, or GTM leadership becomes involved, ownership-dispute resolution can be assigned to a defined internal reviewer.

For now:

> I am the product/canon owner, but the app should treat the CSM as the relationship owner unless clearly proven otherwise.

## 3. What metrics or signals are acceptable vs. disallowed for deriving H/M/L in the `no-crm-soup` checks?

Acceptable signals:

* CSM responsiveness
* CSM stated interest
* CSM protectiveness level
* CSM-approved next step
* PEO readiness
* PEO/client use-case fit
* meeting booked
* follow-up due
* follow-up overdue
* daily serve sent
* daily serve reused
* daily serve forwarded
* daily serve ignored
* off-limits flag
* boundary ambiguity
* direct-contact permission
* product-fit tags
* country/regulatory complexity
* stakeholder engagement
* account research quality
* external-channel movement
* evidence of client urgency
* repeated use-case pattern
* internal unknown blocking action

Disallowed or discouraged signals:

* raw activity volume without meaning
* vanity task counts
* number of notes created
* number of records created
* arbitrary “engagement scores” without explanation
* black-box sentiment
* AI-generated certainty without source evidence
* inferred relationship permission
* assumed account access
* revenue forecast theater before the motion is mature
* “high priority” labels without a reason

The standard is:

> HML must measure interpreted operating signal, not motion cosplay.

---

# Clarifying Questions — `hml-signal-architect`

## 1. Which HML categories require CI enforcement versus advisory warnings?

For now, none require CI enforcement.

All HML categories should be advisory/design-enforced at the reasoning layer.

However, once implementation begins, the following categories should become structurally required in the data model:

* CSM relationship heat
* PEO readiness
* PEO protectiveness / caution
* opportunity momentum
* follow-up urgency
* boundary / off-limits risk
* internal ambiguity risk

Those should not be optional fluff. They are core to the app.

Future CI enforcement may apply to:

* HML rules files
* scoring configuration
* migration files
* schema definitions
* permission-state logic
* off-limits logic

For now:

> Advisory warnings only, but HML explainability must be treated as a non-negotiable product requirement.

## 2. Who owns canonical thresholds for each category: Product, CSM, Legal?

I own the canonical thresholds.

Use the label:

**Product Owner / Canon Owner**

For now, that is me.

Future review roles may include:

* CSM leadership for relationship heat and protectiveness logic
* Product for product-fit scoring
* Legal/compliance for sensitive data, off-limits, or regulatory-risk fields
* Engineering for implementation feasibility

But final approval remains mine until explicitly reassigned.

## 3. Preferred confidence scale: High/Medium/Low or numeric 0–100?

Use **High / Medium / Low** as the primary user-facing confidence scale.

Avoid fake precision.

A numeric 0–100 score can exist internally later, but the product should not lead with it.

Preferred model:

* HML classification: High / Medium / Low
* Explanation: plain English
* Confidence: High / Medium / Low
* Optional internal score: hidden or secondary

Example:

```text
PEO Readiness: High
Confidence: Medium
Reason: The PEO has visible client growth language and the CSM mentioned two clients with international contractor questions, but no meeting has been booked yet.
Recommended next action: Send the CSM a short contractor-management use-case blurb and ask whether one client is safe to discuss.
```

## 4. Any categories requiring regional overrides, e.g. Chicago?

Yes, but keep this simple.

Chicago should be treated as a **priority territory**, not as a totally different rules universe.

Regional override should apply to:

* territory-account potential
* external-channel value
* local ecosystem relevance
* Chicago-based company prioritization
* Chicago Global Chamber and adjacent source scoring

Regional override should not automatically change:

* CSM relationship heat
* off-limits risk
* direct-contact permission
* PEO protectiveness
* internal ambiguity risk

In plain English:

> Chicago can increase account priority. It cannot override relationship permission.

## 5. Which inputs are canonical and where do they live: issue DB, metrics API, sentiment model?

For v1, canonical inputs should live in the app database.

No external metrics API or sentiment model should be considered canonical yet.

Canonical v1 inputs:

* CSM records
* PEO records
* PEO client records
* opportunity records
* external-channel records
* territory-account records
* daily-serve records
* activity records
* follow-up promises
* off-limits rules
* permission states
* internal unknowns
* pitch assets
* discovery frameworks
* manually entered notes
* source type / confidence metadata

Non-canonical v1 inputs:

* AI sentiment
* inferred emotion
* scraped data
* external enrichment
* email metadata
* CRM sync
* Slack messages
* calendar data

Those may become inputs later, but not canon by default.

---

# Clarifying Questions — `relationship-motion-designer`

## 1. Should bypass overrides be permitted only with explicit owner-signed consent, or can a documented Product/CSM escalation approve temporary exceptions?

Since I am the sole owner, bypass overrides can be approved by me.

However, the app should treat bypasses as serious exceptions, not casual actions.

A bypass override should require:

* explicit owner approval
* reason for bypass
* relationship owner
* account affected
* risk level
* expiration date if temporary
* notes on who was informed
* next safest action

In future multi-stakeholder mode, a bypass override may require documented approval from:

* relationship owner
* CSM leader
* Product owner
* Legal or GTM leadership, depending on risk

For now:

> I can approve a bypass, but the app must log it as a deliberate exception.

## 2. Which actions must always be blocked until owner consent?

The following actions should always require explicit approval/permission:

1. Direct outreach to a PEO when the CSM relationship owner is known.
2. Direct outreach to a PEO client.
3. Sharing private CSM debrief notes externally.
4. Sharing sensitive relationship notes outside the app.
5. Exporting sensitive account or relationship data.
6. Marking an account as “direct contact allowed.”
7. Changing an off-limits rule.
8. Overriding a hold/sensitive status.
9. Promoting a hypothesis to canon.
10. Changing HML scoring rules in a way that affects recommendations.
11. Creating a recommended next action that bypasses the relationship owner.
12. Treating a Vensure/PrismHR boundary assumption as confirmed.
13. Sending unapproved product, pricing, or packaging language externally.

For v1, “blocked” may mean the app shows a warning or prevents the action depending on severity.

Suggested levels:

* Warning: soft caution
* Approval required: requires explicit confirmation
* Blocked: cannot proceed until status changes

## 3. Are private CSM debrief notes allowed to be read by Product/Legal for safety reviews? If so, under what process and audit trail requirements?

Current state:

* There is no separate Product or Legal reviewer.
* I am the only reviewer.

So private CSM debrief notes are readable by me.

Future state:

Private CSM debrief notes may be visible to Product, Legal, CSM leadership, or other reviewers only if the app implements:

* role-based access
* note sensitivity labels
* audit trail
* reason-for-access field
* timestamped access log
* viewer identity
* export restrictions
* clear distinction between private notes and shareable summaries

The app should support at least these note types:

* Private CSM debrief
* Internal-only note
* Shareable summary
* External-facing follow-up
* Sensitive boundary note
* Legal/compliance-sensitive note

Default rule:

> Private debrief notes are internal and should not be shared externally. Future broader access must be intentional, logged, and permissioned.

---

# Clarifying Questions — `plan-before-code`

## 1. Who is the canonical approver set for Approved: Product lead, assigned CSM, engineering tech lead?

I am the canonical approver.

Use:

**Approver: Product Owner / Canon Owner**

For now, that means me alone.

No assigned CSM or engineering tech lead is required for approval at this stage.

Future approval roles may be added later, but should not block v1 planning.

## 2. What minimum evidence do reviewers require to mark a plan Approved: design mocks, security signoff, data model unit tests?

For planning approval, I need the following:

1. Clear product definition
2. MVP scope
3. Data model
4. UX/app structure
5. Workflow design
6. Technical architecture
7. HML signal model
8. Permission/off-limits model
9. Risk and ambiguity register
10. Build phases
11. Clarifying questions
12. Explicit assumptions
13. What is canon vs. hypothesis

Design mocks are useful but not required for initial approval.

Security signoff is not required from a separate team because no team exists yet, but the plan must include a privacy/sensitivity review for:

* private CSM notes
* off-limits rules
* account ownership
* sensitive relationship intelligence
* external sharing
* exports

Data model unit tests are not required before plan approval.

They become relevant after implementation begins.

## 3. Are phases strictly sequential, or can small Phase 1 tasks run concurrently with late Phase 0 items, e.g. infra bootstrapping?

Phases should be sequential by default.

However, small setup tasks may run in parallel if they do not lock in major product assumptions.

Allowed early/parallel work:

* repo setup
* package setup
* linting
* formatting
* basic Next.js app shell
* TypeScript config
* Tailwind setup
* shadcn setup
* placeholder folders
* local dev environment
* README updates

Not allowed before approval:

* database schema implementation
* auth model implementation
* migrations
* HML scoring logic
* sensitive-note model
* permission logic
* off-limits logic
* production data structures
* external integrations

The rule:

> Parallelize scaffolding. Do not parallelize irreversible product assumptions.

## 4. Which repos or paths require CI gating based on plan approval, e.g. `src/models/**`, `migrations/**`?

For now, no CI gating is required.

But the following paths should be treated as approval-sensitive once they exist:

* `src/models/**`
* `src/lib/db/**`
* `src/lib/hml/**`
* `src/lib/permissions/**`
* `src/lib/off-limits/**`
* `src/lib/signals/**`
* `src/app/**`
* `supabase/migrations/**`
* `prisma/schema.prisma`
* `db/migrations/**`
* `docs/architecture/data-model.md`
* `docs/architecture/signal-engine.md`
* `docs/architecture/permission-states.md`
* `docs/architecture/hml-scoring-rules.md`
* `docs/product/prismhr-global-codex-canon.md`

Docs can be updated freely, but changes to canon, signal rules, data model, permission logic, or migrations should be explicitly reviewed by me before implementation proceeds.

## 5. Preferred format for planning docs: `docs/plans/<feature>.md` or structured YAML/JSON spec under `plans/`?

Use Markdown first.

Preferred format:

```text
docs/plans/<feature-or-phase>.md
```

Each plan doc should include structured frontmatter at the top.

Example:

```yaml
---
title: CSM Partner Rooms MVP
status: Draft
owner: Antaeus
phase: Phase 2
canon_status: Mixed
requires_approval: true
approved_by:
approved_at:
related_docs:
  - docs/product/prismhr-global-codex-canon.md
  - docs/research/deep-research-report.md
---
```

Then the body should include:

* Purpose
* Canon grounding
* Working hypotheses
* User stories
* Data objects
* UX structure
* Risks
* Open questions
* Acceptance criteria
* Implementation notes

Do not use YAML/JSON as the primary planning format yet.

Markdown is easier to read, argue with, and revise.

## 6. Who will be responsible for resolving the clarifying questions listed in planning docs, and how should deadlines be set?

I am responsible for resolving clarifying questions.

Each open question should have:

* owner
* status
* priority
* impact
* due date if it blocks implementation
* source needed
* decision made
* date resolved

Default owner:

```text
Owner: Antaeus
```

Default deadline logic:

* Blocking architecture/security/data-model questions: resolve before implementation.
* Important but non-blocking workflow questions: resolve before the related phase begins.
* Nice-to-have questions: park in Internal Unknowns.
* Future governance questions: mark as Later / Multi-user Mode.

Suggested statuses:

* Open
* Needs research
* Needs internal confirmation
* Needs CSM input
* Needs owner decision
* Decided
* Deferred
* No longer relevant

The app and repo should avoid false urgency.

Not every unknown blocks the build.

Only unknowns that affect architecture, sensitive data, permissions, canon, or irreversible schema design should block implementation.

---

# Final Governing Rule

This project should stay lightweight but disciplined.

Do not create enterprise bureaucracy around a solo-operator build.

But do not let Codex use “solo operator” as an excuse to blur canon, skip permission logic, or build a generic CRM.

The correct posture is:

> Solo-owner speed with enterprise-grade judgment.

---
title: PrismHR Global Command Center Master MVP Plan
status: Approved
owner: Antaeus
approver_role: Product Owner / Canon Owner
approved_by: Antaeus
approved_at: 2026-06-16
phase: Master planning
canon_status: Mixed
requires_approval: true
related_docs:
  - docs/product/prismhr-global-codex-canon.md
  - docs/research/deep-research-report.md
  - docs/product/updated-master-codex-prompt.md
  - docs/product/ground-up-build-prompt-scaffold.md
  - docs/architecture/brand-identity.md
  - docs/architecture/design-brand-audit.md
  - docs/architecture/design-system.md
  - docs/architecture/field-glyphs.md
  - docs/architecture/product-lexicon.md
  - docs/research/prismhr-global-video-notes.md
  - docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md
  - docs/skills/prismhr-canon-guardian/SKILL.md
  - docs/skills/no-crm-soup/SKILL.md
  - docs/skills/hml-signal-architect/SKILL.md
  - docs/skills/relationship-motion-designer/SKILL.md
  - docs/skills/plan-before-code/SKILL.md
---

# PrismHR Global Command Center Master MVP Plan

## Source Check

### Files Read

- `docs/product/prismhr-global-codex-canon.md`
- `docs/research/deep-research-report.md`
- `docs/product/updated-master-codex-prompt.md`
- `docs/product/ground-up-build-prompt-scaffold.md`
- `docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md`
- The five workspace skill files under `docs/skills/`

### Files Not Read

- None required for this planning pass.

## Approval

This plan is approved by Antaeus as the current Product Owner / Canon Owner.

Approval authorizes implementation to begin against this plan, starting with Phase 0 scaffolding and then Phase 1 schema work. Approval does not authorize pricing logic, AI-determined HML classifications, broad multi-user visibility, or any integration into internal company systems until their relevant unknowns are resolved or explicitly accepted as hypotheses.

## Canon I Am Treating As Fixed

- This is a relationship-owned channel motion, not a generic CRM or direct-sales tracker.
- CSMs own relationship context, account politics, intro timing, and permission boundaries.
- The app must protect borrowed trust and prevent premature or unsafe actions.
- Permission states, off-limits rules, note sensitivity, relationship ownership, and HML explainability are first-class product concepts.
- HML means High / Medium / Low. It must be explainable, rules-based for v1, and based on interpreted operating signal rather than raw activity volume.
- Internal unknowns are operating risks and must be tracked explicitly.
- Antaeus is the current Product Owner / Canon Owner, approver, exception owner, HML threshold owner, and relationship-risk decision owner.
- Current enforcement posture is advisory in Git and mandatory in reasoning. CI blocking is not required yet.

## Working Hypotheses I Will Not Hard-Code

- Exact PrismHR Global versus Vensure Global commercial, contracting, support, territory, pricing, exception, and branding boundaries.
- Exact Contractor Management+ packaging and qualification rules.
- Exact pricing authority, discount authority, legal review, contract ownership, and approval flow.
- Exact direct-contact policy for PEOs, PEO clients, and external-channel accounts.
- Whether any non-CSM-associated PEOs can be pursued directly.
- CSM-specific relationship norms, protectiveness levels, communication preferences, and debrief expectations.
- Final HML scoring weights, decay logic, and thresholds.
- Daily serve cadence by CSM.
- Final Chicago account list and territory scoring weights.
- Future multi-user visibility and note-access rules.

## Product Definition

### What The App Is

The PrismHR Global Command Center is an internal partner-motion operating system and Chicagoland prospecting workspace for managing a new CSM-owned PEO channel motion. It helps the user identify high-fit potential clients in the Chicagoland area while also tracking relationships, permission, readiness, risk, follow-up, daily usefulness, and HML signals across CSMs, PEOs, PEO clients, external channels, and territory accounts.

### Primary User

Antaeus, Global Partner Business Consultant on the inaugural PrismHR Global team.

### Secondary Users

None required for v1. Future secondary users may include CSMs, Product, Legal, GTM leadership, Engineering, or other PrismHR Global team members, but the app must not hard-code solo-operator assumptions.

### Core Job To Be Done

Help the user find high-fit Chicagoland prospects and become the safest, sharpest, most useful specialist a CSM can bring into a PEO relationship by showing what can be safely done next, what requires permission, what is heating up, what is risky, and what unresolved internal facts could make a move dangerous.

### Pain Solved

- Relationship context is fragile and easy to lose in generic notes.
- Chicagoland prospecting needs a structured way to identify, score, and act on high-fit potential clients without violating channel boundaries.
- CSM-owned permission boundaries are not yet fully clear.
- PEO readiness and protectiveness need to be interpreted, not merely recorded.
- Follow-up promises, daily serves, and private CSM debriefs need reliable tracking.
- PrismHR Global versus Vensure Global boundaries and Contractor Management+ packaging are still evolving.
- The user needs a system that turns scattered notes into usable signal without pretending uncertain facts are confirmed.

### What It Should Not Be

- A generic CRM replacement.
- A forecasting dashboard.
- A lead-volume tracker.
- A decorative executive dashboard.
- A direct-outreach automation tool.
- An internal company-system integration layer.
- A black-box AI scoring system.
- A pricing or legal approval engine before those policies are confirmed.

### How Doctrine Shapes The Product

The app is designed around permission before motion. Every meaningful record should carry source, confidence, sensitivity, relationship owner, permission state, and next safest action. HML is not a cosmetic status badge; it is an explainable operating layer that translates trust, readiness, risk, and momentum into action.

## MVP Scope

### Must Have For V1

1. CSM Partner Rooms
   - CSM profiles, assigned PEOs, relationship notes, do/dont guidance, protectiveness, cadence, preferred intro/follow-up motion, private debrief requirement, and daily serves.

2. PEO Records
   - PEO profile, CSM owner, public research notes, readiness, protectiveness, permission state, associated opportunities, clients, and boundary risks.

3. Permission States
   - Structured permission state on CSM, PEO, PEO client, opportunity, external channel, and territory account records.

4. Off-Limits / Boundary Rules
   - Structured records for who/what/when/why, who set the boundary, scope, duration, allowed alternative, and review date.

5. Daily Serve Tracking
   - Serve category, content, recipient, usefulness reason, sent/used/forwarded/replied/next-step outcomes, and signal impact.

6. Follow-Up Promises
   - Promise, owner, recipient, due date, status, sensitivity, related entity, overdue state, and HML urgency.

7. Chicagoland Prospecting / Territory Workspace
   - Target account records, fit scoring, source confidence, channel path, boundary risk, product relevance, and recommended next action for potential Chicagoland clients.

8. HML Signal Feed
   - Rules-based v1 signal events and classifications with explanation, source records, confidence, and recommended next action.

9. Persistent Pitch Column / Pitch Library
   - Current pitch, product talk tracks, objection responses, CSM-safe copy, PEO-client copy, approved messaging assets, source/confidence status, and last updated date.

10. Discovery Frameworks
   - Reusable discovery questions and prep flows by product, use case, client shape, country/regulatory complexity, buyer type, and risk type.

11. Internal Unknowns Tracker
   - Open question, category, current best answer, source, confidence, risk level, owner, verification step, due date, status, and related records.

12. Note Sensitivity And Source Metadata
   - Every note or assertion can identify source type, confidence, sensitivity, and shareability.

### Should Have For V1.5

- External Channel Room with source quality, referrals, events, conflict risk, and next actions.
- Deck intake stub for manually pasted 12JUN26 deck notes.
- Product and country/regulatory note library.
- HML rule editor for owner-approved threshold changes.
- Simple export or print-friendly prep view for meetings.
- Basic audit trail for sensitive note access and bypass overrides.

### Later

- AI-assisted summaries layered on top of rules-based HML outputs.
- Email, calendar, Slack, CRM, or enrichment sync.
- Multi-user RBAC and organization-level governance.
- Automated reminders/notifications.
- Advanced visual network map.
- Forecasting.
- White-label or PEO-facing views.
- Full document upload and vector search.

### Explicitly Out Of Scope For V1

- Direct outreach automation.
- Pricing, discounting, contracting, or legal approval workflows.
- AI-generated final HML classifications.
- Black-box sentiment scoring.
- Broad multi-user collaboration.
- Integrations into internal company systems.
- Production external integrations in v1. Future integrations must use external connections only.
- A general-purpose CRM object model.
- Real customer/PEO client sensitive data until visibility and retention rules are settled.

## Core Data Model

### Shared Metadata Pattern

Most domain records should support:

- `id`
- `name` or `title`
- `description`
- `status`
- `owner_id`
- `source_type`
- `source_confidence`
- `canon_status`
- `note_sensitivity`
- `permission_state`
- `created_at`
- `updated_at`
- `last_reviewed_at`

### Main Objects

#### User

- `id`
- `name`
- `email`
- `role`
- `is_product_owner`
- `is_canon_owner`
- `created_at`

V1 default: one user, Antaeus. Model supports future roles.

#### CSMPartner

- `id`
- `name`
- `email`
- `assigned_peos`
- `relationship_heat`
- `protectiveness_level`
- `communication_cadence`
- `preferred_intro_motion`
- `preferred_followup_motion`
- `private_debrief_required`
- `dos_and_donts`
- `trust_surface_notes`
- `permission_state`
- `next_safest_action`

Relationships: owns or influences many `PEO`, `Opportunity`, `DailyServe`, `FollowUpPromise`, and `PrivateDebrief` records.

#### PEO

- `id`
- `name`
- `relationship_owner_id`
- `public_research_summary`
- `industry_focus`
- `client_base_notes`
- `global_fit_signals`
- `readiness_level`
- `protectiveness_level`
- `permission_state`
- `preferred_intro_path_id`
- `off_limits_summary`
- `next_safest_action`

Relationships: belongs to a CSM owner when known; has many PEO clients, opportunities, boundary rules, notes, and HML classifications.

#### PEOClient

- `id`
- `name`
- `peo_id`
- `industry`
- `countries`
- `worker_types`
- `use_case_fit`
- `permission_state`
- `source_confidence`
- `boundary_risk`
- `note_sensitivity`

V1 may allow placeholder or anonymized client records if sensitivity is unclear.

#### Opportunity

- `id`
- `name`
- `source_type`
- `source_record_id`
- `relationship_owner_id`
- `peo_id`
- `peo_client_id`
- `product_interest`
- `stage`
- `next_step`
- `next_step_owner`
- `follow_up_due_at`
- `permission_state`
- `momentum_level`
- `risk_flags`

#### ExternalChannel

- `id`
- `name`
- `source_type`
- `contact_point`
- `relationship_status`
- `audience_fit`
- `likely_use_cases`
- `conflict_risk`
- `source_quality`
- `referrals_generated`
- `next_action`
- `permission_state`

#### TerritoryAccount

- `id`
- `company_name`
- `location`
- `category`
- `visible_international_activity`
- `contractor_intensity`
- `hiring_velocity`
- `compliance_complexity`
- `channel_accessibility`
- `boundary_risk`
- `chicago_priority`
- `priority_score`
- `source_confidence`
- `next_action`

#### Product

- `id`
- `name`
- `definition`
- `canon_status`
- `qualification_criteria`
- `discovery_framework_id`
- `pricing_status`
- `approval_notes`

V1 products: EOR, Contractor Management, Contractor Management+.

#### DiscoveryFramework

- `id`
- `name`
- `product_id`
- `use_case`
- `client_shape`
- `buyer_type`
- `risk_type`
- `question_set`
- `red_flags`
- `demo_focus`
- `objection_responses`
- `canon_status`

#### DailyServe

- `id`
- `recipient_csm_id`
- `related_peo_id`
- `related_account_id`
- `category`
- `content`
- `why_useful`
- `sent_at`
- `status`
- `outcome_id`
- `signal_impact`

#### DailyServeOutcome

- `id`
- `daily_serve_id`
- `used`
- `forwarded`
- `reply_generated`
- `next_step_created`
- `relationship_heat_change`
- `notes`

#### FollowUpPromise

- `id`
- `promise`
- `made_to`
- `owner_id`
- `related_entity_type`
- `related_entity_id`
- `due_at`
- `status`
- `sensitivity`
- `overdue_at`
- `completed_at`

#### Note

- `id`
- `body`
- `note_type`
- `sensitivity`
- `source_type`
- `source_confidence`
- `shareability`
- `related_entity_type`
- `related_entity_id`
- `created_by`

Supported note types:

- `private_csm_debrief`
- `internal_only`
- `shareable_summary`
- `external_facing_follow_up`
- `sensitive_boundary`
- `legal_compliance_sensitive`

#### PitchAsset / ApprovedMessagingAsset

- `id`
- `title`
- `asset_type`
- `audience`
- `content`
- `product_id`
- `source_confidence`
- `approval_status`
- `approved_by`
- `last_updated_at`

#### OffLimitsRule / BoundaryRule

- `id`
- `scope_type`
- `scope_id`
- `rule_type`
- `description`
- `set_by`
- `reason`
- `effective_from`
- `expires_at`
- `review_at`
- `severity`
- `allowed_alternative`
- `status`

#### PermissionState

Permission should be modeled as a controlled enum plus history:

- `research_only`
- `csm_context_needed`
- `csm_approved_for_discussion`
- `csm_approved_for_intro`
- `peo_engaged`
- `peo_client_engaged`
- `direct_contact_allowed`
- `direct_contact_not_allowed`
- `hold_sensitive`
- `off_limits`
- `ownership_unclear_requires_verification`

#### SignalEvent

- `id`
- `category`
- `related_entity_type`
- `related_entity_id`
- `input_snapshot`
- `trigger`
- `created_at`

#### HMLClassification

- `id`
- `category`
- `related_entity_type`
- `related_entity_id`
- `classification`
- `confidence`
- `explanation`
- `contributing_signals`
- `recommended_next_action`
- `rule_version`
- `source_record_ids`
- `created_at`

#### InternalUnknown

- `id`
- `question`
- `category`
- `current_best_answer`
- `source_needed`
- `confidence`
- `risk_level`
- `owner`
- `next_verification_step`
- `due_at`
- `status`
- `blocks_implementation`
- `related_entity_type`
- `related_entity_id`

#### DecisionLog

- `id`
- `decision`
- `grounding`
- `owner`
- `validation_plan`
- `unknowns`
- `affected_domains`
- `approval_status`
- `approved_by`
- `approved_at`

## UX / App Structure

Hard UX rule: no scaffold, meta, or implementation-status UI on product screens.

The app can expose source, confidence, permission, risk, HML priority, relationship motion, unknowns, and sync health when those are operator-actionable. It must not expose developer concerns such as code gate, cloud database, owner writes, server actions, Prisma, local storage, build phase, or MVP slice as user-facing interface. Access screens should stay task-only: product identity, credential field, submit action, and actionable error text.

### Dashboard

Purpose: daily operating cockpit.

Key components:

- Do Now / Do Today / Watch digest.
- HML signal feed.
- Overdue follow-up promises.
- High caution relationships.
- Recent daily serve outcomes.
- Internal unknowns blocking motion.

Main actions:

- Open next safest action.
- Mark follow-up complete.
- Create daily serve.
- Review new HML classification.
- Add internal unknown.

Boundary logic surfaced:

- Permission state and relationship owner appear beside every recommended action.

### CSM Partner Rooms

Purpose: relationship context and trust-surface management.

Key components:

- CSM profile and assigned PEOs.
- Relationship heat.
- Protectiveness level.
- Dos/donts.
- Preferred intro/follow-up motion.
- Private debrief notes.
- Daily serve history.
- Open promises.

Main actions:

- Add relationship note.
- Record do/dont.
- Create daily serve.
- Log private debrief.
- Update permission or boundary rule.

Empty state:

- Guided first-call setup with safe questions and fields for cadence, boundaries, and preferred serve type.

### PEO Network

Purpose: map CSM-owned PEO relationships and PEO client opportunities.

Key components:

- PEO list with readiness, protectiveness, permission state, owner, and next action.
- PEO detail page with research, client base notes, opportunities, boundary rules, and HML classifications.
- Optional PEO client records.

Main actions:

- Add PEO.
- Link CSM owner.
- Add client/use-case signal.
- Record permission state.
- Create opportunity.

### Opportunity Room

Purpose: manage active or potential PrismHR Global motion.

Key components:

- Source path.
- Related CSM, PEO, and PEO client.
- Product interest.
- Discovery notes.
- Follow-up promises.
- Permission status.
- Momentum and risk HML.

Main actions:

- Add discovery note.
- Create follow-up.
- Generate meeting prep.
- Record private CSM debrief.
- Update stage.

### External Channels

Purpose: track non-CSM lead-feeder sources without creating channel conflict.

Key components:

- Channel records.
- Source quality.
- Audience fit.
- Conflict risk.
- Referrals/events/opportunities.
- Next action.

Boundary logic surfaced:

- External channel motion must still check for CSM ownership, direct-contact rules, and PrismHR/Vensure ambiguity.
- The app should not automate outreach. It may track manual outreach readiness, permission, and next safest action.

### Chicagoland Prospecting / Territory Workspace

Purpose: prospect, research, and prioritize potential Chicagoland clients that may fit PrismHR Global's global payroll, EOR, contractor management, or cross-border recruiting value proposition.

Key components:

- Target account list.
- Prospect research notes.
- Fit score dimensions.
- Product relevance by EOR, Contractor Management, and Contractor Management+.
- Boundary risk.
- Channel path.
- Source confidence.
- Recommended next action.

Rule:

- Chicago can raise account priority. It cannot override permission.
- Prospecting should create a safe next action, not automated outreach.

### Discovery Frameworks

Purpose: reusable sales/discovery playbooks.

Key components:

- Product-specific frameworks.
- Buyer/use-case variations.
- Risk flags.
- Red flags.
- Demo focus.
- Follow-up templates.

### Daily Serve

Purpose: track useful material sent to CSMs and measure whether it improved motion.

Key components:

- Create serve.
- Serve categories.
- Outcome capture.
- Relationship heat impact.
- Reuse/forward/reply tracking.

### Pitch Library / Persistent Pitch Column

Purpose: keep current approved messaging close to every workflow.

Key components:

- CSM-safe pitch.
- PEO-client pitch.
- Product-specific talk tracks.
- Objection responses.
- Source/confidence status.
- Last updated.

### HML Signal Feed

Purpose: app-wide explainable signal layer.

Key components:

- Chronological signal events.
- Category filters.
- HML classification.
- Explanation.
- Contributing signals.
- Recommended next action.
- Confidence.

### Rules / Off-Limits

Purpose: first-class boundary management.

Key components:

- Off-limits rules.
- Boundary rules.
- Expiration/review dates.
- Allowed alternative.
- Override log.

### Internal Unknowns

Purpose: make ambiguity visible and manageable.

Key components:

- Unknown registry.
- Risk level.
- Blocking/non-blocking status.
- Owner and due date.
- Source needed.
- Decision made.

## Workflow Design

### New CSM Relationship Setup

1. Create CSM Partner record.
2. Add known assigned PEOs.
3. Capture cadence, protectiveness, dos/donts, preferred intro/follow-up motion.
4. Add private debrief preference and note sensitivity defaults.
5. Create initial HML relationship heat classification.
6. Create first safe next action, usually a small context or usefulness ask.

### New PEO Mapping

1. Create PEO record.
2. Link CSM owner or mark ownership unclear.
3. Add public research and source confidence.
4. Capture visible global-workforce fit signals.
5. Set permission state.
6. Add known off-limits or boundary rules.
7. Generate PEO readiness and caution HML classifications.

### CSM-Sourced Lead Flow

1. CSM surfaces interest or possible fit.
2. Create opportunity linked to CSM, PEO, and optional PEO client.
3. Confirm permission state and intro path.
4. Prepare discovery framework and pitch assets.
5. Hold meeting.
6. Send private CSM debrief before external follow-up unless delegated.
7. Create follow-up promises.
8. Update HML momentum, readiness, and risk.

### External-Channel Lead Flow

1. Add external channel and source type.
2. Record audience fit and potential use cases.
3. Check conflict risk against known CSM/PEO ownership.
4. If ownership unclear, create internal unknown or boundary risk.
5. Create opportunity only after permission path is safe.

### Daily Serve Workflow

1. Identify CSM, PEO, or account context.
2. Choose serve category.
3. Draft short useful content.
4. Mark sent/not sent.
5. Record whether used, forwarded, replied to, or converted into next step.
6. Feed outcome into relationship heat and opportunity momentum.

### Discovery Prep Workflow

1. Select product/use case.
2. Load discovery framework.
3. Pull relevant PEO/client context, pitch assets, country notes, and boundary rules.
4. Confirm what not to say.
5. Create meeting prep note.

### Meeting Follow-Up Workflow

1. Log meeting outcome.
2. Create private CSM debrief.
3. Confirm if direct follow-up is allowed.
4. Create shareable summary or external-facing follow-up.
5. Create follow-up promises.
6. Update opportunity momentum and risk.

### Territory Prioritization Workflow

1. Add Chicago territory account.
2. Score visible international activity, contractor intensity, hiring velocity, compliance complexity, channel accessibility, and boundary risk.
3. Assign source confidence.
4. Create next safest action.
5. If CSM/PEO ownership is unclear, create internal unknown before outreach.

### Off-Limits Rule Capture Workflow

1. Capture who/what/when/why.
2. Set scope and severity.
3. Record who set the rule and source confidence.
4. Define allowed alternative.
5. Set review date.
6. Trigger boundary/off-limits HML classification.

### Internal Unknown Verification Workflow

1. Create unknown.
2. Categorize risk.
3. Decide whether it blocks implementation or only blocks a workflow.
4. Assign owner and source needed.
5. Resolve as canon, hypothesis, deferred, or no longer relevant.
6. Update related records.

### HML Signal Generation Workflow

1. Domain event changes app data.
2. Rules engine gathers relevant canonical app-db inputs.
3. Rules evaluate category.
4. Engine emits classification, explanation, confidence, and next action.
5. Signal appears in feed and on related record.

### Private CSM Debrief Workflow

1. Create note with `private_csm_debrief` type.
2. Link to meeting/opportunity/PEO.
3. Mark sensitivity and shareability.
4. Create shareable summary separately if needed.
5. Do not expose externally.

## HML Signal Engine

### Engine Principles

- V1 is rules-based and explainable.
- Canonical v1 inputs live in the app database.
- Classifications are `High`, `Medium`, or `Low`.
- Confidence is also `High`, `Medium`, or `Low`.
- Every output includes explanation, contributing signals, related records, and recommended next action.
- HML classifications should be recalculated on relevant record changes and visible in an audit trail.

### Category Rules

| Category | Inputs | High | Medium | Low | Next action |
| --- | --- | --- | --- | --- | --- |
| CSM relationship heat | response recency, clarity of boundaries, willingness to prep, daily serve reuse, approved next step | Fast response, clear boundaries, active fit area, evidence of trust | Cordial but not activated, some context but no motion | Stale, unclear, protective without operating ground | High: propose specific co-sell move. Medium: send daily serve. Low: research and ask only for context. |
| PEO readiness | public fit, CSM sentiment, use-case strength, urgency, meeting acceptance | Clear global-workforce fit plus receptive CSM and concrete reason now | Fit exists but timing or permission is vague | No visible need, poor timing, or no safe path | High: prep specific use case. Medium: gather context. Low: monitor/research. |
| PEO protectiveness / caution | stay-in-thread requests, off-limits flags, deflected access, messaging corrections | Owner asks to stay in every thread or flags sensitivity | Some caution or limited permission | No caution flags and permission path is clear | High: switch to enablement/documentation. |
| Opportunity momentum | meeting status, next-step clarity, problem severity, follow-up age, stakeholder engagement | Meeting booked or active sequence with concrete pain and due next step | Interest without commitment | Vague curiosity or stale follow-up | High: complete next action today. Medium: clarify next step. Low: re-qualify or park. |
| External channel quality | recurrence, audience fit, reciprocity, referral specificity, conversion | Specific urgent cases or repeat qualified referrals | Events/activity with weak conversion | Broad surface area and no qualified follow-up | High: invest. Medium: nurture/test. Low: monitor. |
| Chicago territory potential | international activity, contractor intensity, hiring velocity, compliance complexity, channel accessibility, boundary risk | Strong fit with low/moderate boundary risk | Some fit or weak trigger | Local-only or no staffing complexity | High: identify safe channel path. |
| Follow-up urgency | due date, overdue count, meeting recency, unanswered question, waiting party | Overdue or someone is waiting | Due within seven days | No near-term promise | High: do now. |
| Boundary / off-limits risk | off-limits flags, sensitivity, direct-contact state, approval status | Off-limits or sensitive action without approval | Partial approval or unclear ownership | No boundary issue known | High: block or require approval. |
| Product/use-case frequency | repeated use-case tags, product interest, country/worker pattern | Repeated pattern across CSMs/PEOs/opportunities | Isolated but plausible pattern | No pattern yet | High: create/revise pitch asset or discovery framework. |
| Country/regulatory complexity | countries, worker type, contractor classification risk, payroll/termination complexity | Multi-country or high-risk worker classification | One meaningful complexity area | Simple/local or unclear | High: prep country note and flag assumptions. |
| Internal ambiguity risk | internal unknown count, blocking status, confidence | Blocking unknown affects permission, data, canon, schema, pricing, or external messaging | Important unknown affects later phase | Non-blocking curiosity | High: resolve before irreversible implementation or action. |

### Caution Criteria

Any category can produce a caution overlay when:

- permission is unclear
- CSM protectiveness is high
- an off-limits rule applies
- source confidence is low
- note sensitivity is high
- the recommended action would bypass a relationship owner

### Explanation Examples

- `High because the CSM approved an intro, reused the daily serve, and named a specific client use case.`
- `Medium because the PEO has visible international fit, but no meeting or CSM-approved next step exists yet.`
- `High caution because the CSM asked to stay in every thread and the account has an active off-limits rule.`
- `Low because there is no visible global hiring need and ownership is unclear.`

## Technical Architecture

### Recommended Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Postgres
- Prisma for schema/migrations and type-safe data access
- Supabase Auth or a simple auth abstraction prepared for Supabase Auth
- Vercel deployment

Rationale: this stack is pragmatic for a fast internal app, gives strong type safety, supports future multi-user governance, and keeps the rules engine and data model portable.

### Frontend Structure

- `src/app/` for routes and page shells.
- `src/components/` for reusable UI.
- `src/features/` grouped by domain: `csm`, `peo`, `opportunities`, `daily-serves`, `hml`, `permissions`, `unknowns`, `pitch`.
- `src/lib/` for shared utilities, auth, database, HML rules, permission checks, and note sensitivity helpers.

### Backend/API Structure

- Server actions or route handlers for CRUD operations.
- Central permission and sensitivity checks in `src/lib/permissions`.
- HML recalculation service in `src/lib/hml`.
- Decision and audit helpers in `src/lib/governance`.

### Database Approach

- Postgres schema managed by Prisma.
- Use enums for permission states, note sensitivity, source confidence, canon status, and HML classification.
- Preserve history for permission changes, off-limits rules, HML classifications, and decisions.

### Auth / Permissions Approach

- V1 can be single-user, but schema should include users and roles.
- Future roles: owner, CSM, product, legal, engineering, viewer.
- Default to least visibility for sensitive notes.

### Note Sensitivity Approach

- Note type and sensitivity are required.
- Private CSM debrief notes are internal and not shareable externally.
- Future access should require role-based access, reason-for-access, audit trail, viewer identity, timestamp, and export restrictions.

### File / Deck Intake

- V1: manual paste into structured deck note records.
- V1.5: file attachment metadata and storage.
- Later: parsing, summarization, and searchable references.

### Integration Posture

- The app must not integrate with or touch internal company systems.
- Direct outreach automation is not applicable to this app.
- Future integrations must use external connections only.
- V1 should be designed to work without any production integration.
- Any future external connection must be approved through a Decision Log before implementation.

### HML Signal Engine

- Rules defined in `config/hml-rules.yaml`.
- Engine reads app-db inputs.
- Engine emits `SignalEvent` and `HMLClassification`.
- AI may later summarize engine output, but cannot alter classification, confidence, or rules.

### Deployment

- Local development first.
- Vercel for frontend/server runtime.
- Supabase for managed Postgres and future auth.
- Environment variables stored outside repo.

## Build Plan

### Phase 0: Project Setup

Tasks:

- Initialize Next.js app with TypeScript.
- Add Tailwind and shadcn/ui.
- Add linting/formatting.
- Add Prisma and database config skeleton.
- Create folder structure.
- Add environment variable examples.

Acceptance:

- App runs locally.
- TypeScript checks.
- Basic empty shell renders.

### Phase 1: Schema And Database

Tasks:

- Implement Prisma schema for core objects.
- Add enums for permission, sensitivity, source confidence, canon status, HML classification.
- Add migration.
- Add seed data with placeholders clearly marked.

Acceptance:

- Database initializes locally.
- Seed creates one Antaeus user and sample placeholder records.
- No sensitive real data required.

### Phase 2: Core CRUD Rooms

Tasks:

- Build CRUD for CSM Partner Rooms, PEO records, Chicagoland Territory Accounts, Opportunities, Notes, and Follow-Up Promises.
- Surface permission state and sensitivity on every relevant form.

Acceptance:

- User can create a CSM, link a PEO, add a Chicagoland prospect, add a note, create a follow-up promise, and see the relevant next action on the dashboard.

### Phase 3: Permission, Off-Limits, And Follow-Up Safety

Tasks:

- Add off-limits/boundary rule forms.
- Add permission-state gates and warning/approval/block states.
- Add overdue promise logic.

Acceptance:

- Unsafe direct-contact recommendations are blocked or approval-gated depending on severity.
- Off-limits rule appears on related records.

### Phase 4: HML Signal Engine And Dashboard Digest

Tasks:

- Implement deterministic rules engine.
- Load starter YAML rules.
- Generate HML classifications and signal feed.
- Build Do Now / Do Today / Watch dashboard.

Acceptance:

- At least five HML categories produce explainable output from app data.

### Phase 5: Discovery Frameworks And Pitch Column

Tasks:

- Build discovery framework library.
- Build persistent pitch column.
- Add approved messaging assets.

Acceptance:

- Opportunity page can show product-specific framework and CSM-safe pitch copy.

### Phase 6: Daily Serve System

Tasks:

- Create daily serve workflow.
- Track outcomes.
- Feed outcomes into relationship heat and opportunity momentum.

Acceptance:

- A daily serve can be created, sent, outcome-tagged, and reflected in HML.

### Phase 7: Internal Unknowns Tracker

Tasks:

- Build unknown registry.
- Link unknowns to records.
- Track blocking/non-blocking status and resolution.

Acceptance:

- Blocking unknowns appear on dashboard and related pages.

### Phase 8: Polish, Testing, Deployment

Tasks:

- Add focused tests for HML rules and permission gates.
- Add accessibility and responsive layout pass.
- Deploy to Vercel with Supabase.

Acceptance:

- Core loop works end to end in deployed environment.

## Implementation Blockers Versus Tracked Unknowns

### Blocks Implementation Before Phase 0

- None. Phase 0 scaffolding can begin now.

### Blocks Phase 1 Schema If Not Modeled Conservatively

- Note visibility and future user roles. Decision: does not block if v1 defaults to single-user, conservative note sensitivity, and future-ready roles.
- Persistence layer. Decision: use Supabase Postgres with Prisma; does not block.

### Blocks Real Production Data Or External Sharing

- Final data retention and visibility rules.
- Whether sensitive PEO client names can be stored.
- Future Product/Legal/CSM reviewer access to private CSM debriefs.

### Blocks Specific Product Features, Not Core MVP

- Pricing authority blocks pricing/discount workflows only.
- Contractor Management+ packaging blocks final talk tracks and qualification criteria only.
- PrismHR Global versus Vensure Global boundaries block external messaging and record-of-truth claims only.
- Direct-contact policy blocks direct outreach recommendations only. Direct outreach automation is not applicable to this app.
- External channel approval rules block external-channel outreach recommendations only. The app should not automate outreach.
- Internal company-system integrations are out of scope. Future integrations must use external connections only.

### Track As Hypotheses / Internal Unknowns

- Exact PrismHR/Vensure boundary.
- Contractor Management+ definition.
- CSM-specific norms.
- Final HML thresholds and weights.
- Chicago target-account list.
- Daily serve cadence preferences.
- Which external channels are approved for direct motion.
- Exact future roles and reviewer model.

## Clarifying Questions That Still Matter

These do not block Phase 0 or conservative Phase 1 implementation.

1. What note types, if any, should be forbidden from storage even for the solo-user version?
2. Should PEO client records allow real names in v1, or should the initial model support anonymized/client-code records by default?
3. Which product definitions for EOR, Contractor Management, and Contractor Management+ can be treated as internally approved for pitch assets?
4. Are there any known PEOs, clients, industries, or channels that should be seeded as off-limits from day one?
5. Does the first deployed version need authentication, or is local-only sufficient until the data model is validated?
6. Should daily serve cadence default to daily per user, per active CSM, or manually scheduled only?
7. Which field should be the primary source of truth for a next action: opportunity, follow-up promise, or HML recommendation?
8. Should the first HML implementation recalculate synchronously on save, or through a simple background/job abstraction?
9. Is Chicago Global Chamber confirmed as an external channel source, or should it remain a hypothesis?
10. What is the minimum acceptable demo loop for the first build review?

## Recommended Product Names

1. Global Motion Command
2. Partner Motion HQ
3. PrismHR Global Ops Center
4. Channel Command Desk
5. Trust Path Console
6. Signal Command Center
7. Global Partner Desk
8. Relationship Control Room
9. Partner Signal Console
10. Field Motion Center

## Approval Record

- Decision: Approve master MVP plan and authorize implementation to begin.
- Grounding: Canon plus approved owner answers.
- Owner: Antaeus.
- Approved by: Antaeus.
- Approved at: 2026-06-16.
- Scope: Phase 0 through Phase 8 as defined here, with conservative handling of internal unknowns.
- Constraints: no CI blocking yet; no direct-contact automation; no internal company-system integrations; external connections only for future integrations; no pricing/legal workflow; no AI-owned HML classification.

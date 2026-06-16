# hml-signal-architect — SKILL

Purpose
-------
Provide a principled, explainable, rules-based architecture and guidance for producing High/Medium/Low (H/M/L) interpreted signals across the PrismHR Global Command Center. This skill documents how to design, review, and publish HML classifications so they are auditable, actionable, and safe to extend with AI summarization later.

Scope
-----
- Workspace-scoped: intended for use by product, engineering, CSMs, and reviewers in this repository.
- Applies to feature proposals, data models, UI screens, automation flows, and reporting that surface interpreted signals.

Current governance
------------------
- Current Product Owner / Canon Owner: Antaeus.
- Current mode: solo-owner now, multi-role governance later.
- Antaeus owns canonical HML thresholds until explicitly reassigned.
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.

When to invoke
--------------
- During design reviews, PR reviews, and architecture docs when a signal or indicator is proposed.
- When building or changing rules that assign High/Medium/Low to any of the listed categories.

Core principle
--------------
- HML is an interpreted, explainable signal — not a proxy for raw activity counts. No black-box scoring. For v1 use explicitly documented rules; design so AI summarization can be layered on top, but never replace the core explainable model.

Required structure for every HML classification
--------------------------------------------
Every HML output MUST include the following fields in the metadata produced and in any PR/Decision Log:

- Inputs: list of input signals and their source. For v1, canonical inputs should come from the app database, not external APIs or sentiment models.
- Rule or scoring logic: explicit, human-readable rules or weight table used to compute classification.
- Classification: `High`, `Medium`, or `Low`.
- Plain-English explanation: a short sentence describing why the classification was chosen.
- Recommended next action: what to do now (owner + timeframe where applicable).
- Confidence level: `High`/`Medium`/`Low` based on data completeness and rule determinism.
- Optional internal numeric scores may exist later, but user-facing confidence should remain `High`/`Medium`/`Low` to avoid fake precision.

HML entry template (example)
-----------------------------
Use this minimal schema in `Decision Log` entries and automation outputs:

```yaml
category: CSM relationship heat
inputs:
  - name: unresolved_escalations
    value: 2
    source: app-db
  - name: usage_change_30d
    value: -27
    source: app-db
rules_applied:
  - "if unresolved_escalations > 0 => High"
  - "else if usage_change_30d <= -20 and response_rate_14d < 30 => High"
raw_score: 3
classification: High
explanation: "Two signals indicate risk: 2 unresolved escalations and a 27% usage drop."
recommended_action: "CSM outreach within 24h; open escalation channel; assign owner: @csm-team."
confidence: Medium
rule_version: v1.0
```

Design and architecture
-----------------------
- Rules store: keep rules in a repository file (example: `config/hml-rules.yaml`) with explicit thresholds, boolean rules, and human-readable descriptions.
- Deterministic rules engine: a small, explainable engine (language-agnostic) that loads `hml-rules.yaml`, reads signal inputs, evaluates rules in order, and emits the HML entry schema plus a trace of rules applied.
- Traceable output: the engine must include a `rules_applied` list and input snapshots for auditing and tests.
- Versioning: tag rules with `rule_version` and record the rule file commit hash in output for reproducibility.
- AI summarizer (optional layer): an additive component that reads the engine output and produces a natural-language summary or suggested framing. The summarizer MAY NOT alter classification, rules, or confidence — only produce a human-friendly narrative.
- Storage & audit: persist engine outputs to `hml_runs/<timestamp>-<entity>.json` for traceability and retrospective review.

Decision tags and PR usage
-------------------------
- Tag pattern: `[HML:<category>:<H|M|L>]` (e.g., `[HML:CSM-Heat:H]`).
- PR Decision Log: include an `HML` section using the template above for every PR touching signals, UI, or automation that surfaces HML values.

Categories to classify (v1)
---------------------------
The system should support rules and templates for all these categories. For each, start with rules-based v1 logic and explicit inputs.

Structurally required v1 categories:

- CSM relationship heat
- PEO readiness
- PEO protectiveness / caution
- Opportunity momentum
- Follow-up urgency
- Boundary / off-limits risk
- Internal ambiguity risk

Additional useful categories:

- External channel quality
- Chicago territory account potential
- Product / use-case frequency
- Country / regulatory complexity

Representative rules (v1, explicit and explainable)
-----------------------------------------------
Below are compact, deterministic examples. These are templates. The Product Owner / Canon Owner owns thresholds and must adapt inputs to real app data.

1) CSM relationship heat
- Inputs: `unresolved_escalations`, `usage_change_30d`, `response_rate_14d`, `sentiment_notes_30d`, `renewal_window_days`
- Rule (explicit):
  - If `unresolved_escalations > 0` => High
  - Else if (`usage_change_30d <= -20` AND `response_rate_14d < 30`) => High
  - Else if (two of {`usage_change_30d <= -10`, `response_rate_14d < 50`, `sentiment_notes_30d == negative`}) => Medium
  - Else => Low
- Explanation example: "High — 2 unresolved escalations and sharp usage drop indicate relationship at-risk."
- Recommended action: "CSM contact within 24h; open escalation; prepare mitigation plan."
- Confidence: `High` if all inputs present, `Medium` if sentiment or response data missing.

2) PEO readiness
- Inputs: `contract_signed`, `onboarding_progress_pct`, `payroll_feeds_validated`, `test_payroll_ok`
- Rule:
  - If `contract_signed == true` AND `onboarding_progress_pct >= 90` AND `payroll_feeds_validated == true` AND `test_payroll_ok == true` => High
  - Else if `contract_signed == true` AND `onboarding_progress_pct >= 50` => Medium
  - Else => Low
- Recommended action: High => proceed to scheduled go-live; Medium => finish onboarding checklist; Low => block go-live and assign owner.

3) Follow-up urgency
- Inputs: `open_actions_overdue_count`, `next_meeting_days`, `sla_breached`
- Rule:
  - If `sla_breached == true` OR `open_actions_overdue_count >= 1` => High
  - Else if `next_meeting_days <= 7` => Medium
  - Else => Low

4) Boundary / off-limits risk
- Inputs: `request_access_to_sensitive_data`, `policy_flag_offlimits`, `legal_approval_present`
- Rule:
  - If `policy_flag_offlimits == true` OR (`request_access_to_sensitive_data == true` AND `legal_approval_present == false`) => High
  - Else if partial approvals present => Medium
  - Else => Low

5) Internal ambiguity risk
- Inputs: `internal_unknown_count`, `ambig_tags_present`
- Rule:
  - If `internal_unknown_count > 0 OR ambig_tags_present == true` => High
  - Else => Low
- Action: create issues for each unknown, assign owner, and block final decisions until validated or explicitly accepted as `Hypothesis` with a validation plan.

No black-box scoring requirement
--------------------------------
- Avoid opaque ML scores in the HML decision path. If ML models are used for signal extraction (e.g., sentiment), expose the model outputs and thresholds used, and treat the ML output as an input signal to the rules engine rather than an end result.

Operational rules and CI
------------------------
- Advisory checks: automation should warn in PRs when HML sections are missing or incomplete.
- Enforcement: do not fail CI yet. Future CI gates may apply to HML rules files, scoring configuration, migration files, schema definitions, permission-state logic, and off-limits logic once implementation begins.
- Tests: include deterministic unit tests for rules with example input snapshots and expected H/M/L outputs.

Storage, auditing, and change management
--------------------------------------
- Store rule definitions under `config/hml-rules.yaml`.
- Persist HML runs with rule version and input snapshot under `hml_runs/` for audits.
- When rules change, bump `rule_version` and add migration notes in `docs/HML_CHANGELOG.md`.

Examples & sample prompts
-------------------------
- "Run `hml-signal-architect` on account 123: output HML entries for CSM heat and follow-up urgency with trace."
- "Show derivation: why is `CSM relationship heat` High for Account X? Include inputs, rules applied, and recommended action."

Resolved clarifying answers
---------------------------
- No HML categories require CI enforcement yet. All categories are advisory/design-enforced at the reasoning layer for now.
- Structurally required v1 categories are CSM relationship heat, PEO readiness, PEO protectiveness/caution, opportunity momentum, follow-up urgency, boundary/off-limits risk, and internal ambiguity risk.
- Canonical thresholds are owned by the Product Owner / Canon Owner: Antaeus.
- Use `High` / `Medium` / `Low` as the primary user-facing confidence scale. Avoid fake precision. Optional 0-100 scores may exist internally later, but should not lead the product.
- Chicago is a priority territory override for territory-account potential, external-channel value, local ecosystem relevance, Chicago-based company prioritization, and Chicago Global Chamber or adjacent source scoring.
- Chicago cannot override relationship permission, off-limits risk, direct-contact permission, PEO protectiveness, CSM relationship heat, or internal ambiguity risk.
- For v1, canonical inputs live in the app database. External APIs, AI sentiment, scraped data, enrichment, email metadata, CRM sync, Slack messages, and calendar data are non-canonical unless promoted later by the Product Owner / Canon Owner.

Related customizations to add next
---------------------------------
- `config/hml-rules.yaml` starter file with canonical rule examples.
- `DECISION_TEMPLATE.md` and PR template additions to include HML blocks.
- A small deterministic rules engine reference (Python/Node) and unit test harness.

Contact
-------
This skill documents HML design and operational rules for the PrismHR Global Command Center. To change policy, edit this file and open an issue describing the requested rule change and owner.

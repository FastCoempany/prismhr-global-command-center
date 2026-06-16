# no-crm-soup — SKILL

Purpose
-------
`no-crm-soup` encodes a strict evaluation posture for the PrismHR Global Command Center: reject generic CRM thinking and insist every proposed feature, screen, schema, or workflow improves judgment, trust, readiness, or safe action. This skill helps teams evaluate proposals, surface boundaries, and avoid features that produce vanity metrics or activity noise.

Scope
-----
- Workspace-scoped: intended for use by contributors and reviewers in this repository.
- Applied to product features, UX screens, data models, automation flows, and reporting.

Current governance
------------------
- Current Product Owner / Canon Owner: Antaeus.
- Current mode: solo-owner now, multi-role governance later.
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.
- The app should treat the CSM as the relationship owner unless clearly proven otherwise.

When to invoke
--------------
- On any proposed feature, screen, schema, workflow, or dashboard that touches relationships, permissions, or operational readiness.
- During PR reviews, design reviews, and pre-release checklists.

Core priorities (must be preserved)
---------------------------------
- Borrowed trust — surface the source and scope of trust being relied on.
- Relationship ownership — who owns the relationship and its lifecycle.
- Permission states — explicit read/write/notify permissions and escalation rules.
- Off-limits rules — hard boundaries that must not be crossed without approval.
- CSM protectiveness — protect Customer Success Manager workflows and handoffs.
- PEO readiness — ensure PEO/service-provider readiness where applicable.
- Intro paths — careful, permissioned introductions between parties.
- Daily serves — what the user should receive daily to stay operationally ready.
- Follow-up promises — commitments the system makes and how they are tracked.
- HML signal interpretation — how high/medium/low signals are derived and acted on.
- Internal ambiguity tracking — record and surface unresolved internal facts.

Anti-patterns to reject
-----------------------
- Optimizing for activity volume (counts of touches, notes, or tasks) instead of judgment quality.
- Vanity dashboards that surface metrics without clear operational meaning.
- Forecast theater — dashboards that imply predictive certainty without basis.

Feature acceptance checklist
---------------------------
For every proposed feature, require documented answers to these questions. If the feature cannot answer at least one clearly, it must be rejected or redesigned.

1. What matters now?
2. Why does it matter?
3. What changed?
4. What is heating up?
5. What is going cold?
6. What requires caution?
7. What boundary could be violated?
8. What should I do next?

If a feature merely stores information without improving judgment, trust, readiness, caution, or next action, require explicit justification and a timeline for converting storage into signal.

Decision tags and metadata
--------------------------
- Use short tags in PRs and docs: `[No-CRM]`, `[Trust:<source>]`, `[Owner:@team]`, `[Perm:read|write|notify]`, `[OffLimits]`, `[HML:<rule>]`, `[Ambiguity]`.
- Include a `Decision Log` block in PR descriptions with: decision summary, tag(s), evidence or source, unanswered internal facts, validation plan, and owner.

How to use in PRs and docs
--------------------------
- Add a `Decision Log` section to any PR touching relationships, permissions, or readiness. The section must answer the checklist questions and include tags and owners.
- Example `Decision Log`:

- Decision: Add “Daily Serve” digest to CSM dashboard.
- Tags: [No-CRM] [Trust:system] [Owner:@csm-team] [Perm:notify]
- What matters now: reduce missed follow-ups for pilot clients.
- Why it matters: missed follow-ups caused escalation in 3 pilots.
- What changed: new integration with calendar feeds.
- Heating up / cooling down: heating — increased missed follow-ups this week.
- Boundary risk: exposing private notes in digest (Off-limits).
- Next action: limit note visibility, add opt-out toggle, validate with Product Owner / Canon Owner (owner: Antaeus) before implementation depends on it.

Quality criteria / completion checks
----------------------------------
- Checklist answers present and specific (not generic language).
- Owner assigned for validation steps and ambiguity resolution.
- Any `[Ambiguity]` entries linked to an issue in the tracker.
- Features that surface HML signals include a clear derivation and action mapping.

HML signal guidance
-------------------
- Define H/M/L with explicit rules and data sources.
- Attach an action map: for High → immediate action/owner; Medium → monitor; Low → archival or periodic review.
- Avoid deriving HML solely from activity volume — prefer engagement quality, explicit signals from users, and corroborating signals.

Internal ambiguity tracking
--------------------------
- Any internal unknowns must be tagged `[Ambiguity]` and referenced to a short issue containing: question, proposed validation step, owner, and deadline.
- Design features so these internal facts can be updated (config, flags, metadata-driven rules) without code rewrites.

Implementation notes for agents and automation
-------------------------------------------
- Advisory checks: automation should surface missing checklist answers and tags in PRs as warnings.
- Enforcement: do not fail CI yet. Future CI gates may be added once the app exists and key protected objects have stable metadata requirements.
- UI: feature review panels should show `Decision Log`, `HML derivation`, `Ambiguity` links, and `Owner` prominently.

Examples & sample prompts
-------------------------
- "Run `no-crm-soup` check on this PR: list missing checklist answers, tag ambiguities, and propose next actions."
- "Evaluate this screen for CRM-soup: does it improve judgment or only activity volume? Explain why."

Resolved clarifying answers
---------------------------
- The check is advisory only in Git for now. It is a required design review posture, not an automated CI gate.
- Antaeus owns how the app models relationship ownership, but the app should assume the CSM owns relationship context, intro timing, account nuance, and permission boundaries until clarified otherwise.
- If relationship ownership is disputed, mark it `Ownership unclear / requires verification`, do not assume direct contact is allowed, escalate into `Internal Unknowns` or `Boundary Risk`, and recommend a clarification conversation.
- Acceptable HML signals include CSM responsiveness, CSM stated interest, CSM protectiveness, CSM-approved next step, PEO readiness, use-case fit, booked meetings, due/overdue follow-ups, daily serve reuse/forwarding/ignoring, off-limits flags, boundary ambiguity, direct-contact permission, product-fit tags, country/regulatory complexity, stakeholder engagement, account research quality, external-channel movement, client urgency, repeated use-case patterns, and internal unknowns blocking action.
- Disallowed or discouraged HML signals include raw activity volume without meaning, vanity task counts, arbitrary engagement scores without explanation, black-box sentiment, AI-generated certainty without source evidence, inferred relationship permission, assumed account access, immature revenue-forecast theater, and unexplained high-priority labels.
- Standard: HML must measure interpreted operating signal, not motion cosplay.

Related customizations to add next
---------------------------------
- `DECISION_TEMPLATE.md` for `docs/` to standardize Decision Log entries.
- PR template updates to include the `Decision Log` block and tags.
- Optional CI job that verifies Decision Log completeness for protected files.

Contact
-------
This skill enforces the PrismHR Global Command Center posture to avoid CRM-soup. To change the rules, update this file and open an issue describing the requested change and owner.

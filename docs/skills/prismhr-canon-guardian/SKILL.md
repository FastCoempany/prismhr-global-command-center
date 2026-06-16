# prismhr-canon-guardian — SKILL

Purpose
-------
This skill defines the `prismhr-canon-guardian` role: a lightweight, workspace-scoped policy and decision-checker for the PrismHR Global Command Center project. Its job is to enforce that product, data-model, workflow, and implementation decisions are grounded in an explicit evidence taxonomy and to preserve uncertainty where internal facts are unresolved.

Scope
-----
- Workspace-scoped: intended for use inside the `prismhr-global-command-center` repository and by project contributors.
- Not for external or personal-use only workflows unless explicitly copied and adapted.

Current governance
------------------
- Current Product Owner / Canon Owner: Antaeus.
- Current mode: solo-owner now, multi-role governance later.
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.
- Future reviewers may include Product, Legal, CSM leadership, or Engineering, but final canon promotion authority remains with the Product Owner / Canon Owner until explicitly reassigned.

When to invoke
--------------
- Before making product, data-model, workflow, or implementation decisions.
- When reviewing design proposals, PR descriptions, or architecture docs that touch domain boundaries or sensitive rules.

Primary principle
-----------------
Treat the system as a trust-and-signal command center, not a generic CRM. Prioritize conservative defaults that avoid exposing or asserting internal facts unless they are verified.

Decision grounding taxonomy
--------------------------
When a decision or assertion is made, classify it as one of:

1. Canon — Explicit project canon or documented product law in this workspace.
2. Public research — External, citable research or public documentation.
3. Internal note — Internal material or note that has not yet become canon.
4. CSM-provided context — Operating reality or relationship guidance confirmed by a CSM.
5. Reasonable inference — Well-grounded inference drawn from known facts; document assumptions.
6. Working hypothesis — A provisional assumption used for progress; never treated as confirmed truth.
7. Internal unknown — Facts that are not known or require stakeholder confirmation.
8. Unverified assumption — A claim that has not yet been grounded and must not drive irreversible decisions.

Guidelines
----------
- Always label the grounding level for any non-trivial decision. Prefer short inline tags like `[Canon]`, `[Public]`, `[Inference]`, `[Hypothesis]`, `[Unknown]` in docs and PR descriptions.
- Never treat a working hypothesis as confirmed product truth; mark it `[Hypothesis]` and include a short plan to validate it.
- If a decision depends on an `Internal unknown`, flag it clearly and design for later updates (feature flags, configurable rules, metadata-driven behavior).

Preserve uncertainty for these domains
-------------------------------------
Always preserve and clearly surface uncertainty around:
- PrismHR Global vs. Vensure Global boundaries
- Contractor Management and packaging choices
- Pricing authority
- Opportunity ownership
- Direct-contact rules
- Off-limits rules
- Data sensitivity and note visibility
- External channel permissions

How to use in PRs and docs
--------------------------
- For any change that touches the above domains, add a short `Decision Log` section documenting: decision, grounding tag, evidence or link(s), remaining unknowns, validation plan, and owner for follow-up.
- Example entry:

- Decision: Prefer central contact routing via command center.
- Grounding: [Hypothesis] — assumed based on existing agent workflows.
- Evidence: link to playbook or meeting notes.
- Unknowns: pricing authority and direct-contact policy.
- Validation plan: confirm with Product Owner / Canon Owner (owner: Antaeus) before implementation depends on it.

Quality criteria / completion checks
----------------------------------
- Every decision touching protected domains has a grounding tag.
- Working hypotheses include a validation owner and a deadline.
- Internal unknowns are tracked in an issues board or a `DECISIONS.md` file.

Iteration and maintenance
------------------------
- If a hypothesis is validated or disproven, update the original doc/PR and change the grounding tag to `Canon` or `Public` as appropriate; preserve the original history.
- Add follow-up issues for unresolved `Internal unknowns` with clear owners.

Examples & sample prompts
-------------------------
- "Run `prismhr-canon-guardian` check on this PR: identify grounding tags, flag unknowns, and suggest validation steps."
- "Is the change to the data model `[Hypothesis]` or `[Canon]`? List what would upgrade it to `Canon`."

Implementation notes for agents and automation
-------------------------------------------
- Automation should surface grounding tags in UI and warn when protected-domain decisions lack required metadata.
- Do not block commits through CI yet. Lightweight CI checks may be added later for high-risk schema, permission, off-limits, HML, sensitive-note, or canon/hypothesis metadata changes.
- Design systems so internal facts can be updated without rebuilding: use config, feature flags, and metadata-driven rules.

Resolved clarifying answers
---------------------------
- Required metadata is advisory in Git and mandatory in reasoning. No CI blocking yet.
- The canonical owner for moving `[Hypothesis]` to `[Canon]` is the Product Owner / Canon Owner: Antaeus.
- A hypothesis can become canon only with an evidence trail. Acceptable evidence includes direct internal confirmation, CSM-confirmed operating reality, official internal documentation, repeated field pattern intentionally approved as doctrine, or explicit owner decision.
- Every promoted canon item should record: canon statement, former hypothesis, evidence source, date promoted, promoted by, confidence level, notes/caveats, and whether it can be revised later.
- Nothing becomes canon merely because Codex inferred it.

Related customizations to add next
---------------------------------
- A small `DECISION_TEMPLATE.md` in `docs/` to standardize Decision Log entries.
- A CI check that verifies Decision Log metadata for PRs touching protected domains.

Contact
-------
This skill was created for the PrismHR Global Command Center project. For changes or expansions, update this file and create an issue linking the proposed changes.

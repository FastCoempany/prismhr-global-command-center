# relationship-motion-designer — SKILL

Purpose
-------
Enforce the relationship-owned channel motion when designing workflows, screens, copy, and data structures. This skill ensures the app treats the CSM as the canonical trust path owner and prevents UI or automation from bypassing that ownership without explicit permission.

Scope
-----
- Workspace-scoped: for use by product, design, engineering, and CSM reviewers working in the PrismHR Global Command Center repo.
- Applies to feature proposals, UX screens, data models, automation flows, onboarding/intros, and PRs that touch relationship behavior.

Current governance
------------------
- Current Product Owner / Canon Owner: Antaeus.
- Current mode: solo-owner now, multi-role governance later.
- Antaeus may approve bypass overrides, but the app must log them as deliberate exceptions.
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.

Core doctrine
------------
The CSM owns the trust path.

Assumptions the app should make by default
-----------------------------------------
- CSMs own relationship context.
- CSMs own account politics and intro timing.
- CSMs own permission boundaries.
- Every intro spends political capital.
- Every premature ask creates risk.
- Every sloppy follow-up creates cleanup debt.

What to enforce
---------------
When designing any workflow, screen, copy, or data structure that affects parties or channels, ensure each relevant entity records and surfaces these attributes:

- `relationship_owner` — user or team identity (CSM by default).
- `permission_state` — enum (e.g., `owner-only`, `owner-consent-required`, `open-with-constraints`, `off-limits`).
- `preferred_intro_motion` — short descriptor or policy reference.
- `preferred_followup_motion` — short descriptor or policy reference.
- `protectiveness_level` — enum (`low|medium|high`) describing sensitivity.
- `dos_and_donts` — structured guidance for actions that are safe / unsafe.
- `off_limits_rules` — explicit flags or references to policy items.
- `private_csm_debrief_notes` — private, CSM-visible notes (not surfaced externally).
- `next_safest_action` — suggested minimal-risk action (owner + timeframe).

Design rules
------------
- Check `permission_state` and `relationship_owner` before enabling actions that initiate contact, share sensitive data, or change relationship state.
- If an action would bypass the `relationship_owner` and `permission_state` is not `open-with-constraints`, mark the flow `Dangerous` and require an explicit override justification plus recorded owner sign-off.
- Show ownership and permission state prominently in the UI where actions are taken (top of screens, action modals, and confirmation flows).
- Default to the most conservative behavior (fail-safe): require owner consent for introductions and sensitive data access unless explicitly allowed.
- Use three severity levels for risky actions: `Warning`, `Approval required`, and `Blocked`.
- A bypass override must record approval, reason, relationship owner, affected account, risk level, expiration date if temporary, who was informed, and next safest action.

UI and data-model guidance
--------------------------
- Entity model examples (fields to include):
  - `relationship_owner_id`: string
  - `relationship_owner_type`: `user|team`
  - `permission_state`: `owner-only|owner-consent-required|open-with-constraints|off-limits`
  - `preferred_intro_motion`: free text or enumerated policy id
  - `preferred_followup_motion`: free text or enumerated policy id
  - `protectiveness_level`: `low|medium|high`
  - `dos_and_donts`: array of short rules
  - `off_limits_rules`: array of policy references or flags
  - `private_csm_debrief_notes`: private text blob with restricted visibility
  - `next_safest_action`: structured object {action, owner, timeframe}

- UX: when an action touches another party (PEO, client, external channel), present a compact decision card showing `relationship_owner`, `permission_state`, `protectiveness_level`, and `next_safest_action` before allowing the user to proceed.

PRs, Decision Logs and tags
---------------------------
- For PRs that touch relationship motion, include a `Decision Log` block answering: owner, permission_state, risk assessment, whether the flow can bypass owner, and validation plan.
- Use tags in PRs and docs like: `[RelOwner:@user]`, `[Perm:owner-consent-required]`, `[Protect:High]`, `[Danger:Bypass]`, `[NextAction]`.

Automation and enforcement
-------------------------
- Advisory checks: automation should surface missing ownership/permission metadata as warnings in PRs and design reviews.
- Enforcement rules: do not fail CI yet. For high-risk flows, product logic or server-side guards may warn, require approval, or block the user action depending on severity.
- Bypass handling: require a recorded override rationale, owner sign-off (digital), and creation of a follow-up task to reconcile political capital spent.

Quality criteria / completion checks
----------------------------------
- Every UI or workflow that initiates contact includes `relationship_owner` and `permission_state` checks.
- Private CSM debrief notes are internal and must not be shared externally. Current reviewer access is limited to Antaeus; future broader access requires explicit roles, audit logging, and export restrictions.
- Any bypass flow includes an override record with owner sign-off and a follow-up task.
- `next_safest_action` is present for flows that could otherwise encourage premature asks.

Examples & sample prompts
-------------------------
- "Run `relationship-motion-designer` check on this PR: identify bypasses, missing ownership metadata, and recommend `next_safest_action`."
- "Does this screen allow bypassing the relationship owner? If yes, mark dangerous and propose a safe alternative."

Resolved clarifying answers
---------------------------
- Antaeus can approve bypass overrides for now, but the app must treat bypasses as serious exceptions, not casual actions.
- In future multi-stakeholder mode, bypasses may require approval from the relationship owner, CSM leader, Product owner, Legal, or GTM leadership depending on risk.
- Actions that always require explicit approval/permission include direct outreach to a PEO when the CSM owner is known, direct outreach to a PEO client, sharing private CSM debrief notes externally, sharing sensitive relationship notes outside the app, exporting sensitive account or relationship data, marking an account as direct contact allowed, changing an off-limits rule, overriding a hold/sensitive status, promoting a hypothesis to canon, changing HML scoring rules that affect recommendations, recommending a next action that bypasses the relationship owner, treating Vensure/PrismHR boundary assumptions as confirmed, and sending unapproved product/pricing/packaging language externally.
- Private CSM debrief notes are readable by Antaeus in the current solo-owner state. Future Product, Legal, CSM leadership, or reviewer access requires role-based access, note sensitivity labels, audit trail, reason-for-access field, timestamped access log, viewer identity, export restrictions, and a clear distinction between private notes and shareable summaries.
- Supported note types should include `Private CSM debrief`, `Internal-only note`, `Shareable summary`, `External-facing follow-up`, `Sensitive boundary note`, and `Legal/compliance-sensitive note`.

Related customizations to add next
---------------------------------
- `DECISION_TEMPLATE.md` in `docs/` to standardize Decision Log entries for relationship motion.
- PR template update to require the `Decision Log` block for changes touching relationship behavior.
- Optional CI job to verify presence of required relationship metadata for protected files or routes.

Contact
-------
This skill enforces relationship-owned channel motion for the PrismHR Global Command Center. To change policy, edit this file and open an issue describing the requested change and owner.

# plan-before-code — SKILL

Purpose
-------
This skill enforces a strict planning-first discipline: do not write implementation code until the planning phase is approved. It ensures product definition, scope, data models, UX, workflows, architecture, risks, and build plans are defined and reviewed before any implementation begins.

Scope
-----
- Workspace-scoped: intended for use by Product, Engineering, Design, and CSM reviewers in this repository.
- Applies to any new feature, schema, automation, integration, or workflow change that requires implementation effort.

Current governance
------------------
- Current Product Owner / Canon Owner and approver: Antaeus.
- Current mode: solo-owner now, multi-role governance later.
- No assigned CSM, Engineering, Product, or Legal reviewer is required for approval at this stage.
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.

When to invoke
--------------
- Before approving or starting any implementation work. Use at kickoff, design reviews, PRs that introduce schema or infra changes, and sprint planning.

Required planning outputs (produce these before implementation)
-------------------------------------------------------------
For every initiative, produce a single planning document that includes these sections (1–9). The planning doc must be reviewed and explicitly approved by the Product Owner / Canon Owner before implementation begins.

1) Product definition
- A concise statement of the problem, target user(s), success metrics, and acceptance criteria.

2) MVP scope
- Concrete list of features included in the first ship; explicitly list exclusions and out-of-scope items.
- Prioritize items by impact and risk (must/should/could).

3) Core data model
- Key entities, fields, sample records, and visibility constraints.
- Include required security/permission annotations and which fields are private to CSMs.

4) UX / app structure
- Top-level screens, key flows, mockups or wireframes, and where decision/ownership data is surfaced.
- Include small interaction specs for critical flows (e.g., intro approval modal, permission checks).

5) Workflow design
- Step-by-step user journeys (user stories) for core personas, including CSMs, Product, PEOs, and external channels.
- Include decision points, owner checks, and fallback safe actions.

6) Technical architecture
- Components, data stores, APIs, third-party integrations, auth model, and deployment constraints.
- Include a short diagram or list of components and where the trust/permission checks live.

7) Build plan
- Phased work breakdown with rough estimates, owners, and acceptance tests per phase. Map to the required implementation phases below.

8) Clarifying questions
- Open list of unknowns that must be resolved before implementation starts; each question should have an owner and a deadline.

9) Risks and tradeoffs
- Clear list of risks, mitigation plans, and important tradeoffs (privacy, speed-to-market, technical debt).

Implementation phases (must not be skipped)
-----------------------------------------
- Phase 0: Setup — repo, infra, CI, feature flags, and basic config.
- Phase 1: Schema and database — create core entities, migrations, and permission fields.
- Phase 2: Core CRUD flows — APIs and UI for create/read/update/delete of core entities with permission checks.
- Phase 3: Dashboard and HML signal feed — surface explainable signals and decision cards (H/M/L feed driven by rules engine).
- Phase 4: Discovery frameworks and pitch column — discovery workflows for opportunities and pitch materials.
- Phase 5: Daily serve system — scheduled digests, “daily serves”, and operational readiness features.
- Phase 6: Polish, testing, deployment — performance, E2E tests, security review, and release.
- Phases are sequential by default. Small setup tasks may run in parallel if they do not lock in major product assumptions.
- Allowed early/parallel work includes repo setup, package setup, linting, formatting, basic app shell, TypeScript config, Tailwind setup, shadcn setup, placeholder folders, local dev environment, and README updates.
- Do not implement database schema, auth model, migrations, HML scoring logic, sensitive-note model, permission logic, off-limits logic, production data structures, or external integrations before approval.

Non-goals / enforcement
-----------------------
- Do not build visual-only dashboards, vanity metrics, or features that display data without first building trust, permission, and signal systems.
- Do not skip phases or merge implementation work that bypasses approved planning documents.

Approval and gating
-------------------
- A planning doc must be marked `Approved` by the Product Owner / Canon Owner before Phase 1 work begins.
- No CI gating is required yet. Future gates may check approval metadata for sensitive schema, infra, permission, off-limits, HML, or canon changes once those paths exist.

Resolved clarifying answers
---------------------------
- Canonical approver for `Approved`: Product Owner / Canon Owner, currently Antaeus.
- Minimum planning approval evidence: product definition, MVP scope, data model, UX/app structure, workflow design, technical architecture, HML signal model, permission/off-limits model, risk and ambiguity register, build phases, clarifying questions, explicit assumptions, and what is canon vs hypothesis.
- Design mocks are useful but not required for initial approval. Separate security signoff is not required yet, but every plan must include privacy/sensitivity review for private CSM notes, off-limits rules, account ownership, sensitive relationship intelligence, external sharing, and exports.
- Phases are sequential by default. Parallelize scaffolding; do not parallelize irreversible product assumptions.
- No CI gating is required yet. Future approval-sensitive paths include `src/models/**`, `src/lib/db/**`, `src/lib/hml/**`, `src/lib/permissions/**`, `src/lib/off-limits/**`, `src/lib/signals/**`, `src/app/**`, `supabase/migrations/**`, `prisma/schema.prisma`, `db/migrations/**`, and architecture/canon docs that define data model, signal engine, permission states, HML scoring rules, or product canon.
- Preferred planning format is Markdown at `docs/plans/<feature-or-phase>.md` with structured frontmatter. Do not use YAML/JSON as the primary planning format yet.
- Antaeus owns resolving clarifying questions. Each open question should track owner, status, priority, impact, due date if blocking, source needed, decision made, and date resolved.

Related customizations to add next
---------------------------------
- `DECISION_TEMPLATE.md` in `docs/` to standardize Decision Log entries across skills.
- PR template updates to require a Planning doc link for schema/infra PRs.
- A small CI job that verifies plan approval metadata for protected paths.

Contact
-------
This skill enforces the planning-first rule for the PrismHR Global Command Center. To change policy, edit this file and open an issue describing the requested change and owner.

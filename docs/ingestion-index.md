# Repository Ingestion Index

Ingested on: 2026-06-15

Primary source: [CODEX.md](../CODEX.md)

Secondary source: [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)

Active implementation contract: [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)

Priority sections indexed:

- [Chat Archive - Copied Conversation (2026-06-15)](../CODEX.md#chat-archive--copied-conversation-2026-06-15)
- [Full Raw Chat Transcript (verbatim)](../CODEX.md#full-raw-chat-transcript-verbatim)

## Indexed Content

### CODEX Chat Archive

Tags: `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci`

Indexed items:

- Session purpose: archive of the interaction that produced workspace-scoped skill files and captured CI, metadata, planning, and HML guidance.
- Skill artifact list and links under `docs/skills/`.
- CI and enforcement decisions: advisory PR warnings first, possible blocking CI later for protected paths, required Decision Log fields, and relationship-sensitive metadata checks.
- HML rules guidance: CSM relationship heat, PEO readiness, follow-up urgency, boundary/off-limits risk, and internal ambiguity risk.
- Consolidated clarifying questions for each skill.
- Suggested next actions: adopt Decision Log PR block, add CI advisory checks, create `docs/DECISION_TEMPLATE.md`, update PR template, and add starter `config/hml-rules.yaml`.

### Full Raw Chat Transcript

Tags: `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci`

Indexed items:

- Verbatim user and assistant exchange that led to the skill files.
- Tool-action history for creating and updating `SKILL.md` files.
- Confirmation that standard `SKILL.md` filenames are intentional because each skill lives in its own folder.
- User request to move chat content into `CODEX.md`.
- Assistant confirmation that the summarized archive and line-by-line transcript were appended to `CODEX.md`.

### Answers To Clarifying Questions

Tags: `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci`

Indexed items:

- Operating assumption: Antaeus is the sole Product Owner, Canon Owner, approver, exception owner, HML threshold owner, build approver, and relationship-risk decision owner for now.
- Governance model: solo-owner now, multi-role governance later. Do not hard-code "solo operator forever."
- Enforcement posture: advisory in Git, mandatory in reasoning. No CI blocking yet.
- Canon policy: hypotheses can become canon only with evidence trail or explicit owner decision; Codex inference alone is insufficient.
- Relationship policy: CSM owns relationship context, intro timing, account nuance, and permission boundaries until clarified otherwise.
- HML policy: HML must measure interpreted operating signal, use High/Medium/Low confidence, keep v1 canonical inputs in the app database, and treat Chicago as a priority-territory modifier that cannot override permission.
- Planning policy: Markdown planning docs under `docs/plans/<feature-or-phase>.md`, approved by Product Owner / Canon Owner before implementation that locks in product assumptions.

### Approved Master MVP Plan

Tags: `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci`

Indexed items:

- Approved master planning output for the PrismHR Global Command Center.
- Approval record: Product Owner / Canon Owner Antaeus approved the plan on 2026-06-16.
- Scope: product definition, MVP scope, core data model, UX/app structure, workflow design, HML signal engine, technical architecture, build plan, clarifying questions, blocker/non-blocker decisions, and internal app names.
- Updated framing: the app is both a relationship-safe partner-motion command center and a first-class Chicagoland prospecting workspace.
- Implementation status: Phase 0 scaffolding may begin; risky features remain blocked until their relevant unknowns are resolved or explicitly accepted.
- Non-goals / blocked features: direct outreach automation, integrations into internal company systems, pricing/legal workflows, AI-owned HML classification, and broad multi-user visibility. Future integrations must use external connections only.

### Governance Artifacts

Tags: `decision-log`, `hml`, `plan-before-code`, `ci`

Indexed items:

- [docs/DECISION_TEMPLATE.md](DECISION_TEMPLATE.md): template for product, data-model, workflow, permission, HML, note-sensitivity, canon, and relationship-motion decisions.
- [config/hml-rules.yaml](../config/hml-rules.yaml): approved starter HML rules configuration for v1 advisory/design enforcement.
- [.github/pull_request_template.md](../.github/pull_request_template.md): PR template requiring plan approval, Decision Log, permission impact, HML impact, unknowns, testing, and risk fields.

### Design System

Tags: `relationship-motion`, `hml`, `decision-log`, `plan-before-code`

Indexed items:

- [docs/architecture/design-brand-audit.md](architecture/design-brand-audit.md): audit of the donor-kit adoption boundary, including the decision to use `antaeus-brand-kit/` for visual-system depth but not app name, mark, wordmark, favicon, or donor product identity.
- [docs/architecture/brand-identity.md](architecture/brand-identity.md): Field Signal visual identity, including the donor-kit boundary, Signal Plot app mark, color-role doctrine, typography, iconography, lexicon, and brand QA.
- [docs/architecture/field-glyphs.md](architecture/field-glyphs.md): app-owned iconography system using the donor kit's construction grammar: 24px grid, 2px stroke, flat terminals, miter joins, semantic accents, and no donor identity assets.
- [docs/architecture/product-lexicon.md](architecture/product-lexicon.md): governed UI vocabulary, navigation labels, CTAs, status labels, empty-state language, table naming, and forbidden CRM/outreach terms.
- [docs/architecture/design-system.md](architecture/design-system.md): draft design system for the app shell, layout, visual language, semantic tokens, HML and permission treatments, Chicagoland prospecting UX, core components, page patterns, accessibility, and implementation mapping.
- [config/design-tokens.css](../config/design-tokens.css): runtime visual tokens importing donor kit colors/motion and mapping app aliases to Field Signal roles.
- Key implication: the UI should feel like a dense operator-grade command center, not a generic CRM, marketing site, or outreach tool. Visual decoration is allowed when it improves hierarchy, scanability, product identity, or operator focus.
- Brand constraint: no donor identity assets, no dark surfaces, no dark UI, no dark mode, no dark gradients, no earth-tone palette, no scaffold copy, and no internal-company-system integration cues. Ink/navy is allowed only for readable text and icon strokes.

### PrismHR Global Video Notes

Tags: `hml`, `relationship-motion`, `decision-log`

Indexed items:

- [docs/research/prismhr-global-video-notes.md](research/prismhr-global-video-notes.md): inspected release transcript and MP4 checksums, summarized PrismHR Global positioning, and recorded app implications.
- Key implication: Chicagoland prospecting is not secondary to relationship management; v1 must support identifying and prioritizing high-fit potential clients while preserving permission and boundary rules.

## Skill Files Indexed

| Skill | Path | Tags | Indexed focus |
| --- | --- | --- | --- |
| PrismHR Canon Guardian | [docs/skills/prismhr-canon-guardian/SKILL.md](skills/prismhr-canon-guardian/SKILL.md) | `skills`, `decision-log` | Fact grounding taxonomy, canon vs public research vs inference vs hypothesis vs unknown, protected uncertainty domains. |
| No CRM Soup | [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md) | `skills`, `decision-log`, `relationship-motion`, `hml`, `ci` | Anti-generic-CRM doctrine, relationship-sensitive metadata, Decision Log requirements, HML derivation expectations, advisory/blocking CI guidance. |
| HML Signal Architect | [docs/skills/hml-signal-architect/SKILL.md](skills/hml-signal-architect/SKILL.md) | `skills`, `hml`, `decision-log`, `ci` | Explainable H/M/L classification schema, deterministic rules architecture, tag pattern, PR Decision Log usage, CI enforcement options. |
| Relationship Motion Designer | [docs/skills/relationship-motion-designer/SKILL.md](skills/relationship-motion-designer/SKILL.md) | `skills`, `relationship-motion`, `decision-log`, `ci` | CSM-owned trust path, permission state checks, bypass prevention, relationship metadata, owner sign-off, PR tags and enforcement. |
| Plan Before Code | [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md) | `skills`, `plan-before-code`, `decision-log`, `hml`, `ci` | Required pre-implementation planning outputs, approval gating, implementation phases, approved-plan checks, CI gate guidance. |
| Clarifying Question Answers | [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md) | `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci` | Resolved governance answers for all five skills, including owner model, advisory-vs-CI posture, canon promotion evidence, HML inputs, relationship overrides, private notes, and planning approval rules. |
| Master MVP Plan | [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md) | `skills`, `decision-log`, `hml`, `relationship-motion`, `plan-before-code`, `ci` | Approved implementation contract covering product definition, MVP scope, data model, UX, workflows, HML engine, architecture, build phases, blockers, and risks. |
| PrismHR Global Video Notes | [docs/research/prismhr-global-video-notes.md](research/prismhr-global-video-notes.md) | `hml`, `relationship-motion`, `decision-log` | Video/transcript source notes supporting the prospecting and PrismHR Global positioning layer. |
| Brand Identity | [docs/architecture/brand-identity.md](architecture/brand-identity.md) | `relationship-motion`, `hml`, `decision-log`, `plan-before-code` | Field Signal visual identity with donor-kit visual doctrine, explicit exclusion of donor name/mark/wordmark, Signal Plot mark, role colors, typography, iconography, lexicon, and brand QA. |
| Design System | [docs/architecture/design-system.md](architecture/design-system.md) | `relationship-motion`, `hml`, `decision-log`, `plan-before-code` | Runtime UI system covering donor-token mapping, Wayfinder shell, HML priority panel, Safety Strip, component rules, accessibility, and implementation mapping. |
| Design/Brand Audit | [docs/architecture/design-brand-audit.md](architecture/design-brand-audit.md) | `relationship-motion`, `hml`, `decision-log`, `plan-before-code` | Gap audit documenting corrected donor-kit adoption boundaries and design-complete non-negotiables. |
| Field Signal Iconography | [docs/architecture/field-glyphs.md](architecture/field-glyphs.md) | `relationship-motion`, `hml`, `decision-log`, `plan-before-code` | App-owned SVG iconography system borrowing donor construction grammar while excluding donor identity assets. |
| Product Lexicon | [docs/architecture/product-lexicon.md](architecture/product-lexicon.md) | `relationship-motion`, `hml`, `decision-log`, `plan-before-code` | Governed product vocabulary to prevent generic CRM, outreach, and automation language. |

## Tag Index

`skills`

- [CODEX.md](../CODEX.md)
- [docs/skills/prismhr-canon-guardian/SKILL.md](skills/prismhr-canon-guardian/SKILL.md)
- [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md)
- [docs/skills/hml-signal-architect/SKILL.md](skills/hml-signal-architect/SKILL.md)
- [docs/skills/relationship-motion-designer/SKILL.md](skills/relationship-motion-designer/SKILL.md)
- [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)
- [docs/research/prismhr-global-video-notes.md](research/prismhr-global-video-notes.md)
- [docs/architecture/brand-identity.md](architecture/brand-identity.md)
- [docs/architecture/design-system.md](architecture/design-system.md)
- [docs/architecture/design-brand-audit.md](architecture/design-brand-audit.md)
- [docs/architecture/field-glyphs.md](architecture/field-glyphs.md)
- [docs/architecture/product-lexicon.md](architecture/product-lexicon.md)

`hml`

- [CODEX.md - HML rules guidance](../CODEX.md#hml-rules-guidance-examples-included-in-chat)
- [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md)
- [docs/skills/hml-signal-architect/SKILL.md](skills/hml-signal-architect/SKILL.md)
- [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)
- [config/hml-rules.yaml](../config/hml-rules.yaml)

`decision-log`

- [CODEX.md - CI and enforcement decisions discussed](../CODEX.md#ci-and-enforcement-decisions-discussed)
- [docs/skills/prismhr-canon-guardian/SKILL.md](skills/prismhr-canon-guardian/SKILL.md)
- [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md)
- [docs/skills/hml-signal-architect/SKILL.md](skills/hml-signal-architect/SKILL.md)
- [docs/skills/relationship-motion-designer/SKILL.md](skills/relationship-motion-designer/SKILL.md)
- [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)
- [docs/DECISION_TEMPLATE.md](DECISION_TEMPLATE.md)
- [.github/pull_request_template.md](../.github/pull_request_template.md)

`relationship-motion`

- [CODEX.md - Core Product Principle](../CODEX.md#core-product-principle)
- [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md)
- [docs/skills/relationship-motion-designer/SKILL.md](skills/relationship-motion-designer/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)

`plan-before-code`

- [CODEX.md - Prime Directive](../CODEX.md#prime-directive)
- [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)

`ci`

- [CODEX.md - CI and enforcement decisions discussed](../CODEX.md#ci-and-enforcement-decisions-discussed)
- [docs/skills/no-crm-soup/SKILL.md](skills/no-crm-soup/SKILL.md)
- [docs/skills/hml-signal-architect/SKILL.md](skills/hml-signal-architect/SKILL.md)
- [docs/skills/relationship-motion-designer/SKILL.md](skills/relationship-motion-designer/SKILL.md)
- [docs/skills/plan-before-code/SKILL.md](skills/plan-before-code/SKILL.md)
- [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md)
- [docs/plans/master-mvp-plan.md](plans/master-mvp-plan.md)
- [config/hml-rules.yaml](../config/hml-rules.yaml)
- [.github/pull_request_template.md](../.github/pull_request_template.md)

## Missing Or Not Yet Present

- No prior repository index or ingestion manifest was present before this file.
- No listed skill file is missing.
- The outstanding clarifying questions for all five skills have answers in [docs/skills/clarifying questions_skills/Answers to Clarifying Questions.md](skills/clarifying%20questions_skills/Answers%20to%20Clarifying%20Questions.md), and those answers have been propagated into the five skill files.
- `docs/DECISION_TEMPLATE.md` is present.
- `config/hml-rules.yaml` is present.
- `.github/pull_request_template.md` is present.
- CI advisory/blocking checks are discussed, but no CI workflow exists in this repository yet. This is intentional for now; CI is explicitly not required yet.

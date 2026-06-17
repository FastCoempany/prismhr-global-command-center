---
title: PrismHR Global Command Center Design System
status: Draft
owner: Product Owner / Canon Owner
related_plan: docs/plans/master-mvp-plan.md
related_docs:
  - docs/product/prismhr-global-codex-canon.md
  - docs/plans/master-mvp-plan.md
  - docs/architecture/brand-identity.md
  - docs/architecture/field-glyphs.md
  - docs/architecture/product-lexicon.md
  - docs/skills/no-crm-soup/SKILL.md
  - docs/skills/relationship-motion-designer/SKILL.md
  - docs/skills/hml-signal-architect/SKILL.md
---

# PrismHR Global Command Center Design System

## Supersession

This document replaces the earlier Field Signal design-system draft. The previous custom palette, old rail-first shell, and old rounded Field Glyph rules are no longer canonical.

The folder `antaeus-brand-kit/` is now the visual-system donor. This app borrows the donor kit's depth: token discipline, color roles, typography, component grammar, motion rules, icon construction, density, and governance. It does not borrow the donor app's name, Grounded A mark, wordmark, favicon, rooms, claims, or product architecture.

## Product Intent

The app helps the owner prospect Chicagoland accounts while protecting CSM-owned relationship motion.

The UI must make these visible where decisions happen:

- HML Priority;
- qualification signals;
- source evidence and confidence;
- permission posture;
- boundary risk;
- next safest action;
- internal unknowns that affect action or implementation.

It is not a CRM, outreach sequencer, sales leaderboard, marketing page, or integration into internal company systems.

## Source Of Truth

Runtime tokens:

- [config/design-tokens.css](../../config/design-tokens.css)

Donor tokens and motion:

- [antaeus-brand-kit/css/tokens.css](../../antaeus-brand-kit/css/tokens.css)
- [antaeus-brand-kit/css/motion.css](../../antaeus-brand-kit/css/motion.css)

App component CSS:

- [src/app/globals.css](../../src/app/globals.css)

App primitives:

- [src/components/ui/button.tsx](../../src/components/ui/button.tsx)
- [src/components/ui/badge.tsx](../../src/components/ui/badge.tsx)
- [src/components/ui/field.tsx](../../src/components/ui/field.tsx)
- [src/components/app-wayfinder.tsx](../../src/components/app-wayfinder.tsx)
- [src/components/hml-priority-panel.tsx](../../src/components/hml-priority-panel.tsx)
- [src/components/field-glyph.tsx](../../src/components/field-glyph.tsx)

Do not import the donor kit's full component CSS if it brings donor-specific identity classes or dark overlay patterns into this app. Build app-owned components from the donor token and behavior model.

## Visual Roles

### Color

Use donor role colors through app tokens:

- `--ds-field`: page field.
- `--ds-surface`: cards, panels, tables, forms.
- `--ds-ink`: readable text and icon stroke.
- `--ds-orange`: dominant move, active signal, selected object.
- `--ds-blue`: system intelligence, source/evidence affordance, unknown/system state, secondary action.
- `--ds-green`: healthy, ready, low attention.
- `--ds-amber`: caution, medium attention, needs review.
- `--ds-red`: real risk, high attention, blocked or unsafe state.

Rules:

- No dark surfaces.
- No dark panels.
- No dark mode.
- No dark gradients.
- No dark decorative slabs.
- Ink/navy is allowed for text and icons only.
- No faded text as hierarchy.
- No earth-tone palette drift.
- Orange is rationed and must mean a real move or active signal.
- Status color is never the only carrier of meaning.

### Typography

Use:

- DM Serif Display for authored headings and product-level titles.
- Public Sans for app UI, body, controls, and tables.
- JetBrains Mono for kickers, codes, tiny metrics, and meter labels.

Rules:

- No negative letter spacing.
- No viewport-scaled type inside product UI.
- Hero-scale type belongs only to true hero/public surfaces, not operational panels.
- Compact panels use smaller type, not giant display type.

### Iconography

Use the app-owned Field Glyph implementation, built from the donor icon grammar:

- 24px viewBox;
- 2px stroke;
- flat terminals;
- miter joins;
- semantic accents only;
- no generic CRM metaphors;
- no donor mark.

Icon spec:

- [docs/architecture/field-glyphs.md](field-glyphs.md)

## Layout

### App Shell

The old persistent left rail is retired as the default shell.

Use:

1. Wayfinder
   - top persistent bar;
   - app mark/name;
   - current trail;
   - Pulling cell for active next safest action;
   - primary route links;
   - command affordance.

2. Work Surface
   - centered max-width column;
   - dense operational sections;
   - tables and forms as primary work, not decoration.

3. Safety Strip
   - near top of decision pages;
   - permission posture;
   - next safest action;
   - source confidence;
   - record count or highest caution when relevant.

4. HML Priority Panel
   - persistent top or left-near-main panel;
   - shows High/Medium/Low counts and heat meter;
   - links to the underlying records;
   - explains signals in text, not color alone.

5. Context Rail
   - optional right rail on wide screens;
   - carries pitch, boundary, source, or unknown context;
   - must not be the only place safety information appears.

### Page Patterns

Today:

- Wayfinder;
- top title;
- Safety Strip;
- HML Priority panel;
- operating posture;
- prospecting and relationship context.

Prospect Field:

- Wayfinder;
- top title;
- Safety Strip;
- HML Priority panel;
- cloud-backed table;
- create prospect form;
- source evidence;
- internal unknowns.

Future CSM/Provider/Opportunity pages:

- same shell;
- HML and permission visible before action;
- relationship owner and boundary rules close to next action.

## Component Rules

### Cards

Use grounded cards:

- white surface;
- hairline border;
- 3px bottom edge;
- optional left gauge when the card carries state;
- subtle shadow;
- 8px max card radius.

Do not nest cards inside cards.

### Buttons

Roles:

- Primary dominant move: orange.
- Secondary system action: blue.
- Quiet action: white surface with token border.

Disabled actions must remain legible and should show why when workflow impact is material.

### Badges

Badges must include text and semantic border/fill:

- red for high/risk;
- amber for medium/caution;
- green for low/ready;
- blue for unknown/system.

Never use badges as pure decoration.

### Fields

Forms must expose safety metadata:

- permission;
- source confidence;
- evidence;
- next safest action;
- related unknowns where relevant.

Do not hide source or permission behind advanced disclosure when the form creates or changes an actionable record.

### Tables

Tables are first-class surfaces.

Required for Prospect Field:

- Company;
- Qualification Signals;
- HML Priority;
- Permission;
- Source;
- Next Safest Action;
- Evidence.

Rows must preserve readable source and permission context. If horizontal scroll is needed, permission and next safest action must remain reachable and understandable.

### HML Priority

HML is not prospect fit. HML is a persistent High/Medium/Low priority panel and heat meter.

Qualification signals can feed HML, but they are not the same thing.

Every HML output must show:

- H/M/L label;
- explanation;
- confidence;
- source/record linkage;
- recommended next safest action where available.

## Motion

Use only the donor motion vocabulary:

- quick: 120ms;
- base: 200ms;
- considered: 320ms;
- standard easing;
- no bounce;
- no spring;
- no decorative hover theater.

Motion shows state change. It does not carry meaning by itself.

Respect `prefers-reduced-motion`.

## Accessibility

Baseline:

- WCAG 2.2 AA for text contrast, keyboard use, focus visibility, target size, and error identification.
- visible focus on every interactive;
- no color-only status;
- text labels for HML, permission, source confidence, and risk;
- 32px preferred interactive targets;
- 24px absolute minimum in dense tables;
- form errors tied to fields;
- table context available to screen readers;
- reduced-motion behavior;
- forced-colors focus and boundaries;
- no faded text.

Dark text for accessibility is allowed and expected. The dark-color restriction applies to surfaces, panels, fills, gradients, and decorative fields.

## Forbidden Product UI

Do not show implementation/scaffold language in product screens:

- Code gate.
- Cloud database.
- Owner writes.
- Auth enabled.
- Scaffold complete.
- MVP slice.
- Local storage disabled.
- Server action.
- Prisma connected.

Access screens may show only the product mark/name, credential field, submit action, and actionable error copy.

## Implementation Mapping

Current code alignment:

- donor tokens and motion imported in `config/design-tokens.css`;
- global app grammar in `src/app/globals.css`;
- app mark in `src/components/brand.tsx`;
- app icons in `src/components/field-glyph.tsx`;
- Wayfinder in `src/components/app-wayfinder.tsx`;
- HML panel in `src/components/hml-priority-panel.tsx`;
- shared Button/Badge/Field primitives mapped to donor roles.

Do not add new visual values directly in components when a token exists.

## QA Checklist

A screen is design-complete only if:

- donor identity assets are absent;
- app identity remains Field Signal / PrismHR Global;
- no dark surface, dark panel, or dark gradient appears;
- ink is text/icon-only;
- orange marks a real move or active signal;
- HML is persistent and explained;
- qualification signals are separate from HML Priority;
- permission and next safest action are visible near decisions;
- source evidence and source confidence appear with prospecting claims;
- icons follow the donor construction grammar;
- buttons, badges, forms, cards, and tables use app tokens;
- copy avoids CRM/outreach automation language;
- product UI has no scaffold/meta labels;
- keyboard, focus, contrast, reduced motion, and target sizes pass.

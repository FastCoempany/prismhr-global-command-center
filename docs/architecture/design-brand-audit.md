---
title: Design And Brand Gap Audit
status: Draft
owner: Product Owner / Canon Owner
related_docs:
  - docs/architecture/brand-identity.md
  - docs/architecture/design-system.md
  - docs/architecture/field-glyphs.md
---

# Design And Brand Gap Audit

## Audit Purpose

This audit records the corrected brand/design direction after adding `antaeus-brand-kit/` to the repo.

The prior Field Signal visual system was too thin and too internally invented. The donor kit supplies deeper visual doctrine. The mistake to avoid is treating that donor kit as this app's identity.

## Corrected Decision

Use `antaeus-brand-kit/` for:

- color roles;
- typography;
- spacing;
- motion;
- density;
- component grammar;
- icon construction;
- governance depth.

Do not use it for:

- app name;
- Grounded A mark;
- wordmark;
- favicon;
- donor app room names;
- donor product claims;
- donor-specific identity language.

## Current Gaps Found

### 1. Identity Boundary Was Easy To Misread

Problem:

- The kit folder name and brand files made it tempting to replace this app's identity with the donor identity.

Correction:

- [brand-identity.md](brand-identity.md) now states that the donor system is a visual-system donor only.
- The app keeps Field Signal / PrismHR Global identity.
- The app mark is Signal Plot, not the donor Grounded A.

### 2. Old Color Law Conflicted With Donor Tokens

Problem:

- The prior docs incorrectly banned the donor ink color globally.
- The donor kit uses ink/navy as its core text and icon color.

Correction:

- The rule is now: no dark surfaces, panels, gradients, dark mode, or decorative dark fields.
- Ink/navy is allowed for readable text and icon strokes.
- Orange, blue, green, amber, and red are role colors, not decoration.

### 3. Old Iconography Was Not Aligned To The Donor Grammar

Problem:

- The previous Field Glyph spec used softer round-cap rules and old colors.

Correction:

- [field-glyphs.md](field-glyphs.md) now uses the donor icon construction grammar: flat terminals, miter joins, 2px stroke, 24px grid.
- The implementation lives in [src/components/field-glyph.tsx](../../src/components/field-glyph.tsx).

### 4. Navigation Needed A Structural Change

Problem:

- The left rail preserved the old product shape.

Correction:

- The default shell now uses a top Wayfinder pattern.
- The Wayfinder is adapted to this app's routes and copy.
- HML Priority is placed near the work surface instead of hidden in a nav rail.

### 5. HML Could Regress Into A Badge

Problem:

- HML had previously drifted toward fit/classification language.

Correction:

- HML is a persistent priority panel and heat meter.
- Qualification signals remain separate.
- HML must include count, priority, confidence, explanation, and record linkage.

### 6. Product UI Still Risks Scaffold Copy

Problem:

- The access screen previously exposed implementation thinking.

Correction:

- Product UI must not show "code gate," "cloud database," "owner writes," "MVP slice," or similar build labels.
- Access screens may show only the app mark/name, credential field, action, and actionable error.

### 7. Component Depth Needed Runtime Mapping

Problem:

- Docs alone were not enough.

Correction:

- `config/design-tokens.css` imports donor tokens and motion.
- `src/app/globals.css` defines app-owned component classes from that grammar.
- Button, Badge, Field, Wayfinder, HML panel, login, Today, and Prospect Field now consume the updated system.

## Non-Negotiables For Implementation

- Donor identity assets are not used.
- Field Signal / PrismHR Global remains the app identity.
- No dark surfaces, dark panels, dark gradients, or dark mode.
- Ink is allowed for text and icons only.
- Orange is rationed to active move/signal.
- Blue is system/source/unknown/secondary action.
- HML is persistent and explained.
- Permission, source confidence, evidence, and next safest action are visible near decisions.
- Prospecting remains first-class.
- No product UI exposes scaffold or implementation state.
- No copy implies automated outreach or internal-company-system access.

## Design-Complete Definition

A screen is design-complete when:

- it uses app tokens mapped from the donor kit;
- it uses the app mark and app glyphs, not donor identity assets;
- it has no dark surface;
- it separates HML Priority from qualification signals;
- it shows permission and next safest action before action;
- it carries source evidence with prospecting claims;
- it labels statuses in text;
- it works by keyboard;
- it has visible focus;
- it respects reduced motion;
- it avoids CRM/outreach language;
- it contains no build/scaffold labels.

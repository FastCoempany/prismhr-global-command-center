---
title: Field Signal Visual Identity
status: Draft
owner: Product Owner / Canon Owner
related_plan: docs/plans/master-mvp-plan.md
related_docs:
  - docs/architecture/design-system.md
  - docs/architecture/field-glyphs.md
  - docs/architecture/product-lexicon.md
  - docs/plans/master-mvp-plan.md
  - docs/research/prismhr-global-video-notes.md
---

# Field Signal Visual Identity

## Supersession

This file supersedes the earlier custom Field Signal palette, old icon rules, and no-navy wording.

The repo folder `antaeus-brand-kit/` is now the visual-system donor for this app. It provides breadth and depth for color roles, typography, spacing, motion, component grammar, icon construction, density, and governance.

It does not provide this app's name, product claim, wordmark, Grounded A mark, lockups, favicon, room model, or brand authorship.

Do not use:

- Antaeus as a product name.
- The Grounded A mark.
- The Antaeus wordmark or lockups.
- The donor kit favicon.
- Donor product room names or claims when they do not belong to this app.

Use:

- `antaeus-brand-kit/css/tokens.css` as the color/type/spacing/motion baseline.
- `antaeus-brand-kit/css/motion.css` as the motion grammar baseline.
- `antaeus-brand-kit/spec/03-component-library-2026-06-07.md` for component depth.
- `antaeus-brand-kit/spec/09-iconography-2026-06-07.md` for icon construction discipline.
- `antaeus-brand-kit/spec/10-brand-identity-2026-06-12.md` only for the idea that identity geometry must be governed, not for the mark itself.

## Product Identity

Working app name:

- Field Signal

Full reference:

- Field Signal for PrismHR Global

Descriptor:

- Prospecting and partner-motion command center for PrismHR Global.

Brand promise:

- Find the right prospects. Protect the trust path. Know the next safest move.

The product remains a relationship-safe prospecting and partner-motion tool. The visual identity must reinforce evidence, permission, HML priority, and next safe action without becoming a CRM, outreach sequencer, or generic dashboard.

## Visual Position

Field Signal should feel:

- bright;
- operator-grade;
- evidence-led;
- dense but readable;
- grounded in commercial judgment;
- distinctive enough not to look like a stock SaaS admin page.

It should not feel:

- like the donor app;
- like a dark command center;
- like a sales leaderboard;
- like a marketing landing page;
- like an internal-company-system console;
- like an outreach automation product.

## Color Doctrine

Canonical runtime source:

- [config/design-tokens.css](../../config/design-tokens.css)

Donor token source:

- [antaeus-brand-kit/css/tokens.css](../../antaeus-brand-kit/css/tokens.css)

Core roles:

- Field: `--ds-field` / `#F5F7FB`
- Surface: `--ds-surface` / `#FFFFFF`
- Sub surface: `--ds-surface-sub` / `#FAFBFD`
- Sunk surface: `--ds-surface-sunk` / `#EFF2F7`
- Ink: `--ds-ink` / `#0A1C40`
- Orange: `--ds-orange` / dominant move
- Blue: `--ds-blue` / system intelligence and secondary action
- Green: `--ds-green` / health, ready, low attention
- Amber: `--ds-amber` / caution, medium attention
- Red: `--ds-red` / real risk, high attention

The old ban on "navy anywhere" is retired because the donor kit uses ink/navy as the readable text and icon stroke. The live constraint is sharper:

- no dark surfaces;
- no dark panels;
- no dark decorative blocks;
- no dark gradients;
- no dark mode;
- no black/chrome command-center shell;
- no faded text as a substitute for hierarchy.

Ink may be used for:

- primary text;
- headings;
- icons;
- table values;
- borders when tokenized;
- small product marks.

Ink may not be used for:

- page backgrounds;
- card backgrounds;
- panels;
- large brand fills;
- decorative slabs.

Orange is rationed. It marks the one dominant move, the active gauge, the selected or pending operational object, or a signal dot. It is not general decoration.

Blue is system intelligence: Wayfinder cues, search, source/evidence affordances, unknown/system states, and secondary actions.

Green, amber, and red are semantic only. Do not pick them for flavor.

## Typography

Use the donor kit's three-font stack:

- DM Serif Display for authored headlines and product-level headings.
- Public Sans for UI, tables, forms, buttons, and body copy.
- JetBrains Mono for kickers, codes, tiny meters, timestamps, and compact operational labels.

Do not use negative letter spacing. Do not scale type with viewport width inside product surfaces. Dense panels should use smaller type, not hero-scale text.

## Mark System

The app does not use the donor Grounded A.

Field Signal uses an app-specific signal/field mark:

- field grid lines for prospecting territory;
- a path line for relationship motion;
- one orange signal dot for the active interpreted signal;
- one blue direction angle for system intelligence.

Construction must follow donor icon discipline:

- flat terminals;
- miter joins;
- clear 24/48 grid;
- 2px default stroke;
- no filled icon containers;
- color only when semantic.

The mark is implemented in [src/components/brand.tsx](../../src/components/brand.tsx).

## Iconography

The old Field Glyph style is superseded by an app-owned icon set built from the donor iconography grammar.

Current implementation:

- [src/components/field-glyph.tsx](../../src/components/field-glyph.tsx)

Design spec:

- [docs/architecture/field-glyphs.md](field-glyphs.md)

Rules:

- semantic icons only;
- 24px viewBox;
- 2px stroke;
- flat caps;
- miter joins;
- no generic CRM metaphors;
- no outreach automation metaphors unless a feature actually performs that action;
- icon-only controls must have accessible names and at least a 32px hit area.

## Navigation Identity

The old left rail is not the visual default.

Use a top Wayfinder:

- product mark/name;
- current trail;
- Pulling cell for the active next safest action;
- primary route links;
- command affordance.

Wayfinder is a visual pattern borrowed from the donor system. Labels, routes, and product language remain Field Signal-specific.

## Copy And Lexicon

The donor kit does not replace this app's domain language.

Use:

- [docs/architecture/product-lexicon.md](product-lexicon.md)

The interface should name the operator's work:

- Prospect Field;
- Permission Posture;
- Source Evidence;
- Qualification Signals;
- HML Priority;
- Next Safest Action;
- Boundary Rule;
- Internal Unknown.

It must never expose scaffold or implementation labels as product UI.

## Brand QA

A screen is visually aligned when:

- it uses donor color roles through app tokens;
- it does not use the donor name, mark, or wordmark;
- it stays bright even when full of data;
- ink is text/icon-only, not a surface;
- orange appears as a real move or active signal, not decoration;
- HML has a persistent panel and text explanation;
- permission and next safest action remain visible near decisions;
- source evidence and confidence travel with prospecting claims;
- icons follow the donor construction grammar but remain app-owned;
- the screen does not look like a generic CRM or outreach tool.

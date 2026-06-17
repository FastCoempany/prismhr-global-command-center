---
title: Design And Brand Gap Audit
status: Draft
owner: Antaeus
related_docs:
  - docs/architecture/brand-identity.md
  - docs/architecture/design-system.md
---

# Design And Brand Gap Audit

## Audit Purpose

This document records what was missing from the first brand/design pass and what was added so implementation does not quietly invent visual or language decisions.

## Findings

### 1. Brand Strategy Was Too Thin

Gap:

- The first pass named a feel, but did not define a full brand idea, brand promise, product name architecture, forbidden brand territory, or how the product should speak.

Resolution:

- Added `Field Signal` as the working UI product name.
- Added brand promise: "Find the right prospects. Protect the trust path. Know the next safest move."
- Added product descriptor: "A prospecting and partner-motion command center for PrismHR Global."
- Added no-CRM and no-outreach language.

### 2. Color Rules Needed A Hard Law

Gap:

- The first design system still carried dark-feeling text and action colors, including navy-adjacent colors.
- The "no dark colors" requirement was not strong enough.

Resolution:

- Added a light-only color law.
- Prohibited navy, dark blue, dark purple, black backgrounds, charcoal panels, dark gradients, dark mode, dark map tiles, and heavy shadows.
- Defined cool light surfaces and non-earth accents.
- Restricted darker ink utilities to text/icon legibility only.

Tradeoff:

- Dark text is not a brand violation. The system uses strong cool neutral ink for readable text and icons, while prohibiting dark surfaces, dark panels, dark fills, dark gradients, and faded text.

### 3. Iconography Was Not Ownable Enough

Gap:

- The first pass relied on lucide icons and only listed icon mappings.
- That would produce a generic SaaS feel.

Resolution:

- Created the `Field Glyphs` custom iconography system.
- Added a dedicated icon construction spec in [field-glyphs.md](field-glyphs.md).
- Required local SVG icons for primary navigation and status-bearing iconography.

### 4. Lexicon Was Underdeveloped

Gap:

- The app had good phrases, but not a governed vocabulary.
- Without a formal lexicon, implementation would drift into CRM language.

Resolution:

- Created [product-lexicon.md](product-lexicon.md).
- Defined preferred terms, forbidden CRM/sales terms, CTA language, HML language, permission language, empty-state patterns, and table column naming.

### 5. Design System Needed Implementation Depth

Gap:

- The first pass had layout, colors, and core components but lacked component states, density modes, table rules, form rules, loading/empty/error states, and responsive details.

Resolution:

- Expanded [design-system.md](design-system.md) with:
  - required token groups
  - local component layer
  - state model
  - table density rules
  - form behavior
  - QA checklist

Remaining work:

- Once code scaffolding begins, convert these docs into actual CSS variables, local components, Field Glyph SVG components, and seed screens.

## Adversarial Pass: Purpose, Brand, And Accessibility

Date: 2026-06-16

Purpose lens:

- The app must help Antaeus prospect Chicagoland accounts while protecting relationship-owned channel motion.
- The most important UI failures would be unsafe motion, unsupported prospect claims, hidden permission state, unreadable dense data, and generic CRM drift.

### 6. Soft Semantic Colors Could Be Misused

Problem:

- The accent palette was light and brand-appropriate, but several colors failed if used as text, thin borders, focus rings, status dots, or icon strokes.
- This would make HML, permission, and prospect-fit indicators weaker exactly where the product needs fast judgment.

Resolution:

- Split soft accents from accessible foreground/border usage.
- Added stronger semantic border/status-dot tokens.
- Required status badges to use ink text, soft background, and stronger border or leading dot.
- Strengthened focus ring and control-border tokens in `config/design-tokens.css`.

Implementation risk:

- Engineers must not use soft accent colors as text colors.
- Filled light buttons need visible borders; the fill alone is not enough.

### 7. The Right Rail Could Hide The Safety Layer

Problem:

- The right intelligence rail carries permission posture, HML explanation, source confidence, and next safest action.
- Collapsing it below 1100px could hide the product's safety layer on smaller screens.

Resolution:

- Added a required `Safety Strip` on the main work surface whenever the rail is hidden or collapsed.
- The strip must show permission posture, next safest action, highest caution state, and source confidence.

Implementation risk:

- A responsive layout that simply hides the right rail is not design-complete.

### 8. Prospecting Needed More Evidence Discipline

Problem:

- Prospecting was first-class in scope, but the design system did not require claim-level evidence provenance strongly enough.
- A prospecting app without source freshness and source confidence becomes a polished guess tracker.

Resolution:

- Added an evidence drawer/source ledger requirement for Prospect Field.
- Required source type, source date, confidence, captured claim, and stale-after date for qualification signals.
- Required evidence before public research claims influence HML, fit, or next safest action.

Implementation risk:

- Do not let the first prospecting table become a static account list with a fit badge.

### 9. Dense UI Could Undersize Targets

Problem:

- The product needs dense tables, but dense row actions and icon-only controls can easily become too small to use reliably.

Resolution:

- Added minimum target-size rules: 24px by 24px minimum, 32px preferred for app controls.
- Field Glyphs can remain visually small, but the interactive wrapper must carry the hit area, focus, and accessible label.

Implementation risk:

- Do not equate icon size with button size.

### 10. Accessibility Coverage Was Too General

Problem:

- The earlier accessibility section named broad needs but missed several implementation-critical behaviors: screen-reader table context, focus return, live updates, reduced motion, forced colors, skip links, and chart/map equivalents.

Resolution:

- Expanded accessibility requirements in `design-system.md`.
- Added reduced-motion and forced-colors handling to `config/design-tokens.css`.

Implementation risk:

- Accessibility cannot be left to a final polish pass because tables, modals, command palette, right rail, and HML updates all need structural decisions during component design.

### 11. Brand Motifs Had One Earth-Tone Leak

Problem:

- The visual motif list used `Leaf/field line`, which could pull the brand back toward nature/earth cues.

Resolution:

- Replaced it with `Field grid`.

Implementation risk:

- Keep territory/prospecting visual language geometric and operational, not botanical.

## Non-Negotiables For Implementation

- The app must look light even when full of data.
- No navy or dark surface can be introduced as a convenience.
- No faded text can be introduced as a convenience.
- Field Signal vocabulary must appear in navigation and primary actions.
- Chicagoland prospecting must look first-class, not like a report tucked under accounts.
- Permission, source confidence, HML explanation, and next safest action must be visible where decisions are made.
- Permission and next safest action must remain visible when the right rail is collapsed.
- Prospecting claims must show source evidence, freshness, and confidence.
- Icons must become Field Glyphs before design-complete review.
- Meaningful icons, status dots, focus rings, control borders, and badge outlines must meet non-text contrast expectations.

## Design-Complete Definition

A frontend screen is design-complete only when:

- it uses the light-only palette;
- it uses the product lexicon;
- it uses Field Glyphs for primary navigation and product-specific status icons;
- it exposes permission posture and next safest action;
- it preserves permission posture and next safest action outside the right rail when needed;
- it gives prospecting claims evidence provenance and freshness state;
- it labels HML with explanation, not just color;
- it handles empty, loading, error, and dense-data states;
- it supports keyboard operation, visible focus, usable target sizes, reduced motion, and forced-colors mode;
- it passes the no-CRM-soup checklist;
- it does not imply internal-company-system integration or outreach automation.

---
title: Field Signal Iconography System
status: Draft
owner: Product Owner / Canon Owner
related_docs:
  - docs/architecture/brand-identity.md
  - docs/architecture/design-system.md
---

# Field Signal Iconography System

## Supersession

This document replaces the earlier Field Glyph spec.

The app's iconography now borrows the construction discipline from `antaeus-brand-kit/spec/09-iconography-2026-06-07.md`, but it does not borrow the donor app's mark, wordmark, name, favicon, or room icons verbatim.

## Purpose

Field Signal icons make the product feel owned without looking like a generic SaaS dashboard.

They must support:

- Chicagoland prospecting;
- qualification signals;
- source evidence;
- permission posture;
- relationship trust paths;
- HML Priority;
- boundary risk;
- internal unknowns;
- next safest action.

## Construction Rules

Canvas:

- 24px viewBox for normal icons.
- 48px viewBox allowed for the product mark.

Stroke:

- 2px default.
- Flat terminals.
- Miter joins.
- No round-cap generic SaaS softness.
- No hairline detail that disappears at 16px.

Color:

- Ink by default.
- One accent only when the icon carries semantic state.
- Orange for active signal or dominant move.
- Blue for system intelligence, source, search, unknown, or route.
- Green for ready/healthy.
- Amber for caution.
- Red for real risk.

Shape:

- geometric;
- field/grid/path/ring/fold motifs;
- no filled icon containers;
- no dark icon tiles;
- no heavy filled pictograms.

## Product Mark

The app mark is Signal Plot:

- horizontal field grid;
- relationship path line;
- orange signal dot;
- blue direction angle.

Implementation:

- [src/components/brand.tsx](../../src/components/brand.tsx)
- [src/app/icon.svg](../../src/app/icon.svg)

This mark is app-owned. It is not the donor Grounded A.

## Current Glyph Set

Implementation:

- [src/components/field-glyph.tsx](../../src/components/field-glyph.tsx)

Current names:

- `signal`: HML priority, signal feed, interpreted operating signal.
- `gauge`: meter, priority distribution, pressure read.
- `prospect`: Prospect Field and account research.
- `trust`: relationship path and CSM-owned motion.
- `permission`: permission posture and safe action check.
- `evidence`: source evidence and captured claim.
- `unknown`: internal unknown or unresolved operating fact.
- `find`: search or research.
- `add`: create/add action.
- `ready`: saved, ready, or clear state.
- `attention`: caution or active risk.

## Required Future Glyphs

Add only when a screen needs them:

- `boundary`: off-limits, hold, or sensitive rule.
- `provider`: PEO or payroll service bureau.
- `partnerRoom`: CSM workspace.
- `promise`: follow-up commitment.
- `pitch`: approved talk track or pitch rail.
- `canon`: approved decision/canon state.
- `privateNote`: private CSM debrief.
- `opportunity`: permission-cleared opportunity path.

Each addition must update this file, the React component, and any screenshots or QA notes that depend on it.

## Semantic Mapping

Navigation:

- Today: `signal` or app mark.
- Prospect Field: `prospect`.
- Trust Path / Partner Rooms: `trust`.
- Boundaries: `permission` or future `boundary`.
- Unknowns: `unknown`.

Status:

- HML High: label plus red badge, optional `attention`.
- HML Medium: label plus amber badge.
- HML Low: label plus green badge or `ready`.
- Source evidence: `evidence` with blue.
- Permission posture: `permission` with semantic accent.

Actions:

- Add prospect: `add`.
- Research/find source: `find`.
- Confirm/save: `ready`.

## Accessibility

Rules:

- Decorative icons use `aria-hidden`.
- Informational icons need accessible names or adjacent text.
- Status icons are never the only status indicator.
- Icon-only controls require an accessible label and tooltip.
- Interactive wrappers should be at least 32px by 32px.
- Dense table controls may visually show 16px icons, but the target cannot collapse to 16px.

## Forbidden Iconography

Do not use:

- the donor Grounded A;
- donor wordmark glyphs;
- generic CRM funnels;
- rockets;
- trophies;
- megaphones for outreach;
- paper airplanes that imply sending;
- dark icon tiles;
- globe icons as the default prospecting metaphor;
- lock-only metaphors for permission, because permission is contextual.

## QA Checklist

An icon is acceptable only if:

- it reads at 16px;
- it follows flat-terminal, miter-join construction;
- it uses one semantic accent at most;
- it avoids donor identity assets;
- it avoids generic CRM/outreach metaphors;
- it has a text label or accessible name when meaningful;
- it does not imply the app touches internal company systems or automates outreach.

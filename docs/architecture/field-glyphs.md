---
title: Field Glyphs Iconography System
status: Draft
owner: Antaeus
related_docs:
  - docs/architecture/brand-identity.md
  - docs/architecture/design-system.md
---

# Field Glyphs Iconography System

## Purpose

Field Glyphs are the custom icon system for Field Signal.

They exist to prevent the app from looking like a generic SaaS dashboard and to make the product's core ideas visually ownable:

- Chicagoland prospecting
- trust paths
- permission posture
- HML signal
- source confidence
- boundary risk
- daily serves
- internal unknowns

## Core Rules

- Canvas: 24x24.
- Stroke: 1.75px.
- Style: line icon, no filled blocks.
- Caps: round.
- Joins: round.
- Corners: soft but not playful.
- Default stroke: `ink-soft`.
- Accent stroke: one brand accent only when status is meaningful.
- No dark containers.
- No filled circular icon backgrounds for primary navigation.
- No generic stock-icon metaphors when a Field Signal metaphor exists.
- No third-party icon set for primary navigation.
- Meaningful glyph strokes must maintain at least 3:1 contrast against adjacent colors.
- Interactive glyph controls need at least a 32px by 32px hit area, even when the visible glyph is 16px or 20px.

## Anatomy

Each Field Glyph should combine:

1. Base form
   - The object or concept.

2. Signal detail
   - A small dot, pulse, tick, ray, path node, fold, or ring.

3. Motion cue
   - A subtle line direction or path, only when it helps meaning.

Do not add all three if the icon becomes busy. At small sizes, clarity wins.

## Grid

- Outer safe area: 2px.
- Main strokes should sit between x/y 3 and 21.
- Small signal dots should be 2px to 2.5px.
- Avoid hairline details below 1.5px spacing.
- Keep icons legible at 16px.

## Icon Families

### Navigation Glyphs

Used in the left navigation.

Must be recognizable at 20px.

- `SignalHome`
- `FieldMap`
- `PartnerRoom`
- `ProviderNode`
- `OpportunityPath`
- `ServeNote`
- `PromiseClock`
- `PitchRail`
- `HmlPulse`
- `BoundaryShield`
- `UnknownMark`

### Status Glyphs

Used in badges, panels, and tables.

Must work at 14px to 16px.

- `PermissionRing`
- `SourceFold`
- `CanonStamp`
- `PrivateDebrief`
- `FitSignal`
- `CautionRay`
- `BlockedHold`
- `WatchDot`

### Relationship Glyphs

Used in detail pages and diagrams.

- `TrustPath`
- `OwnerNode`
- `IntroPath`
- `DebriefLoop`
- `ChannelBridge`

## Required Glyph Specifications

### SignalHome

Meaning:

- Daily operating view.

Construction:

- Rounded square outline suggesting a desk tile.
- Three small horizontal rows.
- One pulse dot in the upper right.

Avoid:

- House icon.
- Dashboard speedometer.

### FieldMap

Meaning:

- Chicagoland prospecting / Prospect Field.

Construction:

- Folded map outline with two soft vertical fold lines.
- One pin built from a ring and point.
- One small signal dot near the pin.

Avoid:

- Globe.
- Dark map tile.
- Generic location marker alone.

### TrustPath

Meaning:

- Relationship-owned channel path.

Construction:

- Three nodes connected by a curved line.
- First node has a soft owner ring.
- Last node has a small open endpoint.

Avoid:

- Sales funnel.
- Network clutter.

### PartnerRoom

Meaning:

- CSM workspace.

Construction:

- Open doorway or room frame.
- One owner node inside.
- Small check or signal dot near the frame.

Avoid:

- Handshake as the primary metaphor.
- People silhouettes.

### ProviderNode

Meaning:

- PEO / payroll service bureau.

Construction:

- Rounded building outline or stacked service nodes.
- One connected side node.
- Light signal tick.

Avoid:

- Corporate skyscraper.
- Bank icon.

### ClientSignal

Meaning:

- Prospect or PEO client fit signal.

Construction:

- Small document/card outline.
- One signal dot.
- One short diagonal ray.

Avoid:

- User avatar.
- Lead/person icon.

### OpportunityPath

Meaning:

- Opportunity movement with permission gates.

Construction:

- Curved path with two nodes.
- Small gate/ring in the middle.
- Endpoint tick.

Avoid:

- Rocket.
- Trophy.
- Dollar sign.

### ServeNote

Meaning:

- Daily Serve.

Construction:

- Note page with folded corner.
- Small outward arrow or usefulness spark.
- No send-plane.

Avoid:

- Paper airplane, because the app does not automate outreach.

### PromiseClock

Meaning:

- Follow-up promise.

Construction:

- Small clock ring.
- Checkmark tail integrated into lower right.

Avoid:

- Alarm bell unless used for overdue status.

### PitchRail

Meaning:

- Persistent pitch library / right rail.

Construction:

- Vertical panel outline.
- Two short content lines.
- One small approved dot.

Avoid:

- Megaphone as the primary symbol.

### PermissionRing

Meaning:

- Permission posture.

Construction variants:

- Clear: open ring with small check.
- Needed: ring with small gap and dot.
- Blocked: closed ring with horizontal hold line.

Avoid:

- Lock-only metaphor. Permission is contextual, not just security.

### BoundaryShield

Meaning:

- Off-limits or boundary rule.

Construction:

- Shield outline.
- Horizontal hold line.
- Optional small signal dot for active rule.

Avoid:

- Police/security aesthetic.

### HmlPulse

Meaning:

- Explainable signal classification.

Construction:

- Baseline with three uneven pulses.
- Small source dot at start.

Avoid:

- Heartbeat medical icon if it reads too clinical.
- Lightning bolt.

### UnknownMark

Meaning:

- Internal unknown / unresolved operating fact.

Construction:

- Small circle or open loop.
- Question mark implied through dot and curve.
- No full question mark if it looks cartoonish.

Avoid:

- Warning triangle unless the unknown is blocking.

### SourceFold

Meaning:

- Source confidence / evidence.

Construction:

- Document fold.
- Small anchor dot.
- One short underline.

Avoid:

- Clipboard icon.

### PrivateDebrief

Meaning:

- Private CSM debrief.

Construction:

- Note page.
- Small side ring representing internal audience.
- Soft diagonal privacy line.

Avoid:

- Lock-only icon.

### CanonStamp

Meaning:

- Approved canon / owner decision.

Construction:

- Small stamp outline.
- Check line.
- Source dot.

Avoid:

- Legal gavel.

## Component API Recommendation

```tsx
type FieldGlyphName =
  | "SignalHome"
  | "FieldMap"
  | "TrustPath"
  | "PartnerRoom"
  | "ProviderNode"
  | "ClientSignal"
  | "OpportunityPath"
  | "ServeNote"
  | "PromiseClock"
  | "PitchRail"
  | "PermissionRing"
  | "BoundaryShield"
  | "HmlPulse"
  | "UnknownMark"
  | "SourceFold"
  | "PrivateDebrief"
  | "CanonStamp";

type FieldGlyphProps = {
  name: FieldGlyphName;
  size?: 16 | 18 | 20 | 24;
  tone?: "default" | "aqua" | "mint" | "lilac" | "coral" | "signal-yellow" | "attention-high" | "muted";
  interactive?: boolean;
  title?: string;
  decorative?: boolean;
};
```

## Accessibility

- Informational icons need accessible names.
- Decorative icons must set `aria-hidden`.
- Status icons must never be the only status indicator.
- Icon-only buttons must have tooltip and accessible label.
- `interactive` glyph wrappers must provide the accessible name, keyboard focus, and target size; the SVG itself should not own button behavior.

## QA Checklist

- Does the icon read at 16px?
- Does it avoid dark fills and dark containers?
- Does it meet meaningful-icon contrast?
- If interactive, is the hit area at least 32px by 32px?
- Does it avoid generic CRM/sales metaphors?
- Does it include only one signal detail?
- Does it fit the Field Glyph family?
- Does the icon imply automation? If yes, revise unless automation is actually part of the feature.
- Is the icon paired with text where status matters?

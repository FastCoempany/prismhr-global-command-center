---
title: PrismHR Global Command Center Brand Identity
status: Draft
owner: Antaeus
related_plan: docs/plans/master-mvp-plan.md
related_docs:
  - docs/architecture/design-system.md
  - docs/architecture/field-glyphs.md
  - docs/architecture/product-lexicon.md
  - docs/plans/master-mvp-plan.md
  - docs/research/prismhr-global-video-notes.md
---

# PrismHR Global Command Center Brand Identity

## Brand Premise

The product is a light, tactical operating desk for finding high-fit Chicagoland prospects and moving through CSM-owned PEO relationships without damaging trust.

The brand should feel like a clean field office for serious commercial judgment: precise, useful, composed, and alive with signal.

## Brand Promise

Find the right prospects. Protect the trust path. Know the next safest move.

## Positioning Line

A prospecting and partner-motion command center for PrismHR Global.

## Brand Architecture

### Product

- Product UI name: Field Signal
- Full reference: Field Signal for PrismHR Global
- Descriptor: prospecting and partner-motion command center

### Primary Workspaces

- Today: daily operating view
- Prospect Field: Chicagoland prospecting
- Partner Rooms: CSM relationship workspaces
- Provider Network: PEO and payroll service bureau records
- Signal Feed: HML signal layer
- Pitch Rail: approved messaging and talk tracks
- Boundaries: permission, off-limits, and safety rules
- Unknowns: unresolved internal facts and operating ambiguity

### Naming Relationship To PrismHR Global

Field Signal is an internal operating product for PrismHR Global work. It should not pretend to be an official external PrismHR brand unless explicitly approved later.

## Brand Principles

1. Light by default
   - No dark UI, no navy, no dark mode, no dramatic command-center black.

2. Signal with restraint
   - Color is used for meaning, not decoration.

3. Prospecting is first-class
   - Chicagoland account discovery is as central as CSM relationship management.

4. Permission is visible
   - The user should never wonder whether an action is safe.

5. Source confidence travels with claims
   - Research, inference, and canon are visually distinct.

6. The system speaks like an operator
   - Clear verbs, no hype, no CRM jargon.

## Name System

The repo can keep `PrismHR Global Command Center`, but the product UI should use a shorter internal product name.

Recommended app name:

**Field Signal**

Why:

- It covers prospecting, relationship movement, and HML signal.
- It does not sound like a CRM.
- It is serious without sounding bureaucratic.
- It can scale beyond Chicagoland if the territory expands.

Supporting names:

- Full name: Field Signal for PrismHR Global
- Short name: Field Signal
- Internal descriptor: Prospecting and partner-motion command center

Do not use:

- Pipeline
- CRM
- Sales hub
- Lead machine
- Growth cockpit
- AI command center

## Mark And Logo System

### Core Mark Concept

The Field Signal mark should combine three ideas:

- a field line for prospecting territory;
- a path node for relationship motion;
- a small signal point for HML intelligence.

Recommended mark:

**Signal Plot**

Construction:

- A rounded square or soft rectangular frame.
- Two thin field rows.
- One path line crossing the rows.
- One signal dot at the point where field and path meet.

This creates a mark that can represent "finding signal in the field" without using a globe, funnel, target, or generic analytics icon.

### Wordmark

Use:

- `Field Signal`

Style:

- Title case.
- Medium weight.
- No all-caps wordmark.
- No negative letter spacing.
- No condensed techno type.

### Lockups

Allowed:

- Mark + Field Signal
- Field Signal
- Field Signal for PrismHR Global

Not allowed:

- Mark on dark background.
- White/reversed logo lockup.
- Gradient-filled mark.
- Globe mark.
- Sales funnel mark.
- Rocket, target, or trophy symbol.

### Usage

- Use the full mark in the app shell header or login/local landing screen.
- Use the glyph-only mark in collapsed navigation.
- Use text-only wordmark in dense product surfaces where space is limited.
- Keep clear space equal to the mark's signal-dot diameter on all sides at minimum.

## Brand Voice

### Voice Attributes

- precise
- calm
- useful
- field-aware
- evidence-led
- permission-conscious

### Sentence Shape

Prefer short direct statements:

- "Permission needed before outreach."
- "High fit, high caution."
- "Source confidence is low."
- "Add one fit signal before creating an opportunity."

Avoid broad marketing claims inside the app:

- "Unlock limitless growth."
- "Transform your pipeline."
- "Let AI find your next customer."

Avoid meta or scaffold claims inside the app:

- "Code gate."
- "Cloud database."
- "Owner writes."
- "MVP slice."
- "Auth enabled."
- "Prisma connected."

The brand voice speaks from the operator's work, not from the implementation. Product UI should name the task, status, evidence, permission, risk, or next safe action. It should not narrate the build.

### Explanation Pattern

Use:

```text
<Status> because <evidence>. Next safest action: <action>.
```

Examples:

- `High fit because the company is hiring in Canada and uses contractor-heavy roles. Next safest action: find a safe channel path.`
- `Permission needed because the related provider has a CSM owner and no intro path is recorded. Next safest action: ask for context first.`

## Light-Only Color Law

This brand does not use dark color fields or dark surfaces. Dark text is allowed and expected.

Rules:

- No navy.
- No dark blue.
- No dark purple.
- No black backgrounds.
- No charcoal panels.
- No dark gradients.
- No dark-mode variant.
- No dark decorative blocks.
- No heavy shadows that make the UI feel dark.
- No faded text.

Text rule:

- Use strong ink for readable text and icons.
- Do not use ink utilities as brand surfaces, backgrounds, large visual fields, or decorative fills.
- Do not fade body text, labels, table values, helper text, or status copy.
- Avoid opacity-based text. Disabled controls must remain legible and should explain why the action is unavailable when workflow impact is material.

## Brand Palette

### Base

- `canvas`: `#F7FAFC`
- `surface`: `#FFFFFF`
- `surface-mist`: `#F2F7FA`
- `surface-glass`: `#EEF6FA`
- `line`: `#DCE7EE`
- `line-strong`: `#C8D7E0`

### Text Utilities

- `ink`: `#1F2A30`
- `ink-soft`: `#34434D`
- `ink-support`: `#4F5B64`
- `ink-disabled`: `#65727C`

These are utility colors for legibility, not brand fields.

### Brand Accents

- `aqua`: `#6ECFE0`
- `aqua-soft`: `#E5F8FB`
- `mint`: `#7EDFC2`
- `mint-soft`: `#E7FBF5`
- `lilac`: `#C5B8FF`
- `lilac-soft`: `#F1EEFF`
- `coral`: `#FF9CA8`
- `coral-soft`: `#FFF0F2`
- `signal-yellow`: `#FFE082`
- `signal-yellow-soft`: `#FFF7D6`

Use accents as small signals, soft badge backgrounds, and selected states. Do not flood a page with one accent. Use the stronger semantic border/status-dot values for meaningful strokes.

### Semantic Colors

- High attention: accent `#FF8A96`, text `#1F2A30`, background `#FFF0F2`, border/status dot `#D43F51`
- Medium attention: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Low attention: accent `#67C9B0`, text `#1F2A30`, background `#E7FBF5`, border/status dot `#23836B`
- Permission clear: accent `#67C9B0`, text `#1F2A30`, background `#E7FBF5`, border/status dot `#23836B`
- Permission needed: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Hold / sensitive: accent `#A6A8FF`, text `#1F2A30`, background `#F1EEFF`, border/status dot `#665DFF`
- Off-limits: accent `#FF8A96`, text `#1F2A30`, background `#FFF0F2`, border/status dot `#D43F51`
- Unknown / unverified: text `#1F2A30`, background `#F2F7FA`, border/status dot `#647887`
- Prospect high fit: accent `#67C9B0`, text `#1F2A30`, background `#E7FBF5`, border/status dot `#23836B`
- Prospect watch: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Prospect parked: text `#1F2A30`, background `#F2F7FA`, border/status dot `#647887`

## Typography

Use a practical interface font with a clear editorial feel.

Preferred:

- Inter for product UI.
- System fallback if Inter is not installed.

Tone:

- Compact.
- Legible.
- Never oversized inside operational surfaces.
- No negative letter spacing.

## Iconography: Field Glyphs

The app should use its own iconography system, called **Field Glyphs**.

Field Glyphs are custom SVG icons built on a 24x24 grid.

Detailed icon construction spec: [field-glyphs.md](field-glyphs.md)

Rules:

- Stroke-only icons.
- 1.75px stroke.
- Rounded caps and joins.
- No filled blocks.
- No dark icon containers.
- Use `ink-soft` by default.
- Use semantic accent strokes only when the icon itself carries status.
- Each icon should include one small signal detail: a dot, tick, short ray, or path node.
- Icons that carry meaning need at least 3:1 contrast against adjacent colors.
- Icon-only controls must use a larger hit area than the visible glyph.

Core visual motifs:

- Path: relationship motion and channel path.
- Pin: territory and prospecting.
- Ring: permission and trust boundary.
- Pulse: HML signal.
- Field grid: Chicagoland fieldwork and account discovery.
- Shield line: caution and off-limits.
- Note fold: source evidence and confidence.

### Required Field Glyphs

- `SignalHome`: dashboard / daily operating view.
- `FieldMap`: Chicagoland prospecting.
- `TrustPath`: CSM-owned relationship path.
- `PartnerRoom`: CSM partner room.
- `ProviderNode`: PEO record.
- `ClientSignal`: PEO client or prospect signal.
- `OpportunityPath`: opportunity movement.
- `ServeNote`: daily serve.
- `PromiseClock`: follow-up promise.
- `PitchRail`: pitch library.
- `PermissionRing`: permission state.
- `BoundaryShield`: off-limits / boundary rule.
- `HmlPulse`: HML signal feed.
- `UnknownMark`: internal unknown.
- `SourceFold`: source confidence.
- `PrivateDebrief`: private CSM debrief.
- `CanonStamp`: canon / approved decision.

### Icon Construction Notes

- `FieldMap`: rounded map fold with one pin and one small signal dot.
- `TrustPath`: two small nodes connected by a curved path, with a ring around the owner node.
- `PermissionRing`: open ring for allowed, ring plus small bar for approval needed, closed ring for blocked.
- `HmlPulse`: short baseline with three vertical pulses labeled visually by height, not by color alone.
- `BoundaryShield`: shield outline with a horizontal hold line.
- `ServeNote`: note page with a small outward arrow, but not a send-plane icon that implies automation.

Implementation:

- Create icons as local React SVG components under `src/components/icons/field-glyphs`.
- Do not rely on lucide, stock, or ad hoc icons for primary navigation or product-specific status icons.
- If Field Glyphs are not implemented yet, use text-only navigation until they are available.

## Lexicon

Use this vocabulary in navigation, headings, CTAs, and empty states.

Detailed product vocabulary: [product-lexicon.md](product-lexicon.md)

### Core Terms

- Field Signal: the app.
- Prospect Field: Chicagoland prospecting workspace.
- Trust Path: relationship-owned channel path.
- Partner Room: CSM workspace.
- Provider: PEO or payroll service bureau.
- Account Signal: researched clue that a company may fit PrismHR Global.
- Fit Signal: reason a prospect may need global payroll, EOR, contractor management, or recruiting.
- Permission Posture: current actionability state.
- Boundary Rule: structured off-limits or caution rule.
- Next Safest Action: recommended action that preserves trust.
- Daily Serve: useful CSM-facing asset or note.
- Promise: follow-up commitment.
- Private Debrief: internal CSM-facing recap.
- Source Confidence: confidence in evidence.
- Canon Status: whether a claim is canon, hypothesis, inference, unknown, or unverified.
- Signal Feed: explainable HML event stream.
- Watchlist: prospects or relationships worth monitoring.

### HML Language

Use:

- High attention
- Medium attention
- Low attention
- High fit
- Medium fit
- Low fit
- High caution
- Permission needed
- Ownership unclear

Avoid:

- Hot lead
- Warm lead
- Cold lead
- Score without explanation
- AI says
- Automated recommendation

### CTAs

Preferred:

- Add prospect
- Add fit signal
- Record source
- Set permission posture
- Add boundary rule
- Create next safest action
- Log daily serve
- Record outcome
- Add private debrief
- Resolve unknown
- Promote to canon
- Park for later

Avoid:

- Blast
- Sequence
- Auto-send
- Push to CRM
- Close deal
- Launch campaign

## Motion And Interaction

Keep motion minimal and light.

- 120-180ms for hover and selection.
- No dramatic page transitions.
- No dark overlays except a transparent modal scrim if required; prefer light scrims.
- Use small pulse only for new HML events, and stop after one cycle.
- Tables should not jump or resize during status changes.
- Respect reduced-motion settings. Pulses, transitions, skeleton shimmer, and drawer animation must have reduced or static alternatives.
- The main work surface must preserve permission posture and next safest action when the right rail collapses.

## Data Visualization Style

Use light visualizations:

- Small bars.
- Dot matrices.
- Timeline rows.
- Fit/risk quadrants with pale backgrounds.
- No dark map tiles.
- No dense heatmaps that look like cybersecurity dashboards.

Chicagoland prospecting should be table-first for v1. A map may come later, but it must use a pale base map.

## Brand QA

Before a screen is design-complete:

- No navy is present.
- No dark surface is present.
- No dark gradient is present.
- The page still reads as light when filled with data.
- The primary user can see prospect fit, permission posture, and next safest action without hunting.
- Prospect fit claims show evidence, source confidence, and freshness.
- Permission posture and next safest action are still visible when the right rail is hidden.
- Icons feel like one family.
- Copy uses the Field Signal lexicon.
- HML and permission are labeled with text, not only color.
- Prospecting and relationship safety both appear as first-class concerns.

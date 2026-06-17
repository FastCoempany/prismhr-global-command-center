---
title: PrismHR Global Command Center Design System
status: Draft
owner: Antaeus
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

## Design Intent

The app should feel like an operator-grade command center: dense, calm, fast to scan, visually distinctive, and built for repeated daily use.

It is not a CRM or marketing site. Dashboard decoration is allowed when it improves hierarchy, scanability, product identity, or operator focus. It should help the user decide:

- Which Chicagoland prospects are worth attention.
- Which CSM or PEO relationship can move safely.
- Which account, promise, or boundary requires action.
- What is High, Medium, or Low and why.
- What the next safest action is.

The design language should communicate judgment, trust, clarity, and control.

Brand identity source: [brand-identity.md](brand-identity.md)

## Product Posture

Use these priorities to break design ties:

1. Permission before motion.
2. Signal before activity.
3. Evidence before assertion.
4. Dense but legible information.
5. Quiet authority over visual drama.
6. Prospecting and relationship safety as equal first-class jobs.

## Visual Personality

### Should Feel

- Tactical
- Premium
- Clear
- Restrained
- Field-ready
- Operational
- Trustworthy

### Should Not Feel

- Generic SaaS CRM
- Decorative-only dashboard filler
- Sales leaderboard
- Consumer social app
- Marketing landing page
- AI toy
- One-note gradient product
- Dark command-center product
- Navy enterprise product

### Hard Product UI Rule: No Meta Or Scaffold UI

Product screens must never expose implementation thinking as user-facing interface.

Do not show cards, chips, labels, headings, or empty states whose purpose is to explain how the app was built, what infrastructure it uses, what phase it is in, or which internal guardrails the developer implemented.

Forbidden user-facing examples:

- "Code gate"
- "Cloud database"
- "Owner writes"
- "Auth enabled"
- "Scaffold complete"
- "MVP slice"
- "Local storage disabled"
- "Server action"
- "Prisma connected"

Allowed only when it is operational data the user can act on:

- Source confidence.
- Permission posture.
- Boundary rule.
- Evidence type.
- Next safest action.
- Internal unknown.
- Sync health for a user-connected external source.

Access screens are especially strict. They may show only the product mark/name, the required credential field, the submit action, and actionable error text. They must not explain the access model, database model, ownership model, or build status.

## Layout System

### App Shell

Use a stable four-zone shell:

1. Left navigation rail
   - Primary rooms.
   - Collapsible labels.
   - Icons plus text on desktop.
   - Icons with tooltips on narrow layouts.

2. Top command bar
   - Current room title.
   - Global search / command palette.
   - Quick create.
   - Current date / work mode if useful.

3. Main work surface
   - Tables, lists, detail views, forms, and workflows.
   - Prefer dense sections over floating marketing-style cards.

4. Right intelligence rail
   - Persistent Pitch.
   - Next safest action.
   - Permission state.
   - HML explanation.
   - Related unknowns or boundary risks.

The right rail should be collapsible but not treated as secondary. It carries the operational judgment layer.

### Widths

- Left navigation: 240px expanded, 64px collapsed.
- Top command bar: 56px.
- Right intelligence rail: 320px to 380px.
- Main content max width: none for operational tables; use constrained widths for forms.

### Spacing

Use an 8px spacing grid.

- `4px`: icon/text micro gaps.
- `8px`: compact control gaps.
- `12px`: dense row padding.
- `16px`: normal section padding.
- `24px`: major section separation.
- `32px`: page-level separation only.

Avoid oversized hero spacing inside the app.

## Color System

The palette is light-only and brand-owned. Avoid any UI dominated by one hue.

Hard rules:

- No navy.
- No dark blue.
- No dark purple.
- No black surfaces.
- No charcoal panels.
- No dark mode.
- No dark gradients.
- No heavy shadows.
- No faded text.

Text rule: dark readable text is allowed and required. The no-dark constraint applies to surfaces, panels, fills, gradients, and large brand fields. Use ink utilities for text and icons only; do not use them as surfaces, fills, large blocks, or decorative fields. Avoid opacity-based text.

### Base

- App background: `#F7FAFC`
- Surface: `#FFFFFF`
- Mist surface: `#F2F7FA`
- Glass surface: `#EEF6FA`
- Line: `#DCE7EE`
- Strong line: `#C8D7E0`
- Control border: `#7F93A1`
- Strong control border: `#647887`

### Text Utilities

- Primary text / ink: `#1F2A30`
- Secondary text / soft ink: `#34434D`
- Supporting text: `#4F5B64`
- Disabled text: `#65727C`

### Brand Accents

- Aqua: `#6ECFE0`
- Aqua soft: `#E5F8FB`
- Mint: `#7EDFC2`
- Mint soft: `#E7FBF5`
- Lilac: `#C5B8FF`
- Lilac soft: `#F1EEFF`
- Coral: `#FF9CA8`
- Coral soft: `#FFF0F2`
- Signal yellow: `#FFE082`
- Signal yellow soft: `#FFF7D6`

### Brand / Action

- Primary action background: `#E7FBF5`
- Primary action hover: `#D5F5EC`
- Primary action border: `#23836B`
- Secondary action background: `#E5F8FB`
- Secondary action hover: `#D6F2F6`
- Secondary action border: `#007A8A`
- Focus ring: `#C9345C`
- Selection background: `#E7FBF5`

Use primary action treatment sparingly for real commands, not decoration.

Primary and secondary buttons must use readable ink text, not white text. Light filled buttons need visible borders because the fill color alone does not create enough boundary contrast on white surfaces.

### Contrast Rules

- Body text, table values, labels, status text, helper text, and badge text target at least 4.5:1 contrast against their background.
- UI boundaries that identify controls, focus states, status dots, required icons, charts, and badge outlines target at least 3:1 contrast against adjacent colors.
- Soft accent colors are not text colors.
- Status badges use an ink foreground, a soft semantic background, and a stronger semantic border or leading dot.
- Do not use opacity to create secondary text. Use `ink-soft` or `ink-support`.
- Disabled text stays legible and must be paired with a reason when disabled state affects workflow.

### HML Semantic Colors

HML must be visible but not loud.

- High attention accent: `#FF8A96`
  - Text: `#1F2A30`
  - Background: `#FFF0F2`
  - Border / status dot: `#D43F51`
- Medium attention accent: `#D8B84F`
  - Text: `#1F2A30`
  - Background: `#FFF7D6`
  - Border / status dot: `#34434D`
- Low attention accent: `#67C9B0`
  - Text: `#1F2A30`
  - Background: `#E7FBF5`
  - Border / status dot: `#23836B`

Use labels with text, not color alone.

### Permission / Boundary Colors

- Open / allowed: accent `#67C9B0`, text `#1F2A30`, background `#E7FBF5`, border/status dot `#23836B`
- Context needed: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Approval required: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Hold / sensitive accent: `#A6A8FF`
  - Text: `#1F2A30`
  - Background: `#F1EEFF`
  - Border / status dot: `#665DFF`
- Off-limits / blocked: accent `#FF8A96`, text `#1F2A30`, background `#FFF0F2`, border/status dot `#D43F51`
- Unknown / unverified: text `#1F2A30`, background `#F2F7FA`, border/status dot `#647887`

### Prospecting Fit Colors

Prospecting should not reuse HML blindly. It needs fit plus risk.

- High-fit prospect: accent `#67C9B0`, text `#1F2A30`, background `#E7FBF5`, border/status dot `#23836B`
- Watch prospect: accent `#D8B84F`, text `#1F2A30`, background `#FFF7D6`, border/status dot `#34434D`
- Low-fit / parked: text `#1F2A30`, background `#F2F7FA`, border/status dot `#647887`
- High boundary risk: accent `#FF8A96`, text `#1F2A30`, background `#FFF0F2`, border/status dot `#D43F51`

## Typography

Use system fonts unless the frontend stack already introduces a better production-safe font.

Recommended stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type Scale

- Page title: 24px / 32px, 600
- Section title: 18px / 26px, 600
- Panel title: 15px / 22px, 600
- Body: 14px / 22px, 400
- Dense table text: 13px / 20px, 400
- Metadata: 12px / 18px, 500
- Badge text: 12px / 16px, 600

Do not scale font sizes with viewport width.

## Iconography

Use the custom **Field Glyphs** system defined in [brand-identity.md](brand-identity.md).

Field Glyphs are local SVG icons, not a generic third-party icon set.

Construction rules:

- 24x24 grid.
- Stroke-only.
- 1.75px stroke.
- Rounded caps and joins.
- No filled blocks.
- No dark icon containers.
- Default stroke: `#34434D`.
- Semantic accent strokes only when the icon carries status.
- Each icon should include one small signal detail: dot, tick, short ray, or path node.

Core icon mapping:

- Dashboard: `SignalHome`
- Chicagoland Prospecting: `FieldMap`
- CSM Partner Rooms: `PartnerRoom`
- CSM-owned relationship path: `TrustPath`
- PEO Network: `ProviderNode`
- PEO client / account signal: `ClientSignal`
- Opportunities: `OpportunityPath`
- Daily Serve: `ServeNote`
- Follow-Up Promises: `PromiseClock`
- Pitch Library: `PitchRail`
- Permission State: `PermissionRing`
- Off-Limits / Rules: `BoundaryShield`
- HML Signal Feed: `HmlPulse`
- Internal Unknowns: `UnknownMark`
- Source Confidence: `SourceFold`
- Private CSM Debrief: `PrivateDebrief`
- Canon / Approved Decision: `CanonStamp`

Implementation note:

- Primary navigation and product-specific status icons must use Field Glyphs.
- If Field Glyphs are not implemented yet, use text labels rather than a generic third-party icon set.
- Do not introduce lucide, stock, or ad hoc icons as the app's primary icon language.
- Icon-only buttons need tooltips.

## Shape, Elevation, And Surfaces

- Radius: 6px default, 8px max for cards/panels.
- Avoid highly rounded pill-heavy UI except for compact tags and statuses.
- Elevation should be subtle and rare.
- Prefer borders and background separation over heavy shadows.

Use cards for repeated records, detail summaries, and modal content. Do not place cards inside cards.

## Density System

The app is operational and data-heavy. Density should be intentional, not cramped.

### Density Modes

V1 default: `comfortable-dense`.

`comfortable-dense`:

- Table row height: 44px.
- Compact badge height: 22px.
- Form field height: 36px.
- Section padding: 16px.
- Used for most screens.

`review`:

- Table row height: 52px.
- More visible explanation text.
- Used for HML review, boundary review, and decision logs.

`focus`:

- Reduced chrome.
- Single workflow or form.
- Used for adding prospect, private debrief, boundary rule, or internal unknown.

Do not create a spacious marketing density mode inside the app.

## Interaction State Model

Every actionable component should define these states:

- Default.
- Hover.
- Focus visible.
- Active / pressed.
- Selected.
- Disabled.
- Loading.
- Error.
- Warning / permission needed.
- Blocked.

State rules:

- Focus state uses lilac focus ring, never navy or earth-tone accents.
- Loading state should preserve layout dimensions.
- Disabled controls need visible reason when the disabled state affects workflow.
- Blocked actions must show the relevant permission, boundary, or unknown reason.
- Icon-only actions must have a minimum 32px by 32px hit area even when the glyph is 16px or 20px.
- Dense table row actions may visually compress, but their pointer targets must not collapse below 24px by 24px.

## Data Table Rules

Tables are first-class surfaces.

### Standard Table Anatomy

- Header row with stable column labels.
- Optional filter/search row.
- Dense data rows.
- Status badges with text.
- Row action menu.
- Last reviewed column when relevant.
- Empty state inside table body, not a separate marketing panel.

### Required Prospect Field Columns

- Company.
- Fit.
- Product relevance.
- Boundary.
- Permission.
- Source.
- Confidence.
- Channel path.
- Next Safest Action.
- Last reviewed.

### Required Relationship Tables Columns

- Name.
- Owner.
- Permission.
- Heat / caution.
- Open promises.
- Boundary.
- Next Safest Action.
- Last reviewed.

### Table Behavior

- No layout jump on badge changes.
- Long text truncates with accessible tooltip or detail drawer.
- Critical statuses should remain visible without horizontal scroll where possible.
- Bulk actions are out of scope for v1 unless they are non-destructive.
- Sorting is allowed; scoring must remain explainable.
- Row actions must be reachable by keyboard and expose their row context to screen readers.
- Tables need programmatic labels, sortable column announcements, and a non-table fallback or detail drawer on narrow screens.

## Form Behavior

Forms must make source, permission, and sensitivity visible.

### Required Safety Footer

Every create/edit form for a meaningful record should include:

- Source type.
- Source confidence.
- Permission impact.
- Note sensitivity.
- Related unknowns.
- Canon status if applicable.

### Validation

- Validation messages should be specific.
- If a field is required because of safety, say why.
- Do not use generic "required" when context matters.

Examples:

- `Permission posture is required so the app does not recommend unsafe next actions.`
- `Source confidence is required because this record may affect HML signal.`
- `Note sensitivity is required before saving private relationship context.`

### Progressive Disclosure

Can hide:

- Advanced metadata.
- Historical audit details.
- Optional related records.

Must not hide:

- Permission posture.
- Note sensitivity.
- Source confidence.
- Boundary/off-limits state.
- Next safest action when action is being created.
- Evidence source for any prospecting or HML claim that affects action.

## Loading, Empty, Error, And Success States

### Loading

- Use skeleton rows for tables.
- Preserve table/header dimensions.
- Avoid full-screen spinners.
- Loading copy should be concrete: `Loading prospect signals...`
- Use `aria-busy` on the loading region when content is updating.

### Empty

- Empty states should create the next useful action.
- Avoid "nothing here" dead ends.
- Always provide one primary next action.

### Error

- Explain what failed.
- Preserve entered data when possible.
- Offer retry or safe alternative.
- Do not expose raw stack traces in UI.
- Error messages should identify whether the record was saved, partially saved, or not saved.

### Success

- Keep success confirmations small.
- Confirm the meaningful outcome, not just "saved."

Examples:

- `Prospect added to Prospect Field.`
- `Boundary rule recorded.`
- `Private debrief saved as internal-only.`

## Data Visualization

Use light, evidence-first visualizations.

Allowed:

- Small bars.
- Soft dot matrices.
- Timeline rows.
- Fit/risk quadrant.
- HML distribution strips.
- Source-confidence stacks.
- Pale map view later.

Avoid:

- Dark map tiles.
- Dense heatmaps.
- Gauges.
- Leaderboards.
- Funnel charts as primary navigation.
- Decorative charts without decisions attached.

Every chart must answer:

- What changed?
- Why does it matter?
- What should the user do next?

## Core Components

### Status Badge

Used for HML, permission, source confidence, note sensitivity, and canon status.

Required:

- Text label.
- Ink text.
- Soft semantic background.
- Strong semantic border or leading status dot.
- Tooltip or inline explanation for ambiguous labels.

Examples:

- `HML: High`
- `Permission: CSM context needed`
- `Source: Public research`
- `Confidence: Medium`
- `Sensitivity: Private CSM debrief`

### Decision Card

A compact judgment panel shown before meaningful actions.

Fields:

- Relationship owner.
- Permission state.
- Boundary/off-limits status.
- HML classification.
- Source confidence.
- Next safest action.
- Blocking unknowns.

Use this wherever the user might otherwise jump from interest to action.

### HML Explanation Panel

Required structure:

- Classification.
- Confidence.
- Plain-English reason.
- Contributing signals.
- Related records.
- Recommended next action.
- Last updated.

Do not display HML as only a colored badge.

### Prospect Fit Panel

Used in Chicagoland prospecting.

Fields:

- Company.
- Fit level.
- Product relevance: EOR, Contractor Management, Contractor Management+.
- Visible international activity.
- Contractor intensity.
- Hiring velocity.
- Compliance complexity.
- Channel path.
- Boundary risk.
- Source confidence.
- Next safest action.

### Permission Gate

A blocking or approval-required component shown when an action is risky.

Levels:

- Warning.
- Approval required.
- Blocked.

Must show:

- Why the gate exists.
- Which rule or permission state triggered it.
- What action is safe instead.
- Who can approve or resolve it.

### Internal Unknown Row

Fields:

- Question.
- Category.
- Risk level.
- Blocking status.
- Owner.
- Source needed.
- Due date.
- Current best answer.
- Resolution status.

### Persistent Pitch Rail

Right-side rail with:

- Current PrismHR Global pitch.
- Product-specific talk tracks.
- CSM-safe version.
- PEO-client version.
- Objection response.
- Source/confidence status.
- Last updated.

The pitch rail should never obscure forms or tables. It collapses cleanly on narrower screens.

### Right Intelligence Rail

The right rail is not a generic sidebar. It is the operating judgment rail.

Required sections by context:

- Permission posture.
- Next safest action.
- HML explanation.
- Source confidence.
- Boundary/off-limits alert if present.
- Related unknowns if present.
- Pitch or talk track when relevant.

Behavior:

- Stays open by default on desktop.
- Collapses to a sheet below 1100px.
- Never blocks save/cancel controls.
- Uses section headers, not stacked cards inside cards.

Collapsed rail requirement:

- When the right rail is collapsed or hidden, the main work surface must show a compact Safety Strip near the page title or active form.
- The Safety Strip includes permission posture, next safest action, highest caution state, and source confidence.
- A collapsed rail cannot be the only place where blocking risk, off-limits state, or permission posture appears.

### Command Palette

The command palette should speed up operator work without implying automation.

Allowed commands:

- Add prospect.
- Add qualification signal.
- Add boundary rule.
- Add private debrief.
- Create promise.
- Open Prospect Field.
- Open Partner Room.
- Search source evidence.
- Resolve unknown.

Forbidden commands:

- Send outreach.
- Auto-enrich.
- Push to CRM.
- Sync internal systems.
- Launch campaign.

### Watchlist

The Watchlist is for prospects or relationships that are not ready for action but should not disappear.

Required fields:

- Reason watched.
- Review date.
- Source confidence.
- Trigger that would make it actionable.
- Related permission or boundary state.

## Page Patterns

### Dashboard

Use a scan-first layout:

- Top row: Do Now, Do Today, Watch.
- Main column: HML signal feed.
- Secondary column: overdue promises, high-risk boundaries, blocking unknowns.
- Right rail: Pitch / next safest action.

Avoid vanity metrics as primary content.

### Chicagoland Prospecting

This is a core v1 page.

Primary view:

- Prospect table with fit, product relevance, boundary risk, source confidence, and next safest action.
- Evidence drawer or source ledger for claim-level provenance.

Secondary views:

- Prospect detail.
- Research notes.
- Source/evidence log.
- Research freshness and stale-source flags.
- HML territory classification.
- Channel path.
- Related CSM/PEO if known.

Primary actions:

- Add prospect.
- Add research signal.
- Score fit.
- Record boundary risk.
- Create next safest action.
- Convert to opportunity only after permission path is clear.

Prospecting evidence rule:

- Every qualification signal needs source type, source date, confidence, captured claim, and stale-after date.
- Public research claims should show evidence before they influence HML, fit, or next safest action.
- Prospecting cannot depend on color-coded fit alone; it must show the reason and the safe channel path.

### CSM Partner Room

Layout:

- Header: CSM name, relationship heat, protectiveness, permission posture.
- Left/main: notes, assigned PEOs, daily serves, promises.
- Right rail: next safest action, pitch, private debrief rules.

### PEO Detail

Layout:

- Header: PEO name, CSM owner, readiness, protectiveness, permission.
- Sections: research, clients/use cases, opportunities, rules, HML history.
- Right rail: intro path and allowed next action.

### Opportunity

Layout:

- Header: opportunity name, source path, stage, permission.
- Main: discovery notes, product fit, follow-up promises.
- Right rail: pitch, risk/caution, next safest action.

## Form Design

Forms should make source and safety explicit.

Common form footer:

- Source type.
- Source confidence.
- Note sensitivity.
- Permission impact.
- Related unknowns.

Use progressive disclosure for advanced metadata, but do not hide permission or sensitivity.

## Empty States

Empty states should be operational prompts, not marketing copy.

Empty states must also avoid scaffold/meta copy. They should not say what system capability exists, what technical layer is ready, or what build phase produced the screen. They should state the missing operator input or the next safe action.

Examples:

- CSM room: "Add the first relationship note, cadence, and known do/dont."
- Prospecting: "Add a Chicagoland account and record the first visible global-workforce signal."
- HML feed: "Signals appear after records have source, permission, and action context."
- Unknowns: "Track unresolved facts that could affect permission, schema, data visibility, or external messaging."

## Lexicon And Voice

Use the Field Signal lexicon from [brand-identity.md](brand-identity.md).

### Product Terms

- Field Signal: the app.
- Prospect Field: Chicagoland prospecting workspace.
- Trust Path: relationship-owned channel path.
- Partner Room: CSM workspace.
- Provider: PEO or payroll service bureau.
- Account Signal: researched clue that a company may fit PrismHR Global.
- Qualification Signal: reason a prospect may need global payroll, EOR, contractor management, or recruiting.
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

### Preferred UI Phrases

- "Add prospect"
- "Add qualification signal"
- "Record source"
- "Set permission posture"
- "Add boundary rule"
- "Create next safest action"
- "Log daily serve"
- "Record outcome"
- "Add private debrief"
- "Resolve unknown"
- "Promote to canon"
- "Park for later"

### Avoid

- "Crush pipeline"
- "Hot lead"
- "Warm lead"
- "Cold lead"
- "AI says"
- "Automagic"
- "Unlimited growth"
- "Engagement score" without explanation
- "Blast"
- "Sequence"
- "Auto-send"
- "Push to CRM"
- "Close deal"
- "Launch campaign"

## Responsive Behavior

Desktop is primary for v1.

- Keep tables dense and horizontally usable.
- Collapse right rail into a drawer below 1100px.
- Collapse nav labels below 900px.
- Use stacked detail sections on mobile.
- Preserve permission state and next safest action near the top on every viewport.
- Preserve the Safety Strip when the right rail is unavailable.
- Never make horizontal scroll the only way to reach permission, boundary, or next-action fields.

## Accessibility

Minimum requirements:

- Keyboard navigable command surfaces.
- Visible focus states.
- Text labels for all status colors.
- Contrast-safe badge and text combinations.
- Form errors tied to fields.
- Tooltips for icon-only controls.
- No reliance on color alone for HML, permission, or risk.
- Minimum 24px by 24px pointer targets, with 32px preferred for app controls.
- Dialog focus trapping and focus return.
- Skip link to main work surface.
- Programmatic headings and landmarks for app shell, main content, right rail, and modals.
- Announced updates for async HML recalculation, saves, validation errors, and destructive or blocking state changes.
- Reduced-motion support for pulses, loading skeletons, and transitions.
- Forced-colors support for focus, control boundaries, and semantic badges.
- Charts and maps must have tabular equivalents.

Reference baseline:

- WCAG 2.2 AA for text contrast, non-text contrast, keyboard operation, target size, and error identification.

## Implementation Mapping

Use Tailwind tokens through CSS variables so the palette can be changed later.

Canonical token starter:

- [config/design-tokens.css](../../config/design-tokens.css)

Required token groups:

- `--color-canvas`
- `--color-surface`
- `--color-surface-mist`
- `--color-surface-glass`
- `--color-line`
- `--color-control-border`
- `--color-control-border-strong`
- `--color-ink`
- `--color-ink-soft`
- `--color-ink-support`
- `--color-ink-disabled`
- `--color-aqua`
- `--color-mint`
- `--color-lilac`
- `--color-coral`
- `--color-signal-yellow`
- `--color-high`
- `--color-high-bg`
- `--color-high-border`
- `--color-medium`
- `--color-medium-bg`
- `--color-medium-border`
- `--color-low`
- `--color-low-bg`
- `--color-low-border`
- `--color-permission-needed`
- `--color-off-limits`
- `--color-unknown`

Recommended shadcn/ui primitives:

- `Button`
- `Badge`
- `Card`
- `Dialog`
- `Sheet`
- `Tabs`
- `Table`
- `DropdownMenu`
- `Tooltip`
- `Command`
- `Textarea`
- `Select`
- `Checkbox`
- `Separator`

Local component layer:

- `AppShell`
- `CommandBar`
- `RightIntelligenceRail`
- `FieldGlyph`
- `FieldGlyphNavItem`
- `StatusBadge`
- `DecisionCard`
- `PermissionGate`
- `HmlExplanationPanel`
- `ProspectFitPanel`
- `SourceConfidenceBadge`
- `NoteSensitivityBadge`
- `NextSafestAction`
- `InternalUnknownList`
- `PitchRail`

## Design QA Checklist

Before a screen is considered ready:

- Is the page light-only?
- Is there no navy anywhere?
- Is there no dark surface, dark panel, or dark gradient?
- Does it show permission state where action happens?
- If the right rail is collapsed, is the Safety Strip still visible?
- Does it show source confidence for inferred or researched information?
- Does it show evidence provenance and freshness for prospecting claims?
- Does it avoid activity-count vanity?
- Does it surface next safest action?
- Does it support Chicagoland prospecting or relationship safety clearly?
- Does every HML label include an explanation?
- Does sensitive note content have visible sensitivity state?
- Does it avoid nesting cards inside cards?
- Does the screen still work without external integrations?
- Does any decoration support operating clarity?
- Does it use the Field Signal lexicon?
- Do icons follow the Field Glyph style?
- Do focus states, control borders, status dots, and icons meet non-text contrast?
- Are all interactive targets at least 24px by 24px, with 32px preferred?
- Do tables, charts, maps, modals, and command surfaces work by keyboard?

## Open Design Decisions

These do not block Phase 0 scaffolding.

- Final app name.
- Exact density setting for tables after first prototype.
- Whether the right rail defaults open or remembers user preference.
- Whether prospecting uses table-first or split-map/table layout later. V1 should be table-first.

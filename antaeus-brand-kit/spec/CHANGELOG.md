# Antaeus Design System — Changelog

One entry per release, newest first. Versioning model: see README.md
Part IV and the scoping doc (deliverables/plans/design-system-deployment-
and-brand-scoping-2026-06-07.md Part VI) — major = breaking, minor =
additive, patch = non-functional.

## 1.9.0 — 2026-06-17

Brighten toward the always-bright field (founder direction). Two changes:
the global `ScheduleFloat` (ADR-013) flips from a navy card to the bright
field — white surface, navy ink, hairline border, orange accents kept —
so no room carries a dark-navy surface anymore. And `.ds-btn--primary`
moves from navy ink to the brand blue: new additive token
`--ds-blue-strong` (`#1d4ed8`, the hover/pressed sibling to `--ds-blue`,
mirroring `--ds-orange-strong`); the primary button now reads
`--ds-blue` → `--ds-blue-strong`. Semantics preserved: orange is still the
one dominant move (`--accent`); blue is the system / strong-secondary role
(canon §3), which is what `--primary` always was. Additive, non-breaking.

## 1.8.0 — 2026-06-15

The motion layer (spec 08). The half-built axis is squared away: the
tokens and reduced-motion floor already existed, but the cross-cutting
named-motion vocabulary did not. `src/components/motion.css` now owns
the closed Part III grammar — first-load staging (the 40ms stagger),
the read switch, the state-settle, region collapse, the single ambient
pulse, and escalation — every duration a `--ds-motion-*` token, the
looping pulse hard-stopped under `prefers-reduced-motion`. Imported once
through `components.css`.

- `BandStack` gains `stage` (first-load staging as a property of the
  region stack); wired into the Dashboard today surface + Signal Console.
- `Card` gains `pulse` (the one ambient dot, one per surface); the
  today Queue sets it on the most-pressured NOW card.
- The Dashboard reads cross-fade on switch (the `.ds-read` key-remount).
- `motion.test.ts` enforces the §4.2 contract: the vocabulary classes
  exist, every duration is token-driven (no raw ms in a rule), only the
  two approved easings appear, the pulse is the single loop, and reduced
  motion stops it. Verified live: staging + read + one pulse dot render
  on the today surface, staging on Signal Console, 0 page errors.

## 1.7.0 — 2026-06-13

The first consumer. The Dashboard today surface (spec 04) composed from
the library — the design system stops being infrastructure and becomes
a room. Behind `room_dashboard_today_v3` (previewable via `?today=1`);
the existing Dashboard renders when the flag is off. The command-
intelligence engine, the readiness drawer, and the data substrate are
untouched — this is presentation composed on the foundation.

- `src/dashboard/today/` — TodaySurface (PageFrame + the full Wayfinder
  bar with the Pulling cell wired to the engine's spotlight + Why) and
  the three reads: Brief (SingleColumn + Measure + the serif headline +
  the one-move button + insight), Spotlight (FocalRail 8/4), Queue (the
  Pulse timeline — NOW / THIS WEEK / GONE QUIET zones, one offset card,
  the horizon counts).
- Pure adapters (`today/lib/adapters.ts`, tested) map CommandObjects →
  RiskCard/Card props, the Wayfinder pull, and the Pulse zones. The
  real consumer revealed one refinement, fixed in-flight: `isQuiet`
  keys off `nextStepOverdue` OR a staleness phrase, so GONE QUIET
  catches stalled deals instead of staying empty.
- The empty state is directional (spec 04 §3.1); the sub-1024 desktop
  notice holds (the PageFrame, spec 05 §2.1); density boots on mount.

Verified headless with seeded engine data across all three reads, zero
pageerrors. This is the canon §6 radiation start — Signal Console +
Deal Workspace (the Dashboard's feeders) are next.

## 1.6.0 — 2026-06-13

Defect fixes from the 2026-06-13 adversarial self-audit. These close
spec-fidelity gaps in already-shipped primitives — the kind the
in-isolation readiness checks missed because they only inspected NEW
work, never re-audited the core.

- The Grounded Card was missing HALF its weight system. Spec 03 §2.3
  names two devices — the gauge (left rule) AND the anchored edge
  (3px bottom rule in the state color). The card shipped (1.1.0) with
  only the gauge. Now it carries the anchored edge too: a quiet
  neutral edge at rest, the role color where state is real, the same
  rationing as the gauge.
- Offset was elevation cosplay, not the §2.4 structure. It shipped as
  box-shadow + a 2px lift. Spec §2.4: the tag sits OUTSIDE the card
  top-left (new `offsetTag` prop), the card lifts with a heavier
  shadow AND an orange anchored edge, and its action extends BELOW the
  card's bottom border. Now it does all three.
- Pulse compression was binary, not progressive. Spec §2.1 says older
  zones "compress progressively." PulseZone's `compressed: boolean`
  becomes `depth: 0–3` — each step quiets and tightens the zone
  further.

Left as-is (judged correct, not a defect): the Wayfinder Why-open
state is a module-level signal — the established singleton pattern for
a per-page bar (the same as the Cmd+K palette). Over-scoping it to
per-instance state would reintroduce the hook-name transform issue for
no real gain, since there is one Wayfinder bar per page by design.

No new components. The Dashboard build is next; it consumes these
corrected primitives.

## 1.5.0 — 2026-06-13

Additive: Dashboard-arc part 0 — the two foundational pieces the
pre-Dashboard readiness check found the arc would otherwise improvise.

- Pulse + Ribbon — the two remaining composition systems (03 Part II),
  now built: `src/components/pulse.tsx` — Ribbon (the section thread:
  mono label + fading rule + count/state suffix), PulseZone (a
  time-zone with its ribbon + items; `compressed` recedes older zones;
  empty zones collapse), PulseTimeline (the vertical time axis), and
  PulseHorizon (the closing strip of counts). This is the Dashboard's
  Queue read (spec 04 §3.2): NOW / THIS WEEK / GONE QUIET zones, the
  past compressing rather than piling up, silence surfaced deliberately.
- The full three-cell Wayfinder bar (03 §3.2). The bar was the minimal
  one-cell version; it now carries Trail (the continuity-param
  breadcrumb), Here (the room crumb + state), and Pulling (the system's
  one next move — serif verb + plain-sentence object + the only orange
  on the bar as a left gauge, with a `Why` that grows the reasoning
  inline: the read + a commit row + "Skip — stay here" that sends
  nothing). The Pulling cell is the ADR-011 Birdseye Float promoted to
  the bar; it travels every room. The minimal call (room + tail) still
  works, so no existing caller breaks.
- Proof sheet gains PULSE + RIBBON sections and the top bar now shows
  all three cells + the inline Why.

After this, the Dashboard build is pure composition of a finished
foundation — Brief (SingleColumn + density), Spotlight (FocalRail),
Queue (PulseTimeline), the week's-reads band, and the Wayfinder
pulling cell wired to the command-intelligence engine.

## 1.4.0 — 2026-06-13

Additive: the composition layer (step 5.5, part 2) — the density
system. Closes the second half of the gap the adversarial pass found:
density was a dead prop on two components; it is now a real system.

- Migration `20260613000000_density_state.sql`: adds
  `workspace_profile.density_state` (check + default show_me_how,
  one-time backfill to step_back for existing workspaces), and extends
  the Phase F `proposed_modifications.kind` check with `density_change`.
- `src/lib/density/` — the canonical module: DensityState (snake, the
  DB enum) + the five-milestone + DensityChangePayload types; the live
  `densityState` signal + `isStepBack`; the four-dimension helpers
  `pickByDensity({verbose, terse})` (sentence count), `sliceAffordances`
  (affordance count, consuming the contract's `affordanceSliceIndex`
  that was dead until now), `showsAnnotations` (annotation density);
  and persistence (`bootDensity` realtime-synced read, `saveDensityState`
  optimistic write).
- The component library reconciles to the canonical snake DensityState;
  FormField + Tooltip read the live signal (annotation density wired).
- Settings gains a DensityCard ("How the system shows up" — Show me how
  / Step back, persists immediately).
- Phase F apply path (`phase-f-apply.ts`) gains the `density_change`
  branch: an accepted proposal writes `to_state` to the profile.
- Proof sheet gains a live DENSITY section (toggle flips the card's
  sentence count + drops the field microcopy).

Deferred (per-room migration, rides each room's design-system pass):
flipping each room's `densityResponsive` + booting density on mount,
and the five milestone detection generators that FIRE density
proposals (heartbeat generators, spec 02 §2.4).

## 1.3.0 — 2026-06-13

Additive: the composition layer (step 5.5, part 1). Closes the gap the
2026-06-13 adversarial pass found — the leaf catalog was built but the
geometry the rooms sit on was not.

- Layout & grid primitives (spec 05): `src/components/layout.tsx` —
  PageFrame (centered 1200px column + 40px gutter + the calm sub-1024
  desktop notice), Grid + GridCell (the 12-column alignment grid,
  24px gutters, span clamped 1–12), Measure (the 66ch reading cap),
  BandStack (vertical rhythm, absent bands collapse), and the three
  archetypes — SingleColumn, FocalRail (8/4), ObjectControls — each
  collapsing to single column below 1024.
- HandoffStrip (spec 03 §3.4) — the missing Navigation catalog member:
  verb-shape cross-room routes, one primary (orange), the rest
  secondary, each threading continuity params.
- RiskCard (spec 03 §4.1 System) — the missing System catalog member:
  a Grounded card at recovery scale (account + cause + score + move).
- Token cleanup: `--ds-orange-strong`, `--ds-on-ink`, `--ds-scrim`
  declared; the three literal colors in components.css retired.
- Proof sheet gains LAYOUT / RISK sections + a HandoffStrip footer.

Still owed for step 5.5 part 2: the density system (spec 02 §249 —
`workspace_profile.density_state`, `src/lib/density/`, the Settings
toggle, the Phase F handler, wiring `affordanceSliceIndex`).

## 1.2.0 — 2026-06-12

Additive: brand round 3 + the catalog tail.

- Sibling spec 10 (brand identity) — the Grounded A's locked geometry,
  weight ladder, lockups, favicon files, usage rules.
- `src/components/brand.tsx` — BrandMark (size-aware stroke ladder,
  no-bar at 16) + BrandLockup (L2 caps); the WayfinderBar's home
  affordance now carries the lockup.
- Favicons shipped: `public/favicon.svg` + 32/16 PNGs +
  apple-touch-icon; linked from every entry HTML (31 files).
- Catalog tail: Stamp, Avatar (initials only; orange decider, blue
  advisor), Tooltip (gone in Step back), Table (one offset row may
  break rank), Progress (milestone ladder + real-things count), and
  the System cards — PatternCard (claim + evidence + how-sure),
  ProposalCard (accept / snooze / dismiss), ReadinessReadout
  (plain-sentence state, no bars).
- Proof sheet gains BRAND / TAIL / STRUCTURE / SYSTEM sections.

## 1.1.0 — 2026-06-12

Additive: the component library exists as code.

- `src/components/` — the spec 03 catalog's core, implemented: Kicker,
  Heading (display/title/control), Stat, StatusChip, Gauge, Card (the
  Grounded primitive with all five data states + the offset variant +
  the unsaved marker), Button (accent/primary/secondary/ghost with
  disabled-why), IconButton, CrossRoomLink, Toggle, TextInput, Select,
  FormField (density-aware microcopy + inline error), Toast, Alert,
  Drawer, Modal, WayfinderBar (the locked un-nav, summoning the
  existing Ctrl+K palette), SegmentedControl, and Meter (the one
  admitted data-viz, bar + read sentence). Each declares the §4.2
  contract; interaction states per §4.8 live in components.css; every
  built-in string is t()-declared.
- `/design-system/` — the proof sheet: the built library composed on
  one internal page, the implementation-review counterpart to the
  icon inventory sheet.
- One additive token: `--ds-space-45` (18px), already named in the
  spec's spacing scale, previously missing from tokens.css.

## 1.0.0 — 2026-06-08

The first locked release. Establishes the baseline:

- The ten siblings (00 charter, 01 voice, 02 density, 03 component
  library, 04 today surface, 05 layout & grid, 06 surface patterns,
  07 lexicon, 08 motion, 09 iconography) plus the README front door.
- Three rendered mockups as visual sources of truth (component library
  un-nav full, today surface, iconography).
- Canonical runtime tokens at `src/styles/tokens.css`.
- The vocabulary decisions of 2026-06-07: "signal spine" renamed to
  "the gauge"; "spine" and "earned" banned; the product claim locked;
  pipeline-never-promises; the operator watches / the system reads.
- The seven founder decisions of 2026-06-08 recorded in the scoping doc
  (all-internal brand, Preact icon library, Option A rollout, waivers
  with a 10-active ceiling, the t() migration, internal glyphs, the
  visitor register).

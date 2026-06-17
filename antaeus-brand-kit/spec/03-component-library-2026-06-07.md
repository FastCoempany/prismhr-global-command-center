# Antaeus Design System — Component Library

**Status:** DRAFT for founder review.
**Date:** 2026-06-07.
**Author:** Claude, working session with the founder (mrcoe7@gmail.com).
**Branch:** `claude/antaeus-gtmos-design-system`.
**Scope:** This is the third sibling document under the design system charter (`00-charter-2026-06-02.md`). It specifies the rendering vocabulary of the product — the composition language the workspace is built from, the native primitives that are the object model, the un-nav that replaces the room rail, and the catalog of components every room draws from. Where the voice spec (`01-voice-as-component-2026-06-04.md`) governs what a component says and the density spec (`02-density-gradient-2026-06-05.md`) governs how much it says at a time, this spec governs how it looks and how it is built. The visual source of truth is the mockup at `deliverables/mockups/component-library-un-nav-full-2026-06-07.html`; this document is the prose that makes it canon.

---

## 0. Why this exists

The charter set the philosophical floor and the face direction (bright field, the three-font stack, orange as the rationed accent). The voice spec made voice a component with a validator. The density spec made the same primitives serve the day-one operator and the fluent operator without forking the product. What none of the three resolved is the actual building material: what a card is, what a section is, what holds the page together, and — the question that consumed most of this session — how the operator finds their way without the left nav rail that made Antaeus read like every other CRM.

This spec resolves that. It commits to a four-scale composition language (Pulse, Ribbon, Grounded, Offset), to five native primitives that are the object model the components render (Signal, Reason, Move, State, Evidence), to a single un-nav primitive (the Wayfinder bar) that replaces the rail, and to a catalog of base and system components every room composes from. The composition came out of a long exploration that kept collapsing into card-variants because earlier directions all fought over a single scale; the four-system answer works because each system owns a different magnification and they never compete. The un-nav came out of a founder gut-check — the rail "screams CRM" — and resolved through two built approaches (a persistent Wayfinder bar, and a bare timeline that is itself the nav) with the founder selecting the bar.

The component library is where the other three specs land on pixels. Every component in this catalog passes the voice validator on its strings (`01` Part II), declares its density behavior along the four dimensions (`02` Part IV), and maps to a sacred noun or a behavioral lever per the charter's "does this hold its place" test. A component that cannot name the primitive it renders does not belong in the catalog.

---

## Part I — What the component library is

### 1.1 A composition language, not a kit of parts

The library is not primarily a collection of buttons and cards. It is a **composition language** — four systems operating at four scales of the workspace, plus the primitives they render. A kit of parts produces card-soup: bordered containers accumulating until structure is carried by boxes instead of by composition, which the charter and canon Part II §5 both name as a hard reject. The four-system language exists specifically to keep structure in the composition and out of the box count.

The four systems are layered by magnification:

- **Pulse Surface** owns the **page**. The whole workspace is a vertical time axis — now at the top, the past compressing beneath, silences surfaced deliberately.
- **Ribbon UI** owns the **section**. Mono-labelled thread headers tie time-zones and groups together across the page.
- **Grounded Signal** owns the **card**. Anchored bottom edges and left gauges give a card its weight; the Signal / Reason / Move grammar gives it its content.
- **Offset Logic** owns the **item**. Exactly one item per zone breaks rank — its tag sits outside the card, its action extends below it — so the eye always has a single place to land.

They compose because they never fight over the same scale. A page is Pulse; the sections inside it are Ribbon; the cards inside those are Grounded; one card per zone is Offset. Overrun any one layer — grounding every card, ribboning a single item, two offsets in a zone — and the page returns to noise. The discipline is the design (Part II).

### 1.2 The native primitives are the object model

Underneath the visual systems sit five **native primitives**. These are not components; they are the shape of what every component renders:

- **Signal** — a time-limited fact about the work ("Champion quiet for twelve days").
- **Reason** — the causal read behind the signal ("Procurement re-opened pricing; the champion never walked it up").
- **Move** — the one specific next action ("Send the revised proposal to the CFO before Friday").
- **State** — the condition of the object (healthy / attention / risk / exec-decision), carried as color, never as a paragraph.
- **Evidence** — the support a claim stands on (the deal facts, the pattern, the window).

The Grounded card's `Signal · Reason · Move` rows are these primitives rendered directly. The gauge is State. The Wayfinder bar's "Why" expansion is Reason plus Evidence. This is the charter's "does this hold its place" test made structural: if a visible object on screen cannot map to one of these five primitives (or to a sacred noun, or a behavioral lever), it should not exist in the room. The primitives are the object model; cards, ribbons, pulses, and the Wayfinder bar are how they render.

### 1.3 The relationship to the other three specs

The component library is the surface where the charter, voice, and density specs become concrete:

- **Charter.** Every component obeys the face direction (bright field, DM Serif Display / Public Sans / JetBrains Mono, orange rationed to the one dominant move) and the behavioral doctrine (one dominant move per surface, object before controls, state before explanation).
- **Voice.** Every operator-facing string a component renders passes the validator (`01` §2). The library does not get to invent vocabulary; "readout owner," "cast proof," "verdict" and every other gummy compound are banned at the component level exactly as they are banned everywhere.
- **Density.** Every density-responsive component declares its behavior along the four dimensions (`02` §1.2 — sentence count, affordance count, default-expanded sections, annotation density). The Grounded card's two density states (Part IV) are the canonical worked example the density spec's §3 points at.

The three specs are orthogonal axes that all converge on the component. The library is where they are reconciled, not where any of them is re-litigated.

---

## Part II — The four systems, in discipline

Each system holds together only as long as it keeps its discipline. This Part states each system's rule. The rules are binding; a room that overruns one of them is off-language even if every individual component is correct.

### 2.1 Pulse — the page is time

The workspace organizes along a vertical time axis. The most-pressured work sits at the top under a `NOW` zone; older zones (`YESTERDAY`, `THIS WEEK`) compress progressively beneath; a `GONE QUIET` zone surfaces the deals that *haven't* moved, because absence is itself a signal. A horizon strip of counts closes the page.

**Discipline:** pulses are authored, not logged. The page is not an activity feed — the system decides what rises and what compresses, the same way the Dashboard ranks under pressure rather than listing chronologically (canon §4.2). The past compresses; it never piles up. Silences are surfaced deliberately, not as an inbox of everything unattended. Overrun: a page where every event gets equal vertical weight is a feed, and a feed is the thing canon §4.21 explicitly forbids the Briefing from becoming.

### 2.2 Ribbon — the section thread

Sections are joined by a thread: a mono uppercase label, a gradient rule fading to the right, and a suffix carrying the section's count or state. Ribbons mark the seams of the page — time-zones (`NOW`, `YESTERDAY`) and groups (a recovery queue, a primitive category).

**Discipline:** ribbons mark zones and groups only, never a single card. A ribbon on one item is decoration, and decoration is what the charter bans when it carries no operating meaning. The thread is movement across the page, not ornament on a box.

### 2.3 Grounded — the card has gravity

A card carries weight through two devices: an **anchored edge** (a 3px bottom rule in the color of the work's state) and a **gauge** (a 3px left rule in the same color). Between them sits the `Signal · Reason · Move` grammar — the native primitives rendered as a tight two-column layout. The card's foot carries a judgment stamp (mono, letter-spaced, hairline-bracketed) and, when warranted, its one action.

**Discipline:** anchored edges and gauges are reserved for cards whose state warrants weight. Grounding everything erases the meaning — if every card has a colored edge, the color stops being a signal. A card at rest with no pressure carries a quiet neutral edge; color is spent only where state is real, exactly as the charter rations orange and spends green only where health is real.

### 2.4 Offset — one item breaks rank

In any zone, exactly one item — the most pressured — breaks the grid. Its tag ("— Today's most pressured," "— Most likely to slip") sits *outside* the card at top-left; the card itself lifts with a heavier shadow and an orange edge; its action extends *below* the card's bottom border. The offset gives the eye a single guaranteed landing place per zone.

**Discipline:** exactly one offset per zone. The single most-pressured item breaks rank; the rest hold the line. Two offsets in a zone is two primary moves competing, which the charter and canon Part III §3 (rule 1) both reject. The offset is how the library renders "one dominant move per surface" at the scale of a zone.

---

## Part III — The un-nav

### 3.1 The rail is dead

A persistent room-list down the left edge is the single element that made Antaeus read like every other CRM and every AI-built GTM tool. It is retired. No room in the product ships a left rail. This is not a stylistic preference; it is the charter's anti-hallway doctrine (canon Part III §6) made literal — a rail is a hallway with the doors painted on it, and the whole architecture exists to replace the hallway with a smarter front door.

The 22 rooms (canon §4) still exist and are still canonical. They are **summoned**, not browsed — reached through the command palette (§3.3), never through a standing menu that competes with the work.

### 3.2 The Wayfinder bar — the locked primitive

The rail's replacement is the **Wayfinder bar**: one thin strip across the top of every surface, in three cells plus a Ctrl+K key.

- **Trail — where you were.** A mono breadcrumb of the path that led here. Reads the same continuity params the HandoffStrips write (`returnTo`, `focusObject`, etc. — canon §2), so it is the visible face of the continuity plumbing that already exists.
- **Here — where you are.** The current surface and its one-line state.
- **Pulling — what the system sees next.** One move, rendered as a serif verb plus a plain-sentence object, in a cell with an orange gauge down its left edge. This is the only place on the bar orange appears. A `Why ▾` affordance opens the bar's reasoning inline.

The bar **travels with the operator across rooms**. When the operator commits and lands inside a room, the trail extends, "Here" updates to the room, and the Pulling cell adapts to the next micro-move inside the act just begun. This is the ADR-011 Birdseye Float promoted from a corner widget to the primary wayfinding element — there is no corner icon; the bar at the top does that job, more legibly.

**Why opens inline, on an explicit gesture.** Clicking `Why` grows the bar downward in place — never a hover-popover, never a modal, never its own route. The expansion renders in the same `Signal · Reason · Move` grammar the cards use: a plain-sentence reason, an evidence ledger (the deal facts, the quiet duration, the matching pattern, the window), a commit row (the move, plus a "Skip — stay here" that closes the bar and sends nothing), and — when the system genuinely has them — alternatives it also considered: a **Sharpen** (a better-aimed version of the move), a **First do this** (a prerequisite the move depends on), and a **Worth knowing** (an off-trail object pulsing that the operator might want surfaced). The alternatives appear only when warranted; the system does not manufacture a fork to look thorough.

### 3.3 Smart Ctrl+K — the verbs-first interrogator

The command palette is not a nav menu and not a flat list of 22 rooms. It is a **"what's next?" interrogator**, structured in three tiers:

1. **What the system reads as next** — the top rows are the system's own contextual picks, expressed as verbs the operator can commit to (`Send`, `Prep`, `Tighten`), each carrying the same reasoning the Wayfinder bar shows.
2. **Verbs you can type** — the operator types a verb to act on anything (`draft`, `write up`, `ask`), or a name to find an object.
3. **Go to a room** — the 22 rooms, summoned at the bottom for when the operator already knows their destination.

Verbs are the carrier of intent; rooms are where the verb lands. This is object-first, command-first (canon Part I §3) read backwards through the keyboard.

### 3.4 The HandoffStrip — routing onward

At the bottom of a room, a HandoffStrip carries the verb-shape cross-room routes the room flows out to (canon §6) — "Pre-mortem this deal," "Carry to an advisor," "Write up the pilot." One route is primary (orange); the rest are secondary. Each threads the continuity params so context travels. The HandoffStrip is how a room ends without ending the work — the loop-transformation doctrine (canon Part III §7) rendered as a component.

### 3.5 The un-nav, in discipline

One bar, three cells, on every surface — the Wayfinder bar is the **only persistent chrome in the product**. Never a second strip. Never a rail beneath it. Never a third standing navigation element. Rooms are summoned through Ctrl+K, not browsed. The bar's reasoning opens inline on an explicit click, never on hover. Everything that is not the bar is the work.

A note on what was set aside: this session built two un-nav approaches — the Wayfinder bar, and a bare "timeline is the nav" surface with no persistent chrome at all and Ctrl+K as the only door. The founder selected the bar (2026-06-07) for the property the timeline could not give: the system's read stays visible at all times, and context never drops when the operator moves between rooms. The timeline-as-nav is preserved in the comparison mockup (`deliverables/mockups/un-nav-wayfinder-vs-timeline-2026-06-07.html`) as a recorded alternative, not a live option.

---

## Part IV — The catalog, the contract, and how components behave

### 4.1 The catalog

The full catalog is rendered in the mockup; this is its index, organized by the role each group plays.

- **Display** — Heading (serif, for authored emphasis), Heading (sans, for control heads), Kicker (mono caps), Stat (serif numeral + mono label), StatusChip (the canon §10 state vocabulary), Stamp (judgment, hairline-bracketed), Gauge, Anchored-edge, Avatar (initials, never photos; orange marks the decider, blue the advisor).
- **Action** — Buttons (accent / primary / secondary / ghost, where accent-orange is the one dominant move), IconButton, Toggle (persists immediately, no Save), Offset-action (the button that extends below an offset card, once per zone), cross-room Link (blue), inline Action.
- **Input** — TextInput (orange focus ring), Select (same chrome as text), composed FormField (label + input + microcopy, where the microcopy is the first thing the density gradient drops in Step back).
- **Feedback & overlays** — Toast (navy, confirms a save), Alert (side-glow, one read + one move, in amber / blue / red per state), Modal (destructive confirmations only), Tooltip (hover, present in Show me how and gone in Step back), Drawer (depth slides in over the page — the Readiness drawer, the Discovery dossier — never a route change; Esc / scrim / button all close it).
- **Navigation** — the Wayfinder bar, the verbs-first Ctrl+K palette, the HandoffStrip (all Part III), Segmented control (in-room lenses onto one object — Brief / Spotlight / Queue, forensic sheets — a pill for modes, an underline for in-card tabs; never a door between rooms).
- **Data & structure** — Table (the intervention board: many rows without becoming a spreadsheet, one row breaking rank per the Offset rule), Progress (a ladder of real milestones plus the section-readiness count, never a vanity percent), Meter (the one admitted data-viz — see §4.5).
- **States** — every component's empty / sparse / loading / error / saved renderings (see §4.4).
- **Iconography** — the semantic line-glyph set, under the discipline in §4.6.
- **System** — ProposalCard (the Phase F accept / dismiss / snooze surface), PatternCard (the Briefing's authored read + evidence + how-sure), RiskCard (a Grounded card at recovery scale), ReadinessReadout (a plain-sentence state, never a score-bar, never a "verdict" container).

### 4.2 The component contract

Every component declares three things, one per sibling spec:

- **Family** (this spec) — which composition system it belongs to, so it knows its scale and its discipline. A card declares Grounded; a section header declares Ribbon.
- **Voice family + string classes** (`01` §4.1) — which of the seven family-temperatures its strings carry, and which strings are authored-prose vs. control-labels vs. data, so the validator checks them at the right strictness.
- **Density behavior** (`02` §4.1) — whether it is density-responsive, and if so how it renders along the four dimensions in Show me how vs. Step back.

A component that declares all three is buildable against the catalog. A component that cannot name its Family does not belong in the library — it is decoration, and the "does this hold its place" test removes it.

### 4.3 The token system

The library is built on a fixed token set, named in the mockup's `:root` and inherited from the charter's face direction. Tokens are not re-decided per room; a room that reaches for a value outside the set is either introducing a new meaning (a founder decision) or drifting (a bug). Five families:

**Color — by role, never by hue.** The field (`#F5F7FB`) and three surface elevations (sub / sunk / warm); navy ink at four opacities (`--ink` solid, `--ink-soft` .66, `--ink-faint` .42, `--ink-quiet` .22) plus three hairline weights; and the semantic accents, each carrying exactly one meaning per the charter's color roles — orange `#E6701E` (the one dominant move), blue `#2563EB` (system intelligence), green `#22C55E` (real health), amber `#F59E0B` (caution), red `#EF4444` (real risk). A token is referenced by its role (`--orange` = the move), never picked for how it looks. There is one theme — bright — and no theming layer; the dark exception is retired (charter Part II §1).

**Type — a five-step ramp.** Display (DM Serif Display, `clamp(30–64px)`, the authored headline and the system's read), Title (serif, 18–24px, card and section heads), Body (Public Sans 15px/1.6, reading and controls), Label (Public Sans 13px/600, field labels and control heads), and Kicker (JetBrains Mono 9.5–11px, letter-spaced uppercase, codes / timestamps / ribbon labels). Each step has a fixed size, weight, and line-height. The compression rule from the charter holds: one serif step carries the argument per surface, sans carries the work, mono recedes — three sizes maximum in any first zone.

**Spacing — an 8px rhythm with a 4px half-step.** The scale is `4 · 8 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 28 · 32 · 40 · 48 · 56`, an 8-based rhythm with 4px and 14px as the permitted half-steps for tight control surfaces. Component padding, gaps, and section margins all draw from it. Off-scale spacing is the most common quiet source of an un-composed feel and is treated as drift.

**Radius — three steps.** 4px (controls, inputs, buttons), 6–8px (cards, specimens, chips), 10–12px (containers, drawers, the app frame). 99px for fully-round (pills, toggles, avatars). Sharper than the SaaS-default rounded-everything; the modest radius is part of the severe, authored feel.

**Elevation & z-index — a fixed stacking order.** Three shadow tokens (rest / lift / offset) map to three resting elevations: at-rest cards (rest), the offset item and active surfaces (lift), the offset action and lifted overlays (offset). Above the page, layering is a fixed order so overlays never fight: base content `0` → the Wayfinder bar (sticky, always above content) → Drawer scrim + panel → Modal → Toast / Ctrl+K palette (always on top). A component never sets an ad-hoc z-index; it declares its layer and inherits the order.

### 4.4 The state matrix — every component renders five conditions

Canon Part II §6 requires every surface to treat five states explicitly, not just the at-rest one. A component is not catalog-complete until it renders all five. This is the most common place a library fails: it ships the happy path and leaves empty, loading, and error to each room to improvise, which produces blank panels, cryptic failures, and operators wondering whether their edit saved. The library forbids that by making the five states part of the component, not the room.

- **Empty** is not a dead end. It names *why the surface matters*, *what unlocks it*, and *one move* that fills it — "No signals yet. When an account you're watching moves, it shows up here. Add your first account." Empty is directional and intelligent, never a shrug.
- **Sparse** is the common early state, and it must feel like a real start, not a fault. One account with one signal is a beginning, marked as such ("1 of a watchlist you're still building"), not a half-broken grid.
- **Loading** holds the component's shape — a skeleton in the card's silhouette — so the surface never flashes blank and never reflows when data lands.
- **Error** is honest, calm, specific, and recoverable (canon §10's error-language lock). Inline field errors say what's needed in plain words; a failed save keeps the operator's edits and offers a retry. Edits are never silently lost.
- **Saved / unsaved** is never ambiguous. Unsaved work carries a quiet amber marker; a completed save confirms and *names what changed downstream* ("Saved. Linked to Acme · pilot updated"), because canon's rule 5 is that every save must visibly matter.

A density-responsive component renders these five states in both Show me how and Step back — the states are orthogonal to the density dimension, the same way voice is. The validator applies to every state's strings; an error message is authored prose and passes the same voice gate as any other sentence.

### 4.5 Quantity, and the one chart the language admits

The four-system language renders quantity as **prose first** — the Signal/Reason/Move sentence carries the meaning, the stat is a serif numeral with a mono label, and the gauge carries state as color. This is deliberate and it is canon: §4.17 pins "bars are decoration, the verdict is the value," and the product is explicitly *not* a dashboard bundle (canon Part I §1).

The library therefore admits **exactly one data-viz primitive: the Meter** — a single horizontal bar for one bounded ratio (pipeline coverage, account heat, a single readiness dimension), always paired with the sentence that carries the read ("2.4× — enough to hit the number if your win rate holds"). The bar shows the magnitude; the sentence is the value. Everything else is refused: no multi-series charts, no pie or donut, no trend sparklines, no decorative gauges. A surface that needs to compare many series is almost always trying to be a BI dashboard, which is the hard-reject the charter and canon both name. If a future room produces a genuine case the Meter cannot serve, it routes to the founder as a new-meaning decision, not a component author's call.

### 4.6 Iconography — the discipline now, the set later

The full icon system is its own owed sibling spec (charter §4.7), so the complete set, naming, and file pipeline are out of scope here. But the *discipline* belongs in the library now, because icons are the easiest place to smuggle decoration past the anti-ornament rule, and rooms migrating before the icon spec lands need a rule to build against.

The discipline: every icon is a **thin line glyph** — a consistent stroke weight (1.6px at a 20px box), `currentColor`, no fill, no spot illustration. An icon holds its place only by standing for a **sacred noun** (account, signal, deal, proof, advisor, call) or a **verb the operator acts with** (send, carry, add, find, read). Default navy; an icon takes an accent color *only when the thing it names is itself the accent* — the send-move is orange because it is the dominant move, a signal glyph is blue because blue is the system-intelligence role. No icon is used purely to fill space, label a section for decoration, or soften a surface. The starter set in the mockup (six nouns, six verbs) is illustrative of the style, not the final inventory.

### 4.7 The affordance slice index — closing the density handoff

The density spec §4.5 deferred one mechanism to this spec: where the "show the primary action plus one or two, collapse the rest" cutoff is configured for affordance count in Step back. This spec resolves it. The slice point is a property on the **component contract** (§4.2), declared alongside the component's density behavior: a component sets `affordanceSliceIndex` (default 2) to say how many actions stay visible in Step back before the rest collapse into a "More" affordance or onto hover. It lives on the component because the right cutoff is a property of the component's action set, not a global constant — a Grounded card's two-action foot slices at 2, the Wayfinder bar's commit row slices at 2, a bulk-action toolbar might slice higher. The density state decides *whether* to slice; the component decides *where*. This closes the only cross-spec handoff `02` left open to `03`.

### 4.8 Interaction states — every interactive renders six

The data-state matrix (§4.4) covers what a component shows about its *data*. This covers what an interactive control shows about *itself* as the operator works it. Every button, link, input, toggle, palette row, segmented control, and table row renders six interaction states, and a component is not catalog-complete until all six are specified:

- **Rest** — the default, quiet.
- **Hover** — a low-cost affordance cue (a border darkening, a faint surface fill); never motion theater.
- **Focus** — a visible focus ring, always. This is non-negotiable and is the most common omission: a 3px orange-soft ring (`--orange` at low alpha) on every focusable control, driven by `:focus-visible` so it appears for keyboard users without cluttering mouse clicks. The mouse-first operator must succeed (canon Part II §5), and the keyboard-first operator must never be lost.
- **Active / pressed** — a 1px depress on buttons; immediate, physical.
- **Disabled** — visibly inert (reduced contrast, no pointer), and — the part most libraries skip — it carries *why* when the reason isn't obvious ("Add a buyer before this can send"), because a dead control with no explanation is a dead end.
- **Selected** — the persistent on-state for toggles, segmented lenses, and the active row, carried by the orange accent or fill, distinct from transient hover.

These compose with the data states: a button can be disabled *because* the surface is loading; a row can be selected *and* in error. The component declares both axes.

### 4.9 Accessibility — the floor, not a feature

An excellent library makes accessibility a property of every component, not a later audit. The floor every component meets:

- **Focus-visible everywhere.** Per §4.8 — every interactive shows a keyboard focus ring. No control is reachable by mouse but invisible to the keyboard.
- **Keyboard-operable.** Ctrl+K opens and closes from anywhere; arrow keys move the selection, Enter commits, Esc closes and returns focus to where it was. Modals and Drawers trap focus while open and restore it on close. The Wayfinder bar, the HandoffStrip, and every palette row are reachable and actuated without a mouse. This is also a product commitment, not only an a11y one — the command-first operator lives on the keyboard.
- **Contrast holds.** Body and label text meet WCAG AA (4.5:1) on their surfaces; the low-opacity ink tokens (`--ink-faint`, `--ink-quiet`) are reserved for large text, decorative rules, and non-essential meta — never for an operating sentence. A meaning never rides on color alone: state is carried by the gauge *and* the stamp word ("Likely to slip"), so a red gauge is never the only signal.
- **Motion respects the operator.** Every animation — the pulsing offset dot, the loading shimmer, the Wayfinder expansion — is gated behind `prefers-reduced-motion`; when reduced motion is set, state changes resolve instantly with no shimmer and no pulse. Motion is never load-bearing for meaning (charter / canon Part II §6).
- **Targets are real.** Interactive hit areas clear a 32px minimum even when the visible glyph is smaller; an icon button is a 34px square around a 20px glyph.
- **Semantics are honest.** Headings nest in order, controls are real `<button>`/`<input>` elements with labels (an icon-only control carries an accessible name), live regions announce a save or an error, and the reading order matches the visual order. The Stamp, the Kicker, and decorative rules are marked decorative so a screen reader hears the sentence, not the ornament.

### 4.10 Content resilience — the component survives real data

Components are specified against real, messy data, not the tidy demo string. Each handles:

- **Overflow.** Long account names truncate with an ellipsis and keep their full value on hover/title; a list that exceeds its room collapses to a "+N more" affordance (the Signal Console pattern) rather than growing unbounded.
- **Boundaries.** Zero is distinct from empty is distinct from null — "0 deals" is a real count with its own copy, not the empty state, which is "no pipeline yet." A meter at 0% and a meter with no data read differently.
- **Formatting.** Money, large numbers, dates, and durations render through shared formatters (`$84K` not `$84000`; "11 days" not "11.0d"; relative time in the operator's timezone, which is Central per canon). Formatting is a token-like shared concern, not per-component improvisation.
- **Pluralization and tone.** "1 signal" / "2 signals"; counts never read "1 signals," and an empty count never reads as a failure. Every generated string — including the pluralized and the zero case — passes the voice validator.

### 4.11 Composition and layering

The four systems compose by scale (Part II); components compose by a few nesting rules that keep the page from collapsing into boxes-in-boxes:

- A **Grounded card** is the deepest container an operator authors into. Cards do not nest inside cards — a card that needs sub-cards is two cards in a list, or a Table. This is the single most important rule against card-soup.
- **Overlays do not stack arbitrarily.** A Drawer or Modal may contain Grounded cards, Tables, and forms, but not another Drawer; depth opens once. The z-index order in §4.3 is the only layering.
- **Offset is a property of a zone, not a card** — exactly one per zone (Part II §2.4), and an offset card cannot itself contain an offset.
- **Ribbons thread; they never wrap.** A ribbon marks the seam between groups; it is not a container with contents.

These rules are what let a room stay legible as it fills — structure stays in the composition, never in an accumulation of nested borders.

### 4.12 What this spec does not decide

This spec governs the rendering vocabulary. It does not decide what the operator lands on when they open the product — the home surface, its ranking, its resting-state behavior, and how the agency boundary holds when the system has a read but the operator has not asked for it. That is the today-surface spec, the next sibling owed (Part V and the §5.3 signals point at it). The component library gives that spec its building material — the Wayfinder bar, the Pulse timeline, the Grounded cards, the full state matrix — but does not pre-empt its decisions about ranking and landing.

It also does not decide motion in any depth beyond the charter's "sparse, consequential, state-based" rule and the `prefers-reduced-motion` floor in §4.9. The *grammar* of motion — how a pulse arrives, how the Wayfinder bar grows, how a zone compresses, the cross-fade between density states `02` §4.5 deferred — is the owed motion spec (charter §4.7). Likewise §4.6 states the icon discipline but defers the full icon system to its own owed sibling. What this spec *does* now decide, and did not before this pass: the complete token system (§4.3), the interaction-state matrix (§4.8), the accessibility floor (§4.9), content resilience (§4.10), and composition/layering rules (§4.11) — the difference between a hero-surface catalog and a library a room can actually be built on without improvising.

---

## Part V — Migration, citations, signals

### 5.1 Migration of the 22 existing rooms

The 22 rooms shipped on the legacy face and, in most cases, with a room rail or its equivalents. Migration to the component library is **per-room and additive**, not a big-bang reskin:

1. **The rail comes out first.** Each room drops its standing navigation and mounts the Wayfinder bar (the existing `RoomChrome` + birdseye work from canon §6 / ADR-011 is the seam this lands on). This is the highest-value, lowest-risk first step, and it is uniform across every room.
2. **Cards migrate to Grounded.** A room's primary objects re-render as Grounded cards with the `Signal · Reason · Move` grammar and gauges. This is where the room's mind (canon §4) gets verified against the primitive model — anything that cannot map to Signal / Reason / Move / State / Evidence is flagged.
3. **The page adopts Pulse where it has a time axis.** Rooms that rank under pressure or carry a timeline (Dashboard, Signal Console, Deal Workspace, Future Autopsy) adopt the Pulse surface. Rooms that shape an object (the Decision Benches) keep a composed-bench layout but draw from the same catalog.
4. **Voice and density land last**, once the structure is in place — every migrated string through the validator, every density-responsive component declaring its four-dimension behavior.

The migration order is a separate decision (the today-surface spec and the founder will set it); Dashboard is the obvious first room because it is the command surface where the Wayfinder bar, the Pulse timeline, and the Grounded ranking all converge. The charter's mind-protection rule holds throughout: migrating a room may not weaken what it knows, and any mind error the migration surfaces routes to the founder before it is fixed (charter §4.4, canon Part IV §4).

### 5.2 Behavioral citations

The library is engineered against the same evidence base as the rest of the system (canon Part III):

- **One dominant move per surface** (canon Part III §3 rule 1) — rendered by Offset Logic (one item breaks rank per zone) and by the orange ration (one accent move per surface).
- **Object before controls; state before explanation** (rules 2–3) — rendered by the Grounded card showing name + state + signal before the control set, and by the gauge carrying state as color before any prose.
- **Implementation intentions** (Gollwitzer 1999, d = 0.65) — rendered by the Move primitive, which is always a specific contextual next action, never "follow up."
- **The hallway problem** (canon Part III §6) — answered by the un-nav: no equal-weight doors, one ranked read of where the work is, rooms summoned not browsed.
- **Loop transformation, never closure** (Part III §7) — rendered by the HandoffStrip, which ends a room by routing onward rather than showing "all done."

### 5.3 Signals the spec is doing its job

The component library is working if:

1. **No room reads like a CRM.** A stranger shown a migrated room cannot place it as Salesforce-shaped — there is no rail, no equal-weight module grid, no card-soup.
2. **The four systems stay in their lanes.** Audits find one offset per zone, ribbons only on zones and groups, grounded weight only where state is real, and Pulse compressing the past rather than feeding it. When a room overruns a system's discipline, it is visible and nameable.
3. **Every visible object maps to a primitive.** A room audit can point at any element and name its Signal / Reason / Move / State / Evidence (or its sacred noun, or its behavioral lever). Nothing on screen is unaccounted for.
4. **The Wayfinder carries context without restating.** The operator moves between rooms and the bar's trail, here, and pulling stay coherent — the continuity params never drop, and the operator never re-enters known context.
5. **The catalog is the only source.** New rooms compose from the catalog rather than inventing components; a new component is a deliberate addition with a declared Family, not an ad-hoc box.
6. **No surface is ever blank, cryptic, or ambiguous.** Every component renders its empty, sparse, loading, error, and saved states; an audit can open any surface mid-load or with no data and find it directional rather than broken, and the operator never wonders whether their edit saved.
7. **The whole product is keyboard-operable, and nothing is reachable by mouse alone.** Every interactive shows a focus ring; Ctrl+K, the Wayfinder, the HandoffStrip, every row and control actuate without a mouse; overlays trap and restore focus; no meaning rides on color alone; reduced motion is honored.
8. **Components survive real data.** Long names truncate, lists collapse to "+N more," zero reads differently from empty, money and dates format through shared helpers, and counts pluralize — the demo string and the messy production row render equally well.

---

## Closing

The component library is the building material the first three specs were always pointing at. The charter set the floor and the face; the voice spec made what a component says a validated component; the density spec made the same component serve two operators; this spec makes the component itself — four systems at four scales, five primitives as the object model, one bar instead of a rail.

The composition holds together by discipline, not by decoration. Pulse compresses the past; Ribbon threads only the seams; Grounded spends weight only where state is real; Offset lets exactly one item break rank. The un-nav holds by the same discipline: one bar, three cells, the only persistent chrome, rooms summoned not browsed. Canon is preserved throughout — bright field, the three-font stack, orange rationed to the one move, every string a plain sentence a peer would say. The native primitives — Signal · Reason · Move · State · Evidence — are the object model; cards, ribbons, pulses, and the Wayfinder bar are how they render. A component that cannot name the primitive it renders does not belong in the room.

Visual source of truth: `deliverables/mockups/component-library-un-nav-full-2026-06-07.html`.

# Antaeus Design System — Index & Governance

**Version:** 1.9.0 (see VERSION + CHANGELOG.md; model in Part IV).

**Status:** DRAFT for founder review.
**Date:** 2026-06-07.
**Author:** Claude, working session with the founder (mrcoe7@gmail.com).
**Branch:** `claude/antaeus-gtmos-design-system`.
**Scope:** This is the front door of the design system: what it is, what each of its eleven siblings governs, how they fit together, how a change to any of them is made, what the system explicitly does *not* try to cover, and where the brand layer lives instead. A cold reader opens this first; a returning session uses it as the map; a contributor reads the governance model here before opening a pull request that changes a word, a color, a token, or a rule. This document does not invent rules; it consolidates and points.

---

## 0. Why this exists

The design system was built sibling by sibling, each spec written to govern the layer in front of it. That worked — but it left no document at the level above, naming what the set is, what order it was built in, how it composes, how to change it, or what is deliberately out of scope. A future session opening this folder cold would have to reassemble the map from eleven files, the way a session opening the vocabulary cold had to reassemble it from a dozen places before the lexicon (`07`) gave it one home. This document is the same fix at one altitude up. It is deliberately short because its job is to point — at the docs that argue and at the canon that decides — not to repeat what the siblings say.

Honest note: this should have existed earlier. The set was substantially navigable by sibling 04 and could have stayed living from then on. It got built late because each sibling pass focused on the content of the new doc rather than on whether the system, viewed from outside, was still navigable. Going forward, an index update is part of any sibling change.

---

## Part I — What the design system is

The Antaeus design system is the working contract that governs how every operator-facing surface in Antaeus is built. It exists so the product reads as one product across 22 rooms and seven composition families, and so a build decision made in one room cannot quietly redefine what another room's vocabulary, layout, or motion means. It is owned by the founder and binding on every commit that touches an operator-facing surface.

The system rests on **four orthogonal axes** — four independent dimensions that compose without re-learning each other:

- **Voice** (`01`) — what a surface says.
- **Density** (`02`) — how much it says at once.
- **Layout** (`05`) — where it sits.
- **Motion** (`08`) — how a change to it is shown.

The component library (`03`), surface patterns (`06`), today surface (`04`), lexicon (`07`), and iconography (`09`) are how the four axes get rendered on real surfaces. The charter (`00`) is the floor every other doc answers to.

The system is **deliberately small** at every level. Three layout archetypes, not a dozen. One vocabulary home, not many. One closed motion vocabulary. One bright theme. One icon weight. A design system that offers many choices is a design system that drowns; this one offers few, and they compose.

---

## Part II — The eleven siblings

In dependency order — read top to bottom on a first pass.

### 00 — Charter (`00-charter-2026-06-02.md`)
The philosophical floor. The daily verb, the two tests (selectivity-defensible, truth-loyalty), the four behavioral properties, the face direction (bright, the three-font stack, orange rationed), the agency boundary. Every spec under it answers to this.

### 01 — Voice as Component (`01-voice-as-component-2026-06-04.md`)
What a surface says. The validator (banned vocabulary, structural rules, family-modulated temperature), the locked product claim, the pipeline-never-promises rule, the watching-versus-reading split.

### 02 — Density Gradient (`02-density-gradient-2026-06-05.md`)
How much a surface says at once. Two states (Show me how / Step back), four dimensions, one per-workspace setting. Orthogonal to voice.

### 03 — Component Library (`03-component-library-2026-06-07.md`)
The rendering vocabulary. The four-system composition (Pulse · Ribbon · Grounded · Offset), the five native primitives (Signal · Reason · Move · State · Evidence), the un-nav (Wayfinder bar + Ctrl+K + HandoffStrip), the full component catalog, all tokens (color · type · space · radius · elevation · z-order), every component state (empty · sparse · loading · error · saved), interaction states, the accessibility floor, content resilience, composition and layering rules. Visual source of truth: `mockups/component-library-un-nav-full-2026-06-07.html`.

### 04 — Today Surface (`04-today-surface-2026-06-07.md`)
What the operator lands on. The calm Brief as the resting body, ranks-but-never-imposes, the three reads (Brief / Spotlight / Queue), the session arc, the Brief's content contract. This is the Command Chamber family's surface pattern, written first because it is the first build. Visual source of truth: `mockups/today-surface-2026-06-07.html`.

### 05 — Layout & Grid (`05-layout-and-grid-2026-06-07.md`)
The page geometry. A full-bleed Wayfinder bar over a centered 1200px column, a 12-column grid, a 66ch reading measure, the 8px vertical rhythm, three multi-pane archetypes (single column · focal + rail · object + controls), the supported desktop range.

### 06 — Surface Patterns (`06-surface-patterns-2026-06-07.md`)
How each of the seven composition families fills its layout archetype. Region stack, weight order, the one move, loop transformation, health treatment, entry posture — written once per family. The Command Chamber points at `04`; the other six are written here.

### 07 — Lexicon (`07-lexicon-2026-06-07.md`)
The complete vocabulary reference. The locked claim and the three positioning rules. The sacred nouns, every coinage (the Wayfinder, the gauge, the Brief, the reads, the bands), the 22 room names, the seven families, the state vocabulary, the consolidated banned list, conventions for time (Central), money, dates, counts, capitalization. The readable consolidation; the validator (`01`) stays the enforcement.

### 08 — Motion (`08-motion-2026-06-07.md`)
The animation grammar. Four duration tokens (0 / 120 / 200 / 320ms), two decelerating easings (no bounce, no spring), a 40ms stagger, a closed vocabulary of named motions, the `prefers-reduced-motion` floor as a hard requirement. Motion shows a state change; it never decorates and never carries meaning.

### 09 — Iconography (`09-iconography-2026-06-07.md`)
The icon system and the proprietary set. A 24px construction grid with a 2px keyline, flat terminals and miter joins (the deliberate departure from generic round-cap libraries), two signature elements (the edge-rule, the rationed tick), semantic-only, color rationed to roles. Complete inventory: 11 nouns · 17 verbs · 11 system & wayfinding · 7 status. Three sizes (16 / 20 / 24). Visual source of truth: `mockups/iconography-2026-06-07.html`.

### 10 — Brand Identity (`10-brand-identity-2026-06-12.md`)
The Grounded A, locked: a drafted capital A on a ground line extending past its feet, in the icon set's construction. The geometry (48 viewBox, the weight ladder, the no-bar-at-16 rule), the L1 serif / L2 caps lockups, the shipped favicon files, and the usage rules. Implementation: `src/components/brand.tsx`; decided rounds 1–2, 2026-06-12.

### 11 — Marketing Visual System (`11-marketing-visual-system-2026-06-15.md`)
The visitor face: how the mark + face extend to the surfaces a prospect sees before becoming an operator — landing, positioning, the auth boundary, legal, social share cards, docs. One DNA with the operator face (bright field, navy ink, orange rationed, the type trio, the Grounded-A mark), more room to make the argument; measured against the Marcus-Reed visitor persona and the Test 4 / Test 5 rubric. The spec is the design language; the public-face refresh is the build that consumes it, deferred by design. Closes brand identity (`10` §6) as a system.

---

## Part III — How the documents compose

The dependency relationships, in short form:

- **Everything answers to `00`.** Any change to a sibling that contradicts the charter routes through the mind-correction protocol (`canon Part IV §4`) before it can land.
- **`01`, `02`, `05`, `08` are the four orthogonal axes.** They specify what a surface says, how much, where it sits, and how its changes show — and they were designed never to have to re-learn each other. A change to one does not require a change to any other.
- **`03` is where the four axes meet on real components.** Every component declares its family (`03`), its voice (`01`), and its density behavior (`02`). Its motion is from `08`; its geometry is from `05`.
- **`04` and `06` are the per-surface and per-family applications of `03`.** Today surface (`04`) is the Command Chamber's surface, written in full and pointed at by surface patterns (`06`) as the worked example the other six families follow.
- **`07` is the consolidated reference of vocabulary decided across `00`, `01`, `03`, `04`, `05`, `06`, `08`, `09`.** It enforces nothing on its own; it points at the validator (`01`) and the canon (`00 §2, §10, §11`).
- **`09` is the icon system the rendering vocabulary depends on.** It inherits color roles from `00`, semantic discipline from `03 §4.6`, the no-animation rule from `08`, and its grammar of meaning from the sacred nouns.

The rendered mockups live in `deliverables/mockups/` and are the visual source of truth for the specs that point at them.

---

## Part IV — Governance

### 4.1 The contribution model

Three kinds of changes, three paths.

**Adding or banning a word.** A *canon* change. Routes through founder approval in a pull request that updates both the enforcement (`src/lib/voice/banned-vocabulary.ts` and the blessed-labels list) and the readable form (lexicon `07` and voice `01 §2.2`). The two never drift; if they disagree, the enforcement wins and the reference gets corrected.

**Adding or changing a token, a color, a component, a motion, or an icon.** A new color is a new meaning (component library `03 §4.3`), and new meanings are founder decisions (charter `§4.4`). The same goes for adding a fourth layout archetype, a fifth duration step, a sixth icon size, or any other extension of a closed set the specs lock. Pull request, founder approval, the spec updated in the same commit.

**Adding or changing a sibling spec.** A new spec under the design system, or a substantive change to an existing one, routes through the mind-correction protocol (`canon Part IV §4`). The contributor names the change, the rationale, and what it supersedes; the founder confirms before the commit lands. This document and the lexicon are updated in the same pull request so the front door stays current.

### 4.2 The mind-correction protocol

The deeper authority for anything that changes what a *room* knows — the strategic substance, the sacred nouns, the canon laws — is `canon Part IV §4`: the design system serves the mind, it does not rewrite the mind. Face work may surface mind errors; when it does, the protocol is to name the issue, propose the correction in writing, get explicit founder confirmation, update the canon, and then apply the design change. The design system does not have authority to change the mind on its own.

### 4.3 What the validator enforces

At build time, every operator-facing string the diff touches passes the voice validator (`01 §2.5`). A failed validation blocks the merge. There is no override path, no warning-and-ship, no soft fallback (founder-locked posture, 2026-06-04). The rare legitimate exception (a third-party error message rendered verbatim, for example) requires an explicit waiver comment, logged to `deliverables/voice-waivers.log`, reviewed quarterly. Adding a waiver is a canon decision.

### 4.4 When two documents disagree

The order of authority:

1. The canon (`CLAUDE.md`) and the deeper authorities in `deliverables/design-principle-strict-bible/`.
2. The charter (`00`).
3. The relevant sibling spec.
4. The lexicon (`07`) and the mockups, as reference.

If a sibling spec and the canon disagree, the canon wins and the spec gets corrected. If two siblings disagree, the one earlier in the dependency order (Part III) wins — the charter over voice, voice over density, and so on — and the contradiction routes through founder approval.

---

## Part V — What this system does not cover

Three categories — non-goals, lives elsewhere, and parked — so a future session does not mistake any of them for gaps.

### 5.1 Non-goals

- **Mobile and tablet.** Antaeus is desktop-only (canon, ADR-001, layout `05 §2.1`). Below 1024px the workspace shows a calm desktop-only notice, never a half-reflowed room. Deliberate non-goal.
- **Internationalization and localization.** Single locale (English), single timezone for the app's operating clock (Central, canon 2026-06-01). No i18n layer planned. Operator content (account names, deal values) renders in the operator's input; the product chrome does not translate.
- **Sound and haptics.** The product has neither (motion `08 §4.3`). Animation is the only feedback modality beyond the visual surface.
- **A theming layer.** One bright theme, locked (charter Part II §1, the dark exception retired 2026-04-27). No dark mode, no per-room theme variants.

### 5.2 Lives elsewhere

- **Brand and visual identity** — the logo, the wordmark, brand colors as a brand (rather than as semantic roles), marketing surfaces, the visitor-face arc. These live in `deliverables/design-principle-strict-bible/02-brand-and-visual-system/` and the visitor-face audit work, not here. The design system *consumes* the face direction the charter locked (bright field, the three-font stack, orange as the rationed accent) and stops there.
- **Behavioral research and the canon laws** — `deliverables/design-principle-strict-bible/03-research-backbone/` and `canon Part III`. The design system cites them as binding; they do not change because a spec wants them to.
- **The room mind** — `canon §4`, the sacred nouns (`§2`), the compounding matrix (`§6`). The design system serves these and does not rewrite them.
- **The orchestration layer** — `canon Part II.5 §7` and the ADR series. The design system renders what the orchestration produces (proposals, observations); the orchestration's own behavior is not a design-system concern.

### 5.3 Parked

- **Deeper accessibility.** The component library `§4.9` floor is in place (focus-visible everywhere, full keyboard operability, AA contrast, never color alone, `prefers-reduced-motion`, real hit targets, honest semantics). A dedicated spec extending this — auditable against WCAG AAA, screen-reader scripts, deeper keyboard-only flows — is parked until a build proves the floor thin.
- **Content patterns / copy recipes.** Recurring-surface copy shapes (the empty state, the error, the confirmation, the Brief's edge cases). Constrained today by `01`, `07`, and `06`; would be convenience, not necessity. Parked.
- **Command and keyboard.** The full Ctrl+K verb grammar and shortcut map. Described across `03` and the a11y floor; a dedicated spec would deepen it. Not blocking.

Three parked items are not three gaps. They are explicit deferrals with a trigger condition: a build that proves the current floor insufficient.

---

## Closing

The design system is the ten documents above, the four orthogonal axes underneath them, the canon they answer to, and the brand layer they inherit from but do not rewrite. It is small on purpose. Its job is to make every operator-facing surface in Antaeus read as one product, while the work each room does can still be different work, room to room.

This document is the front door. A cold session opens it and knows the map. A contributor opens it and knows the governance. A reader opens it and knows what is intentionally out of scope. When a sibling changes, this updates in the same pull request so the front door stays current and the system stays one system.

What is next is the Dashboard build — the first real proof the ten documents hold against shipping code, not just mockups.

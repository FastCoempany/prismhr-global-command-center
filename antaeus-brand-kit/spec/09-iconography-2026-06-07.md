# Antaeus Design System — Iconography

**Status:** DRAFT for founder review.
**Date:** 2026-06-07.
**Author:** Claude, working session with the founder (mrcoe7@gmail.com).
**Branch:** `claude/antaeus-gtmos-design-system`.
**Scope:** This is the ninth sibling document under the design system charter (`00-charter-2026-06-02.md`). It specifies the product's icon system end to end: the construction grid and keyline that give the set a proprietary look rather than a borrowed one, the signature elements that tie the icons to the four-system language, the semantic-only rule that keeps icons out of decoration, the color rationing that follows the canon's roles, the sizing, and the complete inventory — the sacred nouns, the operator's verbs, the system and status glyphs. The component library (`03` §4.6) stated the icon *discipline* and shipped a starter set; this spec is the full system the charter named as owed. The rendered set is the mockup at `deliverables/mockups/iconography-2026-06-07.html`; this document is the prose that makes it canon.

---

## 0. Why this exists

Icons are the easiest place in a product to look like every other product. The default line-icon libraries — round-capped, evenly weighted, friendly — are so widespread that adopting one tells the operator, before they read a word, that this is the same kind of tool as everything else. For a product whose entire positioning is that it is *not* the same kind of tool, a generic icon set quietly undercuts the claim, the same way the left nav rail did before we killed it.

The component library stated the discipline — thin glyphs, semantic only, accent where the thing is the accent — but a discipline is not a system. It does not say how the glyphs are constructed, what makes them recognizably Antaeus, which icons exist, or how the set holds together as a family. This spec is that system. It commits to a construction grid and a heavier flat-terminal keyline that read as technical drawing rather than friendly UI; two signature elements — the edge-rule and the rationed tick — that tie the icons to the gauge and the anchored edge; the semantic-only rule as a hard constraint; color that follows the canon's roles and rationing; and a complete inventory the rooms draw from. The full glyph set is owed because the rooms need real icons to build against; the discipline alone was enough to start, not enough to ship.

---

## Part I — What makes the set proprietary

### 1.1 The construction

Every icon is drawn on a **24px box with a 22px live area** (1px optical margin), on a visible construction grid. Strokes snap to the grid so verticals and horizontals stay crisp at the rendered size. The keyline is **2px** — heavier than the ubiquitous 1.5px line-icon weight — which reads as deliberate and instrument-like rather than delicate.

The terminals and joins are where the set stops looking generic: **flat (butt) terminals and mitered (sharp) joins**, never the round caps and round joins of the default libraries. A round-capped icon reads as soft and friendly; a flat-capped, mitered icon reads as drafted, technical, authored — the register the product holds everywhere else. This single construction choice is most of what makes an Antaeus icon recognizable across a room from a Feather or Heroicon.

Corners carry the product's modest radius (`03` §4.3) — minimal, not soft. Nothing in the icon set is rounded to be approachable. The geometry is ruler-and-compass: arcs are true arcs, angles are clean, and an icon that needs an organic curve is almost always an icon the product does not need.

### 1.2 The two signature elements

Two recurring elements tie the set to the four-system language so the icons feel like they came from the same place as the gauge and the anchored edge:

- **The edge-rule.** Where it is natural, an icon sits on or incorporates a single straight rule — a baseline the glyph rests on, a left rule down its side — echoing the anchored edge (the bottom rule on a card) and the gauge (the left rule). The account glyph rests on a baseline; the deal glyph carries a short left rule; the readiness glyph is built on a level line. The edge-rule is used where the semantics invite it, never forced onto every icon, and it is the quietest of the family resemblances.
- **The rationed tick.** A single short accent stroke — the "tick" — marks an icon's active point, and it is rationed exactly the way orange is rationed in the UI (`00` Part II §3). Most icons carry no tick. The operator's *verbs* — send, the one move — carry an **orange** tick at the point of action. The *signal* glyph carries a **blue** tick, because blue is the system-intelligence role. A status glyph carries its **state** color. The tick is never decorative; it is the icon's one accented point, following the same rule as every other accent in the product: it appears where the meaning is, once.

Together these are the proprietary tell: a severe navy technical glyph, flat-terminalled and grid-true, resting on or carrying an edge-rule, with at most one rationed tick at its active point.

### 1.3 Color

Default is **navy** (`--ink`), full keyline. An icon takes a role color only when the thing it names *is* that role (`03` §4.6, extended): the dominant-move verbs are orange, the signal and intelligence glyphs are blue, the status glyphs carry their state color (green/amber/red/navy per the gauge). Color is never spent to brighten a toolbar or differentiate icons for variety; an icon set where every glyph is a different color is a decoration set, which the charter rejects. Most of the inventory is navy; color is the exception, not the palette.

---

## Part II — The semantic rule

An icon holds its place only by standing for a **sacred noun**, a **verb the operator acts with**, or a **system or status meaning the operator needs** — and nothing else (`03` §4.6). There is no icon for decoration, no icon to soften a surface, no icon to fill a toolbar slot, no spot illustration, no filled or duotone variant for emphasis. The test is the charter's "does this hold its place" test (canon Part IV §5) applied to glyphs: if an icon does not map to a noun, a verb, or a real system meaning, it does not exist in the set.

Icons rarely travel alone. The product is text-forward — the voice carries the meaning, and the icon is a recognition aid beside the word, not a replacement for it. An icon-only control is the exception (the Ctrl+K key, a close X, a settings gear), and where it exists it carries an accessible name (`03` §4.9) so a screen reader hears the verb, not silence. The default is icon-beside-label; icon-alone is reserved for the handful of glyphs universal enough to stand without a word.

---

## Part III — The inventory

The complete set, organized by what each glyph stands for. The rendered glyphs are in the mockup; this is the canonical list of what exists, so a room that needs an icon finds it here rather than drawing a new one.

### 3.1 The sacred nouns

One glyph per object the system is built around (canon §2): **ICP**, **Focus**, **Account**, **Signal**, **Motion**, **Call**, **Deal**, **Proof**, **Advisor**, **Readiness**, **Handoff**. These are navy except Signal, which carries the blue intelligence tick. They are the most-reused glyphs in the product and the ones whose construction most needs to feel of-a-family, because they recur across every room.

### 3.2 The operator's verbs

One glyph per move the operator makes: **send**, **draft**, **carry** (the handoff move), **write up** (forge a proof), **ask** (deploy an advisor), **prep** (a call), **tighten** (sharpen an object), **add**, **dismiss**, **skip**, **find**, **open**, **edit**, **save**, **export**, **import**, **delete**. The dominant-move verbs — send, and whichever verb is the surface's one move — carry the orange tick; the rest are navy. These are the glyphs most likely to sit beside an action label.

### 3.3 System and wayfinding

The product's own surfaces and controls: **Ctrl+K** (the command key — rendered as the key, not a magnifier), **Wayfinder** (the trail mark), **Briefing**, **the gauge** (the state-rule mark itself, used in legends), **settings**, **back**, **close**, **expand / chevron**, **more**, **proposal** (the Phase F suggestion mark), **observation** (the week's-reads mark). These keep the system legible without leaning on generic UI iconography.

### 3.4 Status

The condition glyphs, each in its state color: **ready** (a check, green), **attention** (amber), **at risk** (red), **exec decision** (navy), **quiet / gone-silent** (a level line or clock, navy), **compounding** (an upward mark, green), **still weak** (navy). Status glyphs pair with the canon §10 state words; they never replace the word, because color and a glyph alone can fail an operator who needs the word (`03` §4.9 — never color alone).

---

## Part IV — Sizing and the contract

### 4.1 Sizing

Three sizes, drawn from the same 24px master so they stay crisp:

- **16px** — inline, beside a label in dense surfaces (a table cell, a Brief line).
- **20px** — the default, beside an action label or in a control (`03` §4.1 IconButton is a 34px square around a 20px glyph).
- **24px** — the master size, used in legends, empty-state marks, and section headers.

An icon never renders below 16px (it stops being legible) or scaled to an arbitrary size; it renders at one of the three. The 32px-minimum hit target (`03` §4.9) is separate from the glyph size — a 20px glyph still sits in a 34px target.

### 4.2 The contract

A glyph in the set declares: the **meaning** it stands for (a noun, a verb, or a system/status meaning — never decoration), its **default color** (navy, or a role color where the thing is the role), and whether it carries a **tick** (and in which color). A glyph that cannot name its meaning is decoration and is removed. New glyphs are added by founder-approved pull request the same way a new word is (`07` §5.1), because the inventory is canon and the construction is part of the brand.

### 4.3 What this spec does not decide

It does not decide animation of icons — icons do not animate (canon Part II §6, `08`); a glyph is still. It does not provide an illustration system, a logo or wordmark treatment (that is the brand layer, `00` Part II §2), or filled/duotone variants (the set is single-weight keyline only). And it does not re-decide the discipline in `03` §4.6; it builds the full system on top of it.

---

## Part V — Migration, citations, signals

### 5.1 Migration

The migrated rooms carry whatever ad-hoc glyphs their builds happened to use — in several cases generic library icons or unicode characters (`03` §4.6 noted the mockup's interim unicode). Migration replaces those with the inventory glyphs at the right size and color, as part of each room's component-library retrofit (`03` §5.1). The Dashboard is first; its Wayfinder, its read switch, its proposal and observation marks, and its status glyphs are the set's first real use. Rooms that used a generic icon library drop the dependency entirely.

### 5.2 Citations

Canon §2 (sacred nouns), §10 (state vocabulary), Part II §3 (color roles and rationing), Part II §6 (no icon animation), Part IV §5 (the does-this-hold-its-place test). Component library `03` §4.6 (the discipline this builds on), §4.1 (IconButton sizing), §4.9 (accessible names, never color alone, hit targets), §4.3 (radius). Lexicon `07` §2.2 (the gauge, the anchored edge — the elements the signature echoes).

### 5.3 Signals the spec is doing its job

1. **It does not look like anything else.** A stranger cannot place the icon set as Feather, Heroicons, or any default library; the flat terminals, the heavier keyline, and the edge-rule read as the product's own.
2. **Every glyph means something.** An audit can name each icon's noun, verb, or system meaning; none is decoration, none fills space.
3. **Color is rationed.** Most of the set is navy; color appears only where the thing is the role, and no surface uses icons as a color palette.
4. **The family resemblance holds.** The sacred-noun glyphs and the verb glyphs read as one set — same grid, same weight, same terminals — not a collection of glyphs from different hands.
5. **Icons support words, they don't replace them.** The product stays text-forward; icon-alone controls are the rare exception and all carry accessible names.

---

## Closing

An icon set is a small surface that carries a large signal: which kind of tool this is. A borrowed set says *the same kind as everything else*, which is the one thing Antaeus is not. This system gives the product its own glyphs — drafted rather than friendly, flat-terminalled and grid-true, resting on the same edge-rule the cards do, accented once and only where the meaning is, navy nearly everywhere. The set is complete because the rooms need real icons to build against, and semantic to the last glyph because an icon that does not stand for a noun, a verb, or a real system meaning is the decoration the whole product refuses.

With iconography specified, the design system has its full set of siblings under the charter: voice, density, component library, today surface, layout, surface patterns, lexicon, motion, and icons. The rendered set is the mockup; the system is canon.

# Antaeus Design System — Brand Identity

**Sibling:** 10 of the design system (00 charter; see README).
**Status:** LOCKED — rounds 1–2 decided by the founder 2026-06-12; this document is the geometry and usage record.
**Implementation:** `src/components/brand.tsx` (BrandMark + BrandLockup) · `public/favicon.svg` + PNG ladder · the WayfinderBar's home affordance.

---

## 1. The mark — the Grounded A

Antaeus drew his strength from contact with the earth; the product's whole claim is groundedness — the system that reads what's actually happening. The mark makes that literal: **a drafted capital A standing on a ground line that extends past its feet.** Flat terminals, mitered joins, the same construction as the icon set, so the mark and the glyphs read as one hand. The crossbar sits low, like a gauge reading.

Round 1 (2026-06-08 artifact, decided 2026-06-12): Direction A picked from five.
Round 2 (2026-06-12 artifact, decided same day): W2 weight · P2 proportions · no-bar favicon at 16 · the L1/L2 lockup pair.

## 2. Locked geometry

On a **48-unit viewBox**:

| Element | Path | Notes |
|---|---|---|
| Legs | `M14 38 L24 10 L34 38` | apex at (24,10); feet at y=38 |
| Crossbar | `M18.2 28 h11.6` | the gauge reading — low, at y=28 |
| Ground | `M2 38 h44` | the P2 long overhang — ground, not underline |

Stroke: navy `#0A1C40` (or `currentColor` in chrome), `stroke-linecap="butt"`, `stroke-linejoin="miter"`, no fill.

**Weight ladder (W2 ratio):** the stroke steps up as the mark gets smaller so it holds its blackness:

| Rendered size | Stroke (on the 48 viewBox) | Crossbar |
|---|---|---|
| Display (≥40px) | 3.2 | yes |
| 32px | 3.6 | yes |
| 24px | 4.0 | yes |
| 20px (Wayfinder) | 4.4 | yes |
| 16px (favicon) | 6.0 | **dropped** |

**The 16px rule:** three strokes don't survive a 16-pixel box. At 16 and below the mark is legs + ground only. It still reads as the Grounded A because **the ground line is the signature, not the bar.**

`BrandMark` (`src/components/brand.tsx`) encodes this ladder; consumers pass a size and the component picks the stroke and the bar.

## 3. Lockups

- **L1 — serif (landing + docs):** the mark beside "Antaeus" in DM Serif Display. The mark and the headline voice are the same voice.
- **L2 — caps (product chrome):** the mark beside "ANTAEUS" in Public Sans 700, letterspaced 0.22em. Implemented as `BrandLockup`; the WayfinderBar's home affordance carries it, with the name hidden under 720px viewports (the mark alone is the affordance on narrow screens).
- **Reversed:** white-on-navy L1 for legal/footer contexts only. The product field is bright; the dark exception is retired everywhere else.

## 4. Favicon files

Shipped in `public/` (Vite copies to the dist root; every entry HTML links them):

| File | Content |
|---|---|
| `favicon.svg` | the full mark, stroke 3.6 (the 32-weight) |
| `favicon-32.png` | full mark at 32 |
| `favicon-16.png` | **no-bar** mark at 16, stroke 6 |
| `apple-touch-icon.png` | mark on the opaque `#F5F7FB` field at 180, padded |

## 5. Usage rules

- The mark is navy or `currentColor`. It never takes an accent color — orange is the move, and the mark is not a move.
- The mark never rotates, skews, gains a container shape, or sits on a photo.
- One mark per surface: the Wayfinder carries it in-product; the landing hero carries L1. Nothing else needs it.
- The construction (terminals, joins, the ground overhang) is shared with the icon set (09); a change to one is a change to both — founder-approved, version-bumped.

## 6. The back half — now spec'd, build deferred

The brand pass's back half is closed as a *system*; what remains is the build, which waits for a reason to launch (we are building, not launching).

- The `visitor` voice register (decision #7) — **configured** in `src/lib/voice/family-temperatures.ts` (the eighth register). Its application to live public surfaces ships with the public-face refresh.
- The marketing visual system — **spec'd** in sibling `11-marketing-visual-system-2026-06-15.md`: how the mark + face extend to the landing / positioning / auth / legal / social / docs surfaces, against the Marcus-Reed visitor persona.
- L1 — **built** as `BrandLockupSerif` (`src/components/brand.tsx`). Its placement on the landing hero ships with the public-face refresh, not before it.

Brand identity is therefore complete as a system: the mark, its kit, the lockups, the favicons, the usage rules, and (via sibling 11) the language for the public face. The unbuilt piece is the public-face refresh build itself, deferred by design.

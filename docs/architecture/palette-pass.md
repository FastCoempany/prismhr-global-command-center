---
title: Palette Pass
status: 2026-10-08. Every color the app paints moved onto the brand's palette, and pinned.
owner: Founder
related_docs:
  - CLAUDE.md
  - antaeus-brand-kit/spec/10-brand-identity.md
  - docs/architecture/pass-11-browser.md
---

# Palette Pass

On 2026-10-08 the founder ordered: "run the palette pass." The design canon reads: "Ad-hoc per-mockup palettes of any kind. The palette is the brand's, always."

## 1. The palette

The brand's palette is `antaeus-brand-kit/css/tokens.css`:

- **The field and its surfaces:** #f5f7fb, #ffffff, #fafbfd, #eff2f7 and #fbfaf5.
- **Ink:** #0a1c40 and ink-700 #142949.
- **The five accents and their strong states:**
  - orange #e6701e (strong #d4661b)
  - blue #2563eb (strong #1d4ed8)
  - green #22c55e
  - amber #f59e0b
  - red #ef4444
- **Any of these at an alpha.**

Before this pass the stylesheets used 122 other colors, 245 times, in 12 files.

## 2. How each color moved

Each color moved by its role, never by its hue alone:

- **Blue-grey neutrals** (#5b6b86, #8ea3c7, #e6ebf3, #dfe6f2, #64748b and the like):
  - as words, they take ink at its opacity ladder (solid, .66, .42, .22);
  - as fills, the nearest surface token;
  - as edges, ink at the alpha that matches.
- **Darker navies** (#0e2450, #13275a, #0c2350) take ink-700, and near-black takes ink.
- **Light words on the navy panels** (the Sidekick sidebars, the presenter, the "say" box) take white at the same ladder (1, .66, .42).
- **Green, amber and orange states** take the brand accent as a tint and an edge, with ink words. This is the pattern the sheet's green took in pass 10, and the Sendbook's marks in pass 8.
  - The off-oranges carried caution, never the move, so they take amber. Orange stays the one move.
- **Red states** take the brand red.
- **Blue, sky and purple states** take the brand blue, the system's intelligence: the Salesforce links, the operator's own lane, the draft desk, the active stage. Hover states take the strong shade.
- **The fit tiers** were orange tints on every high-fit row. A fit score is the system's read, so it now wears blue.
- **The pale blue-grey "admin paper"** panels (#f6f9ff with #cdddf5 edges) are a costume the canon forbids. They take the brand's surface and ink's hair line.
- **The dashboard's stage ramp**, which nothing renders, moves from quiet ink through amber to green.

Every change, line by line, is in the PR.

## 3. What the browser found beside the palette

- **The LAST HUMAN TOUCH cell** had worn the browser's own grey button box since it became a door in pass 8. Its button paint is now reset, and it keeps its old face.
- **The climb's nodes and the sheet's score doors** wore the browser's black words. They now take ink.
- **Groundwork's sheet read colors no stylesheet defines** (--ink, --orange, --blue, --soft, --faint), so its gem chip, its intent chip and its cite marks fell back to inherited ink. They now read the brand's tokens. The gem chip takes blue: a gem is the account's own voice (C16), as THEIRS wears it on the HomeRoom.
- **The room's font names** (--f-mono, --f-serif, --f-sans) were defined only on the HomeRoom's frame. Every other page that used them lost its mono kickers to the inherited sans. They are now aliases of the brand's fonts in `config/design-tokens.css`, and the HomeRoom's own next/font variables still set them on its frame.
- **The browser harness** had defined those font names on every page, which masked the font bug. It now defines them only where the page does.
- **The arrival-budget ratchet** (A4.31) counted text lines by rounded height, so a few pixels of alignment read as a new line. It now counts the visible pieces of text a unit shows.

## 4. The pins

- **`tests/canon/standing-decrees.test.ts` › "the palette is the brand's, always (the design canon)"** reads three things:
  - every color in every stylesheet under `src`;
  - every color literal a component writes;
  - every color variable a sheet reads, which must resolve.
- **`tests/browser/palette.test.ts`** mounts nine faces. Every visible element's words, fill and drawn edges must compute to the brand's palette at some alpha, including colors a sheet mixes.

The Sidekick demo pages and the payroll demo are not mounted by the browser suite. They are held by the stylesheet pin, and their dark panels were checked by hand.

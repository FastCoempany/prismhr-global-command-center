# Antaeus Visual Identity Kit

A drop-in copy of the visual language only — colors, type, buttons, cards, chips,
inputs, icons, the brand mark, and motion. Nothing in here is tied to the product's
purpose; it's pure visual system. Use it on any app, any framework.

## The 30-second start (framework-agnostic)

1. Add the fonts — paste `fonts.html` into your `<head>`.
2. Include the two CSS files (order matters; `components.css` pulls in `motion.css` itself):
   ```html
   <link rel="stylesheet" href="css/tokens.css">
   <link rel="stylesheet" href="css/components.css">
   ```
3. Use the classes:
   ```html
   <button class="ds-btn ds-btn--accent">Primary move</button>
   <span class="ds-chip ds-chip--green">Ready</span>
   ```
That's the whole visual identity. Open **`preview.html`** in a browser to see it all.

## What's in here

| Path | What it is | Portable? |
|---|---|---|
| `css/tokens.css` | **The heart.** Every color, type size, space, radius, shadow, z-index, and motion timing as CSS variables (`--ds-*`). Change a brand by changing this file. | ✅ any framework |
| `css/components.css` | All component styling — buttons, cards, chips, inputs, alerts, drawers, the meter, layout helpers — consuming the tokens. | ✅ any framework |
| `css/motion.css` | The named motion vocabulary (durations, easings, keyframes). Imported by components.css. | ✅ any framework |
| `fonts.html` | The Google Fonts `<link>` (DM Serif Display · Public Sans · JetBrains Mono). | ✅ |
| `preview.html` | A self-contained page that renders swatches, buttons, chips, a card, type — open it to SEE the identity. | ✅ |
| `brand/favicon.svg` + PNGs | The "Grounded A" mark (favicon + apple-touch). | ✅ |
| `brand/brand.tsx` | The mark as a sizing-aware Preact component (the stroke-weight ladder). | Preact ref |
| `icons/` | 46-glyph icon set + a typed `<Icon name="…">` wrapper + manifest. Glyphs are inline SVG. | SVG portable; wrapper is Preact |
| `components-reference/` | The Preact components (Button, Card, StatusChip, WayfinderBar, …). **Reference only** — they show how the CSS classes compose. They import internal helpers, so they won't compile elsewhere as-is; the CSS is the portable layer. | Preact ref |
| `spec/` | The design-system spec docs — the deeper "why" (charter, component library, iconography, brand identity, motion, density, marketing system). | docs |

## The color system (semantic roles — this is the brand)

Defined in `tokens.css`. Every color carries ONE meaning; pick by role, never by hue.

| Token | Hex | Role |
|---|---|---|
| `--ds-ink` | `#0a1c40` | Navy. Ink / authority / structural text + headlines. |
| `--ds-orange` | `#e6701e` | The ONE dominant action per surface. Rationed — never decorative. |
| `--ds-blue` | `#2563eb` | System intelligence / secondary action / links. |
| `--ds-green` | `#22c55e` | Real health / ready / live (never a default "positive"). |
| `--ds-amber` | `#f59e0b` | Caution / needs sharpening. |
| `--ds-red` | `#ef4444` | Real risk / failure / destructive. |
| `--ds-field` | `#f5f7fb` | The bright base field (cool off-white). |
| `--ds-surface` | `#ffffff` | Card / panel surface. |

Rule the whole system runs on: **always lean bright.** Navy is ink on a bright field;
the only loud color is orange, used once per surface for the dominant move.

## Buttons

```html
<button class="ds-btn ds-btn--accent">The dominant move</button>      <!-- orange -->
<button class="ds-btn ds-btn--primary">Strong secondary</button>     <!-- blue -->
<button class="ds-btn ds-btn--secondary">Quiet action</button>       <!-- hairline -->
<button class="ds-btn ds-btn--ghost">Tertiary</button>               <!-- text only -->
```

## Type

- **DM Serif Display** — authored headlines (`--ds-type-display`, `--ds-type-title`).
- **Public Sans** — all UI, body, labels (`--ds-type-body`, `--ds-type-label`).
- **JetBrains Mono** — kickers / codes / meters only (`--ds-type-kicker`), letter-spaced uppercase.

## Icons + mark

- `icons/` — inline-SVG glyph set. In a non-Preact app, copy the SVG path data out of
  `icons/glyphs/*.tsx` (each is a tiny SVG), or reuse the `<Icon>` wrapper if you're on Preact/React.
- `brand/favicon.svg` is the mark; drop it straight in as your favicon.

## If you're NOT on Preact

You only need `css/` + `fonts.html` + `brand/favicon.svg` + the SVG paths from `icons/glyphs/`.
The `components-reference/` and `*.tsx` files are there to show intended composition, not to ship.

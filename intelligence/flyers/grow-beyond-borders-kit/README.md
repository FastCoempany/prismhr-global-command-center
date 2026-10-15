# Grow Beyond Borders: banner kit

A from-scratch vector rebuild of the "Help Your Clients Grow Beyond Borders" banner. Every element
is its own file, so you can pull any one out and use it somewhere else. Every layout is plain SVG,
so it scales to any size without going soft.

The original raster banners sit next to this folder:
`../PrismHR_Global_Webinar_Banner_Grow_Beyond_Borders.png` (with "Join today's webinar") and
`../PrismHR_Global_Banner_Grow_Beyond_Borders_No_Webinar.png` (without it).

## Ready-made sizes: `layouts/`

`layouts/svg/` holds the editable masters. `layouts/jpg/` holds exports at the exact pixel size each
platform asks for. `@2x` files are double resolution for sharp screens.

| File | Size | Use it for |
|---|---|---|
| `web-banner-3x1` | 1500×500 | Webinar or web banner, email header (scales down to 600×200 and 1200×400) |
| `web-hero-1920x640` | 1920×640 | Full-width website hero |
| `linkedin-banner-1584x396` | 1584×396 | LinkedIn company page or profile banner |
| `x-header-1500x500` | 1500×500 | X (Twitter) header |
| `leaderboard-728x90` | 728×90 | Display ad leaderboard |
| `link-preview-1200x628` | 1200×628 | Link preview image, LinkedIn post image |
| `slide-16x9-1920x1080` | 1920×1080 | Title slide, Zoom or Teams background, video title card |
| `social-square-1080` | 1080×1080 | Square social post |
| `social-portrait-1080x1350` | 1080×1350 | Portrait social post (4:5) |
| `story-1080x1920` | 1080×1920 | Story, reel, full-screen mobile |
| `display-300x250` | 300×250 | Display ad medium rectangle |

Each master SVG keeps its layers as named groups, back to front: `background`, `halftone`, `plexus`,
`globe` (with `globe-atmosphere`, `globe-sphere`, `globe-continents`, `globe-network`), `gbl-tile`,
`headline`. Open one in Illustrator, Figma or Inkscape and the layers come through by those names.

On a LinkedIn personal profile, the profile photo covers the lower left of the banner. The company
page banner has no overlap.

## Pieces: `components/`

`components/svg/` holds every element on its own, on a transparent background. `components/png/`
holds raster copies of the ones people reach for most.

| File | What it is |
|---|---|
| `globe.svg` | The whole globe: glow, sphere, dotted continents, network |
| `globe-no-network.svg` | Globe without the lines and nodes |
| `globe-continents.svg` | Sphere and dotted continents only |
| `globe-continents-only.svg` | Just the continent dots, no sphere |
| `globe-network-only.svg` | Just the lines, arcs, nodes and flares |
| `globe-atmosphere-only.svg` | Just the edge glow |
| `gbl-tile.svg` | The GBL tile with its rim and shadow |
| `headline-stacked.svg` | The headline on three lines, as outlines (no font needed) |
| `headline-one-line.svg` | The headline on one line, as outlines |
| `headline-live-text.svg` | The headline as editable text (needs Lato Bold installed) |
| `background.svg` | The navy-to-magenta field; it fills any frame without stretching |
| `halftone.svg` | The dot field that sits behind the headline |
| `plexus.svg` | The free line-and-node mesh |

All globe files share one frame (1240 units square, sphere centered, 960 units across), so the
globe pieces stack in perfect register when you layer them.

## Any other size: `responsive/`

`responsive/banner.html` is the banner as a web page. It fills its box and changes its layout to
suit the box's shape:

- 5:1 and wider: one line of text
- 2.2:1 to 5:1: banner
- 1.4:1 to 2.2:1: landscape
- 0.9:1 to 1.4:1: square
- 0.7:1 to 0.9:1: portrait
- narrower than 0.7:1: story

Open it and resize the window to watch each layout. `responsive/gallery.html` shows nine sizes on one
page. To put the banner in a site, copy the `.gbb` block from `banner.html` and link `gbb.css`. Each
layer is its own element, so you can hide or swap any one in CSS.

## Brand values

| Use | Value |
|---|---|
| Headline | Lato Bold (700), white `#FFFFFF`, line height 1.13 |
| Field, text side | `#08467F` → `#073059` → `#061F3A` |
| Field, globe side | `#2A1033` → `#57142B`, magenta glow `#A0285A` |
| Continents | `#A5EEFF` (left) → `#DCD6F7` → `#FF8DB6` (right) |
| Network | `#6FD8FF` → `#E8E4FF` → `#FF6FA0` |
| Halftone | `#3E86C9` |
| GBL tile | Face `#284C84`, rim `#E4EAF2` → `#6E7B8F`, from the PrismHR Global logo |

## Rebuilding

`source/build_kit.py` generates every SVG. It needs Python 3 with `numpy`, `scipy`, `fonttools` and
`uharfbuzz`, plus Lato Bold (point `GBB_LATO_BOLD` at the `.ttf`, or put it at
`source/fonts/Lato-Bold.ttf`). The coastlines come from the public-domain Natural Earth data
packaged as `world-atlas`, which the script downloads on first run. Change the headline in
`HEAD_LINES`, the sizes in `SIZES`, or the globe's view in `LON0, LAT0`, then run:

```
GBB_LATO_BOLD=/path/to/Lato-Bold.ttf python3 source/build_kit.py
```

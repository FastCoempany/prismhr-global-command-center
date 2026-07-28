# Command Center — session canon

## Design canon (binding, founder-decreed 2026-07-28)

### Mockups follow the Antaeus design system. No exceptions.

Every mockup, concept, or UI built in this repo uses the locked Antaeus brand
identity (`antaeus-brand-kit/spec/`, especially 00-charter, 03-component-library,
10-brand-identity):

- **Field:** bright `#F5F7FB`, one theme. The dark exception is retired.
- **Ink:** navy `#0A1C40` at the opacity ladder (solid / .66 / .42 / .22).
- **Accents by role, never by hue:** orange `#E6701E` is the ONE dominant move
  per surface and appears nowhere else; blue `#2563EB` system intelligence;
  green `#22C55E` real health; amber `#F59E0B` caution; red `#EF4444` real risk.
- **Type trio:** DM Serif Display (the authored read), Public Sans (the work),
  JetBrains Mono (kickers/timestamps, letterspaced uppercase, recessive).
- **Voice:** plain sentences a peer would say; state before explanation; object
  before controls; one dominant move per screen.
- The Grounded-A mark is navy or currentColor only, never an accent color.

### Forbidden mockup styles (the "typical Claude mockup" list)

The founder has permanently banned the default visual costumes produced on
2026-07-28 and anything in their family. Do not produce, in any mockup or
surface:

1. Pastel blue-grey "admin paper" chrome (`#f6f9ff` / `#cdddf5`-tinted panels,
   sky-800 buttons) presented as a design direction.
2. The dark navy "ops console" with amber/gold monospace accents (flight
   strips, comm logs, runway bars on `#0c1424`).
3. Warm greige/cream "editorial" panels with serif heroes and gold buttons.
4. Skeuomorphic stationery metaphors as identity: manila folders, rubber
   stamps, index cards, notebook ruling, Cornell margins, red margin rules,
   graph/blueprint drafting paper, drawn brackets/connectors.
5. Progress-wash "ribbon" rows (stage tint sweeping under content).
6. Ad-hoc per-mockup palettes of any kind. The palette is the brand's, always.

Distinctiveness between concepts must come from **structure and information
architecture**, not from costume changes.

## Other standing decrees

- The word "steps" never appears in operator-facing copy.
- Account names are plain links — no ↗ arrows or affordance glyphs.
- Threading badge reads exactly `MULTI`, colored by the semantic ladder
  (red 1 thread / amber 2 / green 3+).
- Edge tabs (Roundups · Check-ins) are thin AND inconspicuous — quiet ink,
  color on hover only. Names stay "Roundups" and "Check-ins"; never "Cadence".
- Money figures never appear in anything stored, rendered, or mocked
  (`redactMoney` doctrine).
- Ship pattern: branch `claude/prismhr-demo-guide-strategy-6h0oqg` → PR →
  Vercel CI green → squash merge = live production. Verify chain uses `&&`:
  prettier → tsc → eslint (0 warnings) → tsx tests → next build.

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

## The writing canon (binding, founder-decreed 2026-08-10)

Operator-facing copy — queue lines, buttons, nudges, empty states, generated
prose the operator reads — obeys these rules everywhere in the app:

1. **Imperative mood.** The app tells the operator to do the thing. Verbs,
   never noun-forms: "Send the model," not "model delivery is pending."
2. **Actions are for the day.** An action line never carries a deadline —
   "call the CSM before Friday" is banned. The action is today's; the date
   lives in the reason line: "Call the CSM." / "Renewal meeting Monday."
3. **The reason is the trigger, not a description** — a deadline, a promise
   made, an unanswered message, a date, a deliverable owed. Recency alone is
   never a reason.
4. **No hedging, no framing:** cut "it may be worth," "you might want to,"
   "consider," "worth a line?", "this account appears to."
5. **No em-dash asides, no parentheticals,** no sentence needing a second read.
6. **Top-level action and reason lines: six words or fewer.** Depth lives in
   the drilldown, never on arrival.
7. **Yesterday carries.** A move surfaced yesterday and left unworked returns
   today saying so. The room never quietly forgets what it asked for.

## The direct doctrine (Russ Jones, SVP of Sales — SKO, Kansas City, 2026-08-03/06)

The CSM gate is down. Sellers are greenlit to market, sell, and reach out
directly to the PEOs. Be careful, but do what it takes. In this app that means:

- Direct outreach to account people is the default move; routing through the
  CSM is a tool chosen when it is genuinely the fastest door, never a toll.
- "Ride it, never around it" copy is retired. A colleague's lane is one door
  of two.
- When a send crosses a hot, live CSM thread, the composed thing carries a
  quiet flag so the operator knows. It informs; it never blocks.

## Groundwork face (decided 2026-08-10)

The Stage won the triptych, and the **winged stage** won the variations
(2026-08-10): one account center stage with an action line and a reason line;
a left wing holding the day's worked stamps; a right wing holding the waiting
queue heat-mapped (solid amber burns today, half amber dated this week, quiet
ink keeps), each name with its trigger whispered beneath. The room keeps the
instrument capsule (Chicago clock · date · weather · the working band) and the
lower deck (the wire · the institutions · State of play). Groundwork is outbound only — activities the
operator initiates today to build pipeline; reactive account motion (replies
owed, decision windows, meeting prep) belongs to the HomeRoom. The accounts
page's stores and the deep-research notes (`research:<account>`) are backbone
inputs to the queue brain.

## The Chute (decided 2026-08-11)

The HomeRoom carries ONE intake at the top: the Chute. Files (.eml/.msg/.pdf/
text) thrown at it are read on the spot, routed to their account by the book's
own signals (known contact email > company domain > account name — pure rules,
no API needed), and filed through the same pipeline a paste takes, so the
intelligence in each file fans out app-wide: record entries, opened
commitments, gaps, playbook intel, outcomes, and every tab re-derives. Nothing
files blind: no sure match or a disputed read waits for the operator's pick.
The per-row Drop stays; the Chute is the throw-it-all-here door.

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

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
8. **"X-shaped" is retired** (founder-decreed 2026-08-19). "Shaping up to be
   EOR" is fine; a thing is never "EOR-shaped."
9. **The two-tier law.** Every account is a PEO, and a PEO's clients ARE its
   book — so "their client" can never be contrasted with "their own book."
   A need is either **internal** (the PEO's own) or **a client's**. Say
   "internal"; never "their own book."
10. **No property-talk about history.** "Their book is domestic-only" is
    retired; say it as plain history: "they've only done business
    domestically up to this point."

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
ink keeps), each name with its trigger whispered beneath. The instrument is
**the Klaxon** (triptych winner, 2026-08-11): the band's command and countdown
run the masthead — serif verb left, orange count right, a full-width burn bar
draining as the window empties, red and throbbing inside the last five
minutes; the capsule facts (Chicago clock · date · weather) ride the sub-row.
The room keeps the lower deck (the wire · the institutions · State of play). Groundwork is outbound only — activities the
operator initiates today to build pipeline; reactive account motion (replies
owed, decision windows, meeting prep) belongs to the HomeRoom. The accounts
page's stores and the deep-research notes (`research:<account>`) are backbone
inputs to the queue brain. The queue reads the board (2026-08-13): an account
whose deal sits at demo or later, or carries a Closed Won/Lost stamp, leaves
the queue entirely — Groundwork prospects the book it is NOT actively closing.
One rule holds at most two leading slots (its overflow sinks below other
rules), and the book-wide research stamp going stale is ONE move ("Run the
research pass.") carried by the strongest above-gate account, never a wall of
per-account clones. The record's live motion excludes too (2026-08-14): a
real inbound within 21 days, or a meeting/call/transcript filed within 14,
means the deal is being worked — the HomeRoom's job, whatever the lagging
board says. The operator's own outbound never excludes; the drumbeat rules
need it.

## The Chute (decided 2026-08-11)

The HomeRoom carries ONE intake at the top: the Chute. Files (.eml/.msg/.pdf/
.vtt call transcripts/text) thrown at it are read on the spot — VTT is the
richest capture and parses free in the browser to speaker-labeled lines headed
CALL TRANSCRIPT — routed to their account by the book's
own signals (known contact email > company domain > account name — pure rules,
no API needed), and filed through the same pipeline a paste takes, so the
intelligence in each file fans out app-wide: record entries, opened
commitments, gaps, playbook intel, outcomes, and every tab re-derives. Nothing
files blind: no sure match or a disputed read waits for the operator's pick.
The per-row Drop stays; the Chute is the throw-it-all-here door. The receipt
ledger survives a reload (per Chicago day; mid-flight reads come back as
"interrupted — drop it again"), and the paste pipeline refuses duplicates
app-wide: the same capture filed to the same account twice returns "Already on
file. Nothing filed twice." (pastehash markers; an undo clears its marker).

## The Scratchpaper (decided 2026-08-12)

The stash floater is retired — component, actions, and lib deleted. In its
seat on every page: the Scratchpaper, the Float (triptych winner). A ✎ button
bottom-right opens one running pad: write, Enter, the line lands date-and-time
stamped (Chicago), newest first under TODAY/YESTERDAY/dated kickers. One
durable store (`scratch:pad` namespaced notes — outside every account view and
the intranet mirror by construction). The pact: it stays there and only there;
nothing routes, nothing files, nothing becomes an action. The paper keeps
figures (amended 2026-08-21): because the pad routes nowhere by construction,
the money doctrine's boundary holds at the pad's edge — scratch lines are NOT
money-redacted; the ask door still redacts, because asks leave the paper.
Lines are editable in place (✎ on hover, decreed 2026-08-21): Enter keeps,
Escape puts it back, the timestamp and seat never move. ✕ is per line and
deliberate — and it archives,
never destroys (2026-08-19): the line moves to `scratch:gone`, readable under
the pad's STRUCK fold, restorable by ↺. Nothing on the paper ever dies.

## The Sendbook (triptych winner, decided 2026-08-19)

The outreach register lives at `/sendbook`, doored from Groundwork's page-foot
Tallyfoot line (`THIS WEEK · N WORKED · …`) — never in the top wayfinder. One
merged view (Ted doctrine), two doors in: the record's own outbound entries
(a Chute-dropped .eml IS the touch), and the **Channel Ask** — Groundwork's
Worked-it springs a chip row (EMAIL · CALL · VOICEMAIL · TEXT · LINKEDIN ·
INMAIL · ··· ENGAGED/CONNECT/VIDEO/EVENT/MAILER/INTRO/CSM RELAY) filing a
`sendbook:<account>` note; a second chip row asks who only when the book knows
more than one name. The **pre-answer rule**: an outbound the record already
holds today answers the ask before it opens — the app never asks what it can
read. Steps are counted, never asked: per run, reset by a 45-day quiet or by
the account speaking. Tapped touches are synthesized into the queue's drumbeat
clocks at read time, never written to the touch log. The wing's done-today
stamps carry subtext (`EMAIL · STEP 1 · CRISTINA B.`). Lanes by decree:
**NEVER MET means they have never replied and no meeting was ever held** —
the operator's own outbound never warms an account, and a CSM intro doesn't
either; prior warmth marks the line GONE COLD. Replies annotate from the
record only (↩ REPLIED); outcomes are never asked. The register tells what
happened; what is due next stays Groundwork's. The take-back: every stamp
carries a hover ↺ that returns the move to the queue and withdraws its tap —
the record's own entries are never unwritten; the chip rows carry ✕ to close
without filing. The wing never stamps mutely: no channel line means the
rule's own label speaks.

## The Spring (triptych winner, decided 2026-08-13)

The HomeRoom row's right panel runs on springs. Each register — UNKNOWN,
COMPARABLE (only when peers exist), TODAY — rests as ONE summary line: mono
kicker, live count, top entry trailing off, ⊕. Pressing ⊕ springs the register
out in place; ⊖ or a sibling's ⊕ folds it back — one register out at a time
per row. Filing or composing anything springs TODAY open so receipts never
land behind a fold. Attendant decrees, permanent:

- The court line is retired — the move already says who and when.
- The per-row icon keybar is retired; ONE legend lives at the page foot.
- Minimalist controls: "not this deal" is a hover-revealed ✕; "ask the brain"
  is ⌕; "mint sharper asks" is ⟳; "find the answer" is →; all tooltip-titled,
  never spelled out on the surface.
- The research control is a dated mono chip (`RESEARCH 7/2 ⟳`) reading the
  LATEST of both stores — the on-demand deep pass (research: notes) AND the
  book-wide sweep. "NEVER" only when neither has touched the account.
- Sheet lines are editable in place (✎ on hover): the visible text changes,
  tags and routing markers survive verbatim (roomTodoEdit).
- Concepts never ship; winners do. Triptychs are judged as downloadable
  documents (interactive when mechanics matter) — production only ever
  receives the decreed winner, and (founder-decreed 2026-08-19) mockup
  work NEVER ships without an explicit ship order — naming a winner or
  amending a face is judging, not shipping. Ask first, every time.

## The Ted doctrine (founder-decreed 2026-08-14)

Named for the day the room told the operator to chase Ted — a man the record
had never seen — because a July export seeded him as primary contact. The
rule, binding on every surface: **the record outranks every seed.** A static
store (book.json contacts, contacts.json roster, research.json sweep, digest
prose, the touch log, hand-written bullets, board-state maps) only ever
STANDS IN until the live record — filed communications, their actors, their
dates, dispositions, outcome stamps — speaks; the moment it speaks, the
surface reads the record first and the seed becomes the fallback. Derived
facts (who the relationship is, when we last touched, whether a reply is
owed, whether a deal is over, who said a thing) must read the WIDEST live
source the app holds, never a private narrow one; a fact's two stores merge
by latest, never by whichever the surface happened to import. An
unattributed document is never inbound; an auto-reply is machinery, never
the client writing. New surfaces are audited against this doctrine before
they ship.

## The click-depth law (founder-decreed 2026-08-20)

Every compression opens. A two-word term, a count, a theme, an abbreviation —
every shortened thing on every surface is a door to its evidence, exactly one
click deep. Nothing compressed is ever a dead end, and nothing deep ever
surfaces uninvited. Arrival budgets are hard limits; when budget and
intelligence conflict, the budget wins and the intelligence moves a click
down.

## The second record (founder-decreed 2026-08-20)

The weekly Salesforce activity export is a second record beside the
operator's own. It inherits every law of the first: the record outranks every
seed, machinery is never a person, money never renders, derived facts read
the widest merge of both records by latest. Blast receipts are intent, never
touches. A colleague's motion produces coordination moves; an account
person's motion produces outreach moves. Every gem cites the rows it stands
on or does not exist. The backbone lives in `src/lib/activity/` (SECOND-
RECORD-PLAN §3, blessed 2026-08-20): the browser tallies the blast 81% and
never uploads it, slices post in checksummed batches, an incomplete upload
refuses to run, and every run carries its three adversarial passes — coverage
(100% or the run marks itself failed), refutation (mechanical canon lint,
then an independent refuter that defaults to refute), and staleness/acted
(the first record kills the nag). Verdicts and every rendered count are
arithmetic from the rollup builder, never model text.

The faces were judged and shipped 2026-08-20 (winners decreed by the founder,
ship order "ship the picks for those 3 rooms and the second ring as well"):
**Groundwork — the Evidence Chips** (a mono chip row beneath the stage's
reason, each chip a door); **Accounts — three columns** (MODEL and PRISMHR
retire into the drilldown, + Dashboard is a hover glyph at the name, LAST
HUMAN TOUCH · THE SIGNAL · ACT take the width, the gem folds open beneath
the row); **HomeRoom — the THEIRS line** (one ochre mono line atop the
register panel; the move keeps its seat unconditionally). The second ring
shipped with them: the draft desk's one cited line, the Sendbook's org-wide
warmth (their voice warms whoever's inbox caught it; the operator's outbound
and CSM intros still never warm), the roundup brief's folded CSM prep, the
readout's arithmetic sentence, the Playbook's draft queue (approve by hand,
nothing auto-publishes), and the intranet digest (rollup + gems only —
staged bodies never enter the brain, guarded by test).

**The meat law (founder-decreed 2026-08-20, amends the click-depth law):**
every citation, theme, count, and case on every surface drills to row-level
meat — citation → cleaned email excerpt; support theme → case list → per-case
excerpt timeline — as many layers as the evidence holds. Excerpts are cleaned
of banners, quoted trails, signatures, and disclaimers (src/lib/activity/
excerpt.ts), money-redacted, and served only by the evidence route (a GET,
never a server action) — the one place staged bodies leave the store. Arrival
budgets never grow; the operator never goes back to Salesforce for detail the
export already carried.

**The vehicle rule (2026-08-20):** a queue rule that rides an account as a
vehicle for someone else's cadence (roundup-slot, the book-wide research
stamp) must prefer an account with no candidate of its own — a briefing slot
never swallows an account's own move.

## The Act Lane (Version C winner, decreed 2026-08-21)

The Accounts sheet works the act right there. The ACT column is the Move
Chip (Concept I): the gem's act as a fixed-edge chip, orange left tick,
source line whispered beneath, hover ✓ stamps acted (the gems store's own
actedDay — the acted sweep can re-stamp from the record any time it truly
speaks; every stamp carries ↺). Clicking the chip opens the Act Lane — a
sticky workbench beside the sheet: evidence up top (citations drill to
cleaned excerpts by the meat law), the editable draft mid (TO/SUBJECT/BODY
seeded from the relationship contact and the act), Send/File/fork at the
foot. Drafts SAVE (actdraft:<id> notes, one per account, money-redacted;
a touched draft saves on close or chip-hop — the pad never eats your
words; Send consumes it). Send files a real ✉ outbound to the record and
opens mail — the record then clears the nag itself. The fork files the
follow-up where it belongs, both meaning TODAY: a board account's move
lands as a HomeRoom action todo; an off-board account's as a seat:<id>
note Groundwork reads FIRST — rank 95, at most three seats lead
(SEAT_SLOT_CAP), a seat counts as the account's own move so no vehicle
rule swallows it, and it rides until worked, taken back, or the record
shows the outbound after it. Retired from the sheet the same day: the
Stage, Next-action, and Play columns (Play reads in the drilldown's meta
line), the filter rail (the Filter Door — one mono FILTERS ▾ at the
sheet's top-right shoulder, lit and named while a filter is live), the
Sort dropdown (column titles are the only sort), the header subtext, the
hot-signal bar, and the hover ⊞ (the dashboard door is plain words in the
drilldown). The count rides the Account column title; ⧉/⇩ ride the page
title; the search bar carries depth. The board lift holds app-wide: an
account on the dashboard is cleared with the CSM and touched — stored
state only ever advances the derived one (boardLift, loadCommand).

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

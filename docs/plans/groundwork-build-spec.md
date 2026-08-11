# Groundwork — build spec for the locked design

> **Superseded 2026-08-11: the winged stage.** The founder re-locked the
> face after the Stage won the one-thing triptych and the winged variation
> won the Stage round (CLAUDE.md, "Groundwork face"). One account center
> stage with an action line and a reason line; worked stamps in the left
> wing; the waiting queue heat-mapped in the right wing; the instrument
> capsule (Chicago clock · date · weather · the working band); the lower
> deck below. The room is outbound only — the reactive rules (decision
> window, reply owed, meeting prep) moved to the HomeRoom's brain, and
> wire-trigger, silence-bump, and cold-revival joined the outbound set.
> The deep-research notes (`research:<account>`) feed the queue and the
> file. The store-wiring guarantees below still bind; the layout sections
> describe the retired rail.

Status: **ready to build.** Written 2026-07-30, the day the founder locked
the shape: **the rail and the file, wire in the rail** —
`docs/mockups/groundwork-rail-file-triptych-2026-07-30.html`, option 1.
This spec exists to make one guarantee concrete: **every element on the
page pulls live intelligence from the stores the rest of the app already
writes** — nothing rendered here is hand-authored, cached stale, or
invented by the room. The room is a reader with opinions, not a second
database.

Companion documents: the plan (`groundwork-room-plan.md`) carries the
doctrine — language (§3), controls (§3.5), motions (§5), institutions
(§6), directives (§8), the readout (§9). This spec carries the wiring.

---

## 1. The locked layout, enumerated

One route, `/groundwork`, server-rendered per request (`force-dynamic`),
standard auth gate, the app's plain top bar (`Homeroom › Groundwork ·
date · clock`, Chicago). Two columns:

**The rail (left):**
R1 · the intent-due nudge (visible only when due)
R2 · time bands — Now · At 11:00 · After 2:00 — holding
R3 · the ranked queue rows, banded by what the operator is physically
doing in that window
R4 · Outside — the wire
R5 · the institutions card

**The file (right):**
F1 · kicker — account · partner manager · the sources that fed this file
F2 · title + story (single column, spanning)
F3 · the composed thing (draft / note / ask / recipe, spanning)
F4 · people chips
F5 · controls (§3.5 — copy / open / file, stamps as side effects)
F6 · the "To Russ" pull tab (recomposes on every request)
F7 · the file's history (very bottom, under a full-width rule)

---

## 2. The stores the room reads (its entire world)

Everything below already exists; the room adds two namespaces and zero
new tables in phase one.

| Store                                           | What it holds                                                                                                                                                       | Who writes it                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `AccountNote` (per account)                     | the corpus: every ⚡ paste read into dated entries (SF / Outlook / Teams / Sales Nav dialects), research bodies, manual notes                                       | HomeRoom's `roomPaste`, research passes, the operator               |
| `AccountNote` namespaces                        | `research:<id>` deep-research trail · `playbook:market` / `playbook:lessons` · `gaps:<id>` asks — plus NEW: `wire:<hash>` items · `inst:<slug>` institution records | research pass, absorb pipeline, the wire sweep, institution capture |
| `PartnerNote`                                   | per-partner-manager threads and reads                                                                                                                               | roundups, the operator                                              |
| `DashCard` + config                             | the deal board: stages, checklists, activation dates                                                                                                                | the operator, HomeRoom                                              |
| `Touch`                                         | every outreach thread with cadence, replies, logs, asks                                                                                                             | logTouch, roundups, follow-ups                                      |
| `Todo`                                          | actions and notes, some dated                                                                                                                                       | notetaker, absorb, the operator                                     |
| `TaskDone` / `AccountDisposition`               | done keys, mutes, hides — the namespaced KV                                                                                                                         | every room                                                          |
| `book.json` + `contacts.json` + `research.json` | identity, fit, tenancy (`cloud`), rosters, demand/evidence/countries                                                                                                | build-time data + the 7/24 SF export                                |
| Intranet (`IntranetDoc`/`Claim`/`Topic`)        | what the organization said — including parked `SALESNAV ACCOUNTS` snapshots until the intent drop ships                                                             | intranet capture                                                    |
| Static                                          | `hml-rules.yaml` prospect weights · discovery banks (relay lines) · scenario library · collateral canon · metro table (new, small)                                  | the repo                                                            |

Derivation functions already exported and reused as-is: `corpusFor` /
`extractDealIntel` (the corpus → chair, countries, timing, threads,
incumbent, last inbound/outbound), `getDemand` / `analyzePlay` /
`extractCountries` / `researchGeneratedAt`, `deskScore` /
`compositeScore`, `contactsFor` / `peopleFor`, `partitionFollowUps` /
`roundupDue`, `motionsFor`, `askNextFor`, `questionsFor` (relay lines),
`buildMorningBrief`'s rule-engine pattern, `runResearch` /
`diffFindings` (the wire's engine), `redactMoney`, `userDayKey` and the
Chicago clock helpers.

---

## 3. Element-by-element wiring

Each entry: **what it shows ← where every fact comes from · when it
changes · what it does when the store is empty.**

### R1 — the intent-due nudge

Shows one quiet line only when due. **Due** = the newest
`source: "salesnav"` entry across all AccountNotes is older than one
business day (weekend-aware, same helper as the brief's business-day
math), or none exists.
← newest salesnav-sourced note timestamp; the Capture-shelf grab and the
paste path are the only writers.
Changes: on every request. Fresh read → the element does not render at
all (the founder's rule: silence when done, a nudge only when due).
Click → the explainer drawer (static copy + a link to `/intake`).

### R2/R3 — the time-banded queue

**The bands** ← the Chicago clock (`userDayKey` + hour). Fixed windows:
sends until 11:00 · people 11:00–2:00 · research/filing after 2:00. The
band an item lands in comes from the _kind of move_ its rule composed —
a send, a person touch, or a session — not from a separate scheduler.
Past bands compress to their record lines (done stamps with times, from
`TaskDone.doneAt`).

**The ranking** — a pure rule engine (`src/lib/groundwork/day.ts`) in
the morning-brief pattern, one weighted rule per evidence type, deduped
by account, capped at 6 rows on screen with an honest "and N more"
count:

| Rule                         | ← evidence, exactly                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| decision-window (95)         | `extractDealIntel(corpusFor(id)).timing.dateIso` within 7 days                                                         |
| reply-owed (90)              | intel.lastInbound newer than lastOutbound on an account with an active DashCard node                                   |
| meeting-prep (85)            | a dated Todo/Touch follow-up inside 48h for the account                                                                |
| intent-warm (80)             | a salesnav signal ≤7 days old at High (decay: older readings rank as nothing)                                          |
| riding-lane (75)             | a CRM opportunity date on the account (from the pasted grab rows) within 14 days                                       |
| roundup-slot (70)            | `roundupDue(touch)` true for the account's partner manager AND the account is that roster's best fit (composite score) |
| stale-above-gate (65)        | `getDemand(id).demandScore ≥ 30` AND `researchGeneratedAt` > 21 days                                                   |
| stakeholder-gap (55)         | `contactCount(id) < 2` AND the account is in any active cycle                                                          |
| never-touched-incumbent (50) | `cloud` non-empty AND no Touch AND fitTier high                                                                        |

Tie-breaks, in order: composite score, then proximity (the metro table —
the founder's rule verbatim: proximity breaks ties, never sets
priority). The `aw` column (what's owed) is the rule's composed-thing
label; the worked stamp replaces it from `TaskDone`
(`groundwork:<userDayKey>:<moveKey>` → doneAt rendered as "✓ copied
9:41a").
Empty band: one line — "Nothing here until 2:00. The sends are done."

### R4 — the wire

← `wire:<urlhash>` AccountNotes written by the sweep
(`src/lib/groundwork/wire.ts`, built on the deep-research web-search
template): `{headline, source, url, at, keywords[], accountIds[], read}`
— the read composed at sweep time under §3 rules. Matching runs the
registry (`wire-keywords.ts`: category terms + the competitor superset
with its negation guard + all 150 account names derived from `peos` at
build + disambiguation qualifiers).
Order: account-matched first (chips name the accounts), then by recency;
3 on the rail, the rest behind "more".
Refresh: staleness check on room entry (>12h → sweep, behind the
availability gate like every AI feature) + a manual control. No
scheduler assumed.
Cross-links: an item whose accountIds intersect a queue row ALSO renders
in that account's file history (F7) and arms directive D5.
Empty (no key / sweep never run): the directional empty state — why the
wire matters, what unlocks it, one move ("run the first sweep").

### R5 — the institutions card

← `inst:<slug>` records (name, kind, rung, score, next event, captures).
Shows the next event within 7 days; otherwise the highest-rung
institution's next action.
Empty: "No institution on the calendar. The verification list starts
with the Global Chamber's Chicago chapter — run the pass."

### F1 — the file kicker

← book identity (`getPeo`) + the partner manager (`csm` field) + a
sources line the file builder emits: which stores actually fed this
file, with dates ("HomeRoom pastes 7/21 · research 7/02 · Sales Nav read
7/30 · the wire 7/30"). The sources line is computed, not decorative —
it lists only stores that contributed a fact, so it doubles as the
file's provenance audit.

### F2 — title + story

Composed per request by `src/lib/groundwork/file.ts` from:

- identity + tenancy ← book (`peos.cloud` → "on our platform");
- the origin event ← oldest inbound corpus doc (who came to us, when,
  via whom);
- the current state ← newest corpus doc + active DashCard nodes;
- the date that matters ← intel.timing (rendered per §3: date + what
  happens on it);
- the chair ← intel.chair, always translated to plain words;
- competitors ← research evidence + digest (genuinely-named only — the
  negation guard);
- the warm read ← salesnav signal if fresh.
  Every sentence through the §3 lint (bare dates, missing denominators,
  unintroduced names, banned list). `redactMoney` on everything. Story
  length: 60–110 words; the lint flags longer.

### F3 — the composed thing

One per file, chosen by the queue rule that put the account in front:

- **send-draft** ← template + intel (countries, names, the owed item) +
  collateral canon facts (never numbers);
- **relay note to a partner manager** ← the roster's best-fit accounts +
  relay lines from the discovery banks (`questionsFor`), addressed to
  the `csm` by name;
- **ride-along ask** ← the pasted CRM opportunity row (name + date) +
  the salesnav reading; addressed to the colleague the app can name — if
  a SF paste has named the opportunity owner, by name; otherwise the
  Salesforce deep link where the name is printed (§3.5's ownership
  rule);
- **research recipe** ← directive engine (D1–D7) with the persona-driven
  Relationship-explorer fields from the anatomy doc.
  Nothing sends itself; the composed thing exists to be copied or opened.

### F4 — people chips

← `peopleFor(notes, contacts)` — roster joined with note actors; the
partner manager chip always present (blue); a thread-width flag when the
conversation rides one person.

### F5 — controls

§3.5 exactly: copy (payload = the composed thing, addressed), open
(mailto compose via the existing pattern; SF deep links; the account's
Sales Nav page), file (confirm flows). Every successful action writes
the TaskDone key whose `doneAt` becomes the row stamp — the side-effect
rule. A control with no real payload does not render.

### F6 — the "To Russ" pull tab

← the **same builder as State of play §9** (`readout.ts`), filtered to
one account — one function, two surfaces, so the tab can never drift
from the full readout. Recomposes per request (the tab's "recomposes as
you work" is literal: the paragraph re-derives from the stores, so a
sent draft flips its closing clause on the next render). Lint on. The
full State of play stays one gesture away (drawer), fed by the identical
builder unfiltered.

### F7 — the file's history

← a merged, dated timeline: corpus docs (the glyph heads the paste
reader already writes) + touch log entries + research passes
(`research:` trail) + wire matches + salesnav signals — rendered oldest
to newest, capped at the last 8 with "the full record is on the account"
linking to `/accounts?focus=<id>`. Nothing is re-authored; these are the
stores' own lines.

---

## 4. What flows IN from around the app (and what never does)

- **HomeRoom** is the mouth of the corpus: every ⚡ paste (SF, Outlook,
  Teams, and mislanded Sales Nav snapshots labeled honestly by the SN
  dialect) becomes AccountNotes that F2/F7 and the intel extraction read
  on the next render. Groundwork never writes deal records — when a
  conversation becomes a board deal, HomeRoom works it and Groundwork's
  queue rule for it retires (the graduation is visible in the readout).
- **The Intranet** parks whole `SALESNAV ACCOUNTS` snapshots today; the
  intent drop (Phase 3) parses them — including retroactively — into
  dated per-account signals. The room reads intranet claims only through
  the wire's dig-deeper context; it never writes there.
- **The Capture page** installs the four grabs; the ▤ grab walks the
  whole Sales Nav list (scroll + paginate + dedupe) and returns the full
  118-row snapshot.
- **The Playbook** lends relay lines and scenario language to F3's
  composers; D7 listening files market facts back to it. Two-way, always
  by the operator's hand.
- **The board (DashCards)** drives commitments, stages, and graduation.
- **Pricing/collateral canon** feeds composers facts, never figures —
  `redactMoney` guards every string the room emits.
- **Never:** LinkedIn APIs, scrapers, schedulers (until the founder
  approves one), auto-sent anything, money figures, the word "steps."

---

## 5. Files, keys, and tests

**New code** (all pure except actions):
`src/app/groundwork/page.tsx` · `actions.ts` (requireWrite; sweep, done
stamps, confirms) · `src/lib/groundwork/day.ts` (bands + rules) ·
`file.ts` (F1–F7 composition) · `readout.ts` (§9 + per-account filter +
lint) · `wire.ts` + `wire-keywords.ts` · `directives.ts` ·
`institutions.ts` · `proximity.ts` (static metro table) ·
`compose.ts` (drafts/notes/asks).

**Keys:** done `groundwork:<userDayKey>:<moveKey>` (day-scoped) and
durable rungs/reads; mutes via AccountDisposition namespaces; wire
`wire:<urlhash>`; institutions `inst:<slug>`; signals as
salesnav-sourced AccountNotes.

**Tests** (tsx, `tests/groundwork.test.ts` + fixtures): every ranking
rule fires and orders correctly; band assignment by move kind; proximity
breaks ties only; intent decay at 7 days; the nudge renders only when
due (weekend-aware); wire dedupe + negation + account matching; the
lint catches each violation class; the per-account Russ paragraph equals
the full readout's paragraph for that account (one-builder guarantee);
UTC-evening day-key behavior; empty states for every element.

**Ship:** prettier → tsc → eslint (0 warnings) → tsx tests → next
build, `&&`-joined; branch → PR → Vercel green → squash.

**Build order inside phase one:** day.ts rules + the rail → file.ts +
compose.ts → readout.ts + the pull tab → wire.ts + the nudge →
institutions + proximity. Each lands behind the verify chain; the room
is usable from the first landing (rail alone is already a day).

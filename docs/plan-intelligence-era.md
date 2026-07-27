# The Intelligence Era — phased plan (7/27)

The standing constraint that shapes everything: **no SF API, no admin, no IT
exceptions — ever.** All Salesforce context enters through the human-in-the-loop
pipes that already work: the ⚡ bookmarklet / paste (Intake), report drops
(PDF/XLS), and CSV exports. The second constraint: **the app can't run an LLM**
— "intelligence" is therefore built three ways:

1. **Intel libraries** — curated knowledge shipped as code (question banks,
   battlecards, extraction lexicons), distilled by Claude in-session from the
   intelligence files and kept current the same way.
2. **Deterministic extractors** — pure functions that mine every store the app
   already has (account notes, partner notes, filed SF activities, sheet notes,
   touch logs) for countries, headcounts, products, MPEX mentions, timing,
   and thread breadth.
3. **The research loop** — where real thinking is needed, the app generates a
   fully-contextualized prompt (copy button + open claude.ai) and the answer
   comes back through Intake/notes. Claude is the research arm; the app is the
   cockpit.

---

## Phase 0 — Ingest the intelligence files *(blocked on file upload; everything else proceeds in parallel)*

The 874MB release asset can't be downloaded from this environment (GitHub
release-asset access is blocked for the session; only code/PR/API access
works). **Needed as direct chat uploads:** the payroll call transcript(s), the
demo transcript (the video itself is unwatchable here — its transcript is the
usable artifact), and the email exports.

What happens on arrival:
- Distill into `src/lib/intel/`:
  - `discovery.ts` — the universal payroll discovery question bank
    (country-agnostic by design; parameterized by `{countries}` at render).
    Shape: `{ id, phase: intro|discovery|demo|proposal, audience: exec|payroll-ops|partner, question, why, listenFor[], followUp, drumLine }`.
  - `lexicon.ts` — extraction vocabulary: product terms (global payroll /
    EOR / contractor-only / MPEX), headcount patterns, timing phrases,
    competitor names, multithreading cues.
  - `motions.ts` — stage+signal → suggested next motion mappings.
- Email messaging patterns feed both the question bank and the drum-up
  language fields.
- Intake gains a `transcript` paste kind so future call/demo transcripts file
  per-account without a release-asset dance.

## Phase 1 — Deal Intel engine (extraction)

`src/lib/intel/extract.ts` — pure, tested: given one account's full corpus
(chip notes, partner notes, filed ✉ SF activities, routed sheet notes, touch
log), emit:

```
DealIntel {
  countries[] (→ flags), headcounts[{n, country?}],
  products[] (payroll | eor | contractor | mpex-mentioned),
  direction { line, confidence },       // likely product line
  timing { signal, quote },             // stated or inferred urgency
  threads { contacts-seen[], breadth }, // multithreading measure
  lastInbound / lastOutbound
}
```

Derived at render, never stored — always as fresh as the latest paste. The
bookmarklet is the freshness pump: the more timelines filed, the smarter every
surface gets.

## Phase 2 — Dashboard becomes intel-aware

- **Deal intel strip** on every card's expanded view: flags, EE counts,
  product direction, timing, thread breadth — each item titled with its source
  snippet.
- **Suggested checkboxes:** evidence → specific node items ("demo delivered"
  seen in an email → suggest that Demo item). Rendered as amber "suggested ✓"
  chips with one-click **Confirm** (writes the real check) and dismiss. Not
  auto-checked — evidence can lie; confirming is one click. (A later
  "auto-apply high-confidence" toggle is possible once trust is earned.)
- **Context box → "Live context":** auto-assembled, dated, non-duplicative —
  the latest activity, the newest note, the open ask, what changed since the
  stage went active. The manual box shrinks to one judgment line ("why this
  stage is where it is"). Candidate ideas to pick from:
  (a) change-since-last-open diffs, (b) stage-entry snapshot stamps,
  (c) auto-context + judgment-line split (recommended).
- **UI shrink:** retire "N/M done — all checked lights the stage"; brief
  checklist labels (full text on hover); per-stage mini progress dots always
  visible on the card, panel still collapsible; retire the NEXT box; ↑↓ →
  drag-to-reorder (server reindex contract already fits); Rename/Archive/
  Delete → quiet icons (✎ ⬒ ✕).

## Phase 3 — The Today tab thinks every morning

A server-computed **"This morning"** brief leading "Today's notes and
actions": per live deal — the recommended motion (from `motions.ts` + intel),
the next discovery question to ask and to whom, confirmable stage checkboxes,
stalest thread, multithread gaps ("one contact deep at ESC — add payroll ops"),
plus the existing cadence dues. Every row carries its do-it control: draft
link, pre-filled SF log call, copy-prompt, or confirm-check. Deterministic
assembly — the "thinking" quality lives in the intel libraries and rises as
they're enriched.

## Phase 4 — Discovery battlecard + drum-up language system

- **"Ask next"** (3 questions max) inside the account popover and dashboard
  card — chosen by stage + intel gaps (unknown countries → entity questions;
  no payroll-ops contact → multithread question; timing unknown → timing
  question).
- **Full battlecard** page/panel: the whole bank, filterable by phase and
  audience, `{countries}` merged in from intel.
- Doctrine point #3 ("what language drums up the intent") becomes a
  first-class `drumLine` on every question and on partner asks — the
  gauge/drum-up/campaign line to actually say, in the roundup voice rules
  (direct questions, no preamble).
- **Research loop:** when the app detects a gap worth researching (new
  country, unknown competitor, unusual model), it renders a 📋 "Copy research
  prompt" (fully contextualized) + an open-claude.ai link; findings come back
  via paste. No unattended automation.

## Phase 5 — Tab consolidation

- **Accounts absorbs Book** (the 11-feature delta: stage model, approach
  gate, intent, blended priority, next action + date, PeoState notes,
  activity log, plays/campaign kits, CSM grouping, and the 3 missing
  filters), then **Book retires** (redirect).
- Accounts top bar: partner rollup chips row consolidates into the existing
  **CSM pick list**; **"On PrismHR only" checkbox removed entirely**.
- **One "Demos" nav entry** — a small picker (Demo Sidekick / v3 / Payroll
  Demo) replaces three nav links.

## Phase 6 — Intake repurposed: Global Payroll Intake Form

- Primary mode modeled on the MS Form (14 fields: Service Provider, Billing
  Method, SMB, HCM Platform, Country, EE count, Visa, Comp Type, Frequency,
  Current System, Industry/Titles, Functionality, GBC name, Misc), **pre-filled
  from the selected account's DealIntel**.
- Honest boundary: forms.office.com has no supported URL-prefill. The click
  path is: ⚡ **Fill form** bookmarklet (same trick as the SF grab, reversed —
  it writes the values into the form page you're viewing), with per-field and
  copy-all fallbacks + the Open form button.
- The SF-timeline paste mode stays as Intake's second tab.

## Phase 7 — Narrative & capture + Look-into, reimagined

- **Narrative** becomes the weekly brief generator built from *actual* deal
  events (stages moved, filed activities, partner quotes, blockers) — the
  Russ/Aleks-ready copyable narrative. Capture (gap/voice/ask) stays and
  feeds Look-into.
- **Look-into** drops the hand-curated static list; items are born live from
  research-gap suggestions, capture-box asks, and intel contradictions.
  Recommendation: fold it into Today as a compact band (badge moves with it)
  and retire the tab — a separate tab must earn heavyweight value, and its
  content belongs where the day is run.

---

### Sequencing

| Order | What | Why first |
|---|---|---|
| A (now) | Phase 2 UI shrink + card controls + Phase 5 consolidation | Zero dependencies, immediate daily relief |
| B (on upload) | Phase 0 → 1 → 2 intel strip + suggested checks | The engine everything else feeds on |
| C | Phase 3 morning brief → Phase 4 battlecard | Needs 0–2 |
| D | Phase 6 intake form → Phase 7 narrative/look-into | Independent, polish |

Ship pattern per batch unchanged: PR → CI → squash → live.

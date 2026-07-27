# The Intelligence Era — phased plan v2 (7/27, rebuilt after full corpus ingestion)

v1 of this plan was written before the intelligence files were readable. This
version is grounded in the actual corpus: 24 email threads + the Advocate Pay
demo transcript (197 turns) + the 7/21 Chassie meeting notes, all living in
`intelligence/` on main — which is now the permanent pipe (commit files there;
the app's analyst reads them directly; no releases, no uploads).

## Standing constraints (unchanged, load-bearing)

1. **No SF API — ever.** No admin access, no IT exceptions. SF context enters
   only through human-in-the-loop pipes: the ⚡ bookmarklet / Intake paste
   (the surest, most current path, even with a bit of manual work), report
   drops, and files committed to `intelligence/`.
2. **The app runs no LLM.** Its intelligence = (a) curated intel libraries
   shipped as code, distilled in-session from the corpus; (b) deterministic
   extractors over every store the app already holds; (c) the research loop —
   copy-prompt out to Claude, paste findings back.
3. **Confidentiality rails.** Internal pricing stack never appears in any
   client-facing generated copy. Deposit/escrow amounts and client quotes stay
   in raw intelligence files only — extractors must never surface dollar
   figures into UI text that could be copy-pasted outward.

## What the corpus actually contains (drives everything below)

| Source | Deal | Load-bearing facts |
|---|---|---|
| Demo transcript 7/7 + Advocate threads 7/15–7/26 | **Advocate Pay → SubcontractorHub** | ~25 intl contractors paid by individual wires (Bulgaria, India, PH, MX, ZA, UK); CEO Justin: Bulgaria → EOR for **IP protection**; accounting (Nate/Renee): wire fees + ops relief; G-P failed them via TriNet; classification gray zone; 2-week best-case onboarding **with government/notice-period caveats Bryce insisted on**; Sept 1 target; reseller → **referral flip** (7/20–21), deposit reinstated, referral agreement + MSSA sent; SR/implementation chatter beginning |
| ESC threads 7/16–7/21 + MPEX licensing memo | **ESC (two tracks)** | Track A (Hatton): 300-EE Ontario client → **MPEX licensing** structure (Aleks → Rick Torrence: 2 Canadian entities, 4–5 companies/yr growth, employees-first + some contractor interest, TLM unknown). Track B (Rachael Brown): separate prospect, ~25 EEs Ontario of ~120, time-sensitive. **Russ Jones is personally scheduling** with Rachael + Hatton |
| Chassie notes 7/21 + Simploy threads | **Simploy** | 2 India contractors → reclassify; **Aug 6** leadership deadline (direction, not implementation); prefers **resale** over referral (wants to stay in the client relationship); demo Tue/Wed 7/28–29 with Katie (+ possibly CEO Carson); open items: calendar options, recruitment-specialist intro |
| XCEL thread 7/1–**7/27** | **XCEL HR (Mexico)** | Bill Laffey wants a call **this week** (Wed or Fri) — how the relationship + pricing works for an existing client/partner; short-term opportunity |
| Infiniti thread 7/8 | **Infiniti / Nextep / Genesis / eEmployers** | The partner-read ask pattern (G-P consolidation angle, renewal timing as the trigger) |

## The recurring deal shape (what makes the battlecard universal)

Every thread rhymes, regardless of country: someone is paying international
people the wrong way (wires, misclassified contractors, a competitor EOR),
a **specific risk or deadline** makes it urgent (IP, compliance, a client
decision date), the buyer splits into an **executive lens** (risk/IP/strategy)
and an **operator lens** (fees/effort/mechanics), and the commercial decision
is **which chair the partner sits in** (resale vs referral — Chassie wants in,
Bryce wanted out) plus **which product tier** (EOR / contractor / contractor-
plus / MPEX licensing). Countries are parameters, not the problem. That is
the battlecard's spine.

---

## Phase 0 — Distill the corpus into `src/lib/intel/` *(build first)*

- **`discovery.ts` — the universal question bank.** Country-agnostic;
  `{countries}` merged at render. Categories, each seeded from observed
  moments in the corpus:
  1. *Footprint* — where are the people; employees or contractors; who pays
     them today and how (wires? platform? local entity?).
  2. *Classification reality* — direction/control, indefinite work,
     "borderline employees" (Nate's own words); notice periods and whether
     "contractors" are actually someone else's employees (Shane's Bulgaria
     question); nationality vs residence (the Bulgarian in Spain).
  3. *Risk driver* — what makes this urgent: IP protection, compliance
     exposure, wage scraping, permanent-establishment signals from wires.
  4. *Incumbent* — who's there now (G-P, Deel…), what broke (integration,
     cost, service), renewal timing.
  5. *Money mechanics* — wire fees per payment, conversion fees the workers
     eat, invoicing preference, payment frequency flexibility (wallet).
  6. *Timing + decision* — the stated date and the REAL date behind it
     (Aug 6 = leadership review, not go-live); who decides; exec vs operator
     split; who else needs to be in the room.
  7. *Commercial chair* — resale (partner contracts + marks up) vs referral
     (Prism contracts direct + partner earns fee); deposit/credit
     implications of each; which the partner's identity needs.
  8. *Platform + scope* — which HCM (PrismHR / HCM / Execupay); TLM /
     expense needs; MPEX licensing when the partner wants to OPERATE payroll
     rather than buy a service.
  Question shape: `{ id, category, phase, audience: exec|ops|partner,
  question, why, listenFor[], followUp, drumLine }`.
- **`lexicon.ts` — extraction vocabulary**, seeded from real text: country
  names/adjectives (Bulgarian, Ontario…); EE-count patterns ("300 ee",
  "~25 employees", "2 independent contractors"); products (EOR, employer of
  record, contractor, contractor plus, agent of record, MPEX, licensing,
  wallet, TLM); commercial terms (reseller, referral, wholesale, markup,
  deposit, escrow); incumbents (G-P/GP/Globalization Partners, Deel, TriNet);
  urgency phrases ("time-sensitive", "deadline", "by August", "leadership
  team", "quarterly review").
- **`motions.ts` — stage+signal → next motion** with the drum-up line
  attached (doctrine point #3 made executable): for each stage, what to say
  to gauge / drum up / campaign — written in the roundup voice (direct
  question, no preamble).
- **`digest.ts`** — the per-account distilled state of the corpus deals
  (Advocate/SubcontractorHub, ESC×2, Simploy, XCEL, Infiniti set), dated, so
  surfaces have day-one intelligence before any new pastes arrive.
- Tests over real snippets from the corpus.

## Phase 1 — Deal Intel engine

`extract.ts` — pure + tested: given an account's full corpus (chip notes,
partner notes, filed ✉ activities, sheet notes, touch log, `digest.ts`), emit
`DealIntel`: countries→flags, headcounts, products touched (payroll / EOR /
contractor / **mpex**), likely direction + confidence, timing signal + the
real deadline, thread breadth (distinct people seen; exec-vs-ops coverage),
commercial-chair status (resale/referral/undecided), incumbent. Derived at
render — freshness = your latest paste. Never emits dollar figures.

## Phase 2 — Dashboard becomes intel-aware

- **Deal intel strip** per card: flags · EEs · products · direction · timing
  · thread coverage ("exec ✓ ops ✓ partner ✓" — the SubcontractorHub call
  proved why: Justin and Nate wanted different things), each item sourced.
- **Suggested checkboxes** (evidence → node item, amber "suggested ✓" +
  one-click Confirm / dismiss). Real examples the engine must catch:
  referral agreement + MSSA sent → Contract items; demo transcript filed →
  "Demo delivered + recap sent"; pricing email → Proposal items. Not
  auto-checked until trust is earned.
- **"Live context" replaces the context box:** auto-assembled and dated —
  latest activity, open ask, what changed since the stage went active —
  deliberately non-duplicative of notes surfaces. Manual box shrinks to one
  judgment line. (Chosen idea: auto-context + judgment split; runners-up
  noted: change-since-last-open diffs, stage-entry snapshots.)
- **UI shrink:** "N/M done — all checked lights the stage" retired; brief
  checklist labels (full text on hover); per-stage mini progress dots always
  visible, panel still collapsible; **NEXT box retired**; ↑↓ → drag-reorder
  (server reindex contract already fits); Rename/Archive/Delete → quiet
  icons (✎ ⬒ ✕).

## Phase 3 — Today thinks every morning

"**This morning**" brief leading the notes-and-actions section, assembled
deterministically from DealIntel + motions + cadence. The kind of rows it
must produce (all real, from this corpus): *"Bill Laffey asked for Wed or
Fri — send times"* · *"Chassie demo is this week — calendar options not yet
sent; recruitment-specialist intro still owed"* · *"SubcontractorHub
contracts out for signature — chase state?"* · *"ESC: Hatton owes MPEX
scope; Rachael waiting on booking — Russ is in the thread"* · plus
confirmable stage checks and multithread gaps ("no ops contact at X — the
exec lens alone stalls deals"). Every row carries its do-it control: draft
link, pre-filled SF log, copy-prompt, confirm-check.

## Phase 4 — Discovery battlecard + drum-up system

- **"Ask next"** (≤3 questions) in the account popover + dashboard card,
  chosen by stage + intel gaps (country unknown → footprint; deadline
  unknown → timing; one-thread deal → multithread; partner chair undecided
  → commercial).
- **Full battlecard** filterable by category/phase/audience, `{countries}`
  merged in.
- **drumLine everywhere** — every question and partner ask carries the
  gauge/drum-up/campaign sentence in the roundup voice.
- **Research loop:** gap detected (new country's statutory quirks, unknown
  incumbent, MPEX licensing precedent) → 📋 Copy research prompt (fully
  contextualized) + open claude.ai; findings paste back through Intake.
  (A button that lands in a specific live session isn't technically
  possible; copy-prompt + paste-back is the honest loop.)

## Phase 5 — Tab consolidation

- **Accounts absorbs Book's 11 unique features** (stage model, approach
  gate, intent, blended priority, next action + date, PeoState notes,
  activity log, plays/kits, CSM grouping, 3 filters) → **Book retires**
  (redirect).
- Accounts top bar: partner chips consolidate into the **CSM pick list**;
  **"On PrismHR only" checkbox deleted**.
- **One "Demos" nav entry** with a three-way picker (Demo Sidekick / v3 /
  Payroll Demo) replaces three links.

## Phase 6 — Intake repurposed: Global Payroll Intake Form

- In-app form mirroring the MS Form exactly — 14 fields with its real
  options: Service Provider · Billing Method (**Reseller — wholesale to
  resell / Referral — list price, we sell direct** — note this is the same
  resale-vs-referral fork the battlecard probes) · SMB name · HCM Platform
  (HCM / PrismHR / Execupay) · Country · # EEs · Visa needs · Comp Type
  (Hourly/Salary) · Frequency · Current System (EOR? in-country provider?)
  · Industry/Titles · Functionality (Time and Labor / Expense Mgmt / Other)
  · GBC Requested Name (default: Antaeus Coe) · Misc.
- **Pre-filled from the selected account's DealIntel** — for Simploy today
  it would arrive with India, 2 EEs, contractor→EOR, PrismHR platform
  already chosen.
- MS Forms has no URL-prefill: ship the ⚡ **Fill form** bookmarklet (writes
  the prepared answers into the form page you're viewing) + per-field and
  copy-all fallbacks + Open form button.
- SF-timeline paste stays as Intake's second tab; add a `transcript` paste
  kind (the Chassie-notes format files straight to an account).

## Phase 7 — Narrative & Look-into reimagined

- **Narrative → the weekly brief generator** from actual deal events —
  stages moved, activities filed, partner quotes, blockers — the
  Russ/Aleks-ready copyable narrative (there is now real activity to
  narrate: contracts out, two ESC tracks, Aug 6 clock). Capture
  (gap/voice/ask) stays and feeds Look-into.
- **Look-into**: static list retired; items born live from research gaps,
  capture asks, and intel contradictions; **folded into Today as a compact
  band** (badge moves with it), tab retired — a separate tab hasn't earned
  its click when the whole day runs on Today.

---

## Sequencing

| Batch | Ships | Depends on |
|---|---|---|
| **1** | Phase 0 intel libraries + digest + tests | corpus (done) |
| **2** | Phase 1 extractor + Phase 2 dashboard (intel strip, suggested checks, live context, UI shrink, drag-reorder, icon controls) | 1 |
| **3** | Phase 3 morning brief | 2 |
| **4** | Phase 4 battlecard + drum-up + research loop | 1 |
| **5** | Phase 5 consolidation (independent — can ship anytime) | — |
| **6** | Phase 6 intake form + fill bookmarklet | 1 (for prefill) |
| **7** | Phase 7 narrative + look-into | 2–3 |

Ship pattern per batch unchanged: PR → CI → squash → live production.

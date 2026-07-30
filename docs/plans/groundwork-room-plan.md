# Groundwork — the prospecting room. Plan.

Status: **planned, not built.** Written 2026-07-30 from the founder's brief, on
top of a full read of the book, the research corpus, the intelligence emails,
the product canon, the playbook, and the design system. This document is the
agreed shape before any code exists.

Working name: **Groundwork** — plain word, a peer would say it ("doing the
groundwork"), and it is literally what pipeline building is. Route
`/groundwork`. Alternates considered and parked: First Light, The Field, The
Front. Founder renames at will; nothing below depends on the name.

---

## 1. What this room is

Groundwork is where the operator's **pre-pipeline** day runs. HomeRoom works
the deals that exist; Groundwork builds the deals that don't exist yet. It
opens at 9:00 Central knowing what the operator should do, where, what to
research, who to research, and why — every claim traceable to the book, the
research corpus, the deal record, or an outside signal.

It carries five obligations:

1. **Run the day from 9:00** — time-aware blocks, reordering as the clock moves.
2. **State of play** — a self-updating strategic readout the operator can read
   to Russ at any moment, covering real pipeline-building activity across the
   whole app, not a task log.
3. **Outside signals** — a news wire watching the EOR/PEO world and every
   account in the book, one click from a deep dive.
4. **Per-account awareness** — every account rendered with its research,
   demand, play, stakeholders, and next motion, live from the same stores the
   Accounts page reads.
5. **Sales Navigator intake** — a paste-first lane that turns LinkedIn Sales
   Navigator material into filed intelligence.

What it is NOT: an outreach sequencer (doctrine forbids it — anything that
leaves the building goes out behind a human click, `docs/automation-map.md`),
a CRM mirror, or a second HomeRoom. Deals that reach the board stay worked in
HomeRoom; Groundwork hands them off and keeps hunting.

---

## 2. The situation the room is built for (what the app knows)

Two months in, inaugural team — the operator and Shane Jacobs as the GBCs,
Russ Jones (VP of Sales, PrismHR) now managing, Aleks Boruk (SVP CS & Client
Growth) running the Global motion day-to-day since the founding VP of Sales
for Global left pre-launch. The app's own record supports Russ's "not ready
for a marketing campaign" call, precisely:

- **Contracting mechanics are young.** SF/CPQ contracting came online ~7/10
  with a second training still owed; PEO-direct billing is "mechanics still
  TBD ⚠"; Deana Morgan (RevOps) annotated the first live contract "this deal
  is being worked prior to the overall Global product and processes finalized."
- **Pricing accessibility is partial.** EOR has a tiered price book;
  Contractor/COR has rates; Global Payroll has **no list rates at all** — every
  country is individually priced through Anthony Falzone with Aleks copied.
  There is no packaged pricing a partner can quote without coming back to us —
  a named enablement gap.
- **Rules of engagement are not yet canon.** Whether a GBC may contact a PEO's
  client directly — and when, and who must be copied — is explicitly unsettled
  (`docs/product/prismhr-global-codex-canon.md` Part 2 §4). On a referral deal
  we sell and paper the client directly, which makes the question live on
  every referral-shaped opportunity. The app's standing gates (NEEDS_CSM →
  CHANNEL_OK → DIRECT_OK) are the operating answer until doctrine lands.

Consequence for prospecting: the motions below are all **channel-first,
permission-gated, enablement-heavy**. That is not a limitation of the room —
it is the strategy the app's own evidence recommends while the contracting and
pricing apparatus hardens.

The three products (EOR · Contractor Management · Contractor Management+ =
COR/AOR with misclassification protection, plus Global Payroll and Talent in
the wider canon) each sell under one of two chairs: **resale** (partner holds
the client contract, wholesale + markup) or **referral** (we contract the
client directly, partner earns a fee, deposit applies). The chair decides who
touches the client — settle it early; the Advocate Pay deal died late partly
on chair-flip mechanics, and the room's discovery prompts keep the settle-chair
question in front of every new conversation.

---

## 3. The day engine — time-aware from 9:00

The page derives everything at request time (the app's established pattern) and
renders against the **Chicago clock** (`src/lib/tz.ts` — `userDayKey`, never
`dayStamp()`, whose UTC day rolls over mid-evening; the room must not inherit
that bug). Blocks, in the order the day meets them:

- **9:00 — The opening read.** One serif sentence: the single most important
  thing in the prospecting world today, with its reason ("Simploy decides 8/6 —
  demo follow-through is the day's dominant move"). Below it, the day's queue,
  capped at five primary items (decision-zone ceiling), each carrying
  do + why + a ready relay line or message draft. Sources: live-deal
  commitments, follow-ups due (`partitionFollowUps`), partner-kickoff cadence
  (`partnerKickoff`, Monday ritual), research staleness, wire items worth a
  dig, and Chamber actions.
- **9:00–11:00 — Research window.** Who to research and why: accounts above
  the demand gate with stale or missing research (research.json is dated
  2026-07-02 — 28 days stale at time of writing; 8 of the 34 Midwest accounts
  have no record at all), plus any account the wire mentioned overnight. One
  click runs the existing deep-research pass (`runResearch`) or copies the
  manual prompt.
- **11:00–2:00 — Channel window.** Partner and CSM touches while the whole
  country is at its desk: roundups due by cadence, CSM briefings for NEEDS_CSM
  accounts, relay lines for CHANNEL_OK partners, demo/call prep for scheduled
  meetings.
- **2:00–4:30 — Follow-through window.** Chases, owed items, Sales Navigator
  paste-downs from the morning's browsing, filing the day's captures.
- **4:30 — The closing read.** What moved, what didn't, what tomorrow opens
  with. Updates nothing by hand — State of play already knows; this block just
  shows the delta and seeds tomorrow's 9:00.

Time-awareness mechanics: the room compares `now` (Chicago) to block windows
and collapses past blocks (Pulse discipline — the past compresses, never piles
up). Done marks are day-scoped TaskDone keys namespaced
`groundwork:<userDayKey>:<moveKey>`. Nothing fires on a timer; the room is
time-aware, not time-triggered.

---

## 4. Prospecting motions — what the operator should be doing, per the app

Ranked. Each motion names its evidence.

**M1 — Land the live Midwest deal (Simploy).** COO Chassie Smith, inbound 7/8
post-LIVE, partner-selection decision **8/6**, demo week of 7/28 with Katie
(Dir. Ops) and possibly Carson (CEO). Prefers resale (stays in the client
relationship); has been referring global needs to G-P with **no rev share** —
the displacement wedge writes itself. Two India contractors to reclassify =
the first concrete piece of business. This is the reference win the whole
Midwest channel motion will be sold with. Owner move cadence: demo recap →
reclassification proposal → 8/6 decision support.

**M2 — Work the warm second wave.** XcelHR (Bill Laffey asked 7/27 for a call
on relationship mechanics + pricing shape — a partner literally asking how to
pitch us to a client), Infiniti HR (Jennifer Hardesty requested a call 7/21;
Puerto Rico pain + broader international; G-P alliance = displacement keyed to
renewal timing), ESC (Canada payroll demo accepted 7/22; MPEX licensing track
with Rick Torrence). These are prospecting-adjacent: each is a partner not yet
producing client flow — the motion is to convert partner interest into a
repeatable client-referral lane, not just close the deal in hand.

**M3 — The relay motion through CSMs (greenfield).** For the ~140 accounts
with no live thread: brief the CSM first (NEEDS_CSM gate), arm them with the
partner-voice relay line for their top Global-fit accounts, and ask them to
gauge client interest. The engine exists (`partnerKickoff`, relay lines in the
discovery bank, campaign kits audience-gated by approach). Groundwork's job is
to keep the weekly kickoff honest — every CSM roster armed, not just Lesha and
Anika who already have hot signals.

**M4 — Displacement watch.** Accounts where a competitor EOR is genuinely
named: Infiniti HR (G-P, renewal early fall — SBR timing), Nextep (G-P,
renews 9/1/2028 — long game), Advocate Pay (Remote-class alternatives were on
the radar). The play is consolidation onto the platform they already run
domestically; the trigger is renewal timing; the wire watches for competitor
price changes, outages, and layoffs that open the window early.

**M5 — Platform-incumbent attach.** Every account with a PrismHR cloud tenant
is one config away — "Global appears as a new tab, no integration." The room
surfaces incumbent accounts (non-empty `cloud`) as the cheapest conversations
in the book and feeds them into M3 briefings first.

**M6 — Enablement (the loud motion).** "At startup stage the constraint isn't
leads, it's enablement." Named missing assets: a contractor-conversion
one-pager, country-coverage sheets, packaged partner-quotable pricing. The
room keeps a standing gap list and a weekly one-click "voice of the base"
summary for Aleks/marketing — this is also, precisely, the evidence trail that
answers Russ's marketing-readiness concerns with specifics instead of vibes.

**M7 — The external channel (Chamber, §6).** Third lead-feeder, education-led,
deliberately slow.

Standing constraints on all motions: relationship permission beats everything
(Chicago priority "cannot override relationship permission"); no money figures
anywhere in the app (`redactMoney`); no automated outreach — every outbound is
1-click edit → send behind a human hand.

---

## 5. Who to talk to internally, and why

| Person | Role | What Groundwork routes to them |
| --- | --- | --- |
| Russ Jones | VP of Sales, PrismHR | State of play readouts; post-mortems (he asked for the Bulgaria one himself, 20 minutes); exec weight on partner calls — he personally scheduled the ESC Canada call. Use him where a VP opening a door beats a consultant knocking. |
| Aleks Boruk | SVP CS & Client Growth | The motion's day-to-day owner: contracting pacing, pricing doctrine, partner reads, training schedule. The 1:1 room already exists; Groundwork feeds it the enablement-gap list and channel decisions (e.g. Chamber membership). |
| Shane Jacobs | The other GBC | Demo lead; deal originator; owes the pre-recorded demo (due 7/30). Coordinate book boundaries (PuzzleHR is his) and SE-staffing process. |
| Deana Morgan | RevOps / contracts | Contract templates, SF/CPQ state, signature routing (@RCA Contract Requests). Ask: when does the second contracting training land; what's still manual. |
| Anthony Falzone | Head of Global Ops | Global Payroll country quotes (always copy Aleks); Canada/MPEX cost story. |
| Rick Torrence | Technology/licensing (MPEX) | The ESC licensing structure — the template for every future "partner wants to operate the tech" deal. |
| Lesha Cyphers · Anika Steenstra · Whitney Dideon · John Hebert · Kathryn Maddox · Eric Ronci | CSMs / partner owners | The channel itself. Lesha (22 accounts incl. Simploy, ESC), Anika (10 incl. Infiniti, Nextep, XcelHR — she owns XcelHR timing), Whitney (HCM book, 3 weeks in seat — needs the most arming), John (payroll bureaus + the Vensure-acquisition early-warning), Kathryn (HCM), Eric (Advocate Pay history). |
| Kim Roberts | Salesforce admin | Outlook→SF logging health; the LinkedIn activity type visible in SF timelines. |
| Eduardo (Solvo) | BI/reports | Deep account detail and growth specs — the internal enrichment source before any external tool. |

---

## 6. Global Chamber of Commerce — Chicago chapter

What the repo actually knows: "Chicago Global Chamber" is a founder-named
hypothesis channel (master prompt: "We need at least 3 lead-feeder sources
outside the CSM motion. Known example: Chicago Global Chamber"), status
explicitly unresolved (master plan open question #9; canon lists "whether
Chicago Global Chamber has any special status" as not yet canon). No contact,
event, cost, or chapter data exists anywhere in the app. The room treats that
honestly: first job is to **resolve the hypothesis**, not to pretend a
relationship exists.

Engagement plan, from the app's own field manual (`docs/research/deep-research-report.md`):

1. **Verify** (week 1): run a research pass on the Global Chamber's Chicago
   chapter — membership model, event cadence, who runs it, member profile.
   Groundwork files the findings and opens the go/no-go decision to the
   founder and Aleks.
2. **Lead with education, never with a lead-ask.** "Ask too early for client
   access and you look hungry." The offer is a compliance briefing or a
   checklist: *hiring across borders without an entity — what Midwest
   companies get wrong* (misclassification, permanent establishment, the
   contractor-conversion story). This is exactly the collateral gap M6 is
   already pushing marketing for — one asset serves both.
3. **Show up on cadence, capture on cadence.** Attend monthly; every
   conversation becomes a Groundwork capture (paste lane) and, where a real
   company with a real cross-border need appears, a look-into item. The room's
   Chamber tile tracks: events attended, conversations captured, qualified
   follow-ups — because the manual's scoring says a chamber that yields
   attendance but no qualified follow-up is a **medium-at-best** channel and
   should be dropped for a better one.
4. **Score the channel quarterly** on the manual's five dimensions:
   recurrence, audience fit, reciprocity, conversion to conversations,
   distinctiveness. "Chambers give you surface area; advisors give you
   timing" — in parallel, cultivate the adjacent Chicago fabric: World
   Business Chicago, Chicago Sister Cities, Illinois Hispanic Chamber, Food
   Export-Midwest, 1871, mHUB.
5. **Guardrail:** Chicago can raise an account's priority; it cannot override
   relationship permission. A Chamber-met company that turns out to be a
   partner's client routes back through the partner, full stop.

---

## 7. The Midwest book — PEO/ASO partners and their people

34 of 150 accounts are Midwest (IL 4 · IN 6 · KS 4 · MI 8 · MN 1 · MO 4 ·
OH 3 · WI 4); **21 carry industry PEO/ASO**. The rest are staffing/bureau/
insurance. Verified against `book.json`; contacts from `contacts.json` (full
rosters live there — 1,354 people across the 34).

Priority tier (demand-gated or live):

| Partner | HQ | CSM | Why now | People to know |
| --- | --- | --- | --- | --- |
| **Simploy** | St. Louis, MO | Lesha | LIVE — decision 8/6, demo wk 7/28; demand 75/high | Chassie Smith (COO, the buyer) · Carson King (CEO) · Katie (Dir. Ops) · David Avakian (President) · Trish Holmes (CFO) |
| **Fullstack PEO** | Indianapolis, IN | — | Only other Midwest account above the demand gate (32/med); tech-startup clientele = latent overseas contractor demand | Dawn Lively-Jenkins (CEO) · Gerry Bailey (CEO) · Ann Brandon (Dir. Ops) · Suzanne Higgs (HR Dir.) |

Channel-build tier (no global signal yet — M3/M5 relay targets; leadership
contacts are the stakeholder map for CSM-cleared briefings):

| Partner | HQ | People to know |
| --- | --- | --- |
| WorkSmart Systems | Indianapolis, IN | Matt Thomas (CEO) · Jessica Carney (CSO) · Nanci Reynolds (Chief Payroll Officer, book primary) |
| Syndeo Outsourcing | Wichita, KS | Bill Maness (CEO) · Jenna Marceau (CIO, book primary) · Kate Rhea (Dir. BD) |
| Axcet HR Solutions | Overland Park, KS | Jerry Diddle (President) · Jo McClure (Dir. Payroll, book primary) · Janine Crockett (BD Mgr) |
| Axios Inc | Grand Rapids, MI | Kellie Haines (President) · Daniel Barcheski (CEO) — caveat: PEO/ASO book sold to Engage PEO 3/2025; validate what remains |
| CoStaff Services | Royal Oak, MI | Mike Bugarelli (Owner) · Danielle Hendzell (VP HR, book primary) · Michael Le Pire (VP Sales) |
| CS Partners / Partner Solutions | Brighton, MI | Chris Matheson (CEO) · Carlie Lockwood (President) · Michelle Soltz (Dir. Payroll, book primary) — charter-school niche, thin global fit |
| HR Plus | Clinton Twp, MI | Stephen Roux (President) · Dionne Weiand (VP Ops) |
| Sequoia Trusted Advisors | Harsens Island, MI | Cheryl Brown (CEO) — small shop |
| BestPEO | Southfield, MI | Rocky Mehta (Principal) |
| The Employer Group | Verona, WI | Luke Anderson (President) · Kiarra Eith (VP) · Mindy Rowland (VP & CLO) |
| SynchronyHR / Cornerstone | St. Louis, MO | Kyle Kelly (CEO) · Lecie Steinbaum (President) — Engage-owned since 8/2024; route awareness via Engage |
| Centric HC (OPOC.us) | Worthington, OH | Greg Belhorn (VP Ops) · Lori Camper (VP Payroll) · Jill Wilder (VP Client Relations) |
| American Payroll Service / Callos | Youngstown, OH | Donnie Loree (Dir. PEO & Payroll Ops, book primary) · Mary Beth Gunerra (President) |
| Surety HR | Westlake, OH | Joe Spooner (President) · Andy Lembach (COO) — Ohio workers'-comp value prop, weak global fit |
| Servant HR | Fishers, IN | Michael Yoder (CEO, book primary) · Jeff Leffew (Founder) |
| Amplify HR Management | Northbrook, IL | Todd Beutel (CEO, book primary) · Danielle Achziger (VP Client Solutions) |
| MedHQ | Westchester, IL | Tom Jacobs (book-level only; zero roster on file — a contact-acquisition target for the Sales Nav lane) |
| XCEL HR | filed Fort Wayne, IN | Bill Laffey (VP Ops — the live contact) · Ted Bross (VP Tech, book primary) — caveat: real HQ is Rockville MD; Midwest filing is the branch |
| Gordon J. Maier & Co | Racine, WI | Julie Craig (Managing Partner) — research says actually a CPA firm with an international-tax page; reclassify, don't pitch as PEO |
| Premier Payroll & HR | Fort Wayne, IN | — DISQUALIFIED: Vensure-acquired 9/2025. Keep as the Vensure-vacuum early-warning example. |

Data debts the room should surface as work: 3 Midwest accounts with zero
contacts (MedHQ, Premier, Innovative Payroll Processing), 8 with no research
record, 3 blank-state accounts unclassifiable (Meridian Payroll Group, Payroll
Solutions Inc., WALCOR/Paymaster Pro).

---

## 8. State of play — the standing readout for Russ

The dossier is **derived, never authored** — the same doctrine as the intranet
index. It is not a diary the operator maintains; it is a read the room
composes at request time from every store, so it is self-updating by
construction. Sections, in Russ's language (real pipeline activity, not
busy-work):

1. **The sentence.** One serif line: where the prospecting world stands today.
2. **Live motion.** Each active pursuit with stage, last real event, next
   committed move, and the chair (resale/referral) — Simploy, ESC, Infiniti,
   XcelHR, plus whatever has since gone live. Sourced from DashCards + intel.
3. **Channel activity.** Roundups sent and answered, CSMs briefed, partners
   armed, cadence health — the evidence that the partner engine is being
   cranked, with reply deltas, not send counts.
4. **New demand.** Signals that crossed the gate since the last readout:
   research findings, wire hits on book accounts, Sales Nav intelligence,
   Chamber conversations.
5. **Blockers, named.** The standing enablement/contracting asks with age
   ("packaged partner-quotable pricing — asked 7/22, open 8 days"). This is
   the section that keeps the marketing-readiness conversation concrete.
6. **Next.** The three moves the coming week turns on.

Mechanics: a pure builder (`src/lib/groundwork/readout.ts`) over existing
stores; a "since last readout" delta powered by one TaskDone key
(`groundwork:readout-read`) stamped when the operator opens/copies it; a
one-click copy (and mailto) rendering clean plain text; `redactMoney` on every
string. A 20-minute post-mortem view per dead deal (Russ's known ask) falls
out of the same builder filtered to one account.

---

## 9. Outside signals — the intelligence wire

**What it watches.** Keyword registry, versioned in code
(`src/lib/groundwork/wire-keywords.ts`):

- Category terms: EOR, employer of record, contractor management, contractor
  of record, PEO, ASO, international hiring, global hiring, global hiring
  compliance, international payroll, global payroll, worker
  misclassification, permanent establishment, co-employment.
- Competitors (the superset list in `src/lib/book/research.ts` COMPETITORS,
  which already includes Rippling): Deel, Rippling, Remote, Globalization
  Partners / G-P, Velocity Global (rebrand "Pebl"), Papaya Global, Oyster,
  Multiplier, Safeguard Global, Omnipresent, Skuad, Playroll, Atlas HXM,
  TriNet — reusing its NEG negation regex so "no Deel in place" never counts
  as a mention.
- The family: PrismHR, Vensure, Engage PEO (the acquirer moving through the
  book), iSolved, Justworks, NAPEO.
- **Every account in the book** — all 150 names from `peos`, plus the PEO/HR
  companies named inside research records (Callos/Nesco, OPOC.us, Spooner,
  AlphaStaffHCM, PeopLease…). Ambiguous names (Remote, Axios, Sequoia, QPS,
  Allied Global) carry disambiguation qualifiers in the sweep prompt — the
  research corpus already documents each collision.

**Sources (≥5, reputable, named in the sweep prompt):** SHRM, HR Dive,
Staffing Industry Analysts, Bloomberg Law/Tax, Reuters, TechCrunch (venture
EOR news: Deel/Rippling/Remote funding, lawsuits, layoffs), HR Executive, plus
NAPEO's PEO Insider for industry-structure news. The sweep prefers these
domains and always records the source URL.

**How it works (honest to the repo's capabilities).** No RSS infra exists and
the doctrine keeps external APIs non-canonical; the one sanctioned
external-fetch mechanism is a Claude `web_search` pass
(`src/lib/intel/deep-research.ts` is the template). So the wire is a **sweep**:
a server action running batched web searches over the registry, returning
structured items `{headline, source, url, at, keywords[], accountIds[], read}`
— each with a one-sentence "why this matters here" read — filed as notes under
a `wire:` namespace (immutable, deduped by URL hash). Refresh model:
staleness-triggered on room entry (12h threshold) + a manual refresh control;
`docs/automation-map.md` permits data-only scheduled refresh, but the repo has
no scheduler today — adding Vercel cron is a founder decision the plan
surfaces rather than assumes.

**Rendering.** Not a marquee — the motion vocabulary is closed (no scrolling
loops; the only ambient motion in the system is the single pulse dot). The
wire is a quiet column/strip of items, newest first, rotating through the
`ds-read` crossfade where space is tight. Items mentioning a book account
carry the account chip and rank first.

**One click from a deep dive.** Clicking an item opens a drawer: the read, the
source link, every matched keyword/account, and one move — "Dig deeper," which
runs a focused research pass seeded with the item (URL + account context) and
files the finding to the account's `research:` trail. Wire → dossier: items
that touch a live pursuit surface automatically in State of play §4.

---

## 10. LinkedIn Sales Navigator — the intake lane

Sales Navigator's terms prohibit scraping/automation, so the lane is
**paste-first by design** — the operator copies what they are already looking
at; the app does the reading. Three levels:

1. **Paste box (ships first).** A capture box in Groundwork accepting any
   Sales Nav copy — a lead list, an account page, saved-search alerts, a
   profile. A structured Claude read (the `aiCleanTimeline` pattern with a
   SalesNav-shaped schema) extracts: people {name, title, company, seniority},
   company signals (headcount growth, **countries hiring into** — already the
   research doctrine's top prospecting signal), job changes, and intent
   crumbs. Output files as: contact candidates on the matched account
   (surfaced for confirmation, never auto-merged into `contacts.json`),
   `prospect:<accountId>` notes, and look-into items for unmatched companies.
   The misfile guard (paste mentions a different company than the bound
   account → nothing writes until forced) carries over.
2. **Bookmarklet (fourth in the shelf).** Same pattern as the Outlook/SF/Teams
   grabs: scoped DOM innerText, head token `SALESNAV — captured <date>`,
   clipboard, opens Groundwork. It only captures what the operator already has
   on screen — no crawling, no background requests. Dialect branch added
   beside the existing three in the paste reader.
3. **Routine, not integration.** The 9:00 research window lists the day's
   saved searches to open (per-account and per-territory), so Sales Nav
   browsing happens on cadence and every session ends in a paste-down. If the
   org's Salesforce LinkedIn activity integration matures, SF pastes already
   carry LinkedIn activity rows — no new work needed.

---

## 11. Per-account awareness

Every account rendering in Groundwork binds to the same stores as the Accounts
page — no copies, no drift:

- Identity/fit: `peos`/`getPeo` (`@/lib/book`), `deskScore`/`compositeScore`.
- Research: `getDemand`, `analyzePlay`, `extractCountries`,
  `researchGeneratedAt` (staleness), evidence claims for the "why."
- People: `contactsFor` + `peopleFor` (server-only roster + note actors).
- Live state: command-center stage/approach/intent overlays, dispositions,
  touches, todos.
- Intelligence: `dealIntelFor` corpus extraction; `motionsFor` for the next
  motion; `askNextFor` for the ≤3 questions worth asking; relay lines from the
  discovery banks.

The account lens (a drawer, not a route) shows: fit + demand + play,
countries, competitors, the stakeholder shortlist, the next motion with its
relay line, last touch/next check-in, wire hits, and a plain link to
`/accounts?focus=<id>`. Account names are plain links — no glyphs.

---

## 12. Build plan

Phased, additive-isolated, each phase shippable behind the standing verify
chain (`prettier → tsc → eslint (0 warnings) → tsx tests → next build`, branch
→ PR → Vercel green → squash).

**Phase 1 — The room and the day engine.** `src/app/groundwork/page.tsx`
(force-dynamic, auth-gated, AppWayfinder entry), `src/lib/groundwork/day.ts`
(pure block builder over existing stores, Chicago-keyed), done-keys +
dispositions in the established namespaced pattern. Tests for the block
builder and day-key behavior (including the 9:00-anchor and the
UTC-rollover trap).

**Phase 2 — State of play.** `src/lib/groundwork/readout.ts` pure builder +
copy/mailto actions + last-read stamping. Tests: readout composes from
fixtures, redacts money, delta logic.

**Phase 3 — The wire.** `wire-keywords.ts` registry (exports the account-name
watchlist derived from `peos` at build), `wire.ts` sweep via the deep-research
template, `wire:` namespace filing + URL-hash dedupe, drawer + dig-deeper
action. Staleness-on-entry refresh; founder decision logged on cron.

**Phase 4 — Sales Nav lane.** Paste box + structured reader + contact-candidate
confirm flow; bookmarklet added to the Capture shelf; misfile guard tests.

**Phase 5 — Chamber tile + channel scorecard.** Verification research pass,
capture lane, quarterly scoring per the field manual's five dimensions.

Open decisions surfaced to the founder (not assumed): cron infrastructure
(vercel.json) vs on-entry refresh only; Chamber go/no-go after the
verification pass; whether contact candidates from Sales Nav may ever write
into the canonical roster or stay a side ledger; XCEL HR's region filing;
reclassifying Gordon J. Maier.

---

## 13. Design

Three structurally distinct options — same palette, same type, same
components; distinctiveness by information architecture only, per the design
canon — are built as an interactive triptych:
`docs/mockups/groundwork-triptych-2026-07-30.html`.

- **Option A — Day Spine.** Pulse-first: the page is the 9:00→close time
  axis; the wire is a right rail; State of play is an edge tab.
- **Option B — The Desk.** Account-first FocalRail: ranked prospect queue
  left (one offset item breaks rank), the focused account's working lens
  center, the wire as a quiet strip; State of play as a drawer.
- **Option C — The Briefing.** Dossier-first: State of play IS the page top —
  always current, read-to-Russ ready; the day's queues and the wire hang off
  it beneath.

All three honor: bright field, ink ladder, orange spent once, blue for system
intelligence, serif/sans/mono trio, no forbidden costumes, no money figures,
no "steps" in operator copy, account names as plain links.

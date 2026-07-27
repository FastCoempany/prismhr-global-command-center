# The Intelligence Era — canonical build spec v3 (7/27)

This is canon. Every store, type, key format, algorithm, UI string, and batch
below is the agreed shape; deviations get called out in PR descriptions.
v2's overview survives as the "why"; this document is the "exactly how."

---

## 0. Ground rules (unchanged, load-bearing)

1. **No SF API — ever.** No admin access, no IT exceptions. SF context enters
   only through: the ⚡ bookmarklet → `/intake` paste, report drops
   (PDF/XLS/CSV), and files committed to `intelligence/` on main.
2. **The app runs no LLM.** Intelligence = (a) intel libraries shipped as
   code in `src/lib/intel/`, distilled by Claude in-session from
   `intelligence/`; (b) deterministic extractors over the app's own stores;
   (c) the research loop (copy-prompt → claude.ai → paste back).
3. **Confidentiality rails.** No internal pricing stack anywhere. Extractors
   and brief/battlecard renderers must never emit dollar amounts into UI
   strings: `redactMoney()` (Phase 1) strips `/[$€£]\s?\d[\d,.]*k?/` and
   `/\b\d[\d,.]*\s?(USD|EUR|GBP|PEPM)\b/i` from any snippet before display.
4. **Zero new schema.** Everything rides the existing stores and the
   established zero-schema patterns:
   - body markers `⇢[a:id,p:id] label` (routing), tags
     `⚑[d:,u:,w:,k:,dl:,dn:,c:]` (note metadata),
   - namespaced `AccountDisposition` rows keyed by prefix:
     existing `roundup-mute:`, `partner-light:`, `row-delay:<rowKey>`,
     `hide:<store>:<id>[|at]`, `nofile:<todoId>`.
   - New namespaces introduced by this plan (all ≤191 chars, all
     restorable/idempotent upserts):
     `sugg-dismiss:<cardId>:<nodeKey>:<itemIdx>` (Phase 2),
     `brief-done:<ruleId>:<subjectId>:<dayKey>` (Phase 3),
     `brief-mute:<ruleId>:<subjectId>` (Phase 3),
     `asknext-done:<accountId>:<questionId>` (Phase 4).
5. **Existing corpus loaders** feeding all intel:
   `loadAccountNotes()`, `loadPartnerNotes()`, `loadTodos()`,
   `loadTouches()` (incl. `Touch.log[]`), `loadDispositions()`,
   `loadDoneKeys()/loadDoneTimes()`, `loadDashboard()`. Filed SF activities
   are `AccountNote` rows whose body starts `✉ SF ` / `✔ SF ` / `☎ SF `
   (written by `fileTimeline` in `src/app/intake/actions.ts`).

---

## Phase 0 — Intel libraries (`src/lib/intel/`)

New directory; server-safe pure TS; no imports from `app/`.

### 0.1 `src/lib/intel/discovery.ts` — the universal question bank

```ts
export type QCategory =
  | "footprint" | "classification" | "risk" | "incumbent"
  | "money" | "timing" | "commercial" | "platform";
export type QAudience = "exec" | "ops" | "partner";
export type QPhase = "investigate" | "first_meeting" | "needs_analysis"
  | "demo" | "exec_summary" | "proposal" | "contract"; // == DashNodeKey

export type DiscoveryQ = {
  id: string;              // "fp-where" — stable, referenced by dispositions
  category: QCategory;
  phase: QPhase;           // earliest stage where it's appropriate
  audience: QAudience;
  question: string;        // country-agnostic; may contain "{countries}"
  why: string;             // one sentence, shown on hover/expand
  listenFor: string[];     // phrases that mark the answer as significant
  followUp: string;        // the natural next probe
  drumLine: string;        // the gauge/drum-up/campaign sentence (partner voice,
                           // direct question, no preamble — roundup voice rules)
};
export const DISCOVERY: DiscoveryQ[];
export function questionsFor(opts: {
  phase: QPhase; gaps: QCategory[]; countries: string[];
}): DiscoveryQ[];          // merge {countries}, filter phase ≤, order by gap match
```

Seed content — minimum 24 questions, 3 per category, distilled from the
corpus. Canonical seed set (abbreviated `question` → `drumLine`); full text
written in code:

| id | cat | question (essence) | corpus source |
|---|---|---|---|
| fp-where | footprint | Which countries, how many people in each? | Nate: "Mexico, South Africa, Philippines…" |
| fp-status | footprint | Employees or contractors in each — and who is the legal employer today? | Shane's Bulgaria vendor probe |
| fp-paid | footprint | How does money physically reach them today (wires? platform? local entity?) | Nate: 25 individual bank wires |
| cl-control | classification | How much direction/control and how open-ended is the work? | Nate: "borderline their employees" |
| cl-notice | classification | If they're employed by a local company, what notice periods bind them? | Shane's notice-period question |
| cl-residence | classification | Does anyone live outside their nationality country? | the Bulgarian living in Spain |
| rk-driver | risk | What makes this urgent — IP, compliance, an audit, a client demand? | Justin: "hyper-focused… IP reasons" |
| rk-ip | risk | Who owns the IP created by these workers under current contracts? | Justin's W-2-for-IP goal |
| rk-pe | risk | Are recurring wires signaling permanent-establishment exposure? | Shane's wallet pitch framing |
| in-who | incumbent | Who handles global today — and what's working / broken? | G-P via TriNet "didn't integrate" |
| in-renewal | incumbent | When does that contract renew? | Infiniti/Nextep renewal-timing asks |
| mo-fees | money | What do wires + conversion cost per payment, both sides? | wire fees; workers eating $40–50 |
| mo-freq | money | Would per-week/per-month flexibility change anything? | wallet unlimited transfers |
| ti-date | timing | What's the stated date — and what real event sits behind it? | Aug 6 = Simploy leadership review |
| ti-path | timing | If the date slips, what breaks? | Justin pushing on Sept 1 |
| co-chair | commercial | Does the partner want to hold the contract (resale) or refer it? | Bryce → referral; Chassie → resale |
| co-credit | commercial | Who carries funding credit — and is that understood? | deposit reinstated on referral |
| pl-hcm | platform | Which platform runs their domestic book (PrismHR/HCM/Execupay)? | intake form field 4 |
| pl-scope | platform | TLM / expense / contractor tiers needed? MPEX licensing (operate) vs service (buy)? | ESC licensing memo |
| mt-exec | timing/multithread | Who besides {contact} feels this problem — exec and ops both? | Justin-vs-Nate split |
| …plus ≥4 more per the code file. |

Rule for every `drumLine`: a direct question a partner can ask verbatim
("Would you mind asking them who handles their international payroll
today?") — never a directive with a period, no preamble words.

### 0.2 `src/lib/intel/lexicon.ts` — extraction vocabulary

```ts
export const PRODUCT_TERMS: Record<"eor"|"contractor"|"contractor_plus"|"payroll"|"mpex"|"wallet"|"tlm", RegExp>;
// e.g. eor: /\b(EOR|employer of record)\b/i
//      mpex: /\bMPEX\b/i   contractor_plus: /\bcontractor\s*plus|agent of record\b/i
export const COMMERCIAL_TERMS: Record<"resale"|"referral"|"deposit", RegExp>;
// resale: /\b(resell(er)?|resale|wholesale|mark[- ]?up)\b/i
// referral: /\breferral\b/i    deposit: /\b(deposit|escrow)\b/i
export const INCUMBENTS: string[]; // "Globalization Partners","G-P","GP","Deel","TriNet","Remote","Papaya","Oyster","Velocity Global","Safeguard"
export const URGENCY: RegExp;      // /\b(time[- ]sensitive|deadline|by (early |late )?[A-Z][a-z]+|quarterly review|leadership (team|review)|asap)\b/i
export const HEADCOUNT: RegExp;    // /\b~?\s?(\d{1,4})\s*(?:ee?s?|employees?|people|contractors?|workers?)\b/i
export function countriesIn(text: string): string[];
// wraps NAME_TO_CODE from src/lib/flags.tsx + adjectives/aliases map
// (Bulgarian→bg, Ontario→ca, UK/United Kingdom→gb, …); returns iso2[]
```

### 0.3 `src/lib/intel/motions.ts` — stage+signal → next motion

```ts
export type Motion = { id: string; when: MotionTrigger; say: string; do: string };
export type MotionTrigger = {
  stage?: DashNodeKey;                  // deal sits here
  signal?: keyof typeof SIGNALS;        // e.g. "contractsOut", "demoDone", "deadlineNear", "singleThread", "chairUndecided", "staleInbound"
};
export function motionsFor(intel: DealIntel, stage: DashNodeKey): Motion[];
```
Seed motions (≥12), e.g. `contract+contractsOut` → do: "chase signature
state", say: "Anything blocking signature on your side I can clear today?";
`any+singleThread` → do: "open a second thread", say: drumLine of `mt-exec`;
`needs_analysis+chairUndecided` → co-chair drumLine; `any+deadlineNear` →
"confirm the real event behind {date} and what they need in hand for it."

### 0.4 `src/lib/intel/digest.ts` — the corpus deals, distilled

```ts
export type DigestEntry = {
  accountId: string;        // book id ("ADVOCATEPAY000001", ESC id, …)
  asOf: string;             // "2026-07-27"
  facts: string[];          // dated one-liners, money-redacted
  stage: DashNodeKey;       // best-evidence stage
  intelSeed: Partial<DealIntel>; // countries, headcounts, products, chair, deadline
};
export const DIGEST: DigestEntry[]; // Advocate/SubcontractorHub, ESC, Simploy, XCEL, Infiniti, Nextep, Genesis, eEmployers
```
`extract.ts` unions this with live stores so day-one surfaces are smart
before any new paste. Facts carry their date so staleness is visible.

### 0.5 Tests — `tests/intel.test.ts`

- lexicon: each regex against real corpus sentences (positive + negative:
  "GP" must match as incumbent only as a word, not inside "GPS").
- countriesIn: "Bulgarian living in Spain" → ["bg","es"]; "Ontario branch" → ["ca"].
- HEADCOUNT: "300 ee", "~25 employees", "2 independent contractors".
- questionsFor: phase gating + gap ordering + {countries} merge.
- redactMoney: strips every corpus dollar form; leaves "300 ee" intact.

---

## Phase 1 — Deal Intel engine

### 1.1 `src/lib/intel/extract.ts`

```ts
export type SourcedFact<T> = { value: T; src: string; at: string };
// src = "sf-activity 7/21" | "note 7/24" | "digest 7/27" | "touch 7/25"
export type DealIntel = {
  countries: SourcedFact<string>[];          // iso2, deduped, newest-first
  headcounts: SourcedFact<{ n: number; country?: string }>[];
  products: SourcedFact<"eor"|"contractor"|"contractor_plus"|"payroll"|"mpex"|"wallet"|"tlm">[];
  direction: { line: string; confidence: "high"|"medium"|"low" } | null;
  timing: SourcedFact<{ phrase: string; dateIso?: string }> | null;
  chair: "resale" | "referral" | "undecided";
  incumbent: SourcedFact<string> | null;
  threads: { people: string[]; execSeen: boolean; opsSeen: boolean };
  lastInbound: string | ""; lastOutbound: string | "";
};
export type CorpusDoc = { text: string; at: string; src: string;
  direction?: "in"|"out"; people?: string[] };
export function corpusFor(accountId: string, stores: {
  acctNotes; partnerNotes; todos; touches; digest
}): CorpusDoc[];
export function extractDealIntel(docs: CorpusDoc[]): DealIntel;
export function redactMoney(s: string): string;
```

Rules:
- `direction` derivation: mpex seen → "MPEX licensing (they want to operate)";
  else eor+classification signals → "EOR (convert contractors)"; else
  contractor terms only → "contractor payments"; confidence = high when ≥2
  sources agree, medium 1 source, low = inferred from category only.
- `threads.execSeen/opsSeen`: title/name heuristics from contacts roster
  (`contactsFor`) — titles matching /ceo|founder|owner|president|coo|cfo/ →
  exec; /payroll|hr|account|controller|ops|operations/ → ops.
- `timing.dateIso`: month-name + day parsing (reuse `resolveDay` from
  `sf-timeline.ts`).
- Every snippet stored in `src` fields passes `redactMoney` before display.
- Derived at render; nothing persisted.

### 1.2 Tests — extend `tests/intel.test.ts`
Golden test: feed the Advocate Pay digest + 3 synthetic notes → expect
countries ⊇ [bg,in,ph,mx,za,gb], products ⊇ [eor,contractor,wallet],
chair "referral", execSeen && opsSeen true.

---

## Phase 2 — Dashboard becomes intel-aware

All edits in `src/app/dashboard-client.tsx`, `src/app/dashboard/actions.ts`,
`src/lib/dashboard/*`, CSS module.

### 2.1 Deal intel strip
- Server: `/` page (`loadDashboard` caller) computes
  `intelByCard: Record<cardId, DealIntel>` by matching `card.name` →
  book account (same name-match used by Account Room `onDashboard`), then
  `corpusFor`+`extractDealIntel`. Passed into `DashboardClient`.
- Render inside the expanded card, above the node track:
  `<div className={styles.dintStrip}>` = flags (CountryFlag) · "≈{n} EE
  {country}" chips · product chips (mpex chip labeled "MPEX") · direction
  line · timing chip (amber when dateIso within 14d) · thread coverage
  `exec ✓ · ops —` (missing lens rendered red-ish) — every chip
  `title={fact.src}`.

### 2.2 Suggested checkboxes
- `src/lib/intel/evidence.ts`:
  ```ts
  export type CheckSuggestion = { node: DashNodeKey; itemIdx: number;
    reason: string; srcAt: string };
  export function suggestChecks(docs: CorpusDoc[], card: DashCardRow): CheckSuggestion[];
  ```
  Canonical evidence map (pattern over doc text → node/item):
  - /demo (delivered|went|recap)|transcript filed|\bdemo\b.*(yesterday|last week)|Accepted: Demo/i + doc.at past → demo:"Demo delivered + recap sent"(idx 3)
  - /contract(s)? (for signature|sent|attached)|referral agreement|MSSA/i → contract idx 2 ("Contract sent — signature tracked")
  - /pricing (overview|attached|delivered)|proposal (sent|attached)/i → proposal idx 1
  - /cleared to (engage|approach)|partner (briefed|cleared)/i → first_meeting idx 0/1
  - /countries?: |they'?re in [A-Z]/ + countriesIn hit → needs_analysis idx 0
  - stakeholder count ≥3 in threads → first_meeting idx 2
  - Suggestions drop when: item already checked, or disposition
    `sugg-dismiss:<cardId>:<node>:<idx>` exists.
- UI: in the node checklist panel, unchecked items with a suggestion render
  an amber chip `suggested ✓ — {reason}` + two buttons:
  **Confirm** → posts existing `toggleCheck` (no new action);
  **✕** → posts new `dismissSuggestion` (`dashboard/actions.ts`, upserts the
  sugg-dismiss disposition).
- On the card's collapsed face, a node with ≥1 live suggestion shows an
  amber dot on its mini progress dots (2.4).

### 2.3 "Live context" (replaces the free-text context box as primary)
- `src/lib/intel/live-context.ts`:
  `liveContextFor(docs, card, node) → { lines: {at, src, text}[], changedSinceActive: boolean }`
  Algorithm: take docs sorted desc; filter out docs whose full text already
  appears verbatim in acct/partner note bodies rendered elsewhere on the
  panel (dedupe rule: normalized-prefix 80-char match); keep top 4; flag
  `changedSinceActive` when any doc.at > card.activated[node].
- Render in the checklist panel where the textarea sat: dated lines with
  src labels; beneath it the manual field shrinks to ONE input
  (placeholder: "Your judgment — why this stage is where it is") that still
  posts `saveNote` (unchanged storage in `DashCard.notes[node]`).
- The old multi-line textarea styling (`noteArea`) retired for this spot.

### 2.4 UI shrink + controls (all exact)
- DELETE the literal string `" done — all checked lights the stage"` and the
  `{done}/{total}` span from `panelHead` (`dashboard-client.tsx` ~:329-332);
  panel head becomes just the stage label + ✕.
- `src/lib/dashboard/stages.ts`: add `brief: string` per checklist item —
  new canonical brief labels (≤32 chars), e.g. investigate:
  ["Trigger named","Owner partner named","Fit reviewed"]; first_meeting:
  ["Partner briefed","Cleared to approach","Stakeholders mapped",
  "Guardrails noted","First meeting held"]; needs_analysis:
  ["Countries known","Pay method known","EE vs IC known","Incumbent known",
  "Product matched","Options framed","Risk quantified","Scope drafted"];
  demo: ["Availability confirmed","Right attendees","Demo tailored",
  "Demo delivered"]; exec_summary: ["Summary drafted","Partner reviewed",
  "Delivered + reaction"]; proposal: ["Criteria confirmed",
  "Proposal delivered","Pricing cleared"]; contract: ["Yes/no reached",
  "Partner debriefed","Signature tracked"]. Checklist UI renders `brief`,
  `title={full}`. (Type: `checklist` becomes `{ full: string; brief: string }[]`
  — `nodeChecklist()` keeps returning full strings for compatibility;
  add `nodeBriefs()`.)
- **Mini progress dots, always visible:** on each card under the track,
  `<div className={styles.nodeDots}>` — one row per ACTIVE node only:
  `{label(k)} ●●○○` (dots = items, filled = checked, amber = suggested),
  clicking the row opens that node's panel. Rows for todo/done nodes are
  omitted (that's the "not disruptive" compromise; the track itself already
  shows stage states).
- **NEXT box deleted** (`nextStep()` + `styles.nextStep` block removed).
- **Drag reorder:** card root gets `draggable` + handlers; drop calls new
  action `reorderCards(formData: ids CSV)` in `dashboard/actions.ts` that
  reuses `moveCard`'s reindex body verbatim (validate: same id set as
  non-archived). ↑↓ buttons removed.
- **Icon controls:** Rename → ✎, Archive → ⬒, Delete → ✕ (`miniDel` kept),
  all in a hover-quiet `styles.manage` row (opacity .45 → 1 on card hover),
  `aria-label`s unchanged.

---

## Phase 3 — Today thinks every morning

### 3.1 Builder — `src/lib/intel/brief.ts`
```ts
export type BriefRow = {
  ruleId: string; subjectId: string;      // dedupe/done keys
  icon: GlyphKind; text: string; why: string;
  control: { kind: "mailto"|"sflog"|"copy"|"confirmCheck"|"link";
             href?: string; payload?: string;
             check?: { cardId: string; node: DashNodeKey; idx: number } };
  weight: number;                         // sort desc
};
export function buildMorningBrief(inp: {
  intelByAccount: Record<string, DealIntel>;
  suggestions: Record<cardId, CheckSuggestion[]>;
  followUpsDue; touches; cards; motions;
  dispositions: Map<string,{updatedAt:string;reason:string}>;
  now: Date;
}): BriefRow[];
```
Canonical rules (id → trigger → row):
- `reply-waiting` (w=100): inbound newer than outbound on a live deal →
  "{person} wrote {ago} — reply" · control mailto.
- `meeting-ask` (w=95): timing phrase matching /available|what availability|
  wed|this week/ in latest inbound → "{person} asked for times — send them"
  · mailto with drafted times skeleton.
- `contract-chase` (w=90): chair-stage contract + contractsOut signal, no
  inbound in 2 business days → "contracts out {n}d — chase signature" ·
  sflog prefilled.
- `deadline-near` (w=85): timing.dateIso within 7d → "{account}: {event} on
  {date} — what do they need in hand?" · copy research/summary prompt.
- `owed-item` (w=80): promise verbs in MY outbound (/I'll|I will|sending
  over|connect you/) with no later outbound → "you owe {person}: {thing}".
- `suggested-checks` (w=60): ≥1 CheckSuggestion → "{card}: {n} stage checks
  look satisfiable — confirm" · confirmCheck opens board.
- `single-thread` (w=50): threads.people.length<2 on an active card →
  multithread drumLine · copy.
- `stale-deal` (w=40): active card, no docs in 5 business days → check-in
  drumLine · mailto.
Row done/mute: forms post `briefRowDone` / `briefRowMute`
(`today/actions.ts`) writing `brief-done:<ruleId>:<subjectId>:<dayKey>` /
`brief-mute:<ruleId>:<subjectId>`; builder filters both (done is
day-scoped via dayKey; mute permanent until archive-restored).
Cap: 8 rows; overflow line "+N more in the full brief ▸" expands.

### 3.2 Rendering
New `<div className={styles.cockCap}><span>This morning</span></div>` +
rail block INSERTED ABOVE "Today's notes and actions" cap in
`src/app/today/page.tsx` (LedgerRow reuse: icon per row, why as meta,
control as primary, ✓/mute as controls). Section renders only when rows>0.

### 3.3 Tests — `tests/brief.test.ts`
Synthetic store fixtures per rule: each fires exactly when specified;
done/mute dispositions suppress; weights order; cap respected.

---

## Phase 4 — Battlecard + drum-up + research loop

### 4.1 "Ask next" — `src/app/today/ask-next.tsx`
- Server computes per focus-account: `gaps: QCategory[]` from DealIntel
  (country unknown → footprint; timing null → timing; threads single →
  multithread/exec; chair undecided → commercial; incumbent null →
  incumbent) → `questionsFor({phase: stageOf(card), gaps, countries})`
  minus `asknext-done:` dispositions → top 3.
- Renders in the account popover as a new pill panel "Ask next" and on the
  dashboard card under the intel strip: question (brief) + ⓘ why +
  **drum** button (copies drumLine) + ✓ (posts `askNextDone`).
### 4.2 Full battlecard page — `/battlecard`
- Server page; filter chips (category / phase / audience); every question
  card shows question, why, listenFor, followUp, drumLine + copy buttons;
  optional `?account=<id>` merges that account's countries + hides done.
  Nav: lives under the Demos-adjacent cluster; linked from Ask next "all ▸".
### 4.3 Research loop — `src/lib/intel/research.ts`
```ts
export function researchPrompt(kind: "country"|"incumbent"|"licensing"|"custom",
  ctx: { account: string; countries: string[]; known: string[]; question: string }): string;
```
Template (canonical): role line ("You are researching for a PrismHR Global
deal"), the account context minus any money, the specific question, and the
required output shape ("return bullet facts with sources; flag anything
that changes the pitch"). UI: 📋 button (clipboard) + "open claude.ai" link
(`https://claude.ai/new`). Surfaced: Ask-next panel, intel strip gap chips,
morning-brief rows with `control.kind==="copy"`.

---

## Phase 5 — Tab consolidation

### 5.1 Accounts absorbs Book (`src/app/accounts-client.tsx` + `accounts/page.tsx`)
- Page loads `loadCommand()` alongside existing loaders; `AccountRow` gains
  `stage, approach, intent, blendedPriority, nextAction, nextActionDate,
  peoNotes` (from `PeoRow`).
- Expanded row gains a "Working the deal" section (below EngagementPanel):
  the Book editable form verbatim (Stage select, Approach select+blurb,
  Intent select, Next action + suggestedAction() hint, date, Notes,
  Log activity) posting the existing `savePeo`/log actions (moved to
  `src/app/accounts/actions.ts` re-exports), plus the **Plays** panel
  (`kitsFor(stage, approach)` with Copy message / Set as next action).
- Filter bar adds: Stage select, Approach select, Priority-tier select
  (same option sources as Book).
- **Group-by-CSM toggle**: `styles.toggle` checkbox "Group by CSM" —
  on = render per-CSM `<tbody>` groups with header rows (Book's grouping),
  off = current flat sort.
- Table row adds the Stage badge + Next-action cell (compact).
- `/book` → `redirect("/accounts")` (page file becomes 3 lines);
  nav entry removed from `app-wayfinder.tsx`.
### 5.2 Accounts top-bar edits
- DELETE the partner rollup chip row (`accounts-client.tsx` ~:502-520).
  The CSM `<select>` (already present) is the single picker.
- DELETE the "On PrismHR only (N)" checkbox block (~:577-584) + `incOnly`
  state + its filter line + `incCount` memo.
### 5.3 Demos picker
- New `/demos` page: three large cards (Demo Sidekick — full catalog;
  v3 Sidekick — recorded-demo flows; Payroll Demo — CN walkthrough +
  questions) each with one-line description + open link.
- `app-wayfinder.tsx`: replace the three sidekick links with one **Demos**
  entry (`current==="Demos"`); each sidekick page's `AppWayfinder` keeps its
  own `current` but nav highlights Demos for all three (compare against a
  set).

---

## Phase 6 — Intake: Global Payroll Intake Form

### 6.1 Form spec (mirrors the MS Form exactly)
`src/app/intake/payroll-form.tsx` (client). Fields, in order, with option
values verbatim:
1. Name of Service Provider* (text) — prefill: account name.
2. Global Billing Method For Service Provider* (radio):
   "Reseller- Wholesale pricing for Service Provider to Resell" |
   "Referral- List Price and we will be selling direct" — prefill from
   `intel.chair` (resale→first, referral→second, undecided→none).
3. Name of SMB* (text; "unknown" allowed) — prefill: SMB name if a
   `— <SMB>` suffix exists on the dashboard card name (e.g. "Advocate Pay —
   SubcontractorHub" → "SubcontractorHub"), else "unknown".
4. Select HCM Platform* (radio): HCM | PrismHR | Execupay — prefill:
   PrismHR when the account is on a Prism cloud (`peo.cloud` non-empty),
   else none.
5. Country* (text) — prefill: full names of `intel.countries` joined ", ".
6. Number of Employees* (text) — prefill: headcounts joined
   ("~25 contractors; 300 EE Ontario").
7. Visa Registration or Sponsorship Needed? (text) — prefill "None noted".
8. Compensation Type* (checkboxes): Hourly | Salary.
9. Payroll Frequency* (text) — prefill "Monthly" when a monthly-cycle
   country dominates, else blank.
10. Current System Used (text) — prefill incumbent + pay method ("individual
    intl wires; considered G-P").
11. Industry or Type of Employees/Titles (textarea).
12. Functionality Needed* (checkboxes): "Time and Labor" | "Expense Mgmt" |
    Other+text — prefill from products (tlm→Time and Labor; wallet/expense
    signals→Expense Mgmt).
13. GBC Requested Name* (text) — prefill "Antaeus Coe".
14. Miscellaneous Information (textarea) — prefill: top 3 redacted digest
    facts.
Account picker at top drives all prefills (DealIntel via a
`getDealIntel(accountId)` server action, value-returning).
### 6.2 Getting it into MS Forms (no supported URL-prefill exists)
- **⚡ Fill form bookmarklet** (second bookmarklet on the page): reads a
  JSON payload previously copied by the app ("Copy for bookmarklet"
  button), then on the forms.office.com page: for each entry match the
  question container by heading text (`[data-automation-id="questionItem"]`
  containing the question string), then set inputs. React-controlled
  inputs REQUIRE the native-setter trick:
  ```js
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
  set.call(input, text); input.dispatchEvent(new Event("input",{bubbles:true}));
  ```
  radios/checkboxes: `.click()` the matching label. Payload travels via
  clipboard (`navigator.clipboard.readText()` inside the bookmarklet —
  permitted on user gesture).
- Fallbacks (always rendered): per-field 📋 buttons + one "Copy all
  answers" block (Q: A lines) + "Open form ↗" to the canonical URL.
### 6.3 Page restructure
`/intake` becomes two tabs (client state): **"Payroll intake form"**
(default) and **"SF activity paste"** (existing IntakeClient, unchanged).
`fileTimeline` untouched. Add `transcript` paste-kind: a third mode where
pasted meeting notes file as one `☰ transcript` AccountNote (cap 6000
chars, redactMoney applied).

---

## Phase 7 — Narrative + Look-into

### 7.1 Narrative → weekly brief generator
`src/lib/intel/narrative.ts`: `weeklyBrief(inp) → { sections: {title,
bullets[]}[] }` over the trailing 7 days: **Moved** (stage transitions via
`activated` stamps + done checks), **Heard** (partner-note quotes ≤120ch,
redacted), **Sent/Filed** (touches + filed activities count by account),
**Blocked/Owed** (open asks + brief rows uncleared ≥3d), **Next week**
(upcoming + deadlines within 14d). Drawer body gains this at top with ONE
"Copy brief" button (plain-text, markdown-free — Teams-paste friendly).
Existing capture form + field-note list stay beneath. Bands 4's stat tiles
stay; "Where the base points" stays.
### 7.2 Look-into goes live + folds into Today
- `src/lib/look-into/live.ts`: `liveLookInto(inp) → LookIntoItem[]` born
  from: research gaps (Phase 4 gap chips → "Research {country} statutory
  basics before the demo"), unresolved capture notes of kind `ask`/`gap`
  older than 2 days, and intel contradictions (e.g. board stage < evidence
  stage suggestion older than 3 days).
- Items carry synthetic ids `li-live:<kind>:<subjectId>`; resolution reuses
  `lookIntoStatus` upserts (same table, id validated against live set).
- Rendering: compact band "Look into ({n})" on Today between Completed
  today and the Focus row — rows = title + why + resolve ✓ + (research
  items) 📋 prompt. The static `LOOK_INTO` array retires; `/look-into`
  route → redirect to `/today#lookinto`; nav entry + badge move to the
  Today band anchor. `openLookIntoHighCount` re-implemented over live items
  (badge only if any weight-high item is unresolved).

---

## Batches (ship pattern per batch: PR → CI → squash → live)

| # | Contents | Verification gates |
|---|---|---|
| 1 | Phase 0 files + tests | `tests/intel.test.ts` green; no app wiring yet |
| 2 | Phase 1 extractor + redaction + golden tests | golden test green |
| 3 | Phase 2 (intel strip, suggestions+actions, live context, UI shrink, brief labels, dots, drag-reorder, icon controls) | tsc/eslint/tests/build + render check of `/` |
| 4 | Phase 3 brief + tests + Today insertion | brief tests green; `/today` renders section |
| 5 | Phase 4 ask-next + `/battlecard` + research prompts | render checks |
| 6 | Phase 5 consolidation (Accounts absorb, Book redirect, top-bar edits, `/demos`) | Book redirect 307; accounts feature parity list checked off |
| 7 | Phase 6 intake form + fill bookmarklet + tabs | manual fill-form test on the real MS Form (user-run) |
| 8 | Phase 7 narrative + live look-into + redirect | `/today#lookinto` anchor works |

Rollback rule: every batch is independently squash-merged; a bad batch
reverts by `git revert` of one squash commit — no cross-batch coupling
except the declared dependencies (2→1, 3→2, 4→1/2, 6-prefill→2).

## Open items (parked, not blocking)
- Auto-apply toggle for high-confidence suggestions (post-trust).
- Wallet/stablecoin talking points as a demo-sidekick overlay.
- MPEX licensing precedent research (needs a research-loop run once the
  Rick Torrence structure answer lands — file his reply to `intelligence/`).

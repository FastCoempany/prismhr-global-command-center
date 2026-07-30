# The Intranet — build plan

**Status: planned, not built.** Rewritten 2026-07-30 after the founder's
direction on one-brain indexing, Claude-driven answering, full app ingest, and
tab placement. This document is the contract for what gets built, in what
order, and what "done" means at each stage. Nothing here has been implemented.

**How to read it.** Part I is architecture — the pipeline, the data model, the
model roster, the cost envelope. Part II is the thirteen phases, each with its
own objective, mechanics, model calls, data, UI, failure modes, acceptance
criteria and dependencies. Part III is what runs across all of them: evals,
observability, cost governance, security, rollback.

**A note on length.** This is deliberately long. The room is the app's brain —
it reads everything, it answers with authority, and an operator will act on what
it says in front of a prospect. A plan that leaves the hard parts as one-liners
is a plan that discovers them at build time.

---

# Part I · Architecture

## I.1 · The five commitments

These are the founder's decisions. They are not up for renegotiation inside the
build; they are what the room _is_. Every phase below is checked against them.

### C1 · One brain, not sections

Source is **provenance, never partition.**

There is no Teams shelf beside a partnerships shelf beside a demos shelf beside
the app's own record. A question about Brazil draws on a channel thread, a
partner's commitment, a line in a demo transcript, and a note on the Advocate
Pay record with **equal standing**, because the answer might live in any of
them.

Where something came from is stamped on every fragment and shown on every
citation — the operator will always know. It is a **fact about a claim**, never
a wall between claims.

_Enforcement:_ no retrieval path may filter by `origin` unless the operator
explicitly asks it to in the question ("what did the channels say about…").
A test asserts that the default retrieval call passes no origin filter, and that
a cross-cutting question returns candidates from more than one origin.

### C2 · The answer is written, not surfaced

Asking must never return "here are four pasted paragraphs containing your
keywords." That is a search box; Teams already has one and it is not good
enough.

The room **reads its candidates and composes.** It reconciles what different
people said, names disagreement where it exists, distinguishes a decision from
an opinion, and says plainly when the record does not know. Citations sit
underneath the answer, numbered, not woven through it as a wall of quotes.

_Enforcement:_ the synthesis contract (Phase 10) forbids verbatim runs over 25
words unless explicitly marked as a quotation, and an answer with zero
resolvable citations is rendered as "nothing in the record speaks to this"
rather than shown.

### C3 · It is the app's intranet

Everything the app knows is in the brain: every account note, every action open
or done or dropped, every follow-up and what became of it, every partner thread,
every board card with its stage and checklist judgments and closure, every
research finding, every gap, and the **entire Playbook** — market facts,
lessons, all ninety-nine battlecard questions with their why / listen-for /
follow-up / drum lines, all eight scenarios, word for word.

_Consequence:_ "What did we tell Simploy about implementation timelines, and
does anything in the channels contradict it?" is one question with one answer.

### C4 · Information, not people

**People are not indexed as entities.** The founder's words: _"only information
is important. I can always go find who said what."_

Speakers are recorded as **provenance on every claim** — you see who said it on
every citation, and can drill to the message — but the room does not build a
person index, does not answer "what has X been saying lately," and does not rank
a claim by who said it.

_Consequence for design:_ entity extraction covers companies, countries,
products, systems, partners-as-organizations, and named artifacts (a SOW, a
handover doc). It does not create person nodes. This also removes an entire
category of discomfort: the room is not a surveillance record of colleagues.

_One exception, narrow:_ when two claims conflict, the answer may say _"Lindsey
and Kimberly landed on different framings"_ — because attribution is necessary
to make the disagreement legible. That is provenance in service of an answer,
not a person index.

### C5 · Short and decisive, with the reasoning behind a fold

The default answer is **three to six sentences that commit to a position.**
Underneath: a fold that opens the reasoning — which claims were weighed, what
was set aside and why, what the coverage was.

Hedging by default is a failure. "It depends" is only acceptable when the
record genuinely contains an unresolved split, and then the answer names the
split.

### C6 · Nothing ever leaves the brain

**Nothing is deleted. Ever.** Not a captured thread, not a mirrored note whose
app row was removed, not a topic that went quiet, not a claim that turned out to
be wrong. Aging handles relevance (Phase 12); deletion handles nothing.

_Consequence, and it inverts the usual instinct:_ when an app row disappears,
its mirror is **retained** and marked `originGone` with the date. The room can
still answer from it, and says so plainly — _"from a note that has since been
removed from the app."_ The record of what was once true is itself worth
keeping; a deal that changed course is only legible if the earlier position
survives.

_What this costs:_ the corpus only grows. That is accepted deliberately — text
is cheap, and the alternative is a brain that quietly forgets the thing you
needed. Aging, superseding and ranking do the work that deletion would
otherwise be asked to do.

### C7 · Prospect questions are first-class intelligence

_"A prospect's questions are the window to winning deals."_

Every demo transcript, from every sidekick this app has built, is mined
specifically for what the **prospect** asked — the logic, the substance, the
minute detail. These are not ordinary claims:

- they extract as `kind: "prospect-question"`, a first-class kind alongside
  fact and decision
- each carries the **shape** of the ask — `definitional | commercial | risk |
technical | process | timeline` — plus what prompted it and which product
  line it lands on
- they accumulate into a standing top-level topic, **What prospects ask**, which
  decomposes by shape and by product line. This is the one topic the index is
  allowed to start with rather than discover, because the founder named it as
  the window
- they never age (Phase 12): what a buyer asked in March is still what they
  asked

**The distribution rule.** Intelligence about prospect questions flows
_throughout the app_, not only inside this room:

- the Playbook bridge proposes new battlecard questions drawn from what real
  buyers actually asked, carrying the shape, the product line and the transcript
  it came from (Phase 13.6)
- an account's gap carousel can draw on what prospects in comparable situations
  asked, so a deal inherits the questions its peers provoked
- both are **proposals**. The room offers; it never writes (I.2).

## I.2 · What it is not

**Not the Playbook.** The Playbook is authored, opinionated, small, and curated
— what we have learned about _selling_. The Intranet is the whole record,
unopinionated and large. The Playbook is _ingested by_ the Intranet. The
Intranet never writes back into it automatically; promotion is a deliberate
human act (Phase 13).

**Not an editor.** The room reads. It does not file notes, open actions, move
stages, or send anything. Where an answer implies work, it _offers_ a link into
the HomeRoom. Offering, never doing. This is a hard architectural boundary: the
Intranet module imports no write action from any other module, and a test
asserts it.

**Not a search box.** See C2.

**Not a chat.** The room answers a question and shows its work. It does not hold
a rolling conversation with memory of the last six turns — that is a different
product with different failure modes. A follow-up question is a new question,
optionally carrying the previous answer as context (Phase 10.6).

## I.3 · The pipeline, end to end

Nine stages. Every phase in Part II builds or hardens one of them.

```
  CAPTURE          raw text arrives — bookmarklet, paste, or the app's own tables
     │
  NORMALIZE        scrubSecrets → redactMoney → dialect detect → speaker/time parse
     │             → link extraction → checksum
     │
  SEGMENT          one capture becomes N documents, split on conversation
     │             boundaries (time gaps, topic shifts, thread breaks)
     │
  EXTRACT          per document: summary, claims, entities, topic matches,
     │             topic proposals, link references            [Claude · Opus 5]
     │
  INDEX            topics accumulate; proposals promote at threshold;
     │             near-duplicates merge with redirects
     │
  DECOMPOSE        oversized topics split into children, recursively   [Opus 5]
     │
  EMBED            claim vectors for semantic recall               [Phase 9]
     │
  RETRIEVE         query plan [Opus 5] → structured + lexical + vector
     │             → fusion → rank → candidate set
     │
  SYNTHESIZE       the written answer, with citations       [Opus 5 / Fable 5]
```

Two properties matter more than any individual stage:

- **Idempotence.** Every stage is keyed by checksum or row id. Re-running the
  pipeline over the same input produces the same output and no duplicates. This
  is what makes a re-index safe, and a re-index will be needed when prompts
  change.
- **Resumability.** Each stage writes its result before the next begins. A
  failure at EXTRACT does not lose the capture; a failure at EMBED does not lose
  the extraction. The corpus is always in a consistent, queryable state, just
  possibly less complete.

## I.4 · The model roster

The founder asked that Claude be the parent brain, at the top tier. It is.

| Stage                      | Model              | Why                                                                                   |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Extraction — transcripts   | `claude-opus-5`    | Dense, high-value, multi-speaker. Claim quality here determines every answer later.   |
| Extraction — chat threads  | `claude-opus-5`    | Chat is where attribution goes wrong; this is not the place to economise.             |
| Extraction — app rows      | `claude-haiku-4-5` | Short, structured, already half-parsed by the existing pipeline.                      |
| Topic proposal / merge     | `claude-opus-5`    | Index stability is the room's spine.                                                  |
| Topic decomposition        | `claude-opus-5`    | Splitting well requires understanding the whole topic at once.                        |
| Query planning             | `claude-opus-5`    | Cheap in tokens, decisive in effect — a bad plan means the right claim is never seen. |
| Synthesis — standard       | `claude-opus-5`    | The answer is the product.                                                            |
| Synthesis — hard/contested | `claude-fable-5`   | Escalation when the candidate set is large or contradictory (see I.4.2).              |
| Contradiction detection    | `claude-opus-5`    | Requires holding several claims in tension.                                           |

### I.4.1 · API specifics

- **Adaptive thinking** (`thinking: {type: "adaptive"}`) on every reasoning-heavy
  call: extraction, topic work, query planning, synthesis, contradiction. Note
  that `budget_tokens` is rejected outright on Opus 5 and Fable 5 — the adaptive
  form is the only correct one for these models.
- **Structured outputs** for everything that returns data rather than prose:
  extraction, planning, topic proposals, contradiction verdicts. Same discipline
  as the existing `ai-clean` — a JSON schema, `additionalProperties: false`,
  every field required, defensive coercion on the way out, caps on every list.
- **Streaming** on synthesis. The answer is the one place a human waits, and a
  streamed answer that starts in two seconds reads as fast even when it finishes
  in twelve.
- **Prompt caching** on the long system prompts (the extraction rubric, the
  synthesis contract, the topic list). These are large, stable, and sent on
  every call — caching them is the single biggest cost lever in the build.
- **The Batches API** for the Phase 4/5 backfill. Thousands of app rows and
  Playbook entries extract at half price and no interactive deadline. Backfill
  is not a user-facing operation; it has no business paying interactive rates.
- **Token counting** before any call that assembles a variable-size context
  (synthesis, decomposition), so a context overflow is caught before the request
  rather than as a 400.

### I.4.2 · When Fable escalates

Synthesis escalates from Opus 5 to Fable 5 when any of:

- the candidate set exceeds 60 claims after ranking, or
- the contradiction detector flags two or more disputed pairs among candidates,
  or
- the query plan marks the question as _comparative_ or _counterfactual_
  ("what changed", "why did we stop", "what would we do differently"), or
- the operator asks for it explicitly.

Escalation is logged and shown in the reasoning fold — the operator can see
which brain answered.

### I.4.3 · What is NOT a model call

Deliberately mechanical, because a model here would add cost, latency and
nondeterminism for nothing:

- checksum, dedupe, redaction, secret scrubbing
- speaker and timestamp parsing (reuse `normPerson`, `actorsLine`)
- topic counts, freshness, rail rendering
- lexical retrieval, filtering, ranking arithmetic
- link extraction

## I.5 · The data model

### I.5.1 · Capture

The raw arrival, kept so a re-index never needs the operator to re-grab.

```
IntranetCapture
  id            text primary key
  origin        text          -- 'teams' | 'meeting' | 'demo' | 'paste'
  raw           text          -- post-scrub, post-redaction; never pre-redaction
  rawChecksum   text unique   -- sha256 of the normalized raw
  title         text          -- what the capture called itself
  capturedAt    timestamptz
  segmented     boolean       -- has SEGMENT run
  meta          jsonb         -- browser title, url hint, capture tool version
```

The pre-redaction text is **never** persisted. Redaction happens in memory
before the first write. There is no "original" to leak.

### I.5.2 · Document

A coherent unit of conversation. One capture becomes one or many.

```
IntranetDoc
  id            text primary key
  captureId     text          -- null for app-mirrored rows
  origin        text          -- capture origins + 'account-note' | 'todo'
                              -- | 'touch' | 'partner-note' | 'card'
                              -- | 'playbook' | 'research' | 'gap'
  originRef     text          -- home-table row id, when there is one
  space         text          -- 'Global Sales Team', '#payroll-ops',
                              -- 'Partner intro — 7/30'. Chat and channel are
                              -- the same kind of thing; this is just its name.
  title         text
  body          text          -- redacted
  speakers      text[]        -- provenance only, never an entity index (C4)
  occurredAt    timestamptz   -- when it was SAID
  capturedAt    timestamptz
  accountId     text          -- when it belongs to a deal
  links         jsonb         -- [{url, label, seenAt}] — see I.6
  checksum      text          -- content hash; unique with origin+originRef
  extractedAt   timestamptz   -- null = extraction pending
  promptVersion text          -- which extraction rubric produced its claims
```

**Mirrored, not moved.** App-owned documents stay in their home tables and are
_reflected_ here. The home table remains the source of truth; `originRef` lets
any citation walk back to the live row. Deleting a note in the HomeRoom removes
it from the brain on the next sync.

### I.5.3 · Claim

A sentence-sized assertion. Claims are what retrieval matches and what answers
are built from.

```
IntranetClaim
  id           text primary key
  docId        text references IntranetDoc
  text         text          -- one assertion, self-contained, readable alone
  speaker      text          -- provenance (C4)
  saidAt       timestamptz
  kind         text          -- 'fact'|'decision'|'commitment'|'opinion'
                             -- |'question'|'process'
  confidence   text          -- 'stated'|'hedged'|'secondhand'
  entities     text[]        -- orgs, countries, products, systems, artifacts
  offsetStart  int           -- character offset into doc.body …
  offsetEnd    int           -- … so Level-2 drilldown can show it in context
  embedding    vector(1024)  -- Phase 9
  supersededBy text          -- Phase 12
  disputedWith text[]        -- Phase 12
```

**Self-contained is a hard requirement.** "He said four to six weeks" is not a
claim; "Implementation from signature to first payroll is quoted at four to six
weeks" is. The extraction prompt is explicit about this, because a claim that
needs its neighbours to make sense is a claim that will be misread when
retrieval pulls it alone.

### I.5.4 · Topic

```
IntranetTopic
  id          text primary key
  label       text
  parentId    text          -- null = top level; arbitrary depth below
  summary     text          -- what this topic is, one sentence
  status      text          -- 'pending'|'live'|'merged'
  mergedInto  text          -- redirect target when status='merged'
  docCount    int
  claimCount  int
  firstSeen   timestamptz
  lastSeen    timestamptz
```

Plus the join tables `IntranetClaimTopic(claimId, topicId)` and
`IntranetClaimEntity(claimId, entity)`, both indexed both ways.

### I.5.5 · Ask

Every question and answer is kept — for the reasoning fold, for evals, and so a
repeated question can be answered from cache when nothing relevant changed.

```
IntranetAsk
  id           text primary key
  question     text
  plan         jsonb         -- the query plan
  candidateIds text[]        -- what retrieval returned, in rank order
  answer       text
  reasoning    text          -- the fold
  citations    jsonb         -- [{n, claimId, docId}]
  coverage     jsonb         -- {docs, claims, from, to, origins}
  model        text          -- which brain answered
  ms           int
  askedAt      timestamptz
```

### I.5.6 · Indexes that matter

- `IntranetDoc(origin, originRef)` unique — the mirror's idempotence key
- `IntranetDoc(checksum)` unique — capture-side dedupe
- `IntranetClaim(docId)`, `IntranetClaimTopic(topicId, claimId)`,
  `IntranetClaimEntity(entity, claimId)`
- GIN on `to_tsvector('english', IntranetClaim.text)` — lexical retrieval
- IVFFlat or HNSW on `IntranetClaim.embedding` — Phase 9
- `IntranetClaim(saidAt DESC)` — recency ranking without a sort

## I.6 · Links, and what to do about them

The founder's note: chats carry hyperlinks — SharePoint documents, SOWs,
recordings — and if the capture can take them, it should; if not, it should say
a link was there so he can go find it.

**It can take them, partially.** `innerText` drops hrefs, but the DOM still has
them. The Teams grab (Phase 2) walks the anchors in the captured region and
emits a companion block:

```
LINKS IN THIS THREAD
[1] Global Payroll — Implementation SOW.docx  ·  sharepoint.com/…/SOW.docx  ·  Jeanne Hogan, 7/9
[2] Recording — partner intro                  ·  teams.microsoft.com/…       ·  Lindsey Forrest, 7/30
```

What this does and does not do:

- **Does:** preserve the URL and the anchor's visible label, attach it to the
  document, and make it citable. An answer can say _"the SOW Jeanne dropped on
  7/9"_ and the citation carries the link.
- **Does not:** open, fetch, or read the linked document. SharePoint requires
  authentication and the app has no credentials — by doctrine it never will.
  The room knows a document exists, what it was called, who dropped it and when.
  It does not know what is inside it.
- **Fallback:** when a link is rendered as a card rather than an anchor (Teams
  does this for previews) and no href is reachable, the capture records
  `{label, url: null}` and the room renders _"a link was shared here — search
  Teams for 'Implementation SOW'"_ with the exact label to search for.

**The honest limit, stated up front:** an answer that depends on the contents of
a linked file will be wrong or incomplete, and the room must say so rather than
guess. If the file matters, paste its text in — then it is a document like any
other.

## I.7 · Chats, channels, and why there is no difference

The founder's read is correct: today the teams work in chats, channels are
coming, and the distinction is not interesting. The room stores `space` — a
name — and treats a group chat called "Global Sales Team" exactly as it treats a
channel called `#payroll-ops`.

What the room actually pays attention to, in priority order:

1. **What was said** — the claim text.
2. **When** — `occurredAt`, because a March answer and a July answer are
   different answers.
3. **Where it sits in the corpus** — its topics, which is how it is found.
4. **Context** — the surrounding turns, which is how a claim is read correctly
   at drilldown.
5. **Who** — provenance, shown always, indexed never (C4).

`space` earns its place for one reason: it is a strong _disambiguation_ signal
at extraction time. A "handover" in `#payroll-ops` means something different
from a "handover" in a partner chat, and telling the extractor which room it is
reading improves its topic matching measurably.

### I.7.1 · The room does not care about spaces

The founder's correction, and it is stronger than "chats and channels are the
same": **the Intranet does not care about spaces at all. It cares about
information.**

`space` is a disambiguation signal and a provenance label. Nothing more. The
room does not organise by it, does not offer it as a filter, does not show a
list of spaces, and does not track which ones are "covered." There is no
per-space coverage model, because there is no such thing as a space the room is
responsible for.

### I.7.2 · The nag is global

The room does tell the operator when it has stopped growing — but as one line
about the corpus, never about a room:

> **Nothing new since 30 Jul, 4:12p — 6 days.**

It appears on the Intranet and quietly on the HomeRoom. It says only that the
brain has stopped taking anything in.

The reason it must be global rather than per-space: many of these conversations
are private chats about a single deal, or a handful of people across
departments, or subjects that have nothing to do with this book. **Only the
operator knows which parts of which conversations are worth keeping.** He does
his own sweep across chats, channels and whatever else, and brings in what
matters. A room that named specific spaces would be presuming to know which
ones deserve attention, and it does not.

_What this rules out, deliberately:_ "the Global Sales Team chat hasn't been
captured in nine days." The room will never say that.

## I.8 · Cost envelope

Rough, and deliberately pessimistic. Priced at first-party rates: Opus 5
$5/$25 per million in/out, Haiku 4.5 $1/$5, Fable 5 $10/$50.

**One-time backfill** (Phases 4–5, via the Batches API at ~50%):

| Corpus             | Docs  | Avg in | Model | Est.      |
| ------------------ | ----- | ------ | ----- | --------- |
| Account notes      | ~2500 | 400t   | Haiku | ~$1       |
| Todos / touches    | ~1200 | 150t   | Haiku | <$1       |
| Playbook (99 Qs +) | ~150  | 600t   | Haiku | <$1       |
| Cards + research   | ~200  | 1200t  | Haiku | <$1       |
| **Backfill total** |       |        |       | **~$3–5** |

**Ongoing ingest:**

| Event                        | Model  | Est. per event |
| ---------------------------- | ------ | -------------- |
| A Teams thread (40 messages) | Opus 5 | ~$0.04         |
| A meeting transcript (1 hr)  | Opus 5 | ~$0.15         |
| A new app row                | Haiku  | ~$0.0005       |
| A topic split                | Opus 5 | ~$0.05         |

**Per question:**

| Component                | Model   | Est.       |
| ------------------------ | ------- | ---------- |
| Query plan               | Opus 5  | ~$0.01     |
| Synthesis (40 claims in) | Opus 5  | ~$0.06     |
| Synthesis escalated      | Fable 5 | ~$0.20     |
| **Typical question**     |         | **~$0.07** |

Twenty questions a day is roughly **$1.40/day**, or about **$30/month** at
steady use, with ingest on top of that. Prompt caching on the system prompts
cuts the input side materially and is assumed in these numbers.

**Ceilings** (Phase 13): a daily spend cap, a per-question token cap, and a
backfill kill switch. Exceeding a ceiling degrades the room to structured
retrieval — the rail and the claims still work without a model — and says so
plainly rather than failing.

## I.9 · Failure taxonomy

Named here so each phase can point at which one it guards against.

| #   | Failure                | Looks like                                                   | Primary guard    |
| --- | ---------------------- | ------------------------------------------------------------ | ---------------- |
| F1  | **Misattribution**     | A claim credited to the wrong speaker                        | Phase 6.5        |
| F2  | **Hallucinated claim** | A claim nobody made                                          | Phase 6.6, 13.2  |
| F3  | **Silent recall miss** | Confident answer from an incomplete candidate set            | Phase 9.7, 13.2  |
| F4  | **Index churn**        | Topics appear and vanish; the rail feels untrustworthy       | Phase 7.4        |
| F5  | **Over-splitting**     | Thirty near-identical leaves in the rail                     | Phase 8.5        |
| F6  | **Stale-as-current**   | A superseded claim answered as if it were today's position   | Phase 12         |
| F7  | **Citation rot**       | A citation points at a row that was edited or deleted        | Phase 11.6       |
| F8  | **Redaction leak**     | A dollar figure or passcode reaches storage or a model       | Phase 2.4, 13.5  |
| F9  | **Duplicate corpus**   | The same thread ingested twice, doubling its apparent weight | Phase 2.5, 3.6   |
| F10 | **Cost runaway**       | A backfill loop re-extracting the world on every deploy      | Phase 13.4       |
| F11 | **Quote-dumping**      | The "answer" is four pasted paragraphs                       | Phase 10.3       |
| F12 | **Confident nonsense** | Fluent synthesis over three weak claims                      | Phase 10.4, 10.5 |

---

# Part II · The thirteen phases

Each phase carries: **Objective** (one sentence), **What gets built**,
**Mechanics** (the part that is actually hard), **Model calls**, **Data**,
**UI**, **Failure modes**, **Acceptance**, **Cost/latency**, and
**Dependencies**.

Phases are ordered by dependency. Some could run in parallel; the sequence
below is the one where nothing gets built twice.

---

## Phase 1 · Foundations — the room, the doctrine, the rails

### 1.1 · Objective

Stand the room up empty, in the working nav, with the doctrine written into the
code and enforced by tests before there is anything to enforce it on.

### 1.2 · What gets built

- `/intranet` route: `page.tsx` (server), `intranet-client.tsx`,
  `intranet.module.css`
- Nav placement: **in the working row**, after Playbook — the founder's call.
  Room · Accounts · Playbook · **Intranet** · Pricing · Demos, with the archive
  group unchanged.
- `src/lib/intranet/` — the module root. `types.ts`, `doctrine.ts` (the
  constants and guards below), `store.ts` (read helpers over the prototype
  storage).
- Feature flag `INTRANET_ENABLED` so a half-built room can ship dark behind a
  live deploy.

### 1.3 · Mechanics

**The doctrine as code.** `doctrine.ts` exports the constants the rest of the
build reads, so a change of mind is a one-line change rather than a hunt:

```
MODEL_EXTRACT_RICH   = "claude-opus-5"
MODEL_EXTRACT_LIGHT  = "claude-haiku-4-5"
MODEL_PLAN           = "claude-opus-5"
MODEL_SYNTH          = "claude-opus-5"
MODEL_SYNTH_HARD     = "claude-fable-5"
TOPIC_PROMOTE_AT     = 3      // documents before a proposal becomes live
TOPIC_SPLIT_AT       = 40     // claims before a topic is considered for split
CANDIDATE_CAP        = 60     // claims into synthesis before escalation
ANSWER_SENTENCES     = [3, 6] // the decisive range (C5)
VERBATIM_MAX_WORDS   = 25     // beyond this, it must be marked as a quotation
```

**The write ban, enforced.** The Intranet module imports no server action from
`app/room`, `app/accounts`, `app/today`, or `app/playbook`. A test walks the
import graph from `src/app/intranet/**` and `src/lib/intranet/**` and fails on
any import that resolves to a module containing `"use server"` with a write.
This is the boundary that keeps "not an editor" true as the build grows.

**Storage decision, staged.** Phases 1–3 run on namespaced `AccountNote` rows
(`intranet:capture`, `intranet:doc`) — the zero-migration trick this app already
uses for `playbook:market` and `gaps:<id>`. Phase 4 is where the corpus outgrows
it and the real tables land, delivered as `docs/intranet-tables.sql` for the
founder to run. Building on the prototype store first is deliberate: it proves
the shapes before a schema is committed to.

### 1.4 · UI

The shell, all of it inert:

- Page head: **Intranet** — "Everything the app knows, and everything you've
  given it. Ask it something."
- The ask bar: one input, one orange **Ask** button. The orange is this
  surface's single dominant move, per canon.
- The rail on the right: empty state reading "The index builds itself as
  documents arrive."
- Below the ask bar: the answer region, empty.

### 1.5 · Failure modes

- **Naming drift.** The tab says "Intranet" because that is what the founder
  calls it. Not "Knowledge", not "Search", not "Ask".
- **Premature schema.** Guarded by staging storage to Phase 4.

### 1.6 · Acceptance

- `/intranet` renders in the Antaeus system; nav shows it in the working row.
- The import-graph test passes with zero write imports.
- A test asserts `doctrine.ts` names Opus 5 as the parent brain and Fable 5 as
  the escalation, so a later "cost saving" that quietly downgrades the room to
  Haiku fails CI.

### 1.7 · Cost / latency

Zero. No model calls.

### 1.8 · Dependencies

None.

---

## Phase 2 · Capture — getting the outside in, whole

### 2.1 · Objective

Take a Teams chat or channel, a meeting transcript, or a demo transcript, and
land it in the corpus complete, redacted, deduplicated, with its links and its
times intact.

### 2.2 · What gets built

- **The Teams grab, v2** — the Phase-0 bookmarklet extended (see 2.3).
- `/intranet` capture affordances: a paste box for transcripts, and the grab
  installed from Capture pointed here.
- `src/lib/intranet/normalize.ts` — the scrub/redact/parse/checksum chain.
- `src/lib/intranet/links.ts` — anchor extraction and the fallback grammar.
- `src/app/intranet/actions.ts` — `intranetCapture(raw, origin, meta)`.

### 2.3 · Mechanics — the Teams grab, v2

The v1 grab scrolls the pane up and takes `innerText`. Four upgrades:

**(a) Anchors.** Before reading text, walk `querySelectorAll('a[href]')` inside
the captured region and collect `{href, text}`. Teams renders some links as
preview cards with the URL only in a `title` or `aria-label`; those are picked
up as a second pass. The result is appended as the `LINKS IN THIS THREAD` block
(I.6). Where no href is reachable, the label is kept with `url: null`.

**(b) Message boundaries.** `innerText` on the whole pane loses the seam between
one message and the next when two consecutive messages come from the same
person. The v2 grab walks message nodes (`[data-tid="chat-pane-item"]` and its
siblings, tightest-first with fallbacks) and emits a delimited form:

```
⟦MSG⟧ Lindsey Forrest ⟦AT⟧ 2026-07-30T12:03 ⟦BODY⟧
So does it go like this:
• Plan Highlights - this is the goal
…
```

This single change removes most of the attribution risk downstream: the
extractor is no longer inferring who said what from indentation.

**(c) Date resolution.** Teams renders "12:03 PM" for today and "Mon" for this
week. The grab reads the day dividers in the pane and resolves each message to
a full timestamp before it leaves the browser, where the context exists. A
message whose date cannot be resolved is stamped with the capture date and
flagged `dateInferred: true` — and the room shows that flag on the citation
rather than pretending.

**(d) Completeness reporting.** The grab counts messages it captured and reports
it: `⟦CAPTURED 214 messages · scrolled 8 times · oldest 2026-06-02⟧`. If
scrolling stopped because the pane stopped growing, it says so. If it stopped
because it hit the eight-pass ceiling, it says _that_ — so the operator knows
the history is partial and can run it again from further up.

**Chats and channels are the same code path.** The selector list covers both
because they are the same component in Teams. `space` is read from the header.

### 2.4 · Mechanics — normalize

Order matters, and it is fixed:

1. `scrubSecrets` — passcodes, dial-ins, meeting IDs. Runs first, because a
   passcode that survives to the model is already a leak.
2. `redactMoney` — every dollar figure, with the headcount exemption intact.
3. Dialect detect — `TEAMS THREAD` / transcript / free paste.
4. Speaker normalisation — `normPerson` on each `⟦MSG⟧` header. "Last, First"
   collapses, `<email>` strips, the operator resolves to himself.
5. Link extraction into structured form.
6. Checksum — sha256 over the normalized body, whitespace-collapsed. This is
   what makes re-grabbing the same thread a no-op.

**The pre-redaction text is never persisted.** Redaction happens between the
server action receiving the string and the first `INSERT`.

### 2.5 · Mechanics — dedupe and overlap

Re-grabbing a chat after twenty new messages produces a capture that is 90% the
same as the last one. Three rules:

- **Identical checksum** → no-op, `capturedAt` touched, nothing re-extracted.
- **Overlapping capture** (the new capture's oldest message already exists in a
  prior capture of the same `space`) → the union is stored, the prior capture is
  superseded, and only _messages not previously seen_ are segmented and
  extracted. The message-boundary delimiters from 2.3(b) are what make this
  possible: overlap is computed on message identity (speaker + timestamp +
  first 60 chars), not on fuzzy text similarity.
- **Disjoint capture** of the same space → both kept, linked as siblings.

Without this, every re-grab doubles a thread's apparent weight in the corpus and
the room starts believing things because they were captured twice (F9).

### 2.6 · Data

`IntranetCapture` rows. No documents yet — segmentation is Phase 3.

### 2.7 · UI

- On `/intranet`: a quiet **Add to the brain** control — paste box plus a note
  that the ☰ grab also lands here.
- After a capture: a receipt stating exactly what happened — _"214 messages from
  Global Sales Team, 2 Jun → 30 Jul. 3 links kept. 41 messages already in the
  brain, skipped."_

### 2.8 · Failure modes

| Risk                                 | Guard                                                      |
| ------------------------------------ | ---------------------------------------------------------- |
| Virtualisation loses old messages    | Scroll-up passes + completeness report (2.3d)              |
| Same-speaker messages merge          | `⟦MSG⟧` delimiters (2.3b)                                  |
| Relative dates ("Mon") resolve wrong | Day-divider resolution in the browser; `dateInferred` flag |
| Re-grab doubles the corpus (F9)      | Checksum + message-identity overlap (2.5)                  |
| A passcode reaches the model (F8)    | `scrubSecrets` first in the chain, before any persistence  |

### 2.9 · Acceptance

- A 200-message chat lands with speakers and resolved timestamps on every
  message, and a completeness line the operator can read.
- Re-grabbing that chat two hours later adds only the new messages.
- A thread containing a SharePoint link stores the URL and its label.
- No dollar figure survives ingest; a test feeds a thread full of pricing and
  asserts the stored body has none.
- A thread whose links are preview cards stores the labels with null URLs and
  renders the "search Teams for…" fallback.

### 2.10 · Cost / latency

No model calls. Capture is browser-side plus one insert; a 200-message thread is
~150KB of text and lands in well under a second.

### 2.11 · Dependencies

Phase 1.

---

## Phase 3 · Segmentation — one capture, many documents

### 3.1 · Objective

Turn a 200-message chat into the handful of _conversations_ it actually
contains, because a claim's meaning depends on which conversation it belongs to.

### 3.2 · Why this phase exists at all

The tempting shortcut is one capture = one document. It fails in three ways:

- A day of a busy chat contains four unrelated conversations. Extracting them as
  one document produces claims stripped of the conversation that gave them
  meaning, and topic assignment becomes mush.
- Retrieval returns documents. A 200-message document is not a useful thing to
  return.
- Drilldown Level 2 needs "the passage in its context." Context is the
  conversation, not the day.

### 3.3 · Mechanics

Segmentation is **mechanical first, model second** — cheap signals do most of
the work and the model only arbitrates.

**Mechanical boundaries** (any one opens a new segment):

- a time gap greater than **90 minutes** between consecutive messages
- a day boundary in the operator's timezone
- an explicit thread break (Teams replies-to-a-message, where captured)
- a speaker-set change of more than half (the room emptied and refilled)
- a `⟦MSG⟧` count ceiling of **60**, so no segment is unreadably long

**Model arbitration** — one Haiku call per capture, given only the _first line
of each candidate segment_ and asked whether adjacent segments are one
conversation or two. Cheap, because it never sees the bodies. It can merge
adjacent segments but never split further; splitting is mechanical.

Transcripts (meeting, demo) segment differently: a one-hour transcript is **one
document** unless it exceeds 8,000 tokens, in which case it splits on speaker
turns at the nearest boundary with a 200-token overlap so a claim spanning the
seam survives in one half.

### 3.4 · Titling

Each document gets a title from a Haiku call over its first 400 tokens:
`{space} — {what this stretch was about}`, e.g. _"Global Sales Team — plan
structure and milestone framing"_. Titles matter more than they look: they are
what the operator reads at Level 3 drilldown and in the rail's document lists.

### 3.5 · Data

`IntranetDoc` rows, `captureId` set, `extractedAt` null.

### 3.6 · Failure modes

| Risk                                         | Guard                                                          |
| -------------------------------------------- | -------------------------------------------------------------- |
| Over-segmentation (every message a document) | 90-minute gap is deliberately generous; merge pass can join    |
| Under-segmentation (a day as one blob)       | 60-message ceiling forces a split                              |
| A claim spans a seam                         | Transcript overlap; chat seams fall at time gaps, not mid-turn |
| Re-segmentation churn on re-capture          | Segments keyed by first-message identity, stable across grabs  |

### 3.7 · Acceptance

- A day of the Global Sales Team chat containing a planning discussion, a tax
  question and a partner update becomes three documents with sensible titles.
- Re-grabbing the same day produces the same three document ids.
- A 90-minute meeting transcript stays one document.

### 3.8 · Cost / latency

One Haiku merge call and one Haiku title call per segment: well under a cent per
capture. Sub-second.

### 3.9 · Dependencies

Phase 2.

---

## Phase 4 · The app mirror — the brain reads the app

### 4.1 · Objective

Every row the app owns becomes a document in the corpus, without duplicating it
and without the two drifting apart.

### 4.2 · What gets built

- `docs/intranet-tables.sql` — the real schema (I.5), for the founder to run.
- `src/lib/intranet/mirror.ts` — the sync engine.
- A manual **Re-sync the brain** control, plus an incremental sync on write.

### 4.3 · What gets mirrored

| Home table                      | Becomes                              | `space`            |
| ------------------------------- | ------------------------------------ | ------------------ |
| `AccountNote` (lane mine)       | The working record                   | account name       |
| `AccountNote` (lane background) | Case/support traffic                 | account name       |
| `AccountNote` (`research:*`)    | Research findings                    | "Research"         |
| `AccountNote` (`gaps:*`)        | Open questions on a deal             | account name       |
| `AccountNote` (`playbook:*`)    | → Phase 5, not here                  | —                  |
| `Todo` (k:a tagged)             | Actions, with fallback and outcome   | account name       |
| `Touch`                         | Follow-ups, roundups, what came back | partner or account |
| `PartnerNote`                   | Partner threads                      | partner name       |
| `DashCard`                      | Stage, checklist judgments, closure  | account name       |

**Composition matters.** A `Todo` alone is a sentence; a `Todo` _with_ its
account, its due date, its fallback, whether it was completed and when, is a
document worth retrieving. The mirror composes each row into readable prose
before storing it:

> _"On Advocate Pay, an action was opened 7/29 from a paste: get the
> pre-recorded demo from Shane by 7/30, with the fallback of sending the ESC
> demo scrubbed of proprietary detail. It was completed 7/30."_

This is what makes "what have I actually committed to this week" answerable.

### 4.4 · Mechanics — incremental and idempotent

- Keyed on `(origin, originRef)`, unique.
- Each mirrored row carries the home row's `updatedAt`. Sync compares; unchanged
  rows are skipped entirely — no re-extraction, no cost.
- A changed row updates the document, clears `extractedAt`, and re-extracts.
- A row that has disappeared from its home table is **kept** (C6). Its mirror is
  stamped `originGone` with the date; its claims stay live and answerable. The
  brain remembers what the app forgot — that is the point of it. Every citation
  to such a document renders _"from a note that has since been removed from the
  app"_, so the operator is never misled about what still exists upstream.
- Full reconcile (the manual control) walks every home table; incremental sync
  runs on the write paths that already exist. Neither ever issues a delete.

### 4.5 · Backfill

The first run is thousands of rows. It goes through the **Batches API** at half
price, chunked, with progress persisted so an interruption resumes rather than
restarts. Backfill is explicitly _not_ interactive: it is started, it reports,
and the room works (less completely) while it runs.

### 4.6 · Failure modes

| Risk                                          | Guard                                                  |
| --------------------------------------------- | ------------------------------------------------------ |
| Re-extracting the world on every deploy (F10) | `updatedAt` comparison; extraction keyed by checksum   |
| A deleted note read as still live in the app  | `originGone` stamp shown on every citation (C6)        |
| The mirror becoming the source of truth       | Home table always wins; mirror has no edit path        |
| Volume blowing the prototype store            | Real tables land in this phase, before the volume does |

### 4.7 · Acceptance

- A note filed in the HomeRoom is answerable from the Intranet within one sync.
- Deleting that note in the app leaves it answerable here, stamped `originGone`,
  with every citation saying so (C6, Phase 11.6). Nothing is ever removed.
- A second full reconcile immediately after the first makes zero model calls.
- The composed form of an action reads as prose, not as a field dump.

### 4.8 · Cost / latency

Backfill ~$3–5 one time (I.8). Steady-state sync is free for unchanged rows and
fractions of a cent for changed ones.

### 4.9 · Dependencies

Phases 1–3. Requires the founder to run `docs/intranet-tables.sql`.

---

## Phase 5 · The Playbook and the demo corpus, whole

### 5.1 · Objective

Put every word of the Playbook into the brain, structured well enough that a
battlecard question is retrievable by what it is _for_ rather than by its text —
and mine every demo transcript this app has ever produced for what the
**prospect** asked (C7).

### 5.2 · What gets ingested

- **Market facts** and **lessons** (`playbook:market`, `playbook:lessons`) — each
  one a document, carrying the account that produced it and the date.
- **All 99 battlecard questions** — each as a document composed of its question,
  why, listen-for, follow-up and drum line, tagged with its category, phase,
  audience, product line and scenario fit.
- **All 8 scenarios** — each as a document describing the buyer situation and
  what it changes.
- **Discovery bank metadata** — the facet counts, so "what do we have nothing to
  ask about" is answerable.
- **Every demo transcript, from every sidekick** — the demo rooms, the payroll
  demo sidekick, v3 — as documents, and mined for prospect questions (5.2a).

### 5.2a · Prospect questions (C7)

The founder's framing: a prospect's questions are the window to winning deals.
So they are not treated as ordinary claims, and this is where that begins.

**Extraction treats them as a distinct kind.** Every question a prospect asks in
a demo becomes `kind: "prospect-question"`, carrying:

- **`askShape`** — `definitional` (they don't know what a thing is),
  `commercial` (price, terms, structure), `risk` (exposure, compliance,
  liability), `technical` (integration, data, platform), `process` (how it
  works day to day), `timeline` (how long, when).
- **what prompted it** — the slide, the claim, or the moment in the demo that
  provoked the question. This is the part that makes a question actionable: a
  definitional question after the EOR slide means the framing failed.
- **the product line it lands on** — EOR, contractor management, payroll.

**They accumulate into a standing topic.** _"What prospects ask"_ is the one
top-level topic the index is allowed to begin with rather than discover (Phase
7 otherwise forbids authored topics) — because the founder named it, and because
seeding it means the first demo transcript has somewhere to land. It decomposes
by shape and by product line as the material arrives (Phase 8's mechanism, on a
seeded root).

**They never age** (Phase 12). What a buyer asked in March is still what they
asked; nothing about the passage of time makes that less true.

**They flow outward** (Phase 13.6). The harvest bridge proposes new battlecard
questions from what real buyers actually asked, and an account's gap carousel
can draw on the questions prospects in comparable situations raised. Proposals
only — the room offers, it never writes.

### 5.3 · Mechanics

**Structure survives ingest.** A battlecard question is not flattened to prose;
its facets become entities (`eor`, `contractor-management`, `payroll`,
`needs_analysis`, `exec`) so retrieval can find it by situation. This is why the
Playbook is its own phase rather than a row in the mirror table.

**Namespace precedence.** `playbook:*` rows live in `AccountNote` and would
otherwise be swept up by Phase 4's generic note mirror. The mirror checks
`isNamespacedAccountId` first and defers them here. Tested, because the failure
is silent duplication.

**Re-ingest on change.** The Playbook is edited by the app (a lesson lands from
a paste read). Its mirror follows the same `updatedAt` discipline as Phase 4.

### 5.4 · What this unlocks

- _"What do we ask a prospect who's never run international payroll?"_ answered
  from the brain, citing specific questions, without navigating to the Playbook.
- _"What do prospects actually ask about contractor classification?"_ — answered
  across every demo ever captured, grouped by the shape of the ask, with the
  moment that provoked each one.
- _"Which of our battlecard questions has no prospect ever needed answered?"_ —
  the inverse, and a real signal that a question is ours rather than theirs.
- _"Has anything in the channels contradicted what our battlecard says about
  EOR versus contractor management?"_ — a question that spans two worlds and is
  only answerable because both are in one corpus (C1, C3).
- _"What have we learned that we haven't turned into a question yet?"_ —
  comparing lessons against the bank.

### 5.5 · Failure modes

| Risk                                  | Guard                                         |
| ------------------------------------- | --------------------------------------------- |
| Double-ingest with the Phase 4 mirror | Namespace precedence check, tested            |
| Facets lost, questions become prose   | Facets stored as entities, asserted in tests  |
| Playbook edits not reflected          | `updatedAt` discipline shared with the mirror |

### 5.6 · Acceptance

- A question answerable only from the battlecard is answered, citing the
  question by its category and phase, with a Level-4 link into the Playbook.
- Every one of the 99 questions is present as a document with its facets.
- Ingest runs twice with no duplicates.
- Every prospect question in a demo transcript extracts with its shape and the
  moment that prompted it, and lands under _"What prospects ask"_.

### 5.7 · Cost / latency

Under a dollar; ~150 short documents through Haiku via Batches.

### 5.8 · Dependencies

Phase 4.

---

## Phase 6 · Extraction — turning documents into claims

### 6.1 · Objective

Read each document once, with the best model available, and produce claims good
enough that every answer built on them is defensible.

This is the phase that determines the room's ceiling. A weak extraction cannot
be rescued by clever retrieval or eloquent synthesis — the answer will be fluent
and wrong. Everything downstream is arithmetic on what happens here.

### 6.2 · What gets built

- `src/lib/intranet/extract.ts` — the call, the schema, the sanitiser.
- `src/lib/intranet/prompts/extract.ts` — the rubric, versioned.
- The extraction queue: documents with `extractedAt` null, processed in batches.

### 6.3 · The call

**Model:** Opus 5 for chat threads, meeting and demo transcripts. Haiku 4.5 for
app-mirrored rows (short, already structured). Adaptive thinking on both.

**Input:** the document body, plus:

- `space` — which room this was said in (I.7), a strong disambiguation signal
- `occurredAt` — so "next Tuesday" resolves
- the **live topic list** (labels + one-line summaries), so the model matches
  against what exists rather than inventing parallel vocabulary
- the account name, when the document belongs to a deal

**Structured output:**

```
{
  summary:   string,                    // 2 sentences: what this document is
  claims: [{
    text:       string,                 // self-contained assertion
    speaker:    string,
    kind:       "fact"|"decision"|"commitment"|"opinion"|"question"|"process",
    confidence: "stated"|"hedged"|"secondhand",
    entities:   string[],               // orgs, countries, products, artifacts
    quote:      string                  // the exact source span, for offsets
  }],                                   // max 24
  topicMatches:   string[],             // ids from the live list, max 6
  topicProposals: [{ label, why }],     // max 3
  linkRefs:       [{ label, why }]      // links this document's claims lean on
}
```

`quote` is what makes Level-2 drilldown possible: the sanitiser finds it in the
body and stores `offsetStart/offsetEnd`. A `quote` that cannot be located
verbatim is the single strongest hallucination signal available — see 6.6.

### 6.4 · The rubric — what the prompt actually says

Condensed; the real prompt is longer and versioned.

**On claims:**

- A claim is one assertion, readable alone. "He said four to six weeks" is not a
  claim. "Implementation from signature to first payroll is quoted at four to
  six weeks" is.
- Extract what would be worth finding six months from now. Not pleasantries, not
  scheduling logistics, not reactions.
- Prefer fewer, better claims. Twenty-four is a ceiling, not a target; most
  documents should yield three to eight.
- Never merge two people's statements into one claim.

**On attribution — the sacred rule, carried over from the paste pipeline:**

- A claim belongs to the person in whose `⟦MSG⟧` block it appears. Full stop.
- Quoted or forwarded material belongs to its **original** author, not to
  whoever pasted it.
- The operator is Antaeus Coe. He writes from his own account and previously
  worked at Remote.com — so market knowledge in _his_ message is _his_, not a
  prospect's or a colleague's.
- When attribution genuinely cannot be determined, the speaker is `"unknown"`
  and the claim still files. Guessing is worse than admitting.

**On kind:**

- `decision` — a choice was made ("we're going EOR first").
- `commitment` — someone owes something ("I'll have the SOW over by Friday").
- `fact` — a state of the world ("13th salary pays in two instalments").
- `process` — how something is done ("sell a deal, email implementation with SOW
  and handover, then drop the SOW in SharePoint").
- `opinion` — a view, not a decision.
- `question` — an open question nobody answered. These matter: they are the
  organisation's known unknowns.
- `prospect-question` — a question a **buyer** asked, in a demo (C7). Carries
  `askShape`, what prompted it, and the product line. Never merged with
  `question`: an internal unknown and a buyer's probe are different animals.

**On confidence:**

- `stated` — said plainly, first-hand.
- `hedged` — "I think", "probably", "we might".
- `secondhand` — "X told me", "I heard".

**On entities (C4):**

- Companies, countries, products, systems, named artifacts.
- **Never people.** A person's name in a claim's text is fine — it is prose. It
  does not become an entity node.

**On topics:**

- Match against the provided list first, always. Propose a new topic only when
  the document genuinely does not fit — and say why in one line.
- A proposal is a suggestion, not a decision; the index decides (Phase 7).

### 6.5 · Attribution testing

The paste pipeline has already been burned once by attribution — the founder's
own line about a deposit at Remote was credited to a colleague because it sat in
a thread that colleague had replied to most recently. That failure informs this
phase directly.

Fixtures, run in CI:

- a thread where the operator quotes someone else, then adds his own view
- a forwarded message with three layers of quoting
- consecutive messages from the same speaker (the case `⟦MSG⟧` delimiters fix)
- a message that quotes a document
- a bot/automation post

Each asserts the exact speaker on the exact claim. Any regression fails the
build.

### 6.6 · Hallucination guard

The `quote` field carries the load:

1. Every claim's `quote` must be findable in the document body, allowing
   whitespace normalisation and up to two characters of drift.
2. A claim whose quote cannot be located is **dropped**, not stored, and the
   drop is logged with the claim text.
3. If more than 20% of a document's claims fail this check, the whole extraction
   is rejected, the document is re-queued once, and if it fails again it is
   flagged for review rather than silently half-extracted.

This is cheap, deterministic, and catches the failure mode that matters (F2).

### 6.7 · Re-extraction

The extraction rubric will change. Every document stores `promptVersion`. When
the rubric version bumps:

- new documents extract with the new rubric immediately;
- existing documents re-extract **lazily** — a background sweep at low priority,
  through the Batches API, oldest-first;
- claims from the old version stay live until replaced, so the room never goes
  blank during a re-index;
- re-extraction is idempotent per `(docId, promptVersion)`.

### 6.8 · Failure modes

| Risk                                    | Guard                                   |
| --------------------------------------- | --------------------------------------- |
| Misattribution (F1)                     | `⟦MSG⟧` delimiters, rubric, CI fixtures |
| Hallucinated claims (F2)                | Quote-location check (6.6)              |
| Claims that need context to parse       | "Self-contained" rule + review sample   |
| Vocabulary drift (parallel topic names) | Live topic list passed into every call  |
| Cost spike on a re-index (F10)          | Batches, lazy sweep, version keying     |

### 6.9 · Acceptance

- A 40-message chat yields claims a human reading it would also have pulled,
  attributed correctly, each readable alone.
- Every attribution fixture passes.
- A deliberately garbled document produces zero claims rather than nonsense.
- Re-running extraction on an unchanged document makes no model call.
- The Jeanne Hogan line in the screenshot thread — _"sell a deal, email
  implementation with SOW and handover, then drop the SOW in SharePoint"_ —
  extracts as one `process` claim, attributed to her, with the SharePoint link
  attached as a `linkRef`.

### 6.10 · Cost / latency

~$0.04 for a 40-message thread, ~$0.15 for an hour transcript. Extraction is
asynchronous — the operator is never waiting on it.

### 6.11 · Dependencies

Phases 3–5.

---

## Phase 7 · The index — topics that stay still

### 7.1 · Objective

Build a topic index that is derived, never authored, and stable enough that the
operator trusts it — because an index that reshuffles is worse than no index.

### 7.2 · The accumulation model

The index is **never recomputed from scratch.** This is the central decision of
the phase and it follows from F4: a room whose rail looks different every
morning is a room nobody believes.

The flow per document:

1. Extraction returns `topicMatches` (existing) and `topicProposals` (new).
2. Matches attach immediately: claims join those topics, counts update.
3. Proposals go to a **pending pool**, invisible in the rail, with a tally.
4. When a pending label reaches `TOPIC_PROMOTE_AT` (3) supporting documents, it
   becomes `live` and appears in the rail — with all its accumulated claims
   already attached, so it arrives populated rather than empty.
5. Pending labels that go 90 days without new support are archived, not deleted
   — the tally survives in case the subject returns.

The threshold is what keeps the rail from filling with one-off noise. A single
document that mentions a novel subject does not get to reshape the index.

### 7.3 · Near-duplicate merging

"EOR risk" and "EOR risks" and "Risks with EOR" are one topic. Merging runs at
promotion time and periodically:

- **Mechanical first:** label folding (lowercase, strip punctuation, singularise,
  drop stopwords) reuses the same approach as the follow-up brain's org matching.
- **Model second:** an Opus 5 call over candidate pairs that fold close but not
  identically, deciding merge or keep, with a one-line justification.
- A merge writes `status='merged'`, `mergedInto=<winner>`, and **keeps the row**.
  Every id ever issued resolves forever; an old link lands on the survivor.

### 7.4 · The stability contract

Three invariants, all tested:

- **I1 · No disappearance.** A live topic never leaves the rail except by merge,
  and a merge redirects.
- **I2 · Order independence.** Ingesting the same 20 documents in a different
  order produces the same set of live top-level topics. (Ids may differ; labels
  and membership must not.)
- **I3 · Monotonic membership.** A claim never silently leaves a topic. It can
  gain topics, and it can move on a split (Phase 8) — which is a recorded event,
  not a silent drop.

I2 is enforced by a CI test that shuffles a fixture corpus and compares the
resulting index. It is the most valuable test in the build.

### 7.5 · Topic summaries

Each live topic carries a one-sentence summary, regenerated when its claim count
grows by 25% or more. Opus 5, given the topic's claims. The summary is what the
operator reads when hovering the rail, and what the query planner reads when
deciding where a question points — so it is worth keeping current.

### 7.6 · Failure modes

| Risk                                  | Guard                                 |
| ------------------------------------- | ------------------------------------- |
| Index churn (F4)                      | Accumulation + I1/I2/I3, tested       |
| Rail noise from one-off subjects      | Promotion threshold of 3              |
| Parallel vocabulary                   | Live list into extraction; merge pass |
| Merge loses history                   | Merged rows kept with redirect        |
| Stale summaries misdirect the planner | Regeneration on 25% growth            |

### 7.7 · Acceptance

- Twenty documents ingested in two different orders produce the same live index.
- A topic that existed before a hundred-document backfill still exists after it,
  with the same membership plus additions.
- "EOR risk" and "EOR risks" resolve to one topic; the loser's id still lands.
- A subject mentioned in exactly one document does not appear in the rail.

### 7.8 · Cost / latency

Merge arbitration is occasional and cheap (~$0.01 per pair). Summary
regeneration is bounded by the growth trigger.

### 7.9 · Dependencies

Phase 6.

---

## Phase 8 · Decomposition — depth without over-splitting

### 8.1 · Objective

Let a topic open into its children, to whatever depth the material genuinely
supports, and refuse to split when it doesn't.

### 8.2 · The split trigger

A topic is _considered_ for splitting when it passes `TOPIC_SPLIT_AT` (40
claims). Consideration is not splitting — the model can and should refuse.

### 8.3 · The split call

**Model:** Opus 5, adaptive thinking, structured output.

**Input:** the topic's label and summary, and every claim in it (text + kind +
date only — not full documents, which would blow context and add nothing).

**Output:**

```
{
  verdict: "split" | "keep",
  why: string,
  children: [{ label, summary, claimIds: string[] }]   // 2–6 when splitting
}
```

**The prompt's bias is explicitly toward `keep`:**

- Split only when the claims fall into groups that a person would name
  differently and look for separately.
- Two groups that differ only in wording are not a split.
- A group with fewer than 5 claims is not a child; leave it in the parent.
- Every claim must land somewhere. A claim that fits no child stays with the
  parent — the parent keeps its own claims alongside its children.

### 8.4 · Recursion

A child can itself pass the threshold later and split again. Depth is uncapped
in the schema and in the UI; in practice the corpus will support three to four
levels before groups stop being distinguishable, and the `keep` bias is what
stops it going further than the material justifies.

### 8.5 · Over-splitting guards (F5)

- Threshold of 40 claims, deliberately generous.
- Minimum child size of 5.
- Maximum 6 children per split — more than that means the split was wrong.
- A split is **reversible**: `unsplit` reattaches children's claims to the parent
  and marks the children merged-into-parent. Available to the operator from the
  rail, because the model will occasionally be wrong and the operator should not
  have to live with it.

### 8.6 · Data

New `IntranetTopic` rows with `parentId`. Claim→topic joins rewritten inside a
transaction. The split is recorded as an event so I3 (monotonic membership) is
satisfiable: a claim moved by a split is auditable, not vanished.

### 8.7 · Acceptance

- "Brazil & LATAM hiring" at 60 claims splits into entity-vs-EOR, contractor
  classification, and payroll calendar — and each child holds claims that
  actually belong to it.
- A topic of 45 claims that genuinely covers one subject returns `keep`.
- A split is undoable and leaves no orphaned claims.
- A child that grows past the threshold splits again.

### 8.8 · Cost / latency

~$0.05 per split evaluation. Runs asynchronously after ingest, never in the
operator's path.

### 8.9 · Dependencies

Phase 7.

---

## Phase 9 · Retrieval — finding the right claims

### 9.1 · Objective

Given a question in the operator's words, assemble the set of claims that
actually bear on it — from anywhere in the corpus, with no source partition
(C1).

### 9.2 · Why a planner, and why Claude

Keyword retrieval fails on the questions that matter, because the operator's
words and the corpus's words differ. "What do we tell people about how long
implementation takes?" contains none of the corpus's vocabulary — the claims say
"signature to first payroll", "four to six weeks", "go-live".

So the model plans before the database searches. **Claude decides what to look
for; the database does the looking.** This is the "wired into the search"
the founder asked for, and it belongs at the _front_ of retrieval rather than
the back, where it would only be re-ranking whatever keywords happened to hit.

### 9.3 · The query plan

**Model:** Opus 5, adaptive thinking, structured output. Input: the question,
the live topic list with summaries, and the entity vocabulary (top ~300 by
frequency).

**Output:**

```
{
  intent:      "lookup"|"comparative"|"counterfactual"|"status"|"enumerate",
  topicIds:    string[],        // where to look, max 6
  entities:    string[],        // what to match, max 10
  phrases:     string[],        // lexical probes IN THE CORPUS'S LANGUAGE,
                                //   not the operator's — max 8
  timeframe:   { from?: string, to?: string } | null,
  originHint:  string[] | null, // ONLY when the operator asked for it (C1)
  needsRecent: boolean,         // "what's the latest" → recency weighted hard
  hardness:    "routine"|"hard" // feeds the Fable escalation (I.4.2)
}
```

The `phrases` field is where the planner earns its keep: it translates the
question into the vocabulary the corpus actually uses.

`originHint` is null unless the operator's words demand it. A test asserts that
a question with no source language produces `originHint: null` — the mechanical
guarantee behind C1.

### 9.4 · The four roads

Run in parallel, results fused:

1. **Topic** — every claim in the planned topics and their descendants. Cheap,
   high precision, the backbone.
2. **Entity** — claims tagged with the planned entities. Catches material in
   topics the planner didn't think of.
3. **Lexical** — Postgres full-text over `claim.text` using the planned phrases,
   with `websearch_to_tsquery` and `ts_rank_cd`. The floor that always works,
   including when the model is unavailable.
4. **Semantic** — pgvector cosine over claim embeddings. Catches the paraphrase
   nobody enumerated.

### 9.5 · Embeddings — the honest position

Anthropic does not serve an embeddings endpoint. The options, and the call:

- **Voyage AI** (`voyage-3-large`, 1024-dim) — the pragmatic choice: strong
  retrieval quality, cheap, one more key in Vercel. **Recommended.**
- **Postgres-only** (`pg_trgm` + full-text, no vectors) — no new dependency, and
  genuinely adequate for a small corpus. **The fallback, and the Phase-9a
  default.**
- A local ONNX model in the Node runtime — no external dependency, but cold
  starts on serverless make it a poor fit.

**Staged decision:** ship Phase 9 with roads 1–3 only. Instrument recall
(9.7). Add embeddings in **9b** if and only if the instrumentation shows the
first three roads missing material. Adding a vector store before the evidence
says it is needed is how a build acquires a dependency it can't justify.

### 9.6 · Fusion and ranking

Candidates from all roads are merged by claim id, then scored:

```
score = 0.34 · roadAgreement      // how many roads found it (independent signal)
      + 0.22 · lexicalRank        // ts_rank_cd, normalised
      + 0.16 · recency            // exponential decay, half-life 120 days
                                  //   (halved to 45 days when needsRecent)
      + 0.12 · kindWeight         // decision 1.0, commitment .9, fact .85,
                                  //   process .8, opinion .5, question .5
      + 0.10 · confidenceWeight   // stated 1.0, hedged .7, secondhand .5
      + 0.06 · corroboration      // same assertion in N independent documents
```

Then: dedupe near-identical claims (keeping the earliest as the origin and
recording the corroborators), and cap at `CANDIDATE_CAP` (60), where exceeding
the cap is itself an escalation signal.

**Nothing in this formula references `origin`.** By design (C1).

### 9.7 · Recall instrumentation (F3)

Silent recall failure is the worst failure this room can have: a confident
answer built on an incomplete set, with nothing visibly wrong. Three measures:

- **Coverage reporting** on every answer: how many claims, from how many
  documents, spanning what dates. The operator can see thinness.
- **Road attribution** in the reasoning fold: which road found each cited claim.
  If everything is coming from lexical, semantic is needed.
- **Held-out probing** (Phase 13): a fixture set of questions with known-correct
  claim ids, run on every retrieval change, reporting recall@20.

### 9.8 · Failure modes

| Risk                              | Guard                                                |
| --------------------------------- | ---------------------------------------------------- |
| Vocabulary mismatch               | Planner's `phrases` in corpus language               |
| Silent recall miss (F3)           | Coverage, road attribution, held-out probes          |
| Source partition creeping in (C1) | `originHint` null by default, tested                 |
| Planner hallucinates topic ids    | Ids validated against the live list; unknown dropped |
| One loud document dominating      | Corroboration counts documents, not claims           |

### 9.9 · Acceptance

- A question sharing no vocabulary with the corpus finds the right claims.
- A cross-cutting question returns candidates from at least three origins.
- Retrieval works with the model unavailable (roads 1–3 degrade to 3 alone).
- Recall@20 on the fixture set is measured and reported, not assumed.

### 9.10 · Cost / latency

Planner ~$0.01 and ~1.5s. Database roads run in parallel, ~150ms. Total
pre-synthesis latency under two seconds.

### 9.11 · Dependencies

Phases 6–8.

---

## Phase 10 · Synthesis — the written answer

### 10.1 · Objective

Turn a ranked candidate set into three to six sentences that commit to a
position, with the reasoning behind a fold and citations underneath (C2, C5).

### 10.2 · The call

**Model:** Opus 5 by default, Fable 5 on escalation (I.4.2). Adaptive thinking.
**Streamed**, because this is the one place a human waits.

**Input:** the question, the query plan, and the candidate claims each rendered
as:

```
[7] "Every Brazil deal we've won went out on EOR first, entity deferred to year two."
    — Lesha Cyphers · Teams · Global Sales Team · 2 Jul 2026 · decision · stated
```

The bracketed number is the citation handle the answer must use.

**Structured output:**

```
{
  answer:     string,        // 3–6 sentences, decisive
  citations:  number[],      // the handles actually used, in order
  reasoning:  string,        // the fold: what was weighed, what was set aside
  setAside:   [{ n: number, why: string }],
  confidence: "firm"|"mixed"|"thin",
  gaps:       string[]       // what the record does NOT cover, max 3
}
```

### 10.3 · The answer contract

The prompt is a contract, and these are its clauses:

**Compose, never dump (F11).**

- No verbatim run over `VERBATIM_MAX_WORDS` (25) unless explicitly presented as
  a quotation with its speaker.
- The answer must read as one voice explaining a position, not as a digest of
  other people's sentences.
- A post-check counts the longest verbatim overlap with any candidate; over the
  ceiling and unmarked, the answer is regenerated once with the violation named.

**Commit (C5).**

- Three to six sentences. State the position in the first one.
- "It depends" is permitted **only** when the record contains a genuine
  unresolved split, and then the split must be named: _"The record splits — the
  2024 study said entity, every deal since has gone EOR first."_

**Distinguish.**

- A `decision` outranks an `opinion` and the answer says which it is leaning on.
- A `hedged` or `secondhand` claim is never presented as established.
- Where two claims conflict, name both and say which is later or better
  supported.

**Refuse well (F12).**

- If the candidates do not support an answer, say **"the record doesn't say"** —
  and use `gaps` to name what is missing.
- Never fill a gap from general knowledge about payroll, EOR or anything else.
  The room answers from _this corpus_. A model that knows something the corpus
  doesn't must stay quiet about it. This clause is repeated three times in the
  prompt because it is the failure that would most damage trust.

**Cite.**

- Every substantive assertion carries a handle.
- `citations` must be a subset of the handles supplied. Any handle not supplied
  is a fabrication and fails the response.

### 10.4 · Confidence, and how it is shown

- **firm** — several independent, stated, recent claims agree. Rendered plainly.
- **mixed** — the record disagrees with itself. The answer names the split; the
  UI marks it.
- **thin** — fewer than three supporting claims, or all hedged/secondhand, or
  all older than a year. The UI says so above the answer: _"Thin — three claims,
  none newer than March."_

Thin is not a failure to hide. It is the single most useful thing the room can
tell an operator who is about to repeat something to a prospect.

### 10.5 · The reasoning fold (C5)

Closed by default. Opens to show:

- **What was weighed** — the claims that shaped the answer, in rank order, with
  their kind, confidence and date.
- **What was set aside and why** — retrieved but unused, with a reason. This is
  where an operator catches the room ignoring something important.
- **Coverage** — _"18 claims across 11 documents, 2 Jun – 30 Jul, from Teams,
  the Playbook, and two account records."_
- **Which brain answered** — Opus 5 or Fable 5, and why it escalated.
- **How each cited claim was found** — the retrieval road (9.7).

### 10.6 · Follow-up questions

Not a chat (I.2), but a follow-up should not start from nothing. A question
asked within the same session may carry the previous `{question, answer}` as
context, clearly labelled as prior context and explicitly **not** as evidence —
the model may use it to interpret the new question, never to support the new
answer. Evidence always comes from a fresh retrieval.

### 10.7 · Degradation

- **No API key** → the room says so and falls back to structured retrieval: the
  rail, the topics, the claims, no written answer. Still useful; honest about
  what it isn't.
- **Model error or timeout** → the candidates are shown with a plain message.
  Never a fabricated answer, never a spinner that never resolves.
- **Zero candidates** → "Nothing in the record speaks to this," plus the
  planner's read of the question so the operator can see what it looked for and
  rephrase.

### 10.8 · Failure modes

| Risk                           | Guard                                             |
| ------------------------------ | ------------------------------------------------- |
| Quote-dumping (F11)            | Verbatim ceiling + post-check + regeneration      |
| Confident nonsense (F12)       | `confidence: thin` surfaced; "record doesn't say" |
| Answering from world knowledge | Contract clause, repeated; eval set probes for it |
| Fabricated citation handles    | Subset validation against supplied handles        |
| Hedging by default             | Sentence range + "state the position first"       |

### 10.9 · Acceptance

- _"What do we tell people about implementation timelines, and has it held?"_
  returns a paragraph reconciling the quoted four-to-six weeks with what happened
  on closed deals, citing both, naming the one that slipped and why.
- A question the corpus cannot answer returns "the record doesn't say" with
  named gaps — verified against a question deliberately outside the corpus.
- A question whose corpus support is two hedged claims from March is marked
  **thin**.
- No answer in the eval set contains an unmarked verbatim run over 25 words.

### 10.10 · Cost / latency

~$0.06 typical, ~$0.20 escalated. First token in ~2s streamed, complete in
8–14s.

### 10.11 · Dependencies

Phase 9.

---

## Phase 11 · Citations and drilldown

### 11.1 · Objective

Make every sentence in an answer traceable to the message that produced it, in
four clicks or fewer.

### 11.2 · The four levels

**Level 1 — the claim.** Under the answer: the numbered claim, its speaker, its
date, its origin, its kind and confidence. Enough to judge whether to look
further.

**Level 2 — the passage in context.** The claim inside its surrounding turns:
the three messages before and after, with the claim's span marked using the
offsets stored at extraction. This is where an operator sees _what was being
discussed_ — the thing that most often changes the reading of a line.

**Level 3 — the whole document.** The full conversation, the claim marked, plus
the document's summary, its other claims, its topics, its links, and — for a
Teams capture — the completeness report from Phase 2.3(d), so the operator knows
whether he is reading everything.

**Level 4 — the live row.** Where the document mirrors something the app owns:
an account note opens that account's record in the HomeRoom; a battlecard
question opens the Playbook at that question; an action opens the deal it
belongs to. External captures have no Level 4 and say so.

### 11.3 · Interaction

- Level 1 is always visible under the answer, numbered to match the handles.
- Levels 2 and 3 open in a drawer over the room, not a new page — the answer
  stays visible behind, because losing the answer to read its evidence is a bad
  trade.
- Level 4 is a link out, and it says where it goes before you click.
- The drawer closes on click-away or Escape, using the shared `useDismiss` hook.

### 11.4 · Links inside documents (I.6)

At Level 3, a document's links render as a list. Each is either:

- an anchor with its URL, opening in a new tab, or
- a label with no URL, rendered as _"a link called 'Implementation SOW' was
  shared here — search Teams for it"_, with a copy button for the label.

An answer that leans on a `linkRef` says so: _"the SOW Jeanne dropped on 7/9 —
the room can see it was shared but not what it says."_

### 11.5 · Copy-out

Every citation stack copies as plain text — claim, speaker, date, source — so
the operator can paste evidence into a message. The copy carries no dollar
figures by construction, since none exist in the corpus.

### 11.6 · Citation rot (F7)

A Level-4 target can disappear: a note deleted, an action dropped, a Playbook
question retired.

- The mirror deletes the document and its claims when its home row disappears
  (Phase 4.4), so a _live_ answer cannot cite it.
- A **stored** answer (`IntranetAsk`) may reference a claim that no longer
  exists. Opening it renders _"this came from a note that has since been
  removed"_ — never a broken link, never a blank drawer.
- A test deletes a mirrored row and asserts a prior answer degrades to that
  message.

### 11.7 · Acceptance

- From an answer about Brazil, three clicks reach the exact message, in its
  thread, on its date, with its speaker.
- A fourth click reaches the account record when the source was an app note.
- A document whose links were preview cards shows the search-for-this fallback.
- Deleting a mirrored note leaves prior answers readable and honest.

### 11.8 · Cost / latency

Zero model calls. All reads.

### 11.9 · Dependencies

Phases 6, 10.

---

## Phase 12 · Time — superseded, disputed, aging

### 12.1 · Objective

Stop the room from presenting a March position as today's, and do it in language
an operator can act on.

This phase exists because of the founder's note on the first mockup: _"older
than a newer claim here"_ said nothing. What follows is the replacement.

### 12.2 · The three states

**Superseded.** A newer claim on the same point supersedes an older one.
Rendered: _"Updated 30 Jul — see the newer line."_ The newer claim is linked and
shown alongside; the older is never cited alone as current.

**Disputed.** Two claims on the same point disagree, with neither clearly later
or better supported. Rendered: _"Lindsey and Kimberly landed on different
framings."_ Both are shown. The answer must name the split (10.3).

**Aging.** Nothing contradicts it, but it is old enough to be worth checking.
Rendered: _"Said in March — worth confirming."_ Thresholds by kind: a `process`
claim ages at 180 days, a `fact` at 365, a `decision` at 270, a `commitment` at
30 (a commitment older than a month is either done or broken).

### 12.3 · Detection

Runs per topic, after ingest, not at question time — an operator waiting on an
answer should not also be waiting on contradiction analysis.

**Model:** Opus 5, adaptive thinking, structured output. Input: the claims in
one topic with their dates, kinds and confidences.

**Output:**

```
{
  pairs: [{
    a: claimId, b: claimId,
    verdict: "supersedes"|"disputes"|"unrelated",
    why: string,             // must quote both claims
    onSamePoint: string      // what exactly they are both about
  }]
}
```

**The bias is toward `unrelated`.** Two claims about different countries, or
different products, or different accounts, are not in conflict — and false
contradictions are more damaging than missed ones, because they make the room
look confused about things the operator understands perfectly.

`why` must quote both claims. A verdict that cannot quote is discarded.

### 12.4 · Scope control

Comparing every claim against every other is quadratic and unaffordable. Pairs
are proposed mechanically first and only then arbitrated:

- both claims in the same topic, **and**
- sharing at least one entity, **and**
- kind compatible (a `question` never supersedes a `fact`), **and**
- at least 14 days apart (same-day claims in one conversation are a discussion,
  not a contradiction)

This reduces a topic of 60 claims from 1,770 pairs to typically fewer than 30.

### 12.5 · Operator override

Every verdict can be waved off from the citation stack. A waved verdict is
recorded and never re-proposed for that pair. The founder knows things the
corpus doesn't — that two apparently conflicting lines were about different
clients — and the room must take correction gracefully.

### 12.6 · Effect on answers

- A superseded claim entering the candidate set brings its superseder with it;
  the synthesis prompt is told which is which.
- Disputed pairs both enter, flagged, and count toward the Fable escalation
  (I.4.2).
- Aging is presentational only — it does not change ranking, it changes what the
  operator is told.

### 12.7 · Failure modes

| Risk                  | Guard                                              |
| --------------------- | -------------------------------------------------- |
| False contradictions  | `unrelated` bias, entity overlap, quote-or-discard |
| Quadratic cost        | Mechanical pair proposal (12.4)                    |
| Stale-as-current (F6) | Superseder travels with the superseded             |
| Over-flagging aging   | Per-kind thresholds, not one global clock          |

### 12.8 · Acceptance

- The 2024 entity study and the "EOR first" consensus are shown in relation, not
  as two equal facts.
- Two claims about Brazil and Mexico with similar wording are `unrelated`.
- A waved-off verdict never returns.
- A commitment from six weeks ago reads as aging; a fact from six weeks ago does
  not.

### 12.9 · Cost / latency

~$0.02 per topic per pass, run after ingest. Never in the question path.

### 12.10 · Dependencies

Phases 6, 7, 10.

---

## Phase 13 · Evals, governance, hardening, and the bridges

### 13.1 · Objective

Make the room trustworthy enough to rely on in front of a prospect, and cheap
enough to leave running.

### 13.2 · The eval set

A fixed set of questions with known-good answers, in `tests/fixtures/intranet/`,
run against a frozen fixture corpus on every change to a prompt, the retrieval
formula, or the model roster.

**Four measures:**

| Measure          | Question                                                  | Target |
| ---------------- | --------------------------------------------------------- | ------ |
| **Recall@20**    | Did retrieval find the claims a human marked as relevant? | ≥ 0.85 |
| **Attribution**  | Is every cited claim credited to the right speaker?       | 1.00   |
| **Abstention**   | On questions the corpus can't answer, did it say so?      | 1.00   |
| **Groundedness** | Does every assertion trace to a cited claim?              | ≥ 0.95 |

Attribution and abstention are held at **1.00** deliberately. A room that
occasionally misattributes or occasionally invents is not a room anyone should
use to prepare for a customer call, and the two failures are exactly the ones a
fluent answer hides best.

**Adversarial questions in the set:**

- a question answerable only by combining a Teams claim with a Playbook question
  (proves C1 and C3)
- a question whose answer changed between March and July (proves Phase 12)
- a question about something plausible but absent (proves abstention)
- a question phrased entirely in vocabulary absent from the corpus (proves the
  planner)
- a question whose only support is one hedged secondhand claim (proves `thin`)

### 13.3 · Observability

Every model call logs: stage, model, input tokens, output tokens, latency,
cache-hit status, and outcome. Surfaced on a `/intranet/health` page behind the
same auth: calls today, spend today, extraction queue depth, documents pending,
recall on the last eval run, and the last ten asks with their coverage.

Not a vanity dashboard — it is how the answer to _"why is the room being
stupid today"_ becomes a two-minute check instead of an afternoon.

### 13.4 · Cost governance (F10)

- **Daily ceiling.** On breach, the room degrades to structured retrieval and
  says so. Nothing silently stops working.
- **Per-question cap.** A pathological candidate set cannot produce a $4
  question.
- **Backfill kill switch.** The Phase 4/5 batch runner is startable and
  stoppable, and cannot start twice.
- **Re-index guard.** A prompt-version bump enqueues a lazy sweep; it does not
  re-extract the corpus synchronously on deploy.
- **Cache discipline.** The long system prompts are cached; a cache-miss rate
  above 20% raises a flag on the health page, because it usually means a prompt
  is being rebuilt per call with a timestamp in it.

### 13.5 · Security hardening

- A redaction test feeds a corpus of pricing threads, dial-ins and passcodes
  through the whole pipeline and asserts that nothing sensitive reaches storage,
  a model, or a rendered answer.
- The write-ban import test from Phase 1 runs in CI permanently.
- The room's auth is the app's auth. There is no public surface.
- The corpus is never used to draft an outbound message without the operator
  reading it first.

### 13.6 · The bridges

- **Demo sidekick transcripts** pipe in automatically at the end of a demo,
  instead of being pasted.
- **The prospect-question harvest (C7).** The standing _"What prospects ask"_
  topic proposes new battlecard questions drawn from what real buyers actually
  asked — each proposal carrying the shape of the ask, the product line, the
  moment that provoked it, and the transcript it came from. It also runs the
  inverse: battlecard questions no prospect has ever needed answered, which is a
  signal that a question is ours rather than theirs. Proposals only; the
  Playbook is written by hand.
- **The gap carousel bridge (C7).** An account's STILL UNKNOWN carousel can draw
  on questions prospects in comparable situations asked — same product line,
  same scenario — so a deal inherits the questions its peers provoked.
- **Promotion to the Playbook.** A claim can be promoted, by hand, into
  `playbook:market` or `playbook:lessons`. One click, a confirm, and the claim
  travels with its provenance. Never automatic (I.2).
- **Account bridge.** An entity matching a book account offers a link into that
  deal's row in the HomeRoom. Offers, never files.
- **Ask from anywhere.** A small ask affordance on the account row: the same
  brain, the question pre-scoped to that account's entities — still searching
  everything, just starting there (C1).

### 13.7 · Adversarial pass

The same discipline the paste pipeline got: independent finders across
attribution, redaction, citation integrity, index stability and cost, each
finding checked by an independent refuter before it counts. Fixes ship with the
test that would have caught them.

### 13.8 · Acceptance

- The eval set passes three consecutive runs at the targets in 13.2.
- No dollar figure exists anywhere in the corpus.
- Every citation in the eval answers resolves to a real claim.
- A simulated cost breach degrades the room and says so.
- The write-ban test passes.

### 13.9 · Dependencies

Everything.

---

# Part III · Cross-cutting concerns

## III.1 · Sequencing and what ships when

| Milestone                | Phases | What the operator can do                                        |
| ------------------------ | ------ | --------------------------------------------------------------- |
| **M1 · The corpus**      | 1–3    | Capture Teams chats and transcripts; see them stored whole      |
| **M2 · The brain reads** | 4–6    | The app and the Playbook are in; claims exist; nothing asks yet |
| **M3 · The index**       | 7–8    | The rail is live and decomposes; browse by topic                |
| **M4 · Asking**          | 9–11   | Ask anything; get a written answer with citations that drill    |
| **M5 · Trust**           | 12–13  | Time-awareness, evals, governance, bridges                      |

M4 is the first milestone where the room is the thing the founder described.
M1–M3 are the runway; none of them should be skipped, and none of them should be
mistaken for the product.

## III.2 · Design canon

Everything obeys the locked Antaeus system: field `#F5F7FB`, navy `#0A1C40` on
the opacity ladder, **one** dominant orange move per surface (here: the **Ask**
button), blue for system intelligence, green for real health, amber for caution,
red for real risk. DM Serif Display for the authored read, Public Sans for the
work, JetBrains Mono for kickers and timestamps. Plain sentences a peer would
say; state before explanation; the object before the controls.

The word "steps" never appears in operator-facing copy. Account names are plain
links.

## III.3 · Testing posture

- **Pure libs get unit tests.** Segmentation boundaries, ranking arithmetic,
  fusion, pair proposal, redaction, checksums, folding — all deterministic, all
  tested directly.
- **Model calls get contract tests.** The schema is exercised against recorded
  fixtures; the sanitiser is tested against malformed responses; nothing in CI
  calls the live API.
- **The eval set is the integration test.** It is the only thing that measures
  whether the room is any good, and it runs against a frozen corpus so a result
  change means a code change, not a data change.
- **Adversarial fixtures for attribution** are permanent. That failure already
  happened once in this app's history; it does not get to happen twice.

## III.4 · What could make this the wrong plan

Stated plainly, because a plan that admits nothing is not a plan:

- **The corpus may be too small for the machinery.** If the operator captures
  twenty threads and stops, topics never reach the promotion threshold, the rail
  stays thin, and a simpler "search my pastes" tool would have served better.
  _Signal to watch:_ fewer than 100 documents after a month. _Response:_ drop
  the promotion threshold to 2, and lean on entity retrieval over topics.
- **Extraction quality may not hold at chat's messiness.** Teams chat is
  fragmentary in ways a transcript is not. _Signal:_ claims that read as
  nonsense out of context, in a sample review at M2. _Response:_ larger
  segments, more context per claim, or a two-pass extract.
- **The one-brain commitment may make answers muddy.** Mixing a formal
  battlecard question with a jokey channel line into one answer could read as
  incoherent. _Signal:_ answers that feel tonally scrambled in the eval review.
  _Response:_ keep C1 in retrieval (never filter by source) but let synthesis
  _weight_ by kind and confidence more aggressively — which is a ranking change,
  not a partition.

## III.5 · Open questions

Three remain after the founder's last round.

1. **Capture cadence.** Grabs are manual. Is that the intent long-term, or
   should the room nag — _"the Global Sales Team chat hasn't been captured in
   nine days"_? A nag needs the room to know which spaces matter, which is a
   small feature and a real behaviour change.
2. **Retention.** Does anything ever leave the brain? A two-year-old channel
   thread is mostly noise, but "mostly" is doing a lot of work in that sentence.
   Proposed default: nothing is deleted, aging handles relevance.
3. **The demo bridge's boundary.** Demo transcripts contain customer speech.
   They are internal-only either way, but it is worth being deliberate: does a
   prospect's own words belong in the same brain as internal chatter? Proposed
   default: yes, clearly labelled by origin, because that is where the most
   valuable claims live.

---

# Part IV · The operator's correction (2026-07-30)

The first production session exposed the gap between the pipeline and its face.
The pipeline was sound; the face spoke the pipeline's language, hid its one
fatal failure, and buried the control that matters. Everything below is
founder-decreed and supersedes any conflicting line in Parts I–III.

## IV.1 · The vocabulary rule

The words **document**, **claim** and **topic** — and their counts — never
appear on an operator surface. They are pipeline words. The only places
granularity of that kind may show are:

1. **Citations**, when a question has been answered — speaker, date, kind,
   source, exactly as built.
2. **The ingest receipt**, at the moment the index updates — what was just
   read, which index rows grew, which rows are new.

Everywhere else the room speaks plainly: "sources", "lines", "entries",
"the index", "still to read". The stat line ("0 claims from 221 documents,
7 topics") is deleted, not reworded — the index rail's own counts are the
only standing numbers on the page. The staleness line ("Last added …")
survives; it is the one nag the founder asked for.

## IV.2 · Failure is loud, diagnostics are invisible

The first production run read nothing and said nothing about it — 221 entries
queued forever behind silent catch blocks and an unconfigured function
timeout. Two rules replace that:

- **Every read failure surfaces in the run report with its actual reason** —
  "the model call timed out", "the API key was refused", the server's own
  message — in plain words, where the operator is already looking.
- **No diagnostics surface.** The vital-signs link is gone. A page of meters
  is the pipeline talking to itself; the operator needs the failure line at
  the moment of failure, not a dashboard.

Mechanically: `maxDuration` is set explicitly on the room's route; every
reading pass is deadline-aware and stops honestly before the platform kills
it; every catch captures and reports the error instead of swallowing it.

## IV.3 · One control, and the paste is the protagonist

- **One button.** "Bring the brain up to date." No deep pass, no second
  budget. The button runs bounded passes back-to-back until the backlog is
  gone or the operator stops it, reporting as it goes.
- **The paste well is the room's second surface, not an afterthought.** It
  sits in the main column, always open — not folded behind a ＋ toggle on the
  rail. Pasting is how the room grows; the layout says so.
- **The reaction to a paste is the point.** "Keep it" immediately reads what
  was pasted, and the operator watches the consequence: the receipt, then the
  reading, then the index rows growing — new rows appearing, counts ticking —
  then a summary of everything the app just ingested. Fire-and-forget is
  abolished.
- **The index rail sits on the left.** The page reads index → work, not
  work → index.
- **The page subtitle is gone.** The room explains itself by being usable.
- **"the grabs" link is gone.** Capture is the Capture tab's job.

## IV.4 · The grab takes the whole thread, structured

The Teams grab is rebuilt to the standard Phase 2 always assumed:

- **Whole thread.** It scrolls to the very top — not eight passes — harvesting
  incrementally as it goes, because Teams unloads what scrolls out of view.
  It stops only when the top is truly reached (no growth three passes
  running) or a generous safety cap trips, and the report says which. Pacing
  stays polite; the point is completeness, not speed.
- **Structured, not a blob.** Every message is emitted with the delimiters
  the parser was always built for — `⟦MSG⟧ speaker ⟦AT⟧ instant ⟦BODY⟧` —
  read from the message DOM itself: author nodes, `<time datetime>` instants,
  body containers. Attribution stops being inference. Links and file cards
  land in `⟦LINKS⟧`; the completeness report lands in `⟦CAPTURED⟧`.
- **Falls back rather than fails.** If Teams ships a DOM the selectors don't
  recognise, the grab degrades to the old whole-pane text — a worse capture
  is better than none, and the report says the structure was missed.
- A changed bookmarklet must be re-dragged to the bookmarks bar; the shelf
  says so.

## IV.5 · Prospect-ask intelligence moves to where it belongs

- **The harvest report leaves this room.** "What prospects ask" as a
  reviewable report — proposals grouped from real buyer questions, plus the
  battlecard questions no buyer has ever needed — lives on the **Playbook**
  page, beside the lessons and market facts it feeds. On the Intranet it is
  an index row and nothing else.
- **The ask path uses it invisibly.** When a question comes in that buyers
  have asked before — or close to it — the answer says so and cites those
  asks alongside everything else. That is retrieval doing its job, not a
  separate feature.

## IV.6 · The world fallback

The record-only doctrine (F12) gains its counterpart. When the corpus has
**nothing** — no candidates, or an answer that honestly abstains — the room
no longer stops at "nothing in the record." It answers from Claude's general
knowledge instead, under an explicit label: **from the world, not the
record**, styled as system intelligence (blue), never presented as corpus
truth, never cited as if it were. `redactMoney` applies to world answers
exactly as it does to everything else. The hierarchy is absolute: the record
first, the world only when the record is empty, and never blended.

## IV.7 · What Part IV deliberately does not change

Extraction, indexing, retrieval, synthesis, time, the mirrors, C1–C7, the
write ban, the eval set, the ceilings — untouched. This part is about the
face and the feeder, not the brain.

## IV.8 · The ledger direction (founder feedback, 2026-07-30 evening)

The triptych round chose a direction: the **running record** (Concept 1, "the
Ledger") is right, with corrections. These are decreed for the next build of
the room's face; the ingest-digest change below is already in production.

- **The ingest digest is the whole story, not the index alone.** After a
  paste is read, the report says: what the paste was and the span it covered;
  a plain-words tally of what it carried (facts, decisions, commitments,
  open questions, things buyers asked); how the index grew; where buyer asks
  travel (the Playbook's shelf); and which book accounts were named, with
  their rows as the destination. Progress lines ("Reading what you pasted…")
  are transient — replaced by the result, never left behind.
- **The record collapses; it never disappears.** Every entry in the running
  record folds to its one-line stamp and reopens on a click. Day dividers
  collapse a whole day at once. Nothing is dismissed — C6 applies to the
  surface too.
- **The archive is a rail tab.** At the bottom of the index rail, a
  delineated tab — **The archive** — holds the record calendarized: months,
  then days, each day carrying its counts (asks · pastes), each day opening
  that day's slice of the record.
- **By country is a rail tab, and countries are lenses, not copies.** The
  second delineated tab — **By country** — lists every country the record
  touches, colored flag and name, each opening the same claims seen through
  that country: its topics, its buyer asks, its commitments. Nothing is
  duplicated: a country row is a standing filter over entities, so the
  record stays single-copy (C1: one brain) while reading as if it were
  indexed twice.
- **Held for a later big haul, deliberately:** per-country world knowledge —
  tax, payroll, government, employment contracts (EOR/contractor),
  compliance, how people can and cannot be paid, paid time off, offboarding
  and termination rules, social and required and health benefits — gathered
  from outside the record and indexed under the same country lenses. The
  by-country tab is built so that this lands as MORE ROWS under each flag,
  not as a new surface.

## IV.9 · Voice and flags (founder feedback, 2026-07-30 night)

- **The room talks like a person.** Receipts and ingest digests are whole
  conversational sentences — "Got it — 214 messages from Global Sales Team,
  going back to Jun 2, with 2 links." · "Inside it I found 12 facts, 6
  decisions, 5 commitments people made, and 9 questions buyers asked." · "The
  index grew — Implementation handover picked up 6, and 'Partner escalations
  follow-through' is brand new." First person is allowed; fragment-and-dot
  pipeline shorthand is not. Lists read "a, b, and c", never "a · b · c".
- **The paste button says "Send it."** Never "Keep it" — you send something
  to a brain; keeping is its job, not yours.
- **Flags are real flag images, never emoji.** Windows renders no color emoji
  flags — they degrade to bare letter pairs — so the by-country rail uses
  actual flag icons (flag CDN images in mockups; inline SVG or self-hosted
  assets in production), always beside the country's name in text.

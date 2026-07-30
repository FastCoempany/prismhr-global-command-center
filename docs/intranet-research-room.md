# The Intranet — plan

Status: **planned, not built.** Rewritten 2026-07-30 after the founder's
direction on one-brain indexing, Claude-driven answering, and full app ingest.
This document is the agreed shape before any code exists.

---

## 1 · What it is, in one paragraph

The Intranet is **one brain that has read everything this operator has access
to**, and answers questions about it in his own language. Internal Teams
channels across Vensure and Prism, partnership meetings, demo transcripts,
every account note, every action, every follow-up, every research finding, and
the entire Playbook — all of it, one corpus. You ask it something; it reads
across the whole of what it knows, thinks, and answers. Underneath the answer it
cites what it drew on, and every citation drills down — to the document, to the
passage, to who said it and when.

## 2 · The three commitments

Everything in this plan follows from three decisions the founder made. They are
not negotiable inside the build; they are what the room is.

### 2.1 · One brain, not sections

Source is **provenance, never partition.** The corpus is not divided into a
Teams shelf, a partnership shelf and a demo shelf. A question about Brazil
draws on a channel thread, a partner's commitment, a line in a demo, and a note
on the Advocate Pay record with equal standing, because the answer might live in
any of them.

Source is recorded on every fragment and shown on every citation — you will
always know where something came from. It is a **fact about a claim**, not a
wall between claims. No retrieval path may filter by source unless the operator
explicitly asks it to.

### 2.2 · The answer is written, not surfaced

Asking must not return "here are four pasted paragraphs that contain your
keywords." That is a search box, and the operator already has one in Teams.

The room **reads its candidates and composes an answer** — a plain-language
response that reconciles what different people said, notes where they disagree,
and says plainly when it doesn't know. Citations sit underneath the answer, not
inside it as a wall of quotes. Claude does this work; it is the room's whole
value.

### 2.3 · It is the app's intranet too

Not a separate silo beside the app. **Everything the app knows is in the brain**:

- every `AccountNote` — the working record, the background register, research
  findings, outcome marks
- every `Todo` — actions open, done, delayed, dropped, with their fallbacks
- every follow-up and check-in, and what happened to it
- every partner note and outreach thread
- every board card, its stage, its checklist judgments, its closure
- the **entire Playbook** — every market fact, every lesson, every battlecard
  question, scenario and drum line, word for word
- everything captured from outside: Teams, meetings, demos, pastes

"What did we tell Simploy about implementation timelines, and does anything in
the channels contradict it?" is a single question with a single answer, because
both halves live in the same brain.

## 3 · What it is not

**It is not the Playbook.** The Playbook is authored, opinionated and small —
what we have learned about selling, curated. The Intranet is the whole record,
unopinionated and large. The Playbook is _ingested by_ the Intranet; the
Intranet never writes back into the Playbook automatically. A promotion from
Intranet to Playbook is a deliberate human act.

**It is not an editor.** The Intranet reads. It does not file notes, open
actions, or move deal stages. Where an answer implies work, it can _offer_ a
link into the HomeRoom — offering, never doing.

**It is not a search box.** See 2.2.

## 4 · The data model

Three concepts. Everything else is derived.

### 4.1 · Document

An immutable unit of source material.

```
IntranetDoc
  id            string
  origin        "teams" | "meeting" | "demo" | "paste"
                | "account-note" | "todo" | "touch" | "partner-note"
                | "card" | "playbook" | "research" | "gap"
  originRef     string      -- the row id in its home table, when it has one
  title         string      -- channel + thread, meeting name, account + date
  body          string      -- the text, redacted at ingest
  speakers      string[]    -- everyone who talks in it
  occurredAt    datetime    -- when it was SAID, not when it was captured
  capturedAt    datetime
  accountId     string?     -- when the document belongs to a deal
  checksum      string      -- content hash; re-ingest is idempotent
```

**Mirrored, not moved.** App-owned documents (notes, todos, playbook rows)
stay in their own tables and are _reflected_ here for indexing. The home table
remains the source of truth; the mirror carries `originRef` so a citation can
always walk back to the live row. A nightly (and on-demand) sync reconciles.

### 4.2 · Claim

A sentence-sized assertion pulled out of a document. Claims are what retrieval
actually matches and what answers are built from.

```
IntranetClaim
  id          string
  docId       string
  text        string      -- one assertion, self-contained
  speaker     string      -- who said it
  saidAt      datetime    -- inherited from the doc unless the text dates itself
  entities    string[]    -- people, companies, countries, products
  topicIds    string[]
  kind        "fact" | "commitment" | "opinion" | "question" | "decision"
  confidence  "stated" | "hedged" | "secondhand"
```

A claim **carries its provenance or it is not filed.** The room reports _that it
was said_, by whom, and when. It never asserts truth on its own authority.

`kind` and `confidence` matter at answer time: a decision outranks an opinion, a
stated fact outranks a hedge, and "someone told me that…" is marked as
secondhand rather than laundered into fact.

### 4.3 · Topic

A node in the index. Topics are **derived, accumulated, and hierarchical.**

```
IntranetTopic
  id         string
  label      string
  parentId   string?     -- null = top level; arbitrary depth below
  summary    string      -- what this topic is, one sentence
  docCount   int
  claimCount int
  firstSeen  datetime
  lastSeen   datetime
```

`parentId` is the whole decomposition mechanism. Depth is **not capped at
three** — a topic splits whenever it grows enough to warrant it (see Phase 7).

## 5 · Storage

Prototype on the existing zero-migration trick (namespaced `AccountNote` rows,
as `playbook:market` and `gaps:<id>` already do) only through Phase 2. Beyond
that the corpus outgrows it and it earns real tables — `IntranetDoc`,
`IntranetClaim`, `IntranetTopic`, plus join tables for claim↔topic and
claim↔entity, and (from Phase 8) a `vector` column behind pgvector.

Supabase is Postgres, so pgvector needs an extension enable and a migration —
delivered as `docs/*.sql` for the founder to run, same as every other schema
change in this app.

## 6 · Confidentiality

Standing doctrine, no exceptions:

- **No API into Teams, Salesforce, or anything else.** Everything arrives by
  paste, bookmarklet, or from the app's own tables.
- **`redactMoney` runs on every document at ingest.** Internal channels discuss
  pricing constantly; no dollar figure is stored, rendered, or sent to a model.
  The headcount exemption stands ("1,200 employees" survives as sizing intel).
- **`scrubSecrets` runs too** — internal threads carry passcodes, dial-ins and
  meeting links far more often than customer mail does.
- Credentials stay in env vars; `ANTHROPIC_API_KEY` lives in Vercel.
- The corpus is internal-only. Nothing here is ever drafted into an outbound
  message without the operator reading it first.

---

# The thirteen phases

Each phase names what gets built, what it must do to be called done, and what
could go wrong. Phases are ordered by dependency; a few could run in parallel
but the sequence is the safe read.

---

## Phase 1 · The room, the doctrine, and the shell

**Build.** The `/intranet` route, its place in the working nav, the page shell
with an ask bar and an index rail (both inert). The doctrine written into the
code as comments and into the tests as assertions: source never partitions,
citations are mandatory, the room never writes.

**Data.** None yet.

**Done when.** The route renders in the Antaeus system, the nav carries it, and
a test asserts the room exposes no write action of any kind.

**Risk.** Naming. "Intranet" is what the founder calls it; the tab should say
what it is to him, not what it is technically.

---

## Phase 2 · Ingest from outside

**Build.** A capture path for external material: the ☰ Teams grab pointed at
the Intranet, a transcript paste for partnership meetings, and a plain paste for
anything else. Ingest runs `scrubSecrets` → `redactMoney` → checksum → store.

**Data.** `IntranetDoc` for origins `teams | meeting | demo | paste`. Checksum
dedupe: re-grabbing the same thread updates rather than duplicates, and a grab
that overlaps a previous one keeps the union, not two copies.

**Done when.** A Teams thread and a meeting transcript both land as documents
with speakers and `occurredAt` parsed out; re-pasting the same thing produces no
second row; no dollar figure survives ingest.

**Risk.** Speaker parsing across dialects. Teams, a Zoom transcript and a typed
meeting note name people three different ways. `normPerson` from the provenance
lib already handles most of it and should be reused, not re-invented.

---

## Phase 3 · Ingest the app itself

**Build.** The mirror sync: every `AccountNote`, `Todo`, `Touch`, partner note
and board card becomes an `IntranetDoc` with `originRef` back to its row.
Incremental by `updatedAt`, full-reconcile on demand.

**Data.** Origins `account-note | todo | touch | partner-note | card | research
| gap`. `accountId` is carried so an answer can say _which deal_ a line came
from.

**Done when.** Asking a question can draw on a note filed in the HomeRoom this
morning; deleting a note in the app removes it from the brain on the next sync;
a citation on an account note links back to that account's record.

**Risk.** Volume and drift. This is the phase where the corpus goes from
hundreds to thousands of documents. The sync must be incremental and idempotent
or every deploy re-embeds the world.

---

## Phase 4 · Ingest the Playbook, whole

**Build.** Every Playbook row — market facts, lessons, all 99 battlecard
questions with their why / listen-for / follow-up / drum lines, all 8 scenarios
— enters the corpus as documents. Word for word, as the founder specified.

**Data.** Origin `playbook`. Battlecard questions carry their product line and
scenario as entities, so "what do we ask a prospect who's never run
international payroll?" is answerable from the brain rather than by navigating
to the Playbook tab.

**Done when.** A question answerable only from the battlecard is answered, with
a citation that names the question's category and phase and links into the
Playbook.

**Risk.** Duplication with Phase 3 — Playbook rows live in `AccountNote` under
namespaced ids and would otherwise arrive twice. The namespace check must run
before the generic note mirror.

---

## Phase 5 · The extraction pass

**Build.** One Claude call per document on arrival. Structured output, same
discipline as `ai-clean`: a JSON schema, defensive sanitising, a cap on every
list.

**Returns:**

- `summary` — two sentences, what this document is
- `claims[]` — the assertions worth retrieving, each with speaker, kind,
  confidence, and the entities it names
- `entities[]` — people, companies, countries, products, normalised
- `topics[]` — matched against the existing topic list, which is passed in
- `newTopics[]` — proposals, with a one-line justification each

**Model.** Opus for meeting and demo transcripts (dense, high-value, worth the
read). Haiku for short channel threads and app rows. The routing heuristic from
`modelFor` extends here.

**Done when.** A 40-message channel thread yields claims a human would also have
pulled out, attributed to the right speakers, with no claim inheriting the wrong
person's words. Attribution is tested adversarially — the same discipline that
caught the Remote/Shane misattribution.

**Risk.** Cost at Phase 3 volume. Mitigation: app rows are short and route to
Haiku; extraction runs once per document per checksum, never on read.

---

## Phase 6 · The index, and why it stays still

**Build.** The topic list, built by accumulation. A new document is read
_against the existing index_: it joins the topics that fit and may propose new
ones. The index is never recomputed from scratch.

**Rules.**

- A topic that exists today does not vanish tomorrow. Merges are explicit and
  leave a redirect, so an old link still lands.
- A proposed topic joins the index only when **three** documents want it. Below
  that it is a pending label, invisible in the rail. This is what keeps the rail
  from filling with one-off noise.
- Near-duplicate labels are merged by the same folding used for org names
  ("EOR risk" and "EOR risks" are one topic).

**Done when.** Ingesting twenty documents in a different order produces the same
top-level index. A topic that existed before a large ingest still exists after
it, with the same id.

**Risk.** Index churn is the failure mode that makes a room like this feel
untrustworthy. The stability test above is the guard and should run in CI.

---

## Phase 7 · Decomposition, to any depth

**Build.** Topic splitting. When a topic passes a size threshold, a Claude call
proposes sub-topics; claims are reassigned to children; the parent keeps its
summary and becomes a container. Recursive — a sub-topic can split again.

**In the rail.** Clicking a topic reveals its children. Clicking a child reveals
_its_ children if it has any, else its claims. The crumb line always shows where
you are and walks back out.

**Done when.** "Brazil & LATAM hiring" opens into entity-vs-EOR, contractor
classification, payroll calendar; "contractor classification" opens further into
the specific legal exposures; and at the bottom sit claims with speaker and date.
Three levels demonstrated, more supported.

**Risk.** Over-splitting produces a rail of thirty near-identical leaves. The
threshold must be generous and the split call must be told to refuse when the
material doesn't genuinely separate.

---

## Phase 8 · Retrieval — finding the right candidates

**Build.** A retrieval engine that gathers candidate claims for a question. In
order of cost:

1. **Entity match** — the question names Brazil, or Simploy, or Whitney.
2. **Topic match** — a Claude _query planner_ call maps the question to topics
   and entities before retrieval runs. This is the "Claude wired into search"
   the founder asked for: the model decides what to look for, then the database
   does the looking.
3. **Keyword** — Postgres full-text over claim text, as a floor.
4. **Semantic** — pgvector over claim embeddings, added here rather than at
   Phase 1 because by now the corpus is big enough to need it and we will have
   seen which questions the first three roads miss.

Candidates are merged, de-duplicated, and ranked: recency, `kind` (a decision
over an opinion), `confidence` (stated over secondhand), and how many
independent documents say the same thing.

**Done when.** A question phrased in words that appear nowhere in the corpus
still finds the right claims. Retrieval returns candidates from more than one
origin for a cross-cutting question — proving the one-brain commitment holds in
the plumbing, not just the copy.

**Risk.** Recall failures are invisible — the room answers confidently from an
incomplete set. Mitigation: the answer states how many documents it drew on and
across what span of time, and Phase 13's evals measure recall against
hand-built question sets.

---

## Phase 9 · The answer

**Build.** The synthesis call. Candidates in, a written answer out.

**The answer must:**

- be composed, not quoted — reconcile what different people said rather than
  pasting them in sequence
- name disagreement explicitly when the corpus disagrees with itself
- say **"the record doesn't say"** rather than fill a gap
- distinguish what someone _decided_ from what someone _thought_
- carry citations underneath, numbered, each pointing at a claim
- state its own coverage: how many documents, over what period

**Refusals.** No citations means no answer — a synthesis that can't attribute is
a bug and is shown as "nothing in the record speaks to this."

**Done when.** "What do we tell people about implementation timelines, and has
it held?" returns a paragraph reconciling the quoted four-to-six weeks with what
actually happened on the deals that closed, citing both, and noting the one
that slipped and why.

**Risk.** Confident synthesis over thin evidence. The prompt must be adversarial
about this, and the coverage line gives the operator the means to distrust it.

---

## Phase 10 · Citations, and drilling into them

**Build.** The citation stack under every answer. Each citation opens
progressively:

- **Level 1** — the claim, its speaker, its date, its origin.
- **Level 2** — the passage it came from, in context: the surrounding lines of
  the thread or transcript, so you can see what was being discussed.
- **Level 3** — the whole document, with the passage marked, plus its topics,
  its other claims, and every entity it names.
- **Level 4, when it exists** — the live row in the app. An account note opens
  that account's record in the HomeRoom; a battlecard question opens the
  Playbook at that question; an action opens the deal it belongs to.

**Done when.** From an answer about Brazil, three clicks reach the exact Teams
message, in its thread, on its date, from Whitney — and a fourth reaches the
account it concerns.

**Risk.** The `originRef` link rots when the app row is edited or deleted. A
missing target must degrade to "this came from a note that has since been
removed", never to a broken page.

---

## Phase 11 · The rail

**Build.** The live index rail — the room's spine and the founder's original
image. Every topic with its claim count, growing as documents land, freshness
marked, decomposing on click (Phase 7's mechanism, rendered).

**Behaviour.**

- The rail is navigation _and_ a report: it tells you what the brain has a lot
  of, and what it has just started to have.
- A topic that grew today is marked. A topic that has been quiet for months is
  not hidden, just quiet.
- Selecting a topic scopes the ask bar to it, without hiding the rest of the
  brain — a scoped question still draws on everything, it just starts there.

**Done when.** Ingesting a partnership transcript makes the rail change while
you watch, and the topic it created is visibly new.

**Risk.** The rail becoming a filter in the operator's mind — the thing the
one-brain commitment exists to prevent. The copy and the scoping behaviour must
both make clear that a topic is a starting point, not a boundary.

---

## Phase 12 · Time, staleness and contradiction

**Build.** The room's handling of an old claim that a newer one overtakes.

Replaces the placeholder language from the first mockups (_"older than a newer
claim here"_, which said nothing useful) with something an operator can act on:

- **Superseded** — a newer claim on the same point from the same or a more
  authoritative speaker. Rendered as _"Updated Jul 30 — see the newer line."_
- **Disputed** — two claims on the same point that disagree, neither clearly
  later. Rendered as _"Whitney and Lesha disagree on this."_
- **Aging** — nothing contradicts it, but it is old enough to check. Rendered
  as _"Said in March — worth confirming."_

Detection runs at index time, per topic, as a Claude call over the claims in
that topic. Answers respect it: a superseded claim is not cited as current
without its update alongside.

**Done when.** The 2024 entity study and the "EOR first" consensus are shown in
relation to each other rather than as two equal facts.

**Risk.** False contradictions — two claims about different countries read as
disagreeing. The detection call must quote both claims and justify the verdict,
and the operator can wave a verdict off.

---

## Phase 13 · Bridges, hardening, evals

**Build.**

- **Bridges.** Demo sidekick transcripts pipe in automatically. A claim can be
  promoted by hand into the Playbook. An entity matching a book account offers a
  link into that deal.
- **Evals.** A fixed question set with known-good answers, run against the
  corpus on every meaningful change to the prompts or retrieval. Measures
  recall (did it find the right claims), attribution (did it credit the right
  speaker), and abstention (did it say "the record doesn't say" when it should).
- **Hardening.** Rate and cost ceilings on the extraction pass. Graceful
  degradation when the API key is absent — structured retrieval still works
  without synthesis, and the room says so.
- **Adversarial pass.** Attribution, redaction, and citation integrity checked
  the way the paste pipeline was: independent finders, independent refuters.

**Done when.** The eval set passes three consecutive runs, no dollar figure
appears anywhere in the corpus, and every answer in the set carries citations
that resolve.

**Risk.** This phase is the one most easily skipped under momentum. It is the
one that makes the room trustworthy enough to rely on in front of a prospect.

---

## Open questions for the founder

1. **Channel scope.** One thread per grab, or a whole channel? A channel is many
   threads and the bookmarklet reads what has rendered — a whole channel means
   repeated grabs, or an accepted partial.
2. **People as entities.** Indexing colleagues makes _"what has Whitney said
   about HCM handoffs"_ answerable. It also makes the room a record of what
   individuals said, which is a different thing to hold. Index them, or keep
   speakers as provenance only?
3. **Answer length.** Short and decisive, or fuller with the reasoning shown?
   Default proposed: short by default, with a "show the reasoning" fold.
4. **Where the tab sits.** Working row alongside HomeRoom / Accounts / Playbook,
   or somewhere quieter? It will be used constantly if it's good, which argues
   for the working row.

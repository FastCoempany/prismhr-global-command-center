# The Intranet Research Room — plan

Status: **planned, not built.** Written 2026-07-30 from the founder's brief.
This document is the agreed shape before any code exists.

---

## What it is

A room you go into to **ask questions of what the organization already said.**

Vensure and Prism people talk all day in Teams channels, in partnership
meetings, in demos. That talk contains the answers to questions the operator
currently asks people directly — who owns this, has anyone sold into that
country, what did the partner actually commit to, what did we tell the last
prospect about implementation timelines. Today those answers live in threads
nobody can search across, and the knowledge dies where it was spoken.

The room takes everything that arrives, organizes it against itself, and builds
an **index that grows as the data does** — a rail on the right that adds topics
without being told to. Clicking a topic in that rail decomposes it: the same
material, one level more granular, still inside the topic you chose.

## What it is NOT

**It is not the Playbook.** The Playbook is what we have learned about _selling_
— market facts, competitor intel, lessons that make the next deal go better.
It is opinionated and small, and it is written by the read of a paste on a
deal.

The Intranet Research Room is **what the organization knows** — unopinionated,
large, and mostly other people's words. It has no view on a deal. It answers
questions; it does not advise. A lesson may graduate from here into the
Playbook by the operator's hand, but nothing flows automatically.

**It is not the account record.** Nothing in here files against a deal. When a
channel thread mentions Advocate Pay, that is a fact about the corpus, not a
note on the account — the ⚡ box on the account remains the only road to a
deal's record.

## What it ingests

| Source                         | How it arrives                   | Cadence          |
| ------------------------------ | -------------------------------- | ---------------- |
| Teams channels (Vensure/Prism) | ☰ Grab Teams thread bookmarklet | Whenever grabbed |
| Partnership meetings           | Transcript paste                 | Per meeting      |
| Demo sidekick transcripts      | Piped from the demo rooms        | Per demo         |
| Anything else worth keeping    | Paste                            | Ad hoc           |

Every arrival is a **document**: raw text, a source kind, a captured-at stamp,
and whatever speaker names survived the capture. Documents are immutable. What
changes over time is the index built on top of them.

## The index

The rail is the room's whole idea, so the index has to be honest about three
things:

1. **It is derived, never authored.** No one maintains a topic list. Topics
   come out of the corpus and change as the corpus changes.
2. **It is stable enough to trust.** A topic that exists today must not vanish
   tomorrow because a new document shifted the clustering. Topics are
   _accumulated_, not recomputed from scratch — a new document is read against
   the existing index and either joins topics that fit or proposes new ones.
3. **It decomposes.** A topic is not a leaf. Clicking it reveals the sub-topics
   inside it, and only then the documents and passages themselves. Three levels:
   **topic → thread → passage.**

### How a document becomes index

One model call per document, on arrival:

- Read the document.
- Return: a short **summary**, the **topics** it belongs to (matched against the
  existing topic list, which is passed in), any **new topics** it proposes, the
  **entities** it names (people, companies, countries, products), and the
  **claims** worth retrieving later — a claim being a sentence-sized assertion
  with its speaker and date attached.
- Claims are what the room actually answers questions with. A claim carries
  provenance or it does not get filed: _who said it, in what document, when._

Nothing about a claim is trusted as truth. The room reports **that it was said**,
by whom, and when — the operator judges.

### Retrieval

Two roads, and the cheap one runs first:

- **Structured** — filter by topic, entity, source, date. This is the rail, and
  it needs no model at all.
- **Asked** — a question in plain words. Candidate claims are gathered by
  entity/topic/keyword match, then one model call reads them and answers **with
  citations back to the documents**. An answer with no citation is a bug, not a
  feature.

Vector embeddings are deliberately **not** in the first build. The corpus starts
small enough that entity and topic filtering plus keyword match will find the
material, and embeddings add a store, a cost, and a failure mode. Revisit when
retrieval actually misses.

## Storage

The existing zero-migration trick still works and should be used for the
prototype: namespaced rows in `AccountNote` (`intranet:doc`, `intranet:index`),
the way `playbook:market` and `gaps:<id>` already do. That gets the room
standing without a schema change or a Supabase run.

It should **not** stay there. Once the shape is proven, this earns real tables —
the corpus will be much larger than the deal record, and it needs its own
indexes:

```
IntranetDoc     id, kind, title, capturedAt, speakers[], body, sourceHint
IntranetTopic   id, label, parentId (null = top level), docCount, updatedAt
IntranetClaim   id, docId, topicIds[], text, speaker, saidAt, entities[]
```

`IntranetTopic.parentId` is what makes the rail decompose without a second
mechanism: top-level topics have no parent, sub-topics point at theirs, and
clicking a rail topic is just "show me the children, then the claims."

## Confidentiality

The standing doctrine holds without exception:

- **No API into Teams, Salesforce, or anything else.** Data arrives by paste and
  bookmarklet, the same as everywhere else in this app.
- **`redactMoney` runs on every document at ingest.** Internal channels talk
  about pricing constantly; no dollar figure is stored. The headcount exemption
  stands ("1,200 employees" survives as sizing intel).
- **`scrubSecrets` runs too** — internal threads carry meeting passcodes,
  dial-ins, and links far more often than customer email does.
- Credentials stay in env vars. `ANTHROPIC_API_KEY` lives in Vercel.

## Phases

**P1 · The corpus.** Ingest and store. A paste box, the Teams grab pointed here,
document list, raw read. No index yet. Proves capture and redaction.

**P2 · The index.** The per-document model call, the topic list, the rail.
Topics accumulate; the rail updates as documents land. Structured filtering
only — no asking yet.

**P3 · Decomposition.** Sub-topics, the click-through from topic to thread to
passage. This is the piece most worth getting right; it is what makes the room
feel like it organized itself.

**P4 · Asking.** The question box, candidate gathering, the cited answer.

**P5 · The bridges.** Demo sidekick transcripts pipe in automatically. A claim
can be promoted, by hand, into the Playbook. An entity that matches a book
account offers a link across to that deal — offers, never files.

## Open questions for the founder

1. **Scope of a "channel grab."** One thread at a time, or a whole channel? A
   channel is many threads and the bookmarklet reads what's rendered — a whole
   channel would need repeated grabs.
2. **Who else appears.** Internal channels name a lot of colleagues. Should the
   room index people as entities (making "what has Whitney said about HCM
   handoffs" answerable), or keep speakers as provenance only?
3. **Staleness.** A claim from March may be wrong by August. Does the room show
   age and let the operator judge, or actively flag a claim contradicted by a
   later one? The second is much harder and worth doing only if the corpus turns
   out to contradict itself often.
4. **Boundary with the Playbook.** Manual promotion is proposed above. If the
   room should push into the Playbook automatically, that changes the model call
   and the Playbook's meaning.

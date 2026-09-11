# The Playbook face — restructuring proposal

**Status:** PROPOSAL for founder review. Nothing here ships without an explicit ship order.
**Date:** 2026-09-11.
**Branch:** `claude/affectionate-carson-edrs26`.
**Triptych:** `docs/mockups/playbook-face-triptych-2026-09-11.html`.
**Evidence base:** two partner calls, 2026-09-03 and 2026-09-10, read end to end
against `src/app/playbook/`, `src/lib/intel/`, and `src/lib/collateral/canon.ts`.
**Scope:** the Playbook's face and its routing. The bank's content is largely
kept. The Intranet is out of scope by instruction.

---

## 0. The one-paragraph version

The Playbook models a conversation in which we ask a prepared buyer prepared
questions and write down clean answers. Neither tape is that conversation. On
both calls the buyer was absent, the person on the line held the buyer's facts
secondhand at best, the dominant answer was a shrug, the partner asked more
questions than we did, and both calls closed on the same promise: *a list of
questions for you to go ask your client.* The Playbook has the raw material for
all of this — 113 questions, a relay line on every one, ten scenarios with traps
and objections — and a face that surfaces none of it in that shape. The proposal
is to re-cut the face around the three directions traffic actually runs in, make
the don't-know a first-class path instead of a 4% edge case, and add the three
content objects the tapes proved missing: the duty split, the product boundary,
and the country card.

---

## 1. What the tapes are

Two calls, roughly seventy minutes of substance.

**2026-09-03.** Three operators from one PEO plus their CSM. The call was
hijacked ninety seconds in by a live deal: a fifty-person prospect with three
managing partners resident in Puerto Rico, currently served by a competing PEO
on our own domestic platform. The seller delivered ninety seconds of genuine
Puerto Rico expertise — separate withholding destination, a different year-end
form, its own unemployment fund, different workers' comp — and it was the best
moment on either tape. Then the four-offering recital. Then, at minute 25, the
routing question that should have opened the call: *who is the legal employer?*
By then the partner had already recapped the three product tiers back to the
seller, unprompted, in her own words. She taught herself.

**2026-09-10.** One operator from a small single-state PEO, with the SVP of
Sales on the line. One question, held for thirty minutes: where does our
staffing arm end and Global begin? The partner had a client asking about the
Philippines and could not say whether a person was already picked, or why that
country. The same four-offering recital was delivered, verbatim in structure, to
a partner whose profile shares almost nothing with the first.

---

## 2. The findings

### 2.1 Three directions of traffic. The face serves one.

| Direction | On the tapes | In the face today |
|---|---|---|
| **We ask them** | Roughly a third of the talk | 113 questions, 10 scenarios, traps, objections. Strong. |
| **They ask us, live** | Drove call 1; *was* call 2 | Nothing on the call sheet. Prospect asks land under "What we've learned" as a draft queue for a battlecard later. |
| **They go ask their client** | The closing promise of **both** calls | 113 `relayLine`s exist and feed Groundwork's composers. The relay chip was retired from this surface. |

The inbound corpus already exists and already runs: the brain extracts
`kind: "prospect-question"` claims with an `askShape` facet
(definitional / commercial / risk / technical / process / timeline), and
`harvestBattlecards` groups them. That machinery is pointed at the wrong
output. It proposes new questions for us to ask. It should also answer the
question in front of us.

### 2.2 The don't-know is the conversation, and the bank treats it as an edge case

| | Count |
|---|---|
| Questions in the bank | 113 |
| `listenFor` answer rows | 442 |
| Rows that are a don't-know | **17 (4%)** |
| Branch rows wired | 26 |
| Branches that route a don't-know to a teach | **0** |
| "I don't know / not sure / I'd have to ask" lines across the two tapes | **29** |

Every don't-know branch I traced routes to *another question*. The playbook
authoring canon already says a don't-know routes to a teach: hand them the exact
list, send it today, book time to go through the answers together. Both calls
ended precisely there. The canon is written and unimplemented.

One line carries the whole emotional case, from the partner who had the live
deal: *"kind of not tell them that I don't know what I'm talking about."* The
fear is looking uninformed in front of their own prospect's CFO. A face that
answers that fear is the product.

### 2.3 The bank is aimed at a person who was not on either call

91 of 113 questions are addressed to the end client (`exec` / `ops`). 22 are
addressed to the partner. The end client has never been on one of these calls.
The partner holds the client's facts secondhand, and the tape shows exactly what
that sounds like: it took three turns and a flat contradiction — *"They do or do
not?"* — to establish whether the client had a Puerto Rico entity.

The secondhand law exists in the canon. The bank's client-fact questions are
still phrased as though the person holding the answer is in the room.

### 2.4 The routing spine is buried

*"The one thing that's gonna determine how we handle it comes down to who's the
legal employer."* That sentence is the whole routing intelligence of the product
line, and on tape it arrived at minute 25 as an aside. In the app it is one row
among 113 in a scrolling list. It should be the arrival.

### 2.5 The duty split is the answer we fumbled

Asked whether we handle the filings when the client stays the employer, the
seller said *"Goodness, I'm having a brain blink."* This is the single most
load-bearing mechanical fact in the global payroll line, and there is no card
for it anywhere in the repo.

### 2.6 The product boundary has no object

Solvo appears nowhere in `PRODUCT_CANON`, nowhere in the discovery bank, nowhere
in the Playbook. `canon.ts` carries "Global Talent Solutions" — recruiting that
transitions into EOR — which is a different product from the staffed-seat model
described on the 9/10 tape: our facility, our equipment, our supervision, the
client directing the work. Thirty minutes of that call was a partner trying to
find the line between them. The SVP hedged it himself: *"I don't want to go too
deep, because this isn't my world."*

### 2.7 "175" was said eight times. One country got content. And the delivery
story contradicted itself on the same call.

Across both tapes: **"175" eight times; Puerto Rico the only country with real
substance; Yemen a one-line sanctions aside.**

Worse, on the 9/10 call two people described the delivery chain in opposite
terms within fifteen minutes. One: *"we have entity experts on the ground… we're
not handing this off to some local firm."* The other: *"we have a network of
payroll providers across 175 countries."*

`canon.ts` already resolves this, ON TAPE and dated: **175+ countries supported;
owned-entity infrastructure in 44.** The "not a third party" claim is true in 44
countries and unwarranted in the other 131. The app holds the fact that would
have prevented the contradiction and never puts it in front of the operator.

### 2.8 The scenario is optional and load-bearing

The Call Sheet opens on *"No scenario — the engine's own order."* The scenario
library is the best-written content in the repo and it is the thing that would
have separated these two partners. An optional dropdown is carrying the weight
of the whole surface.

### 2.9 The face is a builder; both calls needed a responder

The Call Sheet's premise is that you pre-load a lineup and walk it. A call
hijacked at ninety seconds has no lineup. There is no entrance that reads *they
just said this, what do I say.*

### 2.10 Two things that happened on tape and left no trace

- **An internal need was dropped.** *"We had an employee move to Portugal and
  she's still working for us. Are we paying her correctly? I don't know, good
  question."* That is the partner's own payroll, not a client's — the two-tier
  law's internal branch — and nobody returned to it.
- **The strongest strategic argument on either tape is nowhere in the repo.**
  A referral partner can take the global work and come back for the domestic
  book; holding the client contract keeps that door shut. I grepped; it does not
  exist. It is the argument that moved the 9/10 partner toward resale.

---

## 3. The direction, locked across all three concepts

These hold in every concept in the triptych. What differs between them is the
organizing axis, never the doctrine.

1. **The fork leads.** Who legally employs the person doing the work. It is the
   first object on the surface, in every concept.
2. **The don't-know is a path, not a dead end.** Every ask carries it. It routes
   to a teach: the exact list, worded for the partner to relay, and a close that
   books time to go through the answers.
3. **Inbound is a first-class direction.** What they ask us gets an answer object
   with the flat answer first, the gloss in the same breath, and its evidence
   rung named.
4. **The relay list is an object you can hand over.** It accumulates during the
   call and leaves as a list. It is the promised deliverable of both tapes.
5. **Client facts are asked secondhand.** "Did the client say…" phrasing, a
   don't-know row on every client-fact ask, and the partner's own operation
   asked directly.
6. **Compression opens.** Country name, product name, count, boundary term —
   each is a door, exactly one click deep, per the click-depth law.
7. **Unproven ground is marked, never faked.** ∅ where the record is silent, and
   cite labels naming their rung. The 44-vs-175 distinction renders wherever
   entities are claimed.
8. **No names.** No account or person names on any playbook surface, ever, per
   the authoring canon.
9. **No figures.** The margin and displacement arguments render as language, not
   numbers, under the money doctrine.

---

## 4. What the face must carry

Objects the tapes proved necessary. Seven are new; the rest exist.

| Object | Status | Sourced from |
|---|---|---|
| The legal-employer fork | Exists as a question, not as a spine | tape 9/3 · `x-entity-own`, `gp-who-runs` |
| **The duty split** — what we do, what they keep, per lane | **New** | tape 9/3, the brain blink |
| **The product boundary card** — Talent, Solvo, EOR, contractor | **New** | tape 9/10, thirty minutes of it |
| **The country card** — one per jurisdiction, rungs marked | **New** | tape 9/3 Puerto Rico, tape 9/10 Philippines |
| **The entity-coverage fact** — 175 supported, 44 owned | Exists in `canon.ts`, unsurfaced | ON TAPE 2026-08-27 |
| **The teach list** — the relay questions, by lane | Partly: 113 `relayLine`s exist | canon point 4; both tapes' close |
| **The correction card** — what is actually true, said kindly | **New** | tape 9/3, the incumbent's workaround |
| **The chair card** — resale vs referral, with the displacement argument | Half: mechanics exist, argument does not | tape 9/10 |
| Scenario traps and objections | Exists, strong | `scenarios.ts` |
| The question bank | Exists, 113 | `discovery.ts`, `discovery-product.ts` |
| The go-live facts | Exists in `canon.ts` | ON TAPE 2026-08-27 |

---

## 5. The three concepts

Full interactive builds in `docs/mockups/playbook-face-triptych-2026-09-11.html`.
Distinctiveness is in the information architecture. The palette, type and
components are the brand's in all three.

### Concept 1 — The Fork · *decision-first*

The surface opens as one question and nothing else. Answer it and the whole face
re-lanes to that product line: its sub-forks, its duty split, its questions, its
traps, its relay list. The bank is never a 113-row list; it is whatever this lane
needs next. Every fork carries "they don't know," and that answer flips the
surface into teach mode rather than stalling it.

**Strength.** Kills the recital. The routing intelligence becomes the arrival
instead of a minute-25 aside. The narrowest possible surface at every moment.
**Cost.** Assumes you can answer the fork early. A partner mid-story about a
deal they half-understand may not be able to, which puts weight on the
don't-know path being genuinely good.

### Concept 2 — The Switchboard · *utterance-first*

One input at the top: what did they just say. Type it or tap a heard line. A
classifier routes it to one of five moves and renders that card in the seat
below — they asked us something, they told us a fact, they don't know, they said
something that isn't right, or they named a country. A record strip accumulates
what you've been told; the relay list accumulates what they couldn't answer.

**Strength.** The only concept that matches a hijacked call. Fastest path from
the sentence you just heard to the thing you say next. Inbound is the primary
direction rather than a bolt-on.
**Cost.** A classifier that misreads is worse than a list, so it needs a visible
escape to pick the move by hand. Highest build risk of the three.

### Concept 3 — The Three Desks · *direction-first*

Three desks, one active, sharing one running record of the call: **Ask**,
**Answer**, **Hand off**. Ask is the current call sheet with the scenario made
mandatory and the fork leading. Answer is the inbound desk, filtering as you
type across boundaries, countries, mechanics and objections. Hand off is the
relay list as a real object, with the close line and a copy control.

**Strength.** Makes the promised deliverable a first-class object. Names the
three directions on the surface so the operator learns the model. Lowest build
risk; reuses the most.
**Cost.** Three places means that during a live call you still choose a desk.
The tab is a thing you have to think about at the moment you can least afford to.

---

### 5.4 The triptych is a build, not a picture

All three concepts are live in one self-contained file — no network, no
dependencies, opens from disk. The mechanics are real because the mechanics are
the thing being judged:

- **The Fork** re-lanes on every answer, the gate's don't-know writes the exact
  relay question inline and onto the list, countries open one click deep, and
  the fork's own don't-know enters teach mode.
- **The Switchboard** classifies free text you type, not just the seeded lines.
  Rules, not a lookup: don't-know first, then the misconception patterns, then
  question shape scored against the answer bank, then country, then fact. All
  ten lines heard on the tapes route correctly, and the move can be forced by
  hand when the read is wrong.
- **The Three Desks** gate the Ask desk on a scenario, share one running record
  across all three desks, filter the answer bank as you type, and build a
  copyable list on Hand off.

Verified by a browser-driven pass of 34 checks covering every interaction in all
three, plus the canon scans (no names, no figures, the word "steps" absent) and
no-horizontal-scroll at 400, 640 and 900 pixels. Two things the pass caught and
fixed: a country card that opened uninvited on arrival, against the click-depth
law, and the talent lane asking the same question twice, against one-thought-one-
question.

## 6. What survives

- The 113-question bank, near-whole. This is good content.
- The scenario library's traps and objections — the strongest writing in the repo.
- The branch map as a concept. It needs don't-know rows, not replacing.
- `relayLine` on every question. It becomes the teach list's raw material.
- "What we've learned" — lessons, market facts, the second record's draft queue.
- The `?open=` deep link.
- Today's sheet surviving a reload.

## 7. What it costs

**Structure** (the face): the arrival, the fork spine, the don't-know routing,
the relay list as an object, the inbound seat. All three concepts need these.

**Content** (authored, and the larger half): the duty split per lane, the
product boundary card, a country card format plus a first set of jurisdictions,
the correction cards, the displacement argument, don't-know rows added across
442 answer rows, and secondhand phrasing on every client-fact ask.

**Data**: none new. The inbound corpus already extracts and shapes prospect
questions. `canon.ts` already holds the coverage and go-live facts.

## 8. Audits before any ship

Per the authoring canon's ship audit, run every time the surface changes: the
graph audit (every node reachable, every path ends in a close, every don't-know
routed to a teach or a list), the scans (account and person names, money,
speech), and an adversarial read against every law in §3. Plus two the tapes
added: every entity claim renders the 44-vs-175 distinction, and every country
card names its rung or marks ∅.

## 9. Open decisions

1. **Which concept.** Or which parts of which — the Fork's arrival and the Three
   Desks' hand-off are not mutually exclusive.
2. **The money doctrine at the Playbook's edge.** The margin and displacement
   arguments are the most persuasive material on either tape and both are
   monetary in nature. The triptych renders them as language with no figures.
   If figures are ever permitted on this surface, that is a founder call, not an
   inference.
3. **Scenario mandatory on arrival?** Proposed yes. It removes the "engine's own
   order" default that let the same recital go to two unlike partners.
4. **Where the country cards come from.** Authored, sourced, and rung-marked is
   the proposal. This is the largest content commitment in the document and the
   thing that turns "175" from a number into an answer.
5. **Whether Puerto Rico is an EOR jurisdiction for us.** Unresolved on tape and
   unresolved in the repo. Marked ∅ in all three concepts. It gated a live deal.

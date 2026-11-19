# Instant everything: making GEM answer in milliseconds

Status: explored with the founder on 2026-11-19 and deliberately not started
("I'm not gonna do it… for now"). Kept here so a later session can pick it up.

## The question

The founder asked whether GEM could answer near-instantly, in milliseconds,
instead of waiting on the app to find and load data. The trigger was the
rails mockups' "Price a scenario", "Country facts" and "Ask the brain"
panels. The founder rejected two framings from the first answer: that the
brain "can't" be fast because a model writes its answer, and that cosmetic
speed-ups count (showing sources first, streaming the answer, nightly
summaries, reusing answers). The founder wants the real how-to, whatever the
work.

## How each lookup works today (2026-11-19)

- **Price a scenario.** `src/lib/pricing/quote.ts` answers by arithmetic from
  the Pricing page's source, with no model call and no database read. The
  compute takes well under a millisecond. The wait is the trip from the
  browser to the server and back.
- **Country facts.** The country sheet (about 360 KB) stays on the server and
  is served one country at a time by `src/app/playbook/country/route.ts`, with
  `cache-control: no-store` and a sign-in check on every call.
- **Ask the brain.** `src/lib/intranet/retrieve.ts` searches the Intranet's
  memory, then `src/lib/intranet/synthesize.ts` has the model write the answer
  (Opus roster, `src/lib/intranet/doctrine.ts`). Writing after the question is
  asked takes seconds.
- **Every page.** Pages are worked out from the database on every request
  (CLAUDE.md, D15/D16: "every page derives on request"). That round trip is
  most of the felt wait.

## The design: do the work before the question, and keep the record local

1. **Local-first record.** Sync the live record for the HomeRoom's live and
   hand-picked deals to the browser's own database (IndexedDB): notes, emails,
   promises, people, facts, Intranet claims, and the price and country tables.
2. **Derive in the browser.** The room engine is TypeScript and can run in the
   browser (a Web Worker), so every page, panel and count is worked out
   locally from the synced record, in milliseconds.
3. **Push, not ask.** When the server files anything (Chute, relays, the weekly
   export, colleague activity), it pushes the change to the browser within a
   second (for example Supabase Realtime).
4. **Your actions show at once.** "Mark it done" and the like update the screen
   immediately, and the server confirms behind the scenes. A refusal undoes
   the change on screen and says so.

### The brain, instant

1. **Answers from facts.** The record already holds about 6,100 extracted
   statements (IntranetClaim) with speaker, date, account and topics. A parser
   turns the question into a lookup across them, and the answer is assembled
   from the matching statements with a cite on every line, in the browser.
2. **Answer sets written at filing time.** Whenever something is filed on a
   deal, Opus rewrites that deal's answer set within seconds: where it stands,
   what is owed on each side, what the client needs country by country, the
   people, what was sent, the risks. The same for each country and each person.
3. **Answer what the screen implies.** Opening a deal or pointing at a country
   has Opus answer the likely questions in the background before the click.
4. **Find answers locally.** A search index in the browser matches the
   question to all of the above in milliseconds.
5. **The one honest limit.** A question nobody anticipated, whose answer must
   be newly reasoned from many sources, still needs a model at that moment
   (seconds with Opus). Each such answer joins the stored set, so the same
   question is instant next time.

### Price and country, instant

The country cards for the deals' countries and the pricing tables sit in the
browser; country facts open and quotes compute locally in milliseconds.

## Decisions the founder would need to make

1. **Our prices in the HomeRoom.** The pricing tables in the browser and quotes
   shown in the HomeRoom would extend the money carve-out (today: the Pricing
   page and the price desk's ask answers).
2. **"Derives on request".** Clarify that working a page out in the browser
   from a live, synced copy of the record satisfies the rule.
3. **The search index.** Embedding models are not Opus; the rule says every
   model call is Opus or better. Either exempt embeddings (they write nothing
   anyone reads) or use plain word-matching (instant, less clever).
4. **The record on the laptop.** The browser's store holds a copy behind the
   app's sign-in; it should be wiped on sign-out.

## Build order

1. Sync the live record to the browser, with push updates and a signed-in store.
2. Move the room's calculations into the browser (every page, panel and count).
3. Price and country in the browser.
4. The brain's fact lookups.
5. Answer sets written at filing time.
6. Predicted questions answered ahead.
7. The browser search index across all of it.

## What could break, and the guards

### 1. Rules about what never reaches the browser (most serious)
- **The routing roster** never ships to the browser (CLAUDE.md, the Chute).
  Guard: routing, filing, duplicate checks and take-backs stay on the server;
  only results sync.
- **Staged second-record bodies** leave the store only through the evidence
  route and never enter the brain. Guard: sync only what pages already show,
  as cleaned, money-redacted excerpts.
- **Money.** Redaction happens when the server renders today. Guard: redact
  before anything leaves the server, plus a test that scans every synced
  payload for figures.
- **Namespaced rows** (the Scratchpaper and others) stay out of the Intranet
  mirror. Guard: per-store sync rules with tests.

### 2. Stale or conflicting data on screen
- A dropped push connection (sleep, Wi-Fi) leaves an hour-old copy. Guard: a
  visible "up to date / reconnecting" state, resync on wake, no actions against
  a known-stale copy.
- Two devices editing at once. Guard: the server's record wins and the losing
  screen updates itself.
- An action shown before the server confirms it. Guard: undo on refusal, said
  plainly.
- Chicago days computed in the browser. Guard: the same tested Chicago-day code
  the server uses.

### 3. Answers written ahead with Opus
- **Cost** rises with rewrites per filing and predicted questions. Guard:
  rewrite only what a filing touched, a daily spend cap, a visible count.
- **A stored answer behind the record.** Guard: each answer carries the time of
  the last filing it covers and reads "updating" until it includes the newest.
- **Money or invented facts** in stored answers. Guard: the brain's existing
  checks (redaction, required cites, nothing the record does not hold) before
  any answer can show.
- **Rate limits** on bursts (a backfill, a weekly export). Guard: a queue that
  spreads the rewrites.

### 4. The existing suite and the rebuild itself
- About 2,900 tests assume server-side derivation. Guard: keep the server path,
  switch one surface at a time behind a switch, keep the suite green at each
  stage.
- Click-depth limits and arrival budgets must pass the same way.
- Production keeps filing throughout (relays, Chute, drafts cron, Sales Nav
  inbound). Guard: run old and new side by side and compare before retiring
  the old path.

### 5. The browser and the device
- Browser storage can be cleared; rebuild cleanly from the server.
- The first sync on a new browser takes seconds; afterwards only changes travel.
- The record sits on the laptop; wipe on sign-out, keep the sign-in.

### 6. The search index
- Without exempting embeddings, word-matching misses differently-phrased
  questions ("Who's stalling?" vs "Tom hasn't replied"); structured lookups
  over the fact store cover most of the gap.

### The three most likely to bite
1. A money or staged-body leak through an overly broad sync.
2. A stale screen after the laptop sleeps.
3. Opus costs climbing faster than expected.

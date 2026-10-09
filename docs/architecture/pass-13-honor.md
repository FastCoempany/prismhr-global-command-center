---
title: Pass 13 — the eleven left on honor
status: Shipped 2026-10-09
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-12-honor.md
  - docs/architecture/mockups.md
  - docs/architecture/surfaces.md
---

# Pass 13 — the eleven left on honor

Pass 12 left eleven rows on honor. Pass 13 walked each one, built what an honest pin needed, fixed the three breaks it found, and moved two to chain. Nine stay, each with its reason below. One canon text gap goes to the founder (§4).

## 1. What moved

| Row | Decree | Now | Pin | What it took |
|---|---|---|---|---|
| A4.1 | "It inherits every law of the first: the record outranks every seed, machinery is never a person, money never renders, derived facts read the widest merge of both records by latest" | chain | tests/canon/second-record.test.ts › "the second record inherits every law of the first (A4.1, whole scope)" (4) | The decree names four laws. One describe pins each on the second record's own path: `lastHumanTouch` lets the export stand in only until the operator's record speaks and gives the record a tie; `buildRollup` names nobody for a mechanism's row and `orgSignalsOf` and `liveMotionIds` leave the bare datetime silent; the staged subject and body, the rollup's subjects and the Sendbook's head carry no figure; the later record leads and either record's inbound excludes. Each law had pins before; the whole had none. |
| A6.12 | "mockup work NEVER ships without an explicit ship order" | chain | tests/canon/standing-decrees.test.ts › "every mockup carries its disposition, and a shipped one names its order (A6.12)" (2); tests/canon/ted-doctrine.test.ts › "every page route carries a recorded audit and ship order (A2.8)" (2) | docs/architecture/mockups.md has one row per document under docs/mockups: what it judged and one of three dispositions, shipped on a dated order with the PR, a concept that never shipped, or a document from before the rule. A mockup with no row, a row for a file that is gone, or any other disposition fails the chain. With the surfaces registry's ship-order column (pass 12), every route and every mockup carries its order. |

## 2. What broke, and is fixed

Three breaks, each with a test that fails on the old code:

1. **Staged subjects skipped the money redaction (A4.1, the money doctrine).** `src/lib/activity/ingest.ts` redacted a row's body before staging it and kept the subject raw, so "Re: the $12,000 quote" reached the rollup's last human touch, the THEIRS line's subjects and the evidence route's drill. The subject now takes the same redaction as the body, and the evidence route redacts both fields again on the way out, for slices staged before this pass. The Sendbook's head was already redacted on its own.
2. **The HomeRoom's shape chip and meta were not doors (A5.2).** "Shaping up to be EOR" and "RESALE · MEXICO" compress the read's products and countries and opened nothing. The chip is a button now: one click lists each product and country the read took, with the day and the record line it came from, under the title line (`identity` on the row, built from the read's own sourced facts). A row whose read holds no fact keeps a plain chip. The chair (RESALE, REFERRAL) carries no source in the read, so it has no line yet.
3. **The click-depth sweep read no abbreviations (A5.1 to A5.3).** The sweep now reads the app's own abbreviations (EOR, PEO, PEPM, CSM, HCM, PHR, VTT, API, EOD, EOW, COR, GP, CP, SF) as compressions: a short line carrying one is a door, or a door within its card names it, or it fails. Running prose of eight words or more is a sentence, not a compression. The Scratchpaper joins the mounted faces (twelve).

Also in this pass: the ingest copy sweep now kills recency as a reason ("recently", "lately", "a while") and the canon lint retires "their book is" beside "domestic-only" and "their own book".

## 3. The adversarial read of the ingest copy (A12.1, A12.3, A12.10, A12.12)

Every operator string on the ingest surfaces was read again against the four rules, by hand: the held box, the receipt line, the hand-off, the Chute, the activity dock and Send-it's receipts (the literals the sweep enumerates). No line is a noun-form instruction; the status lines state a fact ("The 10/6 drop is distilled."), which the canon allows. No reason leans on recency. No line talks about history as a property. No line carries invented slang, a constructed phrase or a reassurance flourish; "That didn't land." and "The drop didn't take." are plain speech. The rows hold. Their lints are stronger; what is left is judgment (§5).

## 4. One canon text gap for the founder

A11.6 reads "Ship pattern: branch `claude/prismhr-demo-guide-strategy-6h0oqg` → PR → Vercel CI green → squash merge = live production." Every PR since pass 7 has shipped from its own `claude/…` branch; the named branch has not carried a change in weeks. The practice is the decree's, the branch name is not. Nothing was changed. The ruling needed is whether the line reads "a `claude/` branch" or keeps the name.

## 5. What stays, and why

| Row | Pin | Why it stays |
|---|---|---|
| A5.1 | partial · tests/browser/click-depth.test.ts, twelve faces, counts and abbreviations | The sweep reads every visible number and abbreviation on the faces it mounts. A two-word term or a theme with neither, and a face it cannot mount, stay outside it. |
| A5.2 | partial · as A5.1 | As A5.1. |
| A5.3 | partial · as A5.1 | As A5.1. |
| A5.4 | partial · the A5 sweep (no fold open on arrival, twelve faces); the budget ratchet | The same reach as A5.1. |
| A11.6 | partial · the verify chain's order is pinned | The branch, the PR, CI and the squash are process; and the line names a branch no longer in use (§4). |
| A12.1 | partial · the A12 sweep's noun-form guard | Mood is judgment beyond the guard. |
| A12.3 | partial · the A12 sweep kills recency as a reason | Whether a reason is the trigger is a judgment about what a line says. |
| A12.10 | partial · the lint retires "domestic-only", "their own book" and "their book is" | Property-talk is judgment beyond the examples. |
| A12.12 | partial · the A12 sweep's flourish and slang list | Constructed phrasing is judgment beyond the list. |

## 6. The scoreboard after

| | Before pass 13 | After |
|---|---|---|
| Honor-system decrees (111) | 11 honor · 98 chain · 2 retired | 9 honor · 100 chain · 2 retired |
| Of the honor rows, with partial pins | 10 | 9 |

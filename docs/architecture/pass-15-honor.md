---
title: Pass 15 — the eight left on honor
status: Shipped 2026-10-09
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-14-honor.md
  - tests/ingest-copy-register.json
---

# Pass 15 — the eight left on honor

Pass 14 left eight rows on honor. Pass 15 built the two things it said it would: a read register for the ingest surfaces' copy, which moves the three wording rows, and five more faces in the browser sweeps, which found two breaks. Five stay, each with its reason below.

## 1. What moved

| Row | Decree | Now | Pin | What it took |
|---|---|---|---|---|
| A12.1 | "Imperative mood. … Verbs, never noun-forms" | chain | tests/ingest-faces.test.ts › "every operator string on the ingest surfaces is on the read register (A12.1, A12.10, A12.12, whole scope)" (3), over tests/ingest-copy-register.json; the lints beside it | The register (§2). |
| A12.10 | "No property-talk about history." | chain | as A12.1 | The register (§2). |
| A12.12 | "invented slang …, constructed non-conversational phrasing …, and performative reassurance flourishes" | chain | as A12.1 | The register (§2). |

## 2. The read register

These three rules are judgment. A pattern catches the examples the canon names (the noun-form, "domestic-only", "no judgment"), and the sweep has run those since pass 10; whether a new line is imperative, or talks about history as a property, or carries a phrase nobody would say, is a read.

`tests/ingest-copy-register.json` makes the read happen before a line ships. It lists every operator string the sweep's scope spells, 443 strings across 41 files, each read in this pass against the three rules and found clean. The chain holds the register to the code both ways: a string the code spells that is not on the register fails, with the message that it must be read and added; a registered string the code no longer spells fails, so the register cannot rot into a blanket pass. The scope is the sweep's own file list without the three modules a model reads (the distiller's prompt, the brain's runners, the verdict's prompt), plus the Drop's handlers in the HomeRoom; a string with no space or no word in it, a key or a class or a head, is not copy. Templates carry X where a value goes.

What this pins, said plainly: no unread line reaches the ingest surfaces. The judgment stays a person's. The gate is the chain's. Pass 14 weighed the same register over 830 strings and set it aside as a stamp; scoped to what the sweep already calls operator copy, it is a read, and the read was done.

## 3. The five faces mounted

The Intake shelf, the payroll demo, the demo sidekick, the flow-first sidekick and the Pricing table join the click-depth sweep, the budget ratchet and the palette sweep, eighteen faces now. Two breaks found and fixed, each with a test that fails on the old code:

1. **A stale count on the Intake shelf.** The Sales Nav grab's description said "118 accounts in under a minute", a figure typed into the copy on the day it was written and never read from the book. The line reads "every row itself in under a minute" now.
2. **Black form controls on three faces.** Inputs, selects and textareas on the Intake shelf, the demo sidekick and the Pricing table kept the browser's default black, where the canon's ink is navy. The global sheet now hands every control the surrounding ink.

Four named exemptions join the sweep, each with its reason: a price is the figure itself (the third carve-out) and a tier is the price's own label; a screen's ordinal in a demo flow; a source moment's id and a frame's file name, which are provenance; and the demo sidekick's audience label, trade vocabulary with nothing derived behind it. The sweep also reads prose by its block now: a bold fragment inside a sentence is still the sentence.

The faces still outside the sweep are the server pages the harness cannot mount: asks, partners, archive, demos, the Intranet's health and pastes pages, and login, which carries nothing the sweep reads.

## 4. What stays, and why

| Row | Pin | Why it stays |
|---|---|---|
| A5.1 | partial · tests/browser/click-depth.test.ts, eighteen faces, counts and abbreviations | A two-word term or a theme with neither, and the six server pages, stay outside the sweep. |
| A5.2 | partial · as A5.1 | As A5.1. |
| A5.3 | partial · as A5.1 | As A5.1. |
| A5.4 | partial · the A5 sweep (no fold open on arrival, eighteen faces); the budget ratchet | The same reach as A5.1. |
| A11.6 | partial · the verify chain's order is pinned | The branch, the PR, CI and the squash are process. |

## 5. The scoreboard after

| | Before pass 15 | After |
|---|---|---|
| Honor-system decrees (111) | 8 honor · 101 chain · 2 retired | 5 honor · 104 chain · 2 retired |
| Of the honor rows, with partial pins | 8 | 5 |

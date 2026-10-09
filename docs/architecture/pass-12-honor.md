---
title: Pass 12 — the last fourteen
status: Shipped 2026-10-08
owner: Founder
related_docs:
  - docs/architecture/canon-scoreboard.md
  - docs/architecture/pass-11-browser.md
  - docs/architecture/surfaces.md
---

# Pass 12 — the last fourteen

Pass 11 left fourteen rows on honor. Pass 12 walked each one, built what a pin needed where one was honestly possible, and moved three to chain. Eleven stay, each with its reason below. One canon gap went to the founder (§3) and was ruled 2026-10-09.

## 1. What moved

| Row | Decree | Now | Pin | What it took |
|---|---|---|---|---|
| A4.27 | "every citation, theme, count, and case on every surface drills to row-level meat" | chain | tests/browser/evidence.test.ts (three describes, eight tests); tests/browser/accounts.test.ts; tests/browser/room.test.ts; tests/groundwork.test.ts › "the readout's counts open what they count (A4.27, the meat law)" (2); tests/second-record-faces.test.ts › "a second-record draft carries its theme and every account it counted (A4.27)" | Three surfaces did not drill. The Playbook's draft queue showed "N cases across M accounts" as text: each draft now carries its theme and the accounts it counted, and "THE N CASES ACROSS M ACCOUNTS ▸" opens each account's cases on that theme through the evidence route, and a case opens its timeline. The State of play's book paragraph stated six counts as text: each now opens the names it counts in place, and the book count links to the sheet. The sentence reads the same. The draft desk's cited line and the Sendbook's ↩ REPLIED were already doors and are now pinned in the browser. |
| A4.31 | "Arrival budgets never grow" | chain | tests/browser/budgets.test.ts › "A4.31 · arrival budgets never grow", nine units | The ratchet measured five faces. It now measures every second-record face: the accounts row, the draft desk, the Groundwork stage, the HomeRoom row, the Intranet entry, the Playbook draft, the roundup prep, the Sendbook line and the State of play. |
| A2.8 | "New surfaces are audited against this doctrine before they ship" | chain | tests/canon/ted-doctrine.test.ts › the A2.4 gate; › "every page route carries a recorded audit and ship order (A2.8)" (2) | docs/architecture/surfaces.md has one row per page route with its face, its audit and its ship order. The ten routes with no recorded audit were audited here (§2). A page.tsx without a row, or a row without an audit, fails the chain, so a new route cannot ship unaudited. The A2.4 gate already stops any surface deriving an account fact from a narrow read. |

Also in this pass:

- The browser harness fails fast. A fixture that throws now reports its page errors instead of waiting out the test's timeout.
- The click-depth sweep mounts eleven faces, up from eight: the draft desk, the State of play and a Playbook draft join it. A count inside a card whose door names the same numbers counts as opened.
- The palette sweep covers the same three new faces.
- The Playbook's draft fold now names what it holds ("FROM THE SECOND RECORD · N DRAFTS ▾"), and the dismiss tooltip reads "Close without filing. It never comes back."

## 2. The ten routes audited

Each of these had no recorded Ted-doctrine audit. None derives an account fact from a narrow read.

| Route | What it reads |
|---|---|
| /asks | The brain's own asks and answers (intranetAsk) and the account's name. Price-desk answers re-derive from the Pricing page's source. |
| /demos | Static links to the demo tabs. |
| /intranet/health | Evals, store counts and the model roster. |
| /intranet/pastes | The brain's paste ledger by day. |
| /login | Nothing about accounts. |
| /payroll-demo-sidekick | Static demo data. |
| /pricing | Our price list (§3). |
| /sidekick | The demo tables (demoAccount, demoNote, demoPin, demoPlaybook, demoScreenOverride), never the record. |
| /sidekick-v3 | The same demo tables. |
| /sidekick/flows/prismhr-global | A static, account-neutral flow. |

## 3. One canon gap for the founder

The Pricing page renders our price list, and the price desk (founder-decreed 2026-08-21) answers pricing questions from it on the Asks page and through the Scratchpaper's ask door. The code calls this "the one sanctioned money surface" (src/lib/pricing/quote.ts; tests/price-desk.test.ts). CLAUDE.md does not say so. Its standing decrees list two carve-outs, the Scratchpaper and the country wing's statutory facts, and then: "Our money, everywhere else, still never renders."

Nothing was changed. The ruling needed is whether the price desk and the Pricing page are written into CLAUDE.md as a third carve-out, or whether the page stops rendering figures.

**Ruled 2026-10-09.** On the founder's order it is written in as the third carve-out (CLAUDE.md, "Three carve-outs stand"). The scoreboard carries it as P5, enforced by tests/price-desk.test.ts and a scan that only the Pricing page, the Intranet's ask, the Asks page and the Scratchpaper's ask door read the price source.

## 4. What stays, and why

| Row | Pin | Why it stays |
|---|---|---|
| A4.1 | partial · the A2.4 gate, the A4.30 gate and the pass 10 pins | A law over every law of the first record. Each law has its own pin; the whole is not one test. |
| A5.1 | partial · tests/browser/click-depth.test.ts, eleven faces | The sweep reads every visible number on the faces it mounts. A compression with no digit, and a face it does not mount, stay outside it. |
| A5.2 | partial · as A5.1 | As A5.1. |
| A5.3 | partial · as A5.1 | As A5.1. |
| A5.4 | partial · the A5 sweep (no fold open on arrival, eleven faces); the budget ratchet | The same reach as A5.1: an unmounted face can open a fold on arrival unseen. |
| A6.12 | partial · the surfaces registry's ship-order column | Every route carries its ship order, but a face can ship inside an existing route. That still rides the PR's recorded order. |
| A11.6 | partial · the verify chain's order is pinned | The branch, the PR, CI and the squash are process. |
| A12.1 | partial · the A12 sweep | Mood is judgment beyond the noun-form guard. |
| A12.3 | none | Whether a reason is the trigger is a judgment about what a line says. |
| A12.10 | partial · the A12 sweep | The lint knows the decree's example. Property-talk is judgment. |
| A12.12 | partial · the A12 sweep | Constructed phrasing is judgment. |

## 5. The scoreboard after

| | Before pass 12 | After |
|---|---|---|
| Honor-system decrees (111) | 14 honor · 95 chain · 2 retired | 11 honor · 98 chain · 2 retired |
| Of the honor rows, with partial pins | 12 | 10 |

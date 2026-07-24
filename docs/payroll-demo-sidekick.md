# Payroll Demo Sidekick

A standalone sidekick tab — **Payroll Demo Sidekick** → `/payroll-demo-sidekick` —
built from the `globalpayrolldemoCN` release assets (meeting recording + VTT
transcript). It is fully independent of the other Sidekick tabs: its own store,
route, styles and screenshots; no database tables; read-only.

## What it is

The recorded 51:47 demo, distilled into **44 steps in recorded screen order**,
with a **question ledger of 47 entries that speaks for every one of the 66
question lines detected in the transcript**. Each question is pinned to the step
where it was asked, records what was on screen at that moment, and carries the
answer that was actually given (or a `deferred` / `follow-up` status when the
call didn't resolve it).

## Country neutralization

The recorded demo used one example country throughout. Per the curation rule,
every mention of that country is translated to **country / [any country]** in
all curated text — no matter the context — and country-specific artifacts are
written generically:

- currency code → *local currency*
- statutory contribution acronyms → *statutory pension / social insurance / employment insurance contributions*
- provinces → *[province/region]*
- year-end tax forms → *year-end tax documents*

Screenshots come straight from the recording, so on-screen country names,
flags and currency codes should be read as *[any country] / local currency*
(the store's `meta.neutralization` note carries this caveat into the app).
Attendees are role-labeled (Presenter, Host, Prospect — payroll ops / sales /
service ops), keeping the store account-neutral like the other curated flows.

## Data layer

```
src/lib/payroll-demo-sidekick/
  steps.json   ← meta + 44 steps + 47 questions (single store)
  index.ts     ← types + accessors
src/app/payroll-demo-sidekick/
  page.tsx                 ← server page (wayfinder + client)
  payroll-demo-client.tsx  ← flow lens, question ledger lens, search, presenter-style prev/next
  payroll-demo.module.css
public/demo-screens/payroll-demo/<stepId>.jpg  ← 41 committed screenshots
```

Steps carry: timestamp range, nav context, visual summary, on-screen details,
say track, and demo purpose. Questions carry: asker role, timestamp, the
question, what was on screen when it was asked, the answer given, a short
verbatim quote, and status (`answered` / `deferred` / `follow-up`).

Camera-only steps (kickoff and the two wrap-up steps) intentionally ship
without screenshots — the card hides the image slot, same behavior as the v3
card when a frame is missing.

## Provenance & verification

- Release: `globalpayrolldemoCN`
  - recording sha256 `c09f26c658fb389cf7688ee568c73aad75a1e2156e03646cb5fa1c1f854161a6`
  - transcript sha256 `55ba870229d70bb04ebc790c001eaf7733c5179d69ed7f6c093762cfb789a0a4`
- Build-time gates (run in the working session, artifacts not committed):
  every `?`-line in the VTT claimed by exactly one ledger entry; zero
  source-country leaks in curated text; per-step screenshots pulled from the
  recording at the step's timestamp and eyeballed against the visual summary.

## UI

Two lenses over one store:

- **Flow** — step rail with per-step question-count chips; step card shows the
  screenshot, on-screen summary, say track, and the questions asked at that
  step. Arrow keys walk prev/next.
- **Questions** — the full ledger grouped by step, each group linking back to
  its step. The rail footer shows the spoken-for tally (answered vs
  deferred/follow-up).

Search covers steps and questions together.

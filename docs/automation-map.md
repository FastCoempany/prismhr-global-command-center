# Automation map — what's mundane enough to run behind a one-step approval gate

**Purpose.** As the Global consultant motion scales, a lot of the daily work is
_repetitive, low-judgment, and template-shaped_ — the kind of thing that should
be **drafted by the system and shipped with a single approve/edit click**, not
typed from scratch each time. This map rates each recurring activity by how
automatable it is and what the right human gate is, so we can sequence the build
of "automate copy to internal partners and beyond."

**Gate legend**

- **Auto + notify** — system does it, tells you after. Reserve for zero-risk,
  internal-only, fully reversible actions.
- **1-click approve** — system drafts, you glance and hit send. No edit needed
  in the common case.
- **1-click edit → send** — system drafts, you tweak a line, then send. The
  default for anything that lands in front of a partner.
- **Human-authored** — judgment/relationship-critical; system can _prep_ but not
  draft the substance.

The **"copy to partners"** column is the near-term ask: everything that ends as a
message to an internal partner (Eric, a CSM) or to Aleks/marketing.

---

## The map

| # | Recurring activity | Frequency | Judgment | Automatable? | Right gate | Goes to a partner? | Where it lives today |
|---|---|---|---|---|---|---|---|
| 1 | Draft the partner-engagement line for the day's top account (displacement/greenfield ask) | Daily | Low | **High** — already templated in `partnerAngle()` | **1-click edit → send** | Yes — CSM / Eric | Today · Band 3 ("Copy the line") |
| 2 | Compile the "Signal in" digest (accounts with new/real demand) | Daily | Low | **High** | **1-click approve** | Optional — Aleks weekly | Today · Band 1 |
| 3 | Surface aging commitments (recap owed, availability request) + draft the nudge | Daily | Low–Med | **High** to detect, **Med** to word | **1-click edit → send** | Yes — CSM | Today · Band 2 (detect); copy = next |
| 4 | Partner brief when seeding a new account ("here's the Global angle for X") | Per new account | Medium | **Medium** — structure auto, framing human | **1-click edit → send** | Yes — CSM / Eric | Dashboard seed note → manual today |
| 5 | Post-demo recap to the partner | Per demo | Medium | **Medium** | **1-click edit → send** | Yes | Manual |
| 6 | Weekly base-signal roll-up for the Aleks 1:1 | Weekly | Low–Med | **High** | **1-click approve** | Yes — Aleks | Today · Band 4 + agenda (assembles it) |
| 7 | "Voice of the base" / enablement-gap capture → grouped summary for marketing | Weekly | Medium | **High to group, Med to phrase** | **1-click edit → send** | Yes — marketing | Today · capture band (logs; summary = next) |
| 8 | Per-partner target list ("your book, ranked for Global") | Weekly / on-demand | Low | **High** | **1-click approve** | Yes — each partner | Account Room · CSV export + rollup |
| 9 | Country + PEPM price sheet for a specific opportunity | Per deal | Low | **High** | **1-click approve** | Yes — partner/client | Pricing room (manual assembly) |
| 10 | Research refresh on stale/low-confidence accounts | Monthly | Low | **High** — the research workflow already runs | **Auto + notify** (data only) | No | Account Room (manual trigger) |
| 11 | Move a Dashboard node when a checkbox gate is met | Per event | Low | **High** but owner-owned by design | **Auto + notify** (optional) | No | Dashboard (manual — deliberately) |
| 12 | Lunch-and-learn / SME-webinar invite + follow-up | Per session | Medium | **Medium** | **1-click edit → send** | Yes — partners | Not built |
| 13 | Discovery-call scheduling nudge ("confirm availability in 5 biz days") | Per opportunity | Low | **High** | **1-click edit → send** | Yes — CSM | Dashboard demo-node checklist |
| 14 | The actual pitch/positioning in a live partner or client conversation | Per touch | **High** | **Low** | **Human-authored** (system preps) | Yes | Human |
| 15 | Reading a relationship — is a partner protective, cold, ready? | Ongoing | **High** | **Low** | **Human-authored** | — | Human |

---

## Read of the table

- **Tier 1 — automate first (copy to partners).** Rows 1, 3, 6, 8. High
  frequency, low judgment, and they all end as a short message to a partner or
  Aleks. Each is either already half-built (Today bands, CSV export, the copy
  button) or one template away. This is the "automate copy to internal partners"
  ask, and it's the cheapest, highest-leverage place to start.
- **Tier 2 — draft-and-edit.** Rows 4, 5, 7, 12, 13. Still template-shaped but
  the framing carries relationship weight, so they stay behind a
  **1-click edit → send** gate — never auto-fired.
- **Tier 3 — data-only automation.** Rows 10, 11. Safe to run on a schedule and
  just notify, because they touch _our_ system, not a partner's inbox.
- **Never automate.** Rows 14, 15. The pitch in the room and the read on a
  relationship are the job. The system's role there is to _prep_ — surface the
  countries, the incumbent, the do's-and-don'ts — not to speak.

## The one rule for the gate

Anything that leaves the building — reaches a partner, Aleks, marketing, or a
client — goes out **only** behind a human click, and defaults to
**1-click edit → send** so the relationship voice is never fully ceded to a
template. Auto-fire is reserved for actions that stay inside our own tools and
are fully reversible.

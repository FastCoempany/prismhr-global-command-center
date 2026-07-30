# Sales Navigator — what the operator's instance actually looks like

Source: the ten screenshots in the GitHub release tagged
`salesnavscreenshots` (published 2026-07-30). Eight are Sales Navigator;
two are this app's own intranet keep/index surfaces, included as the
pattern for how learnings get stored. This document is the stored read —
Groundwork's research directives (plan §8) are built on it.

---

## 1. The state of the operator's instance, as captured

These are facts about the live account, not product generalities:

- **Salesforce sync is on.** Accounts and people carry `CRM` badges;
  people found in search who are missing from Salesforce carry a
  `! Update CRM` flag — which makes Sales Navigator a working
  contact-gap detector, not just a search tool.
- **The book is uploaded.** An account list named
  `Astee Accounts Antaeus-2026-07-28-14-51-21 (118)` exists — 118 of the
  book's accounts, uploaded 7/28.
- **Book of business is NOT yet set.** The Home rail reads "My Current
  Accounts (0)" with the upload prompt still showing. Until the 118-account
  list is selected as the book of business, alerts and intent signals are
  not keyed to the book. **This is the single highest-leverage
  five-minute fix in the whole tool.**
- **Personas exist and are fresh.** "Recommended buyer persona" (updated
  7/27): Function = Human Resources, Operations; Seniority = Director,
  Vice President, CXO; Region = NAMER. Three personas total. Account pages
  show per-account persona counts (e.g. AlphaStaffHCM: Recommended buyer
  persona 7 · CXO 5 · Director+ 19).
- **Opportunity dates flow from Salesforce onto the account list.** Seen
  on the dashboard: "AlphaStaff- Healthee" 7/31/2026 · "Adapt: Compliance
  Amendment" 8/21/2026 · "Amplify: ClearCo" 7/31/2026 · "ArmHR- Empower"
  7/31/2026 · "American Benefits - Comm Hub" 10/21/2026 · "Anthros -
  PosterElite" 7/31/2026 · "AscendHR ClientSpace Premium" 8/31/2026. The
  **"Upcoming deals" chip counts 48** — 48 of the 118 uploaded accounts
  have a dated opportunity in the CRM. These are HCM-side deals: live
  conversations Global can ride instead of opening cold.
- **Buyer intent is live on book accounts.** Captured directly:
  - **My HR Pros** (Southern Personnel Management / myhrprofessionals —
    a book account): "Increase in buyer intent, 1w ago — now expressing
    High buyer intent in your company."
  - **Amplify HR Management**: High intent, **11 activities** — the
    hottest reading on the visible page — plus 27 of 60 connection paths
    and 1 TeamLink connection.
  - **AlphaStaffHCM**: High, 1 activity. **Armhr**: High, plus a
    "Recently hired" alert. **AscendHR**: High. **Adapt HR**: High.
  Buyer intent here means employees of those accounts engaging with our
  company's LinkedIn presence — pre-warmed rooms for the relay motion.
- **The Home feed already carries book intelligence.** Alerts seen:
  suggested-account growth reads ("job openings have accelerated in the
  past 90 days"), PrismHR's own posts, and a book account posting
  (Gordon J. Maier & Company posted a new photo).

## 2. The surfaces and what each is for

| Surface | What it holds | Groundwork's use |
| --- | --- | --- |
| **Home** | The alerts feed (All / Bookmarked), searchable, filterable by Accounts / Account list / Leads / Lead list; Book of business selector; Personas rail | The daily 5-minute alerts sweep (directive D9) |
| **Accounts dashboard** | The 118-account list with columns: Opportunity date (CRM), Connection paths (x of y), Buyer intent (level + activity count), Category intent, Alerts, Notes, Lead recommendations by persona; chips: All · Starred · Upcoming deals (48) · Moderate or high buyer intent · Growth alerts · Risk alerts | The daily intent triage (D8) and the weekly upcoming-deals cross-check (D10) |
| **Account page** | About; Common searches (All employees / Decision makers); per-account personas; **Account IQ** (AI: how the company makes money, "see how your product can help"); Key people with connection degrees; Relationship explorer; Relationship map | Pre-meeting account briefs (D3, D4); stakeholder work |
| **Relationship explorer** | Persona-driven people recommendations with filters: Persona · Function · Seniority · Current job title · Region; cards show degree, CRM state (incl. `! Update CRM`), mutual connections, "Follows your company" | Stakeholder-gap and second-thread directives (D1, D2) |
| **Lead search** | Filters: Current company · Company headcount · Function · Current job title · Seniority level · Geography · Industry · **Account has buyer intent** (toggle) · Best path in: Connection · Recent updates: **Changed jobs** (toggle) · **Posted on LinkedIn** (toggle) | People recipes (D1, D2, D7, D11) |
| **Account search** | Company attributes: Annual revenue · Company headcount (+growth) · Headquarters location · Industry · Number of followers · **Department headcount (+growth)** · Fortune; Spotlights: **Job opportunities** · Recent activities · Connection · **Buyer intent**; Workflow: Companies in CRM · Saved accounts · Account lists | Account refresh recipes (D3, D5) |
| Saved searches / Personas / Pin filters / Share search | Recurring recipes, persisted | The room's directives point at named saved searches |

## 3. What this changes operationally (the directive upgrades)

1. **Set the book of business first.** Point "Book of business" at the
   118-account list. Everything else keys off it: alerts, intent,
   lead-search scoping.
2. **Buyer intent becomes the relay motion's ranking signal.** An
   account expressing High intent has people already reading us. The
   morning triage reads the "Moderate or high buyer intent" chip and the
   room re-ranks briefings accordingly — My HR Pros and Amplify first,
   ahead of colder high-fit accounts.
3. **`! Update CRM` flags are harvested, not ignored.** Every
   Relationship explorer session doubles as contact-gap repair: people
   the tool surfaces who aren't in Salesforce become stakeholder
   candidates (confirmed by the operator before anything sticks).
4. **The 48 upcoming deals are riding lanes.** An HCM-side opportunity
   dated on an account means a partner manager is already in
   conversation there. Global briefings ride those conversations —
   coordinated through the partner manager, never around them.
5. **Changed-jobs and posted-on-LinkedIn toggles find the moments.** A
   new-in-seat operations VP at a book account is a natural briefing
   moment; a book-account leader posting about hiring abroad is a warm
   opening. Both are one-toggle searches scoped to the book.
6. **Account IQ is the pre-meeting brief.** "How [account] makes money"
   plus posted-jobs-by-geography is exactly the shape of the app's own
   research pass — run it before every call, bring back what changed.

## 4. What the app stores (doctrine holds)

Nothing is scraped and nothing syncs automatically. The room composes
the session (which surface, which filters, why); the operator brings
back what matters; the bring-back files as notes/candidates/signals with
dates and sources, exactly like the intranet keep pattern ("Read 6 —
kept 41 things for the index"). Buyer-intent readings are typed back as
dated signals ("Sales Nav 7/30: Amplify High intent, 11 activities") so
the book's record survives even though the tool's view is ephemeral.

## 5. Where the intent data physically comes from

LinkedIn exposes no API for buyer intent — it exists only on Sales
Navigator's own screens and in its alert emails, and the CRM sync embeds
a widget in Salesforce rather than exporting the signal as fields. So
the room never "pulls" intent; it **receives** it through three
operator-gated lanes:

1. **The D8 triage capture.** The daily triage ends with a capture: the
   ▤ "Grab Sales Nav intent" bookmarklet (shipped in the Capture shelf,
   7/30) copies the accounts-list dashboard as rendered, with a
   `SALESNAV ACCOUNTS` head token. Because it is a multi-account
   snapshot it never lands in an account's ⚡ box — its destination is
   Groundwork's own intent drop, which parses rows, matches names to
   book accounts, and proposes dated signals the operator confirms.
   Until that room ships, the bookmarklet opens the Intranet, whose
   capture parks the snapshot whole for later re-parse. Same family as
   the SF/Outlook/Teams grabs — capture what's visible, never crawl.
2. **Sales Navigator's alert emails.** Intent-change alerts (the
   "My HR Pros: increase in buyer intent" flag arrived this way) land in
   the operator's inbox, and the existing Outlook grab already captures
   them — the reader just needs to recognize the Sales Nav email shape.
   Setting book of business (D0) is what turns this lane on for the
   whole 118-list. The closest thing to automatic that stays inside
   LinkedIn's terms and the app's doctrine.
3. **Nothing else.** No API, no scraping, no headless browser.

Stored form: a dated signal on the account — source `salesnav` — which
is what the queue ranking reads. **Readings decay:** after ~7 days
without a fresh reading the room stops ranking on them; a stale "High"
is a guess wearing a badge. The decay is what makes the daily ten
minutes worth their spot in the research window.

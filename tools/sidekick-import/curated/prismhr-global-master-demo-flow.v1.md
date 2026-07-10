# PrismHR Global Master Demo Flow — curated flow v1

**Status: curated review map only.** Nothing here is imported anywhere — no DB writes, no
Sidekick UI changes. This is the human-reviewed cut of the Zoom demo, ready for a later,
explicit import step. Machine-readable twin: `prismhr-global-master-demo-flow.v1.json`.

## Provenance

- `tools/sidekick-import/output/draft_catalog_entries.md` + `screen_state_candidates.json`
  (full dense-pack importer run, 55 moments)
- Uploaded frame review packet (visual curation of dense pack `20260708-213650`)
- `tools/sidekick-import/curated/enrichment-audit.md` (verbatim-transcript-grounded talk tracks)
- Asset pointer: `docs/sidekick-imports/sidekick-assets-dense-20260708-213650.md`

## Curation rules

- **The main demo starts at Moment 22 (~00:23:27), not Moment 1.**
- Moments 1–21 are pre-demo discovery/intros/context → **account context only, never Sidekick screens.**
- Moment numbers reference the full dense-pack run. A fresh checkout's `output/` folder may hold
  fixture data — regenerate against the real pack to cross-check.
- `suggested frame` files are computed from the 4 fps dense cadence
  (frame N ≈ round(seconds × 4) + 1). **Verify against `frame_manifest.csv` before use.**
- `module` values are valid keys from `src/lib/catalog/catalog.json`.

## Flow at a glance (all keep)

| # | id | Title | Moments | Range | Module |
|---|----|-------|---------|-------|--------|
| 1 | `pgd-01-dashboard-demo-home` | Dashboard / demo home | 22 | 00:23:27–00:24:06 | dashboard |
| 2 | `pgd-02-pay-period-approval-entry` | Pay Period Approval entry | 22–23 | 00:24:12–00:25:00 | invoices |
| 3 | `pgd-03-monthly-pay-period-detail` | Monthly Pay Period detail | 23–24 | 00:25:00–00:26:31 | invoices |
| 4 | `pgd-04-confirm-payroll-approval` | Confirm payroll approval | 24 | 00:26:02–00:26:13 | invoices |
| 5 | `pgd-05-wire-fee-value-point` | Wire-fee / dashboard value point | 25 | 00:26:31–00:27:38 | invoices |
| 6 | `pgd-06-time-off-requests` | Time off requests | 26 | 00:27:38–00:28:18 | time-off |
| 7 | `pgd-07-worker-contractor-list` | Worker / contractor list | 26–28 | 00:28:18–00:31:10 | team |
| 8 | `pgd-08-worker-profile-signed-contract` | Worker profile / signed contract | 27 | 00:28:53–00:29:57 | team |
| 9 | `pgd-09-country-pay-requirements` | Country pay requirements / statutory costs | 28–30 | 00:30:00–00:33:37 | team |
| 10 | `pgd-10-employment-type-decision` | Employment type decision | 31–33 | 00:33:39–00:36:57 | new-hire |
| 11 | `pgd-11-new-hire-setup-form` | New hire / employment setup form | 33–36 | 00:36:57–00:40:31 | new-hire |
| 12 | `pgd-12-additional-payments` | Additional payments | 37 | 00:40:32–00:41:46 | new-hire |
| 13 | `pgd-13-equipment-policy` | Equipment policy | 38 | 00:41:47–00:42:45 | onboarding |
| 14 | `pgd-14-benefits-global-health` | Benefits / global health insurance | 39 | 00:42:45–00:43:58 | onboarding |
| 15 | `pgd-15-contract-onboarding-handoff` | Contract / onboarding handoff | 40–41 | 00:43:59–00:46:20 | onboarding |
| 16 | `pgd-16-worker-portal-employee-view` | Worker portal / employee view | 41–42 | 00:45:07–00:47:32 | worker-portal |
| 17 | `pgd-17-reports` | Reports | 43 | 00:47:32–00:48:38 | reports |
| 18 | `pgd-18-tools-resources-comp-calculator` | Tools & resources / compensation calendar | 44 | 00:48:39–00:49:53 | tools-resources |
| 19 | `pgd-19-wallet-contractor-payment` | Wallet / contractor payment method | 46–47 | 00:50:59–00:53:06 | worker-portal |
| 20 | `pgd-20-local-currency-payment-setup` | Local currency / payment method setup | 48–50 | 00:53:09–00:56:42 | worker-portal |
| 21 | `pgd-21-wallet-wrap-pay-overview` | Wallet wrap / return to pay overview | 51 | 00:56:43–00:57:58 | invoices |

---

## 1. Dashboard / demo home

- **id:** `pgd-01-dashboard-demo-home` · **keep**
- **source moments:** 22 · **range:** 00:23:27–00:24:06 · **module:** `dashboard`
- **screen type:** home dashboard
- **visual:** Home dashboard with the “Hello, Demo” greeting, task/widget cards, and pay-period tiles broken out by worker segment.
- **purpose:** Orient the user to the PrismHR Global environment before any workflow starts.
- **suggested frame:** ≈00:23:45 → `frame_005701.jpg`
- **anchor:** “So this is the Prism Global Platform. This is what all the international employees we're talking about would be onboarded to, and how you would interface with them.”

**Say:** This is the Prism Global platform — what every international worker we're talking about gets onboarded to, and how you interface with them. Contractor, employer-of-record, or down the road people you pay directly through your own subsidiary — one platform manages all of it. There's the technology you're looking at plus a human support layer running alongside it. The dashboard is where most people live: pay periods broken out by segment — contractor payments, one-time payments, hourly, fixed-rate, reimbursements.

**What:** The logged-in home screen of PrismHR Global: greeting, reminders, and pay-period cards segmented by worker classification. It is the anchor the demo returns to between workflows.

**Capabilities:** one platform for contractors/EOR/future subsidiary payroll · pay periods segmented by worker type · technology plus a human support layer.

**Strategic point:** No re-platforming as the engagement model changes — contractor today, EOR tomorrow, subsidiary later, same login.

**Discovery/executive note:** The partner rep framed the jump-in; the presenter confirmed screen share off the “Hello, Demo” greeting.

**Branching:** If the room asks “is this the system we would actually use?” — yes, this exact environment, demo data aside.

---

## 2. Pay Period Approval entry

- **id:** `pgd-02-pay-period-approval-entry` · **keep**
- **source moments:** 22–23 · **range:** 00:24:12–00:25:00 · **module:** `invoices`
- **screen type:** pay period approval list
- **visual:** Pay Period Approval / Monthly Pay Period entry view listing the upcoming contractor pay period and its payment types.
- **purpose:** Show where payroll approval starts.
- **suggested frame:** ≈00:24:30 → `frame_005881.jpg`
- **anchor:** “As you scroll down, you can see there's additional payments, one-time payments, going further down, hourly workers, fixed rate workers, reimbursements, etc.”

**Say:** This contractor pay period shows every payment you make — one-time, hourly, fixed-rate, reimbursements — however each contract is set up. I open a detailed view, it totals it, and I approve it right here. That's the whole contractor payment motion.

**What:** The entry point into a monthly pay period: a list of every payment type due in the run, with a detailed view that totals and takes the approval.

**Capabilities:** every payment type in one pay-period view · detailed view with running total · approve the run in place.

**Strategic point:** All payment types converge on a single approval flow — no side spreadsheets to reconcile a run.

**Branching:** If asked about cadence: pay weekly or monthly — the flat per-employee fee doesn't change (screens 19–20).

---

## 3. Monthly Pay Period detail

- **id:** `pgd-03-monthly-pay-period-detail` · **keep**
- **source moments:** 23–24 · **range:** 00:25:00–00:26:31 · **module:** `invoices`
- **screen type:** pay period country detail
- **visual:** Country cards with employee/payment tables, reimbursements and additional payments; per-employee wage, gross-to-net and employer-burden breakdown.
- **purpose:** Show country-level payroll breakdown and approval detail.
- **suggested frame:** ≈00:25:45 → `frame_006181.jpg`
- **anchor:** “It's gonna show you the employee net… gross to net… and the employer burden.”

**Say:** The employer-of-record view looks a little different: these are full-time regular employees, so it brings up taxes, withholdings, and benefits. Here's Ava in Canada — wages, benefits, taxes — and it shows the employee net, gross to net, and the employer burden. Those two are the ones that matter: on $10,000 a month, what are the additional taxes going to that local government. It's all broken out by country, and this is where you review — I can spot variances (“that makes sense, we gave bonuses this month”) and make corrections here before anything hits payroll.

**What:** The country-level drill-down of an EOR pay period: per-country cards, per-employee rows with gross-to-net and employer burden side by side, plus reimbursements and additional payments — the variance-review stop before approval.

**Capabilities:** EOR view surfaces taxes/withholdings/benefits · gross-to-net AND employer burden side by side · broken out by country · variance review and corrections before payroll.

**Strategic point:** The employer-burden line answers the real budgeting question — what a $10k salary actually costs in-country.

**Discovery/executive note:** Bulgaria wasn't loaded in the demo set — the presenter used Ava in Canada as the stand-in; flag if a prospect asks to see their own country.

**Branching:** If asked to see the prospect's own country: acknowledge the demo-set gap and pivot to the compensation-calculator promise (screen 18 has the same gap — same fix).

---

## 4. Confirm payroll approval

- **id:** `pgd-04-confirm-payroll-approval` · **keep**
- **source moments:** 24 · **range:** 00:26:02–00:26:13 · **module:** `invoices`
- **screen type:** confirmation modal
- **visual:** Confirm Payroll Approval modal over the pay-period detail, summarizing what will be paid in local currency.
- **purpose:** Show the final approval action and accountability.
- **suggested frame:** ≈00:26:08 → `frame_006273.jpg`
- **anchor:** “As I approve that, it'll just give you a quick analysis of what we're paying the employees in that currency.”

**Say:** When I approve, it gives a quick analysis of what we're paying the employees in local currency — in an employer-of-record model we're required to pay employees in local currency into their own bank account. One click, one accountable action, and the run is committed.

**What:** The terminal confirmation step of the payroll flow: a modal that restates the local-currency totals and records the approval.

**Capabilities:** single accountable approval action with a local-currency summary · EOR compliance baked in (local currency, own bank).

**Strategic point:** Approval is explicit and auditable — one person, one click, one record.

**Branching:** If asked who can approve: approval chains are configurable (same pattern as time-off approvals, screen 16).

---

## 5. Wire-fee / dashboard value point

- **id:** `pgd-05-wire-fee-value-point` · **keep**
- **source moments:** 25 · **range:** 00:26:31–00:27:38 · **module:** `invoices`
- **screen type:** pay period → dashboard transition
- **visual:** Pay-period page returning toward the dashboard/home while the invoicing model is narrated.
- **purpose:** Connect the platform workflow to the no-international-wire-fee value point.
- **suggested frame:** ≈00:27:00 → `frame_006481.jpg`
- **anchor:** “There's no international wire fees, right? You pay us, we convert that… and we send those directly to their bank accounts, and then paying the taxes to the Bulgarian authorities.”

**Say:** Here's what changes from what you do now: you pay us in USD. We send one invoice with your Bulgarian employees' salaries in USD, you pay it into our US bank — no international wire fees. We convert, pay their bank accounts directly, and remit the taxes to the Bulgarian authorities. No wires going back and forth from you — you originate and pay in the United States. Same in any country: CAD, GBP, whatever the local currency is. Reimbursable expenses go through the system with approvers you choose, and Bulgaria runs a monthly cycle, paid at the end of the month.

**What:** A value-point beat rather than a new screen: the walk back from the pay period toward home, carrying the one-US-invoice / no-wire-fees story.

**Capabilities:** one US invoice paid in USD to a US bank — no international wire fees · PrismHR converts, pays local banks, remits local taxes · same flow in any country · in-system reimbursements; Bulgaria monthly cycle.

**Strategic point:** Kills the wire-fee line item AND the cross-border payment scrutiny in one move — the headline cost/compliance win of the payroll section.

**Discovery/executive note:** The partner rep interjected “stop us as we go if you have questions” — a good structural spot to invite the room in.

**Branching:** If the room does the math on current wire fees, let them — this point lands hardest self-computed.

---

## 6. Time off requests

- **id:** `pgd-06-time-off-requests` · **keep**
- **source moments:** 26 · **range:** 00:27:38–00:28:18 · **module:** `time-off`
- **screen type:** time off request list
- **visual:** Time Off page with the request list and country statutory leave context; dashboard “who's out today/tomorrow” beat.
- **purpose:** Show employee time-off visibility and approval handling.
- **suggested frame:** ≈00:27:55 → `frame_006701.jpg`
- **anchor:** “They have a statutory amount of paid vacation, holidays, leaves, other things that are required that an employer must provide.”

**Say:** Time-off requests live here. Bulgaria has a statutory amount of paid vacation, holidays, leaves, maternity — things an employer must provide, and we always honor the country-specific minimum. You can offer more; we can never offer less than the Bulgarian standard, even if that's a lot more than we're used to in the US. Back on the dashboard you can see who's out today and tomorrow.

**What:** The time-off request list for the EOR population, framed by the statutory-minimum rule and the dashboard's who's-out widget.

**Capabilities:** country statutory leave enforced — offer more, never less · dashboard “who's out today/tomorrow” + reminders · request list with approval handling.

**Strategic point:** Statutory compliance is a floor the platform enforces for you — not a rule you have to remember per country.

**Branching:** US-centric pushback on generous leave: acknowledge, anchor on “we can't go below the local standard” as a compliance feature, not a policy choice.

---

## 7. Worker / contractor list

- **id:** `pgd-07-worker-contractor-list` · **keep**
- **source moments:** 26–28 · **range:** 00:28:18–00:31:10 · **module:** `team`
- **screen type:** worker roster table
- **visual:** My Team worker table / people list across both populations, with countries, statuses, and searchable employee data.
- **purpose:** Show the global worker roster: countries, statuses, and searchable employee data.
- **suggested frame:** ≈00:28:35 → `frame_006861.jpg`
- **anchor:** “If I go to my team, this is going to show my team across those populations, contractors and employer of record.”

**Say:** My Team shows everyone across both populations — contractors and employer-of-record — in one roster. Filter to just the Bulgarian EOR employees, or list by type to see contractor profiles. Drill into anyone's personal information — this is the HR system. Contractors aren't regular full-time employees — no statutory leaves or benefits, you're paying a contracted amount — but the payment is still managed here, wallet-funded, on one flat per-employee-per-month fee. The onboarding tab shows where each person is: have they signed, are they waiting on us.

**What:** The unified roster: every worker regardless of engagement model, with country, status, and type filters, doubling as the entry point into individual HR records and onboarding status.

**Capabilities:** team view across contractors and EOR in one place · filter/search by country, type, status · full HR profile behind every row · onboarding status per worker.

**Strategic point:** One roster for a mixed global workforce — the “single pane of glass” moment of the demo.

**Discovery/executive note:** A prospect stakeholder asked whether countries add mandatory pay items (citing Mexico housing/food stipends) → social charges always; UK has a required pension; country specifics get confirmed per engagement.

**Branching:** If the roster question turns into a cost question, jump ahead to statutory costs (screen 9) or the compensation calculator (screen 18).

---

## 8. Worker profile / signed contract

- **id:** `pgd-08-worker-profile-signed-contract` · **keep**
- **source moments:** 27 · **range:** 00:28:53–00:29:57 · **module:** `team`
- **screen type:** employee profile / documents
- **visual:** Employee HR profile with the contract/document area open — the signed employment contract on the worker record.
- **purpose:** Show the signed contract and the worker record.
- **suggested frame:** ≈00:29:25 → `frame_007061.jpg`
- **anchor:** “That contract is her employment contract. That employment contract is between the employee and PRISM HR.”

**Say:** Her signed contract is her employment contract, and it's between the employee and PrismHR — because we're the local employer of record. The contract we have with you then assigns her to work on your behalf. IP protection sits in the employment contract with the employee directly, and our company-to-company agreement carries IP protection as well — you can review both with your attorneys. I can pull her contract up right here on the record.

**What:** An individual worker's HR profile with the document area open: the signed employment contract, and the contract-chain explanation (employee ↔ PrismHR, PrismHR ↔ client) that carries the IP-protection story.

**Capabilities:** signed employment contract on the worker record · company-to-company assignment agreement · IP protection on both layers, reviewable by counsel.

**Strategic point:** The two-contract chain is the legal spine of EOR — showing the actual signed document makes it concrete instead of abstract.

**Discovery/executive note:** The prospect's core concern in the source call was IP/W2 — this screen is where you plant the answer; the presenter took an action item to let clients add their own IP agreement.

**Branching:** If counsel wants specifics, offer both agreements for attorney review rather than paraphrasing clauses live.

---

## 9. Country pay requirements / statutory costs

- **id:** `pgd-09-country-pay-requirements` · **keep**
- **source moments:** 28–30 · **range:** 00:30:00–00:33:37 · **module:** `team`
- **screen type:** country requirements / recurring costs
- **visual:** Employee/country requirement details and recurring cost rows: social charges, required pension, healthcare, supplemental benefit options.
- **purpose:** Show statutory requirements and the country-specific employer cost structure.
- **suggested frame:** ≈00:31:30 → `frame_007561.jpg`
- **anchor:** “Of course, there's the social charges that all companies must pay per employee… I know for sure there's a required pension in the UK.”

**Say:** Every company pays the social charges per employee — that's constant. On top of that each country defines its own required items: in the UK there's a required pension — a national pension program instead of a 401k — plus national healthcare paid through taxes. Healthcare abroad isn't free; it's paid through those social charges. Most companies then add optional supplemental benefits so people can use private hospitals — you can absorb the cost or share it. It all gets defined per country, so you know exactly what you're paying. For Bulgaria-specific allowances, we'll confirm the exact list.

**What:** The statutory-cost layer of a worker/country record: recurring employer cost rows (social charges, pension, healthcare) plus where optional supplemental benefits attach.

**Capabilities:** country statutory costs defined per country · UK required pension + national healthcare via taxes · optional supplemental benefits, absorbed or cost-shared · contractors carry none of the statutory load.

**Strategic point:** Transparent per-country employer costs turn “what will this really cost us?” from a fear into a lookup.

**Discovery/executive note:** Two common prospect questions live here — mandatory pay items (social charges always; country specifics per engagement) and whether benefit providers are pre-set (yes; India weak, Australia good). Objection-defuser used in the source call: “none of this is free — they're paying a lot of taxes.”

**Branching:** Country allowances/stipends can be open confirm-items — don't guess specifics live. If “free healthcare” comes up, use the taxes-fund-it framing before pitching supplemental tiers.

---

## 10. Employment type decision

- **id:** `pgd-10-employment-type-decision` · **keep**
- **source moments:** 31–33 · **range:** 00:33:39–00:36:57 · **module:** `new-hire`
- **screen type:** employment type chooser
- **visual:** “What type of employment?” flow with employee (EOR) and contractor options — the fork where the platform routes the setup.
- **purpose:** Show how the platform routes EOR vs contractor setup.
- **suggested frame:** ≈00:34:30 → `frame_008281.jpg`
- **anchor:** “Contractor plus is where we become the agent of record… we would go through a classification process to ensure that the workers are truly classified appropriately.”

**Say:** Two roads when you add someone: employee or contractor. Contractor has two flavors. Plain contractor is just payments — the contract is between you and the contractor (we have samples, or use your own); we're only the method of payment. Contractor Plus is where we become the agent of record — the contract is between the contractor and PrismHR — and there we run a classification process, because now our name and liability are on it. If they don't meet contractor requirements, we'll say we can't be party to it and they'd need employer-of-record. If someone's acting exactly like an employee, we show you the real risks — fines, penalties, real consequences if the government finds out — but ultimately it's your decision how much risk to take. For Bulgaria, we choose employee.

**What:** The routing fork of the new-hire flow: employee (EOR) vs contractor vs Contractor Plus, including where the misclassification analysis lives.

**Capabilities:** employee (EOR) and contractor paths from one entry point · Contractor Plus = PrismHR as agent of record with a classification process · misclassification risk analysis per country · client decides the risk with full information.

**Strategic point:** Classification risk is surfaced BEFORE the relationship is created — the compliance moat versus pay-anyone tools.

**Discovery/executive note:** Clarified for the room in the source call: once PrismHR flags someone as likely an employee under Contractor Plus, you can't knowingly keep paying them as a contractor through us — but the model choice stays the employer's. The presenter's line: “it's not an exact checklist — three or four questions and it's leaning one way.”

**Branching:** If they're comfortable with existing contractor relationships, plain contractor (payment-only) is the low-friction start; Contractor Plus is the step-up when they want the liability shield.

---

## 11. New hire / employment setup form

- **id:** `pgd-11-new-hire-setup-form` · **keep**
- **source moments:** 33–36 · **range:** 00:36:57–00:40:31 · **module:** `new-hire`
- **screen type:** new hire form
- **visual:** Employment setup form: nationality and country-of-employment dropdowns, work-authorization prompt, role/division/team/location fields, start date, gross salary, contract type.
- **purpose:** Show the data capture required to create an employment relationship.
- **suggested frame:** ≈00:38:30 → `frame_009241.jpg`
- **anchor:** “So where they live is where they would need to be employed.”

**Say:** Where they live is where they're employed. Nationality can say Bulgaria, but if someone lives in Spain, I choose Spain — and it asks whether they're authorized to work there. Our team verifies the documentation; we don't just take their word. Then the simple part: role title and description, divisions and teams, location, and the start date — two weeks out, because that window covers the employment contract and any country requirements (some countries need registrations; in France and the Philippines they see a doctor first). Gross salary — we'll use $10,000 — and contract type: indefinite versus fixed-term. Most companies use indefinite, and after one or two fixed-term renewals local rules usually make it indefinite anyway.

**What:** The core data-capture form of the EOR hire: residence-driven country of employment with a work-authorization gate, role and org fields, start-date window, salary, and contract type.

**Capabilities:** country of employment = country of residence · work-authorization prompt with team-verified documentation · role/division/team/location fields · ~2-week start window covering contract prep + country registrations · indefinite vs fixed-term with local renewal rules.

**Strategic point:** Residence — not nationality or payroll convenience — drives the employment country; that single rule is most of cross-border compliance.

**Discovery/executive note:** Live in the source call: one of the workers likely lived in Spain; nationality vs residence was unknown, and the prospect took an action item to confirm. Residency drives the seat's country and cost — a common early open item to surface.

**Branching:** If they push for a faster start, anchor on the 2-week window = contract + country requirements, not platform lag. The Spain worker's setup can't be finalized until residency/authorization is confirmed.

---

## 12. Additional payments

- **id:** `pgd-12-additional-payments` · **keep**
- **source moments:** 37 · **range:** 00:40:32–00:41:46 · **module:** `new-hire`
- **screen type:** additional payment form + confirmation
- **visual:** Additional/recurring payment form (e.g. monthly allowance) with its confirmation modal; PTO days and the currency sanity-check beat.
- **purpose:** Show one-off payments and allowances.
- **suggested frame:** ≈00:41:00 → `frame_009841.jpg`
- **anchor:** “Give them an extra $100 for a mobile allowance, whatever you'd like… that will happen in each paycheck moving forward.”

**Say:** I can set up additional recurring payments — say a $100 monthly mobile allowance — and it hits every paycheck going forward. On PTO, we show exactly how many days Bulgaria allows; we can't go below it, but you can add more — birthday off for everyone? Add a day. And there's a nice currency check: it flags that 10,000 Bulgarian lev is about 5,500 USD a month, so I can confirm the amount I typed is actually the amount I meant.

**What:** The compensation-extras step of the hire flow: recurring allowances with confirmation, PTO days above the statutory floor, and the local-currency conversion check.

**Capabilities:** recurring allowances applied every paycheck · country PTO floor + extra days · currency sanity check (10,000 BGN ≈ 5,500 USD) before confirming.

**Strategic point:** The currency check quietly prevents the most expensive class of setup mistake — paying in the wrong denomination.

**Branching:** Holiday-vs-required-work nuance: if a Bulgarian holiday lands on a US workday and you require work, that opens holiday-pay/jurisdiction questions — the platform's job is keeping you compliant with Bulgarian law.

---

## 13. Equipment policy

- **id:** `pgd-13-equipment-policy` · **keep**
- **source moments:** 38 · **range:** 00:41:47–00:42:45 · **module:** `onboarding`
- **screen type:** onboarding stepper / equipment policy
- **visual:** Onboarding stepper on the equipment policy screen: third-party IT catalog option vs personal-device reimbursement.
- **purpose:** Show configurable policy/workflow options.
- **suggested frame:** ≈00:42:10 → `frame_010121.jpg`
- **anchor:** “The least effective way is for you to ship them from the US. They'll probably get caught in customs, and that can be pretty expensive.”

**Say:** Equipment policy: the least effective way is shipping laptops and monitors from the US — they'll probably get caught in customs and it gets expensive. Instead, we have a third party you work with directly — a menu of IT equipment delivered to their home or office in-country. Or the new hire uses their personal computer and gets reimbursed. Your policy, your choice, configured right in the flow.

**What:** A policy-selection step inside onboarding: how the new worker gets equipped, with the in-country catalog and reimbursement options replacing US shipping.

**Capabilities:** third-party IT catalog delivered in-country (avoids customs) · personal device + reimbursement alternative · policy options configured inside the onboarding flow.

**Strategic point:** Practical operational details (laptops through customs) are already solved — signals the vendor has done this many times.

**Branching:** If IT/security asks about device management, note this covers procurement — MDM/security tooling remains the client's stack.

---

## 14. Benefits / global health insurance

- **id:** `pgd-14-benefits-global-health` · **keep**
- **source moments:** 39 · **range:** 00:42:45–00:43:58 · **module:** `onboarding`
- **screen type:** benefits selection cards
- **visual:** Benefits/pricing cards (standard / premium / premium + maternity) and the global health insurance detail — SafetyWing coverage breakdown.
- **purpose:** Show the benefits add-on discussion.
- **suggested frame:** ≈00:43:20 → `frame_010401.jpg`
- **anchor:** “We use… it's called SafetyWing, the global healthcare network that we use so that we can manage… those supplemental benefits across the globe.”

**Say:** Supplemental health comes in tiers — standard, premium, premium plus maternity — and they're global plans at reasonable rates: about an extra $210 per employee per month if you choose it. Absorb it as the company, split it, and dependents are the same $210. Clicking in shows the coverages — we use SafetyWing, a global healthcare network, so supplemental benefits work the same across the globe. I select it, and we're done — and when I hit Submit, all of it goes to an actual human: one of our implementation managers covering Europe. A lot of what we do is AI-driven, but we keep a human in the loop.

**What:** The benefits step of onboarding: supplemental tier cards with per-employee pricing, the SafetyWing coverage detail, and the submit handoff to a human implementation manager.

**Capabilities:** tiers standard / premium / premium + maternity (global plans) · ~$210 PEPM, absorbed / split / dependents same rate · SafetyWing network · submit routes to a human implementation manager (Europe).

**Strategic point:** “AI-driven, but a human is involved” — the submit-to-a-person beat differentiates from fully-automated competitors.

**Discovery/executive note:** This answers the earlier benefits-provider question from the roster section — providers are already set up.

**Branching:** Country quality varies: India's public option is weak, Australia's is good — supplemental matters more in some countries than others.

---

## 15. Contract / onboarding handoff

- **id:** `pgd-15-contract-onboarding-handoff` · **keep**
- **source moments:** 40–41 · **range:** 00:43:59–00:46:20 · **module:** `onboarding`
- **screen type:** submission success / tasks panel
- **visual:** Success/confirmation state, My Tasks, and the onboarding panel — the handoff from client setup to offer letter and employee signing.
- **purpose:** Show how the worker experiences onboarding after setup.
- **suggested frame:** ≈00:44:30 → `frame_010681.jpg`
- **anchor:** “That offer letter will then be reviewed by you before we send it to the employee.”

**Say:** After submit, the implementation manager verifies everything and generates the offer letter — and you review it before we send it to the employee. It contains their salary, benefits, everything you discussed; any back-and-forth happens at the offer-letter stage. Once it's signed, the employee gets an email into their own instance of Prism Global, signs, and we finalize the employment contract — that's what dictates their employment and start date. That's also where the employee enters their bank details and private information themselves.

**What:** The post-submit handoff: confirmation state and task panel showing the offer-letter → employee-signature → contract-finalization chain, with the client review gate in the middle.

**Capabilities:** offer letter generated by the implementation manager, client-reviewed before sending · back-and-forth resolved at the offer stage · employee e-signs in their own instance → contract finalized with start date · employee enters bank/private info themselves.

**Strategic point:** You never collect passports or bank details — the worker enters their own data into their own login, which is both cleaner and safer.

**Branching:** If asked what happens when the offer needs changes: iterate at the offer-letter stage; contracts only finalize after signature.

---

## 16. Worker portal / employee view

- **id:** `pgd-16-worker-portal-employee-view` · **keep**
- **source moments:** 41–42 · **range:** 00:45:07–00:47:32 · **module:** `worker-portal`
- **screen type:** worker portal
- **visual:** The worker's own portal: personal info, payslips and payment history, time-off, onboarding items (Laurent awaiting offer letter), document self-upload.
- **purpose:** Show employee-side self-service.
- **suggested frame:** ≈00:46:45 → `frame_011221.jpg`
- **anchor:** “This is where they're going to see all their different payments, how much they've been paid, where their payslips are located.”

**Say:** This is the employee's own view: every payment, how much they've been paid, where their payslips live. Time off is right here — they see their holidays and available leave and request it, with the approval chain you configure (frontline manager first, HR second, however you like). Time tracking is optional — hours per day or per project — turn it on or skip it. Reimbursements go through the system so taxes are handled correctly. And on the onboarding tracker: here's Laurent in Bulgaria, awaiting his offer letter — once the agreement's signed it flips here. Workers upload their own passports and government documents straight into the system for our HR managers to verify; you never collect them.

**What:** The employee-side portal and the onboarding tracker together: payslips, time-off, optional time tracking, reimbursements, and self-service document upload with HR verification.

**Capabilities:** payslips + payment history · time-off with configurable approval chain · optional time tracking · in-system reimbursements · per-hire onboarding status · self-upload of documents with HR verification before the contract issues.

**Strategic point:** Self-service on the worker side means the client's HR team isn't the middleman for payslips, leave, or documents.

**Discovery/executive note:** Ties back to the Spain worker: their work authorization gets verified here before any contract issues.

**Branching:** If the client doesn't care about hour tracking, skip the time-tracking beat entirely — it's optional by design.

---

## 17. Reports

- **id:** `pgd-17-reports` · **keep**
- **source moments:** 43 · **range:** 00:47:32–00:48:38 · **module:** `reports`
- **screen type:** reports list + tables
- **visual:** Reports list with filters and report tables: worker report, EOR gross-to-net, general ledger, variance.
- **purpose:** Show reporting and export capability.
- **suggested frame:** ≈00:48:00 → `frame_011521.jpg`
- **anchor:** “The worker report, again, showing you each month how many workers, you have contractors, EOR, etc.”

**Say:** A few reports worth knowing. The worker report shows month by month how many workers you have — contractors, EOR. The EOR report gives gross-to-net and, per country, what you're spending on total compensation, taxes, bonuses. Everything exports to CSV or Excel. There's a general-ledger report you can generate and import into whatever GL you use — set up the GL codes right here — and the variance report we glanced at earlier. All of it splits contractor versus employer-of-record.

**What:** The reporting surface: prebuilt worker, gross-to-net, GL, and variance reports with filters, all exportable and all split by engagement model.

**Capabilities:** worker report (monthly counts by type) · EOR gross-to-net + per-country comp/taxes/bonuses · CSV/Excel export · GL report + GL codes · variance report.

**Strategic point:** The GL report closes the loop with finance — global payroll lands in their existing accounting without manual re-keying.

**Branching:** If finance is on the call, the GL-code setup is the beat to slow down on.

---

## 18. Tools & resources / compensation calendar

- **id:** `pgd-18-tools-resources-comp-calculator` · **keep**
- **source moments:** 44 · **range:** 00:48:39–00:49:53 · **module:** `tools-resources`
- **screen type:** tools & resources / calculator
- **visual:** Tools & resources page with the compensation calculator: country selector, salary input, employer-cost and net-take-home table.
- **purpose:** Show country resources and the compensation calculator.
- **suggested frame:** ≈00:49:10 → `frame_011801.jpg`
- **anchor:** “The total employer cost, so the salary is 11.5 British pounds… really that 11.5 is going to be 13.2.”

**Say:** Under tools and resources, the compensation calculator is really nice. Enter a salary for a country and it shows what the employer pays all-in and what the employee takes home. In the UK: an £11,500 salary comes to about £13,200 total employer cost once National Insurance and the pension are in — and the employee's take-home is about £6,800 after taxes, pension, and insurance. So before you commit to anything, you get the real cost and the real take-home.

**What:** The pre-hire budgeting tool: pick a country, enter a salary, and see the employer's all-in cost next to the employee's net — the numbers version of the statutory-costs story.

**Capabilities:** employer all-in cost per country (UK £11.5k → ~£13.2k) · employee net take-home (~£6.8k) · pre-hire budgeting before any commitment.

**Strategic point:** Turns the scariest unknown — true per-country cost — into a 10-second lookup the prospect can run themselves.

**Discovery/executive note:** ⚠ Bulgaria was not loaded in the calculator during the demo — the presenter flagged he'd fix it and demoed the UK instead. Verify the prospect's countries are loaded before any run.

**Branching:** If the prospect's country is missing from the calculator, name it as a data-load gap and commit to the fix — don't improvise numbers.

---

## 19. Wallet / contractor payment method

- **id:** `pgd-19-wallet-contractor-payment` · **keep**
- **source moments:** 46–47 · **range:** 00:50:59–00:53:06 · **module:** `worker-portal`
- **screen type:** wallet profile + withdrawal modal
- **visual:** Contractor wallet profile with the withdrawal modal and payment-method selection: bank transfer, mobile wallet, crypto, virtual card.
- **purpose:** Show the contractor wallet and withdrawal options.
- **suggested frame:** ≈00:52:00 → `frame_012481.jpg`
- **anchor:** “Think of it like a Venmo wallet… This wallet is tied to a US stablecoin. So it's all digital currency.”

**Say:** Right now you're paying wires and wire fees across the globe — expensive, and it signals to those countries that you're paying people there, which can start permanent-establishment questions. Instead, with our contractor model you pay us in US dollars and contractors are paid into a wallet — think a Venmo-style wallet tied to a US stablecoin, all digital. They hold their money there until they want it, then withdraw how they like: transfer to their own bank (conversion happens then, $1–3 fee, and you as the client pay none of it), deposit to a mobile wallet like GCash in the Philippines, buy crypto, spin up a virtual credit card tied to the wallet, or move money to Wise.

**What:** The contractor-side wallet: balance, withdrawal modal, and the menu of payout methods that replaces per-payment international wires.

**Capabilities:** US-stablecoin wallet funded by your USD payment · withdraw to bank ($1–3, client pays none), GCash/mobile wallets, crypto, virtual credit card, Wise · contractor holds funds until they choose.

**Strategic point:** No wires also means no wire signals — the permanent-establishment risk angle turns a cost saving into a compliance story.

**Discovery/executive note:** The partner rep co-sold advantage #1 live: one flat fee per month with unlimited transfers — pay weekly or monthly, employer's choice. A natural partner tag-team moment.

**Branching:** Philippines contractors: lead with GCash — it's the payout method they already live in.

---

## 20. Local currency / payment method setup

- **id:** `pgd-20-local-currency-payment-setup` · **keep**
- **source moments:** 48–50 · **range:** 00:53:09–00:56:42 · **module:** `worker-portal`
- **screen type:** currency / payment method forms
- **visual:** Currency and payment-method dropdowns with bank/payment forms — configuring how a contractor actually receives funds.
- **purpose:** Show how contractors avoid friction and receive funds in their preferred ways.
- **suggested frame:** ≈00:54:30 → `frame_013081.jpg`
- **anchor:** “They have the ability to effectively invest in the US dollar by allowing those funds to sit in a US stablecoin while their own local currency does whatever craziness that it does.”

**Say:** On the contractor's side: instant (or near-instant) withdrawal to their standard bank account — or, where the local currency is unstable, they can leave funds sitting in US-dollar stablecoin and pull out what they need over time. They can even earn 3.29% in a US savings account, or invest. Contractors elsewhere get hit with $40–50 just to get their own money out; here it's a couple of dollars at most. And from your side it's one per-employee-per-month fee no matter how often you pay — US account to US account, so no international-transfer scrutiny.

**What:** The payout-preference setup: currency and method selection per contractor, including the hold-in-USD option, savings/invest features, and the flat-fee employer economics.

**Capabilities:** hold in USD stablecoin against unstable local currencies · 3.29% US savings + investing · flat PEPM fee, unlimited transfers · US-to-US payments, no international-transfer scrutiny · replaces $40–50 per-withdrawal fees elsewhere.

**Strategic point:** The wallet is a retention pitch to the contractors themselves — their money arrives faster, cheaper, and in the currency they trust.

**Discovery/executive note:** The partner rep co-sold advantage #2: day-one instant withdrawal, or park in USD while the local currency “does whatever craziness it does.”

**Branching:** ⚠ The wallet is contractors-only today — EOR employees must be paid in local currency to local banks. The team is exploring EOR support, but do NOT promise it for EOR seats.

---

## 21. Wallet wrap / return to pay overview

- **id:** `pgd-21-wallet-wrap-pay-overview` · **keep**
- **source moments:** 51 · **range:** 00:56:43–00:57:58 · **module:** `invoices`
- **screen type:** pay overview / workers table
- **visual:** Back on the pay overview / workers table — the reset frame that closes the wallet section before Q&A.
- **purpose:** Close the wallet/payment value section.
- **suggested frame:** ≈00:57:20 → `frame_013761.jpg`
- **anchor:** “Saves them a lot of time and money, and it lets them do what they want with their money.”

**Say:** So that's the wallet: contractors love it, it saves them time and money, there are no wire or transfer fees, and they do what they want with their money. Back on the pay overview you can see it all in one place — that's the platform that manages all of this. Any other questions on the platform side?

**What:** The closing beat of the payments arc: landing back on the pay overview / workers table to consolidate the wallet story and open the floor.

**Capabilities:** single pay overview consolidating contractor and EOR runs · natural reset point between demo and Q&A.

**Strategic point:** Ending the arc back where payment work actually happens reinforces that everything shown is one continuous system, not a feature tour.

**Branching:** This is the deliberate pause-for-questions beat — hold the silence and let the room fill it.

---

# Cuts — not Sidekick screens

| Moments | Range | Disposition | Why |
|---------|-------|-------------|-----|
| 1–21 | ≈00:00:00–00:23:27 | **account context only** | Pre-demo discovery, intros, and context-setting. Valuable as call context (attendees, current pain, and the countries and engagement models discussed) but not product screens. |
| 45 | ≈00:49:53–00:50:59 | **objection note** | Pricing/cost Q&A between the compensation calculator and the wallet section. Keep attached to the pricing conversation as objection-handling material, not a core-flow screen. |
| 52–55 | ≈00:57:58–end | **follow-up notes** | Close and follow-up: action items from the source call (country allowances to confirm, residency to confirm, calculator data load, IP-agreement question), next steps, goodbyes. Keep as follow-up notes. |

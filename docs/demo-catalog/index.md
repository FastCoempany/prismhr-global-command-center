# Demo Catalog — Coverage Index

Master status table for the catalog. Built from the first exhaustive walk of the
PrismHR Global demo (312 captures → 49 distinct screens across all 12 modules).

## Summary
- **49 screens cataloged**, all `status: classified` (phase-1 facts done).
- **All 12 top-level modules covered.**
- Value tiers: **17 high**, 27 medium, 5 low.
- Next: phase-2 scripting (fill the value narrative body of each entry), plus a
  short **top-up walk** for the gaps listed at the bottom.

## Module coverage
| Module | Screens |
|--------|---------|
| dashboard | 4 |
| new-hire | 10 |
| onboarding | 2 |
| team | 8 |
| invoices | 1 |
| time-off | 1 |
| time-tracking | 2 |
| reimbursements | 1 |
| reports | 8 |
| tools-resources | 3 |
| settings | 7 |
| support-cases | 2 |

## Entries
| id  | title | module | type | tier | status |
|-----|-------|--------|------|------|--------|
| 001 | Dashboard (Home) | dashboard | page | high | classified |
| 002 | Add One-Time Payment | dashboard | page | high | classified |
| 003 | Pay Period Approval | dashboard | page | high | classified |
| 004 | Pay Period Detail | dashboard | page | medium | classified |
| 020 | New Hire — Worker Type | new-hire | page | high | classified |
| 021 | EOR — Employee Info | new-hire | page | high | classified |
| 022 | EOR — Job Info | new-hire | page | high | classified |
| 023 | EOR — Compensation | new-hire | page | high | classified |
| 024 | EOR — Equipment | new-hire | page | medium | classified |
| 025 | EOR — Benefits | new-hire | page | high | classified |
| 026 | EOR — Submit Offer | new-hire | page | high | classified |
| 027 | Contractor — Contractor Info | new-hire | page | medium | classified |
| 028 | Contractor — Job Info | new-hire | page | medium | classified |
| 029 | Contractor — Compensation | new-hire | page | medium | classified |
| 040 | Onboarding | onboarding | page | high | classified |
| 041 | Onboarding Success (EOR) | onboarding | page | medium | classified |
| 050 | Worker Profile — Details | team | tab | high | classified |
| 051 | Worker Profile — Documents | team | tab | medium | classified |
| 052 | Worker Profile — Payments | team | tab | medium | classified |
| 053 | Worker Profile — Contracts | team | tab | medium | classified |
| 054 | Worker Profile — Time Off | team | tab | medium | classified |
| 055 | Worker Profile — Expense Reimbursements | team | tab | medium | classified |
| 056 | Worker Profile — Organization (Assignments) | team | tab | medium | classified |
| 057 | Contract Detail | team | drilldown | medium | classified |
| 060 | Invoices | invoices | page | medium | classified |
| 065 | Time Off | time-off | page | medium | classified |
| 070 | Time Tracking | time-tracking | page | medium | classified |
| 071 | Manage Labels | time-tracking | page | low | classified |
| 080 | Reimbursements | reimbursements | page | high | classified |
| 090 | Reports (Hub) | reports | page | high | classified |
| 091 | Worker Report | reports | page | medium | classified |
| 092 | Contractor Report | reports | page | medium | classified |
| 093 | EOR Report | reports | page | high | classified |
| 094 | EOR Employer Gross Report | reports | page | high | classified |
| 095 | EOR Variance Report | reports | page | high | classified |
| 096 | Payroll Report | reports | page | medium | classified |
| 097 | Hour Log Report | reports | page | medium | classified |
| 100 | Tools & Resources (Hub) | tools-resources | page | medium | classified |
| 101 | Compensation Calculator | tools-resources | page | high | classified |
| 102 | Holidays Calendar | tools-resources | page | medium | classified |
| 110 | Settings — General | settings | page | low | classified |
| 111 | Settings — Users | settings | page | medium | classified |
| 112 | Settings — User Detail | settings | drilldown | low | classified |
| 113 | Settings — Roles and Permissions | settings | page | medium | classified |
| 114 | Settings — Role Detail | settings | drilldown | low | classified |
| 115 | Settings — Approval Workflows | settings | page | medium | classified |
| 116 | Settings — Assignments (Categories) | settings | page | low | classified |
| 120 | Support Cases (List) | support-cases | page | medium | classified |
| 121 | Support Case — Create | support-cases | page | medium | classified |

## Gap punch-list — for a short top-up walk
Surfaced from the captures (links/options seen but the screen/state wasn't walked).
Grouped by priority.

### A. Uncaptured screens reachable from what we have
- [ ] **Team roster/list** — we captured worker *profiles* but not the `/team` list landing.
- [ ] **Reports — EOR Gross-to-Net** and **EOR General Ledger** (seen as cards on 093, not opened).
- [ ] **Reports — Payroll Gross-to-Net / General Ledger / Variance** (096 mirrors the EOR suite; only the hub was captured).
- [ ] **New Hire — Payroll worker-type path** (only EOR + Contractor were walked; onboarding shows a Payroll type too).
- [ ] **Import Distribution Data** screen (linked from a pay period).
- [ ] **Dashboard header** — Notifications, Account/profile menu, Support, Logout.

### B. Action flows / states not captured (create / confirm / edit)
- [ ] Time Off — **create a request** flow.
- [ ] Time Tracking — **add a time entry** flow.
- [ ] Reimbursements — the **Approve** and **Decline** confirmation steps.
- [ ] Contract Detail — **off-board** flow and **change pay rate** modal.
- [ ] Invoices — **Download** / **Send Email** results.
- [ ] Settings → General — the **entity/billing edit** forms (captured thin).

### C. Thin captures worth re-grabbing (cleaner, with the improved tool)
- [ ] Onboarding worker steps (list captured; per-worker onboarding detail is thin).
- [ ] Support Case **detail** view (list was empty; open a populated case).

> Working discipline: when a gap is walked, add its entry above, check the box, and
> add any newly discovered children as new gap items.

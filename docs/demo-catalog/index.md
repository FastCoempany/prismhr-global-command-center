# Demo Catalog — Coverage Index

Master status table for the catalog. Built from an exhaustive first walk plus a
targeted top-up walk of the PrismHR Global demo.

## Summary
- **76 screens cataloged**, all `status: classified` (phase-1 facts done).
- **All 13 modules covered**, including the employee-facing **Worker Portal**.
- Value tiers: **29 high**, 41 medium, 6 low.
- Next: phase-2 scripting (deepen the value narrative on every entry).

## Module coverage
| Module | Screens |
|--------|---------|
| Dashboard | 4 |
| New Hire | 17 |
| Onboarding | 3 |
| Team | 9 |
| Invoices | 1 |
| Time Off | 1 |
| Time Tracking | 2 |
| Reimbursements | 1 |
| Reports | 13 |
| Tools & Resources | 3 |
| Settings | 7 |
| Support Cases | 2 |
| Worker Portal | 13 |

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
| 030 | Payroll — Employee Type (Payroll vs EOR) | new-hire | page | high | classified |
| 031 | Payroll — Employee Info | new-hire | page | high | classified |
| 032 | Payroll — Job Info | new-hire | page | high | classified |
| 033 | Payroll — Compensation | new-hire | page | high | classified |
| 034 | Payroll — Upload Agreement | new-hire | page | medium | classified |
| 035 | Payroll — Review & Approval | new-hire | page | high | classified |
| 036 | Invite Worker | new-hire | page | medium | classified |
| 037 | Onboarding Success (Payroll) | onboarding | page | medium | classified |
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
| 058 | Team (Roster) | team | page | high | classified |
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
| 098 | EOR Employee Gross to Net Report | reports | page | high | classified |
| 099 | EOR General Ledger Report | reports | page | high | classified |
| 100 | Tools & Resources (Hub) | tools-resources | page | medium | classified |
| 101 | Compensation Calculator | tools-resources | page | high | classified |
| 102 | Holidays Calendar | tools-resources | page | medium | classified |
| 103 | Payroll Employee Gross to Net Report | reports | page | medium | classified |
| 104 | Payroll General Ledger Report | reports | page | medium | classified |
| 105 | Payroll Variance Report | reports | page | high | classified |
| 110 | Settings — General | settings | page | low | classified |
| 111 | Settings — Users | settings | page | medium | classified |
| 112 | Settings — User Detail | settings | drilldown | low | classified |
| 113 | Settings — Roles and Permissions | settings | page | medium | classified |
| 114 | Settings — Role Detail | settings | drilldown | low | classified |
| 115 | Settings — Approval Workflows | settings | page | medium | classified |
| 116 | Settings — Assignments (Categories) | settings | page | low | classified |
| 120 | Support Cases (List) | support-cases | page | medium | classified |
| 121 | Support Case — Create | support-cases | page | medium | classified |
| 200 | Worker Dashboard (Home) | worker-portal | page | high | classified |
| 201 | Worker Time Off / Request Time Off | worker-portal | page | high | classified |
| 202 | Worker Profile / Personal | worker-portal | tab | medium | classified |
| 203 | Worker Profile / Bank & Tax Info | worker-portal | tab | medium | classified |
| 204 | Worker Profile / Contracts | worker-portal | tab | medium | classified |
| 205 | Worker Profile / Security | worker-portal | tab | low | classified |
| 206 | Worker Profile / Assignments | worker-portal | tab | medium | classified |
| 207 | Worker Portal — My Documents | worker-portal | page | medium | classified |
| 208 | Worker Portal — Payments | worker-portal | page | medium | classified |
| 209 | Worker Portal — Time Tracking | worker-portal | page | medium | classified |
| 210 | Worker Portal — Accept Payroll: Personal Information | worker-portal | page | high | classified |
| 211 | Worker Portal — Accept Payroll: National ID | worker-portal | page | medium | classified |
| 212 | Worker Portal — Accept Payroll: Address | worker-portal | page | medium | classified |

## Gap punch-list

### Closed by the top-up walk
- [x] Team roster/list → `058` (enriched with real filters/statuses)
- [x] Reports — EOR Gross-to-Net `098`, EOR General Ledger `099`
- [x] Reports — Payroll Gross-to-Net `103`, General Ledger `104`, Variance `105`
- [x] New Hire — Payroll worker-type path `030–036` + Onboarding Success (Payroll) `037`
- [x] Time-off request creation → captured worker-side (`201`)
- [x] Settings → General → enriched (`110`)
- [x] **NEW: Worker Portal** — 13 employee-facing screens (`200–212`)

### Still open (small; mostly optional)
- [ ] **Import Distribution Data** — link atop the Pay Period Approval screen; still 0 captures.
- [ ] Confirmation states only lightly touched: Reimbursement **Approve/Decline** modal,
  Contract **off-board** / **change pay rate** modals, Invoice **Download/Send Email**.
- [ ] Dashboard header — **Notifications** bell, **Support** icon (account menu is covered).

> Working discipline: when a gap is walked, add its entry above, check the box, and add any
> newly discovered children as new gap items.

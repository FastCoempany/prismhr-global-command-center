# Decision Log Template

Use this template for product, data-model, workflow, permission, HML, note-sensitivity, canon, or relationship-motion decisions.

Current posture: advisory in Git, mandatory in reasoning. CI blocking is not required yet.

## Decision Summary

- Decision:
- Date:
- Owner: Antaeus
- Approver: Antaeus
- Status: Draft | Approved | Deferred | Rejected | Superseded
- Related plan:
- Related records/files:

## Tags

Use any that apply:

- `[Canon]`
- `[Public]`
- `[InternalNote]`
- `[CSMContext]`
- `[Inference]`
- `[Hypothesis]`
- `[Unknown]`
- `[Unverified]`
- `[No-CRM]`
- `[HML:<category>:<H|M|L>]`
- `[RelOwner:<owner>]`
- `[Perm:<state>]`
- `[OffLimits]`
- `[Sensitivity:<level>]`
- `[Ambiguity]`

## Grounding

- Grounding level: Canon | Public research | Internal note | CSM-provided context | Reasonable inference | Working hypothesis | Internal unknown | Unverified assumption
- Evidence source:
- Source confidence: High | Medium | Low
- Former hypothesis, if promoted:
- Canon statement, if promoted:
- Can this be revised later: Yes | No

## Affected Domains

Check all that apply:

- [ ] Relationship ownership
- [ ] Permission state
- [ ] Off-limits / boundary rule
- [ ] CSM private debrief
- [ ] Note sensitivity
- [ ] HML rules or thresholds
- [ ] Daily serve
- [ ] Discovery framework
- [ ] Pitch / approved messaging
- [ ] PrismHR Global vs. Vensure Global boundary
- [ ] Contractor Management+ packaging
- [ ] Pricing / approval / legal process
- [ ] External channel
- [ ] Chicago territory
- [ ] Data model / schema
- [ ] Auth / access control
- [ ] Deployment / infrastructure

## Relationship And Permission Check

- Relationship owner:
- Permission state:
- Does this bypass a relationship owner: Yes | No
- If yes, override approval:
- Next safest action:
- Off-limits rules affected:
- Sensitive notes affected:

## HML Check

- Does this affect HML output: Yes | No
- Category:
- Inputs:
- Rule or threshold affected:
- Expected classification impact:
- Explanation requirement updated: Yes | No
- Confidence impact:

## Unknowns And Validation

- Unknowns:
- Does any unknown block implementation: Yes | No
- Blocking reason:
- Validation plan:
- Source needed:
- Due date:
- Resolution status: Open | Needs research | Needs internal confirmation | Needs CSM input | Needs owner decision | Decided | Deferred | No longer relevant

## Approval

- Approved by:
- Approved at:
- Approval notes:

## Example

- Decision: Treat Chicago as a priority-territory modifier for territory account scoring.
- Date: 2026-06-16
- Owner: Antaeus
- Approver: Antaeus
- Status: Approved
- Tags: `[Canon]` `[HML:Chicago-Territory:modifier]`
- Grounding level: Canon
- Evidence source: Canon doc and answered clarifying questions.
- Affected domains: HML rules, Chicago territory.
- Relationship and permission check: Chicago can increase priority, but cannot override permission or off-limits rules.
- Unknowns: final Chicago account list and scoring weights.
- Does any unknown block implementation: No. Track weights as editable HML configuration.

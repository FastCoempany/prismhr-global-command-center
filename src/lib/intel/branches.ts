// The branch map — the Call Sheet's conversation wiring (founder-decreed
// 2026-08-24: "instead of listen for > if they say > and then a branch that
// continues based on each 'if they say' and the question that should follow
// from the playbook bank").
//
// Keyed by question id; each array aligns index-for-index with that
// question's listenFor. The value is the bank question that follows when the
// prospect gives THAT answer — null means no special routing, the sheet just
// advances. Curated for the front paths of a conversation; the tail routes by
// the engine's own order until more links are authored.

export const BRANCH_NEXT: Record<string, (string | null)[]> = {
  "x-triage-language": ["eor-offer-stage", "fp-status", "cm-first-time", "fp-where"],
  "x-why-now": ["eor-offer-stage", "cl-control", "cm-withholding", "x-do-nothing"],
  "fp-where": ["fp-status", "fp-status", "x-pain-vs-power"],
  "fp-status": ["cl-notice", "cl-notice", "cl-control"],
  "fp-paid": ["mo-fees", "mo-fees", "x-pain-vs-power", "x-pain-vs-power", "mo-fees"],
  "x-intent-employee": ["cl-control", "cm-first-time", "cl-control", "x-criteria"],
  "x-entity-own": ["gp-nre", "gp-nre", "eor-offer-stage", "gp-nre"],
  "cl-control": [
    "cm-tools-integration",
    "cm-exclusivity",
    "cm-exclusivity",
    "cm-what-is-signed",
  ],
  "rk-driver": ["rk-ip", "cm-audit-file", "ti-date", "mt-decide", "x-do-nothing"],
  "in-who": [
    "x-last-failure",
    "x-last-failure",
    "in-integrate",
    "x-last-failure",
    "x-last-failure",
  ],
  "ti-date": ["mt-decide", "ti-path", "ti-path"],
  "mo-fees": ["mo-freq", "rk-scrape", "gp-effort-cost"],
  "cm-first-time": [
    "cl-control",
    "cm-what-is-signed",
    "cm-exclusivity",
    "x-intent-employee",
  ],
  "co-chair": ["co-credit", "co-credit", "x-prog-margin", "x-partner-guardrails"],
  "eor-offer-stage": [
    "eor-prior-promise",
    "eor-probation-notice",
    "eor-first-priority",
    "x-visa-need",
  ],
  "gp-who-runs": [
    "gp-filing-owner",
    "gp-notice-period",
    "gp-effort-cost",
    "gp-first-cycle",
  ],
  "x-do-nothing": ["x-criteria", "eor-offer-stage", "cm-withholding", "cm-audit-file"],
  "in-renewal": ["mt-decide", "x-incumbent-exit", "x-incumbent-exit", "x-incumbent-exit"],
  "x-partner-history": ["x-last-failure", "x-criteria", "x-last-failure", "x-why-now"],
  "cm-roster-count": [
    "cm-system-of-record",
    "cm-system-of-record",
    "cm-exclusivity",
    "x-pain-vs-power",
  ],
  "rk-pe": ["eor-pe-activity", "eor-pe-activity", "mo-fees", "eor-pe-activity"],
  "mt-exec": ["mt-decide", "ti-date"],
  "x-pain-vs-power": ["x-client-capacity", "mt-exec", "mt-decide", "mt-exec"],
  "gp-first-cycle": ["gp-funding", "eor-prior-promise", "x-criteria", "gp-notice-period"],
  "eor-first-priority": ["eor-offer-stage", "cl-control", "ti-path", "ti-date"],
  "cm-exclusivity": ["cl-control", "rk-ip", "cm-what-is-signed", "cm-system-of-record"],
};

/** The question that follows when the prospect answers `q` with listenFor
 *  entry `i` — or null when the sheet should simply advance. */
export function branchNext(qid: string, i: number): string | null {
  const row = BRANCH_NEXT[qid];
  if (!row) return null;
  return row[i] ?? null;
}

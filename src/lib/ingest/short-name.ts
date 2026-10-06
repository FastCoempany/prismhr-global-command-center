// The name as a person says it (the Chute brains refactor plan, slices 5 and
// 18a). The guard's reason spends nine words, and the held box's buttons and
// grounds name both companies on one line, so both read the company the way a
// person would say it: "File to Simploy", never "File to Simploy, Inc.". It
// lives on its own, pure and import-free, so the held box can read it in the
// browser without carrying the guard's rungs along (src/lib/ingest/guard.ts
// re-exports it for the suites that pin it there).

// The trailing legal form a name carries in the book and nobody says out
// loud: "Simploy, Inc." is Simploy in every sentence.
const LEGAL_RE =
  /[,.]?\s+(?:inc|llc|l\.l\.c|corp|corporation|co|ltd|plc|lp|llp|pllc)\.?$/i;

/** The name as a person says it: the trade-name split dropped ("Cornerstone
 *  Employer Solutions (dba SynchronyHR)" is Cornerstone Employer Solutions),
 *  a dashed qualifier dropped, the legal suffix dropped. The full name rides
 *  in the verdict's claim and bound; the reason has nine words to spend. */
export function shortName(name: string): string {
  let n = (name ?? "").trim();
  n = n.split(/\s+(?:dba|d\/b\/a)\s+|\s*\((?:dba|d\/b\/a)\b/i)[0]!.trim();
  n = n.split(/\s[-–—]\s/)[0]!.trim();
  n = n.replace(/\s*\([^)]*\)\s*$/, "").trim();
  for (;;) {
    const m = n.replace(LEGAL_RE, "").trim();
    if (m === n) break;
    n = m;
  }
  n = n.replace(/[,.]+$/, "").trim();
  return n || (name ?? "").trim();
}

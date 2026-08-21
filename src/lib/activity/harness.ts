// The harness — the pure halves of the three adversarial passes, extracted
// so the suite can adversarially test the verifiers themselves (§8.3): a
// harness that cannot catch planted faults fails the build.

import { lintAct, lintReason, lintTerm } from "./lint";
import type { GemCandidate } from "./distill";

type CitedRowLike = {
  d: string;
  lane: string;
  fl: string;
  s: string;
  c?: string;
  a: string;
};

/** ⚔ 2a · the mechanical gauntlet — the cheap rejections that never spend a
 *  model call. Returns "" for a survivor, else the named kill. */
export function mechanicalKill(
  cand: GemCandidate,
  rowsByKey: Map<string, CitedRowLike>,
  colleagues: Set<string>,
  accountPeople: Set<string>,
): string {
  const act = lintAct(cand.act);
  if (!act.ok) return `act: ${act.faults[0]}`;
  const term = lintTerm(cand.term);
  if (!term.ok) return `term: ${term.faults[0]}`;
  const reason = lintReason(cand.reason);
  if (!reason.ok) return `reason: ${reason.faults[0]}`;
  if (cand.citedRowKeys.length === 0) return "no citations";
  const cited = cand.citedRowKeys.map((k) => rowsByKey.get(k));
  if (cited.some((r) => !r)) return "a cited row is not in staging";
  const rows = cited as CitedRowLike[];
  if (rows.some((r) => r.lane === "intent" || r.lane === "machinery"))
    return "cites machinery";
  if (rows.every((r) => r.fl.includes("r") || r.fl.includes("a")))
    return "stands only on receipts";
  const maxDay =
    rows
      .map((r) => r.d)
      .sort()
      .slice(-1)[0] ?? "";
  if (cand.whenDay !== maxDay) return `whenDay ${cand.whenDay} ≠ newest cited ${maxDay}`;
  const hay = rows.map((r) => `${r.a}\n${r.s}\n${r.c ?? ""}`).join("\n");
  for (const who of cand.who) {
    const t = (who ?? "").trim();
    if (!t) return "an empty who";
    const known = colleagues.has(t) || accountPeople.has(t) || hay.includes(t);
    if (!known) return `"${t}" appears nowhere in citations or rosters`;
    if (colleagues.has(t) && accountPeople.has(t)) return `"${t}" is unresolved`;
  }
  return "";
}

/** ⚔ 1 · the coverage invariant's arithmetic: every account with human or
 *  CSM rows must be covered this run or hold prior coverage. Returns the
 *  names that are neither — a non-empty answer fails the run (§3.7). */
export function coverageGaps(
  accounts: { id: string; name: string; humanRows: number }[],
  covered: Record<string, string>,
  hasPriorRollup: (id: string) => boolean,
): string[] {
  const out: string[] = [];
  for (const a of accounts) {
    if (a.humanRows === 0) continue;
    if (covered[a.id]) continue;
    if (hasPriorRollup(a.id)) continue;
    out.push(a.name || a.id);
  }
  return out;
}

/** The distiller-quality flag: more than half the candidates dying is worth
 *  the founder's eye on the receipt (§3.8). */
export function mortalityFlag(born: number, died: number): boolean {
  return born > 0 && died / born > 0.5;
}

/** The drop's work queues (§3.3), pure. An account already covered under the
 *  incoming sha never re-queues — the same rows distill to the same gems, and
 *  a re-drop of the same file must cost zero model calls (burned once,
 *  2026-08-21 — never again). */
export function dropQueues(
  accounts: { id: string; rowsSum: string; tallySum: string }[],
  prior: Map<string, { rowsSum: string; tallySum: string }>,
  shaCovered: Set<string>,
): { distillQueue: string[]; intentQueue: string[] } {
  const distillQueue: string[] = [];
  const intentQueue: string[] = [];
  for (const a of accounts) {
    if (shaCovered.has(a.id)) continue;
    const p = prior.get(a.id);
    if (!p || p.rowsSum !== a.rowsSum) distillQueue.push(a.id);
    else if (p.tallySum !== a.tallySum) intentQueue.push(a.id);
  }
  return { distillQueue, intentQueue };
}

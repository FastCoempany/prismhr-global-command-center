// "Ask next" — the ≤3 questions worth asking this account right now.
// Gap detection reads the derived DealIntel; the bank supplies the questions;
// asknext-done: dispositions retire what's been asked.

import { DASH_NODES, type DashNodeKey } from "@/lib/dashboard/stages";
import { questionsFor, type DiscoveryQ, type QCategory } from "./discovery";
import type { DealIntel } from "./types";

// Which categories the corpus still can't answer.
export function gapsFor(intel: DealIntel): QCategory[] {
  const gaps: QCategory[] = [];
  if (intel.countries.length === 0) gaps.push("footprint");
  if (!intel.timing) gaps.push("timing");
  if (intel.threads.people.length < 2 && !gaps.includes("timing")) gaps.push("timing"); // mt-exec lives here
  if (intel.chair === "undecided") gaps.push("commercial");
  if (!intel.incumbent) gaps.push("incumbent");
  return gaps;
}

// The card's working phase: first active node, else the last done one.
export function stageOf(states: Partial<Record<DashNodeKey, string>>): DashNodeKey {
  const activeN = DASH_NODES.find((n) => states[n.key] === "active");
  if (activeN) return activeN.key;
  for (let i = DASH_NODES.length - 1; i >= 0; i--)
    if (states[DASH_NODES[i].key] === "done") return DASH_NODES[i].key;
  return "investigate";
}

export function askNextFor(opts: {
  intel: DealIntel;
  states: Partial<Record<DashNodeKey, string>>;
  accountId: string; // "" tolerated — done keys then never match
  doneKeys: Set<string>; // all disposition keys
  max?: number;
}): DiscoveryQ[] {
  const qs = questionsFor({
    phase: stageOf(opts.states),
    gaps: gapsFor(opts.intel),
    countries: opts.intel.countries.map((c) => c.value),
  });
  return qs
    .filter((q) => !opts.doneKeys.has(`asknext-done:${opts.accountId}:${q.id}`))
    .slice(0, opts.max ?? 3);
}

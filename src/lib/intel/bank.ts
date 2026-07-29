// The question bank's selection engine.
//
// The old battlecard filtered by three facets, ANDed, with no counts and no
// empty state — so two clicks reliably produced "0 of 25" and the card looked
// broken because it WAS broken: three of its phase chips had no questions
// behind them at all. This engine fixes the class of bug rather than the
// instance: every chip knows how many questions it would yield GIVEN the other
// filters, a chip that would yield none is inert, and an empty result says why.
//
// It also adds the two facets the bank was missing. Which product line is in
// play (EOR / contractor management / global payroll) changes the vocabulary
// entirely, and how sophisticated the buyer is changes whether a question
// teaches or probes. A scenario is a saved combination of those, plus the
// categories to lead with and the ones that are noise.

import type { DiscoveryQ, QAudience, QCategory, QPhase } from "./discovery";
import type { DashNodeKey } from "@/lib/dashboard/stages";

export type QProduct = "eor" | "contractor" | "payroll" | "any";
export type QSoph = "naive" | "inhouse" | "displacement" | "any";
export type Posture =
  | "self_run"
  | "on_prismhr"
  | "other_platform"
  | "through_partner"
  | "any";

export const PRODUCT_LABEL: Record<QProduct, string> = {
  eor: "EOR",
  contractor: "Contractor mgmt",
  payroll: "Global payroll",
  any: "Any line",
};

export const SOPH_LABEL: Record<QSoph, string> = {
  naive: "New to this",
  inhouse: "Runs it themselves",
  displacement: "On a competitor",
  any: "Any",
};

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  product: QProduct;
  sophistication: QSoph;
  posture: Posture;
  leadWith: QCategory[];
  avoid: QCategory[];
  traps: string[];
  objections: { objection: string; counter: string }[];
};

// A question's facets, with the bank's older entries defaulting to "applies
// however the deal is shaped" rather than being silently excluded.
export function productOf(q: DiscoveryQ): QProduct {
  return q.product ?? "any";
}
export function sophOf(q: DiscoveryQ): QSoph {
  return q.soph ?? "any";
}

export type Filters = {
  category: QCategory | "";
  phase: QPhase | "";
  audience: QAudience | "";
  product: QProduct | "";
  soph: QSoph | "";
};

export const NO_FILTERS: Filters = {
  category: "",
  phase: "",
  audience: "",
  product: "",
  soph: "",
};

// "any" questions always survive a product/sophistication filter — they are
// true whatever the answer is, which is exactly why they're marked "any".
function facetMatch(qv: string, want: string): boolean {
  return !want || qv === want || qv === "any";
}

export function matches(q: DiscoveryQ, f: Filters): boolean {
  return (
    (!f.category || q.category === f.category) &&
    (!f.phase || q.phase === f.phase) &&
    (!f.audience || q.audience === f.audience) &&
    facetMatch(productOf(q), f.product) &&
    facetMatch(sophOf(q), f.soph)
  );
}

// Order: the scenario's lead categories first (in the scenario's own order),
// then everything else, then by how late in the deal the question belongs —
// late questions surface last so early discovery reads top-down.
const PHASE_RANK: Record<DashNodeKey, number> = {
  investigate: 0,
  first_meeting: 1,
  needs_analysis: 2,
  demo: 3,
  exec_summary: 4,
  proposal: 5,
  contract: 6,
};

export function selectQuestions(
  bank: readonly DiscoveryQ[],
  f: Filters,
  scenario?: Scenario | null,
): DiscoveryQ[] {
  const lead = new Map((scenario?.leadWith ?? []).map((c, i) => [c, i]));
  const avoid = new Set(scenario?.avoid ?? []);
  const out = bank.filter((q) => {
    if (!matches(q, f)) return false;
    // A scenario's noise categories drop out — unless the operator asked for
    // that category by name, in which case they know what they want.
    if (!f.category && avoid.has(q.category)) return false;
    return true;
  });
  return out.sort((a, b) => {
    const la = lead.has(a.category) ? lead.get(a.category)! : 99;
    const lb = lead.has(b.category) ? lead.get(b.category)! : 99;
    if (la !== lb) return la - lb;
    const pa = PHASE_RANK[a.phase] ?? 9;
    const pb = PHASE_RANK[b.phase] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

// How many questions each chip would yield if it were the ONLY change to the
// current filters. This is what makes a dead chip visibly dead.
export function facetCounts<K extends keyof Filters>(
  bank: readonly DiscoveryQ[],
  f: Filters,
  facet: K,
  values: readonly NonNullable<Filters[K]>[],
  scenario?: Scenario | null,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of values) {
    const probe = { ...f, [facet]: v } as Filters;
    out.set(String(v), selectQuestions(bank, probe, scenario).length);
  }
  return out;
}

// Why the list is empty, in words the operator can act on. Never a bare zero.
export function emptyBecause(
  bank: readonly DiscoveryQ[],
  f: Filters,
  scenario?: Scenario | null,
): string {
  const active = (Object.entries(f) as [keyof Filters, string][]).filter(
    ([, v]) => v,
  );
  if (active.length === 0) return "The bank is empty — that's a bug, not a filter.";
  // Find the single filter that, dropped, brings questions back.
  for (const [k] of active) {
    const without = { ...f, [k]: "" } as Filters;
    if (selectQuestions(bank, without, scenario).length > 0)
      return `Nothing asks that. Drop the ${String(k)} filter and there are questions again.`;
  }
  return "No question in the bank fits that combination yet.";
}

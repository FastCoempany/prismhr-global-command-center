// "Ask next" — the ≤3 questions worth asking this account right now.
// Gap detection reads the derived DealIntel; the bank supplies the questions;
// asknext-done: dispositions retire what's been asked.
//
// The bank is the MERGED bank (2026-08-24): DISCOVERY plus the product
// questions the deal has earned. Earned means the record speaks — a product
// question joins only when the record names its line, and a displacement
// question only when an incumbent is actually known. The naive merge would
// have boosted competitor-displacement questions precisely when no competitor
// exists (the incumbent gap fires on UNKNOWN), which is backwards.

import { DASH_NODES, type DashNodeKey } from "@/lib/dashboard/stages";
import { DISCOVERY, questionsFor, type DiscoveryQ, type QCategory } from "./discovery";
import { PRODUCT_BANK } from "./discovery-product";
import type { DealIntel, ProductKey } from "./types";

// The record's product vocabulary is wider than the bank's: contractor-plus is
// still the contractor lane, and the platform add-ons carry no question lane.
const PRODUCT_LANE: Partial<Record<ProductKey, "eor" | "contractor" | "payroll">> = {
  eor: "eor",
  contractor: "contractor",
  contractor_plus: "contractor",
  payroll: "payroll",
};

/** DISCOVERY plus the PRODUCT_BANK questions this deal's record has earned. */
export function bankFor(intel: DealIntel): DiscoveryQ[] {
  const lanes = new Set(intel.products.map((p) => PRODUCT_LANE[p.value]).filter(Boolean));
  const incumbentKnown = Boolean(intel.incumbent);
  const earned = PRODUCT_BANK.filter((q) => {
    const lane = q.product ?? "any";
    if (lane !== "any" && !lanes.has(lane as never)) return false;
    if ((q.soph ?? "any") === "displacement" && !incumbentKnown) return false;
    return true;
  });
  return [...DISCOVERY, ...earned];
}

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
    bank: bankFor(opts.intel),
  });
  return qs
    .filter((q) => !opts.doneKeys.has(`asknext-done:${opts.accountId}:${q.id}`))
    .slice(0, opts.max ?? 3);
}

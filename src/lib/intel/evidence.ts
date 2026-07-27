// Evidence → stage-checkbox suggestions. Deterministic pattern map from the
// build spec (§2.2): each rule reads the corpus and points at ONE node item.
// Suggestions are never auto-applied — the UI renders them amber with a
// one-click Confirm (real toggleCheck) or dismiss (sugg-dismiss disposition).

import type { DashNodeKey } from "@/lib/dashboard/stages";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { countriesIn } from "./lexicon";
import type { CorpusDoc } from "./extract";

export type CheckSuggestion = {
  node: DashNodeKey;
  itemIdx: number;
  reason: string; // short, sourced: "demo transcript filed 7/7"
  srcAt: string;
};

type Rule = {
  id: string;
  node: DashNodeKey;
  itemIdx: number;
  re: RegExp;
  pastOnly?: boolean; // evidence must be dated in the past (it happened)
  label: (doc: CorpusDoc) => string;
};

const RULES: Rule[] = [
  {
    id: "demo-delivered",
    node: "demo",
    itemIdx: 3,
    re: /demo (delivered|went|recap)|transcript filed|Accepted: Demo|demo (yesterday|last week)|Demo delivered/i,
    pastOnly: true,
    label: (d) => `demo evidence · ${d.src}`,
  },
  {
    id: "contracts-out",
    node: "contract",
    itemIdx: 2,
    re: /contracts? (for signature|sent|attached|out)|referral agreement|MSSA/i,
    label: (d) => `contract paper moving · ${d.src}`,
  },
  {
    id: "proposal-delivered",
    node: "proposal",
    itemIdx: 1,
    re: /pricing (overview|attached|delivered)|proposal (sent|attached|delivered)/i,
    label: (d) => `pricing/proposal sent · ${d.src}`,
  },
  {
    id: "partner-briefed",
    node: "first_meeting",
    itemIdx: 0,
    re: /partner (briefed|is briefed)|briefed .* on the global angle/i,
    label: (d) => `partner briefed · ${d.src}`,
  },
  {
    id: "cleared-approach",
    node: "first_meeting",
    itemIdx: 1,
    re: /cleared to (engage|approach)|permission to approach|introduce you to my global/i,
    label: (d) => `cleared to engage · ${d.src}`,
  },
  {
    id: "countries-known",
    node: "needs_analysis",
    itemIdx: 0,
    re: /countr(y|ies)|we're in [A-Z]|workers? in [A-Z]/,
    label: (d) => `countries named · ${d.src}`,
  },
];

export function suggestChecks(
  docs: CorpusDoc[],
  card: { checks: Partial<Record<DashNodeKey, boolean[]>> },
  dismissed: Set<string>, // "node:itemIdx" pairs already dismissed
  now: Date = new Date(),
): CheckSuggestion[] {
  const out: CheckSuggestion[] = [];
  for (const rule of RULES) {
    if (card.checks[rule.node]?.[rule.itemIdx]) continue; // already checked
    if (dismissed.has(`${rule.node}:${rule.itemIdx}`)) continue;
    const doc = docs.find((d) => {
      if (!rule.re.test(d.text)) return false;
      if (rule.id === "countries-known" && countriesIn(d.text).length === 0) return false;
      if (rule.pastOnly && Date.parse(d.at) > now.getTime()) return false;
      return true;
    });
    if (doc)
      out.push({
        node: rule.node,
        itemIdx: rule.itemIdx,
        reason: doc.src ? rule.label(doc) : rule.id,
        srcAt: doc.at,
      });
  }
  // Never suggest an item index the node doesn't have (checklists evolve).
  return out.filter((s) => {
    const n = DASH_NODES.find((x) => x.key === s.node);
    return n != null && s.itemIdx < n.checklist.length;
  });
}

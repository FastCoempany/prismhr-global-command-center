// Live Look-into — items born from what the corpus can't answer TODAY,
// replacing the bootstrap-era static list. Three sources:
//   1. research gaps on live deals (country basics unresearched before demo)
//   2. capture asks/gaps still open after 2 days
//   3. intel contradictions (evidence says a stage happened; board disagrees
//      for 3+ days)
// Ids are synthetic (`li-live:<kind>:<subjectId>`) so resolution reuses the
// same lookIntoStatus table — validated against the current live set.

import type { DashNodeKey } from "@/lib/dashboard/stages";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { researchPrompt } from "@/lib/intel/research";
import type { CheckSuggestion } from "@/lib/intel/evidence";
import type { DealIntel } from "@/lib/intel/types";

export type LiveLookIntoItem = {
  id: string; // li-live:<kind>:<subjectId>
  kind: "research" | "ask" | "contradiction";
  title: string;
  why: string;
  weight: "high" | "medium";
  prompt?: string; // research items carry a copyable prompt
};

const DAY = 86_400_000;

export type LiveLookIntoInput = {
  now: Date;
  cards: {
    id: string;
    name: string;
    states: Partial<Record<DashNodeKey, string>>;
  }[];
  intelByCard: Record<string, DealIntel>;
  suggByCard: Record<string, CheckSuggestion[]>;
  captureNotes: { id: string; kind: string; body: string; createdAt: string }[]; // open only
};

const nodeLabel = (key: DashNodeKey) =>
  DASH_NODES.find((n) => n.key === key)?.label ?? key;

export function liveLookInto(inp: LiveLookIntoInput): LiveLookIntoItem[] {
  const out: LiveLookIntoItem[] = [];

  for (const card of inp.cards) {
    const intel = inp.intelByCard[card.id];
    if (!intel) continue;
    const live = Object.values(card.states).some((s) => s === "active");
    if (!live) continue;

    // 1. Research gaps: countries known, demo not yet done → statutory basics.
    const demoDone = card.states.demo === "done";
    if (!demoDone && intel.countries.length > 0) {
      const names = intel.countries.map((c) => COUNTRY_NAME[c.value] ?? c.value);
      out.push({
        id: `li-live:research:${card.id}`,
        kind: "research",
        title: `Research ${names.slice(0, 3).join(", ")} statutory basics.`,
        why: `${card.name}: demo ahead, countries named.`,
        weight: "medium",
        prompt: researchPrompt("country", {
          account: card.name,
          countries: names,
          known: intel.direction ? [intel.direction.line] : [],
          question: `What statutory employment basics (notice periods, employer costs, onboarding timelines) matter in ${names.join(", ")}?`,
        }),
      });
    }

    // 3. Contradictions: evidence says a stage item happened; the board has
    // disagreed for 3+ days.
    const stale = (inp.suggByCard[card.id] ?? []).find(
      (s) => inp.now.getTime() - Date.parse(s.srcAt) >= 3 * DAY,
    );
    if (stale) {
      out.push({
        id: `li-live:contradiction:${card.id}`,
        kind: "contradiction",
        title: `Settle the ${nodeLabel(stale.node)} check.`,
        why: `${stale.reason}. Still unanswered.`,
        weight: "high",
      });
    }
  }

  // 2. Capture asks/gaps still open after 2 days.
  for (const n of inp.captureNotes) {
    if (n.kind !== "ask" && n.kind !== "gap") continue;
    if (inp.now.getTime() - Date.parse(n.createdAt) < 2 * DAY) continue;
    out.push({
      id: `li-live:ask:${n.id}`,
      kind: "ask",
      title: n.body.replace(/\s+/g, " ").trim().slice(0, 110),
      why: (() => {
        const d = Math.floor((inp.now.getTime() - Date.parse(n.createdAt)) / DAY);
        const ago = d === 1 ? "yesterday" : `${d} days ago`;
        return `${n.kind === "ask" ? "An ask" : "An enablement gap"} logged ${ago}, still unresolved.`;
      })(),
      weight: "high",
    });
  }

  const rank = { high: 0, medium: 1 } as const;
  return out.sort((a, b) => rank[a.weight] - rank[b.weight]);
}

// Nav-badge replacement: any unresolved weight-high live item.
export function liveHighCount(items: LiveLookIntoItem[], resolved: Set<string>): number {
  return items.filter((i) => i.weight === "high" && !resolved.has(i.id)).length;
}

// Evidence → stage-checkbox suggestions. Deterministic pattern map from the
// build spec (§2.2): each rule reads the corpus and points at ONE node item.
// Suggestions are never auto-applied — the UI renders them amber with a
// one-click Confirm (real toggleCheck) or dismiss (sugg-dismiss disposition).

import type { DashNodeKey } from "@/lib/dashboard/stages";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { dealFacts, factAnswer, type CorpusDoc } from "./extract";
import type { TapedFact } from "./types";

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
  /** The event's words. The countries rule has none: it reads the countries
   *  every surface reads (S-20). */
  re?: RegExp;
  /** Set only on a rule reading a standing FACT rather than an event that
   *  happened. Every other rule here points at a gate worded as a thing
   *  already done — "delivered", "sent", "briefed", "cleared" — so the date
   *  gate below is the default and this is the one exemption. A new rule that
   *  forgets to think about dates gets the safe read, not the loud one. */
  standingFact?: true;
  label: (doc: CorpusDoc) => string;
};

// A document dated after today has not happened yet. A Salesforce task due
// next week is ordinary text to a regex, so "proposal sent" sitting on a
// calendar reminder would march the meter forward on work nobody has done —
// the same future-dated read that had the room chasing a reply to a task the
// operator had set themselves (Trend Personnel Services, 2026-09-23).
//
// An unparseable date is not a future one: evidence is never dropped over a
// date the parser could not read.
function futureDated(at: string, now: Date): boolean {
  const ms = Date.parse(at);
  return !Number.isNaN(ms) && ms > now.getTime();
}

const RULES: Rule[] = [
  {
    id: "demo-delivered",
    node: "demo",
    itemIdx: 3,
    re: /demo (delivered|went|recap)|transcript filed|Accepted: Demo|demo (yesterday|last week)|Demo delivered/i,
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
    // The gate asks which countries they hire in, and a country named is
    // named — a reminder's due date does not un-name Brazil. The only rule
    // here reading a fact instead of an event. It reads the account's
    // countries as every surface does, through the one facts reader and the
    // one tape rule (pass 9 seam, S-20), and cites the fact it stands on: a
    // re-scan of its own once cited a demo tape's Brazil while the room's
    // meta named the read's Mexico.
    standingFact: true,
    label: (d) => `countries named · ${d.src}`,
  },
];

export function suggestChecks(
  docs: CorpusDoc[],
  card: { checks: Partial<Record<DashNodeKey, boolean[]>> },
  dismissed: Set<string>, // "node:itemIdx" pairs already dismissed
  now: Date = new Date(),
  /** The account read's countries (field 18), when the caller holds the
   *  read; absent, the same reader runs over these docs. */
  countries?: readonly TapedFact<string>[],
): CheckSuggestion[] {
  const out: CheckSuggestion[] = [];
  const named = factAnswer(countries ?? dealFacts(docs).countries)[0];
  for (const rule of RULES) {
    if (card.checks[rule.node]?.[rule.itemIdx]) continue; // already checked
    if (dismissed.has(`${rule.node}:${rule.itemIdx}`)) continue;
    const re = rule.re;
    const doc: CorpusDoc | undefined = !re
      ? named
        ? { text: "", src: named.src, at: named.at }
        : undefined
      : docs.find((d) => {
          if (!re.test(d.text)) return false;
          if (!rule.standingFact && futureDated(d.at, now)) return false;
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

// The "Today" command surface reads from two places the owner already curates:
// the Account Room (targeting intelligence — firmographics + researched global
// demand) and the Dashboard (the hand-sewn execution ledger). Nothing here
// writes. It turns those two into four bands: what the base is telling you
// (Signal in), what you owe a partner before an account can move (Debts out),
// the single highest-leverage account to touch now (Move), and the pattern
// worth carrying up (Narrative). All derivation is pure so it stays honest.

import { peos } from "@/lib/book";
import { partnerRole } from "@/lib/book/partners";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { analyzePlay, DEMAND_GATE, extractCountries, getDemand } from "@/lib/book/research";
import { DASH_NODES, type DashNodeKey } from "@/lib/dashboard/stages";
import type { DashCardRow } from "@/lib/dashboard/data";

// Which lead stream an account funnels through. The PEO channel is CSM-owned
// (reach the client through their PEO). The HCM funnel is the other half of the
// role: net-new HCM logos brought on by Enterprise Sales (Eric), plus HRaaS/HRO
// platforms — these route to Global directly through the HCM side, not a CSM.
export type Funnel = "peo" | "hcm";

export function funnelOf(csm: string, industry: string): Funnel {
  if (partnerRole(csm) === "Enterprise Sales, HCM") return "hcm";
  const i = industry.toLowerCase();
  if (i.includes("hraas") || i.includes("hro")) return "hcm";
  return "peo";
}

export type AccountIntel = {
  id: string;
  name: string;
  csm: string;
  industry: string;
  funnel: Funnel;
  score: number; // composite Global-fit
  tier: "high" | "medium" | "low";
  demand: number | null;
  confidence: "high" | "medium" | "low";
  researched: boolean;
  play: "displacement" | "greenfield" | null;
  competitors: string[];
  countries: string[];
  summary: string;
};

// Slim intel for every channel account, highest composite fit first. Mirrors the
// Account Room's own mapping so Today and Accounts never disagree on a score.
export function accountIntel(): AccountIntel[] {
  return peos
    .map((p) => {
      const d = deskScore(p);
      const dem = getDemand(p.id);
      const demand = dem?.researched ? dem.demandScore : null;
      const c = compositeScore(d.score, demand, dem?.confidence ?? "low");
      const pl = analyzePlay(dem);
      return {
        id: p.id,
        name: p.name,
        csm: p.csm,
        industry: p.industry,
        funnel: funnelOf(p.csm, p.industry),
        score: c.score,
        tier: c.tier,
        demand,
        confidence: dem?.confidence ?? "low",
        researched: dem?.researched ?? false,
        play: pl.play,
        competitors: pl.competitors,
        countries: extractCountries(dem),
        summary: dem?.summary ?? "",
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Band 1 — Signal in. Accounts where research surfaced real, actionable
// global-hiring demand (the play gate). These are the base talking.
export function signals(intel: AccountIntel[], limit = 6): AccountIntel[] {
  const real = intel.filter((a) => a.demand != null && a.demand >= DEMAND_GATE);
  const pool = real.length
    ? real
    : intel.filter((a) => a.researched && a.demand != null).slice(0, limit);
  return [...pool].sort((a, b) => (b.demand ?? 0) - (a.demand ?? 0)).slice(0, limit);
}

export type Debt = {
  cardId: string;
  cardName: string;
  nodeKey: DashNodeKey;
  nodeLabel: string;
  item: string;
  note?: string;
  ageDays: number | null; // days the node has been in flight ("owed"), null if unstamped
};

// Days between an ISO timestamp and `now`, floored. `now` is injected so the
// function stays pure/testable.
function daysSince(iso: string, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

// Band 2 — Debts out. A debt is a mandatory item still unchecked on a node
// that's already in motion ("active"). Nodes at "todo" haven't started (nothing
// owed yet) and "done" nodes are settled — so only active nodes generate debts:
// the recap you owe, the availability you asked a partner to confirm, the brief
// you promised. Aged by how long the node has been active, oldest first.
export function debtsFromCards(
  cards: DashCardRow[],
  labels: Record<string, string>,
  now: number = Date.now(),
): Debt[] {
  const out: Debt[] = [];
  for (const card of cards) {
    if (card.archived) continue;
    for (const node of DASH_NODES) {
      if (card.states[node.key] !== "active") continue;
      const ageDays = daysSince(card.activated?.[node.key] ?? "", now);
      const checks = card.checks[node.key] ?? [];
      node.checklist.forEach((item, i) => {
        if (checks[i]) return;
        out.push({
          cardId: card.id,
          cardName: card.name,
          nodeKey: node.key,
          nodeLabel: labels[node.key] ?? node.label,
          item,
          note: card.checkNotes[node.key]?.[i],
          ageDays,
        });
      });
    }
  }
  // Oldest debts first (nulls — unstamped, e.g. pre-migration — sort last).
  return out.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
}

// The partner-engagement line — the third question the owner brings to every
// partner touch: what language gauges / drums up / campaigns the Global product
// for this specific client. Shaped by whether it's a displacement or greenfield.
export function partnerAngle(a: AccountIntel): string {
  const comp = a.competitors[0];
  if (a.play === "displacement" && comp) {
    return `Ask ${a.csm}: how is ${a.name} feeling about ${comp}? When's the renewal? We can bring that same coverage onto the PrismHR platform they already run — one bill, one system of record.`;
  }
  if (a.play === "greenfield") {
    return `Ask ${a.csm}: is ${a.name} hiring anywhere they don't have a legal entity, or converting contractors? That misclassification exposure is our opening — Global lets them do it compliantly without standing up entities.`;
  }
  return `Ask ${a.csm} what ${a.name}'s cross-border footprint looks like — entities, how they pay, employees vs contractors. Gauge before you campaign.`;
}

export type Narrative = {
  researched: number;
  total: number;
  realDemand: number;
  displacement: number;
  greenfield: number;
  highFit: number;
  mediumFit: number;
  hcmFunnel: number;
  topCountries: { name: string; count: number }[];
};

// Band 4 — Narrative forming. Honest, derived "voice of the base" numbers: how
// much of the book we've researched, how much shows real demand, and the
// displacement/greenfield split. This is the pattern that accrues into the line
// carried up to Aleks — no spin, just what the data says.
export function narrative(intel: AccountIntel[]): Narrative {
  const researched = intel.filter((a) => a.researched).length;
  const realDemand = intel.filter((a) => a.demand != null && a.demand >= DEMAND_GATE).length;
  const displacement = intel.filter((a) => a.play === "displacement").length;
  const greenfield = intel.filter((a) => a.play === "greenfield").length;
  const highFit = intel.filter((a) => a.tier === "high").length;
  const mediumFit = intel.filter((a) => a.tier === "medium").length;
  const hcmFunnel = intel.filter((a) => a.funnel === "hcm").length;

  const freq = new Map<string, number>();
  for (const a of intel) for (const c of a.countries) freq.set(c, (freq.get(c) ?? 0) + 1);
  const topCountries = [...freq.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);

  return {
    researched,
    total: intel.length,
    realDemand,
    displacement,
    greenfield,
    highFit,
    mediumFit,
    hcmFunnel,
    topCountries,
  };
}

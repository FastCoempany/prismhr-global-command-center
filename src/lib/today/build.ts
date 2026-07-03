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

// Word-boundary match, not a bare substring: "hro" as a naked includes() would
// mis-tag any future industry string that merely contains those letters. \b
// keeps it to the actual HRaaS / HRO tokens.
const HCM_MODEL = /\bhraas\b|\bhro\b/i;

export function funnelOf(csm: string, industry: string): Funnel {
  if (partnerRole(csm) === "Enterprise Sales, HCM") return "hcm";
  if (HCM_MODEL.test(industry)) return "hcm";
  return "peo";
}

export type ValidationStatus = "confirmed" | "flagged" | "adjusted";
export type Validation = { status: ValidationStatus; note?: string; adjustedDemand?: number };

export type AccountIntel = {
  id: string;
  name: string;
  csm: string;
  industry: string;
  funnel: Funnel;
  desk: number; // firmographic account-profile score (for recompute on adjust)
  score: number; // composite Global-fit
  tier: "high" | "medium" | "low";
  demand: number | null;
  confidence: "high" | "medium" | "low";
  researched: boolean;
  play: "displacement" | "greenfield" | null;
  competitors: string[];
  countries: string[];
  summary: string;
  validation?: Validation; // owner/CSM trust layer, applied after the fact
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
        desk: d.score,
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

// A flagged score is no longer trusted — it's excluded from "strong" signals and
// from the highest-leverage move, so a score the owner marked wrong never bosses
// the day around. Confirmed/adjusted stay trusted.
export function isTrusted(a: AccountIntel): boolean {
  return a.validation?.status !== "flagged";
}

// Apply the owner/CSM validation layer on top of the researched intel. "adjusted"
// overrides demand and reflows the composite (using the untouched desk score);
// "flagged"/"confirmed" annotate without changing the numbers. Re-sorts by the
// (possibly changed) score. Pure: the validation map is loaded from the DB and
// passed in.
export function applyValidations(
  intel: AccountIntel[],
  vmap: Map<string, Validation>,
): AccountIntel[] {
  const out = intel.map((a) => {
    const v = vmap.get(a.id);
    if (!v) return a;
    if (v.status === "adjusted" && v.adjustedDemand != null) {
      const demand = Math.max(0, Math.min(100, Math.round(v.adjustedDemand)));
      const c = compositeScore(a.desk, demand, a.confidence);
      const play: AccountIntel["play"] =
        demand >= DEMAND_GATE ? (a.competitors.length ? "displacement" : "greenfield") : null;
      return { ...a, demand, score: c.score, tier: c.tier, play, validation: v };
    }
    return { ...a, validation: v };
  });
  return out.sort((x, y) => y.score - x.score);
}

// A signal is "strong" only when demand clears a higher bar AND the research
// wasn't low-confidence. Below that it's "emerging" — still worth surfacing (the
// gate is 30), but it must never read as equal to a confirmed, high-demand
// account. This is what keeps the count honest when we brief Aleks.
export const STRONG_DEMAND = 40;

export function isStrongSignal(a: Pick<AccountIntel, "demand" | "confidence">): boolean {
  return a.demand != null && a.demand >= STRONG_DEMAND && a.confidence !== "low";
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

// A debt aged past this many days has blown its window (the demo-availability
// gate is 5 business days) — used for the "hot" badge and state-of-play.
export const DEBT_WINDOW_DAYS = 5;

export type Debt = {
  cardId: string;
  cardName: string;
  nodeKey: DashNodeKey;
  nodeLabel: string;
  item: string;
  index: number; // the checklist index — lets Today close it in place
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
          index: i,
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
  realDemand: number; // demand >= gate (30) — everything surfaced
  strongDemand: number; // demand >= 40 AND not low-confidence — what we lead with
  emerging: number; // realDemand that isn't strong — surfaced but hedged
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
  const strongDemand = intel.filter((a) => isStrongSignal(a) && isTrusted(a)).length;
  const emerging = realDemand - strongDemand;
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
    strongDemand,
    emerging,
    displacement,
    greenfield,
    highFit,
    mediumFit,
    hcmFunnel,
    topCountries,
  };
}

// --- Snooze ("Not now") ------------------------------------------------------
export type Snooze = { reason: string; snoozedUntil: string | null };

// A snooze is live (signal stays parked) until its snoozedUntil passes; a null
// snoozedUntil parks it until manually un-parked.
export function isParked(s: Snooze | undefined, now: number): boolean {
  if (!s) return false;
  if (s.snoozedUntil == null) return true;
  const t = Date.parse(s.snoozedUntil);
  return Number.isNaN(t) ? true : t > now;
}

export function partitionSignals(
  list: AccountIntel[],
  snoozeMap: Map<string, Snooze>,
  now: number = Date.now(),
): { active: AccountIntel[]; parked: { intel: AccountIntel; snooze: Snooze }[] } {
  const active: AccountIntel[] = [];
  const parked: { intel: AccountIntel; snooze: Snooze }[] = [];
  for (const a of list) {
    const s = snoozeMap.get(a.id);
    if (s && isParked(s, now)) parked.push({ intel: a, snooze: s });
    else active.push(a);
  }
  return { active, parked };
}

// --- Momentum & state of play ------------------------------------------------
// Nodes that first went active in the last 7 days — the honest, non-gamified
// "what moved this week" (counts progress, not clicks).
export function movedThisWeek(cards: DashCardRow[], now: number = Date.now()): number {
  const weekAgo = now - 7 * 86_400_000;
  let n = 0;
  for (const c of cards) {
    if (c.archived) continue;
    for (const key of Object.keys(c.activated) as DashNodeKey[]) {
      const iso = c.activated[key];
      if (!iso) continue;
      const t = Date.parse(iso);
      if (!Number.isNaN(t) && t >= weekAgo) n++;
    }
  }
  return n;
}

export type StateOfPlay = {
  openLoops: number; // non-archived cards with a node in flight
  debtsPastWindow: number; // debts aged past the window
  untriaged: number; // active signals not yet on the board
  moved: number; // nodes advanced this week
};

export function stateOfPlay(args: {
  cards: DashCardRow[];
  debts: Debt[];
  activeSignals: AccountIntel[];
  onBoard: Set<string>;
  now?: number;
}): StateOfPlay {
  const now = args.now ?? Date.now();
  const openLoops = args.cards.filter(
    (c) => !c.archived && DASH_NODES.some((n) => c.states[n.key] === "active"),
  ).length;
  const debtsPastWindow = args.debts.filter(
    (d) => d.ageDays != null && d.ageDays >= DEBT_WINDOW_DAYS,
  ).length;
  const untriaged = args.activeSignals.filter((a) => !args.onBoard.has(a.name)).length;
  return { openLoops, debtsPastWindow, untriaged, moved: movedThisWeek(args.cards, now) };
}

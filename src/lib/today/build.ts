// The "Today" command surface reads from two places the owner already curates:
// the Account Room (targeting intelligence — firmographics + researched global
// demand) and the Dashboard (the hand-sewn execution ledger). Nothing here
// writes. It turns those two into four bands: what the base is telling you
// (Signal in), what you've committed to before an account can move (Commitments),
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

// A commitment aged past this many days has blown its window (the demo-availability
// gate is 5 business days) — used for the "hot" badge and state-of-play.
export const COMMITMENT_WINDOW_DAYS = 5;

export type Commitment = {
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

// Band 2 — Commitments. A commitment is a mandatory item still unchecked on a node
// that's already in motion ("active"). Nodes at "todo" haven't started (nothing
// owed yet) and "done" nodes are settled — so only active nodes generate commitments:
// the recap you owe, the availability you asked a partner to confirm, the brief
// you promised. Aged by how long the node has been active, oldest first.
export function commitmentsFromCards(
  cards: DashCardRow[],
  labels: Record<string, string>,
  now: number = Date.now(),
): Commitment[] {
  const out: Commitment[] = [];
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
  // Oldest commitments first (nulls — unstamped, e.g. pre-migration — sort last).
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

// --- "This morning" composition ---------------------------------------------
// Turns the day's inputs into thoroughly-written moves, each with the exact
// thing to do beside the reasoning. Verbose by design — anything that becomes an
// outbound message is spelled out in full.

export function firstNameOf(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "there";
}

// A complete, ready-to-send message to the partner (not a one-liner) — what the
// owner copies into Slack / Teams / email. Shaped by the play.
export function partnerMessage(a: AccountIntel): string {
  const who = firstNameOf(a.csm);
  const comp = a.competitors[0];
  if (a.play === "displacement" && comp) {
    return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global, and from the research it looks like they currently run their international hiring through ${comp}. Before I take any step, I'd really value your read on the relationship: how happy do you think ${a.name} is with ${comp} right now, and do you have any sense of when that contract comes up for renewal? Renewal timing basically tells me whether it's worth opening a Global conversation soon or holding off. I completely want to move at your pace and not get out ahead of the relationship — just trying to figure out if there's an opening and, if so, roughly when. Thanks so much.`;
  }
  if (a.play === "greenfield") {
    return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global and there's a real signal they're hiring across borders, with no Employer-of-Record provider in place yet — so this could be a clean introduction rather than a switch. Before I take any step, could you help me understand the account a bit: are they hiring in countries where they don't have a legal entity, or converting contractors to employees anywhere? That's usually where the Global fit is clearest. I want to move at your pace and not get ahead of the relationship — just gauging whether there's an opening worth exploring. Thanks so much.`;
  }
  return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global and wanted your read before I do anything. Could you help me understand their cross-border footprint — where they're hiring, how they pay international workers today, and whether they lean on employees or contractors? That'll tell me whether there's a real Global opening. I want to move at your pace and not get ahead of the relationship. Thanks so much.`;
}

export type Brief = { directive: string; narrative: string };

export function outreachBrief(a: AccountIntel): Brief {
  const who = firstNameOf(a.csm);
  const comp = a.competitors[0];
  if (a.play === "displacement" && comp) {
    return {
      directive: `Open the ${a.name} conversation through ${who} — go through the partner, not the client.`,
      narrative: `${a.name} is your strongest play right now: a global-hiring demand score of ${a.demand} out of 100 at ${a.confidence} confidence. The complication is that ${a.name} already runs its international hiring through ${comp}, a direct PrismHR Global competitor — which makes this a displacement play. You're trying to win business away from an incumbent, not fill an obvious gap, and that changes how you open. Don't contact ${a.name} directly. Go to ${a.csm}, the CSM who owns the relationship, and ask two things: how satisfied ${a.name} seems with ${comp} today, and — the part that matters most — when their current contract comes up for renewal. That renewal date is the whole game: a client almost never switches providers mid-contract, so the months heading into their renewal are the only realistic window to move. The message on the right is written to gauge exactly that, without getting ahead of ${who}'s relationship.`,
    };
  }
  if (a.play === "greenfield") {
    return {
      directive: `Open the ${a.name} conversation through ${who} — go through the partner, not the client.`,
      narrative: `${a.name} scored ${a.demand} out of 100 for global-hiring demand at ${a.confidence} confidence, and it reads as greenfield — no competing Employer-of-Record provider showed up in their footprint. You'd be introducing the capability rather than displacing anyone, which is usually a cleaner conversation. You still don't approach the client cold; you go through ${a.csm}, the CSM who owns the relationship. The opening you're probing for is a compliance one: are they hiring in countries where they don't have a legal entity, or converting contractors to employees? That exposure is where Global fits. The message on the right asks ${who} exactly that, at the partner's pace.`,
    };
  }
  return {
    directive: `Open the ${a.name} conversation through ${who} — start with the partner.`,
    narrative: `${a.name} carries a global-hiring signal (demand ${a.demand} out of 100, ${a.confidence} confidence), but the shape of the opportunity isn't fully clear yet. Before anything reaches the client, go through ${a.csm} to understand their cross-border footprint — where they hire, how they pay international workers, and whether they use employees or contractors. The message on the right opens that up without getting ahead of the relationship.`,
  };
}

export function triageBrief(a: AccountIntel): Brief {
  const strength = isStrongSignal(a) ? "a solid signal" : "a real but moderate signal";
  const lowConf = a.confidence === "low" ? ", though at low confidence" : "";
  const playText =
    a.play === "displacement"
      ? `it reads as a displacement play — they appear to already use ${a.competitors[0] ?? "a competitor EOR"}, so you'd be winning business away from an incumbent`
      : a.play === "greenfield"
        ? "it reads as greenfield — no competing Employer-of-Record provider showed up, so you'd be introducing the capability rather than displacing anyone"
        : "the play isn't classified yet";
  return {
    directive: `Make a call on ${a.name} — seed it to the board or park it.`,
    narrative: `Research scored ${a.name} at ${a.demand} out of 100 for global-hiring demand (${strength}${lowConf}), and ${playText}. It sits in ${a.csm}'s book and isn't on your board yet. This is a decision, not a task: seed it onto the board — which creates a card pre-loaded with the research so you can start working it — or park it with a written reason if the timing or fit isn't right. It stays a loose end until you decide.`,
  };
}

export type CardStep = {
  cardId: string;
  cardName: string;
  nodeKey: DashNodeKey;
  nodeLabel: string;
  item: string;
  index: number;
  ageDays: number | null;
};

// The single next step to close on a card: the first unchecked item on its first
// in-flight node. Null when nothing's active.
export function cardNextStep(
  card: DashCardRow,
  labels: Record<string, string>,
  now: number = Date.now(),
): CardStep | null {
  for (const node of DASH_NODES) {
    if (card.states[node.key] !== "active") continue;
    const i = node.checklist.findIndex((_, idx) => !card.checks[node.key]?.[idx]);
    if (i < 0) continue;
    return {
      cardId: card.id,
      cardName: card.name,
      nodeKey: node.key,
      nodeLabel: labels[node.key] ?? node.label,
      item: node.checklist[i],
      index: i,
      ageDays: daysSince(card.activated?.[node.key] ?? "", now),
    };
  }
  return null;
}

export function commitmentBrief(step: CardStep): Brief {
  const overdue = step.ageDays != null && step.ageDays >= COMMITMENT_WINDOW_DAYS;
  const age =
    step.ageDays == null
      ? ""
      : overdue
        ? ` It's been open ${step.ageDays} days — past its window, so it's the first thing to clear.`
        : ` It's been open ${step.ageDays} day${step.ageDays === 1 ? "" : "s"}.`;
  return {
    directive: `Advance ${step.cardName} — close the step you owe in ${step.nodeLabel}.`,
    narrative: `${step.cardName} is on your board in the ${step.nodeLabel} stage, and it's held up by one step you owe: “${step.item}”.${age} Until it's checked, the opportunity can't move to the next stage and the momentum quietly stalls. Open it and either do the step and check it off, or record exactly what you're waiting on so it's tracked, not silently slipping.`,
  };
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
  commitmentsPastWindow: number; // commitments aged past the window
  untriaged: number; // active signals not yet on the board
  moved: number; // nodes advanced this week
};

export function stateOfPlay(args: {
  cards: DashCardRow[];
  commitments: Commitment[];
  activeSignals: AccountIntel[];
  onBoard: Set<string>;
  now?: number;
}): StateOfPlay {
  const now = args.now ?? Date.now();
  const openLoops = args.cards.filter(
    (c) => !c.archived && DASH_NODES.some((n) => c.states[n.key] === "active"),
  ).length;
  const commitmentsPastWindow = args.commitments.filter(
    (d) => d.ageDays != null && d.ageDays >= COMMITMENT_WINDOW_DAYS,
  ).length;
  const untriaged = args.activeSignals.filter((a) => !args.onBoard.has(a.name)).length;
  return { openLoops, commitmentsPastWindow, untriaged, moved: movedThisWeek(args.cards, now) };
}

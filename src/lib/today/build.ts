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
import {
  analyzePlay,
  DEMAND_GATE,
  extractCountries,
  getDemand,
} from "@/lib/book/research";
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

// Confirmed PrismHR HCM customers — the roster from the 7/13 Salesforce export
// ("PrismHR HCM = Yes"). Explicit ids beat inference: several are owned by
// PEO-side CSMs (Whitney carries the inactive Cody Jensen's HCM book), so
// csm/industry alone can't route them. Former customers (360 Business
// Solutions, Payroll Medics, Talonique) are deliberately absent.
export const HCM_CLIENT_IDS = new Set<string>([
  "0013k00003Ev0KDAAZ", // Accent Employer Solutions
  "0013k00003Ev0KSAAZ", // Administrative Benefits
  "0013k00003Ev0MZAAZ", // Denali HR Solutions
  "0013k00003Ev0NbAAJ", // DMC Outsourcing
  "001Do00000NEnWMIA1", // Easeworks
  "001F000000w38JSIAY", // EmployShare
  "001Pb00001EUHfbIAH", // Hiring Quick
  "0013k00003Ev0OtAAJ", // HR Pulse / Bay Staffing
  "INNOVATIVEPAY0001", // Innovative Payroll Processing
  "001Pb00001tSd9VIAS", // July Business Services
  "001Pb00001As43aIAB", // Leem Pro
  "MERIDIANPAY000001", // Meridian Payroll Group
  "PAYROLLSOL0000001", // Payroll Solutions, Inc.
  "0013k00002roPPFAA2", // Puntual Payroll
  "0013k00003Ev0PDAAZ", // Simplified Employer Solutions
  "001Pb00002Cbu08IAB", // TruePath HCM
  "001Pb00001SFhBBIA1", // VeroHCM
  "WALCORPAYMASTER01", // WALCOR / Paymaster Pro (HCM stage: cancelled)
]);

export type ValidationStatus = "confirmed" | "flagged" | "adjusted";
export type Validation = {
  status: ValidationStatus;
  note?: string;
  adjustedDemand?: number;
};

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
        funnel: HCM_CLIENT_IDS.has(p.id) ? "hcm" : funnelOf(p.csm, p.industry),
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
        demand >= DEMAND_GATE
          ? a.competitors.length
            ? "displacement"
            : "greenfield"
          : null;
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
    return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global. From the research, they already run their domestic PEO on PrismHR but handle their international hiring through ${comp} — so the opening here isn't a fresh sale or a win-back, it's consolidation: bringing that global/EOR layer onto the platform they already use, instead of running it separately through ${comp}. Before I take any step, I'd really value your read on the ${comp} relationship: how happy do you think ${a.name} is with it right now, and do you have any sense of when that contract comes up for renewal? Renewal timing basically tells me whether it's worth opening a Global conversation soon or holding off. I completely want to move at your pace and not get out ahead of the relationship — just trying to figure out if there's an opening and, if so, roughly when. Thanks so much.`;
  }
  if (a.play === "greenfield") {
    return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global and there's a real signal they're hiring across borders, with no Employer-of-Record provider in place yet — so this could be a clean introduction rather than a switch. Before I take any step, could you help me understand the account a bit: are they hiring in countries where they don't have a legal entity, or converting contractors to employees anywhere? That's usually where the Global fit is clearest. I want to move at your pace and not get ahead of the relationship — just gauging whether there's an opening worth exploring. Thanks so much.`;
  }
  return `Hi ${who} — quick one on ${a.name}. I've been looking at them for PrismHR Global and wanted your read before I do anything. Could you help me understand their cross-border footprint — where they're hiring, how they pay international workers today, and whether they lean on employees or contractors? That'll tell me whether there's a real Global opening. I want to move at your pace and not get ahead of the relationship. Thanks so much.`;
}

// Granular, spoon-fed guidance for a task. do = the one standout action; how =
// precise steps; say = the exact message to send (editable); consider = the
// caveat / relationship note. Rendered as loud, labeled, color-coded sections.
export type Guidance = {
  do: string;
  how: string[];
  say?: string;
  consider?: string;
};

export function outreachGuidance(a: AccountIntel): Guidance {
  const who = firstNameOf(a.csm);
  const comp = a.competitors[0];
  if (a.play === "displacement" && comp) {
    return {
      do: `Message ${a.csm} about ${a.name} — and do NOT contact ${a.name} directly. This is a partner-first consolidation play: they already run PrismHR domestically, and the aim is to bring their global layer onto the same platform.`,
      how: [
        `Check Salesforce on ${a.name} FIRST — recent activity, open cases, notes, and any contract/renewal dates. Never message ${who} without the current picture in front of you.`,
        `Open Slack, Teams, or email to ${a.csm} — the CSM who owns the ${a.name} relationship.`,
        `Paste the message below (edit anything that doesn't sound like you), then send it.`,
        `The one thing you must find out: when ${a.name}'s ${comp} contract renews. That date is the realistic window to move their global/EOR layer onto PrismHR.`,
        `Do not reach out to anyone at ${a.name} until ${who} clears the path.`,
        `When you've sent it, log the outreach in Salesforce (activity + note) so the record stays current, then hit "Mark sent ✓" below.`,
      ],
      say: partnerMessage(a),
      consider: `${a.name} already runs their domestic PEO on PrismHR but uses ${comp} for global — consolidation onto the platform they already have (demand ${a.demand}/100, ${a.confidence} confidence). Pace with ${who}, never ahead of the partner — but don't confuse patience with silence: every quiet week is renewal runway ${comp} keeps for free, and displacement windows close exactly once.`,
    };
  }
  if (a.play === "greenfield") {
    return {
      do: `Message ${a.csm} about ${a.name} to open a Global conversation — go through the partner, not the client.`,
      how: [
        `Check Salesforce on ${a.name} FIRST — recent activity, notes, open cases. Don't message ${who} without knowing the account's current state.`,
        `Open Slack, Teams, or email to ${a.csm} — the CSM who owns ${a.name}.`,
        `Paste the message below (edit to taste), then send it.`,
        `You're probing one thing: are they hiring where they have no legal entity, or converting contractors? That's the Global opening.`,
        `Let ${who} judge whether ${a.name} is ready before anything reaches the client.`,
        `When it's sent, log it in Salesforce (activity + note), then hit "Mark sent ✓" below.`,
      ],
      say: partnerMessage(a),
      consider: `No incumbent EOR was found (demand ${a.demand}/100, ${a.confidence} confidence) — a clean introduction, which means speed is the entire advantage. Greenfields don't stay green: the first vendor to frame the problem usually writes the contract. Let ${who} set the pace, but be the reason a pace exists.`,
    };
  }
  return {
    do: `Message ${a.csm} about ${a.name} to gauge whether there's a Global opening — start with the partner.`,
    how: [
      `Check Salesforce on ${a.name} FIRST — recent activity, notes, open cases — so you're not gauging from stale data.`,
      `Open Slack, Teams, or email to ${a.csm}.`,
      `Paste the message below (edit to taste), then send it.`,
      `Ask about their cross-border footprint — where they hire, how they pay international workers, employees vs contractors.`,
      `When it's sent, log it in Salesforce (activity + note), then hit "Mark sent ✓" below.`,
    ],
    say: partnerMessage(a),
    consider: `The shape isn't fully clear yet (demand ${a.demand}/100, ${a.confidence} confidence) — you're gauging, not pitching. But gauge with a date on it: a probe with no follow-up is a no you never got to hear, and it costs you the account without ever telling you.`,
  };
}

export function triageGuidance(a: AccountIntel): Guidance {
  const playLine =
    a.play === "displacement"
      ? `They already run PrismHR domestically but use ${a.competitors[0] ?? "a competitor EOR"} for global, so working it is a consolidation play — bring their global layer onto the platform they already have.`
      : a.play === "greenfield"
        ? "No incumbent EOR was found, so it'd be a clean introduction."
        : "No play is flagged yet — this is a gauge-and-see.";
  return {
    do: `Decide right now what happens to ${a.name}: seed it to your dashboard, or park it. Don't leave it undecided.`,
    how: [
      `Check Salesforce on ${a.name} first — current status, notes, open activity — so you decide on the live picture, not just the research.`,
      `Read the fit: demand ${a.demand}/100, ${a.confidence} confidence, ${a.play ?? "no play flagged yet"}. ${playLine}`,
      `If it's worth working now → hit "Seed to dashboard". It creates a card with all the research attached so you can start.`,
      `If not now → hit "Park", type one line on why, and it resurfaces later (it's never lost).`,
      `Either choice clears it from this list. That's the whole task.`,
    ],
    consider: `${a.name} sits in ${a.csm}'s book. Seeded means worked; parked means an honest no-for-now. Undecided is the only answer that costs you: a signal left floating decays to zero while you look at it, and you paid full price to surface it.`,
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

export function commitmentGuidance(step: CardStep): Guidance {
  const overdue = step.ageDays != null && step.ageDays >= COMMITMENT_WINDOW_DAYS;
  const age =
    step.ageDays == null
      ? ""
      : ` It's been open ${step.ageDays} day${step.ageDays === 1 ? "" : "s"} in ${step.nodeLabel}.`;
  return {
    do: `Close the step you owe on ${step.cardName}: “${step.item}”.${age} Do the step; if you're waiting on someone, write down exactly what (and who) you're waiting for so it's tracked rather than silently slipping; reflect it in Salesforce with a note and any field or stage update; then check it off on the dashboard so the deal advances.`,
    how: [
      `Open ${step.cardName} on the dashboard — it's in the ${step.nodeLabel} stage.`,
      `Do the step: ${step.item}.`,
      `If you're waiting on someone, note exactly what you're waiting for so it's tracked, not silently slipping.`,
      `Reflect it in Salesforce — a note plus any field/stage update — so the record matches the dashboard.`,
      `When it's done, hit "Mark done ✓" — the dashboard advances to the next step.`,
    ],
    consider:
      step.ageDays == null
        ? "This just started — close it before it needs managing."
        : overdue
          ? `${step.ageDays} days open; the ${COMMITMENT_WINDOW_DAYS}-day window is blown. Steps don't age into done — they age into dead. Either this closes today, or you name the blocker out loud and chase THAT. Anything else is watching a live deal rot on your own dashboard.`
          : `Open ${step.ageDays} day${step.ageDays === 1 ? "" : "s"} — inside the window, but runway burns silently. Put a finish date on it now, while it's still cheap; the version of you at day ${COMMITMENT_WINDOW_DAYS} will not thank the one reading this.`,
  };
}

// --- Step holds ---------------------------------------------------------------
// Deliberate pauses on dashboard steps — leadership said "don't press." Keyed by
// card name (curated in code, like ROUNDUP_BULLETS). A held card's step leaves
// the numbered moves, renders as a dim ⏸ row, and carries its own guidance: the
// move that's still yours is owning the re-check date, not pushing the client.
export type StepHold = { reason: string; recheck: string; consider: string };

export const STEP_HOLDS: Record<string, StepHold> = {
  "Advocate Pay — SubcontractorHub": {
    reason:
      "Held per Aleks (7/13): our contracts are being finalized on our side — don't press Bryce on timeline.",
    recheck: "date the internal contract re-check (Thu)",
    consider:
      "A hold without a date is how deals die quietly. Every day this sits, the Bulgaria conversions drift toward the next payroll quarter and someone else gets a quiet look at a roster you already priced. Own the clock: contract re-check on your calendar, or accept that you're choosing to let a signed-adjacent deal age out.",
  },
};

export function holdGuidance(step: CardStep, hold: StepHold): Guidance {
  return {
    do: `${step.cardName} — “${step.item}” is on hold. ${hold.reason} The move that's still yours: ${hold.recheck}, and the day the hold clears, close the step, log the exchange in Salesforce, and check it off on the dashboard.`,
    how: [
      `Confirm the hold still stands (it was set deliberately — check before pressing).`,
      `Put the re-check on your calendar so the hold has an owner and a date.`,
      `The day it clears: do the step, log it in Salesforce, check it off on the dashboard.`,
    ],
    consider: hold.consider,
  };
}

// --- Completion keys (per-day / per-week) -----------------------------------
// A done-mark's key encodes the task AND its period, so it resets on a new
// day/week. Default-param now keeps the clock read out of the React render path.
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dayStamp(now: number = Date.now()): string {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// ISO-8601 year + week (e.g. "2026-W28").
export function weekStamp(now: number = Date.now()): string {
  const d = new Date(now);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week
  const thursday = target.getTime();
  const year = new Date(thursday).getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1)).getTime();
  const week = 1 + Math.round((thursday - yearStart) / 604_800_000);
  return `${year}-W${pad2(week)}`;
}

export function morningDoneKey(moveKey: string, now: number = Date.now()): string {
  return `morning:${dayStamp(now)}:${moveKey}`;
}

// The "sent" mark for a partner's outreach roundup. A stable per-partner key so
// the contacted state persists (this is a standing tracker you work through
// once, not a weekly ritual that resets every Monday).
export function partnerOutreachKey(partner: string): string {
  return `partner-outreach:${partner}`;
}

// --- Weekly partner kickoff (Monday ritual) ---------------------------------
// At the start of the week, tee up at least N interactions per partner: their
// top Global-fit accounts, plus a ready-to-send opener that names them. Every
// partner is included — the point is to arm the whole roster, not just the two
// who already have hot signals; a book with no researched play still gets its
// best-fit accounts as conversation starters (that's the drum-up motion).

// True on Sunday/Monday (UTC) — the window to plan the week. A default-param now
// keeps the impure clock read out of the React render path.
export function isWeekKickoff(now: number = Date.now()): boolean {
  const day = new Date(now).getUTCDay();
  return day === 0 || day === 1; // Sun or Mon
}

// Freshness of an account chip on a partner's outreach card. The clock only
// starts once an official interaction happens (a note saved via the chip):
// green under 24h, yellow 24–48h, red past 48h. A chip that was never worked
// stays neutral — no color at all until an interaction triggers the timer.
export type ChipTone = "none" | "fresh" | "stale" | "cold";

export function chipTone(
  lastTouchedAt: string | null,
  now: number = Date.now(),
): ChipTone {
  if (!lastTouchedAt) return "none";
  const t = Date.parse(lastTouchedAt);
  if (Number.isNaN(t)) return "none";
  const hours = (now - t) / 3_600_000;
  if (hours < 24) return "fresh";
  if (hours < 48) return "stale";
  return "cold";
}

export type PartnerKickoff = { partner: string; role: string; accounts: AccountIntel[] };

// Editorial pins: accounts a partner should always have teed up on their
// roundup regardless of auto-rank — an owner override for a relationship reason
// the Global-fit score can't see. Keyed by CSM name → account ids. Pins EXTEND
// the card past the top-N (a 6th slot) rather than displacing an auto-pick, so
// pinning never hides an account that earned its place on merit.
export const ROUNDUP_PINS: Record<string, string[]> = {
  // My HR Pros (fka Southern Personnel Management) — pinned by owner request —
  // and ESC, whose 7/13 inbound (Global Payroll demo for interested ESC
  // clients) is a live thread on Lesha's card.
  "Lesha Cyphers": ["001F000000w389qIAA", "MYESC000000000001"],
  // XCEL HR — low web-signal score, but Anika opened a live door (7/13): they're
  // in new-product discussions post-LIVE and she can bring us onto the next call
  // with Bill. Relationship-led motion, so it stays on her card. Infiniti HR —
  // Jennifer Hardesty's 7/14 inbound (via Anika's LMS thread) asking about "the
  // global payroll solution Prism integrates with" — a live G-P displacement
  // opening, so it stays teed up regardless of rank.
  "Anika Steenstra": ["001F000000w38GlIAI", "001F000000w38OIIAY"],
};

// Hand-written roundup bullets for accounts where the generic play framing would
// be wrong — e.g. a thread that's already live. Keyed by account id; used by
// partnerWeekMessage in place of the displacement/greenfield/gauge template.
export const ROUNDUP_BULLETS: Record<string, string> = {
  // Simploy — Chassie's inbound after PrismHR LIVE; the conversation is already
  // in motion, so the bullet reads as shared status, not a request for a read.
  "001F000000w38BOIAY":
    "Already in motion (thanks for the intro!): Chassie reached out after PrismHR LIVE — " +
    "about two months into evaluating potential partners for global workforce expansion (EOR, " +
    "contractor management, global payroll), with the partner and approach to be finalized by " +
    "8/6. Best part: she told us an integrated option through PrismHR “would be ideal,” " +
    "assuming it's competitive on price and functionality — we're the preferred path if we're " +
    "competitive. Her discovery " +
    "answers (7/9): two internal contractors in India today, plus at least one client group " +
    "with an India contractor on another provider — small counts, but the strategic play is " +
    "dual: internal international expansion AND offering global workforce solutions to their " +
    "clients as an expanded service. I sent the pricing overview and the newly released Global " +
    "materials on 7/13 and proposed a call for Mon or Tue next week, 1–3p. Nothing needed from " +
    "you right now — keeping it on our shared radar (and she's still waiting to hear about " +
    "shipping for the glasses she won at the conference).",
  // Advocate Pay — the SubcontractorHub EOR deal is live (pricing + contracts
  // out); the bullet reads as shared status to Eric, not a request for a read.
  ADVOCATEPAY000001:
    "Already in motion: the SubcontractorHub EOR deal through Advocate Pay is in pricing + " +
    "contracts stage. Their international roster is in hand (the Bulgaria “Frontier” group is " +
    "the primary W-2/EOR conversion; the rest stay 1099), the proposal is EOR CORE with the " +
    "deposit waived, pricing went to Bryce 7/8, and the final client-shareable contracts went " +
    "out 7/10 with the IP-protection walkthrough Renee asked for. Shane's out until 7/20 so " +
    "I'm running point. Nothing needed from you — will flag if it stalls.",
  // ESC — Hatton's inbound via Lesha; already in motion, so the bullet reads
  // as shared status with a thank-you, not a request for a read.
  MYESC000000000001:
    "Great momentum here (thanks again for the intro!): had the intro call with Hatton 7/15, " +
    "and this is bigger than the first prospect (a standalone ~300-employee company operating " +
    "in Canada that wants ESC running its Canadian payroll — pure Global Payroll). ESC sits on the border and turns down 4–5 " +
    "Canadian-adjacent companies a year because they can't run Canadian payroll — Global " +
    "Payroll makes those a yes, so this is a standing channel motion, not a one-off. Next: " +
    "Canada pricing is being quoted internally, then the ESC team demo. Nothing needed from " +
    "you — will keep you looped.",
  // Infiniti HR — Jennifer Hardesty's 7/14 ask on Anika's LMS thread; already
  // in motion, so the bullet reads as shared status with a thank-you.
  "001F000000w38OIIAY":
    "Already on it (thanks for the loop-in!): Jennifer asked about “the global payroll " +
    "solution Prism integrates with” — I've followed up to clarify it's not an integration, " +
    "it's our own PrismHR Global family built right into their environment (that's our whole " +
    "opening: they went to G-P back when we didn't have a global product), and asked the " +
    "scoping questions — their own team vs. their clients, employees vs contractors, which " +
    "countries, and whether entities exist. Happy to join your monthly call with them, or " +
    "sooner if Jennifer wants — nothing needed from you beyond the intro you already made.",
  // XCEL HR — Anika's 7/13 read opened a live door; the bullet reads as taking
  // her up on the offer, not asking for a cold read.
  "001F000000w38GlIAI":
    "Taking you up on your offer here! You mentioned Xcel HR has been discussing a few new " +
    "products since LIVE and that you could include me on the next call — I'd love that. And " +
    "you're closest to it: with everything they're implementing with Prism right now, you lead " +
    "on the timing — whenever a call makes sense on your read, I'll fit in. No pressure on " +
    "their Global aptitude going in; a quick education-first segment on what Global adds (and " +
    "a read from Bill) is all I'm after.",
};

export function partnerKickoff(
  intel: AccountIntel[],
  parkedIds: Set<string>,
  perPartner = 5,
): PartnerKickoff[] {
  const byPartner = new Map<string, AccountIntel[]>();
  for (const a of intel) {
    if (parkedIds.has(a.id)) continue;
    const p = a.csm?.trim();
    if (!p || p === "Unassigned") continue;
    const list = byPartner.get(p);
    if (list) list.push(a);
    else byPartner.set(p, [a]);
  }
  const out: PartnerKickoff[] = [];
  for (const [partner, accts] of byPartner) {
    const pinnedIds = ROUNDUP_PINS[partner] ?? [];
    const pinned = pinnedIds
      .map((id) => accts.find((a) => a.id === id))
      .filter((a): a is AccountIntel => Boolean(a));
    const pinnedSet = new Set(pinned.map((a) => a.id));
    const ranked = [...accts]
      .filter((a) => !pinnedSet.has(a.id))
      .sort((x, y) => y.score - x.score);
    // The top-N earn their slots on merit; pins EXTEND the card beyond N (never
    // displace). Present by score so a low-scoring pin honestly sits last.
    const top = [...pinned, ...ranked.slice(0, perPartner)].sort(
      (x, y) => y.score - x.score,
    );
    out.push({ partner, role: partnerRole(partner), accounts: top });
  }
  // Partners with the strongest lead account first.
  return out.sort((a, b) => (b.accounts[0]?.score ?? 0) - (a.accounts[0]?.score ?? 0));
}

// Play-shaped bullet templates, several distinct phrasings per play — because a
// roundup that repeats the same paragraph four times reads like a mail merge.
// Variant 0 is the canonical wording; the rest say the same thing differently,
// and the rotation below guarantees no two bullets in one message ever match.
// Every variant is conversational and ENDS ON A QUESTION — the bullet's job is
// to make replying easy, not to lecture.
const DISPLACEMENT_VARIANTS: ((competitor: string) => string)[] = [
  (c) =>
    `here's one that nags at me: they already run their domestic PEO on PrismHR, but their global hiring goes through ${c} — a layer that feels like it wants to come home. How's their relationship with ${c} these days, and do you happen to know when that contract comes up for renewal?`,
  (c) =>
    `their global work sits with ${c} while everything domestic already lives on PrismHR. If there's any friction over there — service, price, integration headaches — that's our opening. Heard anything lately?`,
  (c) =>
    `${c} holds their global/EOR business even though we're already their platform for everything else. No urgency, but — who owns that vendor relationship on their side, and would they take a call?`,
  (c) =>
    `they're already hiring globally (through ${c}), so it's not an "if" question — it's whether they'd rather run it where the rest of their operation lives. Worth me poking at this, or is that relationship rock solid?`,
];

const GREENFIELD_VARIANTS: string[] = [
  `there's an early signal they're hiring across borders with no Employer-of-Record provider in place yet — which makes this a clean introduction, not a switch. Do you know where they're hiring abroad, or whether contractors are part of the picture?`,
  `it looks like cross-border hiring is starting there and nobody's holding the global-payroll seat yet. Those windows close fast once someone signs a Deel or a G-P — who should I be talking to before that happens?`,
  `the research shows international activity with no provider attached to it — my favorite kind of opening: educate first, nothing to unseat. Any idea who's driving their international hiring?`,
  `they seem to be going international without a named global-employment partner. Even a rough read from you helps here — is this real enough that I should dig in?`,
];

const GAUGE_VARIANTS: string[] = [
  `no specific global-hiring signal has surfaced yet, but the profile fits the kind of company that runs into cross-border needs. Quick gut check: do they hire or pay anyone outside the US?`,
  `nothing in the research points international on this one — it's purely a knowledge check. Has anyone in their client base ever asked about paying people overseas?`,
  `quiet on the global front from everything I can see, so I'd rather borrow your context than guess. Any chatter about overseas contractors or clients expanding abroad?`,
  `no cross-border signal yet, but they're the type where one client with two contractors abroad turns into a real conversation. Your call — worth it, or skip it?`,
  `this one made the list on shape, not signal — companies like them tend to bump into international questions sooner or later. Have you ever heard even a whisper of it from them?`,
  `no research hit on global activity, so treat this as a standing question rather than a pitch. Next time you're with them, could you ask whether any of their clients have people overseas?`,
];

// One roundup bullet for an account — the hand-written override when the thread
// is already live, otherwise the play-shaped template. `variant` rotates the
// phrasing so a message with several same-play accounts never repeats itself.
// Exported so the client composer can rebuild from a checked subset.
export function roundupBullet(a: AccountIntel, variant = 0): string {
  const custom = ROUNDUP_BULLETS[a.id];
  if (custom) return `• ${a.name} — ${custom}`;
  const why =
    a.play === "displacement"
      ? DISPLACEMENT_VARIANTS[variant % DISPLACEMENT_VARIANTS.length](
          a.competitors[0] ?? "a competitor Employer-of-Record provider",
        )
      : a.play === "greenfield"
        ? GREENFIELD_VARIANTS[variant % GREENFIELD_VARIANTS.length]
        : GAUGE_VARIANTS[variant % GAUGE_VARIANTS.length];
  return `• ${a.name} — ${why}`;
}

// Bullets for a whole roundup, rotating the phrasing per play so no two lines
// in one message repeat — custom (hand-written) bullets don't consume a turn.
export function roundupBullets(accounts: AccountIntel[]): string[] {
  const seen = new Map<string, number>();
  return accounts.map((a) => {
    if (ROUNDUP_BULLETS[a.id]) return roundupBullet(a);
    const key = a.play ?? "gauge";
    const v = seen.get(key) ?? 0;
    seen.set(key, v + 1);
    return roundupBullet(a, v);
  });
}

// The evergreen opener/closer that frame the bullets. Same export rationale as
// roundupBullet — the composer stitches opener + checked bullets + closer.
export function roundupFrame(partner: string): { opener: string; closer: string } {
  const who = firstNameOf(partner);
  return {
    opener:
      `Hi ${who} — as I work through my set of the PrismHR Global leads assigned to me, I pulled a ` +
      `few of your accounts I'd love your read on for global-hiring potential:`,
    closer:
      `None of these are urgent, and I don't want to get ahead of any of your relationships — I'm ` +
      `really just trying to find where there might be a global opening worth a conversation.\n\n` +
      `A quick “yes / no / not yet” on each would help me prioritize. Thanks so much!\n\n` +
      `Looking forward to winning some business together!`,
  };
}

// A ready-to-send opener that names the partner's teed-up accounts — one message
// that opens several conversations. Thorough and relationship-safe by design.
export function partnerWeekMessage(partner: string, accounts: AccountIntel[]): string {
  const { opener, closer } = roundupFrame(partner);
  const bullets = roundupBullets(accounts);
  return bullets.length
    ? `${opener}\n\n${bullets.join("\n")}\n\n${closer}`
    : `${opener}\n\n${closer}`;
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
  const realDemand = intel.filter(
    (a) => a.demand != null && a.demand >= DEMAND_GATE,
  ).length;
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

// --- Narrative → action ------------------------------------------------------
// Band 4 isn't a readout you admire — it's raw material for two moves: the line
// you carry into the Aleks 1:1, and arming the partners. Each is spelled out to
// the same granularity as the morning moves: what to do, step by step, and the
// exact words to say (editable before you use them).

// The line up to Aleks. `convert` is the single account you're actively working
// (the highest-leverage move) — naming a specific deal in motion is what makes
// the story land. Null when nothing's teed up yet.
export function aleksLineGuidance(
  nar: Narrative,
  convert: AccountIntel | null,
): Guidance {
  const one = convert
    ? `${convert.name}${convert.play ? ` (the ${convert.play})` : ""}`
    : "the one account I'm working hardest right now";
  const say =
    `Here's where the base actually is on Global:\n\n` +
    `• Researched: ${nar.researched} of ${nar.total} accounts\n` +
    `• Strong global-hiring signal: ${nar.strongDemand}\n` +
    (nar.emerging > 0
      ? `• Emerging (lower demand or confidence — worth a partner conversation, not a forecast): ${nar.emerging}\n`
      : "") +
    `• Split: ${nar.displacement} displacement / ${nar.greenfield} greenfield\n` +
    `• Converting this week: ${one}\n\n` +
    `I'm not chasing volume — the motion is precision through the CSMs and Eric. What I need from ` +
    `you: [air cover / an intro / a specific marketing asset] — I'll be precise on that in the meeting.`;
  return {
    do:
      `Lock the one line you carry into your 1:1 with Aleks` +
      (convert
        ? ` — built around ${convert.name}, the account you're converting this week`
        : "") +
      `. Honest headline, one real deal, one concrete ask.`,
    how: [
      `Read the five numbers above — every one is derived from your own account research, not a guess. That's your evidence, and it's what lets you be honest without sounding thin.`,
      `Lead with the honest headline: ${nar.strongDemand} strong${nar.emerging > 0 ? `, ${nar.emerging} emerging` : ""}. Do not round up — a hedged number you can defend beats a big one you can't, especially in a first-ever 1:1.`,
      `Name the one account you're converting this week${convert ? ` — right now that's ${convert.name}` : ""}. A specific deal in motion turns "there's potential" into "this is happening."`,
      `End with a single concrete ask — air cover, an intro, or a marketing asset. Never walk into the 1:1 without one; that's how you convert a status update into support.`,
      `Paste the script below into your 1:1 notes and edit it into your own voice before Monday.`,
    ],
    say,
    consider: `Aleks carries this line upward to her leadership, so it has to survive scrutiny. Every figure here traces back to research you can point to — keep it exactly that honest and it holds under any question.`,
  };
}

// Arm the partners — the enablement move. At startup stage the constraint isn't
// leads, it's whether Eric and the CSMs are equipped to talk Global at all.
export function armPartnersGuidance(nar: Narrative): Guidance {
  const conversations = nar.strongDemand + nar.emerging;
  return {
    do: `Arm Eric and the CSMs to be dangerous on Global — be loud, to Aleks and marketing, about what you have, what you're missing, and what you need. Nothing sells through a partner you haven't equipped.`,
    how: [
      `Write down what you can already brief a partner with today: your Account Room research on their accounts, the displacement/greenfield plays, and the per-account openers Today generates for you.`,
      `Name the gaps out loud — the contractor-conversion one-pager, country-coverage sheets, packaged pricing, whatever's missing. Log each one as a voice-of-the-base note below so it reaches marketing, not just your memory.`,
      `Decide who you arm first: Eric on the HCM enterprise side, then the CSMs whose books carry the strongest signals. Sequence by where the demand already is.`,
      `Turn every gap into a specific, named ask for Aleks or marketing — "I need X to arm Y for account Z" — so it's actionable, not a complaint.`,
    ],
    say:
      `Quick enablement read for the Global push.\n\n` +
      `What I already have to make Eric and the CSMs effective:\n` +
      `• The Account Room — my researched targeting on every account in the base\n` +
      `• The displacement and greenfield plays for each researched account\n` +
      `• Ready-to-send, per-account partner openers\n\n` +
      `What I'm still missing and need help sourcing:\n` +
      `• A contractor-conversion one-pager (the misclassification-risk story)\n` +
      `• Country-coverage sheets so partners can answer "can you hire in X?"\n` +
      `• Packaged pricing partners can quote without coming back to me\n\n` +
      `If we close those gaps, roughly ${conversations} accounts across the base become real partner ` +
      `conversations instead of me improvising. Can we prioritize the single biggest gap this week?`,
    consider: `At startup stage the constraint isn't leads, it's enablement — and every week a gap goes unnamed, your partners sell around Global instead of selling it. A named gap with a date gets fixed; an ambient complaint gets sympathy. One of those multiplies across every partner and every account you'll ever touch.`,
  };
}

// The "if there's time" habit: capture a pattern before it evaporates. No account
// — it points at the capture box below and the Aleks 1:1 it feeds.
export function voiceOfBaseGuidance(): Guidance {
  return {
    do: `Log one voice-of-the-base note if a pattern showed up across the base today. It's the raw material for your Aleks 1:1 — and it's gone by tomorrow if you don't write it down now.`,
    how: [
      `Think back over today's touches: did the same ask, objection, or missing-tool come up on more than one account?`,
      `Scroll to "Voice of the base & enablement gaps" below.`,
      `Pick the kind (gap / signal / ask), write one plain sentence, and log it.`,
      `That's the whole task — it accrues into the narrative above on its own.`,
    ],
    say: `Pattern I'm seeing: [e.g. 3rd account this month asking about contractor conversion] — we need [a one-pager / a country sheet / a pricing answer] to arm partners on it.`,
    consider: `You will not remember this in the 1:1 — nobody does. An unlogged signal is field intel you paid for and then chose to forget; it's also exactly the ammunition Aleks needs to fight for resources upstairs. Two lines now, or it never happened.`,
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
  return {
    openLoops,
    commitmentsPastWindow,
    untriaged,
    moved: movedThisWeek(args.cards, now),
  };
}

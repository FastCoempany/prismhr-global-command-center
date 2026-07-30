// The Groundwork queue — the rail's brain. A pure weighted rule engine in the
// morning-brief pattern: each rule reads one kind of evidence the rest of the
// app already writes, emits a candidate row, and the strongest evidence per
// account wins. Time bands come from the KIND of move a rule composes (a send,
// a person touch, a session), never from a separate scheduler; the clock only
// decides which band is "now". Build spec: docs/plans/groundwork-build-spec.md.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { getDemand, researchGeneratedAt, DEMAND_GATE } from "@/lib/book/research";
import { proximityRank } from "./proximity";
import { intentFor, ridingLaneDate, type IntentSignal } from "./signals";
import { USER_TZ } from "@/lib/tz";

export type Band = "now" | "eleven" | "two";

export type QueueRuleId =
  | "decision-window"
  | "reply-owed"
  | "meeting-prep"
  | "intent-warm"
  | "riding-lane"
  | "roundup-slot"
  | "stale-above-gate"
  | "stakeholder-gap"
  | "never-touched-incumbent";

export type QueueItem = {
  accountId: string;
  name: string;
  ruleId: QueueRuleId;
  weight: number;
  band: Band;
  situation: string; // the row's plain-language line (§3 voice)
  owed: string; // the mono column — the composed thing's readiness label
  intent: IntentSignal | null;
};

export const QUEUE_CAP = 6;

type NoteLike = { body: string; source: string; createdAt: string };
type TouchLike = {
  subjectKey: string;
  contactedAt: string;
  followUpAt: string;
  status: string;
};
type TodoLike = { accountId?: string | null; remindAt?: string | null };

export type QueueInput = {
  accounts: Peo[];
  intelById: Map<string, DealIntel>; // present only for accounts with a corpus
  notesById: Map<string, NoteLike[]>; // newest first, real accounts only
  touches: TouchLike[];
  todos: TodoLike[];
  contactCountById: (id: string) => number;
  now: Date;
};

const DAY = 86_400_000;

const daysUntil = (iso: string, now: Date) =>
  (Date.parse(`${iso}T12:00:00Z`) - now.getTime()) / DAY;

const monthDay = (iso: string) => {
  const t = Date.parse(`${iso}T12:00:00Z`);
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

// Which band the CLOCK is in right now (Chicago). 9:00–11:00 sends ·
// 11:00–2:00 people · 2:00 on research & filing. Before 9 the day hasn't
// opened; the sends band is "next", not "past".
export function currentBand(now: Date): Band {
  const hour = Number(
    now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: USER_TZ }),
  );
  if (hour < 11) return "now";
  if (hour < 14) return "eleven";
  return "two";
}

const BAND_OF: Record<QueueRuleId, Band> = {
  "decision-window": "now",
  "reply-owed": "now",
  "meeting-prep": "now",
  "riding-lane": "now",
  "intent-warm": "eleven",
  "roundup-slot": "eleven",
  "never-touched-incumbent": "eleven",
  "stale-above-gate": "two",
  "stakeholder-gap": "two",
};

export function moveKey(item: Pick<QueueItem, "accountId" | "ruleId">): string {
  return `${item.accountId}:${item.ruleId}`;
}

// Research staleness in days against the corpus stamp. The corpus carries one
// generatedAt for the whole book; per-account passes land as research: notes
// and would refresh intel, not this stamp.
function researchAgeDays(now: Date): number {
  const t = Date.parse(researchGeneratedAt);
  if (Number.isNaN(t)) return Infinity;
  return (now.getTime() - t) / DAY;
}

export function buildQueue(inp: QueueInput): {
  items: QueueItem[];
  overflow: number;
} {
  const candidates: QueueItem[] = [];
  const touchesByAccount = new Map<string, TouchLike[]>();
  for (const t of inp.touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (!m) continue;
    const list = touchesByAccount.get(m[1]) ?? [];
    list.push(t);
    touchesByAccount.set(m[1], list);
  }
  const outreachByPartner = new Map<string, TouchLike>();
  for (const t of inp.touches) {
    const m = /^partner-outreach:(.+)$/.exec(t.subjectKey);
    if (m) outreachByPartner.set(m[1], t);
  }

  const researchAge = researchAgeDays(inp.now);

  for (const p of inp.accounts) {
    const notes = inp.notesById.get(p.id);
    const intel = inp.intelById.get(p.id);
    const intent = intentFor(notes, inp.now);
    const acctTouches = touchesByAccount.get(p.id) ?? [];
    const hasActivity = (notes?.length ?? 0) > 0 || acctTouches.length > 0;

    // decision-window (95): a dated decision inside 7 days.
    const dateIso = intel?.timing?.value.dateIso;
    if (dateIso) {
      const dd = daysUntil(dateIso, inp.now);
      if (dd >= -1 && dd <= 7) {
        candidates.push({
          accountId: p.id,
          name: p.name,
          ruleId: "decision-window",
          weight: 95,
          band: BAND_OF["decision-window"],
          situation: `their decision lands ${monthDay(dateIso)} — what you owe them goes first`,
          owed: "draft composed",
          intent,
        });
      }
    }

    // reply-owed (90): their message is the newest thing on a live thread.
    if (
      intel?.lastInbound &&
      (!intel.lastOutbound || intel.lastInbound > intel.lastOutbound) &&
      (inp.now.getTime() - Date.parse(intel.lastInbound)) / DAY <= 21
    ) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "reply-owed",
        weight: 90,
        band: BAND_OF["reply-owed"],
        situation: "their message is the newest thing on the thread — answer first",
        owed: "reply owed",
        intent,
      });
    }

    // meeting-prep (85): a dated follow-up or reminder inside 48 hours.
    const soon = (iso: string | null | undefined) => {
      if (!iso) return false;
      const dd = (Date.parse(iso) - inp.now.getTime()) / DAY;
      return dd >= -0.5 && dd <= 2;
    };
    if (
      acctTouches.some((t) => soon(t.followUpAt)) ||
      inp.todos.some((t) => t.accountId === p.id && soon(t.remindAt))
    ) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "meeting-prep",
        weight: 85,
        band: BAND_OF["meeting-prep"],
        situation: "a dated follow-up lands inside 48 hours — walk in prepared",
        owed: "prep composed",
        intent,
      });
    }

    // intent-warm (80): a fresh High reading from the pasted grab.
    if (intent?.level === "high") {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "intent-warm",
        weight: 80,
        band: BAND_OF["intent-warm"],
        situation: "their people are reading us — warm rooms cool",
        owed: "note ready",
        intent,
      });
    }

    // riding-lane (75): a colleague's CRM conversation dated inside 14 days,
    // visible in the pasted grab rows.
    const lane = ridingLaneDate(notes, inp.now);
    if (lane) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "riding-lane",
        weight: 75,
        band: BAND_OF["riding-lane"],
        situation: `a colleague's conversation there is dated ${monthDay(lane)} — ride it, never around it`,
        owed: "ask composed",
        intent,
      });
    }

    // stale-above-gate (65): real demand, research old.
    const demand = getDemand(p.id);
    if (
      (demand?.demandScore ?? 0) >= DEMAND_GATE &&
      Number.isFinite(researchAge) &&
      researchAge > 21
    ) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "stale-above-gate",
        weight: 65,
        band: BAND_OF["stale-above-gate"],
        situation: `real demand on file, research ${Math.floor(researchAge)} days old — refresh before anyone calls`,
        owed: "recipe ready",
        intent,
      });
    }

    // stakeholder-gap (55): an account in motion the book barely knows.
    if (hasActivity && inp.contactCountById(p.id) < 2) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "stakeholder-gap",
        weight: 55,
        band: BAND_OF["stakeholder-gap"],
        situation: `the book knows ${inp.contactCountById(p.id) === 0 ? "no one" : "one person"} here — the session that fixes it is composed`,
        owed: "recipe ready",
        intent,
      });
    }

    // never-touched-incumbent (50): on the platform, high fit, never worked.
    const desk = deskScore(p);
    if (desk.incumbent && p.fitTier === "high" && !hasActivity) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "never-touched-incumbent",
        weight: 50,
        band: BAND_OF["never-touched-incumbent"],
        situation:
          "already on our platform, never introduced to Global — the cheapest conversation in the book",
        owed: "roundup slot",
        intent,
      });
    }
  }

  // roundup-slot (70): a partner manager's update rhythm has lapsed — their
  // roster's best-fit account takes the slot.
  const byId = new Map(inp.accounts.map((p) => [p.id, p]));
  const rosterBest = new Map<string, { id: string; score: number }>();
  for (const p of inp.accounts) {
    if (!p.csm || p.csm === "Unassigned") continue;
    const d = getDemand(p.id);
    const comp = compositeScore(
      deskScore(p).score,
      d?.demandScore ?? null,
      d?.confidence,
    ).score;
    const best = rosterBest.get(p.csm);
    if (!best || comp > best.score) rosterBest.set(p.csm, { id: p.id, score: comp });
  }
  for (const [csm, best] of rosterBest) {
    const t = outreachByPartner.get(csm);
    const due = !t || (inp.now.getTime() - Date.parse(t.contactedAt)) / DAY >= 2;
    if (!due) continue;
    const p = byId.get(best.id);
    if (!p) continue;
    candidates.push({
      accountId: p.id,
      name: p.name,
      ruleId: "roundup-slot",
      weight: 70,
      band: BAND_OF["roundup-slot"],
      situation: `${csm}'s update is due — this is the roster's best fit, briefed first`,
      owed: `note to ${csm.split(" ")[0]} ready`,
      intent: intentFor(inp.notesById.get(p.id), inp.now),
    });
  }

  // Strongest evidence per account wins; then weight, composite, proximity.
  const bestByAccount = new Map<string, QueueItem>();
  for (const c of candidates) {
    const cur = bestByAccount.get(c.accountId);
    if (!cur || c.weight > cur.weight) bestByAccount.set(c.accountId, c);
  }
  const compOf = (id: string) => {
    const p = byId.get(id);
    if (!p) return 0;
    const d = getDemand(id);
    return compositeScore(deskScore(p).score, d?.demandScore ?? null, d?.confidence)
      .score;
  };
  const items = [...bestByAccount.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    const cb = compOf(b.accountId) - compOf(a.accountId);
    if (cb !== 0) return cb;
    const pa = byId.get(a.accountId);
    const pb = byId.get(b.accountId);
    return (pa ? proximityRank(pa) : 3) - (pb ? proximityRank(pb) : 3);
  });

  return {
    items: items.slice(0, QUEUE_CAP),
    overflow: Math.max(0, items.length - QUEUE_CAP),
  };
}

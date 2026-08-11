// The Groundwork queue — the rail's brain. A pure weighted rule engine in the
// morning-brief pattern: each rule reads one kind of evidence the rest of the
// app already writes, emits a candidate row, and the strongest evidence per
// account wins. Time bands come from the KIND of move a rule composes (a send,
// a person touch, a session), never from a separate scheduler; the clock only
// decides which band is "now". Row copy obeys the writing canon (CLAUDE.md):
// an imperative action line and a trigger reason line, six words or fewer
// each, the deadline always in the reason and never in the action. A move
// surfaced yesterday and left unworked comes back carrying that fact.
// Build spec: docs/plans/groundwork-build-spec.md.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { getDemand, researchGeneratedAt, DEMAND_GATE } from "@/lib/book/research";
import { proximityRank } from "./proximity";
import { intentFor, ridingLaneDate, type IntentSignal } from "./signals";
import { USER_TZ, userDayKey } from "@/lib/tz";

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
  action: string; // the imperative line — do this today, six words or fewer
  reason: string; // the trigger — a date, a promise, an unanswered message
  owed: string; // the mono column — the composed thing's readiness label
  carried: boolean; // surfaced yesterday, left unworked
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
type TodoLike = {
  accountId?: string | null;
  remindAt?: string | null;
  done?: boolean;
};

export type QueueInput = {
  accounts: Peo[];
  intelById: Map<string, DealIntel>; // present only for accounts with a corpus
  notesById: Map<string, NoteLike[]>; // newest first, real accounts only
  touches: TouchLike[];
  todos: TodoLike[];
  contactCountById: (id: string) => number;
  doneKeys?: Set<string>; // raw done-stamp keys, for the carryover read
  now: Date;
};

const DAY = 86_400_000;

const daysUntil = (iso: string, now: Date) =>
  (Date.parse(`${iso}T12:00:00Z`) - now.getTime()) / DAY;

// A date in prose, day-only or full ISO — month name spelled out.
const monthDay = (iso: string) => {
  const dayOnly = iso.length === 10;
  const t = Date.parse(dayOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: dayOnly ? "UTC" : USER_TZ,
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

// The full ranked list for one day — the pure heart buildQueue calls twice:
// once for today, once for yesterday, so the carryover read stays derived and
// nothing is stored.
function rankAll(inp: QueueInput, now: Date): QueueItem[] {
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

  const researchAge = researchAgeDays(now);

  for (const p of inp.accounts) {
    const notes = inp.notesById.get(p.id);
    const intel = inp.intelById.get(p.id);
    const intent = intentFor(notes, now);
    const acctTouches = touchesByAccount.get(p.id) ?? [];
    const hasActivity = (notes?.length ?? 0) > 0 || acctTouches.length > 0;

    // decision-window (95): a dated decision inside 7 days.
    const dateIso = intel?.timing?.value.dateIso;
    if (dateIso) {
      const dd = daysUntil(dateIso, now);
      if (dd >= -1 && dd <= 7) {
        candidates.push({
          accountId: p.id,
          name: p.name,
          ruleId: "decision-window",
          weight: 95,
          band: BAND_OF["decision-window"],
          action: "Send what you owe them.",
          reason: `Decision lands ${monthDay(dateIso)}.`,
          owed: "draft composed",
          carried: false,
          intent,
        });
      }
    }

    // reply-owed (90): their message is the newest thing on a live thread.
    if (
      intel?.lastInbound &&
      (!intel.lastOutbound || intel.lastInbound > intel.lastOutbound) &&
      (now.getTime() - Date.parse(intel.lastInbound)) / DAY <= 21
    ) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "reply-owed",
        weight: 90,
        band: BAND_OF["reply-owed"],
        action: "Answer their last message.",
        reason: `Unanswered since ${monthDay(intel.lastInbound)}.`,
        owed: "reply owed",
        carried: false,
        intent,
      });
    }

    // meeting-prep (85): a dated follow-up or reminder inside 48 hours.
    const soon = (iso: string | null | undefined) => {
      if (!iso) return false;
      const dd = (Date.parse(iso) - now.getTime()) / DAY;
      return dd >= -0.5 && dd <= 2;
    };
    const prepDates = [
      ...acctTouches
        .filter(
          (t) =>
            (t.status === "awaiting" || t.status === "responded") && soon(t.followUpAt),
        )
        .map((t) => t.followUpAt),
      ...inp.todos
        .filter((t) => !t.done && t.accountId === p.id && soon(t.remindAt))
        .map((t) => t.remindAt as string),
    ].sort();
    if (prepDates.length > 0) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "meeting-prep",
        weight: 85,
        band: BAND_OF["meeting-prep"],
        action: "Prep the meeting.",
        reason: `Follow-up dated ${monthDay(prepDates[0])}.`,
        owed: "prep composed",
        carried: false,
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
        action: "Send the reading-us note.",
        reason: "Their people are reading us.",
        owed: "note ready",
        carried: false,
        intent,
      });
    }

    // riding-lane (75): a colleague's CRM conversation dated inside 14 days,
    // visible in the pasted grab rows. One door of two, per the direct
    // doctrine — ride when it is faster, go direct when it is not.
    const lane = ridingLaneDate(notes, now);
    if (lane) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "riding-lane",
        weight: 75,
        band: BAND_OF["riding-lane"],
        action: "Ask to be carried in.",
        reason: `Their opportunity closes ${monthDay(lane)}.`,
        owed: "ask composed",
        carried: false,
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
        action: "Refresh the account research.",
        reason: `Real demand. Research ${Math.floor(researchAge)} days old.`,
        owed: "recipe ready",
        carried: false,
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
        action: "Find a second name.",
        reason:
          inp.contactCountById(p.id) === 0
            ? "The book knows no one."
            : "One person carries everything.",
        owed: "recipe ready",
        carried: false,
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
        action: "Open the first conversation.",
        reason: "On our platform. Never introduced.",
        owed: "draft composed",
        carried: false,
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
    // The shared cadence rule: never stack an update on a live thread — due
    // only when there's no thread, or the last one is archived and 2+ days
    // old (src/lib/today/follow-ups.ts roundupDue semantics).
    const t = outreachByPartner.get(csm);
    const due =
      !t ||
      (t.status === "archived" && (now.getTime() - Date.parse(t.contactedAt)) / DAY >= 2);
    if (!due) continue;
    const p = byId.get(best.id);
    if (!p) continue;
    const csmFirst = csm.split(" ")[0];
    candidates.push({
      accountId: p.id,
      name: p.name,
      ruleId: "roundup-slot",
      weight: 70,
      band: BAND_OF["roundup-slot"],
      action: `Brief ${csmFirst}.`,
      reason: `${csmFirst}'s update is due.`,
      owed: `note to ${csmFirst} ready`,
      carried: false,
      intent: intentFor(inp.notesById.get(p.id), now),
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
  return [...bestByAccount.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    const cb = compOf(b.accountId) - compOf(a.accountId);
    if (cb !== 0) return cb;
    const pa = byId.get(a.accountId);
    const pb = byId.get(b.accountId);
    return (pa ? proximityRank(pa) : 3) - (pb ? proximityRank(pb) : 3);
  });
}

export function buildQueue(inp: QueueInput): {
  items: QueueItem[];
  overflow: number;
  all: QueueItem[]; // the full ranked list, uncapped — the readout counts from this
} {
  const ranked = rankAll(inp, inp.now);

  // The carryover read (canon: yesterday carries). A move that was on
  // yesterday's visible queue and never got its done stamp returns marked —
  // derived by re-ranking as of yesterday, never stored.
  const yesterday = new Date(inp.now.getTime() - DAY);
  const yesterKey = userDayKey(yesterday);
  const shownYesterday = new Set(
    rankAll(inp, yesterday)
      .slice(0, QUEUE_CAP)
      .map((q) => moveKey(q)),
  );
  const done = inp.doneKeys ?? new Set<string>();
  const all = ranked.map((q) => {
    const mk = moveKey(q);
    const carried = shownYesterday.has(mk) && !done.has(`groundwork:${yesterKey}:${mk}`);
    return carried ? { ...q, carried } : q;
  });

  return {
    items: all.slice(0, QUEUE_CAP),
    overflow: Math.max(0, all.length - QUEUE_CAP),
    all,
  };
}

// The Groundwork queue — the stage's brain. A pure weighted rule engine in
// the morning-brief pattern: each rule reads one kind of evidence the rest of
// the app already writes, emits a candidate row, and the strongest evidence
// per account wins. Groundwork is outbound only (CLAUDE.md): every rule
// starts motion the operator initiates today to build pipeline. Reactive
// account motion — replies owed, decision windows, meeting prep — belongs to
// the HomeRoom's own brain and never fires here. Row copy obeys the writing
// canon: an imperative action line and a trigger reason line, six words or
// fewer each, the deadline always in the reason and never in the action. A
// move surfaced yesterday and left unworked comes back carrying that fact.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { isMeetingNote } from "@/lib/intel/meeting";
import { getDemand, researchGeneratedAt, DEMAND_GATE } from "@/lib/book/research";
import { proximityRank } from "./proximity";
import { intentFor, ridingLaneDate, type IntentSignal } from "./signals";
import {
  engagedNeverIntroduced,
  intentWarm,
  orgInboundKey,
  orgInboundHolder,
  outreachGem,
  verifiedCold,
  type SecondRecord,
} from "@/lib/activity/read";
import { USER_TZ, userDayKey } from "@/lib/tz";

export type Band = "now" | "eleven" | "two";

export type QueueRuleId =
  | "wire-trigger"
  | "intent-warm"
  | "riding-lane"
  | "silence-bump"
  | "roundup-slot"
  | "stale-above-gate"
  | "cold-revival"
  | "stakeholder-gap"
  | "never-touched-incumbent"
  | "engaged-never-introduced"
  | "second-record-gem";

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

// The silence-bump cadence: a first touch left unanswered gets its second
// touch after BUMP_QUIET_DAYS; past REVIVAL_QUIET_DAYS the thread is cold and
// the move becomes a deliberate re-open instead of a bump.
export const BUMP_QUIET_DAYS = 7;
export const REVIVAL_QUIET_DAYS = 45;

// Research holds for a quarter (founder-decreed 2026-08-14): Groundwork puts
// no pressure out front until a pass — per-account or book-wide — is 90 days
// old. Fresh research on demand is the stage button's job, not the queue's.
export const RESEARCH_STALE_DAYS = 90;

// The record's live motion excludes an account from prospecting (canon:
// Groundwork is outbound only; reactive motion belongs to the HomeRoom —
// enforced from the record 2026-08-14, because the board lags). THEY are
// engaging when a real inbound landed inside the window, or a meeting, call,
// or transcript filed fresh. The operator's own outbound never excludes —
// the drumbeat rules need it.
export const MOTION_INBOUND_DAYS = 21;
export const MOTION_MEETING_DAYS = 14;

export function liveMotionIds(
  notesById: Map<string, { body: string; source: string; createdAt: string }[]>,
  intelById: Map<string, Pick<DealIntel, "lastInbound">>,
  now: Date,
): Set<string> {
  const out = new Set<string>();
  for (const [id, intel] of intelById) {
    const inAt = Date.parse(intel.lastInbound || "");
    if (!Number.isNaN(inAt) && (now.getTime() - inAt) / DAY <= MOTION_INBOUND_DAYS)
      out.add(id);
  }
  for (const [id, notes] of notesById) {
    if (out.has(id)) continue;
    for (const n of notes) {
      const at = Date.parse(n.createdAt);
      if (Number.isNaN(at) || (now.getTime() - at) / DAY > MOTION_MEETING_DAYS) continue;
      // The one shared spelling of "this note records a meeting" — the same
      // read the touch clock and the room's recap rule use.
      if (isMeetingNote(n)) {
        out.add(id);
        break;
      }
    }
  }
  return out;
}

// A wire hit older than this no longer justifies a news note — the trigger
// is perishable by design.
export const WIRE_FRESH_DAYS = 5;

type NoteLike = { body: string; source: string; createdAt: string };
type TouchLike = {
  subjectKey: string;
  contactedAt: string;
  followUpAt: string;
  status: string;
};

export type QueueInput = {
  accounts: Peo[];
  intelById: Map<string, DealIntel>; // present only for accounts with a corpus
  notesById: Map<string, NoteLike[]>; // newest first, real accounts only
  touches: TouchLike[];
  contactCountById: (id: string) => number;
  wireAtById?: Map<string, string>; // newest matched wire item per account, ISO
  researchAtById?: Map<string, string>; // newest deep-research note per account, ISO
  doneKeys?: Set<string>; // raw done-stamp keys, for the carryover read
  // Accounts the queue must not stage: a deal at demo or later is the
  // HomeRoom's to work, and a stamped Closed Won/Lost is over. Groundwork
  // prospects the book it is NOT actively closing.
  excludedIds?: Set<string>;
  /** The second record, parsed once for the whole book (read.ts). */
  secondById?: Map<string, SecondRecord>;
  /** Accounts holding ANY live board card — engaged-never-introduced only
   *  fires where no deal exists at all, whatever its stage. */
  boardIds?: Set<string>;
  now: Date;
};

// One rule may hold at most this many of the day's top slots — a rule that
// fires book-wide must never wall the wing. The rest of its hits sink below
// every other rule's, still ranked, never lost.
export const RULE_SLOT_CAP = 2;

const DAY = 86_400_000;

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
  "wire-trigger": "now",
  "second-record-gem": "now",
  "engaged-never-introduced": "eleven",
  "silence-bump": "now",
  "riding-lane": "now",
  "intent-warm": "eleven",
  "roundup-slot": "eleven",
  "never-touched-incumbent": "eleven",
  "cold-revival": "eleven",
  "stale-above-gate": "two",
  "stakeholder-gap": "two",
};

// The wing's heat ladder: 3 burns today (a perishable signal or a carried
// move), 2 is dated inside the week (a cadence day, a closing lane, a due
// update), 1 keeps until worked.
const HEAT_OF: Record<QueueRuleId, 1 | 2 | 3> = {
  "wire-trigger": 3,
  "second-record-gem": 3,
  "engaged-never-introduced": 2,
  "intent-warm": 3,
  "riding-lane": 2,
  "silence-bump": 2,
  "roundup-slot": 2,
  "stale-above-gate": 1,
  "cold-revival": 1,
  "stakeholder-gap": 1,
  "never-touched-incumbent": 1,
};

export function heatOf(item: Pick<QueueItem, "ruleId" | "carried">): 1 | 2 | 3 {
  return item.carried ? 3 : HEAT_OF[item.ruleId];
}

export function moveKey(item: Pick<QueueItem, "accountId" | "ruleId">): string {
  return `${item.accountId}:${item.ruleId}`;
}

// Research staleness in days, per-account notes ONLY — null when the account
// has never had its own pass. The book-wide stamp is handled once, outside
// the per-account loop: one stale book is one move, never a wall of clones.
function perAccountResearchAge(
  inp: QueueInput,
  accountId: string,
  now: Date,
): number | null {
  const perAccount = inp.researchAtById?.get(accountId);
  if (!perAccount) return null;
  const t = Date.parse(perAccount);
  if (Number.isNaN(t)) return null;
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

  for (const p of inp.accounts) {
    if (inp.excludedIds?.has(p.id)) continue;
    const notes = inp.notesById.get(p.id);
    const intent = intentFor(notes, now);
    const acctTouches = touchesByAccount.get(p.id) ?? [];
    const hasActivity = (notes?.length ?? 0) > 0 || acctTouches.length > 0;

    // wire-trigger (88): the wire filed news matched to this account inside
    // the fresh window — event-led outreach, direct.
    const wireAt = inp.wireAtById?.get(p.id);
    if (wireAt) {
      const age = (now.getTime() - Date.parse(wireAt)) / DAY;
      if (age >= 0 && age <= WIRE_FRESH_DAYS) {
        candidates.push({
          accountId: p.id,
          name: p.name,
          ruleId: "wire-trigger",
          weight: 88,
          band: BAND_OF["wire-trigger"],
          action: "Send the note about the news.",
          reason: `They made the wire ${monthDay(wireAt)}.`,
          owed: "draft composed",
          carried: false,
          intent,
        });
      }
    }

    // intent-warm (84): warm on EITHER store, merged by latest and never
    // double-counted — the weekly export's open/click tallies (3·clicks +
    // 1·opens, 10-day half-life, threshold 6) or a fresh High reading from
    // the pasted SN grab. One candidate either way.
    const sr = inp.secondById?.get(p.id);
    const warm = intentWarm(sr, now);
    if (warm || intent?.level === "high") {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "intent-warm",
        weight: 84,
        band: BAND_OF["intent-warm"],
        action: "Send the reading-us note.",
        reason: warm
          ? `They opened ${warm.opens30} of ours.`
          : "Their people are reading us.",
        owed: "note ready",
        carried: false,
        intent,
      });
    }

    // engaged-never-introduced (78): heavy support traffic, still warm, on an
    // account nobody ever pitched — no first-record motion, no board card.
    // The file card carries the support pulse as ammunition.
    const eni = engagedNeverIntroduced(sr, now);
    if (eni && !hasActivity && !inp.boardIds?.has(p.id)) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "engaged-never-introduced",
        weight: 78,
        band: BAND_OF["engaged-never-introduced"],
        action: "Open the first conversation.",
        reason: `${eni.cases} support cases. Never pitched.`,
        owed: "draft composed",
        carried: false,
        intent,
      });
    }

    // second-record-gem (84): a verified, un-acted gem whose act points at
    // account people is wire-class evidence — the act line IS the move, the
    // refuter already checked the canon on it. Coordination gems stay in the
    // rooms; the queue is outbound only.
    const gem = outreachGem(sr);
    if (gem) {
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "second-record-gem",
        weight: 84,
        band: BAND_OF["second-record-gem"],
        action: gem.act,
        reason: gem.reason,
        owed: "evidence attached",
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

    // silence-bump (72) and cold-revival (60): the drumbeat on open outbound
    // threads. A first touch awaiting a reply gets its second touch on the
    // cadence day; a thread quiet past the cold line gets one deliberate
    // re-open with something new to say. The clock reads the LATEST of the
    // touch log and the record's own traffic (Ted doctrine): a filed
    // outbound resets the drumbeat, and a filed REPLY silences it entirely —
    // an answered thread is the HomeRoom's motion, not Groundwork's.
    const newestTouch = acctTouches
      .slice()
      .sort((a, b) => b.contactedAt.localeCompare(a.contactedAt))[0];
    const intelHere = inp.intelById.get(p.id);
    const lastOutIso = [newestTouch?.contactedAt ?? "", intelHere?.lastOutbound ?? ""]
      .filter(Boolean)
      .sort()
      .pop();
    // The answered check reads the WIDEST inbound the app holds (the second
    // record law): a reply that landed in a colleague's inbox still answers
    // the thread — no bump; the move flips to coordination instead.
    const orgIn = orgInboundKey(sr);
    const answeredMine =
      !!intelHere?.lastInbound && !!lastOutIso && intelHere.lastInbound > lastOutIso;
    const answeredOrg = !answeredMine && !!orgIn && !!lastOutIso && orgIn > lastOutIso;
    if (newestTouch && lastOutIso && answeredOrg) {
      const holder = orgInboundHolder(sr);
      const first = holder.split(" ")[0] || "";
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "silence-bump",
        weight: 72,
        band: BAND_OF["silence-bump"],
        action: first ? `Ask ${first} what they said.` : "Find the reply org-side.",
        reason: first ? `Their reply went to ${first}.` : "Their reply landed org-side.",
        owed: "ask composed",
        carried: false,
        intent,
      });
    }
    const answered = answeredMine || answeredOrg;
    if (newestTouch && lastOutIso && !answered) {
      const quiet = (now.getTime() - Date.parse(lastOutIso)) / DAY;
      if (
        newestTouch.status === "awaiting" &&
        quiet >= BUMP_QUIET_DAYS &&
        quiet < REVIVAL_QUIET_DAYS
      ) {
        candidates.push({
          accountId: p.id,
          name: p.name,
          ruleId: "silence-bump",
          weight: 72,
          band: BAND_OF["silence-bump"],
          action: "Send the second touch.",
          reason: `No reply since ${monthDay(lastOutIso)}.`,
          owed: "draft composed",
          carried: false,
          intent,
        });
      } else if (quiet >= REVIVAL_QUIET_DAYS) {
        candidates.push({
          accountId: p.id,
          name: p.name,
          ruleId: "cold-revival",
          weight: 60,
          band: BAND_OF["cold-revival"],
          action: "Revive the thread.",
          reason: `Quiet since ${monthDay(lastOutIso)}.`,
          owed: "draft composed",
          carried: false,
          intent,
        });
      }
    }

    // stale-above-gate (65): real demand, and the account's OWN research pass
    // has gone stale. Fires only on a per-account pass — the book-wide stamp
    // collapses to a single move after this loop.
    const researchAge = perAccountResearchAge(inp, p.id, now);
    const demand = getDemand(p.id);
    if (
      (demand?.demandScore ?? 0) >= DEMAND_GATE &&
      researchAge != null &&
      researchAge > RESEARCH_STALE_DAYS
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
    // The backbone rule of the direct era: the first conversation, direct.
    const desk = deskScore(p);
    if (desk.incumbent && p.fitTier === "high" && !hasActivity) {
      // Cold-validated (the second record law): zero account-person motion
      // on BOTH records upgrades confidence — the cold is verified, not
      // assumed, and the reason says so.
      const cold = verifiedCold(sr);
      candidates.push({
        accountId: p.id,
        name: p.name,
        ruleId: "never-touched-incumbent",
        weight: cold ? 52 : 50,
        band: BAND_OF["never-touched-incumbent"],
        action: "Open the first conversation.",
        reason: cold
          ? "Verified cold. Ninety quiet days."
          : "On our platform. Never introduced.",
        owed: "draft composed",
        carried: false,
        intent,
      });
    }
  }

  // The book-wide research stamp, collapsed to ONE move. When no per-account
  // pass exists, six accounts "going stale" on the same day is one fact about
  // the book, not six moves — the strongest above-gate account carries it.
  const globalAgeT = Date.parse(researchGeneratedAt);
  const globalAge = Number.isNaN(globalAgeT) ? null : (now.getTime() - globalAgeT) / DAY;
  if (globalAge != null && globalAge > RESEARCH_STALE_DAYS) {
    const bearers = inp.accounts
      .filter(
        (p) =>
          !inp.excludedIds?.has(p.id) &&
          !inp.researchAtById?.get(p.id) &&
          (getDemand(p.id)?.demandScore ?? 0) >= DEMAND_GATE,
      )
      .sort((a, b) => {
        const da = getDemand(a.id);
        const db = getDemand(b.id);
        return (
          compositeScore(deskScore(b).score, db?.demandScore ?? null, db?.confidence)
            .score -
          compositeScore(deskScore(a).score, da?.demandScore ?? null, da?.confidence)
            .score
        );
      });
    const taken = new Set(candidates.map((c) => c.accountId));
    const bearer = bearers.find((p) => !taken.has(p.id)) ?? bearers[0];
    if (bearer) {
      candidates.push({
        accountId: bearer.id,
        name: bearer.name,
        ruleId: "stale-above-gate",
        weight: 65,
        band: BAND_OF["stale-above-gate"],
        action: "Run the research pass.",
        reason: `Book research ${Math.floor(globalAge)} days old.`,
        owed: "recipe ready",
        carried: false,
        intent: intentFor(inp.notesById.get(bearer.id), now),
      });
    }
  }

  // roundup-slot (70): a partner manager's update rhythm has lapsed — their
  // roster's best-fit account takes the slot. The CSM door, chosen when it
  // is the fastest one, never the toll.
  const byId = new Map(inp.accounts.map((p) => [p.id, p]));
  // Accounts already carrying their OWN evidence. The roundup slot and the
  // book-wide research stamp are about the CSM and the book — they ride an
  // account as a vehicle, and a vehicle must never swallow the account's own
  // move (caught 2026-08-20: a briefing slot ate a verified-cold first touch).
  const occupied = new Set(candidates.map((c) => c.accountId));
  const rosterRanked = new Map<string, { id: string; score: number }[]>();
  for (const p of inp.accounts) {
    if (inp.excludedIds?.has(p.id)) continue;
    if (!p.csm || p.csm === "Unassigned") continue;
    const d = getDemand(p.id);
    const comp = compositeScore(
      deskScore(p).score,
      d?.demandScore ?? null,
      d?.confidence,
    ).score;
    const list = rosterRanked.get(p.csm) ?? [];
    list.push({ id: p.id, score: comp });
    rosterRanked.set(p.csm, list);
  }
  const rosterBest = new Map<string, { id: string; score: number }>();
  for (const [csm, list] of rosterRanked) {
    list.sort((a, b) => b.score - a.score);
    // The best-fit FREE account carries the slot; only a roster with no free
    // account falls back to colliding, where weight resolves it as before.
    rosterBest.set(csm, list.find((x) => !occupied.has(x.id)) ?? list[0]);
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
  const sorted = [...bestByAccount.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    const cb = compOf(b.accountId) - compOf(a.accountId);
    if (cb !== 0) return cb;
    const pa = byId.get(a.accountId);
    const pb = byId.get(b.accountId);
    return (pa ? proximityRank(pa) : 3) - (pb ? proximityRank(pb) : 3);
  });

  // The slot cap: one rule holds at most RULE_SLOT_CAP of the leading order;
  // its overflow sinks below every other rule's hits, still ranked, never
  // dropped. A monotone wall becomes two slots and an open wing.
  const leading: QueueItem[] = [];
  const sunk: QueueItem[] = [];
  const perRule = new Map<QueueRuleId, number>();
  for (const q of sorted) {
    const n = perRule.get(q.ruleId) ?? 0;
    if (n < RULE_SLOT_CAP) {
      perRule.set(q.ruleId, n + 1);
      leading.push(q);
    } else sunk.push(q);
  }
  return [...leading, ...sunk];
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
  // The record clears a carry too (Ted doctrine): an outbound filed since
  // yesterday IS the work — the stamp table only knows about the copy button.
  const yesterdayIso = yesterday.toISOString();
  const workedByRecord = (accountId: string): boolean => {
    const out = inp.intelById.get(accountId)?.lastOutbound ?? "";
    return !!out && out >= yesterdayIso;
  };
  const all = ranked.map((q) => {
    const mk = moveKey(q);
    const carried =
      shownYesterday.has(mk) &&
      !done.has(`groundwork:${yesterKey}:${mk}`) &&
      !workedByRecord(q.accountId);
    return carried ? { ...q, carried } : q;
  });

  return {
    items: all.slice(0, QUEUE_CAP),
    overflow: Math.max(0, all.length - QUEUE_CAP),
    all,
  };
}

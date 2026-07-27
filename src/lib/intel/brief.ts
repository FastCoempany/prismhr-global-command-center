// The morning brief — Today thinks every morning. Pure builder: given each
// board card's corpus + derived intel, emit weighted, deduped rows of "your
// move first" work. Done is day-scoped (brief-done:<ruleId>:<subjectId>:<day>),
// mute is permanent (brief-mute:<ruleId>:<subjectId>). Cap 8 on screen;
// overflow expands.

import type { DashNodeKey } from "@/lib/dashboard/stages";
import type { GlyphKind } from "@/app/today/ledger-icons";
import { DISCOVERY } from "./discovery";
import { redactMoney } from "./lexicon";
import { sfLogCallUrl } from "@/lib/salesforce";
import type { CorpusDoc } from "./extract";
import type { CheckSuggestion } from "./evidence";
import type { DealIntel } from "./types";

export type BriefRow = {
  ruleId: string;
  subjectId: string; // dedupe/done key
  icon: GlyphKind;
  text: string;
  why: string;
  control: {
    kind: "mailto" | "sflog" | "copy" | "confirmCheck" | "link";
    href?: string;
    payload?: string;
    check?: { cardId: string; node: DashNodeKey; idx: number };
  };
  weight: number; // sort desc
};

export type BriefCard = {
  id: string;
  name: string;
  accountId: string; // "" when unresolved
  states: Partial<Record<DashNodeKey, string>>;
};

export type BriefInput = {
  cards: BriefCard[];
  docsByCard: Record<string, CorpusDoc[]>; // newest first (corpusFor order)
  intelByCard: Record<string, DealIntel>;
  suggByCard: Record<string, CheckSuggestion[]>;
  dispositionKeys: Set<string>; // every AccountDisposition key
  now: Date;
};

const DAY = 86_400_000;

// Weekday count between two instants (UTC-day granularity, endpoints open).
export function businessDaysBetween(fromIso: string, to: Date): number {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from) || from >= to.getTime()) return 0;
  let n = 0;
  for (let t = from + DAY; t <= to.getTime(); t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

const isLive = (card: BriefCard) =>
  Object.values(card.states).some((s) => s === "active");

const agoWord = (iso: string, now: Date): string => {
  const d = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / DAY));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
};

const drum = (id: string): string => DISCOVERY.find((q) => q.id === id)?.drumLine ?? "";

const CONTRACTS_OUT =
  /contracts? (for signature|sent|attached|out)|referral agreement|MSSA/i;
const MEETING_ASK = /\bavailable\b|\bwhat availability\b|\bwed(nesday)?\b|\bthis week\b/i;
const PROMISE =
  /\bI'?ll\b|\bI will\b|\bsending (it |that |them )?over\b|\bconnect you\b/i;

// The person a doc came from (first name in its "A → B" header), or "".
const personOf = (doc: CorpusDoc | undefined): string => doc?.people?.[0] ?? "";

export function buildMorningBrief(inp: BriefInput): BriefRow[] {
  const rows: BriefRow[] = [];
  const dayKey = inp.now.toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const add = (row: BriefRow) => {
    if (inp.dispositionKeys.has(`brief-mute:${row.ruleId}:${row.subjectId}`)) return;
    if (inp.dispositionKeys.has(`brief-done:${row.ruleId}:${row.subjectId}:${dayKey}`))
      return;
    rows.push(row);
  };

  for (const card of inp.cards) {
    const docs = inp.docsByCard[card.id] ?? [];
    const intel = inp.intelByCard[card.id];
    const sugg = inp.suggByCard[card.id] ?? [];
    if (!intel) continue;
    const latestInbound = docs.find((d) => d.direction === "in");
    const latestOutbound = docs.find((d) => d.direction === "out");

    // reply-waiting (w=100): inbound newer than outbound on a live deal.
    if (
      isLive(card) &&
      intel.lastInbound &&
      (!intel.lastOutbound || intel.lastInbound > intel.lastOutbound)
    ) {
      const person = personOf(latestInbound) || card.name;
      add({
        ruleId: "reply-waiting",
        subjectId: card.id,
        icon: "send",
        text: `${person} wrote ${agoWord(intel.lastInbound, inp.now)} — reply`,
        why: `${card.name}: their message is the newest thing on the thread`,
        control: {
          kind: "mailto",
          href: `mailto:?subject=${encodeURIComponent(`Re: ${card.name}`)}`,
        },
        weight: 100,
      });
    }

    // meeting-ask (w=95): a times-ask in the latest inbound.
    if (latestInbound && MEETING_ASK.test(latestInbound.text)) {
      const person = personOf(latestInbound) || card.name;
      add({
        ruleId: "meeting-ask",
        subjectId: card.id,
        icon: "send",
        text: `${person} asked for times — send them`,
        why: `${card.name}: times-ask spotted in the latest inbound (${latestInbound.src})`,
        control: {
          kind: "mailto",
          href: `mailto:?subject=${encodeURIComponent(`Times for a call — ${card.name}`)}&body=${encodeURIComponent(
            "Happy to work around you — a few options (Central):\n\n• \n• \n• \n\nIf none land, send two windows that work and I'll take one.",
          )}`,
        },
        weight: 95,
      });
    }

    // contract-chase (w=90): contract stage live, paper out, quiet ≥2 business days.
    if (card.states.contract === "active") {
      const paper = docs.find((d) => CONTRACTS_OUT.test(d.text));
      const quiet = !intel.lastInbound
        ? true
        : businessDaysBetween(intel.lastInbound, inp.now) >= 2;
      if (paper && quiet) {
        const n = Math.max(
          1,
          Math.floor((inp.now.getTime() - Date.parse(paper.at)) / DAY),
        );
        add({
          ruleId: "contract-chase",
          subjectId: card.id,
          icon: "owed",
          text: `contracts out ${n}d — chase signature`,
          why: `${card.name}: ${paper.src} shows paper moving, nothing inbound since`,
          control: {
            kind: "sflog",
            href:
              (card.accountId &&
                sfLogCallUrl(card.accountId, {
                  subject: `Chase signature — ${card.name}`,
                  comments: "Followed up on outstanding contracts.",
                })) ||
              undefined,
          },
          weight: 90,
        });
      }
    }

    // deadline-near (w=85): a dated timing inside 7 days.
    if (intel.timing?.value.dateIso) {
      const t = Date.parse(`${intel.timing.value.dateIso}T12:00:00Z`);
      const dd = (t - inp.now.getTime()) / DAY;
      if (dd >= -1 && dd <= 7) {
        add({
          ruleId: "deadline-near",
          subjectId: card.id,
          icon: "decide",
          text: `${card.name}: ${intel.timing.value.phrase} on ${intel.timing.value.dateIso.slice(5)} — what do they need in hand?`,
          why: `timing sourced from ${intel.timing.src}`,
          control: {
            kind: "copy",
            payload: `Before ${card.name}'s ${intel.timing.value.phrase} (${intel.timing.value.dateIso}): list what they need in hand from us — documents, answers, approvals — and what we're still owed from them.`,
          },
          weight: 85,
        });
      }
    }

    // owed-item (w=80): a promise in MY latest outbound with nothing sent after.
    if (latestOutbound) {
      const m = PROMISE.exec(latestOutbound.text);
      if (m) {
        const start = Math.max(0, m.index);
        const thing = redactMoney(
          latestOutbound.text
            .slice(start, start + 90)
            .replace(/\s+/g, " ")
            .trim(),
        );
        const person = latestOutbound.people?.[1] ?? card.name;
        add({
          ruleId: "owed-item",
          subjectId: card.id,
          icon: "owed",
          text: `you owe ${person}: “${thing}…”`,
          why: `${card.name}: promised in ${latestOutbound.src}, no outbound since`,
          control: {
            kind: "mailto",
            href: `mailto:?subject=${encodeURIComponent(`Following through — ${card.name}`)}`,
          },
          weight: 80,
        });
      }
    }

    // suggested-checks (w=60): the board has evidence waiting for a click.
    if (sugg.length > 0) {
      add({
        ruleId: "suggested-checks",
        subjectId: card.id,
        icon: "check",
        text: `${card.name}: ${sugg.length} stage check${sugg.length === 1 ? "" : "s"} look satisfiable — confirm`,
        why: sugg.map((s) => s.reason).join(" · "),
        control: {
          kind: "confirmCheck",
          href: "/",
          check: { cardId: card.id, node: sugg[0].node, idx: sugg[0].itemIdx },
        },
        weight: 60,
      });
    }

    // single-thread (w=50): one name carrying a live deal.
    if (isLive(card) && intel.threads.people.length === 1) {
      add({
        ruleId: "single-thread",
        subjectId: card.id,
        icon: "note",
        text: `${card.name} rides on ${intel.threads.people[0]} alone — widen the thread`,
        why: "one-thread deals stall when that person goes quiet",
        control: { kind: "copy", payload: drum("mt-exec") },
        weight: 50,
      });
    }

    // stale-deal (w=40): live card, nothing in the corpus for 5 business days.
    if (isLive(card)) {
      const newest = docs[0];
      if (!newest || businessDaysBetween(newest.at, inp.now) >= 5) {
        add({
          ruleId: "stale-deal",
          subjectId: card.id,
          icon: "check",
          text: `${card.name} quiet ${newest ? businessDaysBetween(newest.at, inp.now) : 5}+ business days — check in`,
          why: newest ? `last movement ${newest.src}` : "no corpus yet",
          control: {
            kind: "mailto",
            href: `mailto:?subject=${encodeURIComponent(`Checking in — ${card.name}`)}&body=${encodeURIComponent(drum("fp-status"))}`,
          },
          weight: 40,
        });
      }
    }
  }

  return rows.sort((a, b) => b.weight - a.weight);
}

export const BRIEF_CAP = 8;

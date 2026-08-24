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

// A date in prose — month name spelled out, day-only ISO read at UTC noon.
function monthDayOf(iso: string): string {
  const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

const relay = (id: string): string => DISCOVERY.find((q) => q.id === id)?.relayLine ?? "";

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
        text: `Reply to ${person}.`,
        why: `${card.name}: unanswered since ${monthDayOf(intel.lastInbound)}.`,
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
        text: `Send ${person} times.`,
        why: `${card.name}: they asked for times.`,
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
        add({
          ruleId: "contract-chase",
          subjectId: card.id,
          icon: "owed",
          text: `Chase the signature.`,
          why: `${card.name}: contracts out since ${monthDayOf(paper.at)}, nothing signed.`,
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
          text: `List what they need in hand.`,
          why: `${intel.timing.value.phrase}, ${monthDayOf(intel.timing.value.dateIso)}.`,
          control: {
            kind: "copy",
            payload: `List what ${card.name} needs from us for the ${intel.timing.value.phrase}, and what they still owe us.`,
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
          text: `Send ${person} what you promised.`,
          why: `${card.name}: you promised “${thing}”.`,
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
        text: `Confirm ${card.name}'s stage checks.`,
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
        text: `Widen the ${card.name} thread.`,
        why: `Only ${intel.threads.people[0]} carries this deal.`,
        control: { kind: "copy", payload: relay("mt-exec") },
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
          text: `Check in with ${card.name}.`,
          why: newest ? `Quiet since ${monthDayOf(newest.at)}.` : "no corpus yet",
          control: {
            kind: "mailto",
            href: `mailto:?subject=${encodeURIComponent(`Checking in — ${card.name}`)}&body=${encodeURIComponent(relay("fp-status"))}`,
          },
          weight: 40,
        });
      }
    }
  }

  return rows.sort((a, b) => b.weight - a.weight);
}

export const BRIEF_CAP = 8;

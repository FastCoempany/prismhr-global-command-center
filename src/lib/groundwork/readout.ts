// State of play — derived, never authored (plan §9). One builder feeds both
// surfaces: the full readout and the file's "To Russ" pull tab call the same
// paragraphFor(), and buildReadout carries a paragraph for EVERY ranked
// account so the tab's paragraph always has a right-hand side in the full
// readout. Every sentence aims at the §3 bar — names introduce themselves,
// dates carry their meaning, numbers carry their denominators — and the lint
// below is the mechanical half of that bar. The readout register never leans
// on queue-row shorthand: each rule has its own plain sentence here.

import type { Peo } from "@/lib/book";
import type { DealIntel } from "@/lib/intel/types";
import { redactMoney } from "@/lib/intel/lexicon";
import type { IntentSignal } from "./signals";
import type { QueueItem } from "./day";

export type ReadoutParagraph = { accountId: string; text: string };
export type ReadoutSection = { title: string; paragraphs: ReadoutParagraph[] };
export type Readout = { asOfIso: string; sections: ReadoutSection[] };

export type ReadoutInput = {
  accounts: Peo[];
  queue: QueueItem[]; // the FULL ranked list (uncapped) — counts stay real
  intelById: Map<string, DealIntel>;
  intentById: Map<string, IntentSignal>;
  outreachAccountIds: Set<string>; // accounts with a LIVE outreach thread
  partnerUpdatesSent: number; // partner-manager updates sent, last 7 days
  partnerUpdatesReplied: number;
  nextSevenDays?: string[]; // dated items, already phrased plainly
  now: Date;
};

const monthDay = (iso: string) => {
  const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

// The identity clause every §3 paragraph opens with: who they are, where,
// and the one fact that places them in our world.
function identityClause(p: Peo): string {
  const what =
    p.industry === "PEO/ASO" || p.industry === "ASO"
      ? "a PEO"
      : p.industry === "Payroll Service Bureau"
        ? "a payroll bureau"
        : p.industry === "Staffing"
          ? "a staffing firm"
          : "a company";
  const where = [p.city, p.state].filter(Boolean).join(", ");
  const platform =
    p.cloud && p.cloud.toUpperCase() !== "N/A" ? " that runs on our software" : "";
  return `${p.name} — ${what}${where ? ` in ${where}` : ""}${platform}`;
}

const pmClause = (p: Peo): string =>
  p.csm && p.csm !== "Unassigned" ? `${p.csm}'s` : "their partner manager's";

// One account, one paragraph — THE shared builder (spec F6's one-builder
// guarantee). Composes only from facts on hand, in the readout register:
// no queue shorthand, no promises the stores don't back.
export function paragraphFor(
  p: Peo,
  args: {
    intel?: DealIntel;
    intent?: IntentSignal | null;
    queueItem?: QueueItem | null;
  },
): string {
  const bits: string[] = [];
  const dateIso = args.intel?.timing?.value.dateIso;
  const rule = args.queueItem?.ruleId;

  if (dateIso && (rule === "decision-window" || !rule)) {
    bits.push(
      `${identityClause(p)} — has a decision on their side dated ${monthDay(dateIso)}; the answer they asked us for is composed and ready to send.`,
    );
  } else if (
    rule === "reply-owed" ||
    (!rule &&
      args.intel?.lastInbound &&
      (!args.intel.lastOutbound || args.intel.lastInbound > args.intel.lastOutbound))
  ) {
    const when = args.intel?.lastInbound ? ` (${monthDay(args.intel.lastInbound)})` : "";
    bits.push(
      `${identityClause(p)} — wrote to us last${when}; the reply is composed and ready to send.`,
    );
  } else if (rule === "meeting-prep") {
    bits.push(
      `${identityClause(p)} — a dated follow-up with them lands inside 48 hours; the prep sheet is composed.`,
    );
  } else if (rule === "riding-lane") {
    bits.push(
      `${identityClause(p)} — a coworker's Salesforce opportunity there closes soon; the note asking them to carry one Global sentence in is composed.`,
    );
  } else if (rule === "roundup-slot") {
    bits.push(
      `${identityClause(p)} — ${pmClause(p)} account update is due, and this account leads it with a question they can relay word for word.`,
    );
  } else if (rule === "stale-above-gate") {
    bits.push(
      `${identityClause(p)} — our research on them is weeks old while their demand reads real; the refresh session is composed.`,
    );
  } else if (rule === "stakeholder-gap") {
    bits.push(
      `${identityClause(p)} — our records barely know anyone there; the twenty-minute session that fixes it is composed.`,
    );
  } else if (rule === "never-touched-incumbent") {
    bits.push(
      `${identityClause(p)} — already on our software and never introduced to Global; the introduction note for ${pmClause(p)} next touch is composed.`,
    );
  } else if (args.intent) {
    bits.push(
      `${identityClause(p)} — their people have been reading our Global material this week${args.intent.activities ? ` (${args.intent.activities} separate engagements)` : ""}, unprompted; they move to the top of ${pmClause(p)} next briefing.`,
    );
  } else {
    bits.push(`${identityClause(p)} — in the book, no open conversation yet.`);
  }

  if (rule === "intent-warm" && !bits[0].includes("reading our Global material")) {
    bits.push(
      `Their people have also been reading our Global material this week, unprompted.`,
    );
  }
  if (args.intel?.incumbent?.value && dateIso) {
    bits.push(
      `The record names ${args.intel.incumbent.value} as the provider handling that work for them today.`,
    );
  }
  return redactMoney(bits.join(" "));
}

export function buildReadout(inp: ReadoutInput): Readout {
  const byId = new Map(inp.accounts.map((p) => [p.id, p]));
  const queueById = new Map(inp.queue.map((q) => [q.accountId, q]));

  const para = (id: string): ReadoutParagraph | null => {
    const p = byId.get(id);
    if (!p) return null;
    return {
      accountId: id,
      text: paragraphFor(p, {
        intel: inp.intelById.get(id),
        intent: inp.intentById.get(id) ?? null,
        queueItem: queueById.get(id) ?? null,
      }),
    };
  };
  const notNull = (x: ReadoutParagraph | null): x is ReadoutParagraph => x !== null;

  const dealIds = inp.queue.filter((q) => q.weight >= 75).map((q) => q.accountId);
  const deals = dealIds.map(para).filter(notNull);

  const warmIds = [...inp.intentById.keys()].filter((id) => !dealIds.includes(id));
  const warm = warmIds.map(para).filter(notNull);

  const alsoIds = inp.queue
    .map((q) => q.accountId)
    .filter((id) => !dealIds.includes(id) && !warmIds.includes(id));
  const also = alsoIds.map(para).filter(notNull);

  const total = inp.accounts.length;
  const open = inp.outreachAccountIds.size;
  const pmCount = new Set(
    inp.accounts.map((p) => p.csm).filter((c) => c && c !== "Unassigned"),
  ).size;
  const bookText = redactMoney(
    `I cover ${total} PrismHR and PrismHCM customer accounts nationwide. ${open} of the ${total} have an open conversation on file right now. In the last 7 days I sent updates to ${inp.partnerUpdatesSent} of the ${pmCount} partner managers who own these relationships${inp.partnerUpdatesSent > 0 ? `; ${inp.partnerUpdatesReplied} replied` : ""}.`,
  );

  const sections: ReadoutSection[] = [];
  if (deals.length > 0)
    sections.push({
      title: `Conversations that could become deals — ${deals.length === 1 ? "one" : deals.length}`,
      paragraphs: deals,
    });
  if (warm.length > 0)
    sections.push({ title: "Warming, before anyone calls", paragraphs: warm });
  if (also.length > 0)
    sections.push({ title: "Also in front of me today", paragraphs: also });
  sections.push({
    title: "The rest of the book",
    paragraphs: [{ accountId: "", text: bookText }],
  });
  if (inp.nextSevenDays && inp.nextSevenDays.length > 0)
    sections.push({
      title: "Next seven days",
      paragraphs: [{ accountId: "", text: redactMoney(inp.nextSevenDays.join(" · ")) }],
    });

  return { asOfIso: inp.now.toISOString(), sections };
}

export function readoutText(r: Readout): string {
  const day = new Date(r.asOfIso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  return [
    `State of play — ${day}`,
    ...r.sections.map(
      (s) => `${s.title.toUpperCase()}.\n${s.paragraphs.map((p) => p.text).join("\n\n")}`,
    ),
  ].join("\n\n");
}

// ── The lint — the mechanical half of the §3 bar ─────────────────────────────
// Advisory: a flagged sentence renders with a quiet marker, never a block.

export type LintIssue = { kind: "banned-word" | "bare-date" | "money"; detail: string };

// Trade shorthand banned in anything read to Russ unless translated in place —
// the plan §3.1.5 list, minus words this register never needs.
const BANNED = [
  "pursuit",
  "greenfield",
  "displacement",
  "cadence",
  "warm lead",
  "the channel",
  "armed",
  "worked the",
  "the funnel",
  "pipeline coverage",
  "the gate",
  "the chair",
  "single-thread",
  "multi-thread",
];

export function lint(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const w of BANNED) {
    if (new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(text))
      issues.push({ kind: "banned-word", detail: w });
  }
  // A bare numeric date ("8/6") makes the reader do the math — dates carry
  // their month names in prose.
  if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(text))
    issues.push({ kind: "bare-date", detail: "numeric date in prose" });
  if (/[$]\s?\d/.test(text)) issues.push({ kind: "money", detail: "dollar figure" });
  return issues;
}

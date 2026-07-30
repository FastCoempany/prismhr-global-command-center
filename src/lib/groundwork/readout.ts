// State of play — derived, never authored (plan §9). One builder feeds both
// surfaces: the full readout and the file's "To Russ" pull tab call the same
// paragraphFor(), so the two can never drift. Every sentence aims at the §3
// bar — names introduce themselves, dates carry their meaning, numbers carry
// their denominators — and the lint below is the mechanical half of that bar.

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
  queue: QueueItem[];
  intelById: Map<string, DealIntel>;
  intentById: Map<string, IntentSignal>;
  outreachAccountIds: Set<string>; // accounts with an open outreach thread
  partnerUpdatesSent: number; // partner-manager updates sent this week
  partnerUpdatesReplied: number;
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

// One account, one paragraph — THE shared builder (spec F6's one-builder
// guarantee). Composes only from facts on hand; absent facts produce shorter
// paragraphs, never invented ones.
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
  if (dateIso) {
    bits.push(
      `${identityClause(p)} — makes their call on ${monthDay(dateIso)}, and what they're waiting on from us goes out today.`,
    );
  } else if (
    args.intel?.lastInbound &&
    (!args.intel.lastOutbound || args.intel.lastInbound > args.intel.lastOutbound)
  ) {
    bits.push(
      `${identityClause(p)} — wrote to us last (${monthDay(args.intel.lastInbound)}), and the answer they're owed goes out today.`,
    );
  } else if (args.intent) {
    bits.push(
      `${identityClause(p)} — their people have been reading our Global material this week${args.intent.activities ? ` (${args.intent.activities} separate engagements)` : ""}, unprompted; they move to the top of ${p.csm && p.csm !== "Unassigned" ? `${p.csm}'s` : "their partner manager's"} next briefing.`,
    );
  } else if (args.queueItem) {
    bits.push(`${identityClause(p)} — ${args.queueItem.situation}.`);
  } else {
    bits.push(`${identityClause(p)} — in the book, no open conversation yet.`);
  }
  if (args.intel?.incumbent?.value && dateIso) {
    bits.push(
      `Today that business goes to ${args.intel.incumbent.value}, and they earn nothing on it.`,
    );
  }
  return redactMoney(bits.join(" "));
}

export function buildReadout(inp: ReadoutInput): Readout {
  const byId = new Map(inp.accounts.map((p) => [p.id, p]));
  const queueById = new Map(inp.queue.map((q) => [q.accountId, q]));

  const dealIds = inp.queue.filter((q) => q.weight >= 75).map((q) => q.accountId);
  const deals: ReadoutParagraph[] = dealIds
    .map((id) => {
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
    })
    .filter((x): x is ReadoutParagraph => x !== null);

  const warm: ReadoutParagraph[] = [...inp.intentById.entries()]
    .filter(([id]) => !dealIds.includes(id))
    .map(([id, sig]) => {
      const p = byId.get(id);
      if (!p) return null;
      return {
        accountId: id,
        text: paragraphFor(p, { intent: sig, intel: inp.intelById.get(id) }),
      };
    })
    .filter((x): x is ReadoutParagraph => x !== null);

  const total = inp.accounts.length;
  const open = inp.outreachAccountIds.size;
  const bookText = redactMoney(
    `I cover ${total} PrismHR and PrismHCM customer accounts nationwide. ${open} of the ${total} have an open conversation on file right now. This week I sent updates to ${inp.partnerUpdatesSent} of the 6 partner managers who own these relationships${inp.partnerUpdatesSent > 0 ? `; ${inp.partnerUpdatesReplied} replied` : ""}.`,
  );

  const sections: ReadoutSection[] = [];
  if (deals.length > 0)
    sections.push({
      title: `Conversations that could become deals — ${deals.length === 1 ? "one" : deals.length}`,
      paragraphs: deals,
    });
  if (warm.length > 0)
    sections.push({ title: "Warming, before anyone calls", paragraphs: warm });
  sections.push({
    title: "The rest of the book",
    paragraphs: [{ accountId: "", text: bookText }],
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

// Trade shorthand banned in anything read to Russ unless translated in place.
// "thread"/"chair"/"incumbent" et al. are fine inside the app's own chrome —
// this list guards the readout's prose only.
const BANNED = [
  "pursuit",
  "greenfield",
  "displacement",
  "cadence",
  "warm lead",
  "the channel",
  "armed",
  "worked the",
];

export function lint(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const w of BANNED) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text))
      issues.push({ kind: "banned-word", detail: w });
  }
  // A bare numeric date ("8/6") makes the reader do the math — dates carry
  // their month names in prose.
  if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(text))
    issues.push({ kind: "bare-date", detail: "numeric date in prose" });
  if (/[$]\s?\d/.test(text)) issues.push({ kind: "money", detail: "dollar figure" });
  return issues;
}

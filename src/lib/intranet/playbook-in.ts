// Phase 5 · THE PLAYBOOK AND THE DEMO CORPUS.
//
// Two jobs that belong together because they are both about *what we know how
// to sell with*, and because both would otherwise be swept up wrongly by the
// generic mirror.
//
//   · The Playbook goes in whole and KEEPS ITS STRUCTURE. A battlecard question
//     flattened to prose is retrievable by its words; a battlecard question
//     carrying its category, phase, audience and product line is retrievable by
//     the SITUATION it belongs to, which is how anyone actually looks for one.
//
//   · Demo transcripts are mined for what the PROSPECT asked (C7). A buyer's
//     question is not an ordinary claim — it is the window into how they think,
//     and the founder named it as the thing most worth indexing.

import { PRODUCT_BANK } from "@/lib/intel/discovery-product";
import { DISCOVERY } from "@/lib/intel/discovery";
import { SCENARIOS } from "@/lib/intel/scenarios";
import { PROSPECT_TOPIC_LABEL, type AskShape } from "./doctrine";
import type { MirrorDoc } from "./mirror";

/** Every battlecard question as a document. The facets ride along as entities,
 *  so "what do we ask a prospect who has never run international payroll" finds
 *  them by situation rather than by keyword. */
export function playbookQuestionDocs(): MirrorDoc[] {
  const bank = [...DISCOVERY, ...PRODUCT_BANK];
  const seen = new Set<string>();
  const out: MirrorDoc[] = [];

  for (const q of bank) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const product = (q as { product?: string }).product ?? "any";
    const body = [
      `A discovery question we ask: "${q.question}"`,
      q.why ? `We ask it because ${q.why}` : "",
      q.listenFor?.length ? `What to listen for: ${q.listenFor.join("; ")}.` : "",
      q.followUp ? `The follow-up: ${q.followUp}` : "",
      q.drumLine ? `Said plainly: "${q.drumLine}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    out.push({
      origin: "playbook",
      originRef: `question:${q.id}`,
      space: "Playbook",
      title: `Question — ${q.question.slice(0, 70)}`,
      body,
      speakers: ["the Playbook"],
      occurredAt: new Date(0).toISOString(),
      accountId: "",
      // Facets as entities. Never people (C4).
      ...({
        entities: [q.category, q.phase, q.audience, product].filter(Boolean),
      } as object),
    });
  }
  return out;
}

/** Each scenario as a document — the buyer situation and what it changes. */
export function playbookScenarioDocs(): MirrorDoc[] {
  return SCENARIOS.map((s) => ({
    origin: "playbook" as const,
    originRef: `scenario:${s.id}`,
    space: "Playbook",
    title: `Scenario — ${s.label}`,
    body: [
      `A buyer situation we sell into: ${s.label}.`,
      s.blurb ?? "",
      s.traps?.length ? `What to watch for: ${s.traps.join("; ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    speakers: ["the Playbook"],
    occurredAt: new Date(0).toISOString(),
    accountId: "",
  }));
}

/** A market fact or lesson the app already learned, as a document. */
export function playbookKnowledgeDoc(row: {
  id: string;
  ns: "market" | "lessons";
  text: string;
  account: string;
  createdAt: string;
}): MirrorDoc | null {
  const text = (row.text ?? "").trim();
  if (!text) return null;
  return {
    origin: "playbook",
    originRef: `${row.ns}:${row.id}`,
    space: "Playbook",
    title: `${row.ns === "market" ? "Market fact" : "Lesson"} — ${text.slice(0, 60)}`,
    body:
      row.ns === "market"
        ? `Something we know about the market: ${text}${row.account ? ` (learned on ${row.account})` : ""}`
        : `A lesson from a deal: ${text}${row.account ? ` (${row.account})` : ""}`,
    speakers: ["the Playbook"],
    occurredAt: row.createdAt,
    accountId: "",
  };
}

// ── prospect questions (C7) ─────────────────────────────────────────────────

/** The seeded root. Every other topic is discovered; this one is allowed to
 *  exist from the start, because the founder named it as the window to winning
 *  deals and because the first demo transcript needs somewhere to land. */
export const PROSPECT_ROOT = {
  label: PROSPECT_TOPIC_LABEL,
  summary:
    "What buyers actually ask in demos — the shape of the question, and the moment that provoked it.",
};

/** The children the root decomposes into. Seeded rather than discovered for the
 *  same reason: the shapes are known in advance, and an empty rail teaches
 *  nothing. */
export const PROSPECT_SHAPE_TOPICS: {
  shape: AskShape;
  label: string;
  summary: string;
}[] = [
  {
    shape: "definitional",
    label: "They don't know what it is",
    summary:
      "Questions where the buyer is still working out what a thing means — usually a sign the framing before it failed.",
  },
  {
    shape: "commercial",
    label: "Price, terms and structure",
    summary: "What it costs, how it is billed, and what shape the agreement takes.",
  },
  {
    shape: "risk",
    label: "Exposure and compliance",
    summary: "Where the buyer thinks they might get hurt.",
  },
  {
    shape: "technical",
    label: "Platform, data and integration",
    summary: "How it connects to what they already run.",
  },
  {
    shape: "process",
    label: "How it works day to day",
    summary: "What actually happens on a Tuesday once this is live.",
  },
  {
    shape: "timeline",
    label: "How long, and when",
    summary: "Sequencing, go-live, and what has to happen first.",
  },
];

/** Whether a transcript is a demo — the corpus C7 cares most about. */
export function isDemoOrigin(origin: string): boolean {
  return origin === "demo";
}

/** The Playbook's own namespaces, so the generic mirror can defer them here
 *  rather than double-filing every lesson (Phase 5.3). */
export function isPlaybookNamespace(accountId: string): boolean {
  return (accountId ?? "").startsWith("playbook:");
}

/** A one-line read of what a prospect question tells us, used in the rail and
 *  in the harvest proposal. A definitional question right after the EOR
 *  explanation means the framing failed — that is the intelligence, not the
 *  question itself. */
export function askShapeRead(shape: AskShape | string, prompted: string): string {
  const what: Record<string, string> = {
    definitional: "they were still working out what it is",
    commercial: "they were pricing it in their head",
    risk: "they were looking for where this could hurt them",
    technical: "they were fitting it to what they already run",
    process: "they were imagining the day-to-day",
    timeline: "they were sequencing it",
  };
  const base = what[shape] ?? "they wanted to understand it";
  return prompted ? `${base}, right after ${prompted}` : base;
}

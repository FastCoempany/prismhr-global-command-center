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
import { type AskShape } from "./doctrine";
import { clean, type MirrorDoc } from "./mirror";

/** Every battlecard question as a document. The facets ride along as entities,
 *  so "what do we ask a prospect who has never run international payroll" finds
 *  them by situation rather than by keyword. */
export function playbookQuestionDocs(): MirrorDoc[] {
  const bank = [...DISCOVERY, ...PRODUCT_BANK];
  const seen = new Set<string>();
  const out: MirrorDoc[] = [];

  // The brain reads filled text — a stored "{countries}" would surface
  // verbatim in ask-the-app citations (pass-two finding, 2026-08-24).
  const fill = (s: string) => s.replaceAll("{countries}", "those countries");

  for (const q of bank) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const product = (q as { product?: string }).product ?? "any";
    const body = [
      `A discovery question we ask: "${fill(q.question)}"`,
      q.why ? `We ask it because ${fill(q.why)}` : "",
      q.listenFor?.length
        ? `What to listen for: ${q.listenFor.map(fill).join("; ")}.`
        : "",
      q.followUp ? `The follow-up: ${fill(q.followUp)}` : "",
      q.relayLine ? `Said plainly: "${fill(q.relayLine)}"` : "",
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
  // F8 · a lesson is operator prose and can carry a quoted figure.
  const text = clean((row.text ?? "").trim());
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

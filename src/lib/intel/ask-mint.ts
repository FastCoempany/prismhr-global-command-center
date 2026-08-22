// The carousel's refill. Waving off an irrelevant ask advances to the next one
// in the queue; when the queue runs dry the app mints more — and mints them
// BETTER, because by then it knows more: the countries, the product line, the
// scenario, what the research pass found, what the playbook has learned across
// every other deal, and every ask already used here (so nothing repeats).
//
// This is the only place in the app that asks a model for questions rather than
// for a reading of something the operator pasted.

import Anthropic from "@anthropic-ai/sdk";
import { claudeClient } from "@/lib/claude/health";
import { redactMoney } from "@/lib/intel/lexicon";

const SYSTEM = `You generate discovery questions for a consultant selling international employment services — employer of record, contractor management, and global payroll — into US staffing, PEO and HR service providers and their clients.

Write questions that could only be asked of THIS company. Every one must turn on something in the context you are given: their countries, their worker types, their product fit, their stage, the scenario, what the research found. A question that would fit any company is a failed question.

Ground them in how international employment actually works: permanent-establishment exposure, misclassification tests that differ by country, notice and severance regimes, benefits parity, work authorization versus residence, statutory filing calendars, entity-versus-EOR economics, payment corridors and FX, data-privacy obligations on employee data.

Rules:
- One question per question. No stacking with "and".
- Never mention a price, a fee, or any currency amount.
- Never repeat, in substance, any question in the ALREADY ASKED list.
- Plain sentences a peer would say out loud. No preamble, no "I was wondering".
- Never use the word "steps".
- Each under 180 characters.

Reply with ONLY a JSON array of strings inside a \`\`\`json fence.`;

export function parseAsks(raw: string, cap = 5): string[] {
  const fence = /```json\s*([\s\S]*?)```/i.exec(raw ?? "");
  const body = fence ? fence[1] : (raw ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.trim());
  } catch {
    const i = body.indexOf("[");
    const j = body.lastIndexOf("]");
    if (i < 0 || j <= i) return [];
    try {
      parsed = JSON.parse(body.slice(i, j + 1));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  for (const x of parsed) {
    if (typeof x !== "string") continue;
    const q = redactMoney(x.trim()).slice(0, 180);
    if (q.length < 12 || /\bsteps?\b/i.test(q)) continue;
    out.push(q);
    if (out.length >= cap) break;
  }
  return out;
}

export type MintContext = {
  accountName: string;
  countries: string[];
  products: string[];
  stage: string;
  scenario: { label: string; blurb: string } | null;
  research: string; // the research summary + signals, already redacted
  lessons: string[]; // what the book learned elsewhere
  asked: string[]; // every ask already queued or waved off here
};

export function mintPrompt(c: MintContext): string {
  const block = (k: string, v: string) => (v ? `${k}: ${v}\n` : "");
  return [
    `COMPANY: ${c.accountName}`,
    block("COUNTRIES", c.countries.join(", ")),
    block("PRODUCT FIT", c.products.join(", ")),
    block("STAGE", c.stage),
    c.scenario ? `SCENARIO: ${c.scenario.label} — ${c.scenario.blurb}\n` : "",
    block("RESEARCH", c.research),
    c.lessons.length
      ? `WHAT OTHER DEALS TAUGHT:\n${c.lessons.map((l) => `- ${l}`).join("\n")}\n`
      : "",
    c.asked.length
      ? `ALREADY ASKED — do not repeat any of these:\n${c.asked.map((a) => `- ${a}`).join("\n")}\n`
      : "",
    `Write 5 questions.`,
  ]
    .filter(Boolean)
    .join("");
}

export async function mintAsks(c: MintContext, cap = 5): Promise<string[]> {
  const client = claudeClient({ timeout: 55_000, maxRetries: 1 });
  const msg = await client.messages.create({
    model: "claude-opus-5",
    // Five grounded questions is a small answer, but the ceiling has to leave
    // room for the model's own reasoning ahead of them — a truncated reply is a
    // silent empty list otherwise.
    max_tokens: 6144,
    system: SYSTEM,
    messages: [{ role: "user", content: mintPrompt(c) }],
  });
  if (msg.stop_reason === "max_tokens") throw new Error("the mint ran long — try again");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return parseAsks(text, cap);
}

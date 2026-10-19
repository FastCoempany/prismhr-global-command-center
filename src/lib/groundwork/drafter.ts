// The stage's drafter (ship order 2026-10-19): one email per move, written
// before the send band by the drafts job and again on Redraft. It reads the
// move, the person, and the evidence the move stands on, and writes in the
// seller's voice to a prospect, so the plain-speech law applies in full
// (CLAUDE.md, "The plain-speech law" and the playbook canon's armer
// doctrine). It never sends and never files; the draft is a stagedraft:
// note, and what went out reaches the record by the sent copy.

import type Anthropic from "@anthropic-ai/sdk";
import { claudeAvailable, claudeClient } from "@/lib/claude/health";
import { MODEL_STAGE_DRAFT } from "@/lib/intranet/doctrine";
import { OPERATOR_NAME } from "@/lib/intel/provenance";
import { redactMoney } from "@/lib/intel/lexicon";
import { EVIDENCE_KEYS, type EvidenceKey } from "./stage-draft";

export type DraftPack = {
  account: string;
  /** The queue's own pair: what to do today and the trigger. */
  action: string;
  reason: string;
  to: { name: string; title: string };
  /** The rule's composed note, the starting point the model improves on. */
  template: { subject: string; body: string };
  wire: string;
  research: string;
  gem: { act: string; reason: string } | null;
  intent: { opens30: number; clicks30: number } | null;
  support: number | null;
  /** The record's newest heads, newest first, money redacted. */
  record: string[];
  /** The quiet flag as an instruction, "" when clear. */
  collision: string;
};

export const DRAFTER_SYSTEM = `You write one outreach email for ${OPERATOR_NAME}, Sr. Global Business Consultant at PrismHR Global. PrismHR Global employs and pays people outside the US (employer of record, global payroll, contractor management) for PEOs that already run on PrismHR software. The reader is a person at a PEO. This is a channel sale: the same partner across the table for years, so the email offers help and never makes them account for themselves.

Voice, binding:
- Plain sentences a peer would say out loud. Short paragraphs, under 110 words in all. One clear ask, and it is easy to say yes or no to.
- Say what prompted the note first, as a plain fact the reader already knows about themselves (their news, their post, their new role, the thread you share). Never tell them how you know something they did not tell you: never mention opens, clicks, support cases, tickets, intent, alerts, or that anyone was watching.
- No rhetorical devices: no "not X, but Y", no paradox, no maxims, no redefining a word, no "statement, dash, implication" closers, no three-beat build-ups, no ABBA inversions. No invented slang, no constructed phrasing, no reassurance flourishes ("no pressure", "no judgment"). Read each line flat: if it only sounds good, cut it.
- No hedging ("it may be worth", "you might want to", "consider"). No em-dash asides. No parentheticals.
- A PEO's clients ARE its book. A need is either internal (the PEO's own) or a client's. Never write "X-shaped", "their own book" or "domestic-only".
- Nothing invented: no facts, names, dates, numbers or claims the context does not state. Money figures never appear.
- No pipeline talk, nothing about deals, quotas, campaigns or sequences.
- Sign off with "${OPERATOR_NAME.split(" ")[0]}" alone; the mail client carries the block.

Return ONLY a JSON object: {"subject": "...", "body": "...", "uses": [...]}. body is plain text with blank lines between paragraphs, starting with the greeting. uses lists which context items the email actually draws on, from: ${EVIDENCE_KEYS.join(", ")}.`;

export function drafterPrompt(p: DraftPack): string {
  const lines = [
    `ACCOUNT: ${p.account}`,
    `TO: ${p.to.name || "(no name on file; greet without a name)"}${p.to.title ? `, ${p.to.title}` : ""}`,
    `TODAY'S MOVE: ${p.action} The trigger: ${p.reason}`,
    p.wire ? `wire: ${p.wire}` : "",
    p.research ? `research: ${p.research}` : "",
    p.gem ? `gem: ${p.gem.reason} The act: ${p.gem.act}` : "",
    p.intent
      ? `intent: they opened ${p.intent.opens30} and clicked ${p.intent.clicks30} of our marketing emails in 30 days. Use it to judge the tone only; never mention it.`
      : "",
    p.support
      ? `support: ${p.support} support cases with us in 90 days. Context only; never mention it in a cold note.`
      : "",
    p.record.length
      ? `record (newest first):\n${p.record.map((r) => `- ${r}`).join("\n")}`
      : "record: nothing filed yet. This is a first touch.",
    "person: the recipient's name and title above.",
    p.collision ? `NOTE: ${p.collision}` : "",
    `THE COMPOSER'S NOTE, a starting point that breaks the voice rules; keep its ask, rewrite its words:\nSubject: ${p.template.subject}\n${p.template.body}`,
  ];
  return redactMoney(lines.filter(Boolean).join("\n\n"));
}

/** The model's answer, read and checked: a body, a subject, the evidence it
 *  used. Null when it did not parse or came back empty. */
export function readDraftAnswer(
  text: string,
): { subject: string; body: string; uses: EvidenceKey[] } | null {
  const a = text.indexOf("{");
  const z = text.lastIndexOf("}");
  if (a < 0 || z <= a) return null;
  try {
    const j = JSON.parse(text.slice(a, z + 1)) as {
      subject?: unknown;
      body?: unknown;
      uses?: unknown;
    };
    const body = redactMoney(typeof j.body === "string" ? j.body.trim() : "");
    if (!body) return null;
    const uses = Array.isArray(j.uses)
      ? j.uses.filter((u): u is EvidenceKey =>
          (EVIDENCE_KEYS as readonly string[]).includes(String(u)),
        )
      : [];
    return {
      subject: redactMoney(typeof j.subject === "string" ? j.subject.trim() : "").slice(
        0,
        140,
      ),
      body,
      uses,
    };
  } catch {
    return null;
  }
}

/** One draft from the model, or null when the brain is down or the answer
 *  did not hold. The caller falls back to the composer's note. */
export async function draftWithModel(
  p: DraftPack,
): Promise<{ subject: string; body: string; uses: EvidenceKey[] } | null> {
  if (!claudeAvailable()) return null;
  try {
    const client = claudeClient({ timeout: 120_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: MODEL_STAGE_DRAFT,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: DRAFTER_SYSTEM,
      messages: [{ role: "user", content: drafterPrompt(p) }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return readDraftAnswer(text);
  } catch {
    return null;
  }
}

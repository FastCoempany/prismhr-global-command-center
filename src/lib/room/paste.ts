// roomPaste's pure decisions, kept out of the server action so the suite can
// pin them as behavior: which dialect a capture speaks, what source column it
// files under, the misfile guard's read-free rung, and the transcriber's ask.

import { HEADS, SOURCE_OF, sniffHead, type Dialect } from "@/lib/ingest/dialect";
import { judgeFiling } from "@/lib/intel/misfile";
import type { RouteAccount } from "@/lib/route-capture";

/** The refusal roomPaste hands back when the guard objects: nothing filed,
 *  nothing opened, the dispute carried for the banner. */
export type PasteRefusal = {
  ok: false;
  filed: 0;
  how: "";
  mismatch: { claim: string; bound: string; why?: string; boundWhy?: string };
  reason: string;
};

/** The misfile guard's FIRST rung, which runs before the read spends a cent
 *  (decreed 2026-09-04). The evidence in the text — a known address, a company
 *  domain, a person the book binds to one account — needs no model at all, so
 *  a capture dropped on the wrong row is refused for free rather than after a
 *  full read. Returns the refusal, or null when the row clears the text. */
export function readFreeVerdict(
  rawText: string,
  acct: { id: string; name: string },
  roster: readonly RouteAccount[],
): PasteRefusal | null {
  const early = judgeFiling({
    text: rawText,
    claim: "",
    bound: { id: acct.id, name: acct.name },
    roster,
  });
  if (early.ok) return null;
  return {
    ok: false,
    filed: 0,
    how: "",
    mismatch: {
      claim: early.claim,
      bound: early.bound,
      why: early.why,
      boundWhy: early.boundWhy,
    },
    reason: `This reads like ${early.claim}, not ${acct.name} — ${early.why}.`,
  };
}

/** The capture's dialect, read off its head token. An Outlook thread must
 *  never masquerade as Salesforce activity. The alphabet, the sniff and the
 *  source table live in src/lib/ingest/dialect.ts; these two keep their names
 *  and their answers for roomPaste's callers and the suites that pin them. */
export type { Dialect } from "@/lib/ingest/dialect";

export function dialectOf(rawText: string): Dialect {
  return sniffHead(rawText).dialect;
}

/** The source column a filed entry carries: the dialect's own name, with the
 *  model's suffix when the read was the model's. */
export function sourceFor(dialect: Dialect, how: string): string {
  return SOURCE_OF(dialect, null, how);
}

/** The document transcriber's ask. Claude reads a PDF or an image to the
 *  paste text the room's readers understand, so every head it may write is
 *  the table's own: an email thread comes back headed OUTLOOK THREAD, a chat
 *  TEAMS THREAD, and a call CALL TRANSCRIPT with its Recorded line when the
 *  document says when the call happened (ruled 2026-09-25, D3 — CLAUDE.md,
 *  The Chute), so the tape's cap, its archive and its filing day all follow.
 *  Anything else comes back as plain text under no head. */
export function transcriberPrompt(kind: "image" | "document", filename: string): string {
  return `Transcribe this ${kind} to plain text for a sales record. If it shows an email thread, start the output with "${HEADS.outlook} — ${filename}" and give each message its own From / To / Sent / Subject header block, newest first, with the message text under it. If it shows a chat, start with "${HEADS.teams} — ${filename}" and keep speakers named inline. If it shows a transcript of a call or a meeting, start with "${HEADS.call} — ${filename}", then a line "Recorded: YYYY-MM-DD HH:MM" when the document says when the call took place (leave that line out when it does not), then one line per turn as "Speaker Name: what they said", every turn in order. If it is a screenshot of anything else — a slide, a whiteboard, a card, handwriting — transcribe every readable word in reading order and describe only what is needed to make the text make sense. Output only the transcription.`;
}

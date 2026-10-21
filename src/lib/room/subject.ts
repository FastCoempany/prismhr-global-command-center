// A subject as a person reads it, and the head's subject slot (ship order
// 2026-10-20; CLAUDE.md, The email in the row). Pure, and reaching nothing on
// the server, so the room's client reads and edits a subject the way the
// page's read does: the ✎ edit's echo shows what the page will show.

import { LEGACY_HEAD_START_RE, LEGACY_SUBJECT_RE } from "@/lib/ingest/dialect";

/** The placeholders the paste pipeline writes when the read names nothing. */
const NO_SUBJECT = /^\(no subject\)$/i;
const UNATTRIBUTED = /^\(unattributed\)$/i;
/** The Act Lane's send (src/lib/act/lane.ts): "✉ <subject> — sent to <to>." */
const ACT_SENT = /^✉ (.*?) — sent to (.+?)\.?$/;

/** A subject as a person reads it: the external tags, the marks and the reply
 *  and forward prefixes gone, the words as written. */
export function cleanSubject(s: string): string {
  let t = (s ?? "")
    .replace(/\[\s*(?:EXTERNAL|EXT|External Email)\s*\]/gi, " ")
    .replace(/❗/g, " ");
  for (;;) {
    const next = t.replace(
      /^[\s!*:|-]*(?:re|fw|fwd|aw|sv|wg|rv|tr|res|enc|external)\s*(?:\[\d+\])?\s*:\s*/i,
      "",
    );
    if (next === t) break;
    t = next;
  }
  t = t.replace(/\s+/g, " ").trim();
  return !t || NO_SUBJECT.test(t) ? "No subject" : t;
}

/** The entry head's subject and who, when the line is one. */
export function headParts(head: string): { subject: string; who: string } | null {
  const sent = ACT_SENT.exec(head);
  if (sent) return { subject: sent[1], who: "" };
  if (!LEGACY_HEAD_START_RE.test(head)) return null;
  const m = LEGACY_SUBJECT_RE.exec(head);
  const unlabel = (w: string) => (UNATTRIBUTED.test(w.trim()) ? "" : w.trim());
  if (m) {
    const dot = head.lastIndexOf(" · ");
    return { subject: m[1], who: dot >= 0 ? unlabel(head.slice(dot + 3)) : "" };
  }
  const dash = head.indexOf("— ");
  return dash >= 0 ? { subject: head.slice(dash + 2), who: "" } : null;
}

/** The stored first line with a new subject in its slot: ✎ on a filed
 *  activity edits the subject a person reads, and the head keeps its
 *  glyph, format code, clock and who, which the readers parse. A line that
 *  is not an entry head is the edit itself. */
export function withSubject(head: string, subject: string): string {
  const s = subject.replace(/\s+/g, " ").trim();
  const sent = /^✉ .*?( — sent to .+)$/.exec(head);
  if (sent) return `✉ ${s}${sent[1]}`;
  if (!headParts(head)) return s;
  const dash = head.indexOf("— ");
  const dot = head.lastIndexOf(" · ");
  return dot > dash
    ? `${head.slice(0, dash + 2)}${s}${head.slice(dot)}`
    : `${head.slice(0, dash + 2)}${s}`;
}

// A promise closes by delivery (the closer rule, founder-decreed 2026-08-22)
// — and until now nothing read the delivery.
//
// On 2026-09-04 the operator told Joseph Lyon "calendar invite to follow" at
// 10:32 AM, sent the Zoom invite at 3:34 PM, and Joseph accepted it at 3:49
// PM. The meeting was booked. The row still carried "you owe: send invite for
// the Mon Sep 14 window" and TWO open commitments saying send the invite,
// because the register only ever knew what was promised, never what landed.
//
// This reads the landing. The evidence bar is deliberately the highest one
// available: not our own claim to have sent something, but the COUNTERPARTY'S
// acceptance — the calendar itself confirming the meeting exists. Our own
// side's acceptance is no such proof, and settles nothing (S-8). A promise
// to get a meeting on the books cannot still be owed once the other side has
// accepted it.
//
// Scope is narrow on purpose. This settles scheduling promises only, the one
// class where the record carries unambiguous proof. Every other commitment
// stays open until the operator closes it, because a fuzzy text match against
// a later send would close real work on a resemblance. Nothing here writes:
// the stored commitment is untouched and the operator still holds the ✓. The
// row simply stops instructing you to do a thing the record shows you did.

import { effectiveAt } from "@/lib/intel/clock";
import { docOf } from "@/lib/record/docs";
import { isTheirAcceptance } from "@/lib/record/whose-move";

/** Commitments about getting a meeting onto the calendar. */
const SCHEDULING_RE =
  /\b(invit(?:e|ation)|calendar|booking link|calendly|schedule(?:d|s)? (?:the|a|it)|get (?:the|a) (?:call|meeting|demo)\b.*\b(?:on|booked)|put (?:time|it) on)\b/i;

type Settlement = { why: string; at: string };

/** A record row as the room hands it: the wide loader's row, or the sheet's
 *  narrower one. */
type SettleRow = {
  id?: string;
  body: string;
  createdAt: string;
  actors?: string;
  recipients?: string | null;
  source?: string;
};

const NONE_HIDDEN: ReadonlySet<string> = new Set();

/** Does the record show this commitment already landed? Returns the receipt
 *  when it does, null when the commitment stands. `homeSide` is the room's
 *  declared roster, so a colleague's acceptance reads as ours. */
export function settledByRecord(
  commitment: { text: string; at: string },
  notes: readonly SettleRow[],
  homeSide: readonly string[] = [],
): Settlement | null {
  const text = commitment.text ?? "";
  if (!SCHEDULING_RE.test(text)) return null;
  const promisedAt = Date.parse(effectiveAt(commitment.at, ""));
  if (Number.isNaN(promisedAt)) return null;

  for (const n of notes ?? []) {
    // Their acceptance, by the account read's own rule (isTheirAcceptance,
    // pass 9 seam S-8): an attributed sender who is not ours. The operator
    // answering their invite, a colleague on it, or an acceptance that names
    // nobody is not the counterparty saying yes, and our own side accepting
    // books nothing (CLAUDE.md, the Sendbook, BOOKED). Every row here is a
    // filed row, so one with no id still stands as one.
    const d = docOf(
      {
        id: n.id || "row",
        kind: "account",
        body: n.body ?? "",
        createdAt: n.createdAt,
        ...(n.actors ? { actors: n.actors } : {}),
        ...(n.recipients ? { recipients: n.recipients } : {}),
        ...(n.source ? { source: n.source } : {}),
      },
      homeSide,
      NONE_HIDDEN,
    );
    if (!isTheirAcceptance(d)) continue;
    // The acceptance has to POSTDATE the promise — an older meeting on the
    // books never settles a commitment made after it.
    const at = Date.parse(d.at);
    if (Number.isNaN(at) || at < promisedAt) continue;
    return { why: "they accepted the invitation", at: new Date(at).toISOString() };
  }
  return null;
}

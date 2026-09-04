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
// acceptance — the calendar itself confirming the meeting exists. A promise
// to get a meeting on the books cannot still be owed once the other side has
// accepted it.
//
// Scope is narrow on purpose. This settles scheduling promises only, the one
// class where the record carries unambiguous proof. Every other commitment
// stays open until the operator closes it, because a fuzzy text match against
// a later send would close real work on a resemblance. Nothing here writes:
// the stored commitment is untouched and the operator still holds the ✓. The
// row simply stops instructing you to do a thing the record shows you did.

import { isMeetingResponse } from "@/lib/intel/closer";
import { effectiveAt } from "@/lib/intel/clock";

/** Commitments about getting a meeting onto the calendar. */
const SCHEDULING_RE =
  /\b(invit(?:e|ation)|calendar|booking link|calendly|schedule(?:d|s)? (?:the|a|it)|get (?:the|a) (?:call|meeting|demo)\b.*\b(?:on|booked)|put (?:time|it) on)\b/i;

/** A response that says the meeting is ON — declines and tentatives prove
 *  nothing was settled, so only an acceptance counts. */
const ACCEPTED_RE = /(?:^|—\s*)Accepted\s*:/i;

function acceptedHead(body: string): boolean {
  const line = (body ?? "").split("\n")[0] ?? "";
  if (!isMeetingResponse(line)) return false;
  const dash = line.indexOf("—");
  const subject = dash >= 0 ? line.slice(dash + 1) : line;
  return ACCEPTED_RE.test(`— ${subject.trim()}`);
}

export type Settlement = { why: string; at: string };

/** Does the record show this commitment already landed? Returns the receipt
 *  when it does, null when the commitment stands. */
export function settledByRecord(
  commitment: { text: string; at: string },
  notes: readonly { body: string; createdAt: string }[],
): Settlement | null {
  const text = commitment.text ?? "";
  if (!SCHEDULING_RE.test(text)) return null;
  const promisedAt = Date.parse(effectiveAt(commitment.at, ""));
  if (Number.isNaN(promisedAt)) return null;

  for (const n of notes ?? []) {
    const body = n.body ?? "";
    if (!acceptedHead(body)) continue;
    // The acceptance has to POSTDATE the promise — an older meeting on the
    // books never settles a commitment made after it.
    const at = Date.parse(effectiveAt(n.createdAt, body));
    if (Number.isNaN(at) || at < promisedAt) continue;
    return { why: "they accepted the invitation", at: new Date(at).toISOString() };
  }
  return null;
}

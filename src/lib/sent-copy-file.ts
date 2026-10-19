// Filing a sent copy, an inbox copy or a calendar event (2026-10-19): the sent copy routed by
// its recipients alone, the inbox copy by its sender alone, then through the
// paste pipeline as the inbound door. Both doors a sent copy can
// arrive by call this: the flow's HTTP post to /inbound/sent, and the relay,
// a tagged email the inbound service posts to /inbound/salesnav. The answer
// carries counts and the rung, never a name, an address or a line of the
// email.

import { hasDatabaseEnv } from "@/lib/db";
import { joinedRoster } from "@/lib/ingest/route";
import { pasteCapture } from "@/lib/room/paste-core";
import {
  calendarMeeting,
  routeCalendarCopy,
  routeInboxCopy,
  routeSentCopy,
  sentCopyText,
  type SentCopy,
} from "@/lib/sent-copy";
import { contactsFor } from "@/lib/book/contacts";
import { OPERATOR_NAME } from "@/lib/intel/provenance";
import { SOURCES } from "@/lib/ingest/dialect";
import { claimCapture, pasteKeyOf, releaseCapture } from "@/lib/ingest/filing";
import { stampPasteMark } from "@/lib/ingest/grab-server";
import { createAccountNoteRow } from "@/lib/notes/write";
import { pasteFingerprint } from "@/lib/paste-files";

export type SentFiled = {
  ok: boolean;
  filed: number;
  rung?: string;
  duplicate?: boolean;
  held?: boolean;
  reason?: string;
};

export async function fileSentCopy(
  copy: SentCopy,
  kind: "sent" | "inbox" = "sent",
): Promise<SentFiled> {
  const roster = await joinedRoster();
  const hit =
    kind === "inbox" ? routeInboxCopy(copy, roster) : routeSentCopy(copy, roster);
  if (!hit)
    return {
      ok: true,
      filed: 0,
      reason:
        kind === "inbox"
          ? "No book person by address or domain. Nothing filed."
          : "No book account by address or domain. Nothing filed.",
    };
  const r = await pasteCapture(
    hit.id,
    sentCopyText(copy, kind === "inbox" ? "inbox copy" : "sent copy"),
    { door: "inbound" },
    async () => hasDatabaseEnv(),
  );
  return {
    ok: r.ok,
    filed: r.filed,
    rung: hit.rung,
    ...(r.duplicate ? { duplicate: true } : {}),
    ...(r.mismatch ? { held: true } : {}),
    ...(!r.ok && r.reason ? { reason: r.reason } : {}),
  };
}

/** A calendar event, filed as a meeting held on the account its attendees
 *  name. It is a logged activity, not a capture to read, so it files as one
 *  record row through the one writer, behind the duplicate guard's claim: a
 *  flow that relays the same event twice files it once. */
export async function fileCalendarCopy(
  copy: SentCopy,
  now = new Date(),
): Promise<SentFiled> {
  const routed = routeCalendarCopy(copy, await joinedRoster());
  if (!routed)
    return {
      ok: true,
      filed: 0,
      reason: "No book account among the attendees. Nothing filed.",
    };
  const { hit, emails } = routed;
  const book = contactsFor(hit.id);
  const people = emails.map((email) => {
    const c = book.find((b) => (b.email ?? "").toLowerCase() === email);
    return { email, name: c ? [c.first, c.last].filter(Boolean).join(" ") : "" };
  });
  const meeting = calendarMeeting(copy, people, now, OPERATOR_NAME);
  if ("skip" in meeting)
    return { ok: true, filed: 0, rung: hit.rung, reason: meeting.skip };
  const key = pasteKeyOf(
    hit.id,
    pasteFingerprint(`calendar\n${meeting.at.toISOString()}\n${copy.subject}`),
  );
  const claim = await claimCapture(key, now);
  if (claim.kind === "filed" || claim.kind === "inflight")
    return { ok: false, filed: 0, rung: hit.rung, duplicate: true };
  try {
    const n = await createAccountNoteRow({
      accountId: hit.id,
      kind: "account",
      body: meeting.body,
      door: "inbound",
      lane: "mine",
      actors: meeting.actors,
      recipients: meeting.recipients,
      source: SOURCES.outlook,
      at: meeting.at,
    });
    await stampPasteMark(key, n.id);
    return { ok: true, filed: 1, rung: hit.rung };
  } finally {
    if (claim.kind === "claimed") await releaseCapture(key, claim.token);
  }
}

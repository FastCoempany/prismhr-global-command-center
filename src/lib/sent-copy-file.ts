// Filing a sent copy or an inbox copy (2026-10-19): the sent copy routed by
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
  routeInboxCopy,
  routeSentCopy,
  sentCopyText,
  type SentCopy,
} from "@/lib/sent-copy";

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

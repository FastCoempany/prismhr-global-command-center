"use server";

// The Intranet's capture door (the Chute brains refactor plan, slice 16). The
// Intranet's capture is a door too (ruled 2026-09-25, P2 — CLAUDE.md, The
// Chute): what names an account files through the paste pipeline, routed,
// guarded and picked like the Chute's, and the brain reads it from the record
// on the next sweep; what names none stays an Intranet doc and is never
// inbound. One pipeline wherever a capture enters (D1): the filing is
// roomPaste with the intranet door, so every row it writes carries the door
// in its own column (P3). Routing runs here, on the server, over the joined
// roster (D12): the lib's routeText, never the action's, because this already
// is the server, and the reply carries an account's name and nothing else.
//
// The capture files when routing is sure. One box holds a disputed or unsure
// file at every door (CLAUDE.md, The held file and the receipt, ship order
// 2026-10-06), so both are held here: a dispute from either of the guard's
// rungs (slice 18a), and an unsure route, where the router finds candidate
// accounts and no sure one (ordered 2026-10-06). Nothing writes here. The
// reply carries what the held row needs: for a dispute, the routed account
// and the verdict; for an unsure route, the candidates by id, name and rung
// (D12). The Send-it box hands them to the Chute mounted above it, whose
// held box files the pick through roomPaste with the intranet door. The
// held box's ✕ comes back through intranetKeep, which takes the brain's own
// road with no route and no filing. A capture that names no account takes
// that road straight away (P2). The words are the pure half's
// (src/lib/intranet/capture-door.ts).
//
// This is the one module on the Intranet that writes to the record. The
// ask-and-answer half (actions.ts) still writes only to the Intranet's own
// tables, and the import-graph test keeps it that way.

import { roomPaste } from "@/app/room/actions";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { routeText } from "@/lib/ingest/route";
import {
  captureVerdict,
  filedLine,
  heldLine,
  keptLine,
  type HeldCandidate,
} from "@/lib/intranet/capture-door";
import {
  normalizeCapture,
  unseenMessages,
  captureReceipt,
} from "@/lib/intranet/normalize";
import {
  applyMerges,
  fallbackTitle,
  segmentMessages,
  segmentTranscript,
} from "@/lib/intranet/segment";

async function canWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

export type CaptureReply = {
  ok: boolean;
  receipt: string;
  /** What just landed in the brain, so the room can read it immediately
   *  (IV.3). Empty when the capture filed to the record instead: nothing of
   *  it waits in the brain to be read, the sweep mirrors it. */
  captureId: string;
  /** Provenance for the sent stamp (V): where the paste came from, or the
   *  account it filed to. */
  space: string;
  origin: string;
  reason?: string;
  /** Set when the capture is held, for the Chute mounted above the Send-it
   *  box to hold. A dispute (slice 18a) carries the account the route chose
   *  and the guard's verdict; an unsure route (ordered 2026-10-06) carries
   *  the router's candidates, which the held row offers as its choices. The
   *  text stays with the client that sent it, and the roster never travels
   *  (D12). */
  held?:
    | {
        account: { id: string; name: string };
        mismatch: NonNullable<Awaited<ReturnType<typeof roomPaste>>["mismatch"]>;
      }
    | { candidates: HeldCandidate[] };
};

const refused = (reason: string): CaptureReply => ({
  ok: false,
  receipt: "",
  captureId: "",
  space: "",
  origin: "",
  reason,
});

/** Take a grab or a paste. Routed first: a capture that names an account
 *  files through the pipeline, or is held in the Chute when the guard
 *  disputes it or the route is unsure, and never becomes an Intranet doc on
 *  the way (P2). The rest takes the brain's own road, where redaction
 *  happens inside normalizeCapture, before the first write — there is no
 *  pre-redaction text to leak. With `keep`, the capture takes the brain's
 *  road straight away: the held box's ✕ on a held capture (slice 18a). */
export async function intranetCapture(
  raw: string,
  originHint?: "teams" | "meeting" | "demo" | "paste",
  opts?: { keep?: boolean },
): Promise<CaptureReply> {
  if (!(await canWrite())) return refused("Read-only session.");
  const text = (raw ?? "").trim();
  if (text.length < 20) return refused("Nothing there to keep.");

  const cap = normalizeCapture(text, { origin: originHint });

  let kept = keptLine();
  if (!opts?.keep) {
    // The route, on the server over the joined roster (D12, C2). The raw
    // text routes, as a dropped file's does: the addresses are the
    // strongest rung.
    const verdict = captureVerdict(await routeText(text));
    kept = verdict.file ? "" : verdict.line;
    if (verdict.file) {
      // The pipeline the Chute files through, with this door's name (D1,
      // P3). Its guard runs both rungs; its duplicate check is per account.
      const r = await roomPaste(verdict.account.id, text, { door: "intranet" });
      if (r.ok)
        return {
          ok: true,
          receipt: filedLine(verdict.account.name, r.readFailed),
          captureId: "",
          space: verdict.account.name,
          origin: cap.origin,
        };
      if (r.duplicate)
        return {
          ok: true,
          receipt: r.reason ?? "Already on file. Nothing filed twice.",
          captureId: "",
          space: verdict.account.name,
          origin: cap.origin,
        };
      if (!r.mismatch) return refused(r.reason ?? "That didn't land.");
      // A dispute at either rung is held, never written here (slice 18a):
      // the Send-it box hands the verdict to the Chute mounted above it,
      // and its line says where the capture waits.
      return {
        ok: true,
        receipt: heldLine(),
        captureId: "",
        space: "",
        origin: cap.origin,
        held: { account: verdict.account, mismatch: r.mismatch },
      };
    }
    // An unsure route is held the way a dispute is (ordered 2026-10-06): the
    // router found candidate accounts and no sure one, so nothing writes
    // here until the operator's pick in the Chute, or the ✕ that brings it
    // back down the brain's road. The candidates travel as ids, names and
    // rungs (D12).
    if (verdict.hold)
      return {
        ok: true,
        receipt: verdict.line,
        captureId: "",
        space: "",
        origin: cap.origin,
        held: { candidates: verdict.candidates },
      };
  }

  try {
    const prisma = getPrisma();

    // Identical capture → no-op. Re-grabbing a thread must never double it.
    const seen = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: cap.checksum },
      select: { id: true },
    });
    if (seen) {
      await prisma.intranetCapture.update({
        where: { id: seen.id },
        data: { capturedAt: new Date() },
      });
      return {
        ok: true,
        receipt: "Already in the brain — nothing new to add.",
        captureId: seen.id,
        space: cap.space,
        origin: cap.origin,
      };
    }

    const capture = await prisma.intranetCapture.create({
      data: {
        origin: cap.origin,
        raw: cap.body.slice(0, 400_000),
        rawChecksum: cap.checksum,
        title: cap.title,
        meta: { space: cap.space, links: cap.links, report: cap.report },
      },
    });

    // Overlap: which messages has the brain already read, in this space?
    const priorKeys = new Set<string>();
    if (cap.space) {
      const priorDocs = await prisma.intranetDoc.findMany({
        where: { space: cap.space },
        select: { checksum: true },
        take: 400,
      });
      for (const d of priorDocs) priorKeys.add(d.checksum);
    }

    const fresh = cap.msgs.length ? unseenMessages(cap.msgs, new Set()) : [];
    const segments = cap.msgs.length
      ? applyMerges(segmentMessages(fresh), [])
      : segmentTranscript(cap.body, new Date().toISOString());

    let keptCount = 0;
    let skipped = 0;
    for (const seg of segments) {
      if (priorKeys.has(seg.key)) {
        skipped += seg.msgs.length || 1;
        continue;
      }
      await prisma.intranetDoc.create({
        data: {
          captureId: capture.id,
          origin: cap.origin,
          originRef: `${capture.id}:${seg.key}`,
          space: cap.space,
          title: fallbackTitle(cap.space, seg),
          body: seg.body,
          speakers: seg.speakers,
          occurredAt: new Date(seg.occurredAt || Date.now()),
          links: cap.links,
          checksum: seg.key,
        },
      });
      keptCount += seg.msgs.length || 1;
    }

    await prisma.intranetCapture.update({
      where: { id: capture.id },
      data: { segmented: true },
    });

    return {
      ok: true,
      receipt: `${kept} ${captureReceipt({
        space: cap.space,
        kept: keptCount,
        skipped,
        links: cap.links.length,
        report: cap.report,
      })}`,
      captureId: capture.id,
      space: cap.space,
      origin: cap.origin,
    };
  } catch {
    return refused(
      "The brain's tables aren't there yet — run docs/intranet-tables.sql in Supabase.",
    );
  }
}

/** The held box's ✕ on a held Send-it capture, disputed (slice 18a) or
 *  unsure (ordered 2026-10-06): the capture files on no account and takes
 *  the brain's own road, an Intranet doc the brain reads on its next pass
 *  (P2: what is not filed is never inbound). */
export async function intranetKeep(raw: string): Promise<CaptureReply> {
  return intranetCapture(raw, undefined, { keep: true });
}

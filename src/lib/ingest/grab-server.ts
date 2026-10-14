// The grab's filing, on the server (2026-10-14). Every door that files a
// grab lands here: the HomeRoom's paste and the Chute (src/app/room/
// actions.ts, behind the session's write check) and the inbound route
// (src/app/inbound/salesnav/route.ts, behind its shared secret). It is a
// plain module on purpose, never a "use server" file: a function exported
// from an actions file is callable from any browser, and filing a grab must
// only ever be reached through a door that checked who is asking.
//
// A capture may file as more than one grab: a Sales Navigator alert email
// files as its alerts and its intent readings (src/lib/ingest/
// salesnav-email.ts). Each grab plans and files on its own; the receipt is
// their sum.

import { getPrisma } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { joinedRoster } from "./route";
import { claimCapture, fileFiling, releaseCapture } from "./filing";
import { fileGrab, grabResult, planGrab, type GrabSummary } from "./grab";
import type { Door } from "./doors";
import type { Window } from "./windows";

// The filed-capture marker: key carries the fingerprint, reason carries the
// filing moment and the first note id (so an undo can find and clear it).
export async function stampPasteMark(pasteKey: string, firstNoteId: string) {
  const reason = `${new Date().toISOString()}·${firstNoteId}`;
  // Verify after write: a marker that silently fails to land lets the same
  // capture file twice (it happened — 2026-08-13). Two attempts, each read
  // back; still fail-open after that, because the marker is a guard, never
  // a gate — the filing already succeeded.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await getPrisma().accountDisposition.upsert({
        where: { accountId: pasteKey },
        create: { accountId: pasteKey, status: "filed", reason },
        update: { status: "filed", reason },
      });
      const check = await getPrisma().accountDisposition.findUnique({
        where: { accountId: pasteKey },
        select: { status: true },
      });
      if (check?.status === "filed") return;
    } catch {
      // retry once, then let it go
    }
  }
}

/** Two grabs' receipts as one: every account, duplicate and failure, the
 *  unmatched rows summed, a skipped duplicate check if either skipped. */
export function mergeSummaries(a: GrabSummary, b: GrabSummary): GrabSummary {
  return {
    accounts: [...a.accounts, ...b.accounts],
    duplicates: [...a.duplicates, ...b.duplicates],
    failed: [...a.failed, ...b.failed],
    unmatched: a.unmatched + b.unmatched,
    missed: [...(a.missed ?? []), ...(b.missed ?? [])],
    dupeCheck: a.dupeCheck === "skipped" || b.dupeCheck === "skipped" ? "skipped" : "ran",
  };
}

/** File one or more grabs through the pipeline's own writers, as `door`. */
export async function fileGrabTexts(
  texts: readonly string[],
  door: Door,
  windows: Window[],
): Promise<ReturnType<typeof grabResult>> {
  const now = new Date();
  const roster = await joinedRoster();
  let sum: GrabSummary | null = null;
  for (const text of texts) {
    const plan = planGrab(text, roster, now);
    const g = await fileGrab(
      plan,
      {
        claim: (key) => claimCapture(key, now),
        release: (key, token) => releaseCapture(key, token),
        stamp: (key, noteId) => stampPasteMark(key, noteId),
        filing: async (accountId, fingerprint, dupeCheck) =>
          (
            await fileFiling({
              accountId,
              fingerprint,
              door,
              dialect: "SN",
              how: "rules",
              read: null,
              windows,
              dupeCheck,
              filedAt: now,
            })
          )?.id,
        note: async (n) => (await createAccountNoteRow({ ...n, door: n.door })).id,
      },
      door,
    );
    sum = sum ? mergeSummaries(sum, g) : g;
  }
  return grabResult(
    sum ?? {
      accounts: [],
      duplicates: [],
      failed: [],
      unmatched: 0,
      missed: [],
      dupeCheck: "ran",
    },
    windows,
  );
}

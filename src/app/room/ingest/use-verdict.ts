"use client";

// The verdict and the pick (the Chute brains refactor plan, §2.4 and slice 8).
// A filing the guard disputes is held, never dropped: the text, the files and
// the windows wait with the question until the operator answers it, and the
// answer is final. The pick re-runs the filing with force, the read runs
// again to be sure, and nothing is re-judged (ruled 2026-09-25, D5). A
// waiting pick keeps its text across a reload because the text rides the row
// before the read (C20; chute.tsx fileTo patches it first, the Drop's held
// state carries it). Both doors build the held verdict here. The Drop keeps
// it as state through useVerdict; the Chute keeps it on the ledger row
// (use-receipts.ts), because a row waiting on the operator is already a held
// question. Both doors, and the Intranet's Send-it through the Chute mounted
// on its page, paint it with one component, the held box (./held.tsx; slice
// 18a, the face approved 2026-10-06).

import { useState } from "react";
import type { PasteResult } from "./use-ingest";

/** The server's verdict on a disputed filing, at whichever rung disputed it
 *  (D9 as amended 2026-10-05): the account the capture reads like, the one
 *  it was dropped on, the evidence behind each, the rung that objected and
 *  its reason of nine words or fewer. The doors render the reason where the
 *  why stood and keep the whys as the evidence behind it. */
export type Verdict = {
  claim: string;
  bound: string;
  why?: string;
  /** What the chosen row carries for itself; "" when it carries nothing. */
  boundWhy?: string;
  /** Which rung objected: the text's own evidence before the read, or the
   *  read's claim after it. */
  rung?: "text" | "read";
  reason?: string;
  /** The claimed account when the book holds it: the box's solid button. */
  claimId?: string;
  /** "model" when the reason is the web check's, read from both accounts'
   *  page data and the web. */
  reasonBy?: "model";
  /** The router's candidates, by name and rung, for "Another account". */
  candidates?: { id: string; name: string; rung: string }[];
};

/** A verdict with what the door holds beside it to answer: the Drop carries
 *  the text, the held files and the windows; the Chute's row carries them. */
export type Held<C> = Verdict & C;

/** The held verdict a disputed result becomes, carrying what the door hands
 *  it, or null when the result is not a dispute. Each verdict carries its
 *  reason (D9 as amended 2026-10-05), and the carry rides whole, so the pick
 *  that answers it has what it needs to file (C20). */
export function holdVerdict<C>(
  r: Pick<PasteResult, "mismatch" | "reason">,
  carry: C,
): Held<C> | null {
  if (!r.mismatch) return null;
  // The server's shape has to fit the verdict the doors paint; a drift fails
  // the build here, not in a banner.
  const verdict: Verdict = r.mismatch;
  // The rung's reason rides on the verdict; the result's own reason is the
  // same sentence, the fallback for a result that filled one and not the
  // other.
  return { ...verdict, reason: verdict.reason ?? r.reason, ...carry };
}

/** The Drop's line of held questions, stepped: null answers the one showing
 *  and the next steps up; a held verdict joins the line and shows when its
 *  turn comes. Pure, so the suite can read the line. */
export function queueVerdict<T>(queue: readonly T[], next: T | null): T[] {
  return next === null ? queue.slice(1) : [...queue, next];
}

/** The Drop's held verdict: the one its banner shows, with a line behind it.
 *  The Drop reads several files of one drop at once since bug 2 closed, so
 *  two can be disputed at once; one banner shows (the face is unchanged), and
 *  the second waits its turn instead of overwriting the first, whose files
 *  are held with it. A question the room asked and then lost would be the
 *  room quietly forgetting what it asked for. `setMismatch(null)` answers
 *  the one showing; `setMismatch(held)` holds another. */
export function useVerdict<T>(): {
  mismatch: T | null;
  setMismatch: (next: T | null) => void;
} {
  const [queue, setQueue] = useState<T[]>([]);
  const setMismatch = (next: T | null) => setQueue((q) => queueVerdict(q, next));
  return { mismatch: queue[0] ?? null, setMismatch };
}

/** What the held box's ✕ does with a held capture (slice 18a): it files
 *  nothing on any account. A Send-it capture keeps the brain's own road, an
 *  Intranet doc again (P2). Everything else backs up under accounts/_unfiled/,
 *  because git is the home for every dropped file (D8 as amended 2026-10-05):
 *  the dropped files themselves when the door still holds them, and the text
 *  as a .txt when a reload took the file and left the text (C20) or when the
 *  capture was a paste with no file at all. */
export type Dismissal =
  | { kind: "keep"; text: string }
  | { kind: "vault"; files: File[] }
  | { kind: "none" };

export function dismissHeld(h: {
  door?: string;
  filename?: string;
  text?: string;
  files?: readonly File[];
}): Dismissal {
  const text = (h.text ?? "").trim();
  if (h.door === "intranet") return text ? { kind: "keep", text } : { kind: "none" };
  if (h.files?.length) return { kind: "vault", files: [...h.files] };
  if (!text) return { kind: "none" };
  const name = h.filename?.trim() ? `${h.filename.trim()}.txt` : "paste.txt";
  return { kind: "vault", files: [new File([text], name, { type: "text/plain" })] };
}

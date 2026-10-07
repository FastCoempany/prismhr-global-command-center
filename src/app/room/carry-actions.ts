"use server";

// The doors a heavy text travels through (ruled 2026-09-25, D4: the note
// keeps the text whole at any size; only the model's read is windowed —
// CLAUDE.md, The Chute). A text that fits one request goes to roomPaste,
// roomGrab or routeText whole, as before. A text above the request cap
// (TRANSPORT_BYTES, src/lib/ingest/windows.ts) arrives here one piece at a
// time, staged in the vault's chunk store until the set is whole; the server
// assembles it in order and hands the whole text to the same action the
// light text goes to (src/lib/ingest/carry.ts). Nothing is cut on the way:
// the filing reads every character, the guard judges every character, and
// only the model's read is windowed, on the receipt as always.
//
// Each door takes the gate every room action takes: a signed-in session
// that can write and a database to stage in. The filing's door binds the
// account against the book before anything stages, as roomPaste does.

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  TEXT_UNFINISHED,
  takeTextPiece,
  textPieceBytes,
  type TextStaged,
} from "@/lib/ingest/carry";
import type { Door } from "@/lib/ingest/doors";
import type { Window } from "@/lib/ingest/windows";
import { bindAccountId } from "@/lib/room/bind";
import { roomGrab, roomPaste } from "./actions";
import { routeText, type RouteReply } from "./route-actions";

type PasteResult = Awaited<ReturnType<typeof roomPaste>>;

async function canStage(): Promise<boolean> {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

const pasteRefusal = (reason: string): PasteResult => ({
  ok: false,
  filed: 0,
  how: "",
  reason,
});

/** One piece of a text filing to an account. The piece that makes the set
 *  whole files the whole text through roomPaste and answers with its
 *  result, so the receipt is the filing's own. */
export async function roomPastePiece(
  accountId: string,
  key: string,
  index: number,
  total: number,
  form: FormData,
  opts: { force?: boolean; door: Door; windows?: Window[] },
): Promise<TextStaged | PasteResult> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return pasteRefusal("That row isn't bound to a known account.");
  if (!(await canStage())) return pasteRefusal("Read-only session.");
  return takeTextPiece(
    getPrisma(),
    { key, index, total, bytes: await textPieceBytes(form) },
    (text) => roomPaste(acct.id, text, opts),
    pasteRefusal(TEXT_UNFINISHED),
  );
}

/** One piece of a Sales Nav grab: the whole list goes to the split. */
export async function roomGrabPiece(
  key: string,
  index: number,
  total: number,
  form: FormData,
  opts: { door: Door; windows?: Window[] },
): Promise<TextStaged | PasteResult> {
  if (!(await canStage())) return pasteRefusal("Read-only session.");
  return takeTextPiece(
    getPrisma(),
    { key, index, total, bytes: await textPieceBytes(form) },
    (text) => roomGrab(text, opts),
    pasteRefusal(TEXT_UNFINISHED),
  );
}

/** One piece of a text the Chute routes: the router reads the whole text
 *  over the joined roster on the server (C2, D13), and what comes back is
 *  the verdict and the picker's names, as routeText answers. */
export async function routeTextPiece(
  key: string,
  index: number,
  total: number,
  form: FormData,
): Promise<TextStaged | RouteReply> {
  const refused = (reason: string): RouteReply => ({
    best: null,
    candidates: [],
    book: [],
    refused: reason,
  });
  if (!(await canStage())) return refused("Read-only session.");
  return takeTextPiece(
    getPrisma(),
    { key, index, total, bytes: await textPieceBytes(form) },
    (text) => routeText(text),
    refused(TEXT_UNFINISHED),
  );
}

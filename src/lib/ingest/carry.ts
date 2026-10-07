// A capture's text, carried to the server whole at any size (ruled
// 2026-09-25, D4: the note keeps the text whole at any size; only the
// model's read is windowed — CLAUDE.md, The Chute). A text travels to the
// server as a server action argument, and the platform refuses a request
// over its cap (TRANSPORT_BYTES, src/lib/ingest/windows.ts). Until pass 9's
// tail, a text above it was cut to fit before it filed. Now it travels the
// way a dropped file above the cap does (D8 as amended 2026-10-05): in
// pieces through the vault's chunk store, which the server assembles in
// order before anything reads it. The filing then reads the whole text, and
// only the model's read of it is windowed, on the receipt as before.
//
// Two halves, one module, as the vault's carriage is (src/lib/ingest/
// vault.ts). The browser half sends a text that fits one request whole and
// cuts a heavier one into UTF-8 pieces it posts in order through the doors
// it is handed. The server half stages each piece through stageSet, the
// vault's own staging, under a namespace no account can hold, and hands the
// assembled text to the filing, the route or the grab's split. Both halves
// are pure over what they are handed, so the suite drives the real wire
// against an in-memory store.
//
// Client-safe: nothing here reads the environment or the database directly.

import {
  VAULT_FIELD,
  VAULT_PIECE_BYTES,
  stageSet,
  type VaultChunkClient,
} from "@/lib/ingest/vault";
import { fitsTransport } from "@/lib/ingest/windows";

/** The chunk store's namespace for a text's pieces: the account column of
 *  every staged piece of a text. A book account's Salesforce id can never
 *  collide with it, nor can the vault's unfiled mode, so a text's pieces and
 *  a file's never share a set. */
export const TEXT_SET = "_text";

/** The reply on a text that never arrived whole. Operator copy: what
 *  happened, then what to do. */
export const TEXT_UNFINISHED = "The text didn't arrive whole. Try again.";

/** What a piece's door answers while the set is still filling. The piece
 *  that makes it whole answers with what the text's use answered. */
export type TextStaged = { ok: true; staged: true; index: number; total: number };

/** The two server doors a text travels through: whole when it fits one
 *  request, one piece at a time when it does not. Handed in, so this stays
 *  importable from a client module and drivable from the suite. */
export type TextDoors<R> = {
  whole(text: string): Promise<R>;
  piece(
    key: string,
    index: number,
    total: number,
    form: FormData,
  ): Promise<TextStaged | R>;
};

const isStaged = (x: unknown): x is TextStaged =>
  !!x && typeof x === "object" && (x as { staged?: unknown }).staged === true;

/** A text's UTF-8 bytes cut into pieces of at most VAULT_PIECE_BYTES, never
 *  fewer than two: a text that does not fit one request's argument can
 *  still weigh under one piece once JSON's escapes are gone, and the store
 *  stages a set of two or more. A piece boundary may fall inside a
 *  character; the server joins the bytes before it decodes them. */
export function textPieces(text: string): Uint8Array<ArrayBuffer>[] {
  const bytes = new TextEncoder().encode(text ?? "");
  if (bytes.length < 2) return [bytes];
  const count = Math.max(2, Math.ceil(bytes.length / VAULT_PIECE_BYTES));
  const size = Math.ceil(bytes.length / count);
  const out: Uint8Array<ArrayBuffer>[] = [];
  for (let at = 0; at < bytes.length; at += size) out.push(bytes.subarray(at, at + size));
  return out;
}

/** A fresh key for one carriage's set, so two texts in flight at once, or
 *  the route's and the filing's carriage of one text, never share pieces. */
function setKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Carry one text to the server: whole when it fits one request, in pieces
 *  in order when it does not. The answer is the server's use of the whole
 *  text; a piece that never reaches the server, or a set the server never
 *  saw whole, answers `broken(TEXT_UNFINISHED)`. Nothing is ever cut. */
export async function carryText<R>(
  text: string,
  doors: TextDoors<R>,
  broken: (reason: string) => R,
): Promise<R> {
  if (fitsTransport(text)) return doors.whole(text);
  const pieces = textPieces(text);
  const key = setKey();
  for (let i = 0; i < pieces.length; i++) {
    const form = new FormData();
    form.set(
      VAULT_FIELD,
      new File([pieces[i]], "text.txt", {
        type: "text/plain;charset=utf-8",
      }),
      "text.txt",
    );
    let reply: TextStaged | R;
    try {
      reply = await doors.piece(key, i, pieces.length, form);
    } catch {
      return broken(TEXT_UNFINISHED);
    }
    if (!isStaged(reply)) return reply;
  }
  // Every piece was taken and none made the set whole: the server never
  // assembled the text, so nothing read it.
  return broken(TEXT_UNFINISHED);
}

// ── the server half ─────────────────────────────────────────────────────────

/** A carriage key the server takes: what setKey makes, and nothing longer. */
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

/** The bytes a piece's door was posted, or null when nothing usable came:
 *  no file, an empty one, or one past the piece size. */
export async function textPieceBytes(form: FormData): Promise<Uint8Array | null> {
  const f = form instanceof FormData ? form.get(VAULT_FIELD) : null;
  if (!(f instanceof File) || f.size === 0 || f.size > VAULT_PIECE_BYTES) return null;
  return new Uint8Array(await f.arrayBuffer());
}

/** Stage one piece of a text. When it makes the set whole, the store
 *  assembles the bytes in order (stageSet, the vault's own), they decode as
 *  UTF-8, and the whole text goes to `use` once: the filing, the route or
 *  the grab's split. Its answer is this door's. A set that can never be
 *  whole reads nothing and answers `broken`. */
export async function takeTextPiece<R>(
  client: VaultChunkClient,
  piece: { key: string; index: number; total: number; bytes: Uint8Array | null },
  use: (text: string) => Promise<R>,
  broken: R,
  now: Date = new Date(),
): Promise<TextStaged | R> {
  const key = typeof piece.key === "string" ? piece.key : "";
  if (!KEY_RE.test(key) || !piece.bytes) return broken;
  const step = await stageSet(
    client,
    {
      accountId: TEXT_SET,
      filename: key,
      index: Number(piece.index),
      total: Number(piece.total),
      bytes: piece.bytes,
      type: "text/plain;charset=utf-8",
    },
    async (file) => use(await file.text()),
    now,
  );
  if (step.kind === "staged")
    return { ok: true, staged: true, index: step.index, total: step.total };
  if (step.kind === "broken") return broken;
  return step.value;
}

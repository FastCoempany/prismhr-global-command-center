// The vault's carriage (the Chute brains refactor plan, §2.4 and slice 7).
// Every dropped file archives whole to GitHub through a server-side upload,
// so no token reaches the browser; files of every size travel this way, and
// one above the server's request cap arrives in pieces the server assembles
// before it lands (ruled 2026-09-25, D8, as amended 2026-10-05 — CLAUDE.md,
// The Chute). Vaulting is filing: the receipt carries the path or the tag
// the file landed under, which is the backup's address in git; backups are permanent (founder, 2026-10-06), so nothing takes it back.
//
// Two halves, one module. The browser half cuts a file into pieces of at
// most 4 MB and posts them in order through the doors it is handed; it
// never sees a credential. The server half stages each piece in the
// VaultChunk table and, when the set is whole, assembles the file in order,
// lands it once and deletes the pieces. Both halves are pure over what they
// are handed — the doors, the client, the landing — so the suite can script
// the wire and read the calls back.
//
// Client-safe: nothing here reads the environment or the database directly.

/** The size of one piece, and the largest file that travels whole. Chosen
 *  with next.config.ts's body limit: a piece plus the form's overhead fits
 *  under it, and the limit stays under Vercel's request cap. */
export const VAULT_PIECE_BYTES = 4 * 1024 * 1024;

/** The vault's unfiled mode (slice 18a of the Chute brains refactor plan):
 *  the account id a door is handed when the held box's ✕ backs a file up
 *  under accounts/_unfiled/ and files it on no account. The server's gate
 *  reads it before any account binds, so no account is needed, and no book
 *  account's Salesforce id can collide with it. */
export const UNFILED = "_unfiled";

/** The receipt's one line when the set never became whole. Operator copy:
 *  what happened, then what to do. */
export const UNFINISHED = "The backup didn't finish. Drop it again.";

/** The vault's receipt: where the file landed (the lane and its path or tag,
 *  the backup's address in git), or why it did not. Never a credential. */
export type VaultReceipt =
  | { ok: true; kind: "file" | "release"; url: string; detail: string }
  | { ok: false; reason: string };

/** What a piece's door answers: staged and waiting on the rest, or — on the
 *  piece that made the set whole — the file's own receipt. */
export type PieceReply =
  | { ok: true; staged: true; index: number; total: number }
  | VaultReceipt;

/** How many pieces a file cuts into, and the pieces themselves. A file at
 *  or under the piece size is one piece: the file itself. */
export function piecesOf(file: Blob, size = VAULT_PIECE_BYTES): Blob[] {
  if (file.size <= size) return [file];
  const out: Blob[] = [];
  for (let at = 0; at < file.size; at += size) out.push(file.slice(at, at + size));
  return out;
}

/** The two server doors the browser half posts through — the actions in
 *  src/app/room/vault-actions.ts, handed in so this stays importable from a
 *  client module and scriptable from the suite. */
export type VaultDoors = {
  whole(accountId: string, form: FormData): Promise<VaultReceipt>;
  piece(
    accountId: string,
    filename: string,
    index: number,
    total: number,
    form: FormData,
  ): Promise<PieceReply>;
};

/** The field name both doors read the bytes from. */
export const VAULT_FIELD = "file";

/** Carry one file to the vault through the server: whole when it fits one
 *  request, in pieces in order when it does not. The receipt is the door's;
 *  a piece that never reaches the server, or a set the server never saw
 *  whole, says the backup did not finish. */
export async function sendToVault(
  accountId: string,
  file: File,
  doors: VaultDoors,
  onPiece?: (sent: number, total: number) => void,
): Promise<VaultReceipt> {
  const pieces = piecesOf(file);
  if (pieces.length === 1) {
    const form = new FormData();
    form.set(VAULT_FIELD, file, file.name);
    try {
      return await doors.whole(accountId, form);
    } catch {
      // The call itself broke off — the door never answered, so nothing is
      // known to have landed. The door's own catch reports a landing the
      // reply lost; this is the case where there was no reply at all.
      return { ok: false, reason: "The upload broke off. Drop it again." };
    }
  }
  for (let i = 0; i < pieces.length; i++) {
    onPiece?.(i + 1, pieces.length);
    const form = new FormData();
    form.set(
      VAULT_FIELD,
      new File([pieces[i]], file.name, { type: file.type }),
      file.name,
    );
    let reply: PieceReply;
    try {
      reply = await doors.piece(accountId, file.name, i, pieces.length, form);
    } catch {
      return { ok: false, reason: UNFINISHED };
    }
    if (!reply.ok) return reply;
    if (!("staged" in reply)) return reply;
  }
  // Every piece was taken and none made the set whole: the server never
  // assembled it, so nothing landed.
  return { ok: false, reason: UNFINISHED };
}

/** Back a file up and file it on no account: the held box's ✕ (slice 18a).
 *  The same two doors and the same carriage, in the unfiled mode, so a file
 *  of any size lands under accounts/_unfiled/ the way every other one lands
 *  under its account. */
export function sendUnfiled(
  file: File,
  doors: VaultDoors,
  onPiece?: (sent: number, total: number) => void,
): Promise<VaultReceipt> {
  return sendToVault(UNFILED, file, doors, onPiece);
}

// ── the server half ─────────────────────────────────────────────────────────

/** The slice of the Prisma client the staging needs — a test hands in a
 *  stub, the way the Filing module takes its client. */
export type VaultChunkClient = {
  vaultChunk: {
    deleteMany(args: {
      where: {
        accountId?: string;
        filename?: string;
        total?: number;
        index?: number;
        createdAt?: { lt: Date };
      };
    }): Promise<{ count: number }>;
    create(args: {
      data: {
        accountId: string;
        filename: string;
        index: number;
        total: number;
        bytes: Uint8Array;
      };
    }): Promise<{ id: string }>;
    count(args: {
      where: { accountId: string; filename: string; total: number };
    }): Promise<number>;
    findMany(args: {
      where: { accountId: string; filename: string; total: number };
      select: { index: true; bytes: true };
      orderBy: { index: "asc" };
    }): Promise<{ index: number; bytes: Uint8Array }[]>;
  };
};

/** A piece left behind this long by an upload that never finished is swept
 *  on the next one. */
export const STALE_PIECE_MS = 24 * 60 * 60 * 1000;

export type Piece = {
  accountId: string;
  filename: string;
  index: number;
  total: number;
  bytes: Uint8Array;
  /** The file's media type, for the release lane's upload. */
  type?: string;
};

const wholeNumber = (n: number) => Number.isInteger(n) && n >= 0;

/** Stage one piece. When it makes the set whole, assemble the file in order,
 *  land it once through `land`, delete the pieces and answer with the
 *  landing's receipt; otherwise answer staged. A set that can never be whole
 *  — an index twice, one missing when the count says full, a piece over the
 *  size — vaults nothing, is cleared, and the receipt says the backup did
 *  not finish. The sweep of stale pieces rides every call. */
export async function stagePiece(
  client: VaultChunkClient,
  piece: Piece,
  land: (file: File) => Promise<VaultReceipt>,
  now: Date = new Date(),
): Promise<PieceReply> {
  const { accountId, filename, index, total } = piece;
  const key = { accountId, filename, total };
  if (
    !wholeNumber(total) ||
    total < 2 ||
    !wholeNumber(index) ||
    index >= total ||
    piece.bytes.length === 0 ||
    piece.bytes.length > VAULT_PIECE_BYTES
  )
    return { ok: false, reason: UNFINISHED };

  await client.vaultChunk.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - STALE_PIECE_MS) } },
  });
  // The first piece opens a fresh set; a piece sent twice replaces itself.
  await client.vaultChunk.deleteMany({ where: index === 0 ? key : { ...key, index } });
  await client.vaultChunk.create({
    data: { accountId, filename, index, total, bytes: piece.bytes },
  });

  const staged = await client.vaultChunk.count({ where: key });
  if (staged < total) return { ok: true, staged: true, index, total };

  const rows = await client.vaultChunk.findMany({
    where: key,
    select: { index: true, bytes: true },
    orderBy: { index: "asc" },
  });
  const inOrder =
    rows.length === total && rows.every((r, i) => r.index === i && r.bytes.length > 0);
  if (!inOrder) {
    await client.vaultChunk.deleteMany({ where: key });
    return { ok: false, reason: UNFINISHED };
  }
  const size = rows.reduce((n, r) => n + r.bytes.length, 0);
  const whole = new Uint8Array(size);
  let at = 0;
  for (const r of rows) {
    whole.set(r.bytes, at);
    at += r.bytes.length;
  }
  const receipt = await land(
    new File([whole], filename, { type: piece.type || "application/octet-stream" }),
  );
  await client.vaultChunk.deleteMany({ where: key });
  return receipt;
}

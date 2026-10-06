"use server";

// The vault's doors (the Chute brains refactor plan, §2.4 and slice 7).
// Every dropped file archives whole to GitHub through a server-side upload,
// so no token reaches the browser (ruled 2026-09-25, D8, as amended
// 2026-10-05 — CLAUDE.md, The Chute). The grant that once went to the
// browser's fetch (src/app/room/archive-actions.ts, retired here) is gone:
// the repository and the token live in the environment, are read here on
// the server, and are handed to the GitHub call alone. The receipt that
// goes back carries the lane and the path or tag the file landed under —
// the backup's address in git, permanent by ruling (2026-10-06) — and never a credential; the suite scans
// this file's doors for that.
//
// Two doors. `vaultFile` takes a file that fits one request. `vaultChunk`
// takes one piece of a file that does not — at most 4 MB, staged in the
// VaultChunk table until the set is whole, when the server assembles the
// file in order, lands it once and deletes the pieces (src/lib/ingest/
// vault.ts). Vaulting is filing: the account is bound against the book the
// way every room action binds, so a file can only ever land under an
// account the book knows, or, in the unfiled mode the held box's ✕ asks for
// (slice 18a), under accounts/_unfiled/ and no account at all.

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { getPrisma } from "@/lib/db";
import { archiveFileToGitHub } from "@/lib/github/archive";
import {
  UNFILED,
  UNFINISHED,
  VAULT_FIELD,
  VAULT_PIECE_BYTES,
  stagePiece,
  type PieceReply,
  type VaultReceipt,
} from "@/lib/ingest/vault";
import { bindAccountId } from "@/lib/room/bind";

type Opened =
  | {
      ok: true;
      /** The account the file lands under; null in the unfiled mode. */
      account: { id: string; name: string } | null;
      repo: string;
      token: string;
    }
  | { ok: false; reason: string };

/** The gate every vault call takes: a signed-in session that can write, an
 *  account the book knows (or the unfiled mode, which names none), and a
 *  configured vault. What it opens stays in this file; the doors answer with
 *  a receipt. */
async function open(accountId: string): Promise<Opened> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite)
    return { ok: false, reason: "Read-only session." };
  // The unfiled mode (slice 18a): the held box's ✕ files nothing on any
  // account and the file still backs up, because git is the home for every
  // dropped file (D8 as amended 2026-10-05). No account binds, since none is
  // named; the session check above still holds.
  const unfiled = accountId === UNFILED;
  const acct = unfiled ? null : bindAccountId(accountId, peos);
  if (!unfiled && !acct) return { ok: false, reason: "That account is not in the book." };
  const repo = (process.env.GITHUB_ARCHIVE_REPO ?? "").trim();
  const token = (process.env.GITHUB_ARCHIVE_TOKEN ?? "").trim();
  if (!repo || !token)
    return {
      ok: false,
      reason:
        "The vault isn't configured. Set GITHUB_ARCHIVE_REPO and GITHUB_ARCHIVE_TOKEN.",
    };
  return {
    ok: true,
    account: acct ? { id: acct.id, name: acct.name } : null,
    repo,
    token,
  };
}

/** The file a door posted, or null when nothing readable came. */
function fileIn(form: FormData): File | null {
  const f = form instanceof FormData ? form.get(VAULT_FIELD) : null;
  return f instanceof File && f.size > 0 ? f : null;
}

/** A file that fits one request lands whole: the 25 MB lane as a repo file,
 *  above it as a pre-release asset, exactly as before. */
export async function vaultFile(
  accountId: string,
  form: FormData,
): Promise<VaultReceipt> {
  const g = await open(accountId);
  if (!g.ok) return { ok: false, reason: g.reason };
  const file = fileIn(form);
  if (!file) return { ok: false, reason: "No file arrived. Drop it again." };
  return archiveFileToGitHub({
    file,
    accountName: g.account?.name ?? null,
    grant: { repo: g.repo, token: g.token },
  });
}

/** One piece of a file above the request cap. Staged until the set is
 *  whole; the piece that completes it answers with the landing's receipt,
 *  and a set that never completes vaults nothing and says so. */
export async function vaultChunk(
  accountId: string,
  filename: string,
  index: number,
  total: number,
  form: FormData,
): Promise<PieceReply> {
  const g = await open(accountId);
  if (!g.ok) return { ok: false, reason: g.reason };
  const piece = fileIn(form);
  const name = typeof filename === "string" ? filename.trim().slice(0, 255) : "";
  if (!piece || !name || piece.size > VAULT_PIECE_BYTES)
    return { ok: false, reason: UNFINISHED };
  const bytes = new Uint8Array(await piece.arrayBuffer());
  return stagePiece(
    getPrisma(),
    {
      accountId: g.account?.id ?? UNFILED,
      filename: name,
      index: Number(index),
      total: Number(total),
      bytes,
      type: piece.type,
    },
    (file) =>
      archiveFileToGitHub({
        file,
        accountName: g.account?.name ?? null,
        grant: { repo: g.repo, token: g.token },
      }),
  );
}

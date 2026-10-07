"use client";

// The shared door (the Chute brains refactor plan, §2.4 option B and slice 8).
// The Chute and the row's Drop are two faces over one flow: a dropped file is
// accepted, read, routed, filed and vaulted through the functions here,
// whichever face it came through, so the two doors cannot drift apart. Each
// door used to carry its own copy of the plan, and the copies disagreed: the
// Drop read one file of a drop and sent the rest to the vault unread (audit
// pass 1, bug 2), while the Chute read them all. One plan now, and every
// readable file in a drop is read, each filing on its own with its own
// receipt. Both faces paint one held box and one receipt (./held.tsx and
// ./receipt.tsx; slice 18a, the face approved 2026-10-06).
//
// Client-side only, and marked so the D13 scan reads this module as the
// browser's: routing runs on the server through its action and the roster
// never ships here (C2, D13); filing is roomPaste with the mounting door's
// name, so every row the filing writes carries it (P3); the vault is the
// server's two doors through sendToVault, so no token reaches the browser
// (D8, as amended 2026-10-05). The reads run at most CHUTE_PARALLEL at a
// time, in drop order (D11), at either door.

import { useRouter } from "next/navigation";
import type { Door } from "@/lib/ingest/doors";
import { sendToVault, sendUnfiled, type VaultReceipt } from "@/lib/ingest/vault";
import { transportCut, type Window } from "@/lib/ingest/windows";
import { DROP_ACCEPT } from "@/lib/paste-files";
import { splitDrop, vaultAfterVerdict, type VaultStep } from "@/lib/room/drop-plan";
import { roomPaste } from "../actions";
import { CHUTE_PARALLEL, runLimited } from "../chute-ledger";
import { readFileToText } from "../read-file";
import { routeText, type RouteReply } from "../route-actions";
import { vaultChunk, vaultFile } from "../vault-actions";

/** The two doors this flow mounts behind: the Chute (the HomeRoom's and the
 *  Intranet's, one component — D1) and the account row's Drop. */
export type IngestDoor = Extract<Door, "chute" | "drop">;

/** The doors a filing can name: the two this flow mounts behind, and the
 *  Intranet's, whose disputed Send-it capture the Chute holds and files with
 *  the door it came through (slice 18a; P2, P3). */
export type FilingDoor = Extract<Door, "chute" | "drop" | "intranet">;

/** The transcriber a door reads PDFs and images through: the Chute's own
 *  action, or the row's, bound to its account. */
export type PdfReader = Parameters<typeof readFileToText>[1];

/** What roomPaste hands back. */
export type PasteResult = Awaited<ReturnType<typeof roomPaste>>;

/** What a drop does with each of its files, by door. */
export type DropPlan = {
  /** Every file the reader can open, in drop order. Each one is read and
   *  files on its own, with its own receipt: a drop of two .eml files is two
   *  filings, never one filing and one file lost to the record (bug 2). */
  read: File[];
  /** Files the reader cannot open: a recording, an archive, a binary. The
   *  vault's alone. The Drop sends them under its row at once, because they
   *  carry no verdict to wait for; the Chute routes them by filename or waits
   *  for the pick (D6: vaulting is filing, with a receipt; backups are
   *  permanent, so a backup line has no take-back). */
  vault: File[];
  /** On the Drop, every .csv. The weekly export is the Chute's to read for
   *  the book; dropped on a row it is refused before any read, vaulted under
   *  the row's account, never filed there, and the receipt says so (ruled
   *  2026-09-25, D2, as amended 2026-10-05). Always empty on the Chute, where
   *  a .csv is the export or reads as a sheet. */
  refused: File[];
};

/** The refused export's receipt on the Drop, verbatim (D2 as amended
 *  2026-10-05): what happened, where the file is, what to do. */
export const DROP_CSV_RECEIPT =
  "Not filed here. Backed up. Drop the export in the Chute.";

const isCsv = (f: File): boolean => /\.csv$/i.test(f.name);

/** Sort a drop by door. Pure, so the suite can read what each door does with
 *  the same files. */
export function planDrop(files: readonly File[], door: IngestDoor): DropPlan {
  const { readables, unreadable } = splitDrop(files, DROP_ACCEPT);
  if (door === "chute") return { read: readables, vault: unreadable, refused: [] };
  return {
    read: readables.filter((f) => !isCsv(f)),
    vault: unreadable,
    refused: readables.filter(isCsv),
  };
}

export type FilingOpts = {
  /** The operator's own call. A pick is final: the filing re-runs with force
   *  and the read runs again to be sure, and nothing is re-judged (D5). */
  force?: boolean;
  /** What the reader cut before the text arrived (D4), so the Filing row and
   *  the receipt carry every window. */
  windows?: Window[];
  /** The files waiting on this filing's verdict: an accepted filing releases
   *  them to the vault, a disputed one holds them with the question. */
  waiting?: readonly File[];
  /** The door the capture came through when it is not this flow's own: a
   *  Send-it capture held in the Chute files as the Intranet's (P3). */
  door?: FilingDoor;
};

/** What one filing asks of the server: the account, the text, and the door
 *  the capture came through, which stamps every row the filing writes (P3),
 *  with the operator's force and the reader's windows. A pasted text too
 *  heavy for the server's request cap is windowed to fit here, as the file
 *  reader windows a file, and the window joins the others (TRANSPORT_BYTES;
 *  D4); a text that fits passes untouched (pass 8 call 3). Pure, so the
 *  suite can read the request a pick makes. */
export function filingRequest(
  door: FilingDoor,
  accountId: string,
  text: string,
  opts: Pick<FilingOpts, "force" | "windows"> = {},
): Parameters<typeof roomPaste> {
  const carried = transportCut("the text", text);
  const windows = carried.window
    ? [...(opts.windows ?? []), carried.window]
    : opts.windows;
  return [accountId, carried.text, { force: !!opts.force, door, windows }];
}

/** A filing's result, with what its verdict does with the files that waited
 *  on it. The vault waits on the verdict (founder-decreed 2026-09-03): an
 *  accepted filing releases them, a disputed one holds them with the
 *  question, a duplicate vaults nothing new, and a filing that failed for
 *  any other reason hands them to the backup all the same (pass 8 call 8). */
export type Filed = PasteResult & { vault: VaultStep };

export function useIngest({ door, readPdf }: { door: IngestDoor; readPdf: PdfReader }) {
  const router = useRouter();

  /** The drop's plan, by this door. */
  const plan = (files: FileList | readonly File[] | null | undefined): DropPlan =>
    planDrop(Array.from(files ?? []), door);

  /** One file into paste text, through the browser's readers or this door's
   *  transcriber, with every window that cut something (D4). The Drop's
   *  reader refuses the export too, a belt under planDrop's braces. */
  const read = (f: File) => readFileToText(f, readPdf, { door });

  /** Route a text on the server over the joined roster (C2, D13). The
   *  Chute's call; the Drop is bound to its row and never routes. */
  const route = (text: string): Promise<RouteReply> => routeText(text);

  /** File a text to an account through the pipeline, as this door, or as
   *  the door a handed-off capture came through. */
  const file = (accountId: string, text: string, opts: FilingOpts = {}): Promise<Filed> =>
    fileThrough(opts.door ?? door, accountId, text, opts);

  async function fileThrough(
    door: FilingDoor,
    accountId: string,
    text: string,
    opts: FilingOpts,
  ): Promise<Filed> {
    const r = await roomPaste(...filingRequest(door, accountId, text, opts));
    // Every page derives on request (D15), so the client asks for the fresh
    // read here, once, when the filing took; a refusal wrote nothing to
    // re-read. The server revalidates nothing (slice 9): this ask is the
    // only one the filing makes.
    if (r.ok) router.refresh();
    return { ...r, vault: vaultAfterVerdict(r, opts.waiting) };
  }

  /** Carry one file to the vault under an account, through the server's two
   *  doors: whole when it fits one request, in pieces when it does not. */
  const vault = (
    accountId: string,
    f: File,
    onPiece?: (sent: number, total: number) => void,
  ): Promise<VaultReceipt> =>
    sendToVault(accountId, f, { whole: vaultFile, piece: vaultChunk }, onPiece);

  /** Back one file up under accounts/_unfiled/ and file it on no account:
   *  the held box's ✕ (slice 18a). The same two server doors, in the
   *  vault's unfiled mode, so no token reaches the browser (D8). */
  const vaultUnfiled = (
    f: File,
    onPiece?: (sent: number, total: number) => void,
  ): Promise<VaultReceipt> =>
    sendUnfiled(f, { whole: vaultFile, piece: vaultChunk }, onPiece);

  /** Run the drop's reads at most CHUTE_PARALLEL at a time, in drop order;
   *  the rest wait their turn (D11). */
  function limited<T>(tasks: readonly (() => Promise<T>)[]): Promise<T[]> {
    return runLimited(tasks, CHUTE_PARALLEL);
  }

  return { door, plan, read, route, file, vault, vaultUnfiled, limited };
}

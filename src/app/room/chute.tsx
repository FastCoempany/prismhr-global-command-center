"use client";

// The Chute — the one intake, mounted at the HomeRoom's top and on the
// Intranet: one component, one roster, the same routing wherever it mounts
// (ruled 2026-09-25, D1 — CLAUDE.md, The Chute :301). Throw files at it, as
// many as you like; each one is read on the spot, routed to its account on
// the server by the book's signals and the record's (a known contact's
// email, a company domain, a person the record or the book binds to one
// account, the account's name — C2, D13; the roster never ships here), and
// filed through the same pipeline a paste takes. The misfile guard runs on
// the text's own evidence with or without the key; the model's judgment
// rides when the key is on. Nothing files blind: an unroutable file waits
// with a picker, and a read that disagrees with the route waits for the
// operator's call.
//
// The mechanics live in the shared door hooks (./ingest, slice 8 of the
// Chute brains refactor plan): accept, read, route, file and vault through
// useIngest, the held verdict through use-verdict, the ledger through
// useReceipts, the take-back through useUndo. The faces are the held box and
// the receipt (./ingest/held.tsx, ./ingest/receipt.tsx; slice 18a, the face
// the founder approved with a ship order on 2026-10-06), which the Drop
// paints too. This file is the door: the bar, the fold and what each row's
// choices do.

import { useEffect, useRef, useState } from "react";
import { chuteReadPdf } from "./actions";
import { activityRun, activityStage, activityTakeBack } from "../activity/actions";
import { intranetKeep } from "../intranet/capture-actions";
import { chuteBook, type BookName } from "./route-actions";
import { probeActivityReport, uploadActivityReport } from "@/lib/activity/upload";
import { isGrab } from "@/lib/ingest/grab";
import type { Window } from "@/lib/ingest/windows";
import { shortName } from "@/lib/ingest/short-name";
import { ALREADY_ON_FILE, monthDay } from "@/lib/ingest/wrote";
import { waitAhead, type HeldVerdict } from "./chute-ledger";
import {
  HELD_X_TITLE,
  HELD_X_TITLE_BRAIN,
  HeldBox,
  NO_SURE_MATCH,
  VAULT_PICK,
  type HeldAccount,
  type HeldChoice,
} from "./ingest/held";
import { ReceiptLine } from "./ingest/receipt";
import { useIngest, type FilingDoor } from "./ingest/use-ingest";
import { dismissHeld, holdVerdict, type Verdict } from "./ingest/use-verdict";
import { useReceipts, type Receipt } from "./ingest/use-receipts";
import { useUndo } from "./ingest/use-undo";
import styles from "./room.module.css";

/** Today, M/D in Chicago: the day a settled receipt keeps (D12). */
const today = (): string => monthDay(new Date());

/** The verdict a held row keeps beside its text: the rung, its reason and
 *  the evidence behind it, the claimed account, the candidates. */
const heldOf = (v: Verdict): HeldVerdict => ({
  rung: v.rung,
  reason: v.reason,
  why: v.why,
  boundWhy: v.boundWhy,
  reasonBy: v.reasonBy,
  claimId: v.claimId,
  candidates: v.candidates,
});

const count = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export function Chute({ canWrite }: { canWrite: boolean }) {
  const ingest = useIngest({ door: "chute", readPdf: chuteReadPdf });
  const receipts = useReceipts();
  const { items, patch } = receipts;
  const { undo } = useUndo();
  const [hot, setHot] = useState(false);
  // The ledger folds: every held row and every row still reading shows, and
  // the two newest settled receipts with them (D12) — the page belongs to
  // the opportunities, not the receipts. The meter line opens the rest.
  const [ledgerOpen, setLedgerOpen] = useState(false);
  // Held rows whose ✕ is running: the box stays, its choices wait.
  const [working, setWorking] = useState<ReadonlySet<number>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The second record's book: names only, from the router's door. The
  // routing signals themselves — addresses, domains, people — stay on the
  // server (D13); the held box fetches the same names when it searches.
  const [book, setBook] = useState<BookName[]>([]);
  useEffect(() => {
    void chuteBook().then((b) => {
      if (b.length) setBook(b);
    });
  }, []);
  const bookOrFetched = async (): Promise<BookName[]> =>
    book.length ? book : await chuteBook();

  const fileTo = async (
    key: number,
    text: string,
    account: { id: string; name: string },
    why: string,
    rung: string,
    force: boolean,
    srcFile?: File,
    // What the reader cut before the text arrived (D4), so the Filing row
    // and the receipt carry it; it rides the row to the pick's re-run too.
    windows?: Window[],
    // The door a handed-off capture came through: a Send-it capture files
    // as the Intranet's (P3). The Chute's own rows file as the Chute.
    door?: FilingDoor,
  ) => {
    // The text rides on the row: a mismatch waits for the pick with the text
    // it needs to file, and the ledger keeps it across a reload (C20).
    patch(key, {
      state: "filing",
      account,
      why,
      rung,
      text,
      windows,
      verdict: undefined,
    });
    const r = await ingest.file(account.id, text, {
      force,
      windows,
      waiting: srcFile ? [srcFile] : [],
      door,
    });
    // The same verdict gate the row's Drop runs: the file vaults once the
    // filing is accepted; a dispute keeps it on the row for the pick; a
    // duplicate vaults nothing new; a filing that failed for any other reason
    // still backs its file up (pass 8 call 8), below.
    const [vaulting] = r.vault.archive;
    if (vaulting) void vaultTo(key, account, vaulting, false);
    if (r.ok)
      patch(key, {
        state: "filed",
        filed: r.filed,
        opened: (r.opened ?? []).length,
        promises: r.promises,
        asks: r.asks,
        learned: r.learned,
        archived: r.archived,
        degraded: r.readFailed,
        noteIds: r.noteIds,
        todoIds: r.todoIds,
        filingId: r.filingId,
        windows: r.windows,
        dupeCheck: r.dupeCheck,
        day: today(),
      });
    else if (r.duplicate)
      // The decree's line, and the earlier filing it opens to (pass 8, C2).
      patch(key, {
        state: "dupe",
        reason: r.reason ?? ALREADY_ON_FILE,
        prior: r.prior,
        day: today(),
      });
    else {
      // The row already carries the text and the windows; the verdict adds
      // the claim, its reason and the grounds the held box opens to (D9 as
      // amended 2026-10-05; slice 18a).
      const held = holdVerdict(r, {});
      if (held)
        patch(key, {
          state: "mismatch",
          claim: held.claim,
          reason: held.reason,
          verdict: heldOf(held),
        });
      else {
        patch(key, {
          state: "error",
          reason: r.reason ?? "The file didn't take.",
          day: today(),
        });
        const [failed] = r.vault.failed ?? [];
        if (failed) void backUp(key, failed, account);
      }
    }
  };

  // A Sales Nav grab names a list of accounts, never one (pass 8 call 12,
  // D30; seam S-25): it skips the whole-text route, which could only come
  // back unsure, and the server splits it row by row, each row filed on the
  // account it surely matches. The receipt counts the accounts, the rows
  // that matched none and the rows already on file. The grab's file belongs
  // to no one account, so it backs up under accounts/_unfiled/ (D8: git is
  // the home for every dropped file).
  const fileGrabRow = async (key: number, text: string, f: File, windows?: Window[]) => {
    patch(key, { state: "filing", windows, verdict: undefined });
    const r = await ingest.fileGrab(text, { windows, waiting: [f] });
    if (r.ok) {
      patch(key, {
        state: "filed",
        filed: r.filed,
        grab: r.grab,
        windows: r.windows,
        dupeCheck: r.dupeCheck,
        day: today(),
      });
      const [kept] = r.vault.archive;
      if (kept) void backUp(key, kept);
    } else if (r.duplicate)
      patch(key, { state: "dupe", reason: r.reason ?? ALREADY_ON_FILE, day: today() });
    else {
      patch(key, {
        state: "error",
        reason: r.reason ?? "The file didn't take.",
        day: today(),
      });
      const [failed] = r.vault.failed ?? [];
      if (failed) void backUp(key, failed);
    }
  };

  // A readable file whose filing failed still vaults (ruled 2026-10-07, pass
  // 8 call 8): to the account it was filing to, or under accounts/_unfiled/
  // when it had none or that backup was refused, so git stays the home for
  // every dropped file (D8). The row keeps the failure as its line, and the
  // receipt says the file is backed up beneath it.
  const backUp = async (key: number, f: File, account?: { id: string; name: string }) => {
    const progress = (sent: number, total: number) =>
      patch(key, {
        vault: { text: `Backing up ${f.name}… ${sent} of ${total}`, going: true },
      });
    patch(key, { vault: { text: `Backing up ${f.name}…`, going: true } });
    let r = account ? await ingest.vault(account.id, f, progress) : null;
    if (!r?.ok) r = await ingest.vaultUnfiled(f, progress);
    patch(key, {
      vault: r.ok ? { text: r.detail, url: r.url } : { text: r.reason, bad: true },
    });
  };

  // The vault ride (founder-decreed 2026-09-02; canon since 2026-09-25, D8,
  // as amended 2026-10-05 — CLAUDE.md, The Chute :307): every dropped file
  // also archives whole to the GitHub vault under the account it routed to —
  // readable files after they file, recordings and other binaries as their
  // whole filing; a duplicate drop vaults nothing new. The server does the
  // carrying, so no token reaches the browser; a file above one request's cap
  // goes up in pieces the server assembles before it lands (useIngest's
  // vault, over src/lib/ingest/vault.ts).
  const vaultTo = async (
    key: number,
    account: { id: string; name: string },
    f: File,
    alone: boolean,
  ) => {
    if (alone) patch(key, { state: "filing", account, verdict: undefined });
    patch(key, { vault: { text: `Backing up ${f.name}…`, going: true } });
    const r = await ingest.vault(account.id, f, (sent, total) =>
      patch(key, {
        vault: { text: `Backing up ${f.name}… ${sent} of ${total}`, going: true },
      }),
    );
    patch(key, {
      vault: r.ok ? { text: r.detail, url: r.url } : { text: r.reason, bad: true },
      ...(alone
        ? r.ok
          ? { state: "vaulted", account, day: today() }
          : { state: "error", reason: r.reason, day: today() }
        : {}),
    });
  };

  // The held box's ✕ (slice 18a): the row files nothing on any account. A
  // Send-it capture keeps the brain's own road (P2); everything else backs
  // up under accounts/_unfiled/, the file itself or its text when a reload
  // took the file (dismissHeld), and the receipt says "Not filed. Backed up."
  const dismissRow = async (it: Receipt) => {
    const plan = dismissHeld({
      door: it.door,
      filename: it.filename,
      text: it.text,
      files: it.file ? [it.file] : [],
    });
    if (plan.kind === "none") {
      receipts.dismiss(it.key);
      return;
    }
    setWorking((w) => new Set(w).add(it.key));
    const done = (up: Partial<Receipt>) => {
      patch(it.key, { ...up, verdict: undefined, day: today() });
      setWorking((w) => {
        const next = new Set(w);
        next.delete(it.key);
        return next;
      });
    };
    try {
      if (plan.kind === "keep") {
        const r = await intranetKeep(plan.text);
        done(
          r.ok
            ? { state: "kept" }
            : { state: "error", reason: r.reason ?? "That didn't land." },
        );
        return;
      }
      for (const f of plan.files) {
        const r = await ingest.vaultUnfiled(f, (sent, total) =>
          patch(it.key, {
            vault: { text: `Backing up ${f.name}… ${sent} of ${total}`, going: true },
          }),
        );
        if (!r.ok) {
          done({ state: "error", reason: r.reason, vault: undefined });
          return;
        }
        patch(it.key, { vault: { text: r.detail, url: r.url } });
      }
      done({ state: "unfiled" });
    } catch {
      done({ state: "error", reason: "The backup broke off. Drop it again." });
    }
  };

  // A choice in the held box is final: the filing re-runs with force and the
  // row's windows, the read runs again, nothing is re-judged (D5). The batch
  // sibling's suggestion keeps its own rung on the receipt (D5).
  const pickHeld = (it: Receipt, account: HeldAccount, how: HeldChoice) => {
    const batch = how === "batch";
    const why = batch ? "the rest of this drop went there" : "your call";
    const rung = batch ? "batch" : "pick";
    if (it.text)
      void fileTo(
        it.key,
        it.text,
        account,
        why,
        rung,
        true,
        it.file,
        it.windows,
        it.door,
      );
    else if (it.file) void vaultTo(it.key, account, it.file, true);
  };

  // ↺ takes the whole filing back by its id (use-undo.ts), and the receipt
  // says what went and opens to it (pass 8, C5): the server reads the
  // filing's lines before it takes them back, and the row holds them while
  // the tab lives.
  const takeBack = (it: Receipt) => {
    const acct = it.account;
    // A grab files on many accounts and names none: its take-back reaches
    // every account it filed to (use-undo.ts, seam S-25).
    if (!acct && !it.grab) return;
    const from = acct && !it.grab ? ` from ${shortName(acct.name)}` : "";
    void undo(acct?.id ?? "", it).then((r) => {
      if (r.ok)
        patch(it.key, {
          state: "undone",
          reason: `Taken back${from}. ${r.removed + r.retired} removed.`,
          took: r.took,
          day: today(),
        });
      else patch(it.key, { note: r.reason ?? "The take-back didn't go through." });
    });
  };

  // The activity report is the one file the Chute reads for the BOOK, not an
  // account: blasts tally in the browser and never upload, slices post in
  // verified batches, and the distillation narrates through the Intranet's
  // gadget. Recognition is by parsed header fingerprint, first 4 KB only.
  const swallowActivity = async (f: File, key: number) => {
    patch(key, {
      state: "activity",
      act: true,
      reason: "Reading the activity report here. Blasts tally in this browser.",
    });
    try {
      const res = await uploadActivityReport({
        file: f,
        book: await bookOrFetched(),
        post: activityStage,
        progress: (line) => patch(key, { reason: line }),
      });
      if (!res.ok) {
        patch(key, { state: "error", reason: res.reason ?? "The drop didn't take." });
        return;
      }
      if (res.reply?.unchanged) {
        patch(key, {
          state: "dupe",
          reason: "Nothing changed. The record already holds this drop.",
        });
        return;
      }
      const came = {
        rows: res.rowCount,
        accounts: res.accounts,
        textRows: res.textRows,
      };
      patch(key, {
        came,
        reason: `${came.rows} rows · ${came.accounts} accounts · ${came.textRows} carrying email text. Distilling…`,
      });
      for (;;) {
        const r = await activityRun();
        if (r.done || !r.ok) {
          patch(key, {
            state: r.ok ? "activityDone" : "error",
            // The counts lead. What the run concluded rides behind them —
            // "Coverage: 100%" over a file that read nothing is how the
            // 2026-08-28 drop passed for a success (2026-08-28).
            reason: r.ok
              ? (r.receipt[r.receipt.length - 1] ?? "The second record is distilled.")
              : (r.reason ?? "The run stopped. The receipt is on the Intranet dock."),
          });
          return;
        }
        patch(key, {
          reason: `Distilling. ${r.remaining} account${r.remaining === 1 ? "" : "s"} to go.`,
        });
      }
    } catch {
      patch(key, {
        state: "error",
        reason: "The drop broke midway. Drop it again.",
      });
    }
  };

  // One file, start to finish. `vaultOnly` is the plan's word on a file the
  // reader cannot open: it skips the read and goes to the vault by its
  // filename or waits for the pick.
  const swallow = async (f: File, key: number, vaultOnly: boolean) => {
    // The account the file was filing to, once the route names one: a filing
    // that breaks backs its file up there (pass 8 call 8).
    let filingTo: { id: string; name: string } | undefined;
    try {
      if (/\.csv$/i.test(f.name) && (await probeActivityReport(f))) {
        await swallowActivity(f, key);
        return;
      }
      // The route runs on the server over the joined roster (C2, D13); what
      // comes back is the verdict and the picker's names.
      const routed = async (text: string) => {
        const r = await ingest.route(text);
        if (r.book.length) setBook(r.book);
        return r;
      };
      const read = vaultOnly ? null : await ingest.read(f);
      if (read?.ok && isGrab(read.text)) {
        await fileGrabRow(key, read.text, f, read.windows);
        return;
      }
      if (!read?.ok) {
        // Not readable — a recording, an archive, a binary, or a read that
        // came back empty. It still belongs in the vault: route by the
        // filename (a Teams recording usually carries the meeting's name) and
        // otherwise wait for the pick.
        const { best, candidates, refused } = await routed(f.name);
        if (refused) patch(key, { state: "error", reason: refused });
        else if (best) await vaultTo(key, { id: best.id, name: best.name }, f, true);
        else patch(key, { state: "pick", candidates });
        return;
      }
      const { best, candidates, refused } = await routed(read.text);
      if (refused) patch(key, { state: "error", reason: refused });
      else if (best) {
        filingTo = { id: best.id, name: best.name };
        await fileTo(
          key,
          read.text,
          filingTo,
          best.why,
          best.rung,
          false,
          f,
          read.windows,
        );
      } else
        patch(key, { state: "pick", text: read.text, candidates, windows: read.windows });
    } catch {
      // Nothing dies silently: a broken filing says so, and its file still
      // backs up, to the account it was filing to or under accounts/_unfiled/
      // (pass 8 call 8).
      patch(key, { state: "error", reason: "The filing broke. Drop it again." });
      void backUp(key, f, filingTo);
    }
  };

  const batchSeq = useRef(0);
  const handleFiles = (list: FileList | null) => {
    const batch = ++batchSeq.current;
    const files = Array.from(list ?? []);
    // Every file gets its row the moment it lands; the reads run at most
    // CHUTE_PARALLEL at a time, in drop order, behind any drop still reading
    // — the rest wait their turn and say so with their place, and a row
    // says "Reading…" only once its turn comes (D11). The plan says which
    // files the reader cannot open; on the Chute a .csv is read, because the
    // weekly export is this door's to take.
    const vaultOnly = new Set(ingest.plan(files).vault);
    const seated = receipts.seat(files, batch);
    void ingest.limited(
      seated.map(({ f, key }) => () => {
        receipts.start(key);
        return swallow(f, key, vaultOnly.has(f));
      }),
    );
  };

  // Files thrown together are almost always one account's export. When a
  // held file's batch-mates filed somewhere, that account is the suggestion
  // the held box offers, never a rung (D5).
  const batchMate = (it: Receipt): { id: string; name: string } | null => {
    if (it.batch == null) return null;
    const counts = new Map<string, { id: string; name: string; n: number }>();
    for (const x of items) {
      if (x.batch !== it.batch || x.state !== "filed" || !x.account) continue;
      const c = counts.get(x.account.id) ?? { ...x.account, n: 0 };
      c.n += 1;
      counts.set(x.account.id, c);
    }
    const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
    return top ? { id: top.id, name: top.name } : null;
  };

  const isWaiting = (it: Receipt) => it.state === "pick" || it.state === "mismatch";
  const isRunning = (it: Receipt) =>
    it.state === "reading" || it.state === "filing" || it.state === "activity";
  // Waiting its turn to be read (D11), which is not held: nothing is asked
  // of the operator, the line just has not reached it.
  const isQueued = (it: Receipt) => it.state === "queued";

  // The second record's drop keeps its own receipt: the counts that came in,
  // the run's last line, and its two-press take-back.
  const renderActivity = (it: Receipt) => (
    <div className={styles.rcptRow}>
      <span className={styles.chuteFile}>{it.filename}</span>
      {it.state === "activity" && <span className={styles.rcptLine}>{it.reason}</span>}
      {it.state === "activityDone" && (
        <span className={styles.rcptLine}>
          {it.came ? `${it.came.rows} rows · ` : ""}
          {it.came ? `${it.came.accounts} accounts · ` : ""}
          {it.came ? `${it.came.textRows} carrying email text. ` : ""}
          {it.came?.textRows === 0 ? "This drop read nothing. " : `${it.reason} `}
          <a href="/intranet">The receipt waits on the Intranet.</a>{" "}
          <button
            type="button"
            className={styles.chuteUndo}
            title={
              it.armed
                ? "Press again to clear it. No earlier drop comes back."
                : "Take this drop back. Clears every account's second-record read."
            }
            onClick={() => {
              if (!it.armed) {
                patch(it.key, { armed: true });
                return;
              }
              patch(it.key, { armed: false });
              void activityTakeBack().then((r) => {
                patch(it.key, {
                  state: "undone",
                  reason: r.ok
                    ? `${r.lines[0]} No earlier drop came back.`
                    : (r.reason ?? "The take-back failed."),
                });
              });
            }}
          >
            {it.armed ? "↩ sure?" : "↩ take it back"}
          </button>
        </span>
      )}
      {receipts.settled(it) && (
        <span className={styles.rcptCtl}>
          <button
            type="button"
            title="Clear this receipt"
            aria-label="Clear this receipt"
            onClick={() => receipts.dismiss(it.key)}
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );

  // One row: a held file is the held box; the second record's drop keeps its
  // own receipt; everything else is the receipt line.
  const renderItem = (it: Receipt) => (
    <li key={it.key} className={styles.chuteItem}>
      {isWaiting(it) && (it.text || it.file) ? (
        <HeldBox
          file={it.filename}
          verdict={it.state === "mismatch" ? (it.verdict ?? { reason: it.reason }) : null}
          say={it.text ? NO_SURE_MATCH : VAULT_PICK}
          claim={it.claim}
          bound={it.state === "mismatch" ? (it.account ?? null) : null}
          candidates={
            (it.state === "mismatch" ? it.verdict?.candidates : undefined) ??
            (it.candidates ?? []).map((c) => ({ id: c.id, name: c.name, rung: c.rung }))
          }
          suggestion={batchMate(it)}
          canWrite={canWrite}
          busy={working.has(it.key)}
          status={it.vault?.going ? it.vault.text : undefined}
          dismissTitle={it.door === "intranet" ? HELD_X_TITLE_BRAIN : HELD_X_TITLE}
          onPick={(a, how) => pickHeld(it, a, how)}
          onDismiss={() => void dismissRow(it)}
        />
      ) : isWaiting(it) ? (
        <span className={styles.rcptWarn}>
          {it.filename} · The pick did not survive. Drop the file again.
        </span>
      ) : it.act && (it.state === "activity" || it.state === "activityDone") ? (
        renderActivity(it)
      ) : (
        <ReceiptLine
          row={it}
          canWrite={canWrite}
          onTakeBack={
            it.state === "filed" &&
            (it.noteIds?.length || it.filingId || it.grab?.accounts.length)
              ? () => takeBack(it)
              : undefined
          }
          onClear={receipts.settled(it) ? () => receipts.dismiss(it.key) : undefined}
          ahead={isQueued(it) ? waitAhead(items, it.key) : undefined}
        />
      )}
    </li>
  );

  // The ledger: the meter line, the fold and the rows. Rendered the same in a
  // read-only session, which sees the receipts and cannot drop (D29).
  const ledger =
    items.length > 0 &&
    (() => {
      const running = items.filter(isRunning);
      const queued = items.filter(isQueued);
      const waiting = items.filter(isWaiting);
      const settledCount = items.filter((x) => receipts.settled(x)).length;
      const filed = items.filter((x) => x.state === "filed").length;
      const meter =
        running.length + queued.length + waiting.length > 0
          ? [
              count(items.length, "file", "files"),
              filed > 0 ? `${filed} filed` : "",
              waiting.length > 0 ? `${waiting.length} held` : "",
              running.length > 0 ? `${running.length} reading` : "",
              queued.length > 0 ? `${queued.length} waiting` : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : `${count(items.length, "receipt", "receipts")} · today`;
      // Folded: every held row, every row still reading and every row
      // waiting its turn, then the two newest settled receipts (D12). items
      // is newest-first; keep that order.
      const visible = new Set<number>(
        items
          .filter((x) => isWaiting(x) || isRunning(x) || isQueued(x))
          .map((x) => x.key),
      );
      if (!ledgerOpen) {
        let extra = 0;
        for (const x of items) {
          if (visible.has(x.key)) continue;
          if (extra >= 2) break;
          visible.add(x.key);
          extra++;
        }
      }
      const shown = ledgerOpen ? items : items.filter((x) => visible.has(x.key));
      const hidden = items.length - shown.length;
      return (
        <>
          <div className={styles.chuteMeter}>
            {hidden > 0 || ledgerOpen ? (
              <button
                type="button"
                className={styles.chuteMeterBtn}
                aria-expanded={ledgerOpen}
                title={
                  ledgerOpen ? "Hide the older receipts" : `Show all ${items.length}`
                }
                onClick={() => setLedgerOpen((v) => !v)}
              >
                {meter} {ledgerOpen ? "▴" : "▾"}
              </button>
            ) : (
              <span className={styles.chuteMeterLine}>{meter}</span>
            )}
            {settledCount > 0 && (
              <button
                type="button"
                className={styles.chuteClear}
                title="Clear every settled receipt. The record keeps everything that filed."
                onClick={() => receipts.dismissAll()}
              >
                Clear all
              </button>
            )}
          </div>
          <ul className={styles.chuteList}>{shown.map(renderItem)}</ul>
        </>
      );
    })();

  // A read-only session sees the bar and its receipts and cannot drop: no
  // drop handlers, no input, and the bar says so where the ⇪ button was
  // (ruled 2026-09-25, D29 — CLAUDE.md, The Chute :309).
  if (!canWrite)
    return (
      <section className={styles.chute}>
        <div className={styles.chuteBar}>
          <span className={styles.chuteK}>THE CHUTE</span>
          <span className={styles.chuteLine}>
            Throw files here. They find their account.
          </span>
          <span className={styles.chuteLine}>Read-only session</span>
        </div>
        {ledger}
      </section>
    );

  return (
    <section
      className={`${styles.chute} ${hot ? styles.chuteHot : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setHot(true);
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHot(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className={styles.chuteBar}>
        <span className={styles.chuteK}>THE CHUTE</span>
        <span className={styles.chuteLine}>
          Throw files here. They find their account.
        </span>
        <button
          type="button"
          className={styles.chuteBtn}
          onClick={() => inputRef.current?.click()}
        >
          ⇪ Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* The pact (pass 8, C3): what the pipeline does today, in plain
          sentences, written to the writing canon and the plain-speech law.
          Large files go up in pieces the server assembles, and git is the
          home for every dropped file (D8 as amended 2026-10-05). */}
      <p className={styles.chutePact}>
        <b>The pact:</b> Mail, call transcripts, sheets, documents and text read here in
        the browser. PDFs and images go to the reader. Each file finds its account by a
        contact&apos;s address, the company&apos;s domain, a known person or the
        account&apos;s name, and files like a paste. With the API key on, the read also
        opens to-dos, their promises, asks and playbook lines. A file with no sure
        account, or one that names another, waits for your pick. Nothing files twice.
        Every file is backed up whole in git under its account. The day&apos;s receipts
        survive a reload.
      </p>

      {ledger}
    </section>
  );
}

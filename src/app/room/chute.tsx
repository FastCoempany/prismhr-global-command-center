"use client";

// The Chute — the one intake, mounted at the HomeRoom's top and on the
// Intranet: one component, one roster, the same routing wherever it mounts
// (ruled 2026-09-25, D1 — CLAUDE.md, The Chute :301). Throw files at it, as
// many as you like; each one is read on the spot, routed to its account on
// the server by the book's signals and the record's (a known contact's
// email, a company domain, a person the record or the book binds to one
// account, the account's name — C2, D12; the roster never ships here), and
// filed through the same pipeline a paste takes. The misfile guard runs on
// the text's own evidence with or without the key; the model's judgment
// rides when the key is on. Nothing files blind: an unroutable file waits
// with a picker, and a read that disagrees with the route waits for the
// operator's call.
//
// The mechanics live in the shared door hooks (./ingest, slice 8 of the
// Chute brains refactor plan): accept, read, route, file and vault through
// useIngest, the held verdict through use-verdict, the ledger through
// useReceipts, the take-back through useUndo. This file is the face: what a
// row says, the picker, the bar and the fold.

import { useEffect, useRef, useState } from "react";
import { chuteReadPdf } from "./actions";
import { activityRun, activityStage, activityTakeBack } from "../activity/actions";
import { chuteBook, type BookName } from "./route-actions";
import { probeActivityReport, uploadActivityReport } from "@/lib/activity/upload";
import { filingSentences, type Window } from "@/lib/ingest/windows";
import { useIngest } from "./ingest/use-ingest";
import { holdVerdict } from "./ingest/use-verdict";
import { useReceipts, type Receipt } from "./ingest/use-receipts";
import { useUndo } from "./ingest/use-undo";
import styles from "./room.module.css";

export function Chute({ canWrite }: { canWrite: boolean }) {
  const ingest = useIngest({ door: "chute", readPdf: chuteReadPdf });
  const receipts = useReceipts();
  const { items, patch } = receipts;
  const { undo } = useUndo();
  const [hot, setHot] = useState(false);
  // The ledger folds: the meter line says what is running, anything waiting
  // on the operator's pick stays visible, and at most two other rows show —
  // the page belongs to the opportunities, not the receipts.
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The picker's names, and the second record's book: names only, from the
  // router's door. The roster itself — addresses, domains, people — stays on
  // the server (D12); every route answers with the names too, so a picker
  // that follows a route has its list even when the mount's fetch is slow.
  const [book, setBook] = useState<BookName[]>([]);
  useEffect(() => {
    void chuteBook().then((b) => {
      if (b.length) setBook(b);
    });
  }, []);
  const byName = [...book].sort((a, b) => a.name.localeCompare(b.name));
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
  ) => {
    // The text rides on the row: a mismatch waits for the pick with the text
    // it needs to file, and the ledger keeps it across a reload (C20).
    patch(key, { state: "filing", account, why, rung, text, windows });
    const r = await ingest.file(account.id, text, {
      force,
      windows,
      waiting: srcFile ? [srcFile] : [],
    });
    // The same verdict gate the row's Drop runs: the file vaults only once the
    // filing is accepted; a dispute keeps it on the row for the pick.
    const [vaulting] = r.vault.archive;
    if (vaulting) void vaultTo(key, account, vaulting, false);
    if (r.ok)
      patch(key, {
        state: "filed",
        filed: r.filed,
        opened: (r.opened ?? []).length,
        asks: r.asks,
        learned: r.learned,
        archived: r.archived,
        degraded: r.readFailed,
        noteIds: r.noteIds,
        todoIds: r.todoIds,
        filingId: r.filingId,
        windows: r.windows,
        dupeCheck: r.dupeCheck,
      });
    else if (r.duplicate)
      patch(key, { state: "dupe", reason: r.reason ?? "Already on file." });
    else {
      // The row already carries the text and the windows; the verdict adds
      // the claim and its reason, which the pick line says (D9 as amended
      // 2026-10-05).
      const held = holdVerdict(r, {});
      if (held) patch(key, { state: "mismatch", claim: held.claim, reason: held.reason });
      else patch(key, { state: "error", reason: r.reason ?? "The file didn't take." });
    }
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
    if (alone) patch(key, { state: "filing", account });
    patch(key, { vault: { text: `vaulting ${f.name}…` } });
    const r = await ingest.vault(account.id, f, (sent, total) =>
      patch(key, { vault: { text: `vaulting ${f.name}… ${sent} of ${total}` } }),
    );
    patch(key, {
      vault: r.ok
        ? {
            text: `${r.kind === "release" ? "pre-release" : "vaulted"} · ${r.detail}`,
            url: r.url,
          }
        : { text: r.reason, bad: true },
      ...(alone
        ? r.ok
          ? { state: "vaulted", account }
          : { state: "error", reason: r.reason }
        : {}),
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
      reason: "The activity report. Reading it here — blasts tally in the browser.",
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
          reason: "Nothing changed — the record already holds this drop.",
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
              : (r.reason ?? "The run stopped — the Intranet dock holds the receipt."),
          });
          return;
        }
        patch(key, {
          reason: `Distilling — ${r.remaining} account${r.remaining === 1 ? "" : "s"} to go.`,
        });
      }
    } catch {
      patch(key, {
        state: "error",
        reason: "The drop broke midway. Drop it again — staging replaces wholesale.",
      });
    }
  };

  // One file, start to finish. `vaultOnly` is the plan's word on a file the
  // reader cannot open: it skips the read and goes to the vault by its
  // filename or waits for the pick.
  const swallow = async (f: File, key: number, vaultOnly: boolean) => {
    try {
      if (/\.csv$/i.test(f.name) && (await probeActivityReport(f))) {
        await swallowActivity(f, key);
        return;
      }
      // The route runs on the server over the joined roster (C2, D12); what
      // comes back is the verdict and the picker's names.
      const routed = async (text: string) => {
        const r = await ingest.route(text);
        if (r.book.length) setBook(r.book);
        return r;
      };
      const read = vaultOnly ? null : await ingest.read(f);
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
      else if (best)
        await fileTo(
          key,
          read.text,
          { id: best.id, name: best.name },
          best.why,
          best.rung,
          false,
          f,
          read.windows,
        );
      else
        patch(key, { state: "pick", text: read.text, candidates, windows: read.windows });
    } catch {
      // Nothing dies silently — a broken filing says so.
      patch(key, { state: "error", reason: "The filing broke. Drop it again." });
    }
  };

  const batchSeq = useRef(0);
  const handleFiles = (list: FileList | null) => {
    const batch = ++batchSeq.current;
    const files = Array.from(list ?? []);
    // Every file gets its row the moment it lands; the reads run at most
    // CHUTE_PARALLEL at a time, in drop order — the rest wait their turn
    // (D11). The plan says which files the reader cannot open; on the Chute
    // a .csv is read, because the weekly export is this door's to take.
    const vaultOnly = new Set(ingest.plan(files).vault);
    const seated = receipts.seat(files, batch);
    void ingest.limited(
      seated.map(
        ({ f, key }) =>
          () =>
            swallow(f, key, vaultOnly.has(f)),
      ),
    );
  };

  // Files thrown together are almost always one account's export. When an
  // unsure file's batch-mates filed somewhere, that account is the one-click
  // suggestion; the picker stays as the fallback.
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

  // A settled receipt is the operator's to clear (decreed 2026-09-01); the
  // gate is isSettled in chute-ledger.ts, read through the ledger hook.

  // One receipt row — shared by the folded view and the open ledger.
  const renderItem = (it: Receipt) => (
    <li key={it.key} className={styles.chuteItem}>
      {receipts.settled(it) && (
        <button
          type="button"
          className={styles.chuteDismiss}
          title="Clear this receipt. The record keeps everything that filed."
          onClick={() => receipts.dismiss(it.key)}
        >
          ✕
        </button>
      )}
      <span className={styles.chuteFile}>{it.filename}</span>
      {it.state === "reading" && <span>Reading…</span>}
      {it.state === "filing" && it.account && (
        <span>
          Filing to {it.account.name}… {it.why ? `(${it.why})` : ""}
        </span>
      )}
      {it.state === "filed" && it.account && (
        <span className={styles.chuteDone}>
          ✓ {it.account.name} · {it.filed} filed
          {it.degraded
            ? " · the reader was down — raw text only, nothing routed; ↩ undo and re-drop when it's back"
            : it.archived
              ? " · transcript on file"
              : ""}
          {(it.opened ?? 0) > 0
            ? ` · ${it.opened} action${it.opened === 1 ? "" : "s"} opened`
            : ""}
          {(it.asks ?? 0) > 0
            ? ` · ${it.asks} ask${it.asks === 1 ? "" : "s"} queued`
            : ""}
          {(it.learned ?? 0) > 0 ? ` · ${it.learned} to the playbook` : ""}
          {it.why ? ` · ${it.why}` : ""}
          {filingSentences(it)
            .map((s) => ` · ${s}`)
            .join("")}
          {(it.noteIds?.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.chuteUndo}
              title="Wrong account? Takes back everything this filing wrote."
              onClick={() => {
                const acct = it.account;
                const ids = it.noteIds;
                if (!acct || !ids?.length) return;
                void undo(acct.id, it).then((r) => {
                  if (r.ok)
                    patch(it.key, {
                      state: "undone",
                      reason: `Taken back from ${acct.name}. ${r.removed} removed${
                        r.retired
                          ? `, ${r.retired} action${r.retired === 1 ? "" : "s"} retired`
                          : ""
                      }.`,
                    });
                });
              }}
            >
              ↩ undo
            </button>
          )}
        </span>
      )}
      {it.state === "undone" && <span className={styles.chuteDupe}>{it.reason}</span>}
      {it.state === "vaulted" && (
        <span className={styles.chuteDone}>
          Vaulted to {it.account?.name ?? "its account"}.
        </span>
      )}
      {it.state === "activity" && <span>{it.reason}</span>}
      {it.state === "activityDone" && (
        <span className={it.came?.textRows === 0 ? styles.chuteWarn : styles.chuteDone}>
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
                ? "Press again to clear it. Earlier drops are not kept, so nothing is restored."
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
                    ? `${r.lines[0]} Nothing was restored — earlier drops are not kept.`
                    : (r.reason ?? "The take-back failed."),
                });
              });
            }}
          >
            {it.armed ? "↩ sure?" : "↩ take it back"}
          </button>
        </span>
      )}
      {it.state === "error" && <span className={styles.chuteErr}>{it.reason}</span>}
      {it.vault && (
        <span className={it.vault.bad ? styles.chuteErr : styles.chuteDupe}>
          ⇪ {it.vault.text}
          {it.vault.url && (
            <>
              {" "}
              <a href={it.vault.url} target="_blank" rel="noreferrer">
                open
              </a>
            </>
          )}
        </span>
      )}
      {it.state === "dupe" && <span className={styles.chuteDupe}>{it.reason}</span>}
      {it.state === "interrupted" && (
        <span className={styles.chuteWarn}>{it.reason}</span>
      )}
      {(it.state === "pick" || it.state === "mismatch") && !it.text && !it.file && (
        <span className={styles.chuteWarn}>
          The pick did not survive. Drop the file again.
        </span>
      )}
      {(it.state === "pick" || it.state === "mismatch") && (it.text || it.file) && (
        <span className={styles.chutePick}>
          {it.state === "mismatch" ? (
            <span className={styles.chuteErr}>
              {/* The disputed row's receipt says the rung's reason — nine
                  words or fewer (D9 as amended 2026-10-05). */}
              {it.reason
                ? `${it.reason} `
                : `Reads like ${it.claim || "another account"}. `}
              Pick the account.
            </span>
          ) : it.text ? (
            <span>No sure match. Pick the account.</span>
          ) : (
            <span>
              A file the reader can&apos;t open. Pick its account for the vault.
            </span>
          )}
          {(() => {
            const mate = it.state === "pick" ? batchMate(it) : null;
            return (
              mate && (
                <button
                  type="button"
                  className={styles.chuteBtn}
                  title="The rest of this drop filed there."
                  onClick={() => {
                    if (it.text)
                      void fileTo(
                        it.key,
                        it.text,
                        mate,
                        "the rest of this drop went there",
                        "batch",
                        true,
                        it.file,
                        it.windows,
                      );
                    else if (it.file) void vaultTo(it.key, mate, it.file, true);
                  }}
                >
                  File to {mate.name}
                </button>
              )
            );
          })()}
          <select
            className={styles.chuteSel}
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              const a =
                book.find((x) => x.id === id) ??
                (it.candidates ?? []).find((x) => x.id === id);
              if (a && it.text)
                void fileTo(
                  it.key,
                  it.text,
                  { id: a.id, name: a.name },
                  "your call",
                  "pick",
                  true,
                  it.file,
                  it.windows,
                );
              else if (a && it.file)
                void vaultTo(it.key, { id: a.id, name: a.name }, it.file, true);
            }}
          >
            <option value="" disabled>
              Pick the account…
            </option>
            {(it.candidates ?? []).map((c) => (
              <option key={`c${c.id}`} value={c.id}>
                {c.name} · {c.why}
              </option>
            ))}
            {byName.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </span>
      )}
    </li>
  );

  // The ledger: the meter line, the fold and the rows. Rendered the same in a
  // read-only session, which sees the receipts and cannot drop (D29).
  const ledger =
    items.length > 0 &&
    (() => {
      const running = items.filter(
        (x) => x.state === "reading" || x.state === "filing" || x.state === "activity",
      );
      const waiting = items.filter((x) => x.state === "pick" || x.state === "mismatch");
      const meter = [
        running.length > 0 ? `${running.length} running` : "",
        waiting.length > 0
          ? `${waiting.length} need${waiting.length === 1 ? "s" : ""} your pick`
          : "",
        `${items.length - running.length - waiting.length} settled today`,
      ]
        .filter(Boolean)
        .join(" · ");
      // Folded: everything waiting on the operator, then the freshest two
      // of the rest. items is newest-first; keep that order.
      const visible = new Set<number>(waiting.map((x) => x.key));
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
            <span className={styles.chuteMeterLine}>{meter}</span>
            {(hidden > 0 || ledgerOpen) && (
              <button
                type="button"
                className={styles.chuteFold}
                onClick={() => setLedgerOpen((v) => !v)}
              >
                {ledgerOpen ? "Fold the ledger" : `Open the ledger · ${items.length}`}
              </button>
            )}
          </div>
          <ul className={styles.chuteList}>
            {shown.map(renderItem)}
            {ledgerOpen && (
              <li>
                <button
                  type="button"
                  className={styles.chuteClear}
                  onClick={() => receipts.dismissAll()}
                >
                  Clear the receipts
                </button>
              </li>
            )}
          </ul>
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

      <p className={styles.chutePact}>
        <b>The pact:</b> Emails, call transcripts (.vtt), spreadsheets, Word documents,
        and text read free in your browser; PDFs and images — screenshots included, HEIC
        converts on the way in — read through Claude. Every file routes by the book and
        the record — contact email, then company domain, then a known person, then account
        name — and files like a paste: with the API key on, Claude splits the thread into
        dated entries, opens the commitments it finds, queues the unknowns as asks, files
        competitor intel and lessons to the Playbook, detects Closed Won or Lost, and
        flags a file that reads like the wrong account; without the key the record still
        files by rules. Nothing files blind — no sure match waits for your pick — nothing
        files twice — a re-drop of something already on file is refused — receipts survive
        a reload, and HomeRoom, Groundwork, Accounts, and Today re-read the record at
        once, the Intranet mirroring it on its next sync. Every file also lands in the
        GitHub vault under its account — recordings and other files the reader can&apos;t
        open route by their filename or wait for your pick, and anything past 25MB rides
        as a pre-release (2GB is the ceiling per file).
      </p>

      {ledger}
    </section>
  );
}

"use client";

// The Chute — the room's single intake. Throw files at it, as many as you
// like; each one is read on the spot, routed to its account by the book's own
// signals (a known contact's email, a company domain, the account's name),
// and filed through the same pipeline a paste takes — judgment and misfile
// guard included when the key is on. Nothing files blind: an unroutable file
// waits with a picker, and a read that disagrees with the route waits for the
// operator's call.

import { useEffect, useRef, useState } from "react";
import { chuteReadPdf, roomPaste, roomPasteUndo } from "./actions";
import { DROP_ACCEPT } from "@/lib/paste-files";
import { readFileToText } from "./read-file";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";
import styles from "./room.module.css";

type ChuteItem = {
  key: number;
  filename: string;
  state:
    | "reading"
    | "filing"
    | "filed"
    | "pick"
    | "mismatch"
    | "error"
    | "dupe"
    | "interrupted"
    | "undone";
  text?: string;
  account?: { id: string; name: string };
  why?: string;
  candidates?: RouteHit[];
  filed?: number;
  opened?: number;
  asks?: number; // questions the read queued for the record
  learned?: number; // facts and lessons the read filed to the playbook
  reason?: string;
  claim?: string; // the read's own account name, on a mismatch
  batch?: number; // files thrown together — one drop, one batch
  archived?: boolean; // a call transcript's full text rode along
  noteIds?: string[]; // what this filing wrote — the undo's reach
};

// The ledger survives a reload: receipts persist per Chicago day, minus the
// heavy fields (text, candidates). A reload reconciles honestly — finished
// receipts keep their ✓; anything mid-flight when the page died comes back
// as interrupted, because its read died with the tab. The room never quietly
// forgets what was thrown at it.
const LEDGER_KEY = "chute-ledger-v1";
const LEDGER_CAP = 40;

const chicagoDay = (): string =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

type StoredItem = Omit<ChuteItem, "text" | "candidates">;

function loadLedger(): { items: StoredItem[]; maxKey: number } {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return { items: [], maxKey: 0 };
    const parsed = JSON.parse(raw) as { day?: string; items?: StoredItem[] };
    if (parsed.day !== chicagoDay() || !Array.isArray(parsed.items))
      return { items: [], maxKey: 0 };
    const items = parsed.items.slice(0, LEDGER_CAP).map((x) =>
      x.state === "reading" ||
      x.state === "filing" ||
      x.state === "pick" ||
      x.state === "mismatch"
        ? {
            ...x,
            state: "interrupted" as const,
            reason: "A reload cut the read short. Drop the file again.",
          }
        : x,
    );
    return { items, maxKey: items.reduce((m, x) => Math.max(m, x.key), 0) };
  } catch {
    return { items: [], maxKey: 0 };
  }
}

function saveLedger(items: ChuteItem[]) {
  try {
    const slim: StoredItem[] = items.slice(0, LEDGER_CAP).map((x) => ({
      key: x.key,
      filename: x.filename,
      state: x.state,
      account: x.account,
      why: x.why,
      filed: x.filed,
      opened: x.opened,
      asks: x.asks,
      learned: x.learned,
      reason: x.reason,
      claim: x.claim,
      batch: x.batch,
      archived: x.archived,
      noteIds: x.noteIds,
    }));
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ day: chicagoDay(), items: slim }));
  } catch {
    // storage full or blocked — the live view still works
  }
}

export function Chute({
  roster,
  canWrite,
}: {
  roster: RouteAccount[];
  canWrite: boolean;
}) {
  const [items, setItems] = useState<ChuteItem[]>([]);
  const [hot, setHot] = useState(false);
  // The ledger folds: the meter line says what is running, anything waiting
  // on the operator's pick stays visible, and at most two other rows show —
  // the page belongs to the opportunities, not the receipts.
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const seq = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const byName = [...roster].sort((a, b) => a.name.localeCompare(b.name));

  // Reload the day's ledger once on mount; persist on every change after.
  const loaded = useRef(false);
  useEffect(() => {
    const stored = loadLedger();
    seq.current = stored.maxKey;
    loaded.current = true;
    if (!stored.items.length) return;
    // Deferred so hydration completes against the server's empty list first.
    const t = setTimeout(() => setItems(stored.items), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (loaded.current) saveLedger(items);
  }, [items]);

  const patch = (key: number, up: Partial<ChuteItem>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...up } : x)));

  const fileTo = async (
    key: number,
    text: string,
    account: { id: string; name: string },
    why: string,
    force: boolean,
  ) => {
    patch(key, { state: "filing", account, why });
    const r = await roomPaste(account.id, text, { force });
    if (r.ok)
      patch(key, {
        state: "filed",
        filed: r.filed,
        opened: (r.opened ?? []).length,
        asks: r.asks,
        learned: r.learned,
        archived: r.archived,
        noteIds: r.noteIds,
      });
    else if (r.duplicate)
      patch(key, { state: "dupe", reason: r.reason ?? "Already on file." });
    else if (r.mismatch)
      patch(key, { state: "mismatch", claim: r.mismatch.claim, reason: r.reason });
    else patch(key, { state: "error", reason: r.reason ?? "The file didn't take." });
  };

  const swallow = async (f: File, batch: number) => {
    const key = ++seq.current;
    setItems((xs) => [{ key, filename: f.name, state: "reading", batch }, ...xs]);
    try {
      const read = await readFileToText(f, chuteReadPdf);
      if (!read.ok) {
        patch(key, { state: "error", reason: read.reason });
        return;
      }
      const { best, candidates } = routeCapture(read.text, roster);
      if (best)
        await fileTo(key, read.text, { id: best.id, name: best.name }, best.why, false);
      else patch(key, { state: "pick", text: read.text, candidates });
    } catch {
      // Nothing dies silently — a broken filing says so.
      patch(key, { state: "error", reason: "The filing broke. Drop it again." });
    }
  };

  const batchSeq = useRef(0);
  const handleFiles = (list: FileList | null) => {
    const batch = ++batchSeq.current;
    for (const f of Array.from(list ?? [])) void swallow(f, batch);
  };

  // Files thrown together are almost always one account's export. When an
  // unsure file's batch-mates filed somewhere, that account is the one-click
  // suggestion; the picker stays as the fallback.
  const batchMate = (it: ChuteItem): { id: string; name: string } | null => {
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

  // One receipt row — shared by the folded view and the open ledger.
  const renderItem = (it: ChuteItem) => (
    <li key={it.key} className={styles.chuteItem}>
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
          {it.archived ? " · transcript on file" : ""}
          {(it.opened ?? 0) > 0
            ? ` · ${it.opened} action${it.opened === 1 ? "" : "s"} opened`
            : ""}
          {(it.asks ?? 0) > 0
            ? ` · ${it.asks} ask${it.asks === 1 ? "" : "s"} queued`
            : ""}
          {(it.learned ?? 0) > 0 ? ` · ${it.learned} to the playbook` : ""}
          {it.why ? ` · ${it.why}` : ""}
          {(it.noteIds?.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.chuteUndo}
              title="Wrong account? Removes this filing's record entries."
              onClick={() => {
                const acct = it.account;
                const ids = it.noteIds;
                if (!acct || !ids?.length) return;
                void roomPasteUndo(acct.id, ids).then((r) => {
                  if (r.ok)
                    patch(it.key, {
                      state: "undone",
                      reason: `Taken back from ${acct.name}. ${r.removed} removed.`,
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
      {it.state === "error" && <span className={styles.chuteErr}>{it.reason}</span>}
      {it.state === "dupe" && <span className={styles.chuteDupe}>{it.reason}</span>}
      {it.state === "interrupted" && (
        <span className={styles.chuteWarn}>{it.reason}</span>
      )}
      {(it.state === "pick" || it.state === "mismatch") && !it.text && (
        <span className={styles.chuteWarn}>
          The pick did not survive. Drop the file again.
        </span>
      )}
      {(it.state === "pick" || it.state === "mismatch") && it.text && (
        <span className={styles.chutePick}>
          {it.state === "mismatch" ? (
            <span className={styles.chuteErr}>
              Reads like {it.claim || "another account"}. Pick the account.
            </span>
          ) : (
            <span>No sure match. Pick the account.</span>
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
                        true,
                      );
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
              const a = roster.find((x) => x.id === id);
              if (a && it.text)
                void fileTo(
                  it.key,
                  it.text,
                  { id: a.id, name: a.name },
                  "your call",
                  true,
                );
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

  if (!canWrite) return null;

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
          accept={DROP_ACCEPT}
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
        converts on the way in — read through Claude. Every file routes by the book —
        contact email, then company domain, then account name — and files like a paste:
        with the API key on, Claude splits the thread into dated entries, opens the
        commitments it finds, queues the unknowns as asks, files competitor intel and
        lessons to the Playbook, detects Closed Won or Lost, and flags a file that reads
        like the wrong account; without the key the record still files by rules. Nothing
        files blind — no sure match waits for your pick — nothing files twice — a re-drop
        of something already on file is refused — receipts survive a reload, and HomeRoom,
        Groundwork, Accounts, and Today re-read the record at once, the Intranet mirroring
        it on its next sync.
      </p>

      {items.length > 0 &&
        (() => {
          const running = items.filter(
            (x) => x.state === "reading" || x.state === "filing",
          );
          const waiting = items.filter(
            (x) => x.state === "pick" || x.state === "mismatch",
          );
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
                      onClick={() => setItems([])}
                    >
                      Clear the receipts
                    </button>
                  </li>
                )}
              </ul>
            </>
          );
        })()}
    </section>
  );
}

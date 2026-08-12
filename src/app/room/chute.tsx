"use client";

// The Chute — the room's single intake. Throw files at it, as many as you
// like; each one is read on the spot, routed to its account by the book's own
// signals (a known contact's email, a company domain, the account's name),
// and filed through the same pipeline a paste takes — judgment and misfile
// guard included when the key is on. Nothing files blind: an unroutable file
// waits with a picker, and a read that disagrees with the route waits for the
// operator's call.

import { useEffect, useRef, useState } from "react";
import { chuteReadPdf, roomPaste } from "./actions";
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
    | "interrupted";
  text?: string;
  account?: { id: string; name: string };
  why?: string;
  candidates?: RouteHit[];
  filed?: number;
  opened?: number;
  reason?: string;
  claim?: string; // the read's own account name, on a mismatch
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
      reason: x.reason,
      claim: x.claim,
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
      patch(key, { state: "filed", filed: r.filed, opened: (r.opened ?? []).length });
    else if (r.duplicate)
      patch(key, { state: "dupe", reason: r.reason ?? "Already on file." });
    else if (r.mismatch)
      patch(key, { state: "mismatch", claim: r.mismatch.claim, reason: r.reason });
    else patch(key, { state: "error", reason: r.reason ?? "The file didn't take." });
  };

  const swallow = async (f: File) => {
    const key = ++seq.current;
    setItems((xs) => [{ key, filename: f.name, state: "reading" }, ...xs]);
    const read = await readFileToText(f, chuteReadPdf);
    if (!read.ok) {
      patch(key, { state: "error", reason: read.reason });
      return;
    }
    const { best, candidates } = routeCapture(read.text, roster);
    if (best)
      await fileTo(key, read.text, { id: best.id, name: best.name }, best.why, false);
    else patch(key, { state: "pick", text: read.text, candidates });
  };

  const handleFiles = (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) void swallow(f);
  };

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
          accept=".eml,.msg,.pdf,.txt,.md,.csv,.log,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p className={styles.chutePact}>
        <b>The pact:</b> Emails and text read free in your browser; PDFs read through
        Claude. Every file routes by the book — contact email, then company domain, then
        account name — and files like a paste: with the API key on, Claude splits the
        thread into dated entries, opens the commitments it finds, queues the unknowns as
        asks, files competitor intel and lessons to the Playbook, detects Closed Won or
        Lost, and flags a file that reads like the wrong account; without the key the
        record still files by rules. Nothing files blind — no sure match waits for your
        pick — nothing files twice — a re-drop of something already on file is refused —
        receipts survive a reload, and HomeRoom, Groundwork, Accounts, and Today re-read
        the record at once, the Intranet mirroring it on its next sync.
      </p>

      {items.length > 0 && (
        <ul className={styles.chuteList}>
          {items.map((it) => (
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
                  {(it.opened ?? 0) > 0 ? ` · ${it.opened} actions opened` : ""}
                  {it.why ? ` · ${it.why}` : ""}
                </span>
              )}
              {it.state === "error" && (
                <span className={styles.chuteErr}>{it.reason}</span>
              )}
              {it.state === "dupe" && (
                <span className={styles.chuteDupe}>{it.reason}</span>
              )}
              {it.state === "interrupted" && (
                <span className={styles.chuteWarn}>{it.reason}</span>
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
          ))}
          <li>
            <button
              type="button"
              className={styles.chuteClear}
              onClick={() => setItems([])}
            >
              Clear the receipts
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}

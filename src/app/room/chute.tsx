"use client";

// The Chute — the room's single intake. Throw files at it, as many as you
// like; each one is read on the spot, routed to its account by the book's own
// signals (a known contact's email, a company domain, the account's name),
// and filed through the same pipeline a paste takes — judgment and misfile
// guard included when the key is on. Nothing files blind: an unroutable file
// waits with a picker, and a read that disagrees with the route waits for the
// operator's call.

import { useRef, useState } from "react";
import { chuteReadPdf, roomPaste } from "./actions";
import { readFileToText } from "./read-file";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";
import styles from "./room.module.css";

type ChuteItem = {
  key: number;
  filename: string;
  state: "reading" | "filing" | "filed" | "pick" | "mismatch" | "error";
  text?: string;
  account?: { id: string; name: string };
  why?: string;
  candidates?: RouteHit[];
  filed?: number;
  opened?: number;
  reason?: string;
  claim?: string; // the read's own account name, on a mismatch
};

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
        </ul>
      )}
    </section>
  );
}

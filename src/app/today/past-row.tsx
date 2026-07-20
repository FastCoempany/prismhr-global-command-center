"use client";

// One past row on Today's tab. Rows that carry a LedgerSrc (notes, checked-off
// sheet notes, touch-log entries) edit in place: click the text to open the
// full underlying body, save writes through to wherever the words live, × is
// delete. Rows with no src (sends, move stamps) render read-only as before.

import { useState } from "react";
import type { LedgerEvent } from "@/lib/today/ledger";
import { deleteLedgerNote, saveLedgerNote } from "./actions";
import styles from "../command-center.module.css";

export function PastRow({ e, timeLabel }: { e: LedgerEvent; timeLabel: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(e.src?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  // Local echo so the row reads right the instant a save lands, before the
  // server re-render streams in.
  const [savedBody, setSavedBody] = useState<string | null>(null);

  if (gone) return null;
  const src = e.src;
  const shown = savedBody === null ? e.text : `${textPrefix(e.text)}${savedBody.slice(0, 70)}`;

  const save = async () => {
    if (!src || busy) return;
    const body = draft.trim();
    if (!body || body === src.body) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const r = await saveLedgerNote(src, body);
    if (r.ok) setSavedBody(body);
    setBusy(false);
    setEditing(false);
  };

  const remove = async () => {
    if (!src || busy) return;
    setBusy(true);
    const r = await deleteLedgerNote(src);
    setBusy(false);
    if (r.ok) setGone(true);
  };

  return (
    <div className={`${styles.lgRow} ${styles.lgPast}`}>
      <span className={styles.lgTm}>{timeLabel}</span>
      <span
        className={`${styles.lgDot} ${
          e.kind === "send" ? styles.lgDotSend : styles.lgDotDone
        }`}
      />
      {editing && src ? (
        <span className={styles.lgEditWrap}>
          <textarea
            className={styles.sheetEdit}
            value={draft}
            autoFocus
            rows={Math.max(1, draft.split("\n").length)}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                void save();
              }
              if (ev.key === "Escape") setEditing(false);
            }}
            onBlur={save}
          />
        </span>
      ) : (
        <>
          <span
            className={`${styles.lgTx} ${src ? styles.lgTxEdit : ""}`}
            title={src ? "Click to edit" : shown}
            onClick={() => {
              if (!src) return;
              setDraft(savedBody ?? src.body);
              setEditing(true);
            }}
          >
            {shown}
          </span>
          {src && (
            <button
              type="button"
              className={styles.sheetGhost}
              title="Delete this entry"
              disabled={busy}
              onClick={remove}
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  );
}

// "Done — body", "Note → Acme: body" … keep the prefix, swap the body after an
// inline save so the row's framing survives the local echo.
function textPrefix(text: string): string {
  const m = /^(.*?(?:—|:)\s)/.exec(text);
  return m ? m[1] : "";
}

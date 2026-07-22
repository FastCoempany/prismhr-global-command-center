"use client";

// One past row on Today's tab — EVERYTHING above the now-line is malleable.
// Rows that carry a LedgerSrc (notes, checked-off sheet notes, touch-log
// entries) edit in place: click the text to open the full underlying body.
// Src-less rows (checked moves, sent stamps) carry undo/hide keys instead:
// ↩ un-checks the move, ✕ hides any row into the Archive's bin. Nothing on
// this rail is ever read-only or permanently deleted.

import { useState } from "react";
import type { LedgerEvent } from "@/lib/today/ledger";
import {
  hideLedgerKey,
  hideLedgerNote,
  makeLedgerAction,
  reopenLedgerNote,
  saveLedgerNote,
  undoTaskDone,
} from "./actions";
import { Glyph, PowIcon } from "./ledger-icons";
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
  const shown =
    savedBody === null ? e.text : `${textPrefix(e.text)}${savedBody.slice(0, 70)}`;

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

  // ✕ hides — the entry moves to the Archive's hidden bin, restorable.
  const hide = async () => {
    if (busy) return;
    setBusy(true);
    const r = src
      ? await hideLedgerNote({ ...src, body: savedBody ?? src.body })
      : e.hideKey
        ? await hideLedgerKey(e.hideKey, e.text)
        : { ok: false };
    setBusy(false);
    if (r.ok) setGone(true);
  };

  // ↩ — undo the ✓. A sheet note reopens on the Day Sheet; a checked move
  // drops back below the now-line as open work.
  const reopen = async () => {
    if (busy) return;
    setBusy(true);
    const r =
      src && src.store === "todo"
        ? await reopenLedgerNote(src)
        : e.undoKey
          ? await undoTaskDone(e.undoKey)
          : { ok: false };
    setBusy(false);
    if (r.ok) setGone(true);
  };

  // Miscapture rescue — this note becomes an open ACTION below the now-line.
  const toAction = async () => {
    if (!src || busy) return;
    setBusy(true);
    const r = await makeLedgerAction({ ...src, body: savedBody ?? src.body });
    setBusy(false);
    if (r.ok) setGone(true);
  };

  const canReopen = (src?.store === "todo" && e.kind === "done") || !!e.undoKey;
  const canHide = !!src || !!e.hideKey;

  return (
    <div className={`${styles.lgRow} ${styles.lgPast}`}>
      <span className={styles.lgTm}>{timeLabel}</span>
      <Glyph kind={e.kind === "send" ? "sent" : e.kind === "note" ? "note" : "done"} />
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
          <span className={styles.lgCtl}>
            {src && (
              <button
                type="button"
                className={styles.pastToAction}
                title="Make this an action — it moves below the now-line, open"
                disabled={busy}
                onClick={toAction}
              >
                <PowIcon />
              </button>
            )}
            {canReopen && (
              <button
                type="button"
                className={styles.sheetGhost}
                title={
                  src
                    ? "Undo the ✓ — reopen on the Day Sheet"
                    : "Undo the ✓ — the move reopens below the now-line"
                }
                disabled={busy}
                onClick={reopen}
              >
                ↩
              </button>
            )}
            {canHide && (
              <button
                type="button"
                className={styles.sheetGhost}
                title="Hide — moves to the Archive (restorable)"
                disabled={busy}
                onClick={hide}
              >
                ×
              </button>
            )}
          </span>
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

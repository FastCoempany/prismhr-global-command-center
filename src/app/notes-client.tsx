"use client";

import { useEffect, useRef, useState } from "react";
import type { Todo } from "@/lib/today/follow-ups";
import {
  createTodoNote,
  deleteTodoNote,
  saveTodoNote,
  setTodoDone,
} from "./today/actions";
import styles from "./command-center.module.css";

type Acct = { id: string; name: string };
type Status = "idle" | "saving" | "saved" | "local";
type Note = Todo & { status?: Status };

// --- localStorage backup (#1): instant, survives refresh/crash ---------------
const DRAFT = "note-draft:";
type Draft = { body: string; accountId: string; remindAt: string };
function readDraft(id: string): Draft | null {
  try {
    const s = localStorage.getItem(DRAFT + id);
    return s ? (JSON.parse(s) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(id: string, d: Draft) {
  try {
    localStorage.setItem(DRAFT + id, JSON.stringify(d));
  } catch {
    /* storage full / disabled — DB is still the durable store */
  }
}
function clearDraft(id: string) {
  try {
    localStorage.removeItem(DRAFT + id);
  } catch {
    /* ignore */
  }
}

// ISO instant → the value a <input type="datetime-local"> expects (local time).
function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusChip({ s }: { s?: Status }) {
  if (s === "saving")
    return (
      <span className={`${styles.noteStatus} ${styles.noteStatusSaving}`}>Saving…</span>
    );
  if (s === "local")
    return (
      <span className={`${styles.noteStatus} ${styles.noteStatusLocal}`}>
        Saved locally · retrying
      </span>
    );
  return (
    <span className={`${styles.noteStatus} ${styles.noteStatusSaved}`}>Saved ✓</span>
  );
}

export function NotesPanel({
  initialNotes,
  accounts,
}: {
  initialNotes: Todo[];
  accounts: Acct[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(0);
  const [focusId, setFocusId] = useState("");
  // Only one note is open for editing at a time; the rest sit as a compact,
  // clickable list. Saving (or adding a new note) controls which one is open.
  const [openId, setOpenId] = useState<string | null>(null);
  const notesRef = useRef<Note[]>(initialNotes);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Backup #2 — durable DB write, debounced. On failure the localStorage draft
  // stays, so nothing is ever lost; on success we clear it.
  function scheduleSave(
    id: string,
    body: string,
    accountId: string,
    remindAt: string,
    delay = 600,
  ) {
    writeDraft(id, { body, accountId, remindAt });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: "saving" } : n)));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const res = await saveTodoNote(id, body, accountId, remindAt);
      const ok = !!res?.ok;
      if (ok) clearDraft(id);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: ok ? "saved" : "local" } : n)),
      );
    }, delay);
  }

  // Recover any unsaved drafts on mount (e.g. tab closed mid-save) — the
  // localStorage copy is newer than the server, so restore it and re-persist.
  // Deferred to a microtask so it doesn't setState synchronously in the effect.
  useEffect(() => {
    let cancelled = false;
    const recover: { id: string; d: Draft }[] = [];
    for (const n of notesRef.current) {
      const d = readDraft(n.id);
      if (
        d &&
        (d.body !== n.body || d.accountId !== n.accountId || d.remindAt !== n.remindAt)
      ) {
        recover.push({ id: n.id, d });
      }
    }
    if (recover.length === 0) return;
    const byId = new Map(recover.map((r) => [r.id, r.d]));
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setNotes((prev) =>
        prev.map((n) => {
          const d = byId.get(n.id);
          return d ? { ...n, ...d, status: "saving" } : n;
        }),
      );
      recover.forEach(({ id, d }) =>
        scheduleSave(id, d.body, d.accountId, d.remindAt, 0),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(
    id: string,
    partial: Partial<Pick<Note, "body" | "accountId" | "remindAt">>,
    immediate = false,
  ) {
    const cur = notesRef.current.find((n) => n.id === id);
    if (!cur) return;
    const merged = {
      body: cur.body,
      accountId: cur.accountId,
      remindAt: cur.remindAt,
      ...partial,
    };
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...partial } : n)));
    scheduleSave(id, merged.body, merged.accountId, merged.remindAt, immediate ? 0 : 600);
  }

  // "Save" = flush the current state to the DB now and depress the note into
  // the list. (Autosave already ran while typing — this is the explicit close.)
  function saveAndCollapse(id: string) {
    update(id, {}, true);
    setOpenId(null);
  }

  async function addNote() {
    const res = await createTodoNote();
    if (!res) return;
    setNotes((prev) => [
      { id: res.id, body: "", done: false, accountId: "", remindAt: "", status: "saved" },
      ...prev,
    ]);
    setFocusId(res.id);
    setOpenId(res.id);
  }

  async function toggleDone(id: string, done: boolean) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done } : n)));
    await setTodoDone(id, done);
  }

  async function del(id: string) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    clearDraft(id);
    await deleteTodoNote(id);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function copySelected() {
    const chosen = notes.filter((n) => selected.has(n.id));
    if (chosen.length === 0) return;
    const text = chosen
      .map((n, i) => {
        const acct = accounts.find((a) => a.id === n.accountId)?.name;
        const meta = [acct, fmtWhen(n.remindAt)].filter(Boolean).join(" · ");
        return `${i + 1}. ${n.body.trim()}${meta ? `\n   [${meta}]` : ""}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(chosen.length);
      setTimeout(() => setCopied(0), 2500);
    } catch {
      setCopied(0);
    }
  }

  const openNotes = notes.filter((n) => !n.done);
  const doneNotes = notes.filter((n) => n.done);
  const openCount = openNotes.length;

  return (
    <div className={styles.notes}>
      <div className={styles.notesBar}>
        <button className={styles.noteAddBtn} onClick={addNote}>
          ＋ New note
        </button>
        <span className={styles.notesMeta}>{openCount} open · autosaved as you type</span>
        {selected.size > 0 && (
          <button className={styles.noteCopyBtn} onClick={copySelected}>
            {copied > 0 ? `Copied ${copied} ✓` : `Copy selected (${selected.size})`}
          </button>
        )}
      </div>

      {notes.length === 0 && (
        <p className={styles.todoEmpty}>
          No notes yet — hit “＋ New note” and start typing.
        </p>
      )}
      {notes.length > 0 && openNotes.length === 0 && (
        <p className={styles.todoEmpty}>
          All caught up — done notes are in the archive below.
        </p>
      )}

      {openNotes.map((n) =>
        n.id !== openId ? (
          <div
            key={n.id}
            className={styles.noteRow}
            onClick={() => setOpenId(n.id)}
            title="Click to edit"
          >
            <input
              type="checkbox"
              checked={n.done}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => toggleDone(n.id, e.target.checked)}
              aria-label="Mark done"
            />
            <span className={styles.noteRowBody}>{n.body.trim() || "(empty note)"}</span>
            <span className={styles.noteRowMeta}>
              {[accounts.find((a) => a.id === n.accountId)?.name, fmtWhen(n.remindAt)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        ) : (
          <div
            key={n.id}
            className={`${styles.noteCard} ${n.done ? styles.noteCardDone : ""}`}
          >
            <div className={styles.noteTop}>
              <label
                className={styles.noteChk}
                title="Select this note for “Copy selected”"
              >
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggleSelect(n.id)}
                />
                <span>Select</span>
              </label>
              <label className={styles.noteChk} title="Mark this note done">
                <input
                  type="checkbox"
                  checked={n.done}
                  onChange={(e) => toggleDone(n.id, e.target.checked)}
                />
                <span>Done</span>
              </label>
              <StatusChip s={n.status} />
              <button
                className={styles.noteDel}
                onClick={() => del(n.id)}
                aria-label="Delete note"
              >
                ✕
              </button>
            </div>

            <textarea
              className={styles.noteArea}
              value={n.body}
              maxLength={20000}
              autoFocus={n.id === focusId}
              spellCheck
              placeholder="Type a note… (Shift+Enter or Enter for a new line — it autosaves)"
              onChange={(e) => update(n.id, { body: e.target.value })}
            />

            <div className={styles.noteMeta}>
              <select
                className={styles.noteAcct}
                value={n.accountId}
                onChange={(e) => update(n.id, { accountId: e.target.value }, true)}
                aria-label="Link to account"
              >
                <option value="">— no account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <label className={styles.noteDate}>
                <span className={styles.noteCal} aria-hidden>
                  📅
                </span>
                <input
                  type="datetime-local"
                  value={toLocalInput(n.remindAt)}
                  onChange={(e) => update(n.id, { remindAt: e.target.value }, true)}
                  aria-label="Date and time"
                />
              </label>
              <button
                className={styles.noteSaveBtn}
                onClick={() => saveAndCollapse(n.id)}
                title="Save and tuck this note into the list"
              >
                Save ✓
              </button>
            </div>
          </div>
        ),
      )}

      {doneNotes.length > 0 && (
        <details className={styles.noteArchive}>
          <summary>
            Done
            <span className={styles.noteArchiveCount}>{doneNotes.length}</span>
            <span className={styles.noteArchiveHint}>
              checked-off notes · restore or delete
            </span>
          </summary>
          {doneNotes.map((n) => (
            <div key={n.id} className={styles.noteArchiveRow}>
              <span className={styles.noteArchiveBody}>
                {n.body.trim() || "(empty note)"}
              </span>
              <button
                className={styles.noteRestore}
                onClick={() => toggleDone(n.id, false)}
                title="Move back to the open list"
              >
                Restore
              </button>
              <button
                className={styles.noteDel}
                onClick={() => del(n.id)}
                aria-label="Delete note"
              >
                ✕
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

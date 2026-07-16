"use client";

// The Day Sheet — the cream pad across the top of Today. Everything you type
// lands here instantly and STAYS here (routing adds a receipt, it never takes
// the note away). Enter files it smart (auto-routes to partner room + account
// page); Enter-Enter files it plain; Shift+Enter is a newline. Collapsible so
// the work rail can come up the page — the state sticks per browser.

import { useRef, useState, useSyncExternalStore } from "react";
import type { Todo } from "@/lib/today/follow-ups";
import { splitMarker, splitTags, type NoteTags } from "@/lib/today/route-notes";
import { sameUserDay, USER_TZ } from "@/lib/tz";
import {
  captureSheetNote,
  promoteSheetTodo,
  routeSheetNote,
  saveSheetNote,
  tagSheetNote,
  undoSheetRoute,
  type SheetNote,
} from "./sheet-actions";
import { deleteTodoNote, setTodoDone } from "./actions";
import styles from "../command-center.module.css";

const COLLAPSE_KEY = "daySheetCollapsed";
const DOUBLE_MS = 400;

// A no-op subscription for useSyncExternalStore's hydration probe.
function subscribeNoop() {
  return () => {};
}

type N = {
  id: string;
  body: string;
  done: boolean;
  remindAt: string;
  createdAt: string;
};

function fromTodo(t: Todo): N {
  return {
    id: t.id,
    body: t.body,
    done: t.done,
    remindAt: t.remindAt,
    createdAt: t.createdAt,
  };
}

function apply(n: N, s: SheetNote): N {
  return { ...n, body: s.body, done: s.done, remindAt: s.remindAt || n.remindAt };
}

function timeOf(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: USER_TZ,
    })
    .toLowerCase()
    .replace(" ", "");
}

function sameLocalDay(iso: string, now: Date): boolean {
  return sameUserDay(iso, now);
}

function tagsOf(n: N): NoteTags {
  return splitTags(splitMarker(n.body).text).tags;
}

// Urgency-first ordering inside a group; ties keep their existing order.
const URG_RANK: Record<NoteTags["urgency"], number> = {
  high: 0,
  med: 1,
  low: 2,
  "": 3,
};
function byUrgency(a: N, b: N): number {
  return URG_RANK[tagsOf(a).urgency] - URG_RANK[tagsOf(b).urgency];
}

// "2026-07-18" → "Jul 18" (parsed as local, not UTC).
function chipDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// A future remindAt = it's on the Scheduled list ("→ todo").
function todoDay(remindAt: string): string {
  const t = Date.parse(remindAt);
  if (Number.isNaN(t) || t <= Date.now()) return "";
  const d = new Date(t);
  const now = new Date();
  if (sameLocalDay(remindAt, now)) return "today";
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  if (
    d.getFullYear() === tom.getFullYear() &&
    d.getMonth() === tom.getMonth() &&
    d.getDate() === tom.getDate()
  )
    return "tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NoteRow({
  n,
  accounts,
  partners,
  onChange,
  onRemove,
}: {
  n: N;
  accounts: { id: string; name: string }[];
  partners: string[];
  onChange: (next: N) => void;
  onRemove: (id: string) => void;
}) {
  const { text: taggedText, refs, label } = splitMarker(n.body);
  const { text, tags } = splitTags(taggedText);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [picking, setPicking] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagDraft, setTagDraft] = useState<NoteTags>(tags);
  const [busy, setBusy] = useState(false);
  // Long notes sit clamped to a single row; the chevron (or a click on the
  // text) opens the full note. Short notes skip the ceremony entirely.
  const [expandedRow, setExpandedRow] = useState(false);
  const isLong = text.includes("\n") || text.length > 90;
  const clamped = isLong && !expandedRow;
  const day = todoDay(n.remindAt);
  const hasTags = !!(tags.date || tags.urgency || tags.when);

  const openTagger = () => {
    setTagDraft(tags);
    setTagging((v) => !v);
  };

  const run = async (fn: () => Promise<SheetNote | null>) => {
    if (busy) return;
    setBusy(true);
    const s = await fn();
    if (s) onChange(apply(n, s));
    setBusy(false);
    return s;
  };

  return (
    <div className={`${styles.sheetNote} ${n.done ? styles.sheetNoteDone : ""}`}>
      <span className={styles.sheetTime} suppressHydrationWarning>
        {timeOf(n.createdAt)}
      </span>
      {editing ? (
        <textarea
          className={styles.sheetEdit}
          value={draft}
          autoFocus
          rows={Math.max(1, draft.split("\n").length)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={async () => {
            setEditing(false);
            if (draft.trim() && draft !== text) {
              const s = await saveSheetNote(n.id, draft);
              if (s) onChange(apply(n, s));
            }
          }}
        />
      ) : (
        <>
          {isLong && (
            <button
              type="button"
              className={styles.sheetChevron}
              title={expandedRow ? "Collapse to one row" : "Expand the full note"}
              onClick={() => setExpandedRow((v) => !v)}
            >
              {expandedRow ? "▾" : "▸"}
            </button>
          )}
          <span
            className={`${styles.sheetText} ${clamped ? styles.sheetTextClamp : ""}`}
            onClick={() => {
              if (clamped) {
                setExpandedRow(true);
                return;
              }
              setDraft(text);
              setEditing(true);
            }}
            title={clamped ? "Click to expand" : "Click to edit"}
          >
            {text || "(empty note)"}
          </span>
        </>
      )}
      {hasTags && !editing && (
        <span className={styles.sheetTags}>
          {tags.urgency && (
            <button
              type="button"
              className={`${styles.sheetTagChip} ${
                tags.urgency === "high"
                  ? styles.sheetUrgHigh
                  : tags.urgency === "med"
                    ? styles.sheetUrgMed
                    : styles.sheetUrgLow
              }`}
              onClick={openTagger}
              title="Urgency — click to change"
            >
              {tags.urgency}
            </button>
          )}
          {tags.when && (
            <button
              type="button"
              className={`${styles.sheetTagChip} ${styles.sheetWhenChip}`}
              onClick={openTagger}
              title="Today / later — click to change"
            >
              {tags.when}
            </button>
          )}
          {tags.date && (
            <button
              type="button"
              className={styles.sheetTagChip}
              onClick={openTagger}
              title="Date — click to change"
            >
              {chipDate(tags.date)}
            </button>
          )}
        </span>
      )}
      <span className={styles.sheetRoute}>
        {refs ? (
          <>
            <span className={styles.sheetRcpt}>routed → {label}</span>
            <button
              type="button"
              className={styles.sheetGhost}
              disabled={busy}
              onClick={() => run(() => undoSheetRoute(n.id))}
            >
              ↩ undo
            </button>
          </>
        ) : (
          <>
            {day ? (
              <span className={styles.sheetRcpt}>→ todo · {day} ✓</span>
            ) : (
              <span className={styles.sheetScratch}>scratch</span>
            )}
            {!n.done && !day && (
              <button
                type="button"
                className={styles.sheetBtnTodo}
                disabled={busy}
                onClick={() => run(() => promoteSheetTodo(n.id, "today"))}
              >
                → todo
              </button>
            )}
            {!n.done && !picking && (
              <button
                type="button"
                className={styles.sheetBtn}
                disabled={busy}
                onClick={async () => {
                  const s = await run(() => routeSheetNote(n.id));
                  if (s?.unmatched) setPicking(true);
                }}
              >
                route ▸
              </button>
            )}
          </>
        )}
        {!n.done && (
          <button
            type="button"
            className={styles.sheetGhost}
            disabled={busy}
            title="Tag: urgency · today/later · date"
            onClick={openTagger}
          >
            ⚑
          </button>
        )}
        <button
          type="button"
          className={styles.sheetGhost}
          disabled={busy}
          title={n.done ? "Reopen" : "Done"}
          onClick={async () => {
            await setTodoDone(n.id, !n.done);
            onChange({ ...n, done: !n.done });
          }}
        >
          {n.done ? "↺" : "✓"}
        </button>
        <button
          type="button"
          className={styles.sheetGhost}
          disabled={busy}
          title="Delete"
          onClick={async () => {
            await deleteTodoNote(n.id);
            onRemove(n.id);
          }}
        >
          ×
        </button>
      </span>
      {tagging && (
        <span className={styles.sheetTagEd}>
          <select
            value={tagDraft.urgency}
            aria-label="Urgency"
            onChange={(e) =>
              setTagDraft((t) => ({
                ...t,
                urgency: e.target.value as NoteTags["urgency"],
              }))
            }
          >
            <option value="">urgency —</option>
            <option value="low">low</option>
            <option value="med">med</option>
            <option value="high">high</option>
          </select>
          <select
            value={tagDraft.when}
            aria-label="Today or later"
            onChange={(e) =>
              setTagDraft((t) => ({
                ...t,
                when: e.target.value as NoteTags["when"],
              }))
            }
          >
            <option value="">today/later —</option>
            <option value="today">today</option>
            <option value="later">later</option>
          </select>
          <input
            type="date"
            value={tagDraft.date}
            aria-label="Date"
            onChange={(e) => setTagDraft((t) => ({ ...t, date: e.target.value }))}
          />
          <button
            type="button"
            className={styles.sheetBtn}
            disabled={busy}
            onClick={async () => {
              await run(() => tagSheetNote(n.id, tagDraft));
              setTagging(false);
            }}
          >
            Set
          </button>
          <button
            type="button"
            className={styles.sheetGhost}
            onClick={() => setTagging(false)}
          >
            ×
          </button>
        </span>
      )}
      {picking && (
        <span className={styles.sheetPick}>
          no match found — file to:
          <select id={`pa-${n.id}`} defaultValue="" aria-label="Account">
            <option value="">(no account)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select id={`pp-${n.id}`} defaultValue="" aria-label="Partner">
            <option value="">(no partner)</option>
            {partners.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.sheetBtn}
            onClick={async () => {
              const accountId =
                (document.getElementById(`pa-${n.id}`) as HTMLSelectElement)?.value ?? "";
              const partner =
                (document.getElementById(`pp-${n.id}`) as HTMLSelectElement)?.value ?? "";
              if (accountId || partner) {
                await run(() => routeSheetNote(n.id, { accountId, partner }));
              }
              setPicking(false);
            }}
          >
            Send
          </button>
          <button
            type="button"
            className={styles.sheetGhost}
            onClick={() => setPicking(false)}
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}

export function DaySheet({
  initialNotes,
  accounts,
  partners,
  dateLabel,
}: {
  initialNotes: Todo[];
  accounts: { id: string; name: string }[];
  partners: string[];
  dateLabel: string;
}) {
  const [notes, setNotes] = useState<N[]>(() => initialNotes.map(fromTodo));
  // Hydration-safe persisted collapse: the server (and first client paint)
  // render expanded; once hydrated, the stored preference applies.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [collapsedPref, setCollapsedPref] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const collapsed = hydrated && collapsedPref;
  const [text, setText] = useState("");
  const [pendingPlain, setPendingPlain] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  const toggle = () => {
    const next = !collapsed;
    setCollapsedPref(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  const file = async (plain: boolean) => {
    const body = text.trim();
    if (!body) return;
    setText("");
    setPendingPlain(false);
    const s = await captureSheetNote(body, plain);
    if (s) {
      setNotes((prev) => [
        {
          id: s.id,
          body: s.body,
          done: false,
          remindAt: s.remindAt,
          createdAt: s.createdAt,
        },
        ...prev,
      ]);
    } else {
      // Write failed (no DB / signed-out) — put the text back so nothing is lost.
      setText(body);
    }
    boxRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (timer.current) {
      // Second Enter inside the window → plain.
      clearTimeout(timer.current);
      timer.current = null;
      setPendingPlain(false);
      void file(true);
      return;
    }
    setPendingPlain(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPendingPlain(false);
      void file(false);
    }, DOUBLE_MS);
  };

  const now = new Date();
  const open = notes.filter((n) => !n.done);
  const doneNotes = notes.filter((n) => n.done);
  // The "today"/"later" tag overrides where a note lives: later-tagged notes
  // get their own section regardless of age; today-tagged notes surface on
  // today's sheet even if captured days ago. Untagged notes group by capture
  // day, as before. Urgency sorts high → med → low → untagged within a group.
  const later = open.filter((n) => tagsOf(n).when === "later").sort(byUrgency);
  const today = open
    .filter(
      (n) =>
        tagsOf(n).when !== "later" &&
        (sameLocalDay(n.createdAt, now) || tagsOf(n).when === "today"),
    )
    .sort(byUrgency);
  const earlier = open
    .filter((n) => !today.includes(n) && !later.includes(n))
    .sort(byUrgency);
  const unrouted = today.filter((n) => !splitMarker(n.body).refs && !todoDay(n.remindAt));

  if (collapsed) {
    return (
      <div className={styles.sheetBarCollapsed}>
        <button type="button" className={styles.sheetToggle} onClick={toggle}>
          ▸
        </button>
        <span className={styles.sheetCapT}>Day sheet — {dateLabel}</span>
        <span className={styles.sheetCapR}>
          {today.length} note{today.length === 1 ? "" : "s"} today
          {unrouted.length ? ` · ${unrouted.length} scratch` : ""}
          {later.length ? ` · ${later.length} later` : ""}
          {earlier.length ? ` · ${earlier.length} earlier` : ""} — click ▸ to open
        </span>
      </div>
    );
  }

  return (
    <div className={styles.sheet}>
      <div className={styles.sheetHead}>
        <button
          type="button"
          className={styles.sheetToggle}
          onClick={toggle}
          title="Collapse"
        >
          ▾
        </button>
        <span className={styles.sheetCapT}>Day sheet — {dateLabel}</span>
        <span className={styles.sheetCapR}>
          Enter files it (auto-routes) · Enter-Enter keeps it plain · Shift+Enter = new
          line
        </span>
      </div>
      <textarea
        ref={boxRef}
        className={styles.sheetCapture}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type the second it happens — call notes, Teams pastes, stray thoughts…"
        rows={2}
      />
      {pendingPlain && (
        <div className={styles.sheetPending}>
          filing… press Enter again to keep it plain
        </div>
      )}
      <div className={styles.sheetNotes}>
        {today.length === 0 && (
          <p className={styles.sheetEmpty}>Nothing on today&apos;s sheet yet.</p>
        )}
        {today.map((n) => (
          <NoteRow
            key={n.id}
            n={n}
            accounts={accounts}
            partners={partners}
            onChange={(next) =>
              setNotes((p) => p.map((x) => (x.id === next.id ? next : x)))
            }
            onRemove={(id) => setNotes((p) => p.filter((x) => x.id !== id))}
          />
        ))}
      </div>
      {later.length > 0 && (
        <div className={styles.sheetLater}>
          <div className={styles.sheetLaterHead}>later ({later.length})</div>
          {later.map((n) => (
            <NoteRow
              key={n.id}
              n={n}
              accounts={accounts}
              partners={partners}
              onChange={(next) =>
                setNotes((p) => p.map((x) => (x.id === next.id ? next : x)))
              }
              onRemove={(id) => setNotes((p) => p.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
      {earlier.length > 0 && (
        <details className={styles.sheetEarlier}>
          <summary>earlier open notes ({earlier.length}) ▸</summary>
          {earlier.map((n) => (
            <NoteRow
              key={n.id}
              n={n}
              accounts={accounts}
              partners={partners}
              onChange={(next) =>
                setNotes((p) => p.map((x) => (x.id === next.id ? next : x)))
              }
              onRemove={(id) => setNotes((p) => p.filter((x) => x.id !== id))}
            />
          ))}
        </details>
      )}
      {doneNotes.length > 0 && (
        <details className={styles.sheetEarlier}>
          <summary>done ({doneNotes.length}) ▸</summary>
          {doneNotes.map((n) => (
            <NoteRow
              key={n.id}
              n={n}
              accounts={accounts}
              partners={partners}
              onChange={(next) =>
                setNotes((p) => p.map((x) => (x.id === next.id ? next : x)))
              }
              onRemove={(id) => setNotes((p) => p.filter((x) => x.id !== id))}
            />
          ))}
        </details>
      )}
    </div>
  );
}

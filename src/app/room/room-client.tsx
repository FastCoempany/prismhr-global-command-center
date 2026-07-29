"use client";

// The Operating Room, consolidated: Half-Light rows carrying the old board's
// stage nodes and the old day sheet's mechanics per account; the roundups +
// check-ins engine in the right-margin drawer; the eye drawer holding what
// used to be "then, if there's time". Every composer is bound to its row.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChiClock } from "../today-client";
import {
  addFollowUp,
  archiveThread,
  delayFollowUp,
  dismissTriage,
  logTouch,
  markReplied,
  markResponded,
  muteRoundupPartner,
  snoozeSignal,
  unmuteRoundupPartner,
} from "../today/actions";
import { dismissSuggestion, saveNote, toggleCheck } from "../dashboard/actions";
import {
  roomClose,
  roomCompose,
  roomActionUndo,
  roomGapDismiss,
  roomGapsRefill,
  roomLossDismiss,
  roomMarkLost,
  roomMarkWon,
  roomResearch,
  roomRetire,
  roomNoteToAction,
  roomOwedAccept,
  roomOwedDismiss,
  roomPaste,
  roomPasteUndo,
  roomRecordDelete,
  roomRecordEdit,
  roomTodoSet,
  roomUnlog,
} from "./actions";
import type { StageView } from "@/lib/room/stages-view";
import styles from "./room.module.css";

export type RoomRow = {
  accountId: string;
  cardId: string;
  name: string;
  meta: string;
  shape: string;
  multiTone: "g" | "y" | "r";
  people: { name: string; line: string }[];
  briefed: boolean;
  climb: { frac: number; capTone: "risk" | "warn" | "ok"; label: string };
  stages: StageView[];
  suggestions: { node: string; index: number; item: string; why: string }[];
  move: string;
  thin: boolean;
  court: { line: string; tone: "you" | "them" | "quiet" | "none" };
  outstanding: {
    item: string;
    node: string;
    index: number;
    doneKey: string;
    closedCount: number;
  } | null;
  sheetOpen: { id: string; body: string; wall?: string; fallback?: string }[];
  sheetDelayed: { id: string; body: string; when: string }[];
  sheetDoneToday: { id: string; body: string; at: string }[];
  record: { id: string; t: string; text: string; struck: boolean }[];
  recordTotal: number;
  backgroundTotal: number;
  loss: { noteId: string; phrase: string; date: string; status: "lost" | "won" } | null;
  owed: { noteId: string; key: string; text: string; src: string }[];
  outcome: { status: "won" | "lost"; phrase: string; at: string } | null;
  gaps: { id: string; question: string; at: string }[];
  gapsQueued: number;
  researchAt: string; // ISO of the last research pass, "" if never run
  health: "red" | "amber" | "green" | "quiet";
  rank: number;
  canWrite: boolean;
};

export type CadenceRow = {
  partner: string;
  subjectKey: string;
  status: string; // none | awaiting | replied | responded | archived | open
  lastSent: string;
  daysAgo: number | null;
  due: boolean;
  muted: boolean;
  opener: string;
  closer: string;
  sections: { id: string; name: string; bullet: string; on: boolean }[];
  total: number;
};
export type CheckinRow = {
  subjectKey: string;
  label: string;
  ask: string;
  quietDays: number | null;
  kind: string;
};
export type WarmRow = { id: string; name: string; why: string; seedNote: string };
export type LaterRow = { id: string; body: string };

function Briefed({ on }: { on: boolean }) {
  return (
    <span
      className={styles.briefed}
      title={
        on
          ? "Partner briefed — the stage record's partner-brief item is closed."
          : "Partner not yet briefed — turns green when a partner-brief item closes in the stage record."
      }
    >
      <svg
        viewBox="0 0 20 20"
        width="13"
        height="13"
        fill="none"
        stroke={on ? "#1E5B46" : "rgba(10,28,64,.25)"}
        strokeWidth="2.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M5 11 l4 4 7-8" />
        <path d="M2 18 h16" />
      </svg>
    </span>
  );
}

function firstWord(s: string): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}

type FreshCap = {
  body: string;
  kind: "note" | "action" | "scheduled";
  todoId?: string;
  promoted?: boolean;
};

function Row({ row }: { row: RoomRow }) {
  const [freshCaps, setFreshCaps] = useState<FreshCap[]>([]);
  const [freshInfo, setFreshInfo] = useState<
    {
      text: string;
      noteIds?: string[];
      // Auto-opened commitments, each retired on its own — the paste's undo
      // takes back the record it filed, never the work it opened.
      opened?: { id: string; text: string; gone?: boolean }[];
    }[]
  >([]);
  // The misfile guard's holding pen: the read thinks this paste belongs to
  // another account, so nothing is written until the operator insists.
  const [mismatch, setMismatch] = useState<{
    claim: string;
    bound: string;
    text: string;
  } | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [promotedNotes, setPromotedNotes] = useState<Set<string>>(new Set());
  const [recOpen, setRecOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editedNotes, setEditedNotes] = useState<Map<string, string>>(new Map());
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const [logText, setLogText] = useState("");
  const [mode, setMode] = useState<"note" | "action">("note");
  const [urg, setUrg] = useState<"" | "high" | "med" | "low">("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // Which outstanding item was closed — keyed by doneKey so the strike never
  // carries over onto the NEXT item after the panel refreshes.
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const closed = !!row.outstanding && closedKey === row.outstanding.doneKey;
  const [stageOpen, setStageOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // The move button owns its own spinner — a register-row op must never
  // dress the Mark-it-done button in "Saving…".
  const [closePending, startClose] = useTransition();

  const submitCompose = () => {
    const text = logText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomCompose(row.accountId, text, { kind: mode, urgency: urg });
      if (r.ok && r.kind) {
        setFreshCaps((f) => [
          {
            body: text.replace(/^(?:▢|\[\s?\])\s*/, "").replace(/^⏲\s*\S+\s*/, ""),
            kind: r.kind as FreshCap["kind"],
            todoId: r.todoId,
          },
          ...f,
        ]);
        setLogText("");
        setUrg("");
        setNote(null);
      } else if (!r.ok) setNote(r.reason ?? "That didn't save.");
    });
  };
  const undoCap = (idx: number) => {
    const c = freshCaps[idx];
    if (!c?.todoId || pending) return;
    const todoId = c.todoId;
    start(async () => {
      const r = await roomUnlog(row.accountId, todoId);
      if (r.ok) setFreshCaps((f) => f.filter((_, i) => i !== idx));
      else setNote(r.reason ?? "The undo didn't take.");
    });
  };
  const promoteCap = (idx: number) => {
    const c = freshCaps[idx];
    if (!c?.todoId || pending) return;
    const todoId = c.todoId;
    start(async () => {
      const r = await roomNoteToAction(row.accountId, { todoId });
      if (r.ok)
        setFreshCaps((f) =>
          f.map((x, i) => (i === idx ? { ...x, kind: "action", promoted: true } : x)),
        );
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const promoteNote = (noteId: string, text: string) => {
    if (pending || promotedNotes.has(noteId)) return;
    start(async () => {
      const r = await roomNoteToAction(row.accountId, { noteId });
      if (r.ok) {
        setPromotedNotes((s) => new Set(s).add(noteId));
        setFreshCaps((f) => [
          { body: text.replace(/^[✉✓☰✎⚡▢✔☎]\s?/, ""), kind: "action", promoted: true },
          ...f,
        ]);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const saveEdit = (noteId: string) => {
    const text = editText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = await roomRecordEdit(row.accountId, noteId, text);
      if (r.ok) {
        setEditedNotes((m) => new Map(m).set(noteId, text));
        setEditId(null);
      } else setNote(r.reason ?? "The edit didn't save.");
    });
  };
  const deleteNote = (noteId: string) => {
    if (pending) return;
    start(async () => {
      const r = await roomRecordDelete(row.accountId, noteId);
      if (r.ok) setDeletedNotes((s) => new Set(s).add(noteId));
      else setNote(r.reason ?? "The delete didn't take.");
    });
  };
  const filePaste = (text: string, force: boolean) => {
    start(async () => {
      const r = await roomPaste(row.accountId, text, force ? { force: true } : undefined);
      if (r.mismatch) {
        setMismatch({ ...r.mismatch, text });
        return;
      }
      if (r.ok) {
        // One receipt, in the order the work matters: what filed, what opened,
        // what it asked, what it learned, and whether it says this is over.
        const parts = [
          `Paste filed — ${r.filed} entr${r.filed === 1 ? "y" : "ies"}${r.how === "ai" ? ", read by Claude" : ""}.`,
          r.opened?.length
            ? `${r.opened.length} action${r.opened.length === 1 ? "" : "s"} opened.`
            : "",
          r.asks ? `${r.asks} new ask${r.asks === 1 ? "" : "s"} queued.` : "",
          r.learned ? `${r.learned} to the playbook.` : "",
          r.outcome ? `Reads ${r.outcome.status} — confirm below.` : "",
        ].filter(Boolean);
        setFreshInfo((f) => [
          { text: parts.join(" "), noteIds: r.noteIds, opened: r.opened },
          ...f,
        ]);
        setPasteText("");
        setPasteOpen(false);
        setMismatch(null);
        setNote(null);
      } else setNote(r.reason ?? "The paste didn't file.");
    });
  };
  const submitPaste = () => {
    const text = pasteText.trim();
    if (!text || pending) return;
    filePaste(text, false);
  };
  const undoOpened = (idx: number, id: string) => {
    if (pending) return;
    start(async () => {
      const r = await roomActionUndo(row.accountId, id);
      if (r.ok)
        setFreshInfo((fs) =>
          fs.map((x, i) =>
            i === idx
              ? {
                  ...x,
                  opened: (x.opened ?? []).map((o) =>
                    o.id === id ? { ...o, gone: true } : o,
                  ),
                }
              : x,
          ),
        );
      else setNote(r.reason ?? "The undo didn't take.");
    });
  };
  // The loss read's two exits + the owed suggestions' two exits — all
  // optimistic, all durable server-side.
  const [lossState, setLossState] = useState<"live" | "lost" | "salvaging">("live");
  const [owedGone, setOwedGone] = useState<Set<string>>(new Set());
  const confirmClose = (status: "lost" | "won") => {
    if (!row.loss || pending) return;
    const l = row.loss;
    start(async () => {
      const call = status === "won" ? roomMarkWon : roomMarkLost;
      const r = await call(row.accountId, row.cardId, l.noteId, l.phrase);
      if (r.ok) {
        setLossState("lost");
        setFreshInfo((f) => [
          {
            text: `${status === "won" ? "Closed Won" : "Closed Lost"} — the meter says so now. Retire the row when you're done with it.`,
          },
          ...f,
        ]);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const markLost = () => confirmClose("lost");
  const markWon = () => confirmClose("won");
  const retireRow = () => {
    if (pending) return;
    start(async () => {
      const r = await roomRetire(row.cardId);
      if (r.ok) setFreshInfo((f) => [{ text: "Retired from the board." }, ...f]);
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const [askGone, setAskGone] = useState<Set<string>>(new Set());
  const [research, setResearch] = useState<{ note: string; changed: string[] } | null>(
    null,
  );
  const runResearchPass = () => {
    if (pending) return;
    start(async () => {
      const r = await roomResearch(row.accountId);
      if (r.ok)
        setResearch({
          note: r.summary || "Filed to the record.",
          changed: r.changed ?? [],
        });
      else setNote(r.reason ?? "The research pass didn't complete.");
    });
  };
  const refillAsks = () => {
    if (pending) return;
    start(async () => {
      const r = await roomGapsRefill(row.accountId);
      if (r.ok)
        setFreshInfo((f) => [
          {
            text: r.added
              ? `${r.added} new ask${r.added === 1 ? "" : "s"} minted from what the app knows.`
              : "Nothing new to ask that isn't already on the list.",
          },
          ...f,
        ]);
      else setNote(r.reason ?? "Minting didn't complete.");
    });
  };
  const dismissAsk = (id: string) => {
    if (pending) return;
    start(async () => {
      const r = await roomGapDismiss(id);
      if (r.ok) setAskGone((sx) => new Set(sx).add(id));
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const keepSalvaging = () => {
    if (!row.loss || pending) return;
    const l = row.loss;
    start(async () => {
      const r = await roomLossDismiss(row.accountId, row.cardId, l.noteId);
      if (r.ok) setLossState("salvaging");
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const owedAccept = (o: { key: string; text: string }) => {
    if (pending) return;
    start(async () => {
      const r = await roomOwedAccept(row.accountId, o.text, o.key);
      if (r.ok) {
        setOwedGone((s) => new Set(s).add(o.key));
        setFreshCaps((f) => [{ body: o.text, kind: "action", promoted: true }, ...f]);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const owedDismiss = (o: { key: string }) => {
    if (pending) return;
    start(async () => {
      const r = await roomOwedDismiss(row.accountId, o.key);
      if (r.ok) setOwedGone((s) => new Set(s).add(o.key));
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const lossLive = !!row.loss && lossState === "live";

  const undoPaste = (idx: number) => {
    const f = freshInfo[idx];
    if (!f?.noteIds?.length || pending) return;
    const ids = f.noteIds;
    start(async () => {
      const r = await roomPasteUndo(row.accountId, ids);
      if (r.ok)
        setFreshInfo((fs) =>
          fs.map((x, i) =>
            i === idx
              ? {
                  text: `Paste undone — ${r.removed} entr${r.removed === 1 ? "y" : "ies"} removed.`,
                }
              : x,
          ),
        );
      else setNote(r.reason ?? "The undo didn't take.");
    });
  };
  const submitClose = () => {
    if (!row.outstanding || closePending || closed) return;
    const o = row.outstanding;
    startClose(async () => {
      const r = await roomClose({
        accountId: row.accountId,
        cardId: row.cardId,
        node: o.node,
        index: o.index,
        doneKey: o.doneKey,
        item: o.item,
        cardName: row.name,
      });
      if (r.ok) {
        setClosedKey(o.doneKey);
        setFreshInfo((f) => [{ text: `Closed: ${o.item}` }, ...f]);
      } else setNote(r.reason ?? "The close didn't save.");
    });
  };
  const todoOp = (id: string, op: "done" | "undo" | "tomorrow" | "now" | "drop") =>
    start(async () => {
      const r = await roomTodoSet(row.accountId, id, op);
      if (!r.ok) setNote(r.reason ?? "That didn't save.");
      else if (op === "done") setDoneIds((s) => new Set(s).add(id));
      else if (op === "undo")
        setDoneIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      else if (op === "drop" || op === "tomorrow" || op === "now")
        setGone((s) => new Set(s).add(id));
    });

  const openStage = row.stages.find((s) => s.key === stageOpen);
  const label = row.climb.label;

  return (
    <div className={styles.row}>
      <div className={styles.deal}>
        <div className={styles.nmline}>
          <span className={styles.nm}>
            <Briefed on={row.briefed} />
            <Link href={`/accounts?focus=${row.accountId}`} className={styles.nmLink}>
              {row.name}
            </Link>
          </span>
          <span className={styles.chips}>
            <span className={styles.chip}>{row.shape}</span>
            <span className={`${styles.multi} ${styles[`m_${row.multiTone}`]}`}>
              MULTI
              <span className={styles.hovercard}>
                <span className={styles.hk}>
                  WHO&apos;S IN THIS DEAL — FROM THE REPOSITORY
                </span>
                {row.people.length === 0 && (
                  <span className={styles.hp}>
                    No stakeholders on file yet — paste activity and they appear here.
                  </span>
                )}
                {row.people.map((p) => (
                  <span key={p.name} className={styles.hp}>
                    <b>{p.name}</b>
                    {p.line ? ` — ${p.line}` : ""}
                  </span>
                ))}
              </span>
            </span>
            {row.canWrite && (
              <button
                type="button"
                className={styles.zap}
                title={`Paste — files to ${row.name}`}
                onClick={() => setPasteOpen((v) => !v)}
              >
                ⚡
              </button>
            )}
          </span>
        </div>
        {row.meta && <span className={styles.meta}>{row.meta}</span>}

        {/* The research control. Labelled, dated, and impossible to miss — a
            refresh button that doesn't say when it last ran gets re-run blind. */}
        {row.canWrite && row.accountId && (
          <div className={styles.rsrch}>
            <button
              type="button"
              className={styles.rsrchBtn}
              disabled={pending}
              onClick={runResearchPass}
              title="searches their site, their job postings, the news, and the people named on this deal"
            >
              {pending
                ? "Researching…"
                : row.researchAt
                  ? "Refresh research"
                  : "Research this company"}
            </button>
            <span className={styles.rsrchWhen}>
              {row.researchAt
                ? `last run ${new Date(row.researchAt).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                  })}`
                : "never run — the first pass is the deep one"}
            </span>
          </div>
        )}
        {research && (
          <div className={styles.rsrchOut}>
            {research.changed.length > 0 ? (
              <>
                <b>What changed:</b>
                <ul className={styles.rsrchList}>
                  {research.changed.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <span>{research.note}</span>
            )}
          </div>
        )}

        <div className={styles.climb}>
          <div className={styles.track}>
            <div
              className={styles.gain}
              style={{ width: `${Math.round(Math.max(0.04, row.climb.frac) * 100)}%` }}
            />
          </div>
          <div
            className={`${styles.cap} ${row.climb.capTone === "risk" ? styles.capRisk : row.climb.capTone === "warn" ? styles.capWarn : styles.capOk}`}
            style={{ left: `${Math.round(Math.max(0.04, row.climb.frac) * 100)}%` }}
          />
          {row.stages.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.node} ${s.state === "done" ? styles.nodeDone : ""} ${s.state === "cur" ? styles.nodeCur : ""}`}
              style={{ left: `${2 + i * 14.3}%` }}
              title={`${s.label} — open its checklist`}
              onClick={() => setStageOpen((k) => (k === s.key ? null : s.key))}
            />
          ))}
        </div>
        <div className={styles.climbCap}>{label}</div>

        {openStage && (
          <div className={styles.stageDrawer}>
            <div className={styles.sdHead}>
              <b>{openStage.label}</b>
              <button
                type="button"
                className={styles.sdClose}
                onClick={() => setStageOpen(null)}
              >
                ✕
              </button>
            </div>
            <ul className={styles.sdList}>
              {openStage.items.map((it) => (
                <li key={it.index} className={it.checked ? styles.sdDone : undefined}>
                  {row.canWrite ? (
                    <form action={toggleCheck} className={styles.sdForm}>
                      <input type="hidden" name="cardId" value={row.cardId} />
                      <input type="hidden" name="node" value={openStage.key} />
                      <input type="hidden" name="index" value={it.index} />
                      <input type="hidden" name="returnTo" value="/room" />
                      <button
                        className={`${styles.sdRadio} ${it.checked ? styles.sdRadioOn : ""}`}
                        aria-label={it.checked ? "uncheck" : "check"}
                      />
                    </form>
                  ) : (
                    <span
                      className={`${styles.sdRadio} ${it.checked ? styles.sdRadioOn : ""}`}
                    />
                  )}
                  <span className={styles.sdItem}>{it.item}</span>
                  {it.note && (
                    <span className={styles.sdNote} title={it.note}>
                      ≡
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {row.suggestions
              .filter((sg) => sg.node === openStage.key)
              .slice(0, 2)
              .map((sg) => (
                <div key={`${sg.node}:${sg.index}`} className={styles.sdSugg}>
                  Evidence suggests <b>“{sg.item}” can be checked</b> — {sg.why}.
                  {row.canWrite && (
                    <span className={styles.sdSuggActs}>
                      <form action={toggleCheck} className={styles.inline}>
                        <input type="hidden" name="cardId" value={row.cardId} />
                        <input type="hidden" name="node" value={sg.node} />
                        <input type="hidden" name="index" value={sg.index} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.sdTag}>accept ✓</button>
                      </form>
                      <form action={dismissSuggestion} className={styles.inline}>
                        <input type="hidden" name="cardId" value={row.cardId} />
                        <input type="hidden" name="node" value={sg.node} />
                        <input type="hidden" name="index" value={sg.index} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.sdTag}>dismiss ✕</button>
                      </form>
                    </span>
                  )}
                </div>
              ))}
            {row.canWrite ? (
              <form action={saveNote} className={styles.sdJudg}>
                <input type="hidden" name="cardId" value={row.cardId} />
                <input type="hidden" name="node" value={openStage.key} />
                <input type="hidden" name="returnTo" value="/room" />
                <input
                  name="note"
                  defaultValue={openStage.judgment}
                  placeholder="Your judgment — why this stage sits where it does…"
                />
                <button className={styles.sdTag}>save</button>
              </form>
            ) : (
              openStage.judgment && (
                <p className={styles.sdJudgRead}>{openStage.judgment}</p>
              )
            )}
          </div>
        )}

        <div className={styles.movewrap}>
          {row.outcome ? (
            <>
              <span className={styles.lbl}>
                {row.outcome.status === "won" ? "CLOSED WON" : "CLOSED LOST"}
              </span>
              <p className={`${styles.move} ${styles.thin}`}>
                {row.outcome.phrase ? `“${row.outcome.phrase}”` : "Closed by your call."}{" "}
                The record keeps everything.
              </p>
              {row.canWrite && (
                <span className={styles.lossBtns}>
                  <button
                    type="button"
                    className={styles.ghost}
                    disabled={pending}
                    onClick={retireRow}
                  >
                    Retire the row
                  </button>
                </span>
              )}
            </>
          ) : lossLive ? (
            <>
              <span className={styles.lbl}>
                {row.loss!.status === "won"
                  ? "THE RECORD READS WON"
                  : "THE RECORD READS LOST"}
              </span>
              <p className={styles.move}>
                “{row.loss!.phrase}” — filed {row.loss!.date}. Your call: stamp the meter,
                or keep working it.
              </p>
              {row.canWrite && (
                <span className={styles.lossBtns}>
                  <button
                    type="button"
                    className={styles.lossBtn}
                    disabled={pending}
                    onClick={row.loss!.status === "won" ? markWon : markLost}
                  >
                    {row.loss!.status === "won"
                      ? "Confirm Closed Won"
                      : "Confirm Closed Lost"}
                  </button>
                  <button
                    type="button"
                    className={styles.ghost}
                    disabled={pending}
                    onClick={keepSalvaging}
                  >
                    {row.loss!.status === "won" ? "Not yet" : "Keep salvaging"}
                  </button>
                </span>
              )}
            </>
          ) : lossState === "lost" ? (
            <>
              <span className={styles.lbl}>CLOSED</span>
              <p className={`${styles.move} ${styles.thin}`}>
                The meter reads it now — the record keeps everything.
              </p>
            </>
          ) : (
            <>
              <span className={styles.lbl}>NEXT MOVE</span>
              <p className={`${styles.move} ${row.thin ? styles.thin : ""}`}>
                {row.move}
              </p>
              {row.canWrite && row.outstanding && !closed && (
                <button
                  type="button"
                  className={row.rank === 0 ? styles.go : styles.ghost}
                  disabled={closePending}
                  onClick={submitClose}
                >
                  {closePending ? "Saving…" : "Mark it done ✓"}
                </button>
              )}
            </>
          )}
        </div>
        {row.outstanding && (
          <div className={styles.outst}>
            <span className={styles.lbl}>STILL OPEN</span>
            <span className={closed ? styles.donenow : undefined}>
              {row.outstanding.item}
            </span>
            {row.outstanding.closedCount > 0 && (
              <span className={styles.closedct}>
                {" "}
                · {row.outstanding.closedCount + (closed ? 1 : 0)} closed behind it
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.rec}>
        <div
          className={`${styles.court} ${
            row.outcome || lossLive ? styles.c_quiet : styles[`c_${row.court.tone}`]
          }`}
        >
          {row.outcome
            ? `${row.outcome.status === "won" ? "CLOSED WON" : "CLOSED LOST"}${
                row.outcome.at
                  ? ` · ${new Date(row.outcome.at).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                    })}`
                  : ""
              }`
            : lossLive
              ? `THE RECORD READS ${row.loss!.status === "won" ? "WON" : "LOST"} · ${row.loss!.date}`
              : row.court.line}
        </div>
        <div className={styles.keybar}>
          <span>
            <b className={styles.kSend}>✉</b>send
          </span>
          <span>
            <b>⚖</b>decide
          </span>
          <span>
            <b className={styles.kOwed}>⚑</b>owed
          </span>
          <span>
            <b className={styles.kAct}>✸</b>action
          </span>
          <span>
            <b>➤</b>sent
          </span>
          <span>
            <b className={styles.kDone}>✓</b>done
          </span>
          <span>
            <b className={styles.kDly}>⏲</b>delayed
          </span>
          <span>
            <b>✎</b>note
          </span>
        </div>

        {row.gaps.filter((g) => !askGone.has(g.id)).length > 0 && (
          <div className={styles.askBox}>
            <span className={styles.lbl}>STILL UNKNOWN</span>
            {row.gaps
              .filter((g) => !askGone.has(g.id))
              .map((g) => (
                <div key={g.id} className={styles.askRow}>
                  <span className={styles.askQ}>{g.question}</span>
                  {row.canWrite && (
                    <button
                      type="button"
                      className={styles.sdTag}
                      onClick={() => dismissAsk(g.id)}
                      title="not relevant to this one — swap in the next ask"
                    >
                      not this deal ✕
                    </button>
                  )}
                </div>
              ))}
            <span className={styles.askFoot}>
              {row.gapsQueued > 0 && (
                <span className={styles.askMore}>{row.gapsQueued} more behind these</span>
              )}
              {row.canWrite && (
                <button
                  type="button"
                  className={styles.sdTag}
                  disabled={pending}
                  onClick={refillAsks}
                  title="mint sharper asks from the countries, the scenario, the research, and what other deals taught"
                >
                  {pending ? "minting…" : "better asks ⟳"}
                </button>
              )}
            </span>
          </div>
        )}

        <div className={styles.dayrule}>TODAY</div>
        {row.owed
          .filter((o) => !owedGone.has(o.key))
          .map((o) => (
            <div key={o.key} className={styles.owedBox}>
              <span className={styles.kOwed}>⚑</span> The record says you owe:{" "}
              <b>{o.text}</b> — {o.src}.
              {row.canWrite && (
                <span className={styles.sdSuggActs}>
                  <button
                    type="button"
                    className={styles.sdTag}
                    onClick={() => owedAccept(o)}
                  >
                    open it ✓
                  </button>
                  <button
                    type="button"
                    className={styles.sdTag}
                    onClick={() => owedDismiss(o)}
                  >
                    dismiss ✕
                  </button>
                </span>
              )}
            </div>
          ))}
        {freshCaps.map((c, i) =>
          c.kind === "note" && !c.promoted ? (
            <div key={`fc${i}`}>
              <div className={`${styles.it} ${styles.fresh}`}>
                <span className={`${styles.ic} ${styles.gNote}`}>✎</span>
                <span className={styles.tx}>{c.body}</span>
              </div>
              <div className={styles.rcpt}>
                <b>routed → {row.name}&apos;s record</b>
                {c.todoId && (
                  <>
                    <button
                      type="button"
                      className={styles.rcptU}
                      onClick={() => undoCap(i)}
                    >
                      ↩ undo
                    </button>
                    <button
                      type="button"
                      className={styles.rcptMk}
                      onClick={() => promoteCap(i)}
                    >
                      ✸ make it an action →
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : c.todoId && gone.has(c.todoId) ? null : (
            (() => {
              const did = !!c.todoId && doneIds.has(c.todoId);
              return (
                <div
                  key={`fc${i}`}
                  className={`${styles.it} ${did ? styles.itDid : styles.itOpen} ${styles.fresh}`}
                >
                  <span className={`${styles.ic} ${did ? styles.gDone : styles.gAct}`}>
                    {did ? "✓" : "✸"}
                  </span>
                  {!did && (
                    <span className={`${styles.st} ${styles.stOpen}`}>
                      {c.kind === "scheduled" ? "SOON" : "OPEN"}
                    </span>
                  )}
                  <span className={styles.tx}>{c.body}</span>
                  {c.todoId && (
                    <span className={styles.rail}>
                      {did ? (
                        <button onClick={() => todoOp(c.todoId!, "undo")} title="undo">
                          ↩
                        </button>
                      ) : (
                        <>
                          <button onClick={() => todoOp(c.todoId!, "done")} title="done">
                            ✓
                          </button>
                          <button onClick={() => todoOp(c.todoId!, "drop")} title="park">
                            ✕
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </div>
              );
            })()
          ),
        )}
        {freshInfo.map((f, i) => (
          <div key={`fi${i}`}>
            <div className={`${styles.it} ${styles.fresh}`}>
              <span className={`${styles.ic} ${styles.gDone}`}>✓</span>
              <span className={styles.tx}>{f.text}</span>
              {f.noteIds && f.noteIds.length > 0 && (
                <button
                  type="button"
                  className={styles.rcptU}
                  onClick={() => undoPaste(i)}
                  title="removes the record this paste filed — the actions it opened stay"
                >
                  ↩ undo paste
                </button>
              )}
            </div>
            {/* Each opened commitment retires on its own. The paste's undo is
                about the record; a wrong action is one ✕, not all of them. */}
            {(f.opened ?? []).map((o) => (
              <div
                key={o.id}
                className={`${styles.it} ${o.gone ? styles.itDid : styles.itOpen} ${styles.fresh}`}
              >
                <span className={`${styles.ic} ${o.gone ? styles.gDone : styles.gAct}`}>
                  {o.gone ? "↩" : "✸"}
                </span>
                {!o.gone && (
                  <span className={`${styles.st} ${styles.stOpen}`}>OPENED</span>
                )}
                <span className={`${styles.tx} ${o.gone ? styles.donenow : ""}`}>
                  {o.text}
                </span>
                {row.canWrite && !o.gone && (
                  <span className={styles.rail}>
                    <button
                      onClick={() => undoOpened(i, o.id)}
                      title="the read got this one wrong — take it back"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
        {row.sheetOpen
          .filter((t) => !gone.has(t.id))
          .map((t) => {
            const did = doneIds.has(t.id);
            return (
              <div
                key={t.id}
                className={`${styles.it} ${did ? styles.itDid : styles.itOpen}`}
              >
                <span className={`${styles.ic} ${did ? styles.gDone : styles.gAct}`}>
                  {did ? "✓" : "✸"}
                </span>
                {!did && (
                  <span
                    className={`${styles.st} ${t.wall ? styles.stWall : styles.stOpen}`}
                  >
                    {t.wall ? `${t.wall} PASSED` : "OPEN"}
                  </span>
                )}
                <span className={styles.tx}>
                  {t.body}
                  {/* The if/then, run for you: the wall passed, so the
                      contingency is the move now. */}
                  {!did && t.fallback && (
                    <span className={styles.fallback}>
                      ↯ it didn&apos;t land — go to the fallback: {t.fallback}
                    </span>
                  )}
                </span>
                {row.canWrite && (
                  <span className={styles.rail}>
                    {did ? (
                      <button onClick={() => todoOp(t.id, "undo")} title="undo">
                        ↩
                      </button>
                    ) : (
                      <>
                        <button onClick={() => todoOp(t.id, "done")} title="done">
                          ✓
                        </button>
                        <button
                          onClick={() => todoOp(t.id, "tomorrow")}
                          title="delay to tomorrow"
                        >
                          ⏲
                        </button>
                        <form action={addFollowUp} className={styles.inline}>
                          <input
                            type="hidden"
                            name="label"
                            value={t.body.slice(0, 140)}
                          />
                          <input type="hidden" name="when" value="tomorrow" />
                          <input type="hidden" name="returnTo" value="/room" />
                          <button title="arm a chase — someone owes this">⚑</button>
                        </form>
                        <button onClick={() => todoOp(t.id, "drop")} title="park">
                          ✕
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        {row.sheetDelayed
          .filter((t) => !gone.has(t.id))
          .map((t) => (
            <div key={t.id} className={`${styles.it} ${styles.itDelayed}`}>
              <span className={`${styles.ic} ${styles.gDly}`}>⏲</span>
              <span className={`${styles.st} ${styles.stSched}`}>{t.when}</span>
              <span className={styles.tx}>{t.body}</span>
              {row.canWrite && (
                <span className={styles.rail}>
                  <button onClick={() => todoOp(t.id, "now")} title="bring it back now">
                    ↩
                  </button>
                </span>
              )}
            </div>
          ))}
        {row.sheetDoneToday
          .filter((t) => !gone.has(t.id))
          .map((t) => (
            <div key={t.id} className={`${styles.it} ${styles.itDid}`}>
              <span className={`${styles.ic} ${styles.gDone}`}>✓</span>
              <span className={`${styles.st} ${styles.stDone}`}>{t.at}</span>
              <span className={styles.tx}>{t.body}</span>
              {row.canWrite && (
                <span className={styles.rail}>
                  <button onClick={() => todoOp(t.id, "undo")} title="undo">
                    ↩
                  </button>
                </span>
              )}
            </div>
          ))}

        {row.canWrite && (
          <div className={styles.logbox}>
            <span className={styles.lk}>
              LOG IT — FILES TO {row.name.toUpperCase()}, EVERYWHERE
            </span>
            <div className={styles.modes}>
              <button
                type="button"
                className={styles.zap}
                title={`Paste — files to ${row.name}`}
                onClick={() => setPasteOpen((v) => !v)}
              >
                ⚡
              </button>
              <button
                type="button"
                className={`${styles.mode} ${mode === "note" ? styles.modeOn : ""}`}
                onClick={() => setMode("note")}
              >
                ▢ Note
              </button>
              <button
                type="button"
                className={`${styles.mode} ${mode === "action" ? styles.modeOn : ""}`}
                onClick={() => setMode("action")}
              >
                ✸ Action
              </button>
              {(["high", "med", "low"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`${styles.urgc} ${urg === u ? styles.urgOn : ""}`}
                  onClick={() => setUrg((v) => (v === u ? "" : u))}
                >
                  {u.toUpperCase()}
                </button>
              ))}
              <span className={styles.hints}>
                Enter files to {firstWord(row.name)} · Shift+Enter newline
              </span>
            </div>
            <textarea
              className={styles.logta}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCompose();
                }
              }}
              placeholder="Type the second it happens — call notes, Teams pastes, stray thoughts…"
              aria-label={`Log to ${row.name}`}
            />
            {pasteOpen && (
              <div className={styles.pastepane}>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste the Salesforce capture, an email, or meeting notes — it files to ${row.name}.`}
                />
                <div className={styles.pasteRow}>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => setPasteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.file}
                    disabled={pending}
                    onClick={submitPaste}
                  >
                    {pending ? "Reading…" : "✨ Read & file"}
                  </button>
                </div>
              </div>
            )}
            {/* The misfile guard. Nothing was written; the operator decides
                whether the read is wrong or the drop was. */}
            {mismatch && (
              <div className={styles.misfile}>
                <b>This reads like {mismatch.claim}</b>, not {mismatch.bound}. Nothing
                filed yet.
                <span className={styles.sdSuggActs}>
                  <button
                    type="button"
                    className={styles.sdTag}
                    disabled={pending}
                    onClick={() => filePaste(mismatch.text, true)}
                  >
                    file to {mismatch.bound} anyway ✓
                  </button>
                  <button
                    type="button"
                    className={styles.sdTag}
                    onClick={() => setMismatch(null)}
                  >
                    keep it out ✕
                  </button>
                </span>
              </div>
            )}
            {note && <p className={styles.err}>{note}</p>}
          </div>
        )}

        <button
          type="button"
          className={`${styles.dayrule} ${styles.dayruleBtn}`}
          onClick={() => setRecOpen((v) => !v)}
          title={recOpen ? "collapse the record" : "open the record"}
        >
          EARLIER · {row.recordTotal} {recOpen ? "▾" : "▸"}
        </button>
        {recOpen && (
          <>
            {row.record
              .filter((e) => !deletedNotes.has(e.id))
              .map((e) => {
                const promoted = promotedNotes.has(e.id);
                const shown =
                  editedNotes.get(e.id) ?? e.text.replace(/^[✉✓☰✎⚡▢✔☎]\s?/, "");
                // The full paste alphabet — ✔ tasks and ☎ calls included, so
                // filed activities never misrender as hand-typed notes.
                const glyph = /^[✉✓☰✎✔☎]/.exec(e.text)?.[0] ?? "✎";
                if (editId === e.id)
                  return (
                    <div key={e.id} className={styles.it}>
                      <span className={`${styles.ic} ${styles.gNote}`}>{glyph}</span>
                      <span className={styles.recEdit}>
                        <input
                          value={editText}
                          onChange={(ev) => setEditText(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") saveEdit(e.id);
                            if (ev.key === "Escape") setEditId(null);
                          }}
                          aria-label="edit this entry"
                        />
                        <button
                          type="button"
                          className={styles.sdTag}
                          onClick={() => saveEdit(e.id)}
                        >
                          save
                        </button>
                        <button
                          type="button"
                          className={styles.sdTag}
                          onClick={() => setEditId(null)}
                        >
                          cancel
                        </button>
                      </span>
                    </div>
                  );
                return (
                  <div
                    key={e.id}
                    className={`${styles.it} ${e.struck || promoted ? styles.itDid : ""}`}
                  >
                    <span
                      className={`${styles.ic} ${
                        glyph === "✉"
                          ? styles.kSend
                          : glyph === "✓" || glyph === "✔"
                            ? styles.gDone
                            : glyph === "☎"
                              ? styles.gDly
                              : styles.gNote
                      }`}
                    >
                      {glyph}
                    </span>
                    <span className={styles.tx}>
                      <span className={styles.t}>{e.t}</span>
                      {shown}
                      {promoted && (
                        <span className={styles.promoted}> · now open above</span>
                      )}
                    </span>
                    {row.canWrite && (
                      <span className={styles.rail}>
                        {!e.struck && !promoted && glyph !== "✓" && (
                          <button
                            onClick={() => promoteNote(e.id, shown)}
                            title="make it an action — opens on this register"
                          >
                            ✸
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditId(e.id);
                            setEditText(shown);
                          }}
                          title="edit this entry"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => deleteNote(e.id)}
                          title="delete from the record"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            {row.record.length === 0 && (
              <div className={`${styles.it} ${styles.itEmpty}`}>
                <span className={styles.ic}>·</span>
                <span className={styles.tx}>Nothing on file yet.</span>
              </div>
            )}
            <div className={styles.more}>
              <Link href={`/accounts?focus=${row.accountId}`}>
                the full record ({row.recordTotal}) ▸
              </Link>
              {row.backgroundTotal > 0 && (
                <Link href={`/accounts?focus=${row.accountId}`}>
                  case traffic ({row.backgroundTotal}) ▸
                </Link>
              )}
              <Link href="/archive">archive →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PartnerCard({ c }: { c: CadenceRow }) {
  const [on, setOn] = useState<Set<string>>(
    () => new Set(c.sections.filter((s) => s.on).map((s) => s.id)),
  );
  const message = useMemo(() => {
    const lines = c.sections.filter((s) => on.has(s.id)).map((s) => `• ${s.bullet}`);
    return `${c.opener}\n\n${lines.join("\n")}\n\n${c.closer}`;
  }, [c, on]);
  const stateLine =
    c.status === "none" || c.status === "archived"
      ? c.due
        ? "DUE — NEVER SENT"
        : "FRESH"
      : c.status === "awaiting"
        ? `SENT${c.daysAgo != null ? ` ${c.daysAgo}D AGO` : ""} · AWAITING`
        : c.status.toUpperCase();
  return (
    <div className={styles.pcard}>
      <div className={styles.pcHead}>
        <b>{c.partner}</b>
        {c.due && <span className={styles.dueChip}>DUE</span>}
        <span className={styles.pcState}>{stateLine}</span>
        <form
          action={c.muted ? unmuteRoundupPartner : muteRoundupPartner}
          className={styles.inline}
        >
          <input type="hidden" name="partner" value={c.partner} />
          <input type="hidden" name="returnTo" value="/room" />
          <button
            className={styles.muteBtn}
            title={c.muted ? "unmute cadence" : "mute cadence"}
          >
            {c.muted ? "🔕" : "🔔"}
          </button>
        </form>
      </div>
      {(c.status === "none" || c.status === "archived") && (
        <>
          <div className={styles.pcAccts}>
            {c.sections.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={on.has(s.id)}
                  onChange={() =>
                    setOn((prev) => {
                      const n = new Set(prev);
                      if (n.has(s.id)) n.delete(s.id);
                      else n.add(s.id);
                      return n;
                    })
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
          <div className={styles.pcMsg}>{message}</div>
          <form
            action={logTouch}
            className={styles.pcActs}
            onSubmit={() => {
              void navigator.clipboard?.writeText(message).catch(() => null);
            }}
          >
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="kind" value="partner" />
            <input type="hidden" name="label" value={c.partner} />
            <input
              type="hidden"
              name="detail"
              value={`${on.size} of ${c.total} teed up`}
            />
            <input type="hidden" name="message" value={message} />
            <input type="hidden" name="when" value="tomorrow" />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcPrimary}>Copy &amp; mark sent</button>
          </form>
        </>
      )}
      {c.status === "awaiting" && (
        <div className={styles.pcActs}>
          <form action={markReplied} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>They replied ▸</button>
          </form>
          <form action={archiveThread} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>Archive</button>
          </form>
        </div>
      )}
      {(c.status === "replied" || c.status === "responded" || c.status === "open") && (
        <div className={styles.pcActs}>
          <form action={markResponded} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcPrimary}>I replied ▸</button>
          </form>
          <form action={archiveThread} className={styles.inline}>
            <input type="hidden" name="subjectKey" value={c.subjectKey} />
            <input type="hidden" name="returnTo" value="/room" />
            <button className={styles.pcBtn}>Archive</button>
          </form>
        </div>
      )}
    </div>
  );
}

function CadenceDrawer({
  cadence,
  checkins,
  onClose,
}: {
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"roundups" | "checkins">("roundups");
  const visible = cadence.filter((c) => !c.muted);
  const muted = cadence.filter((c) => c.muted);
  return (
    <div className={styles.drawerPane}>
      <div className={styles.dpHead}>
        <button
          type="button"
          className={`${styles.dpTab} ${tab === "roundups" ? styles.dpTabOn : ""}`}
          onClick={() => setTab("roundups")}
        >
          ROUNDUPS
        </button>
        <button
          type="button"
          className={`${styles.dpTab} ${tab === "checkins" ? styles.dpTabOn : ""}`}
          onClick={() => setTab("checkins")}
        >
          CHECK-INS
        </button>
        <button type="button" className={styles.dpClose} onClick={onClose}>
          ✕ close
        </button>
      </div>
      {tab === "roundups" && (
        <>
          {visible.map((c) => (
            <PartnerCard key={c.partner} c={c} />
          ))}
          {visible.length === 0 && (
            <p className={styles.dpEmpty}>
              Nothing to round up — every partner is either live or muted.
            </p>
          )}
          {muted.length > 0 && (
            <>
              <span className={styles.zone}>MUTED</span>
              {muted.map((c) => (
                <div key={c.partner} className={styles.pcMutedRow}>
                  {c.partner}
                  <form action={unmuteRoundupPartner} className={styles.inline}>
                    <input type="hidden" name="partner" value={c.partner} />
                    <input type="hidden" name="returnTo" value="/room" />
                    <button className={styles.sdTag}>restore</button>
                  </form>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {tab === "checkins" && (
        <>
          {checkins.map((t) => (
            <div key={t.subjectKey} className={styles.chkRow}>
              <span className={styles.chkWho}>{t.label}</span>
              <span className={styles.chkAsk}>
                {t.ask ? `owes: ${t.ask}` : "quiet check — nothing owed"}
              </span>
              {t.quietDays != null && t.quietDays > 0 && (
                <span className={styles.chkOwed}>{t.quietDays}D</span>
              )}
              <span className={styles.chkCtl}>
                <form action={markReplied} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="they answered">✓</button>
                </form>
                <form action={delayFollowUp} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="when" value="tomorrow" />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="push to tomorrow">⏲</button>
                </form>
                <form action={archiveThread} className={styles.inline}>
                  <input type="hidden" name="subjectKey" value={t.subjectKey} />
                  <input type="hidden" name="returnTo" value="/room" />
                  <button title="archive the thread">✕</button>
                </form>
              </span>
            </div>
          ))}
          {checkins.length === 0 && (
            <p className={styles.dpEmpty}>No check-ins due — the cadence is quiet.</p>
          )}
        </>
      )}
    </div>
  );
}

function EyeDrawer({
  warming,
  later,
  onClose,
}: {
  warming: WarmRow[];
  later: LaterRow[];
  onClose: () => void;
}) {
  return (
    <div className={styles.drawerPane}>
      <div className={styles.dpHead}>
        <span className={styles.eyeTitle}>
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="#1E5B46"
            strokeWidth="2"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Keep an eye out
        </span>
        <button type="button" className={styles.dpClose} onClick={onClose}>
          ✕ close
        </button>
      </div>
      <p className={styles.dpEsub}>
        Watched, not worked. Things leave here by being seeded, scheduled, or dismissed.
      </p>
      <span className={styles.zone}>WARMING — SIGNALS WORTH A LOOK</span>
      {warming.map((w) => (
        <div key={w.id} className={styles.pcard}>
          <div className={styles.pcHead}>
            <b>{w.name}</b>
          </div>
          <p className={styles.wWhy}>{w.why}</p>
          <div className={styles.pcActs}>
            <Link href={`/accounts?focus=${w.id}`} className={styles.pcPrimary}>
              Open &amp; seed ▸
            </Link>
            <form action={snoozeSignal} className={styles.inline}>
              <input type="hidden" name="accountId" value={w.id} />
              <input type="hidden" name="reason" value="parked from the eye" />
              <input type="hidden" name="days" value="14" />
              <input type="hidden" name="returnTo" value="/room" />
              <button className={styles.pcBtn}>Park 2w</button>
            </form>
            <form action={dismissTriage} className={styles.inline}>
              <input type="hidden" name="accountId" value={w.id} />
              <input type="hidden" name="name" value={w.name} />
              <input type="hidden" name="returnTo" value="/room" />
              <button className={styles.pcBtn}>Dismiss</button>
            </form>
          </div>
        </div>
      ))}
      {warming.length === 0 && (
        <p className={styles.dpEmpty}>Nothing warming right now.</p>
      )}
      <span className={styles.zone}>LATER — REAL, JUST NOT NOW</span>
      {later.map((t) => (
        <div key={t.id} className={styles.chkRow}>
          <span className={styles.chkAsk}>{t.body}</span>
        </div>
      ))}
      {later.length === 0 && <p className={styles.dpEmpty}>The later list is clear.</p>}
    </div>
  );
}

export function RoomClient({
  rows,
  cadence,
  checkins,
  warming,
  later,
  canWrite,
  dbUnavailable,
  boardNames,
}: {
  rows: RoomRow[];
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  warming: WarmRow[];
  later: LaterRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  boardNames: { id: string; name: string }[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<"cadence" | "eye" | null>(null);
  const dueCount = cadence.filter((c) => c.due && !c.muted).length + checkins.length;
  const eyeCount = warming.length + later.length;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span className={styles.ident}>
          <svg
            viewBox="0 0 48 48"
            width="22"
            height="22"
            fill="none"
            stroke="#0A1C40"
            strokeWidth="4.4"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          >
            <path d="M14 38 L24 10 L34 38" />
            <path d="M18.2 28 h11.6" />
            <path d="M2 38 h44" />
          </svg>
          <span className={styles.roomName}>OPERATING ROOM</span>
        </span>
        <span className={styles.addWrap}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ＋ add <span className={styles.car}>▾</span>
          </button>
          {menuOpen && (
            <div className={styles.menu}>
              <Link
                href="/accounts"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>＋</span>
                <span>
                  <b>Account to the board</b>
                  <span className={styles.miD}>
                    Pick from the book — the row appears with its intel attached.
                  </span>
                </span>
              </Link>
              <Link
                href="/intake"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>⚡</span>
                <span>
                  <b>File a paste</b>
                  <span className={styles.miD}>
                    SF capture, email, or notes — cleans and files to any account.
                  </span>
                </span>
              </Link>
              <Link
                href="/intake"
                className={styles.mi}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.miIc}>✎</span>
                <span>
                  <b>Payroll intake form</b>
                  <span className={styles.miD}>
                    The MS-form mirror, prefilled from the deal&apos;s intel.
                  </span>
                </span>
              </Link>
              {canWrite && (
                <form action={addFollowUp} className={styles.miForm}>
                  <span className={styles.miIc}>⏲</span>
                  <span className={styles.miFormBody}>
                    <b>Follow-up</b>
                    <span className={styles.miRow}>
                      <input name="label" placeholder="Chase what, with whom…" />
                      <select name="when" defaultValue="tomorrow">
                        <option value="today">today</option>
                        <option value="tomorrow">tomorrow</option>
                      </select>
                      <input type="hidden" name="returnTo" value="/room" />
                      <button className={styles.sdTag}>arm</button>
                    </span>
                  </span>
                </form>
              )}
            </div>
          )}
        </span>
        <span className={styles.clock}>
          <ChiClock />
        </span>
      </div>

      {dbUnavailable && (
        <p className={styles.emptyBoard}>
          The database isn&apos;t reachable — the room shows nothing until it is.
        </p>
      )}
      {!dbUnavailable && rows.length === 0 && (
        <p className={styles.emptyBoard}>
          Nothing on the board yet — open the <Link href="/accounts">Account Room</Link>{" "}
          and add the deals you&apos;re working.
        </p>
      )}
      {rows.map((r) => (
        <Row key={r.cardId} row={r} />
      ))}
      {boardNames.length > 0 && null}

      {drawer === "cadence" && (
        <CadenceDrawer
          cadence={cadence}
          checkins={checkins}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer === "eye" && (
        <EyeDrawer warming={warming} later={later} onClose={() => setDrawer(null)} />
      )}

      <button
        type="button"
        className={styles.edge}
        style={{ top: "40%" }}
        onClick={() => setDrawer((d) => (d === "cadence" ? null : "cadence"))}
        title="Roundups and Check-ins"
      >
        <span>ROUNDUPS</span>
        <span className={styles.edgeDot}>·</span>
        <span>CHECK-INS</span>
        {dueCount > 0 && <span className={styles.edgeCount}>{dueCount}</span>}
      </button>
      <button
        type="button"
        className={styles.edge}
        style={{ top: "68%" }}
        onClick={() => setDrawer((d) => (d === "eye" ? null : "eye"))}
        title="Keep an eye out"
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {eyeCount > 0 && <span className={styles.edgeCount}>{eyeCount}</span>}
      </button>
    </div>
  );
}

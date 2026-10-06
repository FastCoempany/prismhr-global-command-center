"use client";

// The Operating Room, consolidated: Half-Light rows carrying the old board's
// stage nodes and the old day sheet's mechanics per account; the roundups +
// check-ins engine in the right-margin drawer; the eye drawer holding what
// used to be "then, if there's time". Every composer is bound to its row.

import {
  Fragment,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/components/use-dismiss";
import { ChiClock } from "../today-client";
import {
  addFollowUp,
  archiveThread,
  delayFollowUp,
  dismissTriage,
  followUpAddBoard,
  followUpDone,
  followUpDrop,
  followUpWaveOff,
  logTouch,
  markReplied,
  markResponded,
  muteRoundupPartner,
  snoozeSignal,
  unmuteRoundupPartner,
} from "./ledger-actions";
import { dismissSuggestion, saveNote, toggleCheck } from "../accounts/board-actions";
import {
  roomBriefedSet,
  roomClose,
  roomCompose,
  roomGapDismiss,
  roomGapsRefill,
  roomLossDismiss,
  roomMarkLost,
  roomMoveDone,
  roomMarkWon,
  roomResearch,
  roomRetire,
  roomNoteToAction,
  roomOwedAccept,
  roomOwedDismiss,
  roomReadPdf,
  roomRecordDelete,
  roomRecordEdit,
  roomTodoEdit,
  roomTodoSet,
  roomUnlog,
} from "./actions";
import type { Window } from "@/lib/ingest/windows";
import { shortName } from "@/lib/ingest/short-name";
import { monthDay } from "@/lib/ingest/wrote";
import { sniffPaste } from "@/lib/paste-files";
import type { LedgerRow } from "./chute-ledger";
import { HeldBox, type HeldAccount, type HeldChoice } from "./ingest/held";
import { ReceiptLine } from "./ingest/receipt";
import { DROP_CSV_RECEIPT, useIngest } from "./ingest/use-ingest";
import { dismissHeld, holdVerdict, useVerdict, type Held } from "./ingest/use-verdict";
import { useUndo } from "./ingest/use-undo";
import type { StageView } from "@/lib/room/stages-view";
import { PipelineDrawer } from "./pipeline-tab";
import type { PipelineRecord } from "@/lib/pipeline/build";
import { todayRegister } from "@/lib/room/springs";
import styles from "./room.module.css";
import TheirsLine, { type TheirsGem } from "./theirs-line";

// The fold, remembered per browser. A no-op subscription is enough for
// useSyncExternalStore's hydration probe: the server renders every row open,
// and the stored preference only applies once the client has taken over.
const SHUT_KEY = "room:shut";
const EMPTY_SHUT: ReadonlySet<string> = new Set();

function subscribeNoop() {
  return () => {};
}

function readShut(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(SHUT_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export type RoomRow = {
  accountId: string;
  /** The THEIRS line (decreed 2026-08-20): the second record's verified
   *  read — null when the drop holds no live gems for this account. */
  theirs: { label: string; gems: TheirsGem[] } | null;
  cardId: string;
  name: string;
  meta: string;
  shape: string;
  multiTone: "g" | "y" | "r";
  people: { name: string; line: string }[];
  briefed: boolean;
  briefedManual: "opp" | "done" | null;
  sfUrl: string | null;
  climb: {
    frac: number;
    capTone: "risk" | "warn" | "ok";
    label: string;
    /** why the meter sits where it does — the hover bubble, line by line */
    why: string[];
  };
  stages: StageView[];
  suggestions: { node: string; index: number; item: string; why: string }[];
  move: string;
  /** The whole commitment behind a shortened move — "" when the line is the
   *  whole thing. Every compression is a door (the click-depth law). */
  moveFull?: string;
  thin: boolean;
  outstanding: {
    item: string;
    node: string;
    index: number;
    doneKey: string;
    closedCount: number;
  } | null;
  sheetOpen: {
    id: string;
    body: string;
    edit?: string;
    wall?: string;
    fallback?: string;
    /** Why the record shows this already landed. The row says so instead of
     *  nagging; the ✓ is still the operator's (decreed 2026-09-04). */
    settled?: string;
  }[];
  /** Open commitments the register's cap held back. They are never dropped
   *  — the list says how many and opens them (the click-depth law). */
  sheetRest: {
    id: string;
    body: string;
    edit?: string;
    wall?: string;
    fallback?: string;
  }[];
  sheetDelayed: { id: string; body: string; edit?: string; when: string }[];
  sheetDoneToday: { id: string; body: string; edit?: string; at: string }[];
  record: { id: string; t: string; text: string; struck: boolean }[];
  recordTotal: number;
  backgroundTotal: number;
  loss: { noteId: string; phrase: string; date: string; status: "lost" | "won" } | null;
  owed: { noteId: string; key: string; text: string; src: string }[];
  outcome: { status: "won" | "lost"; phrase: string; at: string } | null;
  gaps: { id: string; question: string; at: string }[];
  gapsQueued: number;
  /** What prospects in comparable situations asked (C7) — inherited, not owed. */
  peers: { question: string; shared: string; findHref: string }[];
  /** The same brain, the question pre-scoped to this deal. */
  askHref: string;
  researchAt: string; // ISO of the last research pass, "" if never run
  health: "red" | "amber" | "green" | "quiet";
  rank: number;
  /** The day's move already closed on this row (Chicago day; clears overnight). */
  workedToday: boolean;
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
// A chase the operator armed by hand. `filed` names the accounts it already
// routed itself to; `newName` is the one open question — a name the board has
// never heard of.
export type FollowUpRow = {
  subjectKey: string;
  label: string;
  armedAt: string;
  filed: string[];
  newName: string;
};
export type WarmRow = { id: string; name: string; why: string; seedNote: string };
export type LaterRow = { id: string; body: string };

// The partner notifier: green from the stage record OR from the operator's
// own hand — a click springs a radio (Opp created / Briefed — done / clear)
// filed durably (founder-decreed 2026-08-19).
function Briefed({
  on,
  manual,
  accountId,
  canWrite,
}: {
  on: boolean;
  manual: "opp" | "done" | null;
  accountId: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<"opp" | "done" | null>(manual);
  const [pending, start] = useTransition();
  const router = useRouter();
  const lit = on || local !== null;
  const set = (v: "opp" | "done" | "clear") => {
    setLocal(v === "clear" ? null : v);
    setOpen(false);
    start(async () => {
      // The page derives on request (D15): a status that kept asks the
      // router for the fresh read here, in the component that set it.
      const r = await roomBriefedSet(accountId, v);
      if (r.ok) router.refresh();
    });
  };
  const title = lit
    ? local === "opp"
      ? "Opportunity created. Click to change."
      : "Partner briefed. Click to change."
    : "Partner not briefed yet. Click to set the status by hand; it also turns green when a partner-brief item closes in the stage record.";
  return (
    <span className={styles.bfWrap}>
      <button
        type="button"
        className={styles.briefed}
        title={title}
        onClick={() => canWrite && setOpen((v) => !v)}
      >
        <svg
          viewBox="0 0 20 20"
          width="13"
          height="13"
          fill="none"
          stroke={lit ? "#1E5B46" : "rgba(10,28,64,.25)"}
          strokeWidth="2.4"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        >
          <path d="M5 11 l4 4 7-8" />
          <path d="M2 18 h16" />
        </svg>
      </button>
      {open && canWrite && (
        <span className={styles.bfPop}>
          <label className={styles.bfOpt}>
            <input
              type="radio"
              name={`bf-${accountId}`}
              checked={local === "opp"}
              disabled={pending}
              onChange={() => set("opp")}
            />
            Opp created
          </label>
          <label className={styles.bfOpt}>
            <input
              type="radio"
              name={`bf-${accountId}`}
              checked={local === "done"}
              disabled={pending}
              onChange={() => set("done")}
            />
            Done
          </label>
          {local !== null && (
            <button
              type="button"
              className={styles.bfClear}
              disabled={pending}
              onClick={() => set("clear")}
            >
              clear ↺
            </button>
          )}
        </span>
      )}
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

// The misfile guard's holding pen: the read thinks this paste belongs to
// another account, so nothing is written until the operator insists. The
// verdict (use-verdict.ts) carries both sides, so the banner can show what
// the chosen row carries, and the rung's reason where the why stood (D9 as
// amended 2026-10-05). The Drop holds beside it what the answer needs: the
// text, the dropped files held with the question so a disputed drop never
// lands in the wrong folder, and what the reader cut before the text
// arrived (D4), for the re-run.
type DropHold = Held<{ text: string; files?: File[]; windows?: Window[] }>;

// One line of the TODAY register's fresh receipts: a sentence the row said
// (a close, a retire, an ask minted), or a filing's receipt, which the Drop
// paints with the Chute's own receipt line (slice 18a; the face approved
// 2026-10-06). A Drop receipt is never stored: the register is this row's.
type FreshEntry = { text: string; receipt?: undefined } | { receipt: LedgerRow };

/** Today, M/D in Chicago: the day a receipt shows. */
const receiptDay = (): string => monthDay(new Date());

function Row({
  row,
  collapsed,
  onToggle,
}: {
  row: RoomRow;
  collapsed: boolean;
  onToggle: () => void;
}) {
  // The shared door (src/app/room/ingest, slice 8 of the Chute brains
  // refactor plan): this row is the Drop, bound to its account, reading
  // PDFs through its own transcriber.
  const ingest = useIngest({
    door: "drop",
    readPdf: (fd) => roomReadPdf(row.accountId, fd),
  });
  const { undo } = useUndo();
  // The day's mark, held locally so the ✓ lands the instant it's clicked; the
  // server round trip re-derives it on the next paint.
  const [workedNow, setWorkedNow] = useState(false);
  const worked = row.workedToday || workedNow;
  const [freshCaps, setFreshCaps] = useState<FreshCap[]>([]);
  const [freshInfo, setFreshInfo] = useState<FreshEntry[]>([]);
  // Each receipt's key, so a backup that lands later finds its filing.
  const receiptSeq = useRef(0);
  const addReceipt = (rc: Omit<LedgerRow, "key">): number => {
    const key = ++receiptSeq.current;
    setFreshInfo((f) => [{ receipt: { ...rc, key } }, ...f]);
    return key;
  };
  const patchReceipt = (key: number, up: Partial<LedgerRow>) =>
    setFreshInfo((f) =>
      f.map((x) => (x.receipt?.key === key ? { receipt: { ...x.receipt, ...up } } : x)),
    );
  // The held verdict the banner shows; a second dispute waits its turn
  // behind it (use-verdict.ts).
  const { mismatch, setMismatch } = useVerdict<DropHold>();
  const [gone, setGone] = useState<Set<string>>(new Set());
  // Rows the operator just un-held: they belong in the open list until the
  // server round trip re-partitions them there.
  const [backNow, setBackNow] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [promotedNotes, setPromotedNotes] = useState<Set<string>>(new Set());
  const [recOpen, setRecOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // The Spring (triptych winner, 2026-08-13): each register rests as one
  // summary line; ⊕ springs it out in place, one register out at a time.
  const [spring, setSpring] = useState<"unknown" | "peers" | "today" | null>(null);
  // ✎ on a sheet line — the operator rewrites it in place.
  const [todoEditId, setTodoEditId] = useState<string | null>(null);
  const [todoEditText, setTodoEditText] = useState("");
  const [editedTodos, setEditedTodos] = useState<Map<string, string>>(new Map());
  const [editText, setEditText] = useState("");
  const [editedNotes, setEditedNotes] = useState<Map<string, string>>(new Map());
  const [deletedNotes, setDeletedNotes] = useState<Set<string>>(new Set());
  const [logText, setLogText] = useState("");
  const [mode, setMode] = useState<"note" | "action">("note");
  // Urgency chips retired (founder-decreed 2026-08-18) — the composer files
  // at the default weight; the sheet's own ladder does the ranking.
  const urg = "" as const;
  const [pasteOpen, setPasteOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // The Drop's file path: hot while a file hovers, named while files are
  // read. Several files of one drop read at once (bug 2 closed, slice 8), so
  // the label holds every name still being read.
  const [dropHot, setDropHot] = useState(false);
  const [reading, setReading] = useState<string[]>([]);
  const readingAdd = (name: string) => setReading((xs) => [...xs, name]);
  const readingDrop = (name: string) =>
    setReading((xs) => {
      const i = xs.indexOf(name);
      return i < 0 ? xs : [...xs.slice(0, i), ...xs.slice(i + 1)];
    });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Which outstanding item was closed — keyed by doneKey so the strike never
  // carries over onto the NEXT item after the panel refreshes.
  const [closedKey, setClosedKey] = useState<string | null>(null);
  // Fresh receipts show two deep; the rest collapse behind one quiet toggle so
  // a run of closes never stacks a wall of struck lines into the pane.
  const [freshAll, setFreshAll] = useState(false);
  const closed = !!row.outstanding && closedKey === row.outstanding.doneKey;
  const [stageOpen, setStageOpen] = useState<string | null>(null);
  // The stage checklist closes on a click anywhere else — the nodes that open it
  // sit inside this wrapper, so a node still toggles its own drawer.
  const stageRef = useDismiss<HTMLDivElement>(stageOpen !== null, () =>
    setStageOpen(null),
  );
  const [pending, start] = useTransition();
  // The move button owns its own spinner — a register-row op must never
  // dress the Mark-it-done button in "Saving…".
  const [closePending, startClose] = useTransition();
  // Every page derives on request (D15): the server's revalidation retired
  // with slice 9 of the Chute brains refactor plan, so a write that took asks
  // the router for the fresh read here, in the component that made it, once
  // per write. The row's optimistic state lands first and the re-derived page
  // follows. The shared door and the take-back ask on their own (use-ingest.ts,
  // use-undo.ts), so the filing path is never asked twice.
  const router = useRouter();
  const took = <R extends { ok: boolean }>(r: R): R => {
    if (r.ok) router.refresh();
    return r;
  };

  // The box decides (founder-decreed 2026-08-13): a jot stays an instant
  // note, but anything that reads like a capture — a pasted thread, meeting
  // notes, a multi-line summary — goes through the full read, so its
  // commitments, asks, and playbook intel fan out instead of dying as one
  // dumb note. Explicit Action mode always files the action verbatim.
  const readsRich = (t: string): boolean => {
    if (sniffPaste(t).kind !== "note") return true;
    return t.length >= 280 || t.split("\n").filter((l) => l.trim()).length >= 3;
  };
  const submitCompose = () => {
    const text = logText.trim();
    if (!text || pending) return;
    if (mode === "note" && readsRich(text)) {
      filePaste(text, false);
      return;
    }
    start(async () => {
      const r = took(
        await roomCompose(row.accountId, text, { kind: mode, urgency: urg }),
      );
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
        setNote(null);
        setSpring("today");
      } else if (!r.ok) setNote(r.reason ?? "That didn't save.");
    });
  };
  const undoCap = (idx: number) => {
    const c = freshCaps[idx];
    if (!c?.todoId || pending) return;
    const todoId = c.todoId;
    start(async () => {
      const r = took(await roomUnlog(row.accountId, todoId));
      if (r.ok) setFreshCaps((f) => f.filter((_, i) => i !== idx));
      else setNote(r.reason ?? "The undo didn't take.");
    });
  };
  const promoteCap = (idx: number) => {
    const c = freshCaps[idx];
    if (!c?.todoId || pending) return;
    const todoId = c.todoId;
    start(async () => {
      const r = took(await roomNoteToAction(row.accountId, { todoId }));
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
      const r = took(await roomNoteToAction(row.accountId, { noteId }));
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
      const r = took(await roomRecordEdit(row.accountId, noteId, text));
      if (r.ok) {
        setEditedNotes((m) => new Map(m).set(noteId, text));
        setEditId(null);
      } else setNote(r.reason ?? "The edit didn't save.");
    });
  };
  const saveTodoEdit = (todoId: string) => {
    const text = todoEditText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = took(await roomTodoEdit(row.accountId, todoId, text));
      if (r.ok) {
        setEditedTodos((m) => new Map(m).set(todoId, text));
        setTodoEditId(null);
      } else setNote(r.reason ?? "The edit didn't save.");
    });
  };
  const deleteNote = (noteId: string) => {
    if (pending) return;
    start(async () => {
      const r = took(await roomRecordDelete(row.accountId, noteId));
      if (r.ok) setDeletedNotes((s) => new Set(s).add(noteId));
      else setNote(r.reason ?? "The delete didn't take.");
    });
  };
  // File a text through the shared door, inside the row's transition so the
  // receipt lands as one update. Resolves once the filing has returned and
  // its receipt has landed, with whether it took, so a reader can drop its
  // label and a pick can answer the question it was asked.
  const filePaste = (
    text: string,
    force: boolean,
    waiting?: File[],
    // What the reader cut before the text arrived (D4): the transcriber's
    // or the document's window, recorded on the Filing row and the receipt.
    windows?: Window[],
    // The account a held question's answer names; this row by default.
    to?: HeldAccount,
  ): Promise<boolean> =>
    new Promise((done) =>
      start(async () => {
        try {
          done(await fileText(text, force, waiting, windows, to));
        } catch {
          setNote("The paste didn't file.");
          done(false);
        }
      }),
    );
  const fileText = async (
    text: string,
    force: boolean,
    waiting?: File[],
    windows?: Window[],
    to?: HeldAccount,
  ): Promise<boolean> => {
    const account = to ?? { id: row.accountId, name: row.name };
    const r = await ingest.file(account.id, text, { force, windows, waiting });
    const vault = r.vault;
    // The guard objected: the files wait with the question. Nothing
    // reaches the vault until the operator answers it.
    const held = holdVerdict(r, { text, files: vault.hold, windows });
    if (held) {
      setMismatch(held);
      return false;
    }
    if (r.ok) {
      // One receipt line (slice 18a): the account, each count, the day, and
      // "picked" when the operator answered a held question. The second
      // line says what needs saying: the windows, the duplicate check, the
      // reader that was down. The to-dos themselves show in TODAY, which
      // springs open below; the line opens to what the filing wrote.
      const key = addReceipt({
        filename: waiting?.[0]?.name ?? "",
        state: "filed",
        account,
        rung: force ? "pick" : undefined,
        filed: r.filed,
        opened: (r.opened ?? []).length,
        promises: r.promises,
        asks: r.asks,
        learned: r.learned,
        degraded: r.readFailed,
        noteIds: r.noteIds,
        todoIds: r.todoIds,
        filingId: r.filingId,
        windows: r.windows,
        dupeCheck: r.dupeCheck,
        day: receiptDay(),
      });
      // Accepted: NOW the files may go to the account's folder, and the
      // backup rides the filing's own receipt.
      if (vault.archive.length) void archiveFiles(vault.archive, account, key);
      setPasteText("");
      setLogText("");
      setPasteOpen(false);
      setNote(null);
      setSpring("today");
      return true;
    }
    setNote(r.reason ?? "The paste didn't file.");
    return false;
  };
  // An answer to the held question is final: the filing re-runs with force
  // and the held text, files and windows, the read runs again and nothing is
  // re-judged (D5). The question steps down only when the answer filed, so a
  // second held question behind it keeps its place.
  const answerHeld = (to?: HeldAccount) => {
    if (!mismatch) return;
    const label = `the file again for ${to?.name ?? mismatch.bound}`;
    readingAdd(label);
    void filePaste(mismatch.text, true, mismatch.files, mismatch.windows, to).then(
      (ok) => {
        readingDrop(label);
        if (ok) setMismatch(null);
      },
    );
  };
  // A held paste dies with its pane: closing the bolt answers it with
  // nothing filed. Held files never go this way; they wait for the box,
  // whose ✕ still backs them up (slice 18a).
  const dropHeldPaste = () => {
    if (mismatch && !mismatch.files?.length) setMismatch(null);
  };
  // "Keep on {row}": the operator asserts the drop was right.
  const pickBound = () => answerHeld();
  const pickHeld = (account: HeldAccount, how: HeldChoice) =>
    how === "bound" || account.id === row.accountId ? pickBound() : answerHeld(account);
  // The held box's ✕ (slice 18a): nothing files on any account, and the held
  // files back up under accounts/_unfiled/ (a held paste backs up as its
  // text), because git is the home for every dropped file (D8 as amended
  // 2026-10-05). The Drop used to discard them.
  const unfileHeld = () => {
    if (!mismatch) return;
    const plan = dismissHeld({
      filename: mismatch.files?.[0]?.name,
      text: mismatch.text,
      files: mismatch.files,
    });
    setMismatch(null);
    if (plan.kind !== "vault") return;
    void (async () => {
      for (const f of plan.files) {
        setArch({ text: `Backing up ${f.name}…` });
        const r = await ingest.vaultUnfiled(f, (sent, total) =>
          setArch({ text: `Backing up ${f.name}… ${sent} of ${total}` }),
        );
        addReceipt(
          r.ok
            ? {
                filename: f.name,
                state: "unfiled",
                day: receiptDay(),
                vault: { text: r.detail, url: r.url },
              }
            : { filename: f.name, state: "error", reason: r.reason, day: receiptDay() },
        );
      }
      setArch(null);
      setSpring("today");
    })();
  };
  // The Drop reads a dropped or picked file into paste text, then files it
  // through the same read-and-file path as a paste. Each file of a drop
  // files on its own, with its own receipt (bug 2 closed, slice 8).
  const readDroppedFile = async (f: File, waiting?: File[]) => {
    readingAdd(f.name);
    const read = await ingest.read(f);
    if (!read.ok) {
      readingDrop(f.name);
      setNote(read.reason);
      // Unreadable after all — the vault is the whole point for these.
      if (waiting?.length) void archiveFiles(waiting);
      return;
    }
    // The label holds through the server filing too — the slow part is the
    // brain reading the text, and a silent row reads as a dead drop.
    await filePaste(read.text, false, waiting, read.windows);
    readingDrop(f.name);
  };
  // The vault (founder-decreed 2026-09-02; canon since 2026-09-25, D8, as
  // amended 2026-10-05): EVERY file dropped on the row archives to the
  // GitHub vault under accounts/<this account>, fully automatic — small
  // files as repo files, large ones as pre-release assets. The server does
  // the carrying (src/app/room/vault-actions.ts), so no token reaches the
  // browser; a file above one request's cap goes up in pieces the server
  // assembles before it lands. The archive rides beside the filing, never
  // instead of it: readable files still file to the record exactly as
  // before, and a binary the reader cannot open still lands in the vault.
  // The backup in flight shows on the Drop; each one that lands is a
  // receipt in TODAY, or rides the receipt of the filing it backs (slice
  // 18a). `note` is the refused export's decreed line.
  const [arch, setArch] = useState<{ text: string } | null>(null);
  const archiveFiles = async (
    files: File[],
    account: HeldAccount = { id: row.accountId, name: row.name },
    filing?: number,
    note?: string,
  ) => {
    if (files.length === 0) return;
    for (const f of files) {
      setArch({ text: `Backing up ${f.name}…` });
      const r = await ingest.vault(account.id, f, (sent, total) =>
        setArch({ text: `Backing up ${f.name}… ${sent} of ${total}` }),
      );
      const vault = r.ok ? { text: r.detail, url: r.url } : { text: r.reason, bad: true };
      if (filing !== undefined) patchReceipt(filing, { vault });
      else
        addReceipt(
          r.ok
            ? {
                filename: f.name,
                state: "vaulted",
                account,
                day: receiptDay(),
                vault,
                note,
              }
            : { filename: f.name, state: "error", reason: r.reason, day: receiptDay() },
        );
    }
    setArch(null);
    if (filing === undefined) setSpring("today");
  };

  const handleFiles = (list: FileList | null) => {
    setNote(null);
    // The shared door's plan (use-ingest.ts): the record's reader takes only
    // the types it can read; everything else is vault-only and never earns a
    // can't-read complaint for being a video. The vault waits on the guard
    // (founder-decreed 2026-09-03). A readable capture archives only once the
    // filing is ACCEPTED — a misfiled drop used to put its file in the wrong
    // account's folder too, and the vault never un-writes (the Simploy call
    // in accounts/Regis HR Group/). Files the reader can't open carry no
    // verdict to wait for, so they go now.
    const plan = ingest.plan(list);
    if (plan.vault.length) void archiveFiles(plan.vault);
    // The weekly export is the Chute's to read (D2 as amended 2026-10-05):
    // dropped on a row it is refused before any read, backed up under this
    // account, never filed here, and the receipt says so.
    if (plan.refused.length)
      void archiveFiles(plan.refused, undefined, undefined, DROP_CSV_RECEIPT);
    // Every readable file is read, each filing on its own (bug 2), at most
    // CHUTE_PARALLEL at a time in drop order (D11). Each waits on its own
    // verdict alone: handing the whole drop down vaulted every other file a
    // second time on accept (audit pass 1, bug 8).
    void ingest.limited(plan.read.map((f) => () => readDroppedFile(f, [f])));
  };

  const submitPaste = () => {
    const text = pasteText.trim();
    if (!text || pending) return;
    filePaste(text, false);
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
      const r = took(await call(row.accountId, row.cardId, l.noteId, l.phrase));
      if (r.ok) {
        setLossState("lost");
        setFreshInfo((f) => [
          {
            text: `${status === "won" ? "Closed Won" : "Closed Lost"}. The meter says so now. Retire the row when you're done.`,
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
      const r = took(await roomRetire(row.accountId, row.cardId));
      if (r.ok) setFreshInfo((f) => [{ text: "Retired from the board." }, ...f]);
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const [askGone, setAskGone] = useState<Set<string>>(new Set());
  // The move's own door: the built line by default, the whole commitment on
  // a click. Nothing deep ever surfaces uninvited.
  const [moveOpen, setMoveOpen] = useState(false);
  const [research, setResearch] = useState<{ note: string; changed: string[] } | null>(
    null,
  );
  const [rsrchPending, startResearch] = useTransition();
  const [askPending, startAsk] = useTransition();
  const runResearchPass = () => {
    if (rsrchPending) return;
    startResearch(async () => {
      const r = took(await roomResearch(row.accountId));
      if (r.ok)
        setResearch({
          note: r.summary || "Filed to the record.",
          changed: r.changed ?? [],
        });
      else setNote(r.reason ?? "The research pass didn't complete.");
    });
  };
  const refillAsks = () => {
    if (askPending) return;
    startAsk(async () => {
      const r = took(await roomGapsRefill(row.accountId));
      if (r.ok)
        setFreshInfo((f) => [
          {
            text: r.added
              ? `${r.added} new ask${r.added === 1 ? "" : "s"} minted from what the app knows.`
              : "Nothing new to ask. The list already has it all.",
          },
          ...f,
        ]);
      else setNote(r.reason ?? "Minting didn't complete.");
    });
  };
  const dismissAsk = (id: string) => {
    if (askPending) return;
    startAsk(async () => {
      const r = took(await roomGapDismiss(row.accountId, id));
      if (r.ok) setAskGone((sx) => new Set(sx).add(id));
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const keepSalvaging = () => {
    if (!row.loss || pending) return;
    const l = row.loss;
    start(async () => {
      const r = took(await roomLossDismiss(row.accountId, row.cardId, l.noteId));
      if (r.ok) setLossState("salvaging");
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const owedAccept = (o: { key: string; text: string }) => {
    if (pending) return;
    start(async () => {
      const r = took(await roomOwedAccept(row.accountId, o.text, o.key));
      if (r.ok) {
        setOwedGone((s) => new Set(s).add(o.key));
        setFreshCaps((f) => [{ body: o.text, kind: "action", promoted: true }, ...f]);
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const owedDismiss = (o: { key: string }) => {
    if (pending) return;
    start(async () => {
      const r = took(await roomOwedDismiss(row.accountId, o.key));
      if (r.ok) setOwedGone((s) => new Set(s).add(o.key));
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  const lossLive = !!row.loss && lossState === "live";

  // ↺ on a filing's receipt takes the whole filing back by its id
  // (use-undo.ts), the to-dos it opened included, and the receipt says what
  // went.
  const takeBack = (rc: LedgerRow) => {
    const acct = rc.account;
    if (!acct || pending) return;
    start(async () => {
      const r = await undo(acct.id, rc);
      if (r.ok)
        patchReceipt(rc.key, {
          state: "undone",
          reason: `Taken back from ${shortName(acct.name)}. ${r.removed + r.retired} removed.`,
        });
      else setNote(r.reason ?? "The take-back didn't go through.");
    });
  };
  const clearReceipt = (key: number) =>
    setFreshInfo((f) => f.filter((x) => x.receipt?.key !== key));
  // Done means two things at once, and the row needs both. A staged item closes
  // where it always closed — that's the record's version of the truth. The
  // day's mark rides alongside it so EVERY row can answer the read, including
  // the ones with nothing staged, which had no way to answer at all.
  const submitClose = () => {
    if (closePending || (closed && worked)) return;
    const o = row.outstanding;
    startClose(async () => {
      // Two writes, one ask for the fresh read: whichever of them took.
      let wrote = false;
      if (o && !closed) {
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
          wrote = true;
          setClosedKey(o.doneKey);
          setFreshInfo((f) => [{ text: `Closed: ${o.item}` }, ...f]);
        } else {
          setNote(r.reason ?? "The close didn't save.");
          return;
        }
      }
      const m = await roomMoveDone(row.accountId);
      if (m.ok) {
        wrote = true;
        setWorkedNow(true);
      } else setNote(m.reason ?? "That didn't save.");
      if (wrote) router.refresh();
    });
  };

  // Taking the mark back — the operator's own correction, same day only.
  const undoWorked = () =>
    startClose(async () => {
      const r = took(await roomMoveDone(row.accountId, true));
      if (r.ok) setWorkedNow(false);
      else setNote(r.reason ?? "That didn't save.");
    });
  const todoOp = (id: string, op: "done" | "undo" | "tomorrow" | "now" | "drop") =>
    start(async () => {
      const r = took(await roomTodoSet(row.accountId, id, op));
      if (!r.ok) setNote(r.reason ?? "That didn't save.");
      else if (op === "done") setDoneIds((s) => new Set(s).add(id));
      else if (op === "undo")
        setDoneIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      // "now" pulls a held row back into today's work — the row must reappear
      // as open, not disappear the way a park or a delay does.
      else if (op === "drop" || op === "tomorrow") setGone((s) => new Set(s).add(id));
      else if (op === "now") setBackNow((s) => new Set(s).add(id));
    });

  const openStage = row.stages.find((s) => s.key === stageOpen);
  const label = row.climb.label;

  // The springs' counts — each numeral is the length of exactly the list its
  // register shows. One derivation, no second bookkeeping.
  const liveAsks = row.gaps.filter((g) => !askGone.has(g.id));
  const liveOpen = row.sheetOpen.filter((t) => !gone.has(t.id) && !doneIds.has(t.id));
  // The register shows a ranked eight; the rest are a door, never a
  // disappearance (decreed 2026-09-03).
  const [restOpen, setRestOpen] = useState(false);
  const restCount = row.sheetRest.filter(
    (t) => !gone.has(t.id) && !doneIds.has(t.id),
  ).length;
  const liveOwed = row.owed.filter((o) => !owedGone.has(o.key));
  const doneCount =
    row.sheetDoneToday.filter((t) => !gone.has(t.id)).length +
    row.sheetOpen.filter((t) => !gone.has(t.id) && doneIds.has(t.id)).length;
  // The numeral and the trailing text, from one derivation. They used to come
  // from two, and a row with an owed line and no todo read "TODAY 0 · TrendHR
  // follow-up" — a count of nothing beside a thing (2026-09-23).
  const today = todayRegister({
    owed: liveOwed.map((o) => o.text),
    open: liveOpen.map((t) => t.body),
    restCount,
  });
  const topToday = today.top;

  return (
    <div
      className={[
        styles.row,
        row.outcome ? styles.rowClosed : "",
        collapsed ? styles.rowShut : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.deal}>
        {/* The whole line folds the row — a caret this small can't be the only
            target. Links, controls, and the MULTI hovercard keep their clicks. */}
        <div
          className={styles.nmline}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(`a,button,.${styles.multi}`)) return;
            onToggle();
          }}
        >
          <button
            type="button"
            className={styles.shut}
            aria-expanded={!collapsed}
            title={collapsed ? "Open this row" : "Collapse this row"}
            onClick={onToggle}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <span className={styles.nm}>
            <span className={styles.nmSide}>
              <Briefed
                on={row.briefed}
                manual={row.briefedManual}
                accountId={row.accountId}
                canWrite={row.canWrite}
              />
              {row.sfUrl && (
                <a
                  className={styles.sfMini}
                  href={row.sfUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open the account in Salesforce to create the opportunity."
                >
                  SF
                </a>
              )}
            </span>
            <Link href={`/accounts?focus=${row.accountId}`} className={styles.nmLink}>
              {row.name}
            </Link>
            {row.outcome && (
              <span
                className={
                  row.outcome.status === "won" ? styles.stampWon : styles.stampLost
                }
              >
                {row.outcome.status === "won" ? "CLOSED WON" : "CLOSED LOST"}
              </span>
            )}
          </span>
          <span className={styles.chips}>
            <span className={styles.chip}>{row.shape}</span>
            {row.meta && <span className={styles.metaIn}>{row.meta}</span>}
            <span className={`${styles.multi} ${styles[`m_${row.multiTone}`]}`}>
              MULTI
              <span className={styles.hovercard}>
                <span className={styles.hk}>
                  WHO&apos;S IN THIS DEAL · FROM THE REPOSITORY
                </span>
                {row.people.length === 0 && (
                  <span className={styles.hp}>
                    No stakeholders on file yet. Paste activity and they appear here.
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
                title={`Paste. Files to ${row.name}.`}
                onClick={() => {
                  setPasteOpen((v) => !v);
                  setMismatch(null);
                }}
              >
                ⚡
              </button>
            )}
            {/* Research rides the title line. The run date leaves the label
                for the tooltip: it matters when you're about to re-run, not on
                every glance down the page. */}
            {row.canWrite && row.accountId && (
              <button
                type="button"
                className={styles.rsrchChip}
                disabled={rsrchPending}
                onClick={runResearchPass}
                title={`${
                  row.researchAt
                    ? `Last run ${new Date(row.researchAt).toLocaleDateString("en-US", {
                        timeZone: "America/Chicago",
                        month: "numeric",
                        day: "numeric",
                      })}.`
                    : "Never run. The first pass is the deep one."
                } Runs the deep pass: their site, their postings, the news, the people on this deal.`}
              >
                {rsrchPending
                  ? "RESEARCHING…"
                  : row.researchAt
                    ? "RESEARCH ⟳"
                    : "RESEARCH — NEVER ⟳"}
              </button>
            )}
            {/* The day's mark. It rides the title line so it survives the fold —
                a folded board still says who has been worked. */}
            {worked && (
              <button
                type="button"
                className={styles.worked}
                disabled={closePending}
                onClick={undoWorked}
                title="Worked today. Click to take the mark back."
              >
                ✓ WORKED
              </button>
            )}
          </span>
        </div>

        {/* The move sits under the identity line, where the research control
            used to be: the row's one instruction, before the instruments that
            explain it. The whole slot moves — it carries the closed states
            too, so it is the row's verdict line, not just its next move. */}
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
                Filed {row.loss!.date}: “{row.loss!.phrase}”. Your call: stamp the meter,
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
                The meter reads it now. The record keeps everything.
              </p>
            </>
          ) : (
            <>
              <span className={styles.lbl}>NEXT MOVE</span>
              {/* The gate chip is retired (founder-decreed 2026-08-19): the
                  stage's open question lives in the UNKNOWN register with
                  its own ✓ — the move line carries only the move. */}
              {/* The move is BUILT from the commitment, not printed as it —
                  and when the line holds detail back it opens rather than
                  ending in a dead ellipsis (founder-decreed 2026-09-03). */}
              {row.moveFull ? (
                <p
                  className={`${styles.move} ${row.thin ? styles.thin : ""} ${styles.moveDoor}`}
                  title={row.moveFull}
                  onClick={() => setMoveOpen((v) => !v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMoveOpen((v) => !v);
                    }
                  }}
                >
                  {/* A promise line's door holds one line per open promise
                      (the face approved 2026-10-06); each opens on its own
                      line. */}
                  {moveOpen
                    ? row.moveFull.split("\n").map((line, k) => (
                        <Fragment key={k}>
                          {k > 0 && <br />}
                          {line}
                        </Fragment>
                      ))
                    : row.move}
                </p>
              ) : (
                <p className={`${styles.move} ${row.thin ? styles.thin : ""}`}>
                  {row.move}
                </p>
              )}
              {/* Every row can answer now. When the move names the staged item
                  this still closes it; otherwise it marks the day — the case
                  that used to leave the operator with no reply at all. */}
              {row.canWrite && !worked && !(closed && !row.outstanding) && (
                <button
                  type="button"
                  className={row.rank === 0 ? styles.go : styles.ghost}
                  disabled={closePending}
                  onClick={submitClose}
                  title={
                    row.outstanding && !closed
                      ? `Closes “${row.outstanding.item}” and marks the day worked.`
                      : "Marks the day worked. Nothing is staged to close."
                  }
                >
                  {closePending ? "Saving…" : "Mark it done ✓"}
                </button>
              )}
            </>
          )}
        </div>
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

        <div className={styles.climb} ref={stageRef}>
          {/* The bar lives in its own 16px zone so the label below never sits
              under the fill; hovering the zone opens the why bubble. */}
          <div className={styles.meterZone}>
            <div className={styles.track}>
              <div
                className={styles.gain}
                style={{
                  width: `${Math.round(Math.max(0.04, row.climb.frac) * 100)}%`,
                }}
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
                title={`${s.label}. Open its checklist.`}
                onClick={() => setStageOpen((k) => (k === s.key ? null : s.key))}
              />
            ))}
            {row.climb.why.length > 0 && (
              <div className={styles.meterCard}>
                <span className={styles.hk}>WHY THE METER SITS HERE</span>
                {row.climb.why.map((w) => (
                  <span key={w} className={styles.hp}>
                    {w}
                  </span>
                ))}
              </div>
            )}
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
                    Check <b>“{sg.item}”</b>. {sg.why}.
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
                    placeholder="Say why this stage sits where it does…"
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
        </div>
      </div>

      <div className={styles.rec}>
        {row.theirs && (
          <TheirsLine
            accountId={row.accountId}
            label={row.theirs.label}
            gems={row.theirs.gems}
          />
        )}
        {spring !== "unknown" && (
          <div className={styles.sumline}>
            <span className={styles.sumk}>UNKNOWN</span>
            <span className={styles.sumn}>
              {(row.outstanding && !closed ? 1 : 0) + liveAsks.length}
              {row.gapsQueued > 0 ? ` · ${row.gapsQueued} queued` : ""}
            </span>
            <span className={styles.sumtx}>
              {row.outstanding && !closed
                ? row.outstanding.item
                : (liveAsks[0]?.question ?? "Nothing of this deal's own yet.")}
            </span>
            <Link href={row.askHref} className={styles.sic} title="Ask the brain">
              ⌕
            </Link>
            {row.canWrite && (
              <button
                type="button"
                className={styles.sic}
                disabled={askPending}
                onClick={refillAsks}
                title="Mint sharper asks"
              >
                {askPending ? "…" : "⟳"}
              </button>
            )}
            <button
              type="button"
              className={styles.splayBtn}
              title="Expand them out"
              onClick={() => setSpring("unknown")}
            >
              ⊕
            </button>
          </div>
        )}
        {spring === "unknown" && (
          <div className={styles.splayed}>
            <div className={`${styles.sumline} ${styles.sumOpen}`}>
              <span className={`${styles.sumk} ${styles.sumkOn}`}>STILL UNKNOWN</span>
              <span className={styles.sumn}>
                {liveAsks.length}
                {row.gapsQueued > 0 ? ` · ${row.gapsQueued} queued` : ""}
              </span>
              <Link href={row.askHref} className={styles.sic} title="Ask the brain">
                ⌕
              </Link>
              {row.canWrite && (
                <button
                  type="button"
                  className={styles.sic}
                  disabled={askPending}
                  onClick={refillAsks}
                  title="Mint sharper asks"
                >
                  {askPending ? "…" : "⟳"}
                </button>
              )}
              <button
                type="button"
                className={styles.splayBtn}
                title="Fold them back"
                onClick={() => setSpring(null)}
              >
                ⊖
              </button>
            </div>
            {/* The stage's open question leads the register (founder-decreed
                2026-08-19) — ✓ checks it in the stage record. */}
            {row.outstanding && !closed && (
              <div className={styles.askRow}>
                <span className={styles.askQ}>
                  {row.outstanding.item}
                  <span className={styles.gateTag}>
                    STAGE GATE
                    {row.outstanding.closedCount > 0
                      ? ` · ${row.outstanding.closedCount} BEHIND IT`
                      : ""}
                  </span>
                </span>
                {row.canWrite && (
                  <button
                    type="button"
                    className={styles.askX}
                    disabled={closePending}
                    onClick={submitClose}
                    title="Mark it done — checks the gate in the stage record."
                  >
                    {closePending ? "…" : "✓"}
                  </button>
                )}
              </div>
            )}
            {liveAsks.length === 0 && (!row.outstanding || closed) && (
              <span className={styles.askQ}>
                Nothing of this deal&apos;s own yet. File a paste, or mint asks.
              </span>
            )}
            {liveAsks.map((g) => (
              <div key={g.id} className={styles.askRow}>
                <span className={styles.askQ}>{g.question}</span>
                {row.canWrite && (
                  <button
                    type="button"
                    className={styles.askX}
                    disabled={askPending}
                    onClick={() => dismissAsk(g.id)}
                    title="Not this deal"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {row.peers.length > 0 && spring !== "peers" && (
          <div className={styles.sumline}>
            <span className={styles.sumk}>COMPARABLE</span>
            <span className={styles.sumn}>{row.peers.length}</span>
            <span className={styles.sumtx}>
              {(row.peers[0].shared || "shared situation").toUpperCase()} —{" "}
              {row.peers[0].question}
            </span>
            <button
              type="button"
              className={styles.splayBtn}
              title="Expand them out"
              onClick={() => setSpring("peers")}
            >
              ⊕
            </button>
          </div>
        )}
        {row.peers.length > 0 && spring === "peers" && (
          <div className={styles.splayed}>
            <div className={`${styles.sumline} ${styles.sumOpen}`}>
              <span className={`${styles.sumk} ${styles.sumkOn}`}>
                ASKED ON COMPARABLE DEALS
              </span>
              <span className={styles.sumn}>{row.peers.length}</span>
              <button
                type="button"
                className={styles.splayBtn}
                title="Fold them back"
                onClick={() => setSpring(null)}
              >
                ⊖
              </button>
            </div>
            {row.peers.map((p) => (
              <div key={p.question} className={styles.askRow}>
                <span className={styles.askQ}>
                  <span className={styles.peerCtry}>
                    {p.shared.toUpperCase() || "SHARED SITUATION"}
                  </span>
                  {p.question}
                </span>
                <Link href={p.findHref} className={styles.askGo} title="Find the answer">
                  →
                </Link>
              </div>
            ))}
          </div>
        )}

        {spring !== "today" && (
          <div className={styles.sumline}>
            <span className={styles.sumk}>TODAY</span>
            <span className={styles.sumn}>
              {today.count}
              {doneCount > 0 ? ` · ${doneCount} done` : ""}
            </span>
            <span className={styles.sumtx}>{topToday || "Nothing open today."}</span>
            <button
              type="button"
              className={styles.splayBtn}
              title="Expand them out"
              onClick={() => setSpring("today")}
            >
              ⊕
            </button>
          </div>
        )}
        {spring === "today" && (
          <div className={styles.splayed}>
            <div className={`${styles.sumline} ${styles.sumOpen}`}>
              <span className={`${styles.sumk} ${styles.sumkOn}`}>TODAY</span>
              <span className={styles.sumn}>
                {today.count}
                {doneCount > 0 ? ` · ${doneCount} done` : ""}
              </span>
              <button
                type="button"
                className={styles.splayBtn}
                title="Fold them back"
                onClick={() => setSpring(null)}
              >
                ⊖
              </button>
            </div>
            {row.owed
              .filter((o) => !owedGone.has(o.key))
              .map((o) => (
                <div key={o.key} className={styles.owedBox}>
                  <span className={styles.kOwed}>⚑</span> The record says you owe:{" "}
                  <b>{o.text}</b>. {o.src}.
                  {row.canWrite && (
                    <span className={styles.sdSuggActs}>
                      <button
                        type="button"
                        className={styles.sdTag}
                        disabled={pending}
                        onClick={() => owedAccept(o)}
                      >
                        open it ✓
                      </button>
                      <button
                        type="button"
                        className={styles.sdTag}
                        disabled={pending}
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
                      <span
                        className={`${styles.ic} ${did ? styles.gDone : styles.gAct}`}
                      >
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
                            <button
                              onClick={() => todoOp(c.todoId!, "undo")}
                              title="undo"
                            >
                              ↩
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => todoOp(c.todoId!, "done")}
                                title="done"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => todoOp(c.todoId!, "drop")}
                                title="park"
                              >
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
            {/* The filing's receipt is the Chute's own line (slice 18a): the
                to-dos it opened are the real rows below, so the receipt no
                longer carries chips of them; its line opens to what it
                wrote. */}
            {(freshAll ? freshInfo : freshInfo.slice(0, 2)).map((f, i) => {
              const rc = f.receipt;
              return rc ? (
                <div key={`fr${rc.key}`} className={`${styles.rcptItem} ${styles.fresh}`}>
                  <ReceiptLine
                    row={rc}
                    canWrite={row.canWrite}
                    onTakeBack={
                      rc.state === "filed" && (rc.noteIds?.length || rc.filingId)
                        ? () => takeBack(rc)
                        : undefined
                    }
                    onClear={() => clearReceipt(rc.key)}
                  />
                </div>
              ) : (
                <div key={`fi${i}`} className={`${styles.it} ${styles.fresh}`}>
                  <span className={`${styles.ic} ${styles.gDone}`}>✓</span>
                  <span className={styles.tx}>{f.text}</span>
                </div>
              );
            })}
            {freshInfo.length > 2 && (
              <button
                type="button"
                className={styles.moreFresh}
                onClick={() => setFreshAll((v) => !v)}
              >
                {freshAll ? "Collapse ▴" : `Show ${freshInfo.length - 2} more ▸`}
              </button>
            )}
            {[
              // An un-held row rejoins the open list; it carries no wall of its own
              // until the server re-reads it.
              ...row.sheetDelayed
                .filter((t) => backNow.has(t.id))
                .map((t) => ({ id: t.id, body: t.body })),
              ...row.sheetOpen.filter((t) => !backNow.has(t.id)),
              ...(restOpen ? row.sheetRest.filter((t) => !backNow.has(t.id)) : []),
            ]
              .filter((t) => !gone.has(t.id))
              .map(
                (t: {
                  id: string;
                  body: string;
                  edit?: string;
                  wall?: string;
                  promised?: boolean;
                  fallback?: string;
                  settled?: string;
                }) => {
                  const did = doneIds.has(t.id);
                  if (todoEditId === t.id)
                    return (
                      <div key={t.id} className={`${styles.it} ${styles.itOpen}`}>
                        <span className={`${styles.ic} ${styles.gAct}`}>✸</span>
                        <span className={styles.recEdit}>
                          <input
                            value={todoEditText}
                            onChange={(ev) => setTodoEditText(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") saveTodoEdit(t.id);
                              if (ev.key === "Escape") setTodoEditId(null);
                            }}
                            aria-label="edit this line"
                          />
                          <button
                            type="button"
                            className={styles.sdTag}
                            onClick={() => saveTodoEdit(t.id)}
                          >
                            save
                          </button>
                          <button
                            type="button"
                            className={styles.sdTag}
                            onClick={() => setTodoEditId(null)}
                          >
                            cancel
                          </button>
                        </span>
                      </div>
                    );
                  return (
                    <div
                      key={t.id}
                      className={`${styles.it} ${did ? styles.itDid : styles.itOpen}`}
                    >
                      <span
                        className={`${styles.ic} ${did ? styles.gDone : styles.gAct}`}
                      >
                        {did ? "✓" : "✸"}
                      </span>
                      {!did && (
                        <span
                          className={`${styles.st} ${
                            t.settled
                              ? styles.stLanded
                              : t.wall
                                ? styles.stWall
                                : styles.stOpen
                          }`}
                        >
                          {t.settled
                            ? "LANDED"
                            : t.wall
                              ? t.promised
                                ? `PROMISED ${t.wall}`
                                : `${t.wall} PASSED`
                              : "OPEN"}
                        </span>
                      )}
                      <span className={styles.tx}>
                        {editedTodos.get(t.id) ?? t.body}
                        {/* The if/then, run for you: the wall passed, so the
                      contingency is the move now. */}
                        {!did && t.settled && (
                          <span className={styles.settledWhy}>
                            The record shows this went out — {t.settled}. Close it when
                            you agree.
                          </span>
                        )}
                        {!did && !t.settled && t.fallback && (
                          <span className={styles.fallback}>
                            ↯ It didn&apos;t land. Go to the fallback: {t.fallback}
                          </span>
                        )}
                      </span>
                      {row.canWrite && (
                        <span className={styles.rail}>
                          {did ? (
                            <button
                              disabled={pending}
                              onClick={() => todoOp(t.id, "undo")}
                              title="undo"
                            >
                              ↩
                            </button>
                          ) : (
                            <>
                              <button
                                disabled={pending}
                                onClick={() => todoOp(t.id, "done")}
                                title="done"
                              >
                                ✓
                              </button>
                              <button
                                disabled={pending}
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
                                <input type="hidden" name="returnTo" value="/room" />
                                <button title="Arm a chase. Someone owes this.">⚑</button>
                              </form>
                              <button
                                disabled={pending}
                                onClick={() => {
                                  setTodoEditId(t.id);
                                  // The FULL stored line, never the display cap —
                                  // saving an untouched row must not truncate it.
                                  setTodoEditText(
                                    editedTodos.get(t.id) ?? t.edit ?? t.body,
                                  );
                                }}
                                title="edit this line"
                              >
                                ✎
                              </button>
                              <button
                                disabled={pending}
                                onClick={() => todoOp(t.id, "drop")}
                                title="park"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  );
                },
              )}
            {/* Whatever the cap held back is a door, never a disappearance —
                nine open commitments across three accounts were invisible on
                their own rows before this (decreed 2026-09-03). */}
            {restCount > 0 && (
              <button
                type="button"
                className={styles.restDoor}
                onClick={() => setRestOpen((v) => !v)}
              >
                {restOpen
                  ? `fold the other ${restCount} back ⊖`
                  : `${restCount} more open ⊕`}
              </button>
            )}
            {row.sheetDelayed
              .filter((t) => !gone.has(t.id) && !backNow.has(t.id))
              .map((t) => (
                <div key={t.id} className={`${styles.it} ${styles.itDelayed}`}>
                  <span className={`${styles.ic} ${styles.gDly}`}>⏲</span>
                  <span className={`${styles.st} ${styles.stSched}`}>{t.when}</span>
                  <span className={styles.tx}>{t.body}</span>
                  {row.canWrite && (
                    <span className={styles.rail}>
                      <button
                        disabled={pending}
                        onClick={() => todoOp(t.id, "now")}
                        title="bring it back now"
                      >
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
          </div>
        )}

        {row.canWrite && (
          <div
            className={`${styles.logbox} ${dropHot ? styles.dropHot : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropHot(true);
            }}
            onDragLeave={() => setDropHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropHot(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <span className={styles.lk}>
              THE DROP · FILES TO {row.name.toUpperCase()}, EVERYWHERE
            </span>
            {/* Four doors, each its own thing (founder-decreed 2026-08-18):
                ⚡ the bolt's smart paste; ▢ a quick note; ✸ an action; ⇪ a
                file. The composer rests shut and opens on command. */}
            <div className={styles.modes}>
              <button
                type="button"
                className={`${styles.door} ${styles.doorZap} ${pasteOpen ? styles.doorOn : ""}`}
                title={`The bolt — paste anything. It reads and files to ${row.name}.`}
                onClick={() => {
                  setPasteOpen((v) => !v);
                  setComposerOpen(false);
                  dropHeldPaste();
                }}
              >
                ⚡
              </button>
              <button
                type="button"
                className={`${styles.door} ${styles.doorNote} ${composerOpen && mode === "note" ? styles.doorOn : ""}`}
                title={`Note — a line for the record on ${row.name}.`}
                onClick={() => {
                  const on = composerOpen && mode === "note";
                  setMode("note");
                  setComposerOpen(!on);
                  setPasteOpen(false);
                }}
              >
                ▢
              </button>
              <button
                type="button"
                className={`${styles.door} ${styles.doorAct} ${composerOpen && mode === "action" ? styles.doorOn : ""}`}
                title={`Action — open work on the sheet for ${row.name}.`}
                onClick={() => {
                  const on = composerOpen && mode === "action";
                  setMode("action");
                  setComposerOpen(!on);
                  setPasteOpen(false);
                }}
              >
                ✸
              </button>
              <button
                type="button"
                className={`${styles.door} ${styles.doorFile}`}
                disabled={pending || reading.length > 0}
                onClick={() => fileInputRef.current?.click()}
                title="File — email, PDF, transcript, spreadsheet, document, or image."
              >
                ⇪
              </button>
              {/* No accept filter: the vault takes every file type; the
                  reader picks out the ones it can file to the record. */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {/* One box at a time: the composer steps aside while the ⚡ pane
                is open, and comes back on Cancel. */}
            {!pasteOpen && composerOpen && (
              <>
                <span className={styles.hints}>
                  Enter files to {firstWord(row.name)} · Shift+Enter newline · drop a file
                  anywhere on the Drop
                </span>
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
                  placeholder="Type the second it happens: call notes, Teams pastes, stray thoughts…"
                  aria-label={`Log to ${row.name}`}
                />
                {mode === "note" && readsRich(logText.trim()) && (
                  <span className={styles.sniff}>
                    Reads as {sniffPaste(logText).label}. Enter runs the full read.
                  </span>
                )}
              </>
            )}
            {pasteOpen && (
              <div className={styles.pastepane}>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste the Salesforce capture, an email, or meeting notes. Or drop a .eml, .msg, or .pdf file. It files to ${row.name}.`}
                />
                {pasteText.trim().length > 0 && (
                  <span className={styles.sniff}>
                    Reads as {sniffPaste(pasteText).label}.
                  </span>
                )}
                <div className={styles.pasteRow}>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => {
                      setPasteOpen(false);
                      dropHeldPaste();
                    }}
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
            {/* The held file (slice 18a; the face approved 2026-10-06): the
                same box the Chute paints. Nothing was written; the reason
                opens to both sides' grounds, the answer files with force,
                and the ✕ files nothing and still backs the files up. */}
            {mismatch && (
              <HeldBox
                file={mismatch.files?.[0]?.name ?? "Paste"}
                verdict={mismatch}
                claim={mismatch.claim}
                bound={{ id: row.accountId, name: row.name }}
                candidates={mismatch.candidates}
                busy={pending}
                onPick={pickHeld}
                onDismiss={unfileHeld}
              />
            )}
            {reading.length > 0 && (
              <p className={styles.sniff}>Reading {reading.join(", ")}…</p>
            )}
            {arch && <p className={styles.sniff}>⇪ {arch.text}</p>}
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
                            title="Make it an action. It opens on this register."
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
        ? "DUE · NEVER SENT"
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

export function CadenceDrawer({
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
              Nothing to round up. Every partner is live or muted.
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
                {t.ask ? `owes: ${t.ask}` : "quiet check · nothing owed"}
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
            <p className={styles.dpEmpty}>No check-ins due. The cadence is quiet.</p>
          )}
        </>
      )}
    </div>
  );
}

// The follow-up block inside the add menu: the composer that arms a chase, and
// beside it the count that raises the whole list. A chase is always "now" —
// there is no when to pick, because writing it down is the deciding.
export function FollowUpBlock({ rows }: { rows: FollowUpRow[] }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const show = open || pinned;
  const ref = useDismiss<HTMLDivElement>(pinned, () => setPinned(false));
  return (
    <div
      ref={ref}
      className={styles.miForm}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={styles.miIc}>⏲</span>
      <span className={styles.miFormBody}>
        <span className={styles.fuHead}>
          <b>Follow-up</b>
          <button
            type="button"
            className={`${styles.fuOpen} ${rows.length ? styles.fuOpenLive : ""}`}
            onClick={() => setPinned((v) => !v)}
            title="everything still owed"
          >
            {rows.length} open
          </button>
        </span>
        <form action={addFollowUp} className={styles.miRow}>
          <input name="label" placeholder="Chase what, with whom…" />
          <input type="hidden" name="returnTo" value="/room" />
          <button className={styles.sdTag}>arm</button>
        </form>
        {show && (
          <span className={styles.fuBox}>
            {rows.length === 0 && (
              <span className={styles.fuEmpty}>Nothing owed. The list is clear.</span>
            )}
            {rows.map((f) => (
              <span key={f.subjectKey} className={styles.fuRow}>
                <span className={styles.fuText}>
                  {f.label}
                  {f.filed.length > 0 && (
                    <span className={styles.fuFiled}>filed → {f.filed.join(" · ")}</span>
                  )}
                  {f.newName && (
                    <span className={styles.fuAsk}>
                      <b>{f.newName}</b> isn&apos;t on the board. Add it?
                      <form action={followUpAddBoard} className={styles.inline}>
                        <input type="hidden" name="subjectKey" value={f.subjectKey} />
                        <input type="hidden" name="name" value={f.newName} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.fuYes}>add</button>
                      </form>
                      <form action={followUpWaveOff} className={styles.inline}>
                        <input type="hidden" name="subjectKey" value={f.subjectKey} />
                        <input type="hidden" name="name" value={f.newName} />
                        <input type="hidden" name="returnTo" value="/room" />
                        <button className={styles.fuNo}>no</button>
                      </form>
                    </span>
                  )}
                </span>
                <span className={styles.fuCtl}>
                  <form action={followUpDone} className={styles.inline}>
                    <input type="hidden" name="subjectKey" value={f.subjectKey} />
                    <input type="hidden" name="returnTo" value="/room" />
                    <button title="done">✓</button>
                  </form>
                  <form action={followUpDrop} className={styles.inline}>
                    <input type="hidden" name="subjectKey" value={f.subjectKey} />
                    <input type="hidden" name="returnTo" value="/room" />
                    <button title="drop it">✕</button>
                  </form>
                </span>
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}

export function EyeDrawer({
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
      <span className={styles.zone}>WARMING · SIGNALS ON FILE</span>
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
              <button className={styles.pcBtn}>Park two weeks</button>
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
      <span className={styles.zone}>LATER · REAL, JUST NOT NOW</span>
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
  followUps,
  warming,
  later,
  canWrite,
  dbUnavailable,
  boardNames,
  pipeline,
  pipelineDay,
  pipelineStale,
}: {
  rows: RoomRow[];
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  followUps: FollowUpRow[];
  warming: WarmRow[];
  later: LaterRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  boardNames: { id: string; name: string }[];
  /** The Pipeline Status report — one record per active account, read by the
   *  rail's third seat. */
  pipeline: PipelineRecord[];
  pipelineDay: string;
  pipelineStale: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<"cadence" | "eye" | "pipeline" | null>(null);
  // Which rows are folded. Kept per browser, not per account: this is how the
  // operator wants to READ the board today, not a fact about the deal. The
  // server paints expanded and the stored preference applies once hydrated, so
  // the first paint can never disagree with itself.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [shutPref, setShutPref] = useState<Set<string>>(() => readShut());
  const shut = hydrated ? shutPref : EMPTY_SHUT;
  const allShut = rows.length > 0 && rows.every((r) => shut.has(r.cardId));
  const writeShut = (next: Set<string>) => {
    setShutPref(next);
    try {
      localStorage.setItem(SHUT_KEY, JSON.stringify([...next]));
    } catch {
      /* private mode — the fold still works, it just won't survive a reload */
    }
  };
  const toggleRow = (cardId: string) => {
    const next = new Set(shut);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    writeShut(next);
  };
  const toggleAll = () =>
    writeShut(allShut ? new Set() : new Set(rows.map((r) => r.cardId)));
  // Click away (or press Escape) to leave any of them — the trigger lives
  // inside each wrapper, so its own toggle still works.
  const addRef = useDismiss<HTMLSpanElement>(menuOpen, () => setMenuOpen(false));
  const drawerRef = useDismiss<HTMLDivElement>(drawer !== null, () => setDrawer(null));
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
          <span className={styles.roomName}>HOMEROOM</span>
          {rows.length > 0 && (
            <button
              type="button"
              className={styles.shutAll}
              onClick={toggleAll}
              title={allShut ? "Open every row" : "Fold every row to its account line"}
            >
              {allShut ? "Open all" : "Collapse all"}
            </button>
          )}
        </span>
        <span className={styles.addWrap} ref={addRef}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ＋ add <span className={styles.car}>▾</span>
            {followUps.length > 0 && (
              <span className={styles.addBadge} title="follow-ups still owed">
                {followUps.length}
              </span>
            )}
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
                    Pick from the book. The row appears with its intel attached.
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
                    The Microsoft form mirror, prefilled from the deal&apos;s intel.
                  </span>
                </span>
              </Link>
              {canWrite && <FollowUpBlock rows={followUps} />}
            </div>
          )}
        </span>
        <span className={styles.clock}>
          <ChiClock />
        </span>
      </div>

      {dbUnavailable && (
        <p className={styles.emptyBoard}>
          The database isn&apos;t reachable. The room shows nothing until it is.
        </p>
      )}
      {!dbUnavailable && rows.length === 0 && (
        <p className={styles.emptyBoard}>
          Nothing on the board yet. Open the <Link href="/accounts">Account Room</Link>{" "}
          and add the deals you&apos;re working.
        </p>
      )}
      {rows.map((r, i) => (
        <Fragment key={r.cardId}>
          {!!r.outcome && !rows[i - 1]?.outcome && (
            <div className={styles.closedRule}>
              <span>
                CLOSED · {rows.filter((x) => !!x.outcome).length} · THE RECORD KEEPS
                EVERYTHING
              </span>
            </div>
          )}
          <Row
            row={r}
            collapsed={shut.has(r.cardId)}
            onToggle={() => toggleRow(r.cardId)}
          />
        </Fragment>
      ))}
      {boardNames.length > 0 && null}

      {/* The legend, retired here — once, at the foot (founder-decreed
          2026-08-13). No row carries it. */}
      {rows.length > 0 && (
        <div className={styles.footLegend}>
          <span>✉ send</span>
          <span>⚖ decide</span>
          <span className={styles.kOwed}>⚑ owed</span>
          <span className={styles.kAct}>✸ action</span>
          <span>➤ sent</span>
          <span className={styles.kDone}>✓ done</span>
          <span className={styles.kDly}>⏲ delayed</span>
          <span>✎ note</span>
          <span>⌕ ask the brain</span>
          <span>⟳ mint sharper asks</span>
          <span>→ find the answer</span>
          <span>✕ not this deal</span>
        </div>
      )}

      <div ref={drawerRef}>
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
        {drawer === "pipeline" && (
          <PipelineDrawer
            rows={pipeline}
            dayLabel={pipelineDay}
            staleNote={pipelineStale}
            onClose={() => setDrawer(null)}
          />
        )}

        <button
          type="button"
          className={styles.edge}
          style={{ top: "16%" }}
          onClick={() => setDrawer((d) => (d === "pipeline" ? null : "pipeline"))}
          title="Pipeline Status — every active account"
        >
          <span>PIPELINE</span>
          {pipeline.length > 0 && (
            <span className={styles.edgeCount}>{pipeline.length}</span>
          )}
        </button>
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
    </div>
  );
}

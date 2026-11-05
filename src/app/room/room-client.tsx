"use client";

// The Operating Room, consolidated: Half-Light rows carrying the old board's
// stage nodes and the old day sheet's mechanics per account; the roundups +
// check-ins engine in the right-margin drawer; the eye drawer holding what
// used to be "then, if there's time". Every composer is bound to its row.

import {
  Fragment,
  useEffect,
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
import {
  roomClose,
  roomCompose,
  roomLossDismiss,
  roomLowSignal,
  roomMarkLost,
  roomMoveDone,
  roomMarkWon,
  roomMarkWonByHand,
  roomReopen,
  roomResearch,
  roomRetire,
  roomNoteToAction,
  roomReadPdf,
  roomRecordDelete,
  roomRecordEdit,
} from "./actions";
import type { Window } from "@/lib/ingest/windows";
import type { TodayFiling } from "@/lib/ingest/today-filings";
import { shortName } from "@/lib/ingest/short-name";
import { ALREADY_ON_FILE, monthDay } from "@/lib/ingest/wrote";
import type { VaultReceipt } from "@/lib/ingest/vault";
import { asTypedNote, sniffPaste } from "@/lib/paste-files";
import { PICK_LOST, type LedgerRow } from "./chute-ledger";
import { loadDropHolds, saveDropHolds } from "./ingest/drop-held";
import { HeldBox, type HeldAccount, type HeldChoice } from "./ingest/held";
import { ReceiptLine } from "./ingest/receipt";
import { DROP_CSV_RECEIPT, useIngest, type Filed } from "./ingest/use-ingest";
import { dismissHeld, holdVerdict, useVerdict, type Held } from "./ingest/use-verdict";
import { takeBackTarget, useUndo } from "./ingest/use-undo";
import {
  loadCleared,
  mergeToday,
  saveCleared,
  type TodayEntry,
} from "./ingest/today-receipts";
import { chicagoDay } from "@/lib/tz";
import type { StageView } from "@/lib/room/stages-view";
import { PipelineDrawer } from "./pipeline-tab";
import type { PipelineRecord } from "@/lib/pipeline/build";
import { boardGroup } from "@/lib/room/low-signal";
import styles from "./room.module.css";
import { mapIndex, type DeckPerson, type RowFacts } from "@/lib/room/facts";
import type { Ladders } from "@/lib/room/ladders";
import {
  HandLine,
  LadderBand,
  PeopleDeck,
  RoomMap,
  SendFiles,
  Sentence,
  SentList,
} from "./f-face";
import type { FilesSent } from "@/lib/room/files-sent";
import f from "./f.module.css";
import TheirsLine, { type TheirsGem } from "./theirs-line";
import { EarlierLine, LatestEmailPane, type RowLatestEmail } from "./email-row";
import type { RecordLine } from "@/lib/room/email-row";
import { cleanSubject, headParts, withSubject } from "@/lib/room/subject";
import { redactMoneyStrict } from "@/lib/intel/lexicon";

// The fold, remembered per browser. A no-op subscription is enough for
// useSyncExternalStore's hydration probe: the server renders every row open,
// and the stored preference only applies once the client has taken over.
// The F26 face rests every row as its sentence (ship order 2026-11-04): the
// store keeps the rows the operator opened, and with nothing stored the first
// row of the board stands open so the face shows on arrival.
const OPEN_KEY = "room:open";

function subscribeNoop() {
  return () => {};
}

function readOpen(): Set<string> | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(OPEN_KEY);
    if (stored === null) return null;
    const raw = JSON.parse(stored) as unknown;
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch {
    return null;
  }
}

// The closed ledger hides and shows as a whole, remembered per browser like
// the fold: it is how the operator wants to read the board, not a fact about
// any deal. The server paints it shown.
const CLOSED_HIDDEN_KEY = "room:closed-hidden";

function readClosedHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CLOSED_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export type RoomRow = {
  accountId: string;
  /** The THEIRS line (decreed 2026-08-20): the second record's verified
   *  read — null when the drop holds no live gems for this account. */
  theirs: { label: string; gems: TheirsGem[] } | null;
  /** The board card's id; "" for a row off the board (pass 8 call 1). */
  cardId: string;
  name: string;
  meta: string;
  shape: string;
  /** What the shape and meta chips stand on: each product and country the
   *  read took, with the day and the record line it came from. The chip
   *  opens to it (the click-depth law, pass 13). Empty when the read holds
   *  no fact behind them. */
  identity?: { label: string; day: string; line: string }[];
  /** The F26 sentence's facts (ship order 2026-11-04): products, reseller or
   *  referral, the client, countries, counts and the client's date, each with
   *  the record line it stands on, the operator's own hand on top. */
  facts: RowFacts;
  /** The people in the deal, as the deck holds them. */
  deck: DeckPerson[];
  /** The partner and client stage ladders (release two of the F26 face). */
  ladders: Ladders;
  /** The files Send carried, as the app recorded them (release three). */
  sent: FilesSent[];
  /** Every filing on the account from today, from the record (decreed
   *  2026-10-13): TODAY shows each one's receipt and its ↺ after a reload,
   *  in any tab, from any door (src/lib/ingest/today-filings.ts). */
  todayFilings?: TodayFiling[];
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
  /** Commitments their side released (the closer rule: a promise closes by
   *  delivery or explicit release; pass 8 H6). Closed, so never counted and
   *  never instructed; each shows as one quiet line with its `why` ("Chassie
   *  released it 10/3.") so nothing leaves TODAY without a trace. */
  sheetReleased?: { id: string; body: string; edit?: string; why: string }[];
  /** EARLIER's lines (ship order 2026-10-20): who, when and the subject,
   *  each opening to what the account record history holds for it. */
  record: RecordLine[];
  /** The newest email on the record, either direction, for the left
   *  column; its whole text joins after the page's loop. */
  latestEmail?: RowLatestEmail | null;
  recordTotal: number;
  backgroundTotal: number;
  loss: { noteId: string; phrase: string; date: string; status: "lost" | "won" } | null;
  owed: { noteId: string; key: string; text: string; src: string }[];
  outcome: { status: "won" | "lost"; phrase: string; at: string } | null;
  /** Marked low signal by the operator: not in the Salesforce pipeline. The
   *  row sits in the LOW SIGNAL section above the closed ledger. */
  lowSignal?: boolean;
  gaps: { id: string; question: string; at: string }[];
  /** The asks waiting behind the shown few, in the carousel's order. "· N
   *  queued" opens to them and N is their length (the click-depth law; H5). */
  gapsQueued: { id: string; question: string; at: string }[];
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
// A held question survives a reload and the day line with its text, and
// says since when once carried (pass 10, A12.7; ./ingest/drop-held.ts).
type DropHold = Held<{
  text: string;
  files?: File[];
  windows?: Window[];
  filename?: string;
  heldSince?: string;
}>;

// One line of the TODAY register's fresh receipts: a sentence the row said
// (a close, a retire, an ask minted), or a filing's receipt, which the Drop
// paints with the Chute's own receipt line (slice 18a; the face approved
// 2026-10-06). A Drop receipt is never stored: the register is this row's.
type FreshEntry = TodayEntry;

/** Today, M/D in Chicago: the day a receipt shows. */
const receiptDay = (): string => monthDay(new Date());

/** The receipt a refused filing leaves on the Drop, the one the Chute's
 *  ledger paints for the same result (the pass 9 seam, S-1): a duplicate is
 *  the decree's line beside the earlier filing's day, which opens to what
 *  that filing wrote (pass 8, C2); a filing that failed for any other reason
 *  with a file waiting is the failure's line, and the file backs up beneath
 *  it (pass 8 call 8). A paste refused with no file waiting is null: the
 *  row's note says why, as before. A pasted duplicate is named as the held
 *  box names a paste. */
export function dropRefusal(
  r: Pick<Filed, "ok" | "duplicate" | "reason" | "prior" | "vault" | "grab">,
  account: HeldAccount,
  filename: string,
  day: string,
): Omit<LedgerRow, "key"> | null {
  if (r.duplicate)
    return {
      filename: filename || "Paste",
      state: "dupe",
      // A grab already on file is on file under its own accounts, never
      // this row (seam S-25), so the line names no account beside it.
      ...(r.grab ? {} : { account }),
      reason: r.reason ?? ALREADY_ON_FILE,
      ...(r.prior ? { prior: r.prior } : {}),
      day,
    };
  if (r.vault.failed?.length)
    return {
      filename,
      state: "error",
      account,
      reason: r.reason ?? "The file didn't take.",
      day,
    };
  return null;
}

/** Back up a file whose filing failed (ruled 2026-10-07, pass 8 call 8), as
 *  the Chute does: to the account it was filing to, or under
 *  accounts/_unfiled/ when it named none or that backup was refused, so git
 *  stays the home for every dropped file (D8). Through the shared door's two
 *  vault doors, so no token reaches the browser. */
export async function backUpFailed(
  doors: Pick<ReturnType<typeof useIngest>, "vault" | "vaultUnfiled">,
  f: File,
  account: { id: string } | undefined,
  onPiece?: (sent: number, total: number) => void,
): Promise<VaultReceipt> {
  const r = account ? await doors.vault(account.id, f, onPiece) : null;
  return r?.ok ? r : doors.vaultUnfiled(f, onPiece);
}

/** A row's key for the fold and the list: its card, or its account for a row
 *  off the board, which has no card (pass 8 call 1). */
export const rowKey = (r: Pick<RoomRow, "cardId" | "accountId">): string =>
  r.cardId || `account:${r.accountId}`;

/** Every line the TODAY register holds, by id: the open, the rest behind
 *  the cap, the held, the done today, the released, and the owed lines. */
export function todayLines(
  r: Pick<
    RoomRow,
    | "sheetOpen"
    | "sheetRest"
    | "sheetDelayed"
    | "sheetDoneToday"
    | "sheetReleased"
    | "owed"
  >,
): string[] {
  return [
    ...[
      ...r.sheetOpen,
      ...r.sheetRest,
      ...r.sheetDelayed,
      ...r.sheetDoneToday,
      ...(r.sheetReleased ?? []),
    ].map((t) => t.id),
    ...r.owed.map((o) => `owed:${o.key}`),
  ];
}

/** Whether a line landed between two paints: one the register holds now
 *  that it did not hold before. A line moving between zones, or leaving,
 *  lands nothing. */
export function landedSince(
  before: readonly string[],
  after: readonly string[],
): boolean {
  const had = new Set(before);
  return after.some((id) => !had.has(id));
}

export function Row({
  row,
  collapsed,
  onToggle,
  defaultSpring = null,
  hidden = false,
}: {
  row: RoomRow;
  collapsed: boolean;
  onToggle: () => void;
  /** The closed ledger is hidden. The row stays mounted, so nothing typed in
   *  it is lost; it only stops painting. */
  hidden?: boolean;
  /** The register sprung on first paint, for the suite. */
  defaultSpring?: "unknown" | "peers" | "today" | null;
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
  // TODAY opens on today's filings from the record (decreed 2026-10-13), so
  // a reload, another tab or another door never loses a receipt or its ↺
  // (today-receipts.ts).
  const [freshInfo, setFreshInfo] = useState<FreshEntry[]>(() => {
    let k = 0;
    return mergeToday(
      [],
      row.todayFilings ?? [],
      { id: row.accountId, name: row.name },
      { cleared: new Set(), nextKey: () => --k },
    );
  });
  // The Spring (triptych winner, 2026-08-13): each register rests as one
  // summary line; ⊕ springs it out in place, one register out at a time.
  // The F26 face keeps this state as "Latest email and Chute": open is
  // "today". It opens on arrival when the record holds a filing from today,
  // so today's receipts are in view without a click (decreed 2026-10-13).
  const [spring, setSpring] = useState<"unknown" | "peers" | "today" | null>(
    defaultSpring ?? ((row.todayFilings?.length ?? 0) > 0 ? "today" : null),
  );
  // Each receipt's key, so a backup that lands later finds its filing.
  const receiptSeq = useRef(0);
  // Filing or composing anything springs TODAY open so receipts never land
  // behind a fold (the Spring, 2026-08-13). Every receipt this row adds, a
  // filing's line or a plain one, enters through these two doors.
  const addReceipt = (rc: Omit<LedgerRow, "key">): number => {
    const key = ++receiptSeq.current;
    setFreshInfo((f) => [{ receipt: { ...rc, key } }, ...f]);
    setSpring("today");
    return key;
  };
  const addInfo = (text: string) => {
    setFreshInfo((f) => [{ text }, ...f]);
    setSpring("today");
  };
  const patchReceipt = (key: number, up: Partial<LedgerRow>) =>
    setFreshInfo((f) =>
      f.map((x) => (x.receipt?.key === key ? { receipt: { ...x.receipt, ...up } } : x)),
    );
  // Each fresh read of the page brings today's filings again: a filing from
  // another door joins TODAY, one taken back elsewhere leaves, and a receipt
  // cleared today stays cleared. Deferred, as the held line's loader is, so
  // hydration completes against the server's own list first.
  useEffect(() => {
    const t = setTimeout(() => {
      let cleared = new Set<string>();
      try {
        cleared = loadCleared(localStorage, chicagoDay(new Date()));
      } catch {
        // Storage refused: nothing was remembered as cleared.
      }
      setFreshInfo((f) =>
        mergeToday(
          f,
          row.todayFilings ?? [],
          { id: row.accountId, name: row.name },
          { cleared, nextKey: () => ++receiptSeq.current },
        ),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [row.todayFilings, row.accountId, row.name]);
  // The held verdict the banner shows; a second dispute waits its turn
  // behind it (use-verdict.ts).
  const { mismatch, setMismatch, queue: heldLine, restore } = useVerdict<DropHold>();
  // The line of held questions is kept per account, so a reload or the day
  // line never quietly forgets a pick the room asked for (Yesterday carries;
  // pass 10, A12.7). The keeper runs before the loader, so its first run,
  // before anything came back, writes nothing.
  const heldLoaded = useRef(false);
  useEffect(() => {
    if (!heldLoaded.current) return;
    try {
      saveDropHolds(localStorage, row.accountId, heldLine);
    } catch {
      // Storage refused: the line still holds for this page.
    }
  }, [heldLine, row.accountId]);
  useEffect(() => {
    let back: ReturnType<typeof loadDropHolds> = { holds: [], lost: [] };
    try {
      back = loadDropHolds(localStorage, row.accountId);
    } catch {
      // Storage refused or held nothing readable: nothing comes back.
    }
    heldLoaded.current = true;
    if (!back.holds.length && !back.lost.length) return;
    // Deferred so hydration completes against the server's empty line first,
    // as the Chute's ledger does (use-receipts.ts).
    const t = setTimeout(() => {
      if (back.holds.length) restore(back.holds);
      // A hold whose text could not be kept asks for the re-drop.
      for (const filename of back.lost)
        addReceipt({
          filename,
          state: "interrupted",
          reason: PICK_LOST,
          day: receiptDay(),
        });
    }, 0);
    return () => clearTimeout(t);
    // The account is the row's for its life; the loader runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.accountId]);

  const [promotedNotes, setPromotedNotes] = useState<Set<string>>(new Set());
  const [recOpen, setRecOpen] = useState(false);
  // One EARLIER line open at a time, as the Spring opens one register.
  const [lineOpen, setLineOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  // Every fresh line this row adds enters through here, and it springs
  // TODAY like the receipt doors above (H4).
  const landToday = (cap: FreshCap) => {
    setFreshCaps((f) => [cap, ...f]);
    setSpring("today");
  };
  // A filing through another door, the Chute above all, reaches this row only
  // when the page re-derives, so the row springs TODAY itself when the
  // register holds a line it did not hold at the last paint (H4).
  const lines = todayLines(row);
  const [seenLines, setSeenLines] = useState(lines);
  if (seenLines.join("\n") !== lines.join("\n")) {
    setSeenLines(lines);
    if (landedSince(seenLines, lines)) setSpring("today");
  }

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
  // The files of a drop still waiting their turn, in drop order: the door
  // reads CHUTE_PARALLEL at once and the rest wait and say so (D11), so the
  // label never names a file as reading before its turn comes.
  const [queued, setQueued] = useState<string[]>([]);
  const queuedDrop = (name: string) =>
    setQueued((xs) => {
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
      // A typed note is a paste (D14): notes file under the TYPED NOTE head,
      // and a thread pasted here keeps its own (decided 2026-10-06).
      filePaste(asTypedNote(text), false);
      return;
    }
    start(async () => {
      const r = took(
        await roomCompose(row.accountId, text, { kind: mode, urgency: urg }),
      );
      if (r.ok && r.kind) {
        landToday({
          body: text.replace(/^(?:▢|\[\s?\])\s*/, "").replace(/^⏲\s*\S+\s*/, ""),
          kind: r.kind as FreshCap["kind"],
          todoId: r.todoId,
        });
        setLogText("");
        setNote(null);
      } else if (!r.ok) setNote(r.reason ?? "That didn't save.");
    });
  };

  const promoteNote = (noteId: string, text: string) => {
    if (pending || promotedNotes.has(noteId)) return;
    start(async () => {
      const r = took(await roomNoteToAction(row.accountId, { noteId }));
      if (r.ok) {
        setPromotedNotes((s) => new Set(s).add(noteId));
        // Promoted from the record fold, where TODAY may sit folded: the
        // line lands in the open register (H4).
        landToday({
          body: text.replace(/^[✉✓☰✎⚡▢✔☎]\s?/, ""),
          kind: "action",
          promoted: true,
        });
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  // ✎ edits what the line shows: an entry head's subject goes back into its
  // slot, so the stored head keeps the grammar its readers parse.
  const saveEdit = (noteId: string, head: string) => {
    const text = editText.trim();
    if (!text || pending) return;
    start(async () => {
      const r = took(
        await roomRecordEdit(row.accountId, noteId, withSubject(head, text)),
      );
      if (r.ok) {
        // The echo shows what the page will show once it re-derives: the
        // subject read as the page reads it, money redacted as it renders.
        setEditedNotes((m) =>
          new Map(m).set(
            noteId,
            redactMoneyStrict(headParts(head) ? cleanSubject(text) : text),
          ),
        );
        setEditId(null);
      } else setNote(r.reason ?? "The edit didn't save.");
    });
  };

  // The box ✎ opens, one for every TODAY line the operator can rewrite:
  // Enter keeps, Escape puts it back.
  const deleteNote = (noteId: string) => {
    if (pending) return;
    start(async () => {
      const r = took(await roomRecordDelete(row.accountId, noteId));
      if (r.ok) setDeletedNotes((s) => new Set(s).add(noteId));
      else setNote(r.reason ?? "The delete didn't take.");
    });
  };
  // A failed filing's file backs up beneath its receipt (pass 8 call 8): in
  // flight, landed with its door, or the backup's own failure on the amber
  // line, as the Chute's receipt says it.
  const backUp = async (key: number, f: File, account: HeldAccount) => {
    const progress = (sent: number, total: number) =>
      patchReceipt(key, {
        vault: { text: `Backing up ${f.name}… ${sent} of ${total}`, going: true },
      });
    patchReceipt(key, { vault: { text: `Backing up ${f.name}…`, going: true } });
    const r = await backUpFailed(ingest, f, account, progress);
    patchReceipt(key, {
      vault: r.ok ? { text: r.detail, url: r.url } : { text: r.reason, bad: true },
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
          // Nothing dies silently: a broken filing says so, and its files
          // still back up, to the account it was filing to or under
          // accounts/_unfiled/ (pass 8 call 8), as the Chute's do.
          if (waiting?.length) {
            const account = to ?? { id: row.accountId, name: row.name };
            const key = addReceipt({
              filename: waiting[0].name,
              state: "error",
              account,
              reason: "The filing broke. Drop it again.",
              day: receiptDay(),
            });
            for (const f of waiting) void backUp(key, f, account);
            setSpring("today");
          } else setNote("The paste didn't file.");
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
        // A Sales Nav grab pasted here filed each row on its own account
        // (seam S-25): the receipt names the grab and its accounts, never
        // this row, and its take-back reaches every account's share.
        grab: r.grab,
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
    // A refusal the Chute paints as a receipt lands as one here too (the
    // pass 9 seam, S-1): the duplicate with its door to the earlier filing,
    // the failed filing with its file's backup beneath it. A paste refused
    // with nothing waiting stays the row's note.
    const refused = dropRefusal(r, account, waiting?.[0]?.name ?? "", receiptDay());
    if (!refused) {
      setNote(r.reason ?? "The paste didn't file.");
      return false;
    }
    const key = addReceipt(refused);
    for (const f of vault.failed ?? []) void backUp(key, f, account);
    // The capture is on file already: nothing in the pane is left to file.
    if (r.duplicate) {
      setPasteText("");
      setPasteOpen(false);
    }
    setNote(null);
    setSpring("today");
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
    if (mismatch && !mismatch.files?.length && !mismatch.filename) setMismatch(null);
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
      filename: mismatch.files?.[0]?.name ?? mismatch.filename,
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
    queuedDrop(f.name);
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
    setQueued((xs) => [...xs, ...plan.read.map((f) => f.name)]);
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

  const confirmClose = (status: "lost" | "won") => {
    if (!row.loss || pending) return;
    const l = row.loss;
    start(async () => {
      const call = status === "won" ? roomMarkWon : roomMarkLost;
      const r = took(await call(row.accountId, row.cardId, l.noteId, l.phrase));
      if (r.ok) {
        setLossState("lost");
        addInfo(
          `${status === "won" ? "Closed Won" : "Closed Lost"}. The meter says so now. Retire the row when you're done.`,
        );
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const markLost = () => confirmClose("lost");
  const markWon = () => confirmClose("won");
  // Closed Won by hand (founder's order, 2026-10-26): the row's ☑ asks once
  // in the move's slot, and the confirm stamps the deal won on the operator's
  // call, with no read to answer.
  const [askWon, setAskWon] = useState(false);
  const markWonByHand = () => {
    if (pending) return;
    start(async () => {
      const r = took(await roomMarkWonByHand(row.accountId, row.cardId));
      if (r.ok) {
        setAskWon(false);
        setLossState("lost");
        addInfo("Closed Won. The meter says so now. Retire the row when you're done.");
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  // ↺ on a closed row takes the stamp back: the deal is live again.
  const reopenRow = () => {
    if (pending) return;
    start(async () => {
      const r = took(await roomReopen(row.accountId, row.cardId));
      if (r.ok) {
        setLossState("live");
        addInfo("Reopened. The deal is live on the board.");
      } else setNote(r.reason ?? "That didn't save.");
    });
  };
  const retireRow = () => {
    if (pending) return;
    start(async () => {
      const r = took(await roomRetire(row.accountId, row.cardId));
      if (r.ok) addInfo("Retired from the board.");
      else setNote(r.reason ?? "That didn't save.");
    });
  };
  // The low-signal control's name, for the tooltip and the screen reader
  // alike: the glyph alone says nothing out loud.
  const lowTitle = row.lowSignal
    ? "Return it to the live board."
    : "Send to low signal. Not in your Salesforce pipeline.";
  // Low signal: the row moves to the section above the closed ledger, and
  // the same control brings it back. The board re-sorts on the refresh.
  const toggleLowSignal = () => {
    if (pending) return;
    const on = !row.lowSignal;
    start(async () => {
      const r = took(await roomLowSignal(row.accountId, row.cardId, on));
      if (r.ok) addInfo(on ? "Moved to low signal." : "Back on the live board.");
      else setNote(r.reason ?? "That didn't save.");
    });
  };

  // The move's own door: the built line by default, the whole commitment on
  // a click. Nothing deep ever surfaces uninvited.
  const [moveOpen, setMoveOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState<"send" | "sent" | null>(null);
  const [research, setResearch] = useState<{ note: string; changed: string[] } | null>(
    null,
  );
  const [rsrchPending, startResearch] = useTransition();

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

  const keepSalvaging = () => {
    if (!row.loss || pending) return;
    const l = row.loss;
    start(async () => {
      const r = took(await roomLossDismiss(row.accountId, row.cardId, l.noteId));
      if (r.ok) setLossState("salvaging");
      else setNote(r.reason ?? "That didn't save.");
    });
  };

  const lossLive = !!row.loss && lossState === "live";

  // ↺ on a filing's receipt takes the whole filing back by its id
  // (use-undo.ts), the to-dos it opened included, and the receipt says what
  // went and opens to it.
  const takeBack = (rc: LedgerRow) => {
    const acct = rc.account;
    const target = takeBackTarget(rc);
    if (!acct || !target || pending) return;
    // A grab's take-back reaches every account it filed to (use-undo.ts), so
    // its receipt names no one account (seam S-25).
    const from = rc.grab ? "" : ` from ${shortName(acct.name)}`;
    start(async () => {
      const r = await undo(acct.id, target);
      // The line opens to what was taken back (pass 8, C5): the server reads
      // the filing's lines before they go, and the row holds them while the
      // tab lives, as the Chute's does.
      if (r.ok)
        patchReceipt(rc.key, {
          state: "undone",
          reason: `Taken back${from}. ${r.removed + r.retired} removed.`,
          took: r.took,
        });
      else setNote(r.reason ?? "The take-back didn't go through.");
    });
  };
  // A cleared receipt stays cleared for the day: its filing would otherwise
  // come back from the record on the next read of the page.
  const clearReceipt = (key: number) => {
    const filingId = freshInfo.find((x) => x.receipt?.key === key)?.receipt?.filingId;
    if (filingId) {
      try {
        saveCleared(localStorage, chicagoDay(new Date()), filingId);
      } catch {
        // Storage refused: the receipt is cleared for this page only.
      }
    }
    setFreshInfo((f) => f.filter((x) => x.receipt?.key !== key));
  };
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
          addInfo(`Closed: ${o.item}`);
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

  // The F26 face (ship order 2026-11-04): the row rests as its sentence;
  // opened, the next move with Mark it done and the Chute, the people in the
  // deal, and one door, "Latest email and Chute", to the email, the Drop, the
  // receipts and EARLIER. The springs, the THEIRS line and the stage meter
  // retired with it (docs/mockups/homeroom-f-decks-2026-11-04.html).
  const panelOpen = spring === "today";
  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const researchWord = row.researchAt
    ? new Date(row.researchAt).toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        month: "numeric",
        day: "numeric",
      })
    : "";
  const nameTools =
    row.canWrite && !row.outcome ? (
      <>
        {row.accountId && (
          <button
            type="button"
            disabled={rsrchPending}
            onClick={runResearchPass}
            title={`${
              researchWord
                ? `Last run ${researchWord}.`
                : "Never run. The first pass is the deep one."
            } Runs the deep pass: their site, their postings, the news, the people on this deal.`}
          >
            {rsrchPending ? "Researching…" : `⟳ Research ${researchWord || "never run"}`}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={toggleLowSignal}
          title={lowTitle}
          aria-label={lowTitle}
        >
          {row.lowSignal ? "↺ Back to the live deals" : "⇣ Low signal"}
        </button>
        {row.cardId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAskWon(true)}
            title="Mark Closed Won."
            aria-label="Mark Closed Won."
          >
            ☑ Closed won
          </button>
        )}
      </>
    ) : null;
  const stamp = row.outcome ? (
    <span className={row.outcome.status === "won" ? styles.stampWon : styles.stampLost}>
      {row.outcome.status === "won" ? "CLOSED WON" : "CLOSED LOST"}
    </span>
  ) : null;
  const chuteIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 3h7l7 9" />
      <path d="M12 9v8" />
      <path d="M8.5 13.5 12 17l3.5-3.5" />
      <path d="M3 15l2.5 6h13L21 15" />
    </svg>
  );

  return (
    <div
      className={[
        styles.row,
        row.outcome ? styles.rowClosed : row.lowSignal ? styles.rowLow : "",
        collapsed ? styles.rowShut : "",
        hidden ? styles.rowHidden : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sentence
        accountId={row.accountId}
        name={row.name}
        sfUrl={row.sfUrl}
        facts={row.facts}
        todayIso={todayIso}
        canWrite={row.canWrite}
        collapsed={collapsed}
        onToggle={onToggle}
        tools={nameTools}
        stamp={stamp}
      />
      {/* A folded row stays mounted, so nothing typed in it is lost; it only
          stops painting. The panel below keeps the same promise. */}
      <div className={f.body} hidden={collapsed}>
        <>
          <HandLine accountId={row.accountId} facts={row.facts} canWrite={row.canWrite} />
          <div className={f.open}>
            <LadderBand
              accountId={row.accountId}
              accountName={row.name}
              clientName={row.facts.client.name}
              clientRead={
                row.facts.client.sure && !row.facts.client.hand
                  ? {
                      sure: row.facts.client.sure,
                      seen: row.facts.client.seen ?? 1,
                      day: row.facts.client.day,
                      line: row.facts.client.line ?? "",
                    }
                  : null
              }
              ladders={row.ladders}
              canWrite={row.canWrite}
            />
            <div className={f.mrow}>
              {row.outcome ? (
                <>
                  <span className={f.mk2}>
                    {row.outcome.status === "won" ? "Closed won" : "Closed lost"}
                  </span>
                  <div className={f.mline}>
                    <p className={`${f.mvt} ${f.thin}`}>
                      {row.outcome.phrase
                        ? `“${row.outcome.phrase}”`
                        : "Closed by your call."}{" "}
                      The record keeps everything.
                    </p>
                    {row.canWrite && (
                      <span className={f.mbtns}>
                        <button
                          type="button"
                          className={f.ghost}
                          disabled={pending}
                          onClick={retireRow}
                        >
                          Retire the row
                        </button>
                        {row.cardId && (
                          <button
                            type="button"
                            className={f.ghost}
                            disabled={pending}
                            onClick={reopenRow}
                            title="Reopen the deal. The stamp comes off."
                            aria-label="Reopen the deal. The stamp comes off."
                          >
                            ↺
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </>
              ) : askWon ? (
                <>
                  <span className={f.mk2}>Mark it closed won</span>
                  <div className={f.mline}>
                    <p className={f.mvt}>Your call: stamp it won, or keep working it.</p>
                    <span className={f.mbtns}>
                      <button
                        type="button"
                        className={f.done}
                        disabled={pending}
                        onClick={markWonByHand}
                      >
                        Confirm Closed Won
                      </button>
                      <button
                        type="button"
                        className={f.ghost}
                        disabled={pending}
                        onClick={() => setAskWon(false)}
                      >
                        Not yet
                      </button>
                    </span>
                  </div>
                </>
              ) : lossLive ? (
                <>
                  <span className={f.mk2}>
                    {row.loss!.status === "won"
                      ? "The record reads won"
                      : "The record reads lost"}
                  </span>
                  <div className={f.mline}>
                    <p className={f.mvt}>
                      Filed {row.loss!.date}: “{row.loss!.phrase}”. Your call: stamp it,
                      or keep working it.
                    </p>
                    {row.canWrite && (
                      <span className={f.mbtns}>
                        <button
                          type="button"
                          className={f.done}
                          disabled={pending}
                          onClick={row.loss!.status === "won" ? markWon : markLost}
                        >
                          {row.loss!.status === "won"
                            ? "Confirm Closed Won"
                            : "Confirm Closed Lost"}
                        </button>
                        <button
                          type="button"
                          className={f.ghost}
                          disabled={pending}
                          onClick={keepSalvaging}
                        >
                          {row.loss!.status === "won" ? "Not yet" : "Keep salvaging"}
                        </button>
                      </span>
                    )}
                  </div>
                </>
              ) : lossState === "lost" ? (
                <>
                  <span className={f.mk2}>Closed</span>
                  <p className={`${f.mvt} ${f.thin}`}>The record keeps everything.</p>
                </>
              ) : (
                <>
                  <span className={f.mk2}>Next move</span>
                  <div className={f.mline}>
                    {/* The move is BUILT from the commitment, not printed as
                        it; when the line holds detail back it opens to it,
                        one click deep (founder-decreed 2026-09-03). */}
                    {row.moveFull || row.theirs ? (
                      <p
                        className={`${f.mvt} ${row.thin ? f.thin : ""} ${f.mvtDoor}`}
                        title={[
                          row.moveFull,
                          row.theirs ? `Your Salesforce export: ${row.theirs.label}` : "",
                        ]
                          .filter(Boolean)
                          .join("\n")}
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
                        {moveOpen && row.moveFull
                          ? row.moveFull.split("\n").map((line, k) => (
                              <Fragment key={k}>
                                {k > 0 && <br />}
                                {line}
                              </Fragment>
                            ))
                          : row.move}
                      </p>
                    ) : (
                      <p className={`${f.mvt} ${row.thin ? f.thin : ""}`}>{row.move}</p>
                    )}
                    {/* The second record's verified facts about the account's
                        people (C16) ride the move's own door: opened, the
                        gems unfold under it, each down to its email (the
                        meat law). They no longer take a line of their own. */}
                    {moveOpen && row.theirs && (
                      <div className={f.theirsUnder}>
                        <TheirsLine
                          accountId={row.accountId}
                          label={row.theirs.label}
                          gems={row.theirs.gems}
                        />
                      </div>
                    )}
                    <span className={f.mbtns}>
                      {worked ? (
                        <button
                          type="button"
                          className={f.workedTag}
                          disabled={closePending}
                          onClick={undoWorked}
                          title="Worked today. Click to take the mark back."
                        >
                          ✓ Worked
                        </button>
                      ) : (
                        row.canWrite &&
                        !(closed && !row.outstanding) && (
                          <button
                            type="button"
                            className={f.done}
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
                        )
                      )}
                      {row.canWrite && (
                        <>
                          <span className={f.vr} aria-hidden="true" />
                          <button
                            type="button"
                            className={`${f.eqb} ${f.chuteb}`}
                            title={`Paste or drop anything. It files to ${row.name}.`}
                            onClick={() => {
                              setPasteOpen(true);
                              setMismatch(null);
                              setSpring("today");
                            }}
                          >
                            {chuteIcon}Chute
                          </button>
                          <button
                            type="button"
                            className={f.eqb}
                            aria-expanded={filesOpen === "send"}
                            title={`Send ${row.name} demos, one-pagers or an agreement's review copy`}
                            onClick={() =>
                              setFilesOpen((v) => (v === "send" ? null : "send"))
                            }
                          >
                            Send files
                          </button>
                        </>
                      )}
                      {row.sent.length > 0 && (
                        <button
                          type="button"
                          className={f.eqb}
                          aria-expanded={filesOpen === "sent"}
                          title="Every file sent from the app, with its day"
                          onClick={() =>
                            setFilesOpen((v) => (v === "sent" ? null : "sent"))
                          }
                        >
                          {`${row.sent.length} Sent ${filesOpen === "sent" ? "▾" : "▸"}`}
                        </button>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
            {filesOpen === "send" && row.canWrite && (
              <SendFiles
                accountId={row.accountId}
                deck={row.deck}
                onClose={() => setFilesOpen(null)}
              />
            )}
            {filesOpen === "sent" && (
              <SentList
                accountId={row.accountId}
                sent={row.sent}
                canWrite={row.canWrite}
              />
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
            <PeopleDeck
              deck={row.deck}
              tone={row.multiTone}
              accountName={row.name}
              accountId={row.accountId}
              canWrite={row.canWrite}
            />
            <button
              type="button"
              className={f.doorBtn}
              aria-expanded={panelOpen}
              onClick={() => setSpring(panelOpen ? null : "today")}
            >
              {panelOpen ? "Minimize ▴" : "Latest email and Chute ▾"}
            </button>
            {
              <div className={f.panel} hidden={!panelOpen}>
                <div style={{ minWidth: 0 }}>
                  {/* The newest email, whole (ship order 2026-10-20). A line
                      ✕-parked below leaves it at once, and a subject edited
                      there reads here, before the page re-derives. */}
                  {row.latestEmail && !deletedNotes.has(row.latestEmail.id) ? (
                    <LatestEmailPane
                      key={row.latestEmail.id}
                      email={{
                        ...row.latestEmail,
                        subject:
                          editedNotes.get(row.latestEmail.id) ?? row.latestEmail.subject,
                      }}
                    />
                  ) : (
                    <p className={f.nil}>No email on the record yet.</p>
                  )}
                </div>
                <div className={f.panelR}>
                  <div className={f.chuteHead}>
                    <span className={f.chuteMark}>{chuteIcon}</span>
                    <span className={f.chT}>The Chute</span>
                    <span className={f.chS}>
                      Files to <b className={f.acctC}>{row.name}</b>, everywhere
                    </span>
                  </div>
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
                      {/* Four doors, each its own thing (founder-decreed 2026-08-18):
                          ⚡ the bolt's smart paste; ▢ a quick note; ✸ an action; ⇪ a
                          file. The composer rests shut and opens on command. */}
                      <div className={styles.modes}>
                        <button
                          type="button"
                          className={`${styles.door} ${styles.doorZap} ${pasteOpen ? styles.doorOn : ""}`}
                          title={`The bolt. Paste anything. It reads and files to ${row.name}.`}
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
                          title={`Note. A line for the record on ${row.name}.`}
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
                          title={`Action. Open work on the sheet for ${row.name}.`}
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
                          title="File. Email, PDF, transcript, spreadsheet, document, or image."
                        >
                          ⇪
                        </button>
                        {/* No accept filter: the vault takes every file type, the
                            reader picks out the ones it can file to the record, and a
                            misplaced .csv gets its refusal instead of vanishing from
                            the picker (decided 2026-10-06). */}
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
                            Enter files to {firstWord(row.name)} · Shift+Enter newline ·
                            drop a file anywhere on the Drop
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
                          {/* Said before Enter (decided 2026-10-06): notes typed here
                              file as a typed note; anything else names its own read. */}
                          {mode === "note" && readsRich(logText.trim()) && (
                            <span className={styles.sniff}>
                              Reads as{" "}
                              {sniffPaste(logText).kind === "note"
                                ? "a typed note"
                                : sniffPaste(logText).label}
                              . Enter runs the full read.
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
                          file={mismatch.files?.[0]?.name ?? mismatch.filename ?? "Paste"}
                          since={mismatch.heldSince}
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
                      {queued.length > 0 && (
                        <p className={styles.sniff}>Waiting: {queued.join(", ")}.</p>
                      )}
                      {arch && <p className={styles.sniff}>⇪ {arch.text}</p>}
                      {note && <p className={styles.err}>{note}</p>}
                    </div>
                  )}

                  <div className={f.receipts}>
                    {/* What this row's composer filed: the line it wrote, so a
                note or an action never files out of sight. */}
                    {freshCaps.map((c, i) => (
                      <div key={`cap${i}`} className={`${styles.it} ${styles.fresh}`}>
                        <span
                          className={`${styles.ic} ${c.kind === "action" ? styles.gAct : styles.gDone}`}
                        >
                          {c.kind === "action" ? "✸" : "✓"}
                        </span>
                        <span className={styles.tx}>{c.body}</span>
                      </div>
                    ))}
                    {(freshAll ? freshInfo : freshInfo.slice(0, 2)).map((f, i) => {
                      const rc = f.receipt;
                      return rc ? (
                        <div
                          key={`fr${rc.key}`}
                          className={`${styles.rcptItem} ${styles.fresh}`}
                        >
                          <ReceiptLine
                            row={rc}
                            canWrite={row.canWrite}
                            onTakeBack={
                              takeBackTarget(rc) ? () => takeBack(rc) : undefined
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
                  </div>
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
                          // An email line shows (and edits) its subject; any other line
                          // its first line with the glyph gone, as before.
                          const shown = editedNotes.get(e.id) ?? e.line;
                          if (editId === e.id)
                            return (
                              <div key={e.id} className={styles.it}>
                                <span className={`${styles.ic} ${styles.gNote}`}>
                                  {e.glyph}
                                </span>
                                <span className={styles.recEdit}>
                                  <input
                                    value={editText}
                                    onChange={(ev) => setEditText(ev.target.value)}
                                    onKeyDown={(ev) => {
                                      if (ev.key === "Enter") saveEdit(e.id, e.text);
                                      if (ev.key === "Escape") setEditId(null);
                                    }}
                                    aria-label="edit this entry"
                                  />
                                  <button
                                    type="button"
                                    className={styles.sdTag}
                                    onClick={() => saveEdit(e.id, e.text)}
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
                            <EarlierLine
                              key={e.id}
                              line={e}
                              shown={shown}
                              open={lineOpen === e.id}
                              onToggle={() =>
                                setLineOpen((o) => (o === e.id ? null : e.id))
                              }
                              done={e.struck || promoted}
                              note={
                                promoted && (
                                  <span className={styles.promoted}>
                                    {" "}
                                    · now open above
                                  </span>
                                )
                              }
                              rail={
                                row.canWrite && (
                                  <span className={styles.rail}>
                                    {!e.struck && !promoted && e.glyph !== "✓" && (
                                      <button
                                        onClick={() => promoteNote(e.id, shown)}
                                        title="Make it an action. It opens on this register."
                                      >
                                        ✸
                                      </button>
                                    )}
                                    {/* A sign-off line shows the sign-off, which ✎
                                        cannot edit, so it carries no ✎. ✎ starts from
                                        what is stored, never the display's copy. */}
                                    {!e.email?.closer && (
                                      <button
                                        onClick={() => {
                                          setEditId(e.id);
                                          setEditText(e.edit);
                                        }}
                                        title="edit this entry"
                                      >
                                        ✎
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteNote(e.id)}
                                      title="delete from the record"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                )
                              }
                            />
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
            }
          </div>
        </>
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
          {/* "Cadence" is a retired name (standing decree); the button
              says what it mutes. */}
          <button
            className={styles.muteBtn}
            title={
              c.muted ? "unmute this partner's roundups" : "mute this partner's roundups"
            }
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
  defaultTab = "roundups",
}: {
  cadence: CadenceRow[];
  checkins: CheckinRow[];
  onClose: () => void;
  /** The tab open on first paint, for the suite. */
  defaultTab?: "roundups" | "checkins";
}) {
  const [tab, setTab] = useState<"roundups" | "checkins">(defaultTab);
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
          {checkins.length === 0 && <p className={styles.dpEmpty}>No check-ins due.</p>}
        </>
      )}
    </div>
  );
}

// The follow-up block inside the add menu: the composer that arms a chase, and
// beside it the count that raises the whole list. A chase is always "now" —
// there is no when to pick, because writing it down is the deciding.
export function FollowUpBlock({
  rows,
  defaultPinned = false,
}: {
  rows: FollowUpRow[];
  /** The list pinned open on mount: the add menu opened from its count. */
  defaultPinned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(defaultPinned);
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
            stroke="currentColor"
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
        You watch these here until you seed, schedule, or dismiss them.
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
  // The menu opened from the follow-up count, with the list already open.
  const [fuOpen, setFuOpen] = useState(false);
  const [drawer, setDrawer] = useState<"cadence" | "eye" | "pipeline" | null>(null);
  // Which rows are open. Kept per browser, not per account: this is how the
  // operator wants to READ the board today, not a fact about the deal. The
  // server paints the first row open and the rest as sentences, and the
  // stored preference applies once hydrated, so the first paint can never
  // disagree with itself.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [openPref, setOpenPref] = useState<Set<string> | null>(() => readOpen());
  const allKeys = rows.map(rowKey);
  const openKeys =
    hydrated && openPref ? openPref : new Set(allKeys.length ? [allKeys[0]!] : []);
  const shut = new Set(allKeys.filter((k) => !openKeys.has(k)));
  const [closedHiddenPref, setClosedHiddenPref] = useState<boolean>(() =>
    readClosedHidden(),
  );
  const closedHidden = hydrated && closedHiddenPref;
  // Collapse all reads only the rows on screen: a hidden closed row keeps its
  // own fold and never decides what the button says.
  const shownKeys = rows
    .filter((r) => !(closedHidden && boardGroup(r) === "closed"))
    .map(rowKey);
  const allShut = shownKeys.length > 0 && shownKeys.every((k) => shut.has(k));
  const writeShut = (next: Set<string>) => {
    const open = new Set(allKeys.filter((k) => !next.has(k)));
    setOpenPref(open);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...open]));
    } catch {
      /* private mode — the fold still works, it just won't survive a reload */
    }
  };
  const toggleRow = (key: string) => {
    const next = new Set(shut);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writeShut(next);
  };
  const toggleAll = () => {
    const next = new Set(shut);
    for (const k of shownKeys) {
      if (allShut) next.delete(k);
      else next.add(k);
    }
    writeShut(next);
  };
  const toggleClosed = () => {
    const next = !closedHidden;
    setClosedHiddenPref(next);
    try {
      if (next) localStorage.setItem(CLOSED_HIDDEN_KEY, "1");
      else localStorage.removeItem(CLOSED_HIDDEN_KEY);
    } catch {
      /* private mode — the toggle still works, it just won't survive a reload */
    }
  };
  // The map (ship order 2026-11-04, F26): every country the live deals name,
  // its light by the nearest client date there, and a click that shows only
  // the deals naming it. Every country's dot pulses in its own tone
  // (founder, 2026-11-05).
  const [fCountry, setFCountry] = useState<string | null>(null);
  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const countries = mapIndex(
    rows.map((r) => ({
      key: rowKey(r),
      name: r.name,
      facts: r.facts,
      live: boardGroup(r) === "live",
    })),
    todayIso,
  );
  const outOfView = (r: RoomRow) =>
    !!fCountry && !r.facts.countries.some((c) => c.code === fCountry);
  const lowCount = rows.filter((r) => boardGroup(r) === "low").length;
  const closedCount = rows.filter((r) => boardGroup(r) === "closed").length;
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
            onClick={() => {
              setFuOpen(false);
              setMenuOpen((v) => !v);
            }}
          >
            ＋ add <span className={styles.car}>▾</span>
          </button>
          {/* The count is a door (the click-depth law): one click opens the
              menu with the list of what is still owed already open, no hover
              needed, so it works on touch too. */}
          {canWrite && followUps.length > 0 && (
            <button
              type="button"
              className={styles.addBadge}
              title="Show the follow-ups still owed"
              onClick={() => {
                setFuOpen(true);
                setMenuOpen(true);
              }}
            >
              {followUps.length}
            </button>
          )}
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
              {canWrite && <FollowUpBlock rows={followUps} defaultPinned={fuOpen} />}
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
      <RoomMap countries={countries} selected={fCountry} onPick={setFCountry} />
      {rows.map((r, i) => {
        // The board runs live, then low signal, then the closed ledger; one
        // mono rule opens each section after the live book.
        const group = boardGroup(r);
        const opens = group !== "live" && (i === 0 || boardGroup(rows[i - 1]) !== group);
        return (
          <Fragment key={rowKey(r)}>
            {opens && group === "low" && (
              <div className={styles.lowRule}>
                <span>LOW SIGNAL · {lowCount} · NOT IN YOUR SALESFORCE PIPELINE</span>
              </div>
            )}
            {opens && group === "closed" && (
              <div className={styles.closedRule}>
                <span>CLOSED · {closedCount} · THE RECORD KEEPS EVERYTHING</span>
                <button
                  type="button"
                  className={styles.ruleToggle}
                  aria-expanded={!closedHidden}
                  title={closedHidden ? "Show the closed deals" : "Hide the closed deals"}
                  onClick={toggleClosed}
                >
                  {closedHidden ? "SHOW" : "HIDE"}
                </button>
              </div>
            )}
            <Row
              row={r}
              collapsed={shut.has(rowKey(r))}
              onToggle={() => toggleRow(rowKey(r))}
              hidden={(group === "closed" && closedHidden) || outOfView(r)}
            />
          </Fragment>
        );
      })}
      {boardNames.length > 0 && null}

      {/* The legend, retired here — once, at the foot (founder-decreed
          2026-08-13). No row carries it. */}
      {rows.length > 0 && (
        <div className={styles.footLegend}>
          <span>✉ email</span>
          <span>➤ sent</span>
          <span>☎ call</span>
          <span>◷ meeting</span>
          <span className={styles.kDone}>✓ done</span>
          <span>✎ note</span>
          <span className={styles.kAct}>✸ action</span>
          <span>⟳ research</span>
          <span>⇣ low signal</span>
          <span>☑ closed won</span>
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
          title="Pipeline Status for every active account"
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
          {dueCount > 0 && (
            <span className={`${styles.edgeCount} ${styles.edgeDue}`}>{dueCount}</span>
          )}
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

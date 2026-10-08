// The Accounts sheet's rules, pure. What the page and the Act Lane decide is
// written here once, without a database or a browser, so the page and the
// lane run it and the suite calls it (the codebase's plan-then-execute idiom:
// the server action or the component carries out what a rule returns).

import { csmThreadFlagOf, quietFlagOf, type Collision } from "@/lib/activity/quiet-flag";
import type { Rollup } from "@/lib/activity/rollup";
import type { LaneAct } from "./act-lane";
import type { Gem } from "@/lib/activity/stores";
import { ACT_DRAFT_NS } from "@/lib/act/lane";
import { readOutcome } from "@/lib/dashboard/outcome";
import type { AccountRead } from "@/lib/record/read";
import { hideNoteKey } from "@/lib/record/hide";
import type { LastHumanTouch } from "@/lib/record/accounts";
import type { NewTodo } from "@/lib/notes/write";
import { userDayKey } from "@/lib/tz";

// ── the board lift: a live deal (pass 8 A4; the Act Lane, A8.15) ─────────────
// The board's word on one account, folded over every card matched to it. A
// stamped outcome outranks any "in motion" read; a card that is neither
// archived nor stamped is a live deal.

export type BoardWord = { outcome: "won" | "lost" | null; live: boolean };

export function boardWords(
  cards: readonly { name: string; archived: boolean; notes: unknown }[],
  idOf: (name: string) => string,
): Map<string, BoardWord> {
  const out = new Map<string, BoardWord>();
  for (const card of cards) {
    const id = idOf(card.name);
    if (!id) continue;
    const b = out.get(id) ?? { outcome: null, live: false };
    const o = readOutcome(card.notes);
    if (o) b.outcome = o.status;
    else if (!card.archived) b.live = true;
    out.set(id, b);
  }
  return out;
}

/** The fork's HomeRoom half. A closed or archived card is not a live deal:
 *  Closed Won, Closed Lost and an archived card all send the follow-up to
 *  Groundwork's wing, and the lane never says "the deal is live" for them. */
export function liveOnBoard(b: BoardWord | undefined): boolean {
  return !!b && b.live && !b.outcome;
}

/** The todo the fork's HomeRoom half files: a live deal's move as an action
 *  the TODAY register reads, due now. The register lists only action todos
 *  (buildAccountSheet), so the fork carries the action tag a composed action
 *  carries; the bare text it once filed answered "✓ FILED · THE HOMEROOM'S
 *  TODAY REGISTER" and never appeared there (A8.15). */
export function forkTodo(a: { accountId: string; act: string; now: Date }): NewTodo {
  return {
    body: a.act,
    tags: { kind: "action" },
    accountId: a.accountId,
    remindAt: a.now,
  };
}

// ── hidden is hidden (pass 8 X1) ─────────────────────────────────────────────
// A ✕-parked entry (a hide:note: disposition, which the account read turns
// into its `hidden` set) leaves the registers the drilldown shows. The note
// survives in the table; it is just never shown or read.

type NoteForRegister = {
  id: string;
  lane: string;
  partner: string;
  kind: "mine" | "partner" | "account";
  body: string;
  actors: string;
  createdAt: string;
};

export function registersOf(
  notes: readonly NoteForRegister[],
  hidden: ReadonlySet<string>,
) {
  const chip = (n: NoteForRegister) => ({
    id: n.id,
    partner: n.partner,
    kind: n.kind,
    body: n.body,
    actors: n.actors,
    createdAt: n.createdAt,
  });
  const visible = notes.filter((n) => !hidden.has(n.id));
  return {
    // The working record ("mine") renders by default; the background
    // register (case and support traffic) sits behind a click.
    mine: visible.filter((n) => n.lane === "mine").map(chip),
    background: visible.filter((n) => n.lane === "background").map(chip),
  };
}

/** The rows the operator has not ✕-parked, read against the disposition
 *  markers the way the account read reads them (`hide:note:<id>`). The
 *  contacts panel and the draft desk read the record through it. */
export function unparked<T extends { id: string }>(
  rows: readonly T[],
  dispositions: { has(key: string): boolean },
): T[] {
  return rows.filter((r) => !dispositions.has(hideNoteKey(r.id)));
}

// ── LAST HUMAN TOUCH opens to its evidence (pass 8 A5, the click-depth law) ──
// The cell compresses a touch to a name and a day; one click opens the thing
// it read. The first record's touch opens to the entry itself (the send, or
// the touch log's message), found by the read's own moment for it. The
// export's touch opens to its row as the rollup holds it: the day, the
// person, how they moved, and the subject.

export type TouchCite =
  | { from: "record"; day: string; who: string; how: string; text: string }
  | {
      from: "salesforce";
      day: string;
      who: string;
      how: string;
      subject: string;
      /** The staged row's key, when the rollup carried it: the fold fetches
       *  the excerpt by it (S-17). "" on a rollup written before it rode. */
      k: string;
    };

export function touchCiteOf(
  read: Pick<AccountRead, "lastTouch" | "docs">,
  touch: LastHumanTouch | null,
  lastHuman: Rollup["lastHuman"],
): TouchCite | null {
  if (!touch) return null;
  if (touch.record === "salesforce")
    return {
      from: "salesforce",
      day: touch.day,
      who: touch.who,
      how: (lastHuman?.how ?? "").toUpperCase(),
      subject: lastHuman?.subject ?? "",
      k: lastHuman?.k ?? "",
    };
  const lt = read.lastTouch;
  const fromLog = lt?.source === "log";
  const doc = lt
    ? read.docs.find(
        (d) =>
          !d.hidden &&
          d.direction === "out" &&
          d.at === lt.at &&
          (fromLog ? !d.noteId : !!d.noteId),
      )
    : undefined;
  return {
    from: "record",
    day: touch.day,
    who: touch.who,
    how: fromLog ? "LOGGED TOUCH" : "SENT",
    text: doc?.text ?? "",
  };
}

// ── the quiet flag (the direct doctrine; pass 8 A7, A8) ──────────────────────
// When a send crosses live motion, the composed thing carries a quiet flag so
// the operator knows. It informs and never blocks. The words have one writer,
// src/lib/activity/quiet-flag.ts, which Groundwork's file card reads too, off
// the same collision guard (collisionFor), so the two surfaces say one thing
// (pass 9 seam, S-6). The Act Lane's send is the composed thing's flag.

export type { Collision };
export { csmThreadFlagOf, quietFlagOf as sendFlagOf };

// ── Send consumes it (pass 8 A2, A3; the Act Lane, A8.12) ────────────────────
// A touched draft saves when the lane closes or the operator hops chips,
// because the pad never eats your words. A sent draft is gone: once Send has
// filed, the close saves nothing.

export type LaneDraftState = {
  to: string;
  subject: string;
  body: string;
  dirty: boolean;
  sent: boolean;
};

export function draftOnClose(
  s: LaneDraftState,
): { to: string; subject: string; body: string } | null {
  if (!s.dirty || s.sent) return null;
  return { to: s.to, subject: s.subject, body: s.body };
}

/** What Send does once the ✉ outbound is on the record: it consumes the
 *  account's draft, and it stamps the gem acted the way the hover ✓ does,
 *  on the gems store's own actedDay with today's Chicago day. The stamp keeps
 *  its ↺: the take-back clears the same field. */
export function sendConsequences(a: { accountId: string; term: string; now: Date }): {
  consumeDraft: string;
  stamp: { term: string; day: string } | null;
} {
  return {
    consumeDraft: `${ACT_DRAFT_NS}${a.accountId}`,
    stamp: a.term ? { term: a.term, day: userDayKey(a.now) } : null,
  };
}

/** The gems with one gem's actedDay set ("" takes the stamp back); null when
 *  no gem carries the term. The hover ✓, its ↺ and Send all stamp here. */
export function stampActed(
  gems: readonly Gem[],
  term: string,
  day: string,
): Gem[] | null {
  const at = gems.findIndex((g) => g.term === term);
  if (at < 0) return null;
  return gems.map((g, i) => (i === at ? { ...g, actedDay: day } : g));
}

// ── the ✓ stamp (the Act Lane, A8.5; C16) ────────────────────────────────────
// The ACT cell's stamp: the newest acted gem about an account person, with
// its term, because the ↺ takes back that gem's own actedDay. A colleague's
// gem never raises an act on the row (C16, amended 2026-10-05), so a stamp
// the acted sweep put on one has no seat on the row either. Nothing stamped
// reads "" for both.

export function actedStampOf(
  gems: readonly Pick<Gem, "term" | "actedDay" | "whoKind">[],
): { day: string; term: string } {
  let best: { day: string; term: string } | null = null;
  for (const g of gems) {
    if (!g.actedDay || g.whoKind === "colleague") continue;
    if (!best || g.actedDay > best.day) best = { day: g.actedDay, term: g.term };
  }
  return best ?? { day: "", term: "" };
}

/** Every acted gem about an account person, newest acted first: what THE
 *  SIGNAL's fold lists with its ↺ (A8.5, ship order 2026-10-08). The ACT
 *  cell shows only the leading gem's chip or the newest stamp, so an earlier
 *  ✓ would have no reachable take-back while another gem leads; the fold
 *  keeps every one of them one click down. A colleague's gem has no seat on
 *  the row (C16). */
export function actedGemsOf(
  gems: readonly Pick<Gem, "term" | "act" | "actedDay" | "whoKind">[],
): { term: string; act: string; actedDay: string }[] {
  return gems
    .filter((g) => !!g.actedDay && g.whoKind !== "colleague")
    .map((g) => ({ term: g.term, act: g.act, actedDay: g.actedDay }))
    .sort((a, b) => (a.actedDay < b.actedDay ? 1 : a.actedDay > b.actedDay ? -1 : 0));
}

// ── the lane's seed (the Act Lane, A8.8) ─────────────────────────────────────
// Clicking the chip opens the lane on the row's leading gem. The draft is
// seeded from the relationship contact (TO) and the act (SUBJECT); a saved,
// unsent draft outranks the seed in every field, because the pad never eats
// your words. No chip, no lane.

export type LaneSource = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  onBoard: boolean;
  collision: Collision | null;
  actDraft: { to: string; subject: string; body: string } | null;
  second: {
    act: string | null;
    gems: {
      term: string;
      reason: string;
      whenDay: string;
      cites: { k: string; day: string; who: string; subject: string }[];
    }[];
  } | null;
};

export function laneActOf(row: LaneSource | undefined): LaneAct | null {
  const gem = row?.second?.gems[0];
  if (!row || !row.second?.act || !gem) return null;
  return {
    accountId: row.id,
    accountName: row.name,
    term: gem.term,
    act: row.second.act,
    reason: gem.reason,
    whenDay: gem.whenDay,
    cites: gem.cites,
    to: row.actDraft?.to ?? row.contactName,
    toEmail: row.contactEmail,
    subject: row.actDraft?.subject ?? row.second.act,
    body: row.actDraft?.body ?? "",
    onBoard: row.onBoard,
    flag: quietFlagOf(row.collision),
  };
}

// ── the Filter Door (the Act Lane, A8.21) ────────────────────────────────────
// One mono door at the sheet's shoulder. While any filter is live the door
// stays lit and names every live one, so filtered state is never invisible
// behind a closed strip.

export function filterDoor(f: {
  csm: string;
  industry: string;
  tier: string;
  play: string;
  stage: string;
}): { live: boolean; label: string } {
  const on = [
    f.csm && "PARTNERS",
    f.industry && "MODELS",
    f.tier && "FIT",
    f.play && "PLAYS",
    f.stage && "STAGES",
  ].filter((x): x is string => Boolean(x));
  return { live: on.length > 0, label: `FILTERS${on.map((x) => ` · ${x}`).join("")} ▾` };
}

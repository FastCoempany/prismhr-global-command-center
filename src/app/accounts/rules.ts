// The Accounts sheet's rules, pure. What the page and the Act Lane decide is
// written here once, without a database or a browser, so the page and the
// lane run it and the suite calls it (the codebase's plan-then-execute idiom:
// the server action or the component carries out what a rule returns).

import type { collisionFor } from "@/lib/activity/read";
import type { Rollup } from "@/lib/activity/rollup";
import type { Gem } from "@/lib/activity/stores";
import { ACT_DRAFT_NS } from "@/lib/act/lane";
import { readOutcome } from "@/lib/dashboard/outcome";
import type { AccountRead } from "@/lib/record/read";
import type { LastHumanTouch } from "@/lib/record/accounts";
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
  return rows.filter((r) => !dispositions.has(`hide:note:${r.id}`));
}

// ── LAST HUMAN TOUCH opens to its evidence (pass 8 A5, the click-depth law) ──
// The cell compresses a touch to a name and a day; one click opens the thing
// it read. The first record's touch opens to the entry itself (the send, or
// the touch log's message), found by the read's own moment for it. The
// export's touch opens to its row as the rollup holds it: the day, the
// person, how they moved, and the subject.

export type TouchCite =
  | { from: "record"; day: string; who: string; how: string; text: string }
  | { from: "salesforce"; day: string; who: string; how: string; subject: string };

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
// the operator knows. It informs and never blocks. The words are Groundwork's
// file card's (src/lib/groundwork/file.ts, collisionLine), read off the same
// collision guard (collisionFor), so the two surfaces say one thing.

export type Collision = NonNullable<ReturnType<typeof collisionFor>>;

const mmdd = (day: string) => (day ?? "").slice(5, 10).replace("-", "/");

const threadFlag = (who: string | undefined, day: string | undefined) =>
  `${(who || "A COLLEAGUE").toUpperCase()}'S THREAD · ${mmdd(day ?? "")}`;

/** The Act Lane's send: a live marketing cadence or a colleague's thread
 *  inside seven days. "" when clear. */
export function sendFlagOf(col: Collision | null | undefined): string {
  if (!col) return "";
  if (col.mktgSends7 > 0)
    return `MKTG CADENCE LIVE · ${col.mktgSends7} SEND${col.mktgSends7 === 1 ? "" : "S"} THIS WEEK`;
  return threadFlag(col.colleague?.who, col.colleague?.day);
}

/** The CSM play, the alternative to the direct play (C19): it carries the
 *  flag when the CSM's own thread is live. "" when no colleague thread is. */
export function csmThreadFlagOf(col: Collision | null | undefined): string {
  return col?.colleague ? threadFlag(col.colleague.who, col.colleague.day) : "";
}

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

// What the Accounts sheet reads from the single read and the second record
// (the Chute brains refactor plan, §2.2; slice 15). Two row facts live here,
// pure, so the page and the tests share one answer and nothing is derived a
// second time in a private spelling (the Ted doctrine): the LAST HUMAN TOUCH
// merge (C1) and the row's gems with the ACT chip (C6, C16).

import { theirsLine, type SecondRecord, type TheirsLine } from "@/lib/activity/read";
import { chicagoDay } from "@/lib/tz";
import type { AccountRead } from "./read";

// ── LAST HUMAN TOUCH reads both records (ruled 2026-09-25, C1) ──────────────
// The column shows the later of the first record's last human touch — the
// read's `lastTouch`, the record's own outbound and the touch log merged by
// latest (C3) — and the export's `lastHuman`, and whispers which record it
// came from. Two stores of one fact merge by latest, and no face reads the
// export alone for a fact the first record also holds.

export type LastHumanTouch = {
  /** The export's correspondent, or the person the operator wrote to. */
  who: string;
  /** The Chicago day, the way the sheet prints days. */
  day: string;
  /** The export's reading of whose motion it was — "account", "colleague",
   *  "unresolved" — or "ours" when the first record's touch is the later. */
  kind: string;
  /** The whisper under the value. */
  record: "record" | "salesforce";
};

export function lastHumanTouch(
  read: Pick<AccountRead, "lastTouch" | "relationship">,
  second: SecondRecord | null | undefined,
): LastHumanTouch | null {
  const theirs = second?.rollup?.lastHuman ?? null;
  const ours = read.lastTouch;
  // The export's day is a day; the record's moment becomes one the same way
  // every day boundary in the app does (all days are Chicago days).
  const ourDay = ours ? chicagoDay(ours.at) : "";
  const theirDay = theirs?.day?.slice(0, 10) ?? "";
  if (!ourDay && !theirDay) return null;
  // The record wins a tie: it is the operator's own hand, and the export is
  // a stand-in for a fact the first record also holds (C1).
  if (ourDay && (!theirDay || ourDay >= theirDay))
    return {
      // A send whose target line names only our side hands back "", so the
      // relationship contact speaks, as the room's touch clock does.
      who: ours!.who || read.relationship.name,
      day: ourDay,
      kind: "ours",
      record: "record",
    };
  return { who: theirs!.who, day: theirDay, kind: theirs!.kind, record: "salesforce" };
}

// ── the row's gems and the ACT chip (C6 and C16, amended 2026-10-05) ────────
// THEIRS is the account's people: a colleague's gem has no seat on the line
// or the row (C16), and a colleague's motion produces nothing for the
// operator to do (C6). The row reads the one builder the HomeRoom's THEIRS
// line reads, so there is one filter, not two: a row whose only live gem is
// a colleague's shows no ACT chip and no gem. Colleague gems still ride
// behind an account person's lead in that builder until slice 11b retires
// their seat there; the row follows it the day it does.

export type SheetSecond = {
  gems: TheirsLine["gems"];
  /** The lead gem's act — the chip; null when no account person's gem is live. */
  act: string | null;
  verdict: string;
  supportTotal: number;
  spikeDay: string;
};

export function sheetSecond(sr: SecondRecord | null | undefined): SheetSecond | null {
  if (!sr) return null;
  const theirs = theirsLine(sr);
  return {
    gems: theirs?.gems ?? [],
    act: theirs?.gems[0]?.act || null,
    verdict: sr.rollup?.verdict ?? "",
    supportTotal: sr.support?.total ?? 0,
    spikeDay: sr.support?.spike?.day ?? "",
  };
}

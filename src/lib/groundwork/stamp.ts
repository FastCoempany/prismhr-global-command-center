// The wing's stamp subtext, per rule. When no channel line exists (a
// copy-stamp, a pre-register stamp) the subtext carries the move's own
// specifics — the headline, the thread subject, the quiet date, the CSM's
// name — never a bare label (founder-decreed 2026-08-19: the subtext answers
// what it means). No rule stamps with an empty label (ruled 2026-09-25, D27):
// a rule with nothing specific to say speaks its own label. Every stamp says
// what the operator did, in the past tense, then its specific (the founder,
// 2026-10-06): the seat, the gem and the never-pitched account once stamped
// a bare noun, SEATED, THEIRS and ENGAGED · NEVER MET, and now speak like the
// rest. Pure, so the canon suite can check every rule.

import { shortName } from "@/lib/sendbook/read";
import type { QueueRuleId } from "./day";

type StampContext = {
  /** The newest wire headline matched to the account, "" when none. */
  wireHeadline?: string;
  /** Sales Navigator's engagement count, null when the row carried none. */
  intentActivities?: number | null;
  /** The colleague's opportunity close, spelled ("August 20"), "" when none. */
  ridingLaneCloses?: string;
  /** The open thread's subject from the Sendbook, "" when none. */
  threadSubject?: string;
  /** The last send's date, spelled ("July 22"), "" when none. */
  lastSendDate?: string;
  /** The account's partner manager, "" or "Unassigned" when none. */
  csm?: string;
  /** Age of the account's own research pass in days, null when none. */
  researchAgeDays?: number | null;
  /** The seat's day (YYYY-MM-DD), "" when the seat is gone. */
  seatDay?: string;
  /** The second-record gem's term, "" when none leads. */
  gemTerm?: string;
  /** The gem's first person, as the THEIRS line names them, "" when none. */
  gemWho?: string;
  /** The support cases behind engaged-never-introduced, null when none. */
  supportCases?: number | null;
};

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

// M/D of a YYYY-MM-DD day, "" when the day is not one.
const shortDay = (day: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
  return m ? `${Number(m[2])}/${Number(m[3])}` : "";
};

export function stampSubtext(ruleId: QueueRuleId | string, ctx: StampContext): string {
  switch (ruleId) {
    case "seated": {
      // The seat's own reason line says "Seated 10/6 from the sheet."
      const d = shortDay(ctx.seatDay ?? "");
      return d
        ? `WORKED THE MOVE FROM THE SHEET · SEATED ${d}`
        : "WORKED THE MOVE FROM THE SHEET";
    }
    case "second-record-gem": {
      // The THEIRS line's own label, "ADAM'S PHR STALL", so the stamp names
      // the thing the operator saw and acted on.
      const t = clip((ctx.gemTerm ?? "").trim().toUpperCase(), 40);
      const who = (ctx.gemWho ?? "").trim().split(/\s+/)[0]?.toUpperCase() ?? "";
      if (!t) return "ACTED ON THEIR LATEST ACTIVITY";
      return who ? `ACTED ON ${who}’S ${t}` : `ACTED ON THEIR ${t}`;
    }
    case "engaged-never-introduced": {
      // The move said "Open the first conversation." over "{N} support
      // cases. Never pitched."
      const n = ctx.supportCases;
      return n
        ? `OPENED THE FIRST CONVERSATION · ${n} SUPPORT CASES`
        : "OPENED THE FIRST CONVERSATION";
    }
    case "wire-trigger": {
      const h = ctx.wireHeadline ?? "";
      return h
        ? `SENT THE NEWS NOTE · ${clip(h.toUpperCase(), 46)}`
        : "SENT A NOTE ABOUT THEIR NEWS";
    }
    case "intent-warm": {
      // Plain words (pass 9; the plain-speech law bans coined phrasing): the
      // move said "Send them a note." because their people are reading us.
      const n = ctx.intentActivities;
      return n
        ? `SENT THEM A NOTE · ${n} SALES NAV READS`
        : "SENT THEM A NOTE · THEY'VE BEEN READING OUR MATERIAL";
    }
    case "riding-lane": {
      // The ask went to the colleague who owns the open opportunity.
      const d = ctx.ridingLaneCloses ?? "";
      return d
        ? `ASKED THE COLLEAGUE ON THE DEAL TO BRING US IN · CLOSES ${d.toUpperCase()}`
        : "ASKED THE COLLEAGUE ON THE DEAL TO BRING US IN";
    }
    case "silence-bump": {
      const s = ctx.threadSubject ?? "";
      const d = ctx.lastSendDate ?? "";
      return `NUDGED ${s ? `THE '${clip(s.toUpperCase(), 34)}' THREAD` : "THE OPEN THREAD"}${d ? ` · NO REPLY SINCE ${d.toUpperCase()}` : ""}`;
    }
    case "cold-revival": {
      const s = ctx.threadSubject ?? "";
      const d = ctx.lastSendDate ?? "";
      return `REVIVED ${s ? `THE '${clip(s.toUpperCase(), 34)}' THREAD` : "THE COLD THREAD"}${d ? ` · QUIET SINCE ${d.toUpperCase()}` : ""}`;
    }
    case "roundup-slot": {
      const csm = ctx.csm ?? "";
      return csm && csm !== "Unassigned"
        ? `BRIEFED ${csm.toUpperCase()} ON THIS ACCOUNT`
        : "BRIEFED THE PARTNER MANAGER ON THIS ACCOUNT";
    }
    case "stale-above-gate": {
      const age = ctx.researchAgeDays;
      return age != null
        ? `REFRESHED THE ACCOUNT RESEARCH · WAS ${age} DAYS OLD`
        : "RAN THE BOOK-WIDE RESEARCH PASS";
    }
    case "stakeholder-gap":
      return "DUG UP A SECOND CONTACT NAME";
    case "never-touched-incumbent":
      return "SENT FIRST COLD EMAIL · STEP 1";
    default:
      // The rule's own label speaks — the wing never stamps mutely.
      return (
        String(ruleId ?? "")
          .replace(/-/g, " ")
          .trim()
          .toUpperCase() || "WORKED"
      );
  }
}

/** A touch the Sendbook filed for the account today, newest first: its
 *  channel, its count in the run, and who it went to ("" when unknown). */
export type ChannelTouch = { channel: string; step: number; contact: string };

/** The touch's channel line, `EMAIL · STEP 1 · CRISTINA B.`; "" for none. */
function channelLine(t: ChannelTouch | null | undefined): string {
  if (!t) return "";
  return [`${t.channel} · STEP ${t.step}`, t.contact ? shortName(t.contact) : ""]
    .filter(Boolean)
    .join(" · ");
}

/** What a channel line opens to (the click-depth law, pass 11): the name
 *  the line shortened, whole, and the touch's own words. Null with no touch. */
export function channelOpens(
  t: (ChannelTouch & { clause?: string }) | null | undefined,
): string[] | null {
  if (!t) return null;
  return [
    t.contact ? `To ${t.contact}.` : "No name on file.",
    ...(t.clause ? [t.clause] : []),
  ];
}

/** The wing's stamp subtext, chosen once (D27, ship order 2026-10-06): a
 *  filed touch's channel line still leads the stamp when there is one, and
 *  the rule's own stamp words speak otherwise, so the wing never stamps
 *  mutely. The rule's facts are a thunk, read only when the channel line is
 *  silent: the page builds them from several stores. */
export function wingStamp(
  touch: ChannelTouch | null | undefined,
  ruleId: QueueRuleId | string,
  ctx: StampContext | (() => StampContext),
): string {
  return (
    channelLine(touch) || stampSubtext(ruleId, typeof ctx === "function" ? ctx() : ctx)
  );
}

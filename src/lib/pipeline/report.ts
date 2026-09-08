// The Pipeline Status record — one per active account, assembled from what
// the app already holds (founder-decreed 2026-09-08). Pure: every input is
// passed in, so the whole thing is testable without a database.
//
// The job it does: someone asks "where's your pipeline," and this is read
// out loud without preparing anything. That purpose sets three rules the
// rest of the app does not need.
//
// ONE — the report is the OPERATOR'S work. A commitment that hands the job
// to another team inside PrismHR — the recruitment specialist, the support
// desk, an implementation crew — is not his next step. It rides an FYI line.
// The Simploy row proved why: "Connect Chassie with PrismHR's recruitment
// specialist," opened 8/25, took the next-step slot on 9/8 while the three
// commitments he actually made on the 9/2 call sat behind it.
//
// TWO — what another team is doing AT the account is FYI, never a field with
// the same weight as his own deal. Support cases are the account's traffic
// with a different part of our company; he needs to know so leadership can
// never surprise him, and that is all.
//
// THREE — Unknown is a value. A row of Unknowns is the finding: it says where
// discovery has holes. Nothing is ever silently blank, and a value the record
// implies is marked apart from one a person actually said.

import { splitFallback } from "@/lib/room/deliverables";
import { moveFromCommitment } from "@/lib/room/move-line";

export type Provenance = {
  /** Where the value came from, in the operator's words. "" when Unknown. */
  src: string;
  /** True when the app inferred this rather than reading it stated. */
  derived?: boolean;
};
export type Field = Provenance & {
  text: string;
  /** Nothing on record — renders as Unknown, never omitted. */
  unknown?: boolean;
  /** A finding in itself, not just missing (a deal with no next step). */
  flag?: boolean;
};

/** A handoff to another team inside PrismHR. Their work, not his — the
 *  register still carries it, the report puts it on the FYI line. Written
 *  from the two real cases in the book plus the desks they name. */
const OTHER_TEAM_RE =
  /\b(recruit(?:ing|ment)?(?:\s+specialist)?|recruiter|support (?:case|ticket|desk|team)|implementation team|onboarding team|benefits team|payroll ops|service team)\b/i;
const HANDOFF_RE =
  /\b(connect\s+\S+\s+with|introduce\s+\S+\s+to|hand(?:ed|s|ing)?\s+off\s+to|loop in|refer(?:red)?\s+\S+\s+to)\b/i;

/** Is this commitment another team's work rather than the operator's? Both
 *  halves must read true — "connect X with the recruitment specialist" is a
 *  handoff; "send the recruitment pricing" is his own send. */
export function isOtherTeamWork(text: string): boolean {
  const t = text ?? "";
  return OTHER_TEAM_RE.test(t) && HANDOFF_RE.test(t);
}

// ── outcomes ────────────────────────────────────────────────────────────────
// What was decided, agreed, learned or refused — never topics, never what was
// shown, never sentiment. The source is the READ's own distillation of the
// call, never the raw tape: a transcript body is speech, and "and we're
// hearing that from a lot of our partners" is dialogue, not an outcome.
//
// The first cut of this matched decision verbs in the past tense only and
// read ONE clause off a Simploy call that had settled five things. Real
// records are written in the present, and a stance the prospect took
// ("open to a premium", "no urgency") is as much an outcome as a signature.

const DECIDED_RE =
  /\b(agree[sd]?|decide[sd]?|confirm(?:s|ed)?|choos(?:e|es)|chose|select(?:s|ed)?|settl(?:e|es|ed) on|rul(?:e|es|ed) out|declin(?:e|es|ed)|reject(?:s|ed)?|approv(?:e|es|ed)|sign(?:s|ed)? off|commit(?:s|ted)? to|greenlit)\b/i;
const STANCE_RE =
  /\b(want(?:s|ed)?|prefer(?:s|red)?|open to|suspect(?:s|ed)?|no urgency|not urgent|already (?:fielding|selling|using)|push(?:es|ed|ing) for|park(?:s|ed)|will (?:circle back|share|send|move|go|switch|start)|asked (?:us |me )?(?:for|to)|likely|aims? (?:at|for)|deliberate pace|month-to-month)\b/i;
const NOT_OUTCOME_RE =
  /\b(discussed|reviewed|walked through|showed|demoed|covered|asked about|introduced myself)\b/i;

/** The decisions and stances a distilled call entry carries. Empty means the
 *  honest answer is "none recorded". */
export function outcomesFrom(distilledBody: string, cap = 4): string[] {
  const out: string[] = [];
  const text = (distilledBody ?? "").split("\n").slice(1).join(" ");
  // Records are written in clauses as often as sentences — the semicolon is
  // a real boundary here, not decoration.
  for (const raw of text.split(/(?<=[.!?])\s+|;\s+/)) {
    const s = raw.trim().replace(/\s+/g, " ").replace(/\.$/, "");
    if (s.length < 10 || s.length > 170) continue;
    if (/^Owed:/i.test(s)) continue;
    if (NOT_OUTCOME_RE.test(s)) continue;
    if (!DECIDED_RE.test(s) && !STANCE_RE.test(s)) continue;
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

// ── the FYI line ────────────────────────────────────────────────────────────
// The second record's support store, said the way a person says it. The raw
// head carries a dropSha and the phrase "cases in window" — machine words
// that must never reach a report read to leadership.

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

export function fyiFromSupport(storeBody: string): string {
  const lines = (storeBody ?? "").split("\n");
  const head = lines[0] ?? "";
  const total = /·\s*(\d+)\s+cases/.exec(head)?.[1] ?? "";
  const spike = /spike\s+(\d{4}-\d{2}-\d{2})\s*\((\d+)\s/.exec(head);
  const themes = lines
    .filter((l) => l.startsWith("THEME · "))
    .map((l) => {
      const m =
        /^THEME · (\d+) · (\d{4}-\d{2}-\d{2})→(\d{4}-\d{2}-\d{2}) · ([^·]*?)\s*·/.exec(l);
      return m
        ? {
            n: Number(m[1]),
            from: m[2],
            to: m[3],
            label: m[4].replace(/^,\s*/, "").trim(),
          }
        : null;
    })
    .filter(Boolean) as { n: number; from: string; to: string; label: string }[];
  if (!total && !themes.length) return "";
  const top = [...themes].sort((a, b) => b.n - a.n)[0];
  const parts: string[] = [];
  if (total && top)
    parts.push(
      `${total} support cases ${md(top.from)}–${md(top.to)}, mostly ${top.label.toLowerCase() || "unlabelled"} (${top.n})`,
    );
  else if (total) parts.push(`${total} support cases in the window`);
  if (spike) parts.push(`spike ${spike[2]} in a day on ${md(spike[1])}`);
  return parts.length ? parts.join("; ") + "." : "";
}

// ── the next step ───────────────────────────────────────────────────────────

export type OpenItem = {
  /** The stored commitment, fallback and provenance tail included. */
  edit: string;
  wall?: string;
  due?: string;
  /** The record shows this already landed (src/lib/room/settled.ts). */
  settled?: string;
};

/** The operator's own next action. Settled commitments are done, another
 *  team's handoffs are theirs, and what survives ranks by urgency: a blown
 *  wall, then the soonest date, then the newest. "" means None set — which
 *  is a finding, not a blank. */
export function nextStepFrom(open: readonly OpenItem[]): {
  text: string;
  full: string;
  handoffs: string[];
} {
  const handoffs: string[] = [];
  const mine: OpenItem[] = [];
  for (const o of open ?? []) {
    if (o.settled) continue;
    const commitment = splitFallback(o.edit ?? "").text;
    if (isOtherTeamWork(commitment)) {
      handoffs.push(moveFromCommitment(commitment).line);
      continue;
    }
    mine.push(o);
  }
  const rank = (o: OpenItem) => (o.wall ? 0 : o.due ? 1 : 2);
  const dueMs = (o: OpenItem) => {
    const t = Date.parse(`${o.due ?? ""}T12:00:00Z`);
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };
  const pick = [...mine].sort((a, b) => rank(a) - rank(b) || dueMs(a) - dueMs(b))[0];
  if (!pick) return { text: "", full: "", handoffs };
  const built = moveFromCommitment(splitFallback(pick.edit).text);
  return { text: built.line, full: built.full, handoffs };
}

/** What THEY owe, from the record's own Owed line — the sequence the report
 *  has to respect. A next step that ignores the counterparty's turn reads as
 *  work the operator can do today when he cannot. */
export function waitingOn(theirs: readonly { who: string; text: string }[]): string {
  const first = (theirs ?? [])[0];
  return first ? `${first.who} owes ${first.text}` : "";
}

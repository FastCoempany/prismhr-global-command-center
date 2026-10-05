// Owed-to-you extraction — the record's action items become suggested open
// work, never silently created. Two dialects are read: the cleaner's own
// "Owed: <thing> — @<owner>" convention, and a direct inbound ask aimed at
// the operator ("Will you please coordinate…"). Accept ✓ opens it on the
// register; dismiss ✕ retires the suggestion durably. Pure.

import { MINE_RE } from "@/lib/intel/provenance";
import { splitMarker, splitTags } from "@/lib/today/route-notes";
import { chicagoDay } from "@/lib/tz";

type OwedSuggestion = {
  noteId: string;
  key: string; // durable dismissal key: owed:<noteId>:<hash>
  text: string; // the owed thing, ready to become an action body
  src: string; // who/when it came from, for the suggestion line
};

// The cleaner writes "Owed: SmartPay follow-up — @Lucas." — owner after the @.
// The owner group is 1-4 bare word tokens so it can never gobble past the
// sentence into the next Owed line.
const OWED_LINE_RE =
  /\bOwed:\s*([^—\n]{3,140}?)\s*—\s*@?\s*([A-Za-z][\w'’-]*(?:\s[A-Za-z][\w'’-]*){0,3})/g;

// A direct ask in an inbound message: "Will you please coordinate an internal
// post mortem call". Captures the ask itself, trimmed at sentence bounds.
const DIRECT_ASK_RE =
  /\b(?:will|can|could|would) you (?:please )?((?:[a-z][\w'’-]*\s+){1,14}[\w'’-]+)/i;

const FRESH_DAYS = 14;
const CAP = 3;

// djb2 — tiny, deterministic; keys dismissals to the suggestion's content so
// an edited record line re-suggests while a dismissed one stays down.
export function owedKey(noteId: string, text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `owed:${noteId}:${h.toString(16)}`;
}

// M/D of the entry's Chicago day, read off the one day key (src/lib/tz.ts).
const chicagoMD = (iso: string): string =>
  chicagoDay(iso).replace(/^\d{4}-0?(\d+)-0?(\d+)$/, "$1/$2");

function senderOf(actors: string): string {
  return (
    (actors ?? "")
      .split("→")[0]
      ?.replace(/\+\d+\s*$/, "")
      .trim() ?? ""
  );
}

// Is this inbound TO the operator? (sender is someone else)
function isInbound(actors: string): boolean {
  const from = senderOf(actors);
  return !!from && !MINE_RE.test(from);
}

// ── the client's side of the Owed line (the Simploy call, 2026-09-03) ──────
// The cleaner writes both sides in one line — "Owed: invoices + EOR confirm
// — @Chassie; agreements, question list — @Antaeus" — and until now only the
// operator's side was ever read. The client's side is the record saying
// whose deliverable comes first after a meeting; the room's meeting move
// reads it so "Send the recap" can also say what they owe. Derived display
// only — nothing files, and the moment their reply lands the court flips
// and this read retires itself.

type TheirOwed = {
  noteId: string;
  who: string; // the owner as the record names them
  text: string; // the thing they owe
  at: string; // the note's own moment
  // The rest is a their-loop's alone (D10); the Owed line's segments carry
  // none of it. `day` is the promised day (yyyy-mm-dd, "" when none was
  // named); `hearer` is who heard the promise; `promised` is true only when
  // the day has passed AND a hearer is named — PROMISED needs a hearer (ruled
  // 2026-09-25, D28), so a blown loop with no hearer reads as a plain wall.
  day?: string;
  hearer?: string;
  promised?: boolean;
};

// ── their loops (CLAUDE.md, The Chute, ruled 2026-09-25, D10) ──────────────
// The read's commitments on THEIR side file as Todo rows tagged `o:them`,
// with the promised day, the hearer and the person who owes it in the tag
// line (src/lib/today/route-notes.ts), linked to their filing by column.
// This is the one reader of those rows: a loop is never the operator's
// action, so the sheet, the ledger and the mirror leave it alone, and the
// court reads it here beside the Owed line. The row's own `done` closes it.

export type TheirLoop = {
  text: string;
  by: string;
  hearer: string;
  day: string;
};

/** The their-loop a Todo body carries, or null when the row is not one. */
export function theirLoopOf(body: string): TheirLoop | null {
  const { text, tags } = splitTags(splitMarker(body ?? "").text);
  if (tags.owner !== "them") return null;
  const what = text.replace(/\s+/g, " ").trim();
  if (what.length < 3) return null;
  return { text: what, by: tags.by, hearer: tags.hearer, day: tags.date };
}

/** Has the promised day ended, Chicago (the closer rule: all days are
 *  Chicago days, theirs or ours)? False with no day, or a day still ahead. */
export function dayBlown(day: string, now: Date): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day < chicagoDay(now);
}

// One Owed line can carry several segments split on ";" — each ends with
// "— @Owner". Scanned only inside an Owed block, segmented at semicolons
// and sentence bounds, owners capitalized like names — so free text with a
// stray semicolon or an em dash can never fabricate a debt.
const OWED_BLOCK_RE = /\bOwed:\s*([^\n]+)/g;
const OWED_SEG_SPLIT = /;|\.\s+(?=[A-Z])/;
const OWED_SEG_RE =
  /^\s*(.{3,140}?)\s*—\s*@?\s*([A-Z][\w'’-]*(?:\s[A-Z][\w'’-]*){0,3})\s*\.?\s*$/;

export function owedByThem(
  notes: readonly {
    id: string;
    body: string;
    createdAt: string;
  }[],
  now: Date,
  // The account's Todo rows, for the their-loops among them (D10). A loop is
  // open until its row is done: no freshness window, because a promise
  // closes only by delivery or explicit release (the closer rule), and the
  // readers that retire a debt — their reply landing, the meeting day — do
  // so on their own terms. Loops lead, newest filing first, under the cap.
  todos: readonly {
    id: string;
    body: string;
    createdAt: string;
    done?: boolean;
  }[] = [],
): TheirOwed[] {
  const out: TheirOwed[] = [];
  const seen = new Set<string>();
  const loops = [...todos]
    .filter((t) => !t.done)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const t of loops) {
    if (out.length >= CAP) break;
    if (Number.isNaN(Date.parse(t.createdAt))) continue;
    const loop = theirLoopOf(t.body);
    if (!loop) continue;
    const key = `${loop.text.toLowerCase()}|${loop.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      noteId: t.id,
      who: loop.by,
      text: loop.text,
      at: t.createdAt,
      day: loop.day,
      hearer: loop.hearer,
      promised: dayBlown(loop.day, now) && loop.hearer !== "",
    });
  }
  for (const n of notes) {
    if (out.length >= CAP) break;
    const age = now.getTime() - Date.parse(n.createdAt);
    if (Number.isNaN(age) || age > FRESH_DAYS * 86_400_000) continue;
    OWED_BLOCK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = OWED_BLOCK_RE.exec(n.body ?? ""))) {
      for (const seg of m[1].split(OWED_SEG_SPLIT)) {
        const s = OWED_SEG_RE.exec(seg);
        if (!s) continue;
        const who = s[2].trim();
        if (MINE_RE.test(who) || /^(you|me|us|we)$/i.test(who)) continue;
        const text = s[1]
          .replace(/\s+/g, " ")
          .replace(/[.,;:]+$/, "")
          .trim();
        if (text.length < 3) continue;
        out.push({ noteId: n.id, who, text, at: n.createdAt });
        if (out.length >= CAP) break;
      }
      if (out.length >= CAP) break;
    }
  }
  return out;
}

export function owedToMe(
  notes: readonly {
    id: string;
    body: string;
    createdAt: string;
    actors?: string;
  }[],
  dismissedKeys: ReadonlySet<string>,
  openBodies: readonly string[],
  now: Date,
): OwedSuggestion[] {
  const out: OwedSuggestion[] = [];
  const openLower = openBodies.map((b) => b.toLowerCase());
  const seen = new Set<string>();
  const push = (noteId: string, rawText: string, src: string) => {
    const text = rawText
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,;:]+$/, "")
      .slice(0, 140);
    if (text.length < 8) return;
    const key = owedKey(noteId, text);
    if (dismissedKeys.has(key) || seen.has(key)) return;
    // Already open work? (the first 40 chars appearing in any open item)
    const probe = text.toLowerCase().slice(0, 40);
    if (openLower.some((b) => b.includes(probe))) return;
    seen.add(key);
    out.push({ noteId, key, text, src });
  };

  for (const n of notes) {
    if (out.length >= CAP) break;
    const age = now.getTime() - Date.parse(n.createdAt);
    if (Number.isNaN(age) || age > FRESH_DAYS * 86_400_000) continue;
    const body = n.body ?? "";
    const day = chicagoMD(n.createdAt);

    // Dialect 1: the cleaner's "Owed: X — @owner" lines, mine only.
    OWED_LINE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = OWED_LINE_RE.exec(body))) {
      const owner = m[2].trim();
      if (!MINE_RE.test(owner) && !/^(you|me)$/i.test(owner)) continue;
      push(n.id, m[1], `owed since ${day}`);
      if (out.length >= CAP) break;
    }
    if (out.length >= CAP) break;

    // Dialect 2: a direct inbound ask ("Will you please coordinate…").
    if (isInbound(n.actors ?? "")) {
      const d = DIRECT_ASK_RE.exec(body);
      if (d) {
        const who = senderOf(n.actors ?? "").split(/\s+/)[0] || "they";
        push(n.id, d[1], `${who} asked, ${day}`);
      }
    }
  }
  return out;
}

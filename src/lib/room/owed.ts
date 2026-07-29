// Owed-to-you extraction — the record's action items become suggested open
// work, never silently created. Two dialects are read: the cleaner's own
// "Owed: <thing> — @<owner>" convention, and a direct inbound ask aimed at
// the operator ("Will you please coordinate…"). Accept ✓ opens it on the
// register; dismiss ✕ retires the suggestion durably. Pure.

import { MINE_RE } from "@/lib/intel/provenance";

export type OwedSuggestion = {
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

function chicagoDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
}

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
    const day = chicagoDay(n.createdAt);

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

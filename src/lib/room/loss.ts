// The loss read — the record speaks, the operator decides. When the freshest
// filed intel carries loss language, the row must stop coaching forward
// motion; but the read only ever SUGGESTS (mark it lost / keep salvaging) —
// nothing archives itself. Pure and adversarially tested: negations and
// near-miss phrasings ("so we don't lose this") must never trigger it.

export type LossRead = {
  noteId: string; // the triggering record entry — dismissals key to it
  phrase: string; // the matched loss language, trimmed for display
  date: string; // M/D of the triggering entry (Chicago)
};

const LOSS_RE =
  /\b(?:found another (?:solution|provider|vendor|partner)|(?:we(?:'ve| have)?|they(?:'ve| have)?) lost (?:the|both|this)\b[^.\n]{0,60}|lost the deal|going (?:with|in) a different direction|went with (?:another|a competitor|someone else)|chose (?:a )?(?:competitor|another (?:provider|vendor|solution))|signed with (?:another|a competitor)|no longer moving forward|decided not to (?:move forward|proceed)|deal is (?:dead|lost|off)|passing on (?:us|this|the deal)|client (?:backed|pulled) out)\b/i;

// Words that flip the meaning when they sit just before the match — "so we
// don't lose the deal", "at risk of losing", "almost lost this one".
const NEGATION_RE =
  /(?:\bnot\b|n't\b|\bavoid\w*\b|\brisk of\b|\balmost\b|\bnearly\b|\bbefore we\b|\bso we don'?t\b|\bcould(?:n't)?\b|\bwould\b|\bmight\b|\bif we\b|\bdon'?t want to\b|\bmake sure we don'?t\b)\s*(?:\w+\s+){0,3}$/i;

const FRESH_DAYS = 30;
const SCAN_CAP = 12;

function chicagoDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
}

// Scan the freshest record entries (newest first) for a live loss signal.
// `dismissedNoteIds` carries the operator's "keep salvaging" calls — a
// dismissal is keyed to the note that triggered it, so NEW loss evidence
// resurfaces the read while the old evidence stays quiet.
export function readLoss(
  notes: readonly { id: string; body: string; createdAt: string }[],
  dismissedNoteIds: ReadonlySet<string>,
  now: Date,
): LossRead | null {
  for (const n of notes.slice(0, SCAN_CAP)) {
    const age = now.getTime() - Date.parse(n.createdAt);
    if (Number.isNaN(age) || age > FRESH_DAYS * 86_400_000) continue;
    if (dismissedNoteIds.has(n.id)) continue;
    const body = n.body ?? "";
    const m = LOSS_RE.exec(body);
    if (!m) continue;
    const before = body.slice(Math.max(0, m.index - 60), m.index);
    if (NEGATION_RE.test(before)) continue;
    return {
      noteId: n.id,
      phrase: m[0].trim().slice(0, 90),
      date: chicagoDay(n.createdAt),
    };
  }
  return null;
}

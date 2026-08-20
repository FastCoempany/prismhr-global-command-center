// The mechanical canon linter — the cheap rejections that never spend a model
// call (§3.8 check 5, §7.2). Every generated act line faces this before the
// refuter does: imperative, six words or fewer, no hedging, no deadline in
// the action, no retired phrases, term two words or fewer. Pure and exported
// so the covenant's own tests exercise the accept and reject sets.

const VERBS = new Set([
  "reach",
  "call",
  "email",
  "send",
  "ask",
  "open",
  "drill",
  "book",
  "share",
  "write",
  "offer",
  "introduce",
  "loop",
  "confirm",
  "follow",
  "press",
  "invite",
  "surface",
  "bring",
  "raise",
  "pull",
  "get",
  "set",
  "run",
  "drop",
  "tell",
  "flag",
  "check",
  "start",
  "close",
  "move",
  "meet",
  "draft",
  "answer",
  "ping",
  "forward",
  "schedule",
  "propose",
  "chase",
  "nudge",
  "revive",
  "reopen",
  "warm",
  "work",
  "wait",
  "read",
  "review",
  "compare",
  "thank",
  "congratulate",
  "reply",
  "resend",
  "restart",
  "connect",
  "put",
  "walk",
  "show",
  "give",
  "take",
  "find",
  "learn",
  "line",
  "queue",
  "stamp",
  "note",
  "watch",
  "hold",
  "point",
  "steer",
  "hand",
  "pitch",
  "price",
  "quote",
  "map",
  "sort",
  "settle",
  "seat",
  "join",
  "sit",
  "talk",
  "speak",
]);

// Hedges and framing the writing canon bans outright.
const HEDGE_RE =
  /\b(may be worth|might want|you might|consider|worth a|it may|could be worth|perhaps|possibly|appears to|seems to|maybe)\b/i;

// A deadline never rides the action line — the action is today's; the date
// lives in the reason (canon rule 2).
const DEADLINE_RE =
  /\b(by|before|until)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|eod|eow|\d{1,2}\/\d{1,2})\b|\bdeadline\b/i;

// Retired vocabulary (canon rules 8–10) and the word that never appears.
// "steps" is the banned word; "step 1" survives by decree (the Sendbook's
// own subtext says it).
const RETIRED_RE = /\b(\w+[-\s]shaped|their own book|domestic-only|steps)\b/i;

const wordCount = (s: string): number =>
  (s ?? "").trim().split(/\s+/).filter(Boolean).length;

export type LintVerdict = { ok: boolean; faults: string[] };

/** Lint one act line against the writing canon. */
export function lintAct(act: string): LintVerdict {
  const faults: string[] = [];
  const t = (act ?? "").trim();
  if (!t) return { ok: false, faults: ["empty"] };
  const words = wordCount(t.replace(/[.!]$/, ""));
  if (words > 6) faults.push(`${words} words — the cap is six`);
  const first = (t.split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!VERBS.has(first)) faults.push(`"${first}" is not an imperative verb`);
  if (HEDGE_RE.test(t)) faults.push("hedging");
  if (DEADLINE_RE.test(t)) faults.push("a deadline rides the action line");
  if (RETIRED_RE.test(t)) faults.push("retired vocabulary");
  if (/[—()]/.test(t)) faults.push("an aside or parenthetical");
  return { ok: faults.length === 0, faults };
}

/** Lint a reason line: the trigger, six words or fewer, no hedging, no
 *  retired vocabulary. Deadlines are ALLOWED here — this is where they live. */
export function lintReason(reason: string): LintVerdict {
  const faults: string[] = [];
  const t = (reason ?? "").trim();
  if (!t) return { ok: false, faults: ["empty"] };
  const words = wordCount(t.replace(/[.!]$/, ""));
  if (words > 8) faults.push(`${words} words — the cap is eight`);
  if (HEDGE_RE.test(t)) faults.push("hedging");
  if (RETIRED_RE.test(t)) faults.push("retired vocabulary");
  return { ok: faults.length === 0, faults };
}

/** A term is at most two words, and it opens a door — it is a label, not a
 *  sentence. */
export function lintTerm(term: string): LintVerdict {
  const t = (term ?? "").trim();
  if (!t) return { ok: false, faults: ["empty"] };
  const faults: string[] = [];
  if (wordCount(t) > 2) faults.push("more than two words");
  if (/[.!?]$/.test(t)) faults.push("a term is a label, not a sentence");
  if (RETIRED_RE.test(t)) faults.push("retired vocabulary");
  return { ok: faults.length === 0, faults };
}

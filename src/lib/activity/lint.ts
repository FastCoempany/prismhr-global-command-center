// The mechanical canon linter — the cheap rejections that never spend a model
// call (the refutation pass as blessed 2026-08-20: the mechanical canon lint
// runs first, then the independent refuter — CLAUDE.md, The second record).
// Every generated act line faces this before the refuter does: imperative,
// six words or fewer, no hedging, no deadline in the action, no retired
// phrases, term two words or fewer. Pure and exported so the covenant's own
// tests exercise the accept and reject sets.

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

// Gem lines are operator copy (ruled 2026-09-25, D21): the plain-speech law's
// seven devices are linted here, and a digit that is not a date kills the
// line, because every rendered count is arithmetic, never model prose. Every
// detector is deliberately conservative — a false positive kills a real gem —
// so each catches the law's own example and lets the plain line through.

// Antithesis — "not X, but Y" / "not X but Y", or the clause-level "X, not Y".
const ANTITHESIS_RE = /,\s*not\s+\w|\bnot\s+\w[^,.;]*?,?\s+but\s+\w/i;

// The dash hinge (the consequence closer) — an em dash, en dash or spaced
// hyphen delivering a short closing beat (one to four words) as the line's
// implication.
const DASH_HINGE_RE = /(?:—|–|\s-\s)\s*(?:\S+\s+){0,3}\S+\s*[.!]?$/;

// Function words no device is built on: never a paradox's stem, never a
// chiasmus's mirrored word.
const STOP_WORDS =
  "the|and|for|that|this|they|their|them|then|than|there|these|those|with|have|has|had|was|were|are|not|but|you|your|our|its|his|her|she|him|who|what|when|from|into|out|will|been|does|did|can|could|would|should|about|over|after|before|since|yet|too|also|just|now|here|where|how|why|all|any|some|more|most|very|still|ever|never|which|while|because";
const STOP_SET = new Set(STOP_WORDS.split("|"));

// Paradox — a stem and its own negation in one clause ("a call that ENDS
// hasn't ENDED"). One clause means no comma, period or semicolon between the
// two, so "They replied, we haven't replied" stays two clauses with two
// subjects. The stem is three letters or more and never a function word.
const NEGATION =
  "(?:not|never|hasn't|haven't|hadn't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|won't|can't)";
const PARADOX_RE = new RegExp(
  `\\b(?!(?:${STOP_WORDS})\\b)(\\w{3,}?)(?:s|es|ed|d|ing)?\\b[^.;!?,]*?\\b${NEGATION}\\s+(?:\\w+\\s+)?\\1(?:s|es|ed|d|ing)?\\b`,
  "i",
);

// A line's leading imperative verb is the app doing its job, never a
// paradox's first beat — "Ask what they haven't asked yet" is an instruction.
const afterLeadingVerb = (t: string): string => {
  const [first = "", ...rest] = t.split(/\s+/);
  return VERBS.has(first.toLowerCase().replace(/[^a-z]/g, "")) ? rest.join(" ") : t;
};

// Maxim — generalized wisdom in the bare aphorism shape, a whole sentence of
// "X beats Y" / "X trumps Y" / "X over Y" with no subject ("controlled beats
// discovered", "Speed over polish"). "X over Y" is exempt when X is an
// imperative verb: "Call over Zoom" is an instruction with a preposition.
const MAXIM_BEATS_RE = /^(\w+)\s+(?:beats|trumps)\s+(\w+)[.!]?$/i;
const MAXIM_OVER_RE = /^(\w+)\s+over\s+(\w+)[.!]?$/i;
const isMaxim = (sentence: string): boolean => {
  if (MAXIM_BEATS_RE.test(sentence)) return true;
  const m = MAXIM_OVER_RE.exec(sentence);
  return m !== null && !VERBS.has(m[1].toLowerCase());
};

// Definitional flip — a familiar word redefined: "now … later they're …"
// ("questions now are free — later they're change orders"), or the bare
// "X is just Y" / "X are only Y" with a one-word subject ("Questions are just
// change orders"). "The deck is just two pages" keeps its two-word subject
// and its fact.
const FLIP_LATER_RE =
  /\bnow\b[^.;!?]*?\b(?:later|then|tomorrow)\s+(?:they're|they are|it's|it is|that's|that is)\b/i;
const FLIP_JUST_RE = /^(\w+)\s+(?:is|are)\s+(?:just|really|only|simply|actually)\s+/i;

// Escalating triad — three possessive beats joined by commas whose owner
// shifts so the third lands ("their pay, our employment, our answer"). Three
// beats under one owner ("their pay, their benefits, their taxes") are a real
// list of three actual things, which the law keeps.
const POSSESSIVE = "(their|our|your|its|my|his|her)";
const TRIAD_RE = new RegExp(
  `\\b${POSSESSIVE}\\s+\\w+,\\s*${POSSESSIVE}\\s+\\w+,\\s*(?:and\\s+)?${POSSESSIVE}\\s+\\w+`,
  "i",
);
const isTriad = (t: string): boolean => {
  const m = TRIAD_RE.exec(t);
  if (!m) return false;
  const owners = new Set([m[1], m[2], m[3]].map((w) => w.toLowerCase()));
  return owners.size > 1;
};

// Chiasmus — the ABBA mirror: two content words (four letters or more, never
// a function word) that come back in reverse order as the next content words
// of the same sentence ("Work the plan, plan the work"). A word returning
// across a sentence break, or with other content between the mirrored pair,
// is repetition, not a mirror.
const isChiasmus = (sentence: string): boolean => {
  const words = sentence
    .toLowerCase()
    .split(/[^a-z']+/)
    .map((w) => w.replace(/'.*$/, ""))
    .filter((w) => w.length >= 4 && !STOP_SET.has(w));
  for (let i = 0; i + 3 < words.length; i++) {
    const [a, b, c, d] = words.slice(i, i + 4);
    if (a === d && b === c && a !== b) return true;
  }
  return false;
};

const sentences = (t: string): string[] =>
  t
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

// Every date form a gem line may carry; any digit left after these are
// stripped is a count.
const DATE_FORMS_RE =
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b(?:,?\s+(?:19|20)\d{2}\b)?|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(?:19|20)\d{2}\b/gi;

const nonDateDigit = (t: string): boolean => /\d/.test(t.replace(DATE_FORMS_RE, " "));

// The device faults one line carries, in the order the law names them.
function deviceFaults(t: string): string[] {
  const faults: string[] = [];
  const parts = sentences(t);
  if (ANTITHESIS_RE.test(t)) faults.push("antithesis");
  if (PARADOX_RE.test(afterLeadingVerb(t))) faults.push("paradox");
  if (parts.some(isMaxim)) faults.push("a maxim");
  if (FLIP_LATER_RE.test(t) || parts.some((s) => FLIP_JUST_RE.test(s)))
    faults.push("a definitional flip");
  if (DASH_HINGE_RE.test(t)) faults.push("a dash hinge");
  if (isTriad(t)) faults.push("an escalating triad");
  if (parts.some(isChiasmus)) faults.push("chiasmus");
  if (nonDateDigit(t)) faults.push("a digit that is not a date");
  return faults;
}

const wordCount = (s: string): number =>
  (s ?? "").trim().split(/\s+/).filter(Boolean).length;

type LintVerdict = { ok: boolean; faults: string[] };

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
  faults.push(...deviceFaults(t));
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
  faults.push(...deviceFaults(t));
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

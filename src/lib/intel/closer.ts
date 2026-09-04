// The closer rule (founder-decreed 2026-08-22): a courtesy sign-off —
// "No problem!", "thanks!", "sounds good", a thumbs-up — is conversational
// punctuation, not a message. Closers are TRANSPARENT: the ledger reads
// through them to the last substantive message. A closer never opens a
// loop (no "Answer Lesha" off a "No problem!") and never closes one (their
// "No problem!" after the operator's promise ratifies it, never settles
// it). The sign-off is weather; the promise is terrain.
//
// Detection is deliberately conservative: short, no question, no digits,
// no names — every word must come from the closer lexicon. "Thanks — can
// you also send pricing?" and "Perfect. She is expecting your call." are
// content, and content always wins.

const PHRASES = [
  "no problem",
  "no problem at all",
  "no worries",
  "not a problem",
  "np",
  "thanks",
  "thanks so much",
  "thanks a lot",
  "thanks again",
  "thank you",
  "thank you so much",
  "many thanks",
  "thx",
  "ty",
  "anytime",
  "any time",
  "you bet",
  "you got it",
  "sounds good",
  "sounds great",
  "sounds like a plan",
  "perfect",
  "awesome",
  "great",
  "got it",
  "will do",
  "ok",
  "okay",
  "sure",
  "sure thing",
  "of course",
  "my pleasure",
  "you're welcome",
  "youre welcome",
  "welcome",
  "cheers",
  "roger",
  "roger that",
  "understood",
  "noted",
  "copy",
  "copy that",
  "all good",
  "good deal",
  "same to you",
  "you too",
  "you as well",
  "have a good one",
  "have a great day",
  "have a great weekend",
  "likewise",
];

// Longest-first so "thank you so much" wins before "thank you".
const ORDERED = [...PHRASES].sort((a, b) => b.length - a.length);

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

export function isCloser(raw: string): boolean {
  const text = (raw ?? "").trim();
  if (!text || text.length > 60) return false;
  if (/[?\d]/.test(text)) return false;
  const hadEmoji = EMOJI_RE.test(text);
  const norm = text
    .replace(EMOJI_RE, " ")
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Emoji-only ("👍") is the purest closer there is.
  if (!norm) return hadEmoji;
  // Every word must be spoken for by the lexicon — greedy, longest-first.
  let rest = norm;
  while (rest) {
    const hit = ORDERED.find((p) => rest === p || rest.startsWith(`${p} `));
    if (!hit) return false;
    rest = rest.slice(hit.length).trim();
  }
  return true;
}

// ── the meeting response (founder-decreed 2026-09-04) ───────────────────────
// "Accepted: Initial Chat | Intro to PrismHR Global" is the calendar
// answering, not the client writing. On 2026-09-04 Joseph Lyon accepted a
// Zoom invite fifteen minutes after it went out and the row said "Answer
// Joseph. They wrote today." — there was nothing to answer; the meeting was
// booked. This is the closer rule's own family: machinery is never a person,
// so a response never opens a reply-owed.
//
// It is not silence, though. An acceptance is a real signal that they
// engaged — it stays their voice for warmth, exactly as a sign-off does.
// Only the reply-owed reading is suppressed.
//
// Detection reads the SUBJECT slot, where every calendar client puts the
// verb: Outlook, Google and Zoom all prefix "Accepted:", "Declined:" or
// "Tentative:". A person writing the word in a sentence never matches — the
// prefix must open the subject.
const MEETING_RESPONSE_RE =
  /(?:^|—\s*)(?:Accepted|Declined|Tentatively accepted|Tentative)\s*:/i;

/** True when a note's head is a calendar's own response to an invitation. */
export function isMeetingResponse(head: string): boolean {
  const line = (head ?? "").split("\n")[0] ?? "";
  if (!line) return false;
  // The head's subject rides after the em dash; a bare subject line counts too.
  const dash = line.indexOf("—");
  const subject = dash >= 0 ? line.slice(dash + 1) : line;
  return MEETING_RESPONSE_RE.test(`— ${subject.trim()}`);
}

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

/** An acceptance specifically — a decline or a tentative proves nothing was
 *  settled, so only this one says the meeting exists. */
const ACCEPTED_RE = /(?:^|—\s*)Accepted\s*:/i;

export function isAcceptance(head: string): boolean {
  const line = (head ?? "").split("\n")[0] ?? "";
  if (!isMeetingResponse(line)) return false;
  const dash = line.indexOf("—");
  const subject = dash >= 0 ? line.slice(dash + 1) : line;
  return ACCEPTED_RE.test(`— ${subject.trim()}`);
}

/** True when a note's head is a calendar's own response to an invitation. */
export function isMeetingResponse(head: string): boolean {
  const line = (head ?? "").split("\n")[0] ?? "";
  if (!line) return false;
  // The head's subject rides after the em dash; a bare subject line counts too.
  const dash = line.indexOf("—");
  const subject = dash >= 0 ? line.slice(dash + 1) : line;
  return MEETING_RESPONSE_RE.test(`— ${subject.trim()}`);
}

// ── machinery, in one place (founder-decreed 2026-09-04) ────────────────────
// Three times now the same rule has been rebuilt one exception at a time: an
// auto-reply is not the client writing (8/22), then a courtesy sign-off
// (8/22), then a calendar acceptance (9/4) — and hours later a marketing MQL
// alert took the court on HR Hawaii and the row said "Answer Marketing. They
// wrote today." while the prospect had already accepted the invitation.
//
// So the rule stops being a list of exceptions and becomes one predicate.
// Machinery is anything that arrives in an inbox without a person deciding
// to write it: an out-of-office, a calendar response, a routed-lead alert, a
// delivery notice. It never opens a reply-owed and never resets a motion
// clock. It stays real for Sendbook warmth, which keeps its own reader —
// this suppresses the OBLIGATION, never the fact that something arrived.

const AUTO_REPLY_RE = /automatic reply|out of office|auto-?reply|autoreply/i;

// Delivery and routing notices every mail system emits.
const NOTICE_RE =
  /undeliverable|delivery (?:status notification|has failed|receipt)|read: |mail delivery|message blocked|quarantine/i;

// A routed lead or campaign alert. The 📣 marker is the marketing system's
// own; the phrase is the routing subject it ships with.
const CAMPAIGN_RE =
  /📣|new website or campaign response lead|campaign response|new (?:mql|lead) (?:routed|assigned)|marketplace partner:/i;

// Senders that are a mailbox or a department, never a person. Kept explicit
// and single-token on purpose: a real name has a first and a last, and a
// shared inbox that a human actually writes from is not on this list.
const MACHINE_SENDERS = new Set([
  "marketing",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "notification",
  "notifications",
  "alerts",
  "alert",
  "automated",
  "system",
  "mailer-daemon",
  "postmaster",
  "salesforce",
  "webmaster",
  "support",
  "info",
]);

/** Is this sender a mailbox or a department rather than a person? */
export function isMachineSender(sender: string): boolean {
  const s = (sender ?? "")
    .trim()
    .toLowerCase()
    .replace(/\+\d+\s*$/, "")
    .trim();
  if (!s) return false;
  const local = s.includes("@") ? (s.split("@")[0] ?? "") : s;
  return MACHINE_SENDERS.has(local.replace(/[^a-z-]/g, ""));
}

/** Everything that arrives without a person deciding to write it. The head
 *  is the note's first line; actors is its sender → recipient line. */
export function isMachinery(n: { body?: string; actors?: string }): boolean {
  const head = (n.body ?? "").split("\n")[0] ?? "";
  if (AUTO_REPLY_RE.test(head)) return true;
  if (NOTICE_RE.test(head)) return true;
  if (CAMPAIGN_RE.test(head)) return true;
  if (isMeetingResponse(head)) return true;
  return isMachineSender((n.actors ?? "").split("→")[0] ?? "");
}

// ── a release or a reschedule (the closer rule; pass 8 H6) ──────────────────
// "A promise closes only by delivery or explicit release; 'no rush, next
// month' is a reschedule." Nothing read either: a promise the client let go
// of, or pushed out, still turned PROMISED the moment its day passed, and the
// room told the operator to chase a thing the client had already waived.
//
// Conservative in the classifier's own way: a sentence counts only when it
// says the thing outright, and a sentence that asks anything never counts.
// The caller decides which promise a sentence speaks to; this reads only
// what the sentence says. A reschedule is read before a release, because
// "no need to rush" is a reschedule however it starts, and it is the softer
// read: the promise stays open.

export type Relief =
  | { kind: "release"; sentence: string }
  /** `day` is the new day the sentence names, yyyy-mm-dd; "" when it names
   *  none ("next month"), and the promise goes dayless. */
  | { kind: "defer"; day: string; sentence: string };

const DEFER_RE =
  /\b(?:no (?:rush|hurry)|no need to (?:rush|hurry)|take your time|(?:hold off|wait)(?: on (?:it|that|this|the [a-z]+))? (?:until|till|til)|can wait (?:until|till|til|for|a (?:week|month|bit|few))|(?:don'?t|do not) need (?:it|that|this|them|the [a-z]+) (?:until|till|til|before)|(?:next (?:week|month)|after the holidays|later this month|end of (?:the )?month) (?:is|works|would be) (?:fine|ok|okay|good|great|better)|(?:push|move) (?:it|that|this) (?:out |back )?to)\b/i;

const RELEASE_RE =
  /\b(?:no need (?:to|for)|disregard|never ?mind|(?:we|i) (?:no longer|don'?t|do not) need (?:it|that|this|those|them|the)|no longer (?:needed|necessary|required)|not (?:needed|necessary|required) (?:anymore|any more)|(?:cancel|scratch) (?:that|it|this)|you can (?:skip|drop) (?:it|that|this|the))\b/i;

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

const pad = (n: number) => String(n).padStart(2, "0");

/** The day a reschedule names, read against the Chicago day it was said:
 *  a numeric date, a month and a day, or a weekday (the next one after the
 *  day it was said). "" when it names none. */
function newDayIn(sentence: string, base: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return "";
  const year = Number(base.slice(0, 4));
  const onOrAfter = (m: number, d: number): string => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return "";
    const day = `${year}-${pad(m)}-${pad(d)}`;
    return day >= base ? day : `${year + 1}-${pad(m)}-${pad(d)}`;
  };
  const numeric = /\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/.exec(sentence);
  if (numeric) return onOrAfter(Number(numeric[1]), Number(numeric[2]));
  const named =
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(
      sentence,
    );
  if (named)
    return onOrAfter(
      MONTHS.indexOf(named[1].toLowerCase() as (typeof MONTHS)[number]) + 1,
      Number(named[2]),
    );
  const weekday = /\b(monday|tuesday|wednesday|thursday|friday)\b/i.exec(sentence);
  if (weekday) {
    const want = WEEKDAYS.indexOf(weekday[1].toLowerCase());
    const t = new Date(`${base}T12:00:00Z`);
    for (let i = 1; i <= 7; i++) {
      const d = new Date(t.getTime() + i * 86_400_000);
      if (d.getUTCDay() === want) return d.toISOString().slice(0, 10);
    }
  }
  return "";
}

/** Does this message let go of a promise, or push it out? `day` is the
 *  Chicago day the message was written, the day a named weekday counts
 *  from. The first sentence that says either outright is the answer; a
 *  question never is. */
export function readRelease(text: string, day: string): Relief | null {
  for (const raw of (text ?? "").split(/\n|(?<=[.!?])\s+/)) {
    const sentence = raw.replace(/\s+/g, " ").trim();
    if (!sentence || sentence.includes("?")) continue;
    if (DEFER_RE.test(sentence))
      return { kind: "defer", day: newDayIn(sentence, day), sentence };
    if (RELEASE_RE.test(sentence)) return { kind: "release", sentence };
  }
  return null;
}

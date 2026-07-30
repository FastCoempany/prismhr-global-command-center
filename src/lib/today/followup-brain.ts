// The follow-up's own read. A chase you type is a sentence about somebody —
// "chase Bryce at Advocate Pay for the signed SOW" — and the app should not make
// you file that twice. This module is the pure half: given the sentence and the
// book, it names the accounts and partners it recognises, and it flags a name it
// has never seen so the operator can decide whether a new deal just walked in.
//
// Nothing here touches the database. The server action does the writing; this
// file only reads a string.

import { COUNTRY_NAME } from "@/lib/intel/lexicon";

export type FollowUpHit = { id: string; name: string };

export type FollowUpRead = {
  // Book accounts named in the chase — these get the note and the action.
  accounts: FollowUpHit[];
  // Partners named in the chase — these get a partner note.
  partners: string[];
  // Capitalised names the book has never heard of. A candidate is a question,
  // never an assumption: the operator confirms before anything joins the board.
  candidates: string[];
};

// Words that start a sentence or a chase and mean nothing on their own. A chase
// almost always opens with a verb, and a verb is not a company.
const STOP = new Set(
  [
    "chase",
    "call",
    "email",
    "text",
    "ping",
    "ask",
    "send",
    "get",
    "follow",
    "check",
    "confirm",
    "book",
    "schedule",
    "remind",
    "tell",
    "draft",
    "write",
    "review",
    "read",
    "look",
    "find",
    "make",
    "build",
    "fix",
    "close",
    "open",
    "start",
    "finish",
    "need",
    "needs",
    "want",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "with",
    "for",
    "from",
    "to",
    "on",
    "in",
    "at",
    "by",
    "about",
    "into",
    "over",
    "after",
    "before",
    "today",
    "tomorrow",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "sept",
    "oct",
    "nov",
    "dec",
    "january",
    "february",
    "march",
    "april",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "eor",
    "cm",
    "hr",
    "us",
    "usa",
    "uk",
    "sow",
    "msa",
    "nda",
    "sf",
    "salesforce",
    "prismhr",
    "prism",
    "teams",
    "outlook",
    "zoom",
    "demo",
    "payroll",
    "contractor",
    "contractors",
    "invoice",
    "quote",
    "pricing",
    "proposal",
    "contract",
    "meeting",
    "call",
    "notes",
    "note",
    "deck",
    "form",
    "intake",
    "i",
    "me",
    "my",
    "we",
    "our",
    "he",
    "she",
    "they",
    "them",
    "his",
    "her",
    "their",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "if",
    "then",
    "when",
    "who",
    "what",
    "why",
    "how",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "do",
    "does",
    "did",
    "can",
    "could",
    "will",
    "would",
    "should",
    "must",
    "have",
    "has",
    "had",
    "up",
    "out",
    "back",
    "down",
    "off",
    "again",
    "still",
    "yet",
    "not",
    "no",
    "yes",
    "ok",
    "okay",
    "asap",
    "eod",
    "eow",
    "am",
    "pm",
  ].map((w) => w.toLowerCase()),
);

// Punctuation and possessives off, case folded. "Advocate Pay's" → "advocate pay".
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Company suffixes carry no identity — "Simploy Inc" and "Simploy" are one deal.
const SUFFIX = /\b(inc|llc|corp|corporation|co|ltd|limited|group|holdings|hq)\b/g;

function key(s: string): string {
  return fold(s).replace(SUFFIX, "").replace(/\s+/g, " ").trim();
}

// A name matches when the chase contains it whole — word-bounded, so "ESC" never
// fires on "escalate" and "Pay" never fires on "payroll".
function mentions(haystack: string, name: string): boolean {
  const n = key(name);
  if (n.length < 3) return false;
  return new RegExp(`(?:^| )${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`).test(
    haystack,
  );
}

// Capitalised runs in the ORIGINAL text: "Bryce Rowley", "Advocate Pay", "Acme".
// Sentence-initial words are kept — a chase often opens with the name — but the
// stop list throws out the verbs that open most of them.
function capitalRuns(raw: string): string[] {
  const runs: string[] = [];
  for (const m of raw.matchAll(
    /\b[A-Z][A-Za-z0-9&.'’-]*(?:\s+[A-Z][A-Za-z0-9&.'’-]*)*/g,
  )) {
    const run = m[0].trim();
    if (!run) continue;
    // An ALL-CAPS shout ("TO DO", "ASAP") is emphasis, not a name.
    if (run === run.toUpperCase() && run.replace(/[^A-Za-z]/g, "").length <= 4) continue;
    const words = run.split(/\s+/).filter((w) => !STOP.has(fold(w)));
    if (!words.length) continue;
    const kept = words.join(" ");
    if (fold(kept).length < 3) continue;
    runs.push(kept);
  }
  return runs;
}

// Countries carry the same shape as company names in a sentence — capitalised,
// often two words — so the read has to know them by name or it will ask whether
// Costa Rica should join the board. The vocabulary is the app's own.
const PLACES = new Set(
  [
    ...Object.values(COUNTRY_NAME),
    "United States",
    "America",
    "Latam",
    "Latin America",
    "Emea",
    "Apac",
    "Europe",
    "Asia",
    "Africa",
  ].map((c) => key(c)),
);

// Corporate tells: a word that only ever appears in a company's name.
const ORG_WORD =
  /\b(inc|llc|corp|corporation|co|ltd|limited|group|holdings|partners|solutions|services|staffing|payroll|hr|peo|technologies|tech|systems|labs|logistics|industries|consulting|management)\b/i;

// One capitalised word is usually a first name, a city, or the start of a
// sentence — too thin to interrupt the operator over. A candidate has to carry
// either two capitalised words or a corporate tell before it earns the question.
function looksLikeOrg(run: string): boolean {
  if (ORG_WORD.test(run)) return true;
  return run.trim().split(/\s+/).length >= 2;
}

// Read a chase against the book. `onBoard` is the set of card names already on
// the board — a known account that isn't on the board is still a candidate,
// because the operator may want a row for the deal this chase just started.
export function readFollowUp(
  label: string,
  accounts: { id: string; name: string }[],
  partners: string[],
): FollowUpRead {
  const flat = key(label);
  const hitAccounts: FollowUpHit[] = [];
  for (const a of accounts) {
    if (mentions(flat, a.name)) hitAccounts.push({ id: a.id, name: a.name });
  }
  // Longest name wins when two book entries nest ("Simploy" inside "Simploy HR").
  hitAccounts.sort((x, y) => y.name.length - x.name.length);
  const claimed = new Set<string>();
  const accountsOut: FollowUpHit[] = [];
  for (const h of hitAccounts) {
    if ([...claimed].some((c) => c.includes(key(h.name)))) continue;
    claimed.add(key(h.name));
    accountsOut.push(h);
  }

  const partnersOut = partners.filter((p) => {
    // Partners are people — match the full name, or a distinctive surname.
    if (mentions(flat, p)) return true;
    const last = p.split(/\s+/).slice(-1)[0] ?? "";
    return last.length >= 4 && mentions(flat, last);
  });

  const known = [
    ...accountsOut.map((a) => key(a.name)),
    ...partnersOut.map((p) => key(p)),
    ...partnersOut.flatMap((p) => p.split(/\s+/).map(key)),
  ].filter(Boolean);

  const candidates: string[] = [];
  for (const run of capitalRuns(label)) {
    const k = key(run);
    if (!k || k.length < 3) continue;
    if (known.some((n) => n.includes(k) || k.includes(n))) continue;
    // Names already claimed by the book in any casing aren't new.
    if (accounts.some((a) => key(a.name) === k)) continue;
    if (candidates.some((c) => key(c) === k)) continue;
    // A place is not a company. "their Brazil hires" names a country, and the
    // operator should never be asked whether Brazil belongs on the board.
    if (PLACES.has(k)) continue;
    if (!looksLikeOrg(run)) continue;
    candidates.push(run);
  }
  return { accounts: accountsOut, partners: partnersOut, candidates };
}

// ── the marker grammar ────────────────────────────────────────────────────────
// A follow-up's `detail` field carries what the brain already did, so the read
// never repeats itself and a dismissed suggestion stays dismissed. The markers
// live at the end of the string and never reach the operator's eye.
//
//   ⇢[a:001x,a:002y]  — filed to these accounts already
//   ✗[acme,globex]    — these candidates were waved off

const ROUTED_RE = /⇢\[([^\]]*)\]/;
const WAVED_RE = /✗\[([^\]]*)\]/;

export function routedIds(detail: string): string[] {
  const m = ROUTED_RE.exec(detail ?? "");
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^a:/, ""))
    .filter(Boolean);
}

export function wavedNames(detail: string): string[] {
  const m = WAVED_RE.exec(detail ?? "");
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stripMarkers(detail: string): string {
  return (detail ?? "")
    .replace(ROUTED_RE, "")
    .replace(WAVED_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function withMarkers(detail: string, routed: string[], waved: string[]): string {
  const base = stripMarkers(detail);
  const parts = [base];
  if (routed.length)
    parts.push(`⇢[${[...new Set(routed)].map((r) => `a:${r}`).join(",")}]`);
  if (waved.length) parts.push(`✗[${[...new Set(waved.map(key))].join(",")}]`);
  return parts.filter(Boolean).join(" ").trim();
}

// The candidates still worth asking about: spotted, not already waved off, and
// not already a card on the board.
export function openCandidates(
  read: FollowUpRead,
  detail: string,
  onBoard: string[],
): string[] {
  const waved = new Set(wavedNames(detail));
  const board = onBoard.map(key);
  return read.candidates.filter(
    (c) => !waved.has(key(c)) && !board.some((b) => b === key(c)),
  );
}

// A manual follow-up is one the operator armed by hand — never a cadence thread.
export function isManual(subjectKey: string): boolean {
  return subjectKey.startsWith("manual:");
}

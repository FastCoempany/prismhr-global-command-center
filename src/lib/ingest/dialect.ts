// The dialect module — one home for the capture head alphabet, one sniff, the
// source-literal table and the predicates over it (the Chute brains refactor
// plan, §2.3; slice 1). Pure on purpose: nothing here imports app code, so the
// room's actions, the fingerprint, the SF parser, the legacy inference, the
// Sendbook, Groundwork, the pipeline and the mirror all read one alphabet
// instead of each carrying a copy of it.
//
// The note head itself is NOT written here. roomPaste writes
// `${glyph} ${dialect} ${when} — ${subject} · ${actors}` exactly as it always
// has (src/app/room/actions.ts), and every producer keeps its own head line;
// this module is what reads them.

// ── The heads the producers write on a capture's first line ────────────────
// The .eml and .msg readers and the Outlook bookmarklet write OUTLOOK THREAD;
// the Teams bookmarklet writes TEAMS THREAD and a hand copy of a chat window
// may say TEAMS CHAT; the .vtt and transcript-document readers write CALL
// TRANSCRIPT; the Sales Navigator bookmarklet writes SALESNAV ACCOUNTS; the
// sheet reader writes SPREADSHEET; the document reader writes DOCUMENT; and
// TYPED NOTE is the head a note typed at the row carries (ruled 2026-09-25,
// D14 — CLAUDE.md, The Chute).
export const HEADS = {
  outlook: "OUTLOOK THREAD",
  teams: "TEAMS THREAD",
  teamsChat: "TEAMS CHAT",
  call: "CALL TRANSCRIPT",
  salesnav: "SALESNAV",
  spreadsheet: "SPREADSHEET",
  document: "DOCUMENT",
  typed: "TYPED NOTE",
} as const;

export type Head = (typeof HEADS)[keyof typeof HEADS];

/** Every head, in the table's order. */
export const HEAD_LIST: readonly Head[] = Object.values(HEADS);

// ── The dialect token the note head carries after the glyph ────────────────
// SF is the Salesforce activity timeline and the token every capture without
// a head of its own files under: a spreadsheet, a document and a typed note
// keep the SF token on the head so no legacy reader learns a new one; what
// they were is in the source column (SOURCE_OF below).
export const DIALECTS = ["SF", "OL", "TM", "CT", "SN"] as const;

export type Dialect = (typeof DIALECTS)[number];

const DIALECT_OF_HEAD: Readonly<Record<Head, Dialect>> = {
  [HEADS.outlook]: "OL",
  [HEADS.teams]: "TM",
  [HEADS.teamsChat]: "TM",
  [HEADS.call]: "CT",
  [HEADS.salesnav]: "SN",
  [HEADS.spreadsheet]: "SF",
  [HEADS.document]: "SF",
  [HEADS.typed]: "SF",
};

/** `^HEAD\b` — the head token at the start of a line, as a whole word. */
export const headRe = (head: Head, flags = ""): RegExp =>
  new RegExp(`^${head}\\b`, flags);

const HEAD_RES: readonly [Head, RegExp][] = HEAD_LIST.map((h) => [h, headRe(h)]);

/** The head line any producer writes — the fingerprint skips it, because it
 *  carries the filename or the copy moment, never the capture. */
export const HEAD_LINE_RE = new RegExp(`^(${HEAD_LIST.join("|")})\\b`);

/** The capture's dialect, read off its head token, and the head found. A
 *  capture with no head is Salesforce activity. */
export function sniffHead(text: string): { dialect: Dialect; head: Head | null } {
  const t = (text ?? "").trimStart();
  for (const [head, re] of HEAD_RES)
    if (re.test(t)) return { dialect: DIALECT_OF_HEAD[head], head };
  return { dialect: "SF", head: null };
}

// ── The source column ──────────────────────────────────────────────────────
// What a filed row's source column says. The first eight are roomPaste's, by
// dialect and head, each with "-ai" when the model read the capture; the rest
// are the fixed literals the other writers store.
export const SOURCES = {
  // roomPaste, by dialect and head (SOURCE_OF)
  outlook: "outlook",
  teams: "teams",
  call: "call",
  salesnav: "salesnav",
  sf: "sf",
  spreadsheet: "spreadsheet",
  doc: "doc",
  typed: "typed",
  // the other writers' fixed literals
  transcript: "transcript",
  outcome: "outcome",
  room: "room",
  research: "research",
  gap: "gap",
  playbook: "playbook",
  activity: "activity",
  wire: "wire",
  sendbook: "sendbook",
  actLane: "act-lane",
  scratch: "scratch",
  touch: "touch",
  move: "move",
  done: "done",
  followup: "followup",
  disposition: "disposition",
  sheet: "sheet", // the room's routed line (sheet-actions.ts), never a spreadsheet
  pipeline: "pipeline",
  mailTemplate: "mail-template",
} as const;

export type Source = (typeof SOURCES)[keyof typeof SOURCES];

/** The suffix a source carries when the model read the capture. */
export const READ_SUFFIX = "-ai";

/** The source literal roomPaste stores for a capture: the dialect's own name,
 *  the head's when the dialect is SF and the head says more (a spreadsheet, a
 *  document, a typed note), with the model's suffix when the read was the
 *  model's. */
export function SOURCE_OF(dialect: Dialect, head: Head | null, how: string): string {
  const base =
    dialect === "OL"
      ? SOURCES.outlook
      : dialect === "TM"
        ? SOURCES.teams
        : dialect === "CT"
          ? SOURCES.call
          : dialect === "SN"
            ? SOURCES.salesnav
            : head === HEADS.spreadsheet
              ? SOURCES.spreadsheet
              : head === HEADS.document
                ? SOURCES.doc
                : head === HEADS.typed
                  ? SOURCES.typed
                  : SOURCES.sf;
  return how === "ai" ? `${base}${READ_SUFFIX}` : base;
}

/** A source literal without the model's suffix. */
const baseOf = (src: string): string =>
  src.endsWith(READ_SUFFIX) ? src.slice(0, -READ_SUFFIX.length) : src;

/** The call read's entries: the ☎ CT rows the read filed off a recording. */
export const isCall = (src: string | undefined | null): boolean =>
  baseOf(src ?? "") === SOURCES.call;

/** The tape: the archive of a call's whole conversation, and the room's
 *  zero-entry fallback, both filed under "transcript". Source alone does not
 *  prove a call — the body has to read like one (src/lib/intel/meeting.ts). */
export const isTape = (src: string | undefined | null): boolean =>
  (src ?? "") === SOURCES.transcript;

/** The Sales Navigator grab, read by its own parser, never the mail corpus. */
export const isSalesNav = (src: string | undefined | null): boolean =>
  (src ?? "").startsWith(SOURCES.salesnav);

/** A wire item the operator filed onto the record. */
export const isWire = (src: string | undefined | null): boolean =>
  (src ?? "") === SOURCES.wire;

const PASTE_BASES: ReadonlySet<string> = new Set<string>([
  SOURCES.sf,
  SOURCES.outlook,
  SOURCES.teams,
  SOURCES.spreadsheet,
  SOURCES.doc,
  SOURCES.typed,
  SOURCES.transcript,
  SOURCES.room,
]);

/** A record entry the paste pipeline filed as text — Salesforce activity, an
 *  Outlook or Teams thread, a spreadsheet, a document or a typed note — or
 *  its transcript archive, or a room note. The call read's entries and the
 *  Sales Nav grab have predicates of their own (isCall, isSalesNav): the file
 *  card counts the grab apart, and the archive stands for the call. */
export const isPaste = (src: string | undefined | null): boolean =>
  PASTE_BASES.has(baseOf(src ?? ""));

// ── The glyphs and the head grammar the readers parse ──────────────────────
// roomPaste heads an entry with the glyph of its kind — ✉ email, ✔ task,
// ☎ call — and the archive with ☰. The glyph line in roomPaste is the writer;
// these are the readers' alphabet.
export const GLYPHS = {
  email: "✉",
  task: "✔",
  call: "☎",
  archive: "☰",
} as const;

/** The four record glyphs as a character-class body: "✉✔☎☰". */
export const GLYPH_CLASS = `${GLYPHS.email}${GLYPHS.task}${GLYPHS.call}${GLYPHS.archive}`;

/** A glyph-headed record entry or archive: the mail corpus, the Sendbook and
 *  Groundwork's conversation test all gate on this. */
export const GLYPH_RE = new RegExp(`^[${GLYPH_CLASS}] `, "u");

/** The entry glyphs — the archive's ☰ head carries no dialect token and no
 *  actors, so legacy inference never reads it. */
const ENTRY_GLYPH_CLASS = `${GLYPHS.email}${GLYPHS.task}${GLYPHS.call}`;

/** "SF|OL|TM|CT|SN" — the dialect alternation the head regexes share. */
export const DIALECT_ALT = DIALECTS.join("|");

/** A filed head, "✉ SF Jul 22 4:11 PM — Subject · A → B +2", with the actors
 *  captured — legacy inference for rows filed before the actors column (ruled
 *  2026-09-25, D23). The alphabet is the whole one: CT and SN heads infer
 *  like the other three. */
export const LEGACY_HEAD_RE = new RegExp(
  `^[${ENTRY_GLYPH_CLASS}] (?:${DIALECT_ALT}) [^—\\n]*— .*? · (.+?)$`,
  "mu",
);

/** The start of a filed head — the test for "a paste-filed entry" on a legacy
 *  row whose lane column is empty. */
export const LEGACY_HEAD_START_RE = new RegExp(
  `^[${ENTRY_GLYPH_CLASS}] (?:${DIALECT_ALT}) `,
  "u",
);

/** A filed head with the subject captured. */
export const LEGACY_SUBJECT_RE = new RegExp(
  `^[${ENTRY_GLYPH_CLASS}] (?:${DIALECT_ALT}) [^—\\n]*— (.*?) · [^·\\n]*$`,
  "mu",
);

/** A tape's head line: the CALL TRANSCRIPT head the .vtt and document readers
 *  write, or the room's own archive head "☰ Call transcript — …". */
export const TAPE_HEAD_RE = new RegExp(
  `^\\s*(?:${GLYPHS.archive}\\s*)?${HEADS.call}\\b`,
  "i",
);

/** The same head on any line of a body. */
export const TAPE_HEAD_IN_BODY_RE = new RegExp(TAPE_HEAD_RE.source, "im");

// The Sendbook's grammar — pure, testable. One merged view of outreach from
// the two doors the app holds (Ted doctrine: the widest live source, merged,
// never a private narrow one): the record's own outbound entries — a dropped
// .eml, a filed send — and the Channel Ask's tapped stamps, filed as
// sendbook:<accountId> notes for the channels that leave no file behind.
// Steps are counted per run, never asked; lanes are decreed by the record's
// own warmth (founder-decreed 2026-08-19): NEVER MET means they have never
// replied and no meeting was ever held — the operator's outbound never warms
// an account, and a CSM intro doesn't either.
//
// The record arrives as the single account read's docs (src/lib/record/read.ts;
// the Chute brains refactor plan, §2.2, slice 13). Every fact the register
// used to re-derive from a row — who sent it, whose side they are on, whether
// a machine wrote it, whether it is a sign-off, when it actually went — is a
// flag on the doc, read once for every surface, so the lane the Sendbook
// shows and the move the room shows stand on the same reading of the same
// row. The second record folds in through the read's own `secondRecord`.

import { GLYPH_CLASS } from "@/lib/ingest/dialect";
import { MINE_RE } from "@/lib/intel/provenance";
import { isMeetingNote } from "@/lib/intel/meeting";
import { csms } from "@/lib/book";
import { personKey } from "@/lib/book/contacts";
import type { SecondRecord } from "@/lib/activity/read";
import { docOf, type RecordDoc } from "@/lib/record/docs";
import { selfAddressed } from "@/lib/room/touch";

export const SENDBOOK_NS = "sendbook:";

export const CHANNELS = [
  "EMAIL",
  "CALL",
  "VOICEMAIL",
  "TEXT",
  "LINKEDIN",
  "INMAIL",
  "ENGAGED",
  "CONNECT",
  "VIDEO",
  "EVENT",
  "MAILER",
  "INTRO",
  "CSM RELAY",
] as const;
export type Channel = (typeof CHANNELS)[number];

// A quiet gap this long ends a run — the next send starts a fresh drum at
// step 1. Shares Groundwork's cold line by design.
const RUN_RESET_DAYS = 45;

const DAY = 86_400_000;
const CHI = "America/Chicago";

type SendLine = {
  accountId: string;
  at: string; // ISO
  channel: Channel;
  contact: string; // "" when unknown
  clause: string; // the move worked, or the record entry's own head
  from: "tap" | "record";
  step: number; // position within its run, 1-based
  repliedAt: string; // ISO of the first genuine inbound after this send, or ""
};

type AccountLane = "never-met" | "gone-cold";

// ── The tap store's spelling ────────────────────────────────────────────────

export function sendbookNoteBody(
  channel: Channel,
  contact: string,
  clause: string,
): string {
  const head = `⌁ SEND ${channel}${contact ? ` · ${contact.slice(0, 60)}` : ""}`;
  return clause ? `${head}\n${clause.slice(0, 160)}` : head;
}

export function parseSendbookBody(
  body: string,
): { channel: Channel; contact: string; clause: string } | null {
  const lines = (body ?? "").split("\n");
  const m = /^⌁ SEND ([A-Z ]+?)(?: · (.+))?$/.exec(lines[0]?.trim() ?? "");
  if (!m) return null;
  const channel = m[1].trim() as Channel;
  if (!(CHANNELS as readonly string[]).includes(channel)) return null;
  return { channel, contact: (m[2] ?? "").trim(), clause: (lines[1] ?? "").trim() };
}

// ── Reading the record's own traffic ────────────────────────────────────────

/** A record row as a page or a fixture holds it before the read: the rows
 *  door. `docsFromRows` turns these into the same docs the read builds, so a
 *  register built from rows and one built from the read are one register. */
export type NoteLike = {
  body: string;
  source: string;
  createdAt: string;
  actors?: string;
};

/** The rows door: the same doc the read builds for a row, flagged by the same
 *  predicates, with the declared roster as our side (the book's CSM column by
 *  default, which is what the register read before the docs). Nothing here is
 *  hidden — a caller with ✕-parks hands the read's docs instead. */
export function docsFromRows(
  notes: readonly NoteLike[],
  homeSide: readonly string[] = csms,
): RecordDoc[] {
  const none = new Set<string>();
  return notes.map((n) =>
    docOf(
      {
        id: "",
        body: n.body,
        createdAt: n.createdAt,
        kind: "account",
        actors: n.actors,
        source: n.source,
      },
      homeSide,
      none,
    ),
  );
}

/** A row or a doc: the three readers below take either. The rows door stays
 *  for the callers the single read has not reached yet — the Accounts sheet's
 *  engaged read (slice 15), the activity run's context pack and the HomeRoom's
 *  seat read — and a row goes through the same `docOf` the read uses, so the
 *  answer is the read's whichever door it came in by. */
export type RowOrDoc = RecordDoc | NoteLike;

const asDocs = (list: readonly RowOrDoc[]): readonly RecordDoc[] => {
  if (list.length === 0) return [];
  // A doc carries `text`; a row carries `body`. One list is one kind.
  if ("text" in list[0]) return list as readonly RecordDoc[];
  return docsFromRows(list as readonly NoteLike[]);
};

/** The doc records a meeting — the one shared spelling, over the doc's own
 *  text and source (src/lib/intel/meeting.ts). */
const isMeetingDoc = (d: RecordDoc): boolean =>
  isMeetingNote({ body: d.text, source: d.source });

// The record's outbound sends — the operator's own: a doc the read marked
// outbound whose sender is the operator, that is not a meeting record (nobody
// "sends" a meeting that already happened) and not addressed to nobody but
// the operator (a self-assigned Salesforce task never reached the account;
// pass 2 B, row 1), at the doc's effective moment. A ✕-parked row leaves
// every register view, here too.
export function recordSends(
  list: readonly RowOrDoc[],
): { at: string; head: string; who: string }[] {
  const out: { at: string; head: string; who: string }[] = [];
  for (const d of asDocs(list)) {
    if (d.hidden || d.direction !== "out") continue;
    if (!MINE_RE.test(d.sender)) continue;
    if (isMeetingDoc(d) || selfAddressed(d.actors)) continue;
    const arrow = d.actors.indexOf("→");
    const who = d.actors
      .slice(arrow + 1)
      .replace(/\+\d+\s*$/, "")
      .trim();
    out.push({ at: d.at, head: d.text.split("\n")[0] ?? "", who });
  }
  return out;
}

// Their voice: a person wrote it, the person is not ours, and no machine sent
// it. An unattributed document is never their voice (Ted doctrine); a CSM's
// never warms — NEVER MET means THEY have never replied, and a colleague
// writing about the account is coordination, not the account speaking
// (decreed 2026-08-19; "their voice" means the PEO's own people, C16). The
// roster behind `senderIsHome` is the declared one — the CSM column unioned
// with everyone the record shows working across several accounts — so the
// lane and the room's move agree on who is ours.
//
// Machinery never warms and never replies (ruled 2026-09-25, C5): a calendar
// acceptance, a bounce, a campaign alert — anything that arrived without a
// person deciding to write it — is the app's one machinery predicate, read
// once onto the doc (src/lib/intel/closer.ts).
const theirVoice = (d: RecordDoc): boolean =>
  !d.hidden && !!d.sender && !d.senderIsHome && !d.machinery;

/** The moments the account's side spoke or met — the lane's warmth. A
 *  courtesy sign-off is their voice still (the closer rule; C4): it warms and
 *  resets the drum, so the closer flag is not read here. A meeting warms
 *  whoever filed it. */
export function warmDates(list: readonly RowOrDoc[]): string[] {
  const out: string[] = [];
  for (const d of asDocs(list)) {
    if (d.hidden) continue;
    if (isMeetingDoc(d) || theirVoice(d)) out.push(d.at);
  }
  return out;
}

/** Inbound moments only — the reply annotations read these. ↩ REPLIED needs a
 *  substantive inbound (C4): a doc the read marked `in`, which is attributed,
 *  addressed to us, not machinery and not a sign-off, from their voice. A
 *  meeting warms the lane but is not "they wrote back", and neither is
 *  "Thanks!". */
export function inboundDates(list: readonly RowOrDoc[]): string[] {
  const out: string[] = [];
  for (const d of asDocs(list)) {
    if (d.direction !== "in" || !theirVoice(d) || isMeetingDoc(d)) continue;
    out.push(d.at);
  }
  return out;
}

// The record entry's head, cleaned into a short clause: glyph and routing
// dropped, subject kept.
const LEADING_GLYPH_RE = new RegExp(`^[${GLYPH_CLASS}]\\s*`, "u");
export function clauseFromHead(head: string): string {
  const noGlyph = head.replace(LEADING_GLYPH_RE, "");
  // "OL Aug 17 1:33 PM — Re: Subject · A → B +4" → "Re: Subject"
  const dash = noGlyph.indexOf("—");
  let s = dash >= 0 ? noGlyph.slice(dash + 1) : noGlyph;
  const dot = s.indexOf(" · ");
  if (dot >= 0) s = s.slice(0, dot);
  return s.trim().slice(0, 120);
}

const chiDay = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: CHI });
};

// ── The merge ───────────────────────────────────────────────────────────────

/** One account's record as the register reads it: the read's docs and its
 *  second record (fields 1 and 17 of src/lib/record/read.ts). An AccountRead
 *  satisfies this as it stands; a fixture hands `docsFromRows` and null. */
export type SendbookRead = {
  docs: readonly RecordDoc[];
  secondRecord?: SecondRecord | null;
};

type SendbookInput = {
  /** The reads by REAL account id — the record and its second record. */
  readsById: Map<string, SendbookRead>;
  // sendbook:<id> notes keyed by the REAL account id — the taps.
  tapsById: Map<string, NoteLike[]>;
  now: Date;
};

/** The second record's signals for one account. Their voice warms whoever's
 *  inbox caught it, but only an attributed inbound body is their voice
 *  (ruled 2026-09-25, D19): the rollup's `lastTheirs` — a row whose writer
 *  is on their side and whose subject and body passed the machinery and
 *  closer reads — sets the lane and ↩ REPLIED; the account-level Last Email
 *  Received is a datetime and sets neither. A day key is a calendar fact and
 *  reads at the noon anchor every day-only entry in the record reads at. The
 *  live marketing cadence marks the line; it informs, never blocks. */
export function orgSignalsOf(sr: SecondRecord | null | undefined): {
  theirsAt: string;
  mktgLive: boolean;
} {
  const day = sr?.rollup?.lastTheirs?.day ?? "";
  const theirsAt = /^\d{4}-\d{2}-\d{2}/.test(day)
    ? `${day.slice(0, 10)}T12:00:00.000Z`
    : "";
  const mktgLive = (sr?.intent?.windows.w7?.s ?? 0) > 0;
  return { theirsAt, mktgLive };
}

export type Sendbook = {
  lines: SendLine[]; // newest first
  laneById: Map<string, AccountLane>;
};

export function buildSendbook(inp: SendbookInput): Sendbook {
  const accountIds = new Set<string>([...inp.tapsById.keys()]);
  for (const [id, read] of inp.readsById) {
    if (recordSends(read.docs).length > 0) accountIds.add(id);
  }

  const lines: SendLine[] = [];
  const laneById = new Map<string, AccountLane>();

  for (const id of accountIds) {
    const read = inp.readsById.get(id);
    const docs = read?.docs ?? [];
    // Their voice warms, no matter whose inbox caught it: the second
    // record's attributed inbound joins the warm and inbound sets, merged by
    // latest (D19 gates what counts). Runs reset on it, replies annotate from
    // it, and the lane flips on it.
    const { theirsAt } = orgSignalsOf(read?.secondRecord);
    const warm = [...warmDates(docs), ...(theirsAt ? [theirsAt] : [])].sort();
    const inbound = [...inboundDates(docs), ...(theirsAt ? [theirsAt] : [])].sort();
    laneById.set(id, warm.length > 0 ? "gone-cold" : "never-met");

    type Raw = Omit<SendLine, "step" | "repliedAt">;
    const raw: Raw[] = [];
    for (const n of inp.tapsById.get(id) ?? []) {
      const p = parseSendbookBody(n.body);
      if (!p) continue;
      raw.push({
        accountId: id,
        at: n.createdAt,
        channel: p.channel,
        contact: p.contact,
        clause: p.clause,
        from: "tap",
      });
    }
    for (const s of recordSends(docs)) {
      raw.push({
        accountId: id,
        at: s.at,
        channel: "EMAIL",
        contact: s.who,
        clause: clauseFromHead(s.head),
        from: "record",
      });
    }
    raw.sort((a, b) => a.at.localeCompare(b.at));

    // Dedupe: a tapped EMAIL on the same Chicago day as a record send is the
    // same touch — the artifact wins, the tap folds into it.
    const recordDays = new Set(
      raw.filter((r) => r.from === "record").map((r) => chiDay(r.at)),
    );
    const merged = raw.filter(
      (r) => !(r.from === "tap" && r.channel === "EMAIL" && recordDays.has(chiDay(r.at))),
    );

    // Steps per run: a fresh drum after a long quiet gap, or after they spoke
    // (a warm event between two sends means the next send opens a new run).
    let step = 0;
    let prevAt = "";
    const stepped: SendLine[] = merged.map((r) => {
      const gapReset =
        prevAt && (Date.parse(r.at) - Date.parse(prevAt)) / DAY > RUN_RESET_DAYS;
      const warmBetween = prevAt && warm.some((w) => w > prevAt && w < r.at);
      step = !prevAt || gapReset || warmBetween ? 1 : step + 1;
      prevAt = r.at;
      return { ...r, step, repliedAt: "" };
    });

    // Reply annotations: each genuine inbound answers the newest send before
    // it — one annotation per send, first inbound wins.
    for (const inAt of inbound) {
      let best: SendLine | null = null;
      for (const s of stepped) {
        if (s.at < inAt && (!best || s.at > best.at)) best = s;
      }
      if (best && !best.repliedAt) best.repliedAt = inAt;
    }

    lines.push(...stepped);
  }

  lines.sort((a, b) => b.at.localeCompare(a.at));
  return { lines, laneById };
}

// ── The week head ───────────────────────────────────────────────────────────

// Chicago week, Monday-anchored — "THIS WEEK" is the working week, not a
// rolling window.
function chicagoWeekStart(now: Date): number {
  const dayKey = now.toLocaleDateString("en-CA", { timeZone: CHI });
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat
  const back = (weekday + 6) % 7; // days since Monday
  // Chicago midnight of dayKey, approximated via the day key itself: compare
  // by day keys, not clock instants, so DST never shifts the boundary.
  const start = new Date(`${dayKey}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - back);
  return start.getTime() - 12 * 3_600_000; // back to that day's 00:00 UTC anchor
}

type WeekStats = {
  total: number;
  byChannel: [Channel, number][]; // descending
  accounts: number;
  replied: number;
  neverMet: number;
  goneCold: number;
};

export function weekStats(book: Sendbook, now: Date): WeekStats {
  const startKey = new Date(chicagoWeekStart(now) + 12 * 3_600_000)
    .toISOString()
    .slice(0, 10);
  const inWeek = book.lines.filter((l) => chiDay(l.at) >= startKey);
  const byCh = new Map<Channel, number>();
  const accts = new Set<string>();
  let replied = 0;
  for (const l of inWeek) {
    byCh.set(l.channel, (byCh.get(l.channel) ?? 0) + 1);
    accts.add(l.accountId);
    if (l.repliedAt) replied += 1;
  }
  let neverMet = 0;
  let goneCold = 0;
  for (const id of accts) {
    if (book.laneById.get(id) === "gone-cold") goneCold += 1;
    else neverMet += 1;
  }
  return {
    total: inWeek.length,
    byChannel: [...byCh.entries()].sort((a, b) => b[1] - a[1]),
    accounts: accts.size,
    replied,
    neverMet,
    goneCold,
  };
}

// "Cristina Bouchard" → "CRISTINA B." — the wing subtext's short name.
// ── The who chip row (ruled 2026-09-25, C18) ────────────────────────────────
// The Channel Ask's second row offers the record's people merged with the
// book's contacts and asks only when the merged set holds more than one name.
// The record first, most-seen first, as the read orders them; the roster
// fills in behind, one spelling per person, so "Dana M. Reyes" on a thread
// and "Dana Reyes" in the book are one name and the row never asks between
// a person and herself.

export function whoChipNames(
  people: readonly { name: string }[],
  contacts: readonly { first?: string; last?: string }[],
  cap = 6,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const full = raw.replace(/\s+/g, " ").trim();
    if (!full) return;
    const key = personKey(full) || full.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(full);
  };
  for (const p of people) add(p.name);
  for (const c of contacts) add(`${c.first ?? ""} ${c.last ?? ""}`);
  return out.slice(0, cap);
}

export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].toUpperCase();
  return `${parts[0]} ${parts[parts.length - 1][0]}.`.toUpperCase();
}

// The Sendbook's grammar — pure, testable. One merged view of outreach from
// the two doors the app holds (Ted doctrine: the widest live source, merged,
// never a private narrow one): the record's own outbound entries — a dropped
// .eml, a filed send — and the Channel Ask's tapped stamps, filed as
// sendbook:<accountId> notes for the channels that leave no file behind.
// Steps are counted per run, never asked; lanes are decreed by the record's
// own warmth (founder-decreed 2026-08-19): NEVER MET means they have never
// replied and no meeting was ever held — the operator's outbound never warms
// an account, and a CSM intro doesn't either.

import { MINE_RE, inferActors } from "@/lib/intel/provenance";
import { isMeetingNote } from "@/lib/intel/meeting";

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
export const RUN_RESET_DAYS = 45;

const DAY = 86_400_000;
const CHI = "America/Chicago";

export type SendLine = {
  accountId: string;
  at: string; // ISO
  channel: Channel;
  contact: string; // "" when unknown
  clause: string; // the move worked, or the record entry's own head
  from: "tap" | "record";
  step: number; // position within its run, 1-based
  repliedAt: string; // ISO of the first genuine inbound after this send, or ""
};

export type AccountLane = "never-met" | "gone-cold";

export type NoteLike = {
  body: string;
  source: string;
  createdAt: string;
  actors?: string;
};

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

// The record's outbound sends — the same discriminators the touch clock and
// the intel corpus use: a glyph-headed activity whose actors name the operator
// as sender, that is not a meeting record (nobody "sends" a meeting that
// already happened).
export function recordSends(
  notes: NoteLike[],
): { at: string; head: string; who: string }[] {
  const out: { at: string; head: string; who: string }[] = [];
  for (const n of notes) {
    if (!/^[✉✔☎☰] /.test(n.body)) continue;
    const actors = n.actors || inferActors(n.body);
    const arrow = actors.indexOf("→");
    const sender = arrow >= 0 ? actors.slice(0, arrow) : "";
    if (!MINE_RE.test(sender)) continue;
    if (isMeetingNote(n)) continue;
    const who = actors
      .slice(arrow + 1)
      .replace(/\+\d+\s*$/, "")
      .trim();
    out.push({ at: n.createdAt, head: n.body.split("\n")[0] ?? "", who });
  }
  return out;
}

// A genuine inbound: attributed to someone who is not the operator, and not
// machinery. An unattributed document is never inbound (Ted doctrine).
const AUTO_RE = /automatic reply|out of office|auto-?reply|autoreply/i;

export function warmDates(notes: NoteLike[]): string[] {
  const out: string[] = [];
  for (const n of notes) {
    if (isMeetingNote(n)) {
      out.push(n.createdAt);
      continue;
    }
    if (!/^[✉✔☎☰] /.test(n.body)) continue;
    const actors = n.actors || inferActors(n.body);
    const sender = (actors.split("→")[0] ?? "").trim();
    if (!sender || MINE_RE.test(sender)) continue;
    if (AUTO_RE.test(n.body.split("\n")[0] ?? "")) continue;
    out.push(n.createdAt);
  }
  return out;
}

// Inbound dates only — the reply annotations read these; meetings warm the
// lane but a meeting is not "they wrote back".
export function inboundDates(notes: NoteLike[]): string[] {
  const out: string[] = [];
  for (const n of notes) {
    if (!/^[✉✔☎☰] /.test(n.body)) continue;
    if (isMeetingNote(n)) continue;
    const actors = n.actors || inferActors(n.body);
    const sender = (actors.split("→")[0] ?? "").trim();
    if (!sender || MINE_RE.test(sender)) continue;
    if (AUTO_RE.test(n.body.split("\n")[0] ?? "")) continue;
    out.push(n.createdAt);
  }
  return out;
}

// The record entry's head, cleaned into a short clause: glyph and routing
// dropped, subject kept.
export function clauseFromHead(head: string): string {
  const noGlyph = head.replace(/^[✉✔☎☰]\s*/, "");
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

export type SendbookInput = {
  // Real-account notes, any order — the record.
  notesById: Map<string, NoteLike[]>;
  // sendbook:<id> notes keyed by the REAL account id — the taps.
  tapsById: Map<string, NoteLike[]>;
  now: Date;
};

export type Sendbook = {
  lines: SendLine[]; // newest first
  laneById: Map<string, AccountLane>;
};

export function buildSendbook(inp: SendbookInput): Sendbook {
  const accountIds = new Set<string>([...inp.tapsById.keys()]);
  for (const [id, notes] of inp.notesById) {
    if (recordSends(notes).length > 0) accountIds.add(id);
  }

  const lines: SendLine[] = [];
  const laneById = new Map<string, AccountLane>();

  for (const id of accountIds) {
    const notes = inp.notesById.get(id) ?? [];
    const warm = warmDates(notes).sort();
    const inbound = inboundDates(notes).sort();
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
    for (const s of recordSends(notes)) {
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
export function chicagoWeekStart(now: Date): number {
  const dayKey = now.toLocaleDateString("en-CA", { timeZone: CHI });
  const weekday = new Date(`${dayKey}T12:00:00Z`).getUTCDay(); // 0 Sun … 6 Sat
  const back = (weekday + 6) % 7; // days since Monday
  // Chicago midnight of dayKey, approximated via the day key itself: compare
  // by day keys, not clock instants, so DST never shifts the boundary.
  const start = new Date(`${dayKey}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - back);
  return start.getTime() - 12 * 3_600_000; // back to that day's 00:00 UTC anchor
}

export type WeekStats = {
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
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].toUpperCase();
  return `${parts[0]} ${parts[parts.length - 1][0]}.`.toUpperCase();
}

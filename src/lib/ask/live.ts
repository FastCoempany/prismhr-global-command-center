// The live read — what the app itself derives about an account RIGHT NOW,
// composed for the brain to answer from (founder-decreed 2026-08-18, after
// the XcelHR miss: the room said "Wait on Bill" while the ask claimed the
// record held nothing). The mirror only knows what extraction has read; the
// app's derived layer — the waiting state, the open sheet, the fresh record —
// is never filed anywhere, so an ask must derive it again at ask time, with
// the SAME pure readers the room uses (Ted doctrine: the widest live source,
// never a private narrow one).
//
// Since slice 12 of the Chute brains refactor plan (§2.2, the third
// migration) the derivation IS the room's: the single account read over the
// stores the room loads. The 25-row query on the raw id that stood here saw
// no shell-filed row, no hide filter and no roster, so the ask brain named
// the book's seed as the relationship while the room named the CEO thread
// (pass 2 C, the relationship row), and it said "no reply has been filed"
// off the touch clock alone, which never looked for the reply.

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { accountFacts, factLines } from "@/lib/account/facts";
import { homeSideFrom } from "@/lib/pipeline/build";
import type { AccountRead } from "@/lib/record/read";
import { declaredHomeSide, readFromStores } from "@/lib/record/stores";
import { theirLoopOf } from "@/lib/room/owed";
import { todoBelongsTo } from "@/lib/room/sheet-view";
import {
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { visibleText } from "@/lib/today/route-notes";
import { redactMoney } from "@/lib/intel/lexicon";

type LiveRead = { accountId: string; name: string; lines: string[] };

const norm = (s: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Which account a question names — pure, testable. Long names match by
// squashed containment ("xcelhr" finds "XCEL HR"), with legal tails stripped
// so "staff leasing of central new york" finds the ", Inc." spelling; short
// names only on a word boundary, so "esc" never fires inside "escalate".
// Longest name wins.
const LEGAL_TAIL = /\b(incorporated|inc|llc|l\.l\.c|corporation|corp|ltd|co)\b\.?/gi;

export function matchAccountIn(
  question: string,
  accounts: { id: string; name: string }[],
): { id: string; name: string } | null {
  const nq = norm(question);
  if (!nq) return null;
  let best: { id: string; name: string; len: number } | null = null;
  for (const a of accounts) {
    const na = norm(a.name);
    if (!na) continue;
    const stripped = norm(a.name.replace(LEGAL_TAIL, " "));
    let hit = false;
    for (const cand of new Set([na, stripped])) {
      if (cand.length >= 5 && nq.includes(cand)) hit = true;
    }
    if (!hit && na.length < 5) {
      const word = a.name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
      if (word) hit = new RegExp(`\\b${word}\\b`, "i").test(question);
    }
    if (hit && (!best || na.length > best.len))
      best = { id: a.id, name: a.name, len: na.length };
  }
  return best ? { id: best.id, name: best.name } : null;
}

const monthDay = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
};

const firstLine = (body: string): string =>
  visibleText(body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";

type LiveRow = { id: string; body: string; actors: string; createdAt: string };

/** The claim lines, composed from the read: the relationship, the waiting
 *  state, the open work, the freshest record lines. Every line is claim-sized
 *  so the synthesizer can weigh and cite them like anything else. Pure, so the
 *  suite can pin what the brain is told. */
export function liveLines(
  hit: { id: string; name: string },
  read: AccountRead,
  extra: {
    /** The account's standing, from lib/account/facts — it leads the sheet. */
    facts: readonly string[];
    /** The visible record rows, newest first. */
    rows: readonly LiveRow[];
    openTodos: readonly { body: string; accountId: string }[];
  },
): string[] {
  // Who this deal runs through — the read's, so the brain names the person
  // the room names (the record's most-seen person over the book's seed).
  const rel = read.relationship;
  const first = (rel.name ?? "").split(/\s+/)[0] || "them";

  const lines: string[] = [...extra.facts];

  if (rel.name)
    lines.push(
      `The relationship on ${hit.name} is ${rel.name}${rel.email ? ` (${rel.email})` : ""}.`,
    );

  const touch = read.lastTouch;
  const meeting = read.lastMeeting;
  // A meeting record beats the correspondence clock — the recap is the
  // owed move, and the ask's answer should know a meeting just happened.
  const meetingNewer =
    meeting && (!touch || Date.parse(meeting.at) >= Date.parse(touch.at));
  if (meeting && meetingNewer)
    lines.push(
      `A meeting with ${hit.name} was held ${monthDay(meeting.at)} — the record of it is filed; the follow-up recap is the operator's to send.`,
    );
  else if (touch?.awaitingReply) {
    const who = touch.who || first;
    // The touch clock says the ball left with them; whether it came back is
    // the read's lastInbound, and only an empty one means no reply is on
    // file. The old line said so off the clock alone, and lied whenever the
    // reply sat on the row.
    const theirs = read.lastInbound;
    if (!theirs)
      lines.push(
        `The room's live read: waiting on ${who} since ${monthDay(
          touch.at,
        )} — the last outbound went to them and no reply has been filed. Nothing owed on the operator's side.`,
      );
    else if (Date.parse(theirs.at) > Date.parse(touch.at))
      lines.push(
        `The room's live read: ${theirs.who || first} wrote back ${monthDay(
          theirs.at,
        )}, after the operator's ${monthDay(touch.at)} note. The reply is the operator's to send.`,
      );
    else
      lines.push(
        `The room's live read: waiting on ${who} since ${monthDay(
          touch.at,
        )}. The last outbound went to them; their last word on file is from ${monthDay(
          theirs.at,
        )}.`,
      );
  } else if (touch) lines.push(`Last touch on ${hit.name} was ${monthDay(touch.at)}.`);

  const noteIds = new Set(extra.rows.map((n) => n.id));
  for (const t of extra.openTodos) {
    if (lines.length >= 10) break;
    if (!todoBelongsTo({ body: t.body, accountId: t.accountId ?? "" }, hit.id, noteIds))
      continue;
    // A loop on their side (D10) is not open on the operator's sheet.
    if (theirLoopOf(t.body)) continue;
    const line = firstLine(t.body);
    if (line) lines.push(`Open on the sheet for ${hit.name}: "${line.slice(0, 160)}".`);
  }

  for (const n of extra.rows.slice(0, 8)) {
    if (lines.length >= 14) break;
    const line = firstLine(n.body);
    if (!line) continue;
    const who = (n.actors ?? "").trim();
    lines.push(
      `Record ${monthDay(n.createdAt)}${who ? ` (${who.slice(0, 60)})` : ""}: ${line.slice(0, 200)}`,
    );
  }

  return lines;
}

// Derive the account's live sheet from the one read and hand its lines to the
// brain.
export async function liveReadFor(question: string): Promise<LiveRead | null> {
  if (!hasDatabaseEnv()) return null;
  const hit = matchAccountIn(
    question,
    peos.map((p) => ({ id: p.id, name: p.name })),
  );
  if (!hit) return null;
  const seed = peos.find((p) => p.id === hit.id);
  try {
    // The stores the room loads, loaded the same way, so the ask reads the
    // read the room reads: the wide loader folds the shell id, the read hides
    // what the operator ✕-parked, and the roster is the declared union (E9).
    const [notesById, touches, todos, dispositions] = await Promise.all([
      loadAccountNotes(),
      loadTouches(),
      loadTodos(),
      loadDispositions(),
    ]);
    const read = readFromStores(
      {
        notesById,
        touches,
        todos,
        dispositions,
        homeSide: declaredHomeSide(homeSideFrom(notesById)),
      },
      hit,
      { now: new Date() },
    );
    const rows = (notesById.get(hit.id) ?? []).filter((n) => !read.hidden.has(n.id));

    // Whether the account is on the dashboard, read from the same dashCard
    // table and matched by the same name comparison the accounts page uses —
    // so "cleared with the CSM" means here exactly what it means on the sheet.
    const onBoard = await getPrisma()
      .dashCard.findFirst({ where: { name: hit.name }, select: { id: true } })
      .then((c) => !!c)
      .catch(() => false);

    // The account's standing, from the SAME derivation the accounts sheet
    // renders its meta line from. This leads because it is what the operator
    // can already see on screen: a brain that cannot say who the CSM is while
    // the page prints her name does not answer, it guesses (founder-caught
    // 2026-09-10, Infiniti HR). Adding a fact in lib/account/facts reaches
    // both surfaces; there is no second list to fall behind.
    const facts = seed
      ? factLines(
          accountFacts(seed, {
            lastActivityIso: rows[0]?.createdAt,
            onDashboard: onBoard,
          }),
        )
      : [];

    const lines = liveLines(hit, read, {
      facts,
      rows,
      openTodos: todos.filter((t) => !t.done),
    });
    if (lines.length === 0) return null;
    return {
      accountId: hit.id,
      name: hit.name,
      lines: lines.map((l) => redactMoney(l).slice(0, 280)),
    };
  } catch {
    return null;
  }
}

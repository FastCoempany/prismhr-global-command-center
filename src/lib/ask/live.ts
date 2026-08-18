// The live read — what the app itself derives about an account RIGHT NOW,
// composed for the brain to answer from (founder-decreed 2026-08-18, after
// the XcelHR miss: the room said "Wait on Bill" while the ask claimed the
// record held nothing). The mirror only knows what extraction has read; the
// app's derived layer — the waiting state, the open sheet, the fresh record —
// is never filed anywhere, so an ask must derive it again at ask time, with
// the SAME pure readers the room uses (Ted doctrine: the widest live source,
// never a private narrow one).

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { relationshipFor } from "@/lib/intel/relationship";
import { isMeetingNote } from "@/lib/intel/meeting";
import { lastTouchRead } from "@/lib/room/touch";
import { todoBelongsTo } from "@/lib/room/sheet-view";
import { visibleText } from "@/lib/today/route-notes";
import { redactMoney } from "@/lib/intel/lexicon";

export type LiveRead = { accountId: string; name: string; lines: string[] };

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

// Derive the account's live sheet: the relationship, the waiting state, the
// open work, the freshest record lines. Every line is claim-sized so the
// synthesizer can weigh and cite them like anything else.
export async function liveReadFor(question: string): Promise<LiveRead | null> {
  if (!hasDatabaseEnv()) return null;
  const hit = matchAccountIn(
    question,
    peos.map((p) => ({ id: p.id, name: p.name })),
  );
  if (!hit) return null;
  const seed = peos.find((p) => p.id === hit.id);
  try {
    const prisma = getPrisma();
    const [notes, touch, openTodos] = await Promise.all([
      prisma.accountNote.findMany({
        where: { accountId: hit.id },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          body: true,
          actors: true,
          createdAt: true,
          source: true,
          lane: true,
        },
      }),
      prisma.touch
        .findFirst({
          where: { subjectKey: `outreach:${hit.id}` },
          orderBy: { contactedAt: "desc" },
        })
        .catch(() => null),
      prisma.todo.findMany({
        where: { done: false },
        select: { id: true, body: true, accountId: true },
        take: 400,
      }),
    ]);

    const noteLike = notes.map((n) => ({
      id: n.id,
      body: n.body,
      actors: n.actors ?? "",
      source: n.source ?? "",
      lane: (n.lane === "background" ? "background" : "mine") as "mine" | "background",
      createdAt: n.createdAt.toISOString(),
    }));
    const rel = relationshipFor(noteLike, contactsFor(hit.id), {
      name: seed?.contactName ?? "",
      email: seed?.contactEmail ?? "",
    });
    const first = (rel.name ?? "").split(/\s+/)[0] || "them";

    const lines: string[] = [];
    if (rel.name)
      lines.push(
        `The relationship on ${hit.name} is ${rel.name}${rel.email ? ` (${rel.email})` : ""}.`,
      );

    const touchRead = lastTouchRead(
      noteLike,
      touch
        ? {
            contactedAt: touch.contactedAt.toISOString(),
            awaitingReply: touch.status === "awaiting",
            who: first,
          }
        : null,
    );
    // A meeting record beats the correspondence clock — the recap is the
    // owed move, and the ask's answer should know a meeting just happened.
    const meeting = noteLike.find((n) => isMeetingNote(n));
    const meetingNewer =
      meeting &&
      (!touchRead || Date.parse(meeting.createdAt) >= Date.parse(touchRead.at));
    if (meeting && meetingNewer)
      lines.push(
        `A meeting with ${hit.name} was held ${monthDay(meeting.createdAt)} — the record of it is filed; the follow-up recap is the operator's to send.`,
      );
    else if (touchRead?.awaitingReply)
      lines.push(
        `The room's live read: waiting on ${touchRead.who || first} since ${monthDay(
          touchRead.at,
        )} — the last outbound went to them and no reply has been filed. Nothing owed on the operator's side.`,
      );
    else if (touchRead)
      lines.push(`Last touch on ${hit.name} was ${monthDay(touchRead.at)}.`);

    const noteIds = new Set(notes.map((n) => n.id));
    for (const t of openTodos) {
      if (lines.length >= 10) break;
      if (!todoBelongsTo({ body: t.body, accountId: t.accountId ?? "" }, hit.id, noteIds))
        continue;
      const line = firstLine(t.body);
      if (line) lines.push(`Open on the sheet for ${hit.name}: "${line.slice(0, 160)}".`);
    }

    for (const n of notes.slice(0, 8)) {
      if (lines.length >= 14) break;
      const line = firstLine(n.body);
      if (!line) continue;
      const who = (n.actors ?? "").trim();
      lines.push(
        `Record ${monthDay(n.createdAt.toISOString())}${who ? ` (${who.slice(0, 60)})` : ""}: ${line.slice(0, 200)}`,
      );
    }

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

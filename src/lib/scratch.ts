// The Scratchpaper's grammar — pure helpers for the one pad that rides every
// page (the Float, triptych winner 2026-08-12). Lines live as namespaced
// AccountNote rows under SCRATCH_NS, which keeps them out of every account
// view and out of the intranet mirror by construction: the pad stays the pad.

import { redactMoney } from "@/lib/intel/lexicon";
import { chicagoDay } from "@/lib/tz";

export const SCRATCH_NS = "scratch:pad";

// The struck archive (founder-decreed 2026-08-19): a crossed-out line moves
// here instead of dying — history keeps everything, ✕ just takes it off the
// paper. Same namespace family, so it stays out of every account view and
// the intranet mirror by the same construction.
export const SCRATCH_GONE_NS = "scratch:gone";

/** The cross-out's one statement: the row moves from the pad to the struck
 *  history. Only the namespace changes — the body and the timestamp ride
 *  untouched, and nothing is deleted (CLAUDE.md, The Scratchpaper: "Nothing
 *  on the paper ever dies"). */
export function strikeMove(id: string): {
  where: { id: string; accountId: string };
  data: { accountId: string };
} {
  return { where: { id, accountId: SCRATCH_NS }, data: { accountId: SCRATCH_GONE_NS } };
}

/** The slice of the client the cross-out needs — an update, never a delete. */
export type StrikeClient = {
  accountNote: {
    updateMany(args: ReturnType<typeof strikeMove>): Promise<{ count: number }>;
  };
};

/** Cross a line out: the one write the ✕ makes. Returns how many rows moved. */
export async function strikeLine(client: StrikeClient, id: string): Promise<number> {
  const r = await client.accountNote.updateMany(strikeMove(id));
  return r.count;
}

/** The way back (CLAUDE.md, The Scratchpaper: "readable under the pad's
 *  STRUCK fold, restorable by ↺"): the row moves from the struck history to
 *  the pad. Only the namespace changes, so the line returns with its words
 *  and its timestamp, to its own seat. */
export function restoreMove(id: string): {
  where: { id: string; accountId: string };
  data: { accountId: string };
} {
  return { where: { id, accountId: SCRATCH_GONE_NS }, data: { accountId: SCRATCH_NS } };
}

/** Bring a struck line back: the one write the ↺ makes. Returns how many
 *  rows moved. */
export async function restoreLine(client: StrikeClient, id: string): Promise<number> {
  const r = await client.accountNote.updateMany(restoreMove(id));
  return r.count;
}

// ── The pad's one write, and the ask door ───────────────────────────────────
// The pact (CLAUDE.md, The Scratchpaper): it stays there and only there;
// nothing routes, nothing files, nothing becomes an action. A kept line is
// one row under SCRATCH_NS by the hand door, and the paper keeps figures
// (amended 2026-08-21) because nothing reads that namespace into an account
// view, the mirror or an action. The ask door is the one way a line leaves,
// by the operator's own act of asking (D24), and it redacts, because asks
// leave the paper.

/** The row a kept line writes, or null for a blank line. The caller hands
 *  it to the note writer as it stands. */
export function scratchRow(body: string, at: Date) {
  const text = (body ?? "").trim().slice(0, 500);
  if (!text) return null;
  return {
    accountId: SCRATCH_NS,
    kind: "mine" as const,
    body: text,
    door: "hand" as const,
    lane: "mine" as const,
    source: "scratch",
    at,
    keepFigures: true,
  };
}

/** What the ask door sends: the question trimmed, money redacted, capped. */
export function padQuestion(raw: string): string {
  return redactMoney((raw ?? "").trim()).slice(0, 300);
}

// ── Paging (pass 8 X8) ──────────────────────────────────────────────────────
// Nothing on the paper ever dies, so every line stays reachable: the pad and
// its struck history read a page at a time, newest first, and an EARLIER fold
// at the foot reads the next page. The cursor is the last line of the page
// the server sent, by its moment and then its id, so two lines kept in the
// same millisecond are never skipped and never read twice.

/** A line as the pad shows it. */
export type ScratchLine = { id: string; body: string; at: string };

/** Where the next page starts: the oldest line the last page held. */
export type ScratchCursor = { at: string; id: string };

/** Lines per page. The pad reads one on open; the fold reads the next. */
export const SCRATCH_PAGE = 300;

/** The one query a page makes, for the namespace and the cursor: one row
 *  past the page, so the page knows whether another follows. */
export function scratchPageArgs(ns: string, before: ScratchCursor | null, take: number) {
  const at = before ? new Date(before.at) : null;
  return {
    where:
      before && at && !Number.isNaN(at.getTime())
        ? {
            accountId: ns,
            OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: before.id } }],
          }
        : { accountId: ns },
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: take + 1,
    select: { id: true, body: true, createdAt: true } as const,
  };
}

/** The slice of the client a page needs: one read. */
export type PageClient = {
  accountNote: {
    findMany(
      args: ReturnType<typeof scratchPageArgs>,
    ): Promise<{ id: string; body: string; createdAt: Date }[]>;
  };
};

/** One page of a pad namespace, newest first, and whether more lines wait
 *  behind it. */
export async function scratchPage(
  client: PageClient,
  ns: string,
  before: ScratchCursor | null,
  take: number = SCRATCH_PAGE,
): Promise<{ lines: ScratchLine[]; more: boolean }> {
  const rows = await client.accountNote.findMany(scratchPageArgs(ns, before, take));
  return {
    lines: rows.slice(0, take).map((r) => ({
      id: r.id,
      body: r.body,
      at: r.createdAt.toISOString(),
    })),
    more: rows.length > take,
  };
}

// The in-place edit's one decision (founder-decreed 2026-08-21; ruled
// 2026-09-25, D24 — CLAUDE.md, The Scratchpaper :329): Enter keeps, Escape
// puts it back, and a click-away KEEPS — the pad never eats your words. The
// kept text is the draft trimmed; an unchanged draft keeps the original and
// the caller writes nothing; a blanked draft puts the line back, because the
// paper keeps no empty line.
export type EditEvent = "enter" | "escape" | "blur";

export function editOutcome(
  event: EditEvent,
  draft: string,
  original: string,
): { action: "keep" | "revert"; text: string } {
  const text = (draft ?? "").trim();
  if (text === original) return { action: "keep", text: original };
  if (event === "escape" || !text) return { action: "revert", text: original };
  return { action: "keep", text };
}

const CHI = "America/Chicago";

// TODAY · YESTERDAY · then the dated kicker ("MON · AUG 11"). The day is the
// one Chicago day every surface reads (src/lib/tz.ts).
export function dayLabelFor(iso: string, now: Date = new Date()): string {
  const t = new Date(Date.parse(iso));
  if (Number.isNaN(t.getTime())) return "";
  const day = chicagoDay(t);
  if (day === chicagoDay(now)) return "TODAY";
  if (day === chicagoDay(new Date(now.getTime() - 86_400_000))) return "YESTERDAY";
  return t
    .toLocaleDateString("en-US", {
      timeZone: CHI,
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase()
    .replace(/,/g, " ·");
}

// "9:41a" — the pad's short clock.
export function timeLabelFor(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleTimeString("en-US", { timeZone: CHI, hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "")
    .replace("m", "");
}

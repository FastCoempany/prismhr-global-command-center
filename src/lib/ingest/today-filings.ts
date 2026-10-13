// Today's filings, read from the record (founder-decreed 2026-10-13: "today
// should always show what happened today"). A receipt used to live only in
// the page that filed it: the row's Drop kept its receipts in memory, so a
// reload or a closed tab lost the line and its ↺, and a filing could no
// longer be taken back from anywhere. The Filing table already holds every
// filing with its account, its read, its windows and its duplicate check,
// and every row it wrote carries its id, so a HomeRoom row's TODAY reads its
// account's filings from today here and shows each one's receipt, from every
// door, on every device, until the Chicago day turns.
//
// Counts, never text (D12): what a receipt shows is the account, the counts,
// the day and the caveats. The lines behind the counts are read on request
// by the filing's id, as every receipt's are (wroteOfFiling).

import { getPrisma } from "@/lib/db";
import type { Window } from "@/lib/ingest/windows";
import { monthDay } from "@/lib/ingest/wrote";
import {
  PLAYBOOK_LESSONS,
  PLAYBOOK_MARKET,
  parsePlaybookBody,
} from "@/lib/playbook/store";
import { gapNs } from "@/lib/room/gaps";
import { splitMarker, splitTags } from "@/lib/today/route-notes";
import { userDayKey } from "@/lib/tz";

/** One filing's receipt, as a row's TODAY shows it. */
export type TodayFiling = {
  filingId: string;
  accountId: string;
  /** When it filed, ISO; the receipts sort newest first by it. */
  at: string;
  /** M/D in Chicago, the receipt's day. */
  day: string;
  /** The record entries it filed on the account. */
  filed: number;
  /** The operator's own to-dos the read opened. */
  opened: number;
  /** Their promises, filed as loops on their side (D10). */
  promises: number;
  /** The asks it queued in the account's gaps namespace. */
  asks: number;
  /** The lines it filed to the playbook for this account. */
  learned: number;
  /** No model read stands behind it: the reader was down or keyless. */
  degraded: boolean;
  /** Every window that cut something (D4). */
  windows: Window[];
  /** Whether the duplicate check ran, or failed open (D7). */
  dupeCheck: string;
};

/** A call transcript's archive note carries the whole conversation beside
 *  the read's entries; it is the evidence, not an entry, so the filed count
 *  leaves it out unless it is all the filing wrote (roomPaste's archiveNote). */
const ARCHIVE_HEAD = "☰ Call transcript";

/** How far back the query reaches before the Chicago day filters it: wide
 *  enough for any offset and a daylight-saving day, so the filter decides. */
const LOOKBACK_MS = 36 * 60 * 60 * 1000;

/** The slice of the Prisma client the read needs — a test hands in a stub. */
export type TodayFilingsClient = {
  filing: {
    findMany(args: {
      where: { accountId: { in: string[] }; createdAt: { gte: Date } };
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        accountId: true;
        dialect: true;
        read: true;
        windows: true;
        dupeCheck: true;
        createdAt: true;
      };
    }): Promise<
      {
        id: string;
        accountId: string;
        dialect: string;
        read: unknown;
        windows: unknown;
        dupeCheck: string;
        createdAt: Date;
      }[]
    >;
  };
  accountNote: {
    groupBy(args: {
      by: ["filingId", "accountId"];
      where: {
        filingId: { in: string[] };
        NOT?: { body: { startsWith: string } };
      };
      _count: { _all: true };
    }): Promise<
      { filingId: string | null; accountId: string; _count: { _all: number } }[]
    >;
    findMany(args: {
      where: { filingId: { in: string[] }; accountId: { in: string[] } };
      select: { filingId: true; body: true };
    }): Promise<{ filingId: string | null; body: string }[]>;
  };
  todo: {
    findMany(args: {
      where: { filingId: { in: string[] } };
      select: { filingId: true; accountId: true; body: true };
    }): Promise<{ filingId: string | null; accountId: string | null; body: string }[]>;
  };
};

/** The windows a Filing row stored, kept only where they are well formed. */
function windowsOf(raw: unknown): Window[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is Window =>
      !!w &&
      typeof w === "object" &&
      typeof (w as Window).what === "string" &&
      typeof (w as Window).read === "number" &&
      typeof (w as Window).of === "number",
  );
}

/** Every filing from today on the given accounts, newest first per account,
 *  with the counts its receipt shows. Fails soft: a store that errors gives
 *  an empty map, and TODAY shows this session's receipts as before. */
export async function todayFilings(
  accountIds: readonly string[],
  now: Date,
  given?: TodayFilingsClient,
): Promise<Map<string, TodayFiling[]>> {
  const out = new Map<string, TodayFiling[]>();
  const ids = [...new Set(accountIds.filter(Boolean))];
  if (ids.length === 0) return out;
  try {
    // Resolved inside the guard: a session with no database reads nothing.
    const client = given ?? (getPrisma() as unknown as TodayFilingsClient);
    const today = userDayKey(now);
    const rows = (
      await client.filing.findMany({
        where: {
          accountId: { in: ids },
          createdAt: { gte: new Date(now.getTime() - LOOKBACK_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          accountId: true,
          dialect: true,
          read: true,
          windows: true,
          dupeCheck: true,
          createdAt: true,
        },
      })
    ).filter((f) => userDayKey(f.createdAt) === today);
    if (rows.length === 0) return out;
    const fids = rows.map((f) => f.id);
    const [all, entries, playbook, todos] = await Promise.all([
      client.accountNote.groupBy({
        by: ["filingId", "accountId"],
        where: { filingId: { in: fids } },
        _count: { _all: true },
      }),
      client.accountNote.groupBy({
        by: ["filingId", "accountId"],
        where: { filingId: { in: fids }, NOT: { body: { startsWith: ARCHIVE_HEAD } } },
        _count: { _all: true },
      }),
      client.accountNote.findMany({
        where: {
          filingId: { in: fids },
          accountId: { in: [PLAYBOOK_MARKET, PLAYBOOK_LESSONS] },
        },
        select: { filingId: true, body: true },
      }),
      client.todo.findMany({
        where: { filingId: { in: fids } },
        select: { filingId: true, accountId: true, body: true },
      }),
    ]);
    const count = (
      groups: { filingId: string | null; accountId: string; _count: { _all: number } }[],
      filingId: string,
      accountId: string,
    ): number =>
      groups.find((g) => g.filingId === filingId && g.accountId === accountId)?._count
        ._all ?? 0;
    for (const f of rows) {
      const onAccount =
        count(entries, f.id, f.accountId) || count(all, f.id, f.accountId);
      let opened = 0;
      let promises = 0;
      for (const t of todos) {
        if (t.filingId !== f.id || t.accountId !== f.accountId) continue;
        const { tags } = splitTags(splitMarker(t.body ?? "").text);
        if (tags.owner === "them") promises++;
        else opened++;
      }
      const learned = playbook.filter(
        (n) => n.filingId === f.id && parsePlaybookBody(n.body).tail.a === f.accountId,
      ).length;
      const asks = count(all, f.id, gapNs(f.accountId));
      const receipt: TodayFiling = {
        filingId: f.id,
        accountId: f.accountId,
        at: f.createdAt.toISOString(),
        day: monthDay(f.createdAt),
        filed: onAccount,
        opened,
        promises,
        asks,
        learned,
        // A Sales Nav grab is never read by a model (D30), so no read is no
        // caveat there; everywhere else a filing with no stored read is one
        // the reader was down or keyless for.
        degraded: f.read == null && f.dialect !== "SN",
        windows: windowsOf(f.windows),
        dupeCheck: f.dupeCheck,
      };
      const list = out.get(f.accountId) ?? [];
      list.push(receipt);
      out.set(f.accountId, list);
    }
    return out;
  } catch {
    return new Map();
  }
}

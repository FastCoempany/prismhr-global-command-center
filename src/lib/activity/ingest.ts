// The ingest core — pure accumulation from parsed rows to verified slices
// and the manifest. The browser's uploader feeds this row by row; the tests
// feed it the hostile fixture. Same code, so what the suite proves is what
// production does.

import { redactMoney } from "@/lib/intel/lexicon";
import { cleanExcerpt, correspondentsOf } from "./excerpt";
import { laneOf, type ActivityLane } from "./classify";
import {
  activityRowKey,
  dayKeyOf,
  dateTimeKeyOf,
  dropShaOf,
  fingerprintHeaders,
  rowRecord,
  rowsChecksum,
  tallyChecksum,
  type ActivityRow,
  type Fingerprint,
} from "./parse";
import type { AccountSlice, DropManifest, IntentTally, StagedRow } from "./types";
import { CAMPAIGN_KEY_CAP, COMMENT_CAP, SLICE_BODY_CAP, SLICE_ROW_CAP } from "./types";

// Recipient lists per row. Eight covers every real thread measured in the
// 2026-08-28 export (the mean is two or three); the cap is what keeps a
// forty-recipient blast from spending an account's whole body budget on
// addresses.
const P_CAP = 8;

type Bucket = {
  id: string;
  name: string;
  rows: StagedRow[];
  tally: IntentTally;
  laneCounts: Record<ActivityLane, number>;
  meta: AccountSlice["meta"];
};

const flagsOf = (f: {
  automated: boolean;
  inboundCall: boolean;
  event: boolean;
  receipt: boolean;
}): string =>
  `${f.automated ? "a" : ""}${f.inboundCall ? "i" : ""}${f.event ? "e" : ""}${f.receipt ? "r" : ""}`;

export type IngestResult = {
  slices: AccountSlice[];
  manifest: DropManifest;
};

export type Ingest = {
  /** Feed one parsed CSV row. Returns a refusal message on a failed header
   *  fingerprint — the loud-fail door (§3.10). */
  takeRow(raw: string[]): { stop?: string };
  rowCount(): number;
  /** Cap, trim, checksum, and manifest. */
  finish(inp: {
    fileName: string;
    fileBytes: number;
    dropDay: string;
  }): Promise<IngestResult>;
};

export function createIngest(book: { id: string; name: string }[]): Ingest {
  const bookById = new Map(book.map((b) => [b.id, b.name]));
  let headers: string[] | null = null;
  let fingerprint: Fingerprint | null = null;
  const seen = new Map<string, number>();
  const buckets = new Map<string, Bucket>();
  const unmatched = new Map<string, { name: string; id18: string; rows: number }>();
  // name → the accounts it was Assigned on. The colleague rule is ≥2 distinct
  // accounts: the export's Assigned column carries ACCOUNT PEOPLE too (their
  // captured emails log under their own name — Natalie Borland, measured
  // 2026-08-20), and an account person only ever assigns on their own
  // account. Book CSMs and EXTRA_PARTNERS join server-side regardless.
  const assigned = new Map<string, Set<string>>();
  const contacts = new Set<string>();
  const laneTotals: Record<ActivityLane, number> = {
    human: 0,
    csm: 0,
    support: 0,
    intent: 0,
    machinery: 0,
  };
  let receiptRows = 0;
  let rowCount = 0;
  let dupes = 0;
  let windowFrom = "";
  let windowTo = "";

  const takeRow = (raw: string[]): { stop?: string } => {
    if (!headers) {
      headers = raw;
      fingerprint = fingerprintHeaders(raw);
      if (!fingerprint.ok)
        return {
          stop: "This isn't the activity report — 18 Digit ID / Subject missing. Check the export's columns.",
        };
      return {};
    }
    if (raw.length === 1 && raw[0].trim() === "") return {};
    const r: ActivityRow = rowRecord(headers, raw);
    // Identical rows are REAL: a blast to forty recipients at one account is
    // forty rows whose nineteen visible columns match exactly (measured
    // 2026-08-20 — 70,778 of 98,455 rows repeat; dropping them erased 72% of
    // the record on the first live drop). Every row is kept and counted;
    // repeats get occurrence-suffixed keys so citations stay unique, and the
    // multiplicity is reported, never silently folded.
    const key0 = activityRowKey(r);
    const occurrence = seen.get(key0) ?? 0;
    seen.set(key0, occurrence + 1);
    if (occurrence > 0) dupes += 1;
    const key = occurrence > 0 ? `${key0}#${occurrence}` : key0;
    rowCount += 1;

    const read = laneOf(r);
    laneTotals[read.lane] += 1;
    if (read.flags.receipt) receiptRows += 1;
    const who = (r.assigned ?? "").trim();
    if (who) {
      const set = assigned.get(who) ?? new Set<string>();
      set.add(r.id18 || "~none");
      assigned.set(who, set);
    }
    for (const n of [r.primaryContact, r.lastContact])
      if (n && n.trim().includes(" ")) contacts.add(n.trim());

    const day = dayKeyOf(r.date);
    if (day) {
      if (!windowFrom || day < windowFrom) windowFrom = day;
      if (!windowTo || day > windowTo) windowTo = day;
    }

    const name = bookById.get(r.id18);
    if (!name) {
      const u = unmatched.get(r.id18) ?? {
        name: r.account || "(unnamed)",
        id18: r.id18,
        rows: 0,
      };
      u.rows += 1;
      unmatched.set(r.id18, u);
      return {};
    }

    let b = buckets.get(r.id18);
    if (!b) {
      b = {
        id: r.id18,
        name,
        rows: [],
        tally: { days: {}, camps: {}, receipts: 0 },
        laneCounts: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
        meta: {
          primaryContact: "",
          primaryContactEmail: "",
          primaryContactTitle: "",
          lastContact: "",
          contactedDate: "",
          lastEmailSentKey: "",
          lastEmailReceivedKey: "",
          gbc: "",
        },
      };
      buckets.set(r.id18, b);
    }
    b.laneCounts[read.lane] += 1;

    // Account-level columns: first non-empty wins, read once (§2.3.5).
    if (!b.meta.primaryContact && r.primaryContact)
      b.meta.primaryContact = r.primaryContact.trim();
    if (!b.meta.primaryContactEmail && r.primaryContactEmail)
      b.meta.primaryContactEmail = r.primaryContactEmail.trim().toLowerCase();
    if (!b.meta.primaryContactTitle && r.primaryContactTitle)
      b.meta.primaryContactTitle = r.primaryContactTitle.trim();
    if (!b.meta.lastContact && r.lastContact) b.meta.lastContact = r.lastContact.trim();
    if (!b.meta.contactedDate && r.contactedDate)
      b.meta.contactedDate = r.contactedDate.trim();
    if (!b.meta.lastEmailSentKey && r.lastEmailSent)
      b.meta.lastEmailSentKey = dateTimeKeyOf(r.lastEmailSent);
    if (!b.meta.lastEmailReceivedKey && r.lastEmailReceived)
      b.meta.lastEmailReceivedKey = dateTimeKeyOf(r.lastEmailReceived);
    if (!b.meta.gbc && r.gbc) b.meta.gbc = r.gbc.trim();

    if (read.lane === "intent") {
      // Blast receipts collapse to arithmetic and never upload (§3.0).
      const d = day || "unknown";
      const dayRow = (b.tally.days[d] ??= { s: 0, o: 0, c: 0 });
      if (read.intentKind === "sent") dayRow.s += 1;
      else if (read.intentKind === "opened") dayRow.o += 1;
      else dayRow.c += 1;
      const campKey =
        Object.keys(b.tally.camps).length >= CAMPAIGN_KEY_CAP &&
        !((read.campaign ?? "~other") in b.tally.camps)
          ? "~other"
          : (read.campaign ?? "~other");
      const camp = (b.tally.camps[campKey] ??= { s: 0, o: 0, c: 0, lastOpen: "" });
      if (read.intentKind === "sent") camp.s += 1;
      else if (read.intentKind === "opened") {
        camp.o += 1;
        if (day > camp.lastOpen) camp.lastOpen = day;
      } else camp.c += 1;
      return {};
    }
    if (read.flags.receipt) b.tally.receipts += 1;
    if (read.lane === "machinery") return {};

    b.rows.push({
      k: key,
      d: day,
      s: r.subject,
      a: r.assigned.trim(),
      lane: read.lane,
      sub: r.taskSubtype,
      rt: r.recordType,
      ct: r.callType,
      fl: flagsOf(read.flags),
      // The meat law: banners, quoted trails, and signatures go BEFORE the
      // cap, so the budget is spent on words a person wrote.
      c: r.comments
        ? redactMoney(cleanExcerpt(r.comments, COMMENT_CAP)) || undefined
        : undefined,
      // Read BEFORE the cleaner cuts the scaffold — the recipients are the
      // only place a logged email names its people.
      p: r.comments
        ? correspondentsOf(r.comments, P_CAP).join(";") || undefined
        : undefined,
    });
    return {};
  };

  const finish = async (inp: {
    fileName: string;
    fileBytes: number;
    dropDay: string;
  }): Promise<IngestResult> => {
    const slices: AccountSlice[] = [];
    for (const b of buckets.values()) {
      b.rows.sort((x, y) => (x.d < y.d ? 1 : x.d > y.d ? -1 : 0));
      const dropped = Math.max(0, b.rows.length - SLICE_ROW_CAP);
      const rows = b.rows.slice(0, SLICE_ROW_CAP);
      // The body cap drops comments before it drops rows — oldest first.
      let body = JSON.stringify(rows);
      for (let i = rows.length - 1; i >= 0 && body.length > SLICE_BODY_CAP; i--) {
        if (rows[i].c) {
          delete rows[i].c;
          body = JSON.stringify(rows);
        }
      }
      // Then the recipient lists, oldest first — words outrank addresses, and
      // both outrank losing a row. An account whose comments are all gone and
      // is still over budget would otherwise start dropping rows silently.
      for (let i = rows.length - 1; i >= 0 && body.length > SLICE_BODY_CAP; i--) {
        if (rows[i].p) {
          delete rows[i].p;
          body = JSON.stringify(rows);
        }
      }
      const [rowsSum, tallySum] = await Promise.all([
        rowsChecksum(rows.map((r) => r.k)),
        tallyChecksum(b.tally),
      ]);
      slices.push({
        id: b.id,
        name: b.name,
        meta: b.meta,
        rows,
        dropped,
        tally: b.tally,
        laneCounts: b.laneCounts,
        rowsSum,
        tallySum,
      });
    }

    const dropSha = await dropShaOf(
      slices.map((s) => ({ id: s.id, rowsSum: s.rowsSum, tallySum: s.tallySum })),
      rowCount,
    );

    // The colleague roster: assigned on two or more distinct accounts. A
    // single-account assigned name reads as that account's person, not a
    // colleague. The server unions in the book's CSMs and EXTRA_PARTNERS
    // (Appendix C). Collisions named now.
    const colleagues = [...assigned.entries()]
      .filter(([, accts]) => accts.size >= 2)
      .map(([name]) => name)
      .sort();
    const colleagueSet = new Set(colleagues);
    const collisions = [...contacts].filter((c) => colleagueSet.has(c)).sort();

    const manifest: DropManifest = {
      dropSha,
      dropDay: inp.dropDay,
      fileName: inp.fileName,
      fileBytes: inp.fileBytes,
      rowCount,
      dupes,
      window: { from: windowFrom, to: windowTo },
      laneTotals,
      receiptRows,
      accounts: slices.map((s) => ({
        id: s.id,
        name: s.name,
        rowsSum: s.rowsSum,
        tallySum: s.tallySum,
        rows: s.rows.length,
        humanRows: s.rows.filter((r) => r.lane === "human" || r.lane === "csm").length,
      })),
      unmatched: [...unmatched.values()].sort((a, b) => b.rows - a.rows).slice(0, 20),
      colleagues,
      collisions,
      headerDiff: {
        missing: fingerprint?.missing ?? [],
        extra: fingerprint?.extra ?? [],
      },
      totalBatches: 0,
    };
    return { slices, manifest };
  };

  return { takeRow, rowCount: () => rowCount, finish };
}

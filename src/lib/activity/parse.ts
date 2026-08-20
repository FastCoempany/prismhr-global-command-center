// The Second Record's reader — a real RFC-4180 state machine for the weekly
// Salesforce activity export. The export's Full Comments field is heavily
// multiline (98,455 records span 2.7 million raw lines), so nothing here ever
// splits on newlines; the parser walks characters with persistent state and
// survives chunk boundaries, BOM, CRLF, escaped quotes, and replacement
// characters. Isomorphic on purpose: the browser streams the 128 MB file
// through this same code the tests run.

export const CANON_HEADERS = [
  "Subject",
  "Account Name",
  "18 Digit ID",
  "Date",
  "Assigned",
  "Full Comments",
  "Last Email Sent",
  "Last Email Received",
  "Type",
  "Task Subtype",
  "Primary Contact",
  "Last Contact",
  "Contacted Date",
  "Primary Contact Title",
  "Task/Event Record Type",
  "Call Type",
  "Outreach Task Type",
  "Event Subtype",
  "Global Business Consultant",
] as const;

// The two headers the pipeline cannot live without. Recognition needs both
// anchors plus at least eight more of the canonical nineteen, so the founder
// can add or drop report columns without the drop going dark — and a fake
// header line INSIDE a quoted comment can never trigger recognition, because
// recognition only ever reads the parsed first row.
export const ANCHOR_HEADERS = ["18 Digit ID", "Subject"] as const;
export const FINGERPRINT_MIN_MATCHES = 10;

export type Fingerprint = {
  ok: boolean;
  matched: string[];
  missing: string[];
  extra: string[];
};

export function fingerprintHeaders(headers: string[]): Fingerprint {
  const clean = headers.map((h) => h.replace(/^﻿/, "").trim());
  const have = new Set(clean);
  const matched = CANON_HEADERS.filter((h) => have.has(h));
  const missing = CANON_HEADERS.filter((h) => !have.has(h));
  const extra = clean.filter(
    (h) => h && !(CANON_HEADERS as readonly string[]).includes(h),
  );
  const anchors = ANCHOR_HEADERS.every((a) => have.has(a));
  return {
    ok: anchors && matched.length >= FINGERPRINT_MIN_MATCHES,
    matched,
    missing,
    extra,
  };
}

// ── the state machine ───────────────────────────────────────────────────────
// push() takes decoded text chunks (TextDecoder with {stream:true} upstream
// handles split multi-byte characters); finish() flushes the last unterminated
// row. State persists across pushes, so a quote pair or CRLF split across a
// chunk boundary parses the same as one big string.

export function createCsvParser(): {
  push(chunk: string): string[][];
  finish(): string[][];
} {
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let quotePending = false; // saw a closing quote; a second one means a literal "
  let atStart = true; // strip a BOM at the very start of the file only

  const feed = (chunk: string): string[][] => {
    const rows: string[][] = [];
    let i = 0;
    if (atStart && chunk.length > 0) {
      if (chunk.charCodeAt(0) === 0xfeff) i = 1;
      atStart = false;
    }
    for (; i < chunk.length; i++) {
      const c = chunk[i];
      if (inQuotes) {
        if (c === '"') {
          inQuotes = false;
          quotePending = true;
        } else if (c === "\r") {
          // CRLF inside a quoted comment normalizes to \n — staged text never
          // carries carriage returns.
        } else field += c;
        continue;
      }
      if (c === '"') {
        if (quotePending) field += '"'; // the "" escape
        inQuotes = true;
        quotePending = false;
      } else if (c === ",") {
        row.push(field);
        field = "";
        quotePending = false;
      } else if (c === "\n") {
        row.push(field);
        field = "";
        quotePending = false;
        rows.push(row);
        row = [];
      } else if (c === "\r") {
        quotePending = false; // CRLF — the \n does the work
      } else {
        field += c;
        quotePending = false;
      }
    }
    return rows;
  };

  return {
    push: feed,
    finish(): string[][] {
      if (field === "" && row.length === 0) return [];
      row.push(field);
      field = "";
      const last = row;
      row = [];
      // A trailing newline leaves one phantom empty field — not a row.
      if (last.length === 1 && last[0].trim() === "") return [];
      return [last];
    },
  };
}

// ── rows as records ─────────────────────────────────────────────────────────

export type ActivityRow = {
  subject: string;
  account: string;
  id18: string;
  date: string; // as exported: M/D/YYYY
  assigned: string;
  comments: string;
  lastEmailSent: string;
  lastEmailReceived: string;
  type: string;
  taskSubtype: string;
  primaryContact: string;
  lastContact: string;
  contactedDate: string;
  primaryContactTitle: string;
  recordType: string;
  callType: string;
  outreachTaskType: string;
  eventSubtype: string;
  gbc: string;
};

const FIELD_BY_HEADER: Record<string, keyof ActivityRow> = {
  Subject: "subject",
  "Account Name": "account",
  "18 Digit ID": "id18",
  Date: "date",
  Assigned: "assigned",
  "Full Comments": "comments",
  "Last Email Sent": "lastEmailSent",
  "Last Email Received": "lastEmailReceived",
  Type: "type",
  "Task Subtype": "taskSubtype",
  "Primary Contact": "primaryContact",
  "Last Contact": "lastContact",
  "Contacted Date": "contactedDate",
  "Primary Contact Title": "primaryContactTitle",
  "Task/Event Record Type": "recordType",
  "Call Type": "callType",
  "Outreach Task Type": "outreachTaskType",
  "Event Subtype": "eventSubtype",
  "Global Business Consultant": "gbc",
};

export function emptyActivityRow(): ActivityRow {
  return {
    subject: "",
    account: "",
    id18: "",
    date: "",
    assigned: "",
    comments: "",
    lastEmailSent: "",
    lastEmailReceived: "",
    type: "",
    taskSubtype: "",
    primaryContact: "",
    lastContact: "",
    contactedDate: "",
    primaryContactTitle: "",
    recordType: "",
    callType: "",
    outreachTaskType: "",
    eventSubtype: "",
    gbc: "",
  };
}

/** Bind a parsed row to its record by header NAME, never by position — extra
 *  columns are tolerated, reordered columns still land, and a missing
 *  non-anchor column reads as empty (and gets named in the drop receipt). */
export function rowRecord(headers: string[], row: string[]): ActivityRow {
  const out = emptyActivityRow();
  for (let i = 0; i < headers.length; i++) {
    const key = FIELD_BY_HEADER[headers[i]?.replace(/^﻿/, "").trim() ?? ""];
    if (key) out[key] = row[i] ?? "";
  }
  return out;
}

// ── dates, the calendar way ─────────────────────────────────────────────────
// The export's Date column is day-only (M/D/YYYY): a calendar fact, compared
// by day key and NEVER fed through Date.parse into a UTC instant that could
// shift it a day. Datetime fields (Last Email Sent/Received) are Chicago
// wall-clock strings; they become sortable keys, not instants.

export function dayKeyOf(mdY: string): string {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(mdY ?? "");
  if (!m) return "";
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export function dateTimeKeyOf(s: string): string {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([AP]M)\s*$/i.exec(
    s ?? "",
  );
  if (!m) return dayKeyOf(s ?? "");
  let hh = Number(m[4]) % 12;
  if (/pm/i.test(m[6])) hh += 12;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")} ${String(hh).padStart(2, "0")}:${m[5]}`;
}

// ── row identity ────────────────────────────────────────────────────────────
// One key does two jobs: exact-duplicate collapse (SF reports can emit
// identical rows) and gem citations (a gem cites the keys of the rows it
// stands on; the refuter looks them back up in staging). Two FNV-1a passes
// over ALL nineteen fields — a same-day same-subject row with different
// comments stays distinct.

export function activityRowKey(r: ActivityRow): string {
  const joined = [
    r.subject,
    r.account,
    r.id18,
    r.date,
    r.assigned,
    r.comments,
    r.lastEmailSent,
    r.lastEmailReceived,
    r.type,
    r.taskSubtype,
    r.primaryContact,
    r.lastContact,
    r.contactedDate,
    r.primaryContactTitle,
    r.recordType,
    r.callType,
    r.outreachTaskType,
    r.eventSubtype,
    r.gbc,
  ].join("");
  const fnv = (seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < joined.length; i++) {
      h ^= joined.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  return `${fnv(0x811c9dc5).toString(16)}${fnv(0x1000193).toString(16)}`;
}

// ── subjects, rendered ──────────────────────────────────────────────────────
// Case-thread tokens ("[ thread::L9TrIyskd3q… ]") never render anywhere; the
// raw subject stays in staging so citations remain verbatim.

export function stripThreadTokens(subject: string): string {
  return (subject ?? "")
    .replace(/\[\s*thread::[^\]]*\]?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── checksums ───────────────────────────────────────────────────────────────
// sha256 via WebCrypto — present in every browser and in Node 16.5+, so the
// client computes exactly what the server verifies. The drop's identity
// (its "drop sha") is the sha256 of the canonical manifest — sorted
// per-account checksums plus totals — which makes "same rows, same drop"
// true even when file bytes differ in incidental ways.

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The staged slice's checksum: sorted row keys, one line each. Stable across
 *  row order — a re-export that shuffles rows is the same slice. */
export async function rowsChecksum(rowKeys: string[]): Promise<string> {
  return sha256Hex([...rowKeys].sort().join("\n"));
}

/** The intent tally's checksum: canonical serialization with sorted keys. */
export async function tallyChecksum(tally: unknown): Promise<string> {
  const canon = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([k, x]) => [k, canon(x)]),
      );
    return v;
  };
  return sha256Hex(JSON.stringify(canon(tally)));
}

export async function dropShaOf(
  accounts: { id: string; rowsSum: string; tallySum: string }[],
  rowCount: number,
): Promise<string> {
  const lines = [...accounts]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((a) => `${a.id} ${a.rowsSum} ${a.tallySum}`);
  return sha256Hex(`${rowCount}\n${lines.join("\n")}`);
}

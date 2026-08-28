// The browser's half of the Second Record: stream the 128 MB export through
// the RFC-4180 state machine into the ingest core (the same pure code the
// tests run), then post the slices in verified batches. The server re-checks
// everything — the manifest is the contract (§3.0).

import { createCsvParser, fingerprintHeaders } from "./parse";
import { createIngest } from "./ingest";
import type { AccountSlice, StageBatch, StageReply } from "./types";
import { BATCH_BYTE_CAP } from "./types";

/** Is this .csv the activity report? Reads the FIRST 4 KB only — recognition
 *  never waits on 128 MB, and a fake header inside a comment can never
 *  trigger it because only the parsed first row is consulted. */
export async function probeActivityReport(file: File): Promise<boolean> {
  try {
    const head = await file.slice(0, 4096).text();
    const parser = createCsvParser();
    const rows = [...parser.push(head), ...parser.finish()];
    if (rows.length === 0) return false;
    return fingerprintHeaders(rows[0]).ok;
  } catch {
    return false;
  }
}

export type UploadResult = {
  ok: boolean;
  reason?: string;
  reply?: StageReply;
  rowCount: number;
  accounts: number;
  /** Rows carrying email text — the count that makes a blank read visible. */
  textRows: number;
  unmatchedRows: number;
};

export async function uploadActivityReport(inp: {
  file: File;
  book: { id: string; name: string }[];
  post: (batch: StageBatch) => Promise<StageReply>;
  progress?: (line: string) => void;
}): Promise<UploadResult> {
  const say = inp.progress ?? (() => {});
  const parser = createCsvParser();
  const decoder = new TextDecoder("utf-8"); // invalid bytes become U+FFFD, never a crash
  const ingest = createIngest(inp.book);

  say("Reading the file…");
  const reader = inp.file.stream().getReader();
  let readBytes = 0;
  const feed = (chunk: string): string | undefined => {
    for (const raw of parser.push(chunk)) {
      const v = ingest.takeRow(raw);
      if (v.stop) return v.stop;
    }
    return undefined;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    readBytes += value.byteLength;
    const stop = feed(decoder.decode(value, { stream: true }));
    if (stop)
      return {
        ok: false,
        reason: stop,
        rowCount: 0,
        accounts: 0,
        textRows: 0,
        unmatchedRows: 0,
      };
    if (readBytes % (16 << 20) < 1 << 20)
      say(
        `Reading… ${Math.round(readBytes / (1 << 20))} MB in, ${ingest.rowCount()} rows.`,
      );
  }
  const stopTail = feed(decoder.decode());
  if (stopTail)
    return {
      ok: false,
      reason: stopTail,
      rowCount: 0,
      accounts: 0,
      textRows: 0,
      unmatchedRows: 0,
    };
  for (const raw of parser.finish()) {
    const v = ingest.takeRow(raw);
    if (v.stop)
      return {
        ok: false,
        reason: v.stop,
        rowCount: 0,
        accounts: 0,
        textRows: 0,
        unmatchedRows: 0,
      };
  }

  say(`Parsed ${ingest.rowCount()} rows. Sealing the slices…`);
  const { slices, manifest } = await ingest.finish({
    fileName: inp.file.name,
    fileBytes: inp.file.size,
    dropDay: new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
  });
  if (ingest.rowCount() === 0)
    return {
      ok: false,
      reason: "The file held no readable rows.",
      rowCount: 0,
      accounts: 0,
      textRows: 0,
      unmatchedRows: 0,
    };

  // Batch whole slices (an account never splits across batches), post
  // sequentially so the server's book-keeping never races, manifest on the
  // last batch — its arrival triggers verification.
  const batches: AccountSlice[][] = [];
  let cur: AccountSlice[] = [];
  let curBytes = 0;
  for (const s of slices) {
    const bytes = JSON.stringify(s).length;
    if (cur.length > 0 && curBytes + bytes > BATCH_BYTE_CAP) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(s);
    curBytes += bytes;
  }
  if (cur.length > 0) batches.push(cur);
  if (batches.length === 0) batches.push([]);
  manifest.totalBatches = batches.length;

  const unmatchedRows = manifest.unmatched.reduce((n, u) => n + u.rows, 0);
  let reply: StageReply = { ok: true };
  for (let i = 0; i < batches.length; i++) {
    say(`Uploading slice batch ${i + 1} of ${batches.length}…`);
    reply = await inp.post({
      dropSha: manifest.dropSha,
      batchIndex: i,
      totalBatches: batches.length,
      slices: batches[i],
      manifest: i === batches.length - 1 ? manifest : undefined,
    });
    if (!reply.ok)
      return {
        ok: false,
        reason: reply.reason ?? "A batch didn't land.",
        reply,
        rowCount: ingest.rowCount(),
        accounts: slices.length,
        textRows: manifest.textRows,
        unmatchedRows,
      };
  }
  return {
    ok: true,
    reply,
    rowCount: ingest.rowCount(),
    accounts: slices.length,
    textRows: manifest.textRows,
    unmatchedRows,
  };
}

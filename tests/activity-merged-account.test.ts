// The weekly Salesforce export still carries the duplicate.
//
// myhrpros (SPMI) is one company under two Salesforce account records, and
// merging account ids in Salesforce is not available to us — so the CRM keeps
// both and files activity against either one, indefinitely.
//
// The app folds the pair at read time, and part of that fold is keeping the
// duplicate out of the book entirely. That is right everywhere the book is a
// list of accounts to show, and wrong in exactly one place: the ingest builds
// its id → account map from the book it is handed, so once the duplicate left
// the book its rows matched nothing. They did not fold — they were reported as
// an unknown account and thrown away, which is the one outcome the second
// record must never produce for an account we know.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createIngest } from "../src/lib/activity/ingest";
import { createCsvParser } from "../src/lib/activity/parse";
import { headerLine, row, csvLine } from "./activity-fixtures";
import { ALIASES } from "../src/lib/book/merge";

const DUPE = "0013k00002dGqODAA0";
const CANON = "001F000000w389qIAA";
// The book as the app hands it over: the duplicate is already filtered out.
const BOOK = [{ id: CANON, name: "myhrpros (SPMI)" }];

async function drop(id18: string, account: string) {
  const ingest = createIngest(BOOK);
  const p = createCsvParser();
  const text = [
    headerLine(),
    csvLine(
      row({
        subject: "Re: Global module overview",
        account,
        id18,
        date: "9/18/2026",
        comments: "Confirming the window for the overview call.",
      }),
    ),
    "",
  ].join("\n");
  for (const raw of p.push(text)) ingest.takeRow(raw);
  for (const raw of p.finish()) ingest.takeRow(raw);
  return ingest.finish({
    fileName: "export.csv",
    fileBytes: text.length,
    dropDay: "2026-09-24",
  });
}

describe("an export row under the duplicate's id", () => {
  test("lands on the merged account instead of being dropped", async () => {
    const { slices, manifest } = await drop(DUPE, "My HR Professionals");
    assert.deepEqual(
      manifest.unmatched,
      [],
      "the row was reported as an unknown account and thrown away",
    );
    assert.equal(slices.length, 1);
    assert.equal(slices[0].id, CANON, "the slice must carry the id the app speaks in");
    assert.equal(slices[0].rows.length, 1);
  });

  test("it carries the account's real name, not the duplicate's", async () => {
    // Both records exist in Salesforce under different names. One account.
    const { slices } = await drop(DUPE, "My HR Professionals");
    assert.equal(slices[0].name, "myhrpros (SPMI)");
  });

  test("the canonical id still works exactly as before", async () => {
    const { slices, manifest } = await drop(CANON, "Southern Personnel Management, Inc.");
    assert.deepEqual(manifest.unmatched, []);
    assert.equal(slices[0].id, CANON);
  });

  test("both ids land in one slice, never two", async () => {
    // The whole point: one company, one bucket, however the CRM filed it.
    const ingest = createIngest(BOOK);
    const p = createCsvParser();
    const text = [
      headerLine(),
      csvLine(
        row({
          subject: "Re: Global module overview",
          account: "My HR Professionals",
          id18: DUPE,
          date: "9/18/2026",
          comments: "Filed against the duplicate record.",
        }),
      ),
      csvLine(
        row({
          subject: "Re: Philippines question",
          account: "Southern Personnel Management, Inc.",
          id18: CANON,
          date: "9/19/2026",
          comments: "Filed against the surviving record.",
        }),
      ),
      "",
    ].join("\n");
    for (const raw of p.push(text)) ingest.takeRow(raw);
    for (const raw of p.finish()) ingest.takeRow(raw);
    const { slices } = await ingest.finish({
      fileName: "export.csv",
      fileBytes: text.length,
      dropDay: "2026-09-24",
    });
    assert.equal(slices.length, 1, "the company split into two slices again");
    assert.equal(slices[0].id, CANON);
    assert.equal(slices[0].rows.length, 2, "one of the two records' rows was lost");
  });

  test("a genuinely unknown account is still reported, not swallowed", async () => {
    // The fold must not turn into a catch-all that hides real misses.
    const { slices, manifest } = await drop("001NOTINTHEBOOK0AA", "Someone Else Inc.");
    assert.equal(slices.length, 0);
    assert.equal(manifest.unmatched.length, 1);
    assert.equal(manifest.unmatched[0].id18, "001NOTINTHEBOOK0AA");
  });

  test("every alias in the table survives a drop under its duplicate id", async () => {
    // A pair added later is covered without editing this test.
    for (const [dupe, real] of Object.entries(ALIASES)) {
      const { slices, manifest } = await (async () => {
        const ingest = createIngest([{ id: real, name: "merged account" }]);
        const p = createCsvParser();
        const text = [
          headerLine(),
          csvLine(
            row({
              subject: "Re: check",
              account: "whatever the CRM calls it",
              id18: dupe,
              date: "9/18/2026",
              comments: "A row under the duplicate record.",
            }),
          ),
          "",
        ].join("\n");
        for (const raw of p.push(text)) ingest.takeRow(raw);
        for (const raw of p.finish()) ingest.takeRow(raw);
        return ingest.finish({
          fileName: "export.csv",
          fileBytes: text.length,
          dropDay: "2026-09-24",
        });
      })();
      assert.deepEqual(manifest.unmatched, [], `${dupe} still matched no book account`);
      assert.equal(slices[0]?.id, real, `${dupe} did not land on ${real}`);
    }
  });
});

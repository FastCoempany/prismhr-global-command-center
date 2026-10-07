// Canon pins for the closer rule (CLAUDE.md "The closer rule", ruling of
// 2026-09-25: D28 — PROMISED needs a hearer). The classifier's own three
// pins (a closer, a question, a name) already live in tests/closer.test.ts
// and are not repeated here.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { buildAccountSheet } from "../../src/lib/room/sheet-view";
import { NO_TAGS, withTags } from "../../src/lib/today/route-notes";

describe("PROMISED needs a hearer; a typed date is a wall (D28)", () => {
  const now = new Date("2026-08-22T18:00:00Z");
  const row = (id: string, body: string, date: string) => ({
    id,
    body: withTags(body, { ...NO_TAGS, kind: "action" as const, date }),
    done: false,
    accountId: "ACCT01",
    remindAt: "",
    createdAt: "2026-08-20T12:00:00Z",
    updatedAt: "2026-08-20T12:00:00Z",
  });
  const sheetOf = (todos: ReturnType<typeof row>[]) =>
    buildAccountSheet(todos, "ACCT01", new Set(), new Map(), now);

  test("a hand-typed dated action past its day reads as a plain wall, never PROMISED", () => {
    const sheet = sheetOf([row("t1", "Book the demo", "2026-08-21")]);
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].wall, "8/21", "the date passed, so it is a wall");
    assert.equal(sheet.open[0].promised, undefined, "no hearer, no promise");
  });

  test("a paste-provenance row with a blown date reads PROMISED — the hearer is built in", () => {
    const sheet = sheetOf([
      row("t2", "Send Chassie the information · from 8/20 paste", "2026-08-21"),
    ]);
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].wall, "8/21");
    assert.equal(sheet.open[0].promised, true);
  });

  test("a date still ahead is neither a wall nor a promise, whatever the provenance", () => {
    const sheet = sheetOf([
      row("t3", "Send Chassie the information · from 8/20 paste", "2026-08-30"),
      row("t4", "Book the demo", "2026-08-30"),
    ]);
    assert.equal(sheet.open.length, 2);
    for (const o of sheet.open) {
      assert.equal(o.wall, undefined);
      assert.equal(o.promised, undefined);
      assert.equal(o.due, "2026-08-30");
    }
  });
});

// ── PROMISED needs a hearer: a typed line that names one (D28; pass 8 H7) ───
// A paste-provenance date has a hearer by construction; a typed date reads
// PROMISED when the line names the person it was promised to — the tag
// line's own hearer, or a person the account's record knows, named in the
// line. A name the record has never seen proves nothing.

describe("a typed date that names its hearer reads PROMISED once its day passes (D28)", () => {
  const now = new Date("2026-10-07T17:00:00Z");
  const row = (id: string, body: string, date: string, hearer = "") => ({
    id,
    body: withTags(body, { ...NO_TAGS, kind: "action" as const, date, hearer }),
    done: false,
    accountId: "ACCT01",
    remindAt: "",
    createdAt: "2026-10-01T15:00:00Z",
    updatedAt: "2026-10-01T15:00:00Z",
  });
  const RECORD = [
    {
      body: "✉ OL Oct 1 9:00 AM — Mexico census · Adam Bell → Antaeus Coe\nCan you send the census template?",
      createdAt: "2026-10-01T14:00:00Z",
      actors: "Adam Bell → Antaeus Coe",
      source: "outlook-ai",
    },
  ];
  const sheetOf = (todos: ReturnType<typeof row>[], notes = RECORD) =>
    buildAccountSheet(todos, "ACCT01", new Set(), new Map(), now, notes);

  test("the line names a person the record knows: PROMISED with its date", () => {
    const [o] = sheetOf([row("t1", "Send Adam the census template", "2026-10-05")]).open;
    assert.equal(o.wall, "10/5");
    assert.equal(o.promised, true);
  });

  test("the tag line's own hearer is a hearer", () => {
    const [o] = sheetOf(
      [row("t2", "Send the census template", "2026-10-05", "Adam Bell")],
      [],
    ).open;
    assert.equal(o.wall, "10/5");
    assert.equal(o.promised, true);
  });

  test("a name the record never saw, or no name at all, stays a plain wall", () => {
    const open = sheetOf([
      row("t3", "Send Priya the census template", "2026-10-05"),
      row("t4", "Book the demo", "2026-10-05"),
    ]).open;
    assert.equal(open.length, 2);
    for (const o of open) {
      assert.equal(o.wall, "10/5");
      assert.equal(o.promised, undefined, o.body);
    }
  });

  test("the operator named in the line is never the hearer", () => {
    const [o] = sheetOf([
      row("t5", "Antaeus to send the census template", "2026-10-05"),
    ]).open;
    assert.equal(o.promised, undefined);
  });
});

// ── a release closes it, a reschedule moves it (the closer rule; pass 8 H6) ──
// "A promise closes only by delivery or explicit release; 'no rush, next
// month' is a reschedule." A substantive message from their side, after the
// commitment, that speaks to it: the line names the person who wrote it, or
// the two share a word of substance.

describe("their release closes a promise; their reschedule moves it", () => {
  const now = new Date("2026-10-07T17:00:00Z");
  const PROMISE = "Send Chassie the census template · from 10/1 paste";
  const row = (id: string, body: string, date: string) => ({
    id,
    body: withTags(body, { ...NO_TAGS, kind: "action" as const, date }),
    done: false,
    accountId: "ACCT01",
    remindAt: "",
    createdAt: "2026-10-01T15:00:00Z",
    updatedAt: "2026-10-01T15:00:00Z",
  });
  const mail = (body: string, over: Record<string, string> = {}) => ({
    body: `✉ OL Oct 3 10:00 AM — Re: census · Chassie Smith → Antaeus Coe\n${body}`,
    createdAt: "2026-10-03T15:00:00Z",
    actors: "Chassie Smith → Antaeus Coe",
    source: "outlook-ai",
    ...over,
  });
  const sheetOf = (
    notes: ReturnType<typeof mail>[],
    todos = [row("t1", PROMISE, "2026-10-05")],
  ) => buildAccountSheet(todos, "ACCT01", new Set(), new Map(), now, notes);

  test("untouched, the blown paste promise reads PROMISED", () => {
    const [o] = sheetOf([]).open;
    assert.equal(o.wall, "10/5");
    assert.equal(o.promised, true);
  });

  test("'no rush, next month' reschedules: still open, no wall, never PROMISED, no day", () => {
    const sheet = sheetOf([mail("No rush on that, next month is fine.")]);
    assert.equal(sheet.open.length, 1);
    const [o] = sheet.open;
    assert.equal(o.wall, undefined);
    assert.equal(o.promised, undefined);
    assert.equal(o.due, undefined);
    assert.deepEqual(sheet.released, []);
  });

  test("a reschedule that names a day moves the due day, and its wall is plain", () => {
    const ahead = sheetOf([mail("No rush on the census, 10/20 works.")]).open[0];
    assert.equal(ahead.due, "2026-10-20");
    assert.equal(ahead.wall, undefined);
    const passed = sheetOf([mail("Take your time with the template, 10/6 is fine.")])
      .open[0];
    assert.equal(passed.due, "2026-10-06");
    assert.equal(passed.wall, "10/6");
    assert.equal(passed.promised, undefined, "they named that day; nobody promised it");
  });

  test("an explicit release closes it: out of the open list, listed as released", () => {
    const sheet = sheetOf([
      mail("No need to send the census, we are holding off on Mexico."),
    ]);
    assert.deepEqual(sheet.open, []);
    assert.equal(sheet.released.length, 1);
    assert.equal(sheet.released[0].id, "t1");
    assert.equal(sheet.released[0].why, "Chassie released it 10/3.");
  });

  test("a release that speaks to another commitment leaves this one alone", () => {
    const sheet = sheetOf(
      [
        mail("We no longer need the pricing deck.", {
          actors: "Tom Harrison → Antaeus Coe",
          body: "✉ OL Oct 3 10:00 AM — Re: deck · Tom Harrison → Antaeus Coe\nWe no longer need the pricing deck.",
        }),
      ],
      [row("t1", "Send the census template · from 10/1 paste", "2026-10-05")],
    );
    assert.equal(sheet.open[0].promised, true);
    assert.deepEqual(sheet.released, []);
  });

  test("a release from someone the line never names takes two shared words to close it", () => {
    const tom = (said: string) =>
      mail(said, {
        actors: "Tom Harrison → Antaeus Coe",
        body: `✉ OL Oct 3 10:00 AM — Re: census · Tom Harrison → Antaeus Coe\n${said}`,
      });
    const line = [
      row("t1", "Send the Mexico census template · from 10/1 paste", "2026-10-05"),
    ];
    const one = sheetOf([tom("We no longer need the Mexico pricing.")], line);
    assert.equal(one.open[0]?.promised, true, "one shared word closes nothing");
    const two = sheetOf([tom("No need to send the census template after all.")], line);
    assert.deepEqual(two.open, []);
    assert.equal(two.released[0]?.why, "Tom released it 10/3.");
  });

  test("a release before the promise was made releases nothing", () => {
    const sheet = sheetOf([
      mail("No need to send the census, we are holding off on Mexico.", {
        createdAt: "2026-09-28T15:00:00Z",
      }),
    ]);
    assert.equal(sheet.open[0].promised, true);
  });

  test("the operator's own words, machinery and a question release nothing", () => {
    for (const n of [
      mail("No rush on the census, next month is fine.", {
        actors: "Antaeus Coe → Chassie Smith",
        body: "✉ OL Oct 3 10:00 AM — Re: census · Antaeus Coe → Chassie Smith\nNo rush on the census, next month is fine.",
      }),
      mail("No rush on the census, I am out until next month.", {
        body: "✉ OL Oct 3 10:00 AM — Automatic reply: census · Chassie Smith → Antaeus Coe\nNo rush on the census, I am out until next month.",
      }),
      mail("Is there any rush on the census?"),
    ]) {
      const [o] = sheetOf([n]).open;
      assert.equal(o.promised, true, n.body);
      assert.equal(o.wall, "10/5");
    }
  });
});

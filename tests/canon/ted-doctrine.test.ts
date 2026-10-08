// The Ted doctrine, pinned as behavior (CLAUDE.md "The Ted doctrine",
// :385-401, with the Spring's research-chip decree at :374-376 and the
// standing money decree at :582-583). Every test calls a function and checks
// what it returns; none reads a source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync as read } from "node:fs";
import { createAccountNoteRow, type AccountNoteData } from "../../src/lib/notes/write";
import { latestResearchAt } from "../../src/lib/intel/deep-research";
import { readAccount, type RecordNote } from "../../src/lib/record/read";
import { lastTouchRead } from "../../src/lib/room/touch";

// ── E3 · "Money figures never appear in anything stored" (:582-583) meets
// "the record outranks every seed" (:389): the one writer redacts ────────
describe("no writer reaches AccountNote without redaction (CLAUDE.md:582-583)", () => {
  const stub = () => {
    const writes: AccountNoteData[] = [];
    return {
      writes,
      client: {
        accountNote: {
          create: async ({ data }: { data: AccountNoteData }) => {
            writes.push(data);
            return { id: `n${writes.length}` };
          },
        },
      },
    };
  };

  test("a body carrying $12,000 is stored redacted", async () => {
    const { client, writes } = stub();
    const r = await createAccountNoteRow(
      {
        accountId: "A1",
        kind: "account",
        door: "hand",
        body: "They quoted $12,000 a month for Canada.",
      },
      client,
    );
    assert.equal(r.id, "n1");
    assert.equal(writes.length, 1);
    assert.ok(!writes[0].body.includes("$12,000"), writes[0].body);
    assert.ok(!/12,000/.test(writes[0].body), writes[0].body);
    assert.ok(writes[0].body.includes("a month for Canada"));
  });

  test("lane defaults to mine; provenance and recipients ride on the first tier", async () => {
    const { client, writes } = stub();
    await createAccountNoteRow(
      { accountId: "A1", kind: "mine", door: "hand", body: "Call Dana." },
      client,
    );
    assert.equal(writes[0].lane, "mine");
    assert.equal(writes[0].actors, "");
    assert.equal(writes[0].source, "");
    assert.equal(writes[0].recipients, "");
    assert.equal(writes[0].partner, "");
  });

  test("a stated lane, actors, source and moment are kept", async () => {
    const { client, writes } = stub();
    const at = new Date("2026-09-02T12:00:00Z");
    await createAccountNoteRow(
      {
        accountId: "A1",
        kind: "account",
        door: "hand",
        body: "✉ OL 9:44 AM — Re: Canada · Antaeus Coe → Dana Ellis\nSent the model.",
        lane: "background",
        actors: "Antaeus Coe → Dana Ellis",
        source: "outlook-ai",
        recipients: "Dana Ellis, Antaeus Coe",
        at,
      },
      client,
    );
    assert.equal(writes[0].lane, "background");
    assert.equal(writes[0].actors, "Antaeus Coe → Dana Ellis");
    assert.equal(writes[0].source, "outlook-ai");
    assert.equal(writes[0].recipients, "Dana Ellis, Antaeus Coe");
    assert.equal(writes[0].createdAt, at);
  });

  test("the Scratchpaper's carve-out keeps figures (CLAUDE.md:319-322), nothing else does", async () => {
    const { client, writes } = stub();
    await createAccountNoteRow(
      {
        accountId: "scratch:pad",
        kind: "mine",
        door: "hand",
        body: "quote came in at $12,000",
        keepFigures: true,
      },
      client,
    );
    assert.equal(writes[0].body, "quote came in at $12,000");
    await createAccountNoteRow(
      { accountId: "A1", kind: "mine", door: "hand", body: "quote came in at $12,000" },
      client,
    );
    assert.ok(!writes[1].body.includes("12,000"));
  });

  test("an unmigrated table degrades tier by tier, still redacted", async () => {
    const attempts: AccountNoteData[] = [];
    const client = {
      accountNote: {
        create: async ({ data }: { data: AccountNoteData }) => {
          attempts.push(data);
          if ("recipients" in data) throw new Error("no such column");
          if ("lane" in data) throw new Error("no such column");
          return { id: "stable" };
        },
      },
    };
    const r = await createAccountNoteRow(
      { accountId: "A1", kind: "account", door: "hand", body: "$5,000 PEPM they said" },
      client,
    );
    assert.equal(r.id, "stable");
    assert.equal(attempts.length, 3);
    for (const a of attempts) assert.ok(!a.body.includes("5,000"), a.body);
  });
});

// ── E9 · "The research control ... reading the LATEST of both stores" (:374-376)
describe("the research chip reads the latest of both stores (CLAUDE.md:374-376)", () => {
  test("the sweep wins when it is newer", () => {
    assert.equal(
      latestResearchAt("2026-07-02T12:00:00Z", "2026-08-13T12:00:00Z"),
      "2026-08-13T12:00:00Z",
    );
  });
  test("the deep pass wins when it is newer", () => {
    assert.equal(
      latestResearchAt("2026-09-01T12:00:00Z", "2026-08-13T12:00:00Z"),
      "2026-09-01T12:00:00Z",
    );
  });
  test("one store alone is the answer; neither is undefined, never a fake stamp", () => {
    assert.equal(
      latestResearchAt(undefined, "2026-08-13T12:00:00Z"),
      "2026-08-13T12:00:00Z",
    );
    assert.equal(latestResearchAt("2026-08-13T12:00:00Z", ""), "2026-08-13T12:00:00Z");
    assert.equal(latestResearchAt(undefined, undefined), undefined);
    assert.equal(latestResearchAt("", "not a date"), undefined);
  });
});

// ── E2 · "derived facts ... must read the WIDEST live source" (:394-397):
// the read's docs carry the actors column, and a caller declares its homeSide
// (enforced by type — readAccount's `homeSide` is required, E9). This pin
// called corpusFor until corpusFor retired with its last caller (pass 8
// housekeeping); the single account read holds the decree now. ────────────
describe("every corpus carries actors and a homeSide (CLAUDE.md:394-397)", () => {
  const readOne = (homeSide: readonly string[], note: RecordNote) =>
    readAccount({
      account: { id: "A1", name: "Acme" },
      notes: [note],
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide,
      now: new Date("2026-09-03T12:00:00Z"),
    });
  const row = (
    o: Pick<RecordNote, "id" | "body" | "actors" | "recipients">,
  ): RecordNote => ({
    accountId: "A1",
    partner: "",
    kind: "account",
    lane: "mine",
    source: "",
    createdAt: "2026-09-02T12:00:00Z",
    ...o,
  });

  test("a note with actors produces a doc carrying those actors as its people and sender", () => {
    const read = readOne(
      ["Anika Patel"],
      row({
        id: "1",
        body: "✉ OL Sep 2 10:39 AM — Re: Canada · Dana Ellis → Antaeus Coe\nWe have two clients asking. Can you walk us through it?",
        actors: "Dana Ellis → Antaeus Coe",
        recipients: "Antaeus Coe",
      }),
    );
    const docs = read.docs;
    assert.equal(docs.length, 1);
    assert.ok(docs[0].people?.includes("Dana Ellis"), JSON.stringify(docs[0].people));
    assert.ok(docs[0].people?.includes("Antaeus Coe"));
    assert.equal(docs[0].sender, "Dana Ellis");
    assert.equal(docs[0].direction, "in");
    assert.equal(read.lastInbound?.who, "Dana Ellis");
  });

  test("the operator's own send reads out, and the actors still ride", () => {
    const read = readOne(
      [],
      row({
        id: "2",
        body: "✉ OL Sep 2 9:44 AM — Re: Canada · Antaeus Coe → Dana Ellis\nSending the model now.",
        actors: "Antaeus Coe → Dana Ellis",
        recipients: "",
      }),
    );
    const docs = read.docs;
    assert.equal(docs[0].direction, "out");
    assert.ok(docs[0].people?.includes("Dana Ellis"));
    // The operator is our side, never the account's author: the read keeps the
    // actors whole and flags the side, so no inbound reads off our own send.
    assert.equal(docs[0].senderIsHome, true);
    assert.equal(read.lastInbound, null);
  });
});

// ── C3 · "a fact's two stores merge by latest" (:397-398; ruled R5) ───────
describe("the touch log merges with the record by latest (CLAUDE.md:397-398)", () => {
  const send = (createdAt: string) => ({
    actors: "Antaeus Coe → Dana Ellis",
    createdAt,
    body: "✉ OL Aug 5 — Re: Canada · Antaeus Coe → Dana Ellis\nnudge",
    source: "outlook-ai",
  });

  test("the log newer than the record's outbound: the log's date wins", () => {
    const r = lastTouchRead([send("2026-08-05T12:00:00Z")], {
      contactedAt: "2026-08-12T15:00:00Z",
      awaitingReply: false,
      who: "Dana",
    });
    assert.equal(r?.source, "log");
    assert.equal(r?.at, "2026-08-12T15:00:00Z");
    assert.equal(r?.awaitingReply, false);
  });

  test("the record newer than the log: the record's date wins, the ball is theirs", () => {
    const r = lastTouchRead([send("2026-08-14T12:00:00Z")], {
      contactedAt: "2026-08-12T15:00:00Z",
      awaitingReply: false,
      who: "Dana",
    });
    assert.equal(r?.source, "record");
    assert.equal(r?.at, "2026-08-14T12:00:00Z");
    assert.equal(r?.awaitingReply, true);
    assert.equal(r?.who, "Dana Ellis");
  });
});

// ── pass 11 · A2.4, the whole scope: no private narrow source ───────────────
// "Derived facts (who the relationship is, when we last touched, whether a
// reply is owed, whether a deal is over, who said a thing) must read the
// WIDEST live source the app holds, never a private narrow one." The account
// read (src/lib/record/read.ts) is that source. Each function that derives
// one of these facts is called only from the read, from its own module, or
// from an adapter named here with the reason it is not a narrower read. A new
// caller fails the build until it is reviewed and named; each adapter's
// behavior is pinned in its own suite.
describe("every derived fact comes from the account read or a named adapter (A2.4, whole scope)", () => {
  const files = (readdirSync("src", { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.startsWith("generated"))
    .map((f) => `src/${f}`);
  const callers = (fn: string) =>
    files.filter((f) => new RegExp(`\\b${fn}\\(`).test(read(f, "utf8").replace(/^\s*(\/\/|\*).*$/gm, ""))).sort();

  const GATE: Record<string, Record<string, string>> = {
    // Who the relationship is.
    relationshipFor: {
      "src/lib/intel/relationship.ts": "its own module",
      "src/lib/record/read.ts": "the account read",
      "src/app/partners/recipients.ts": "the read's rule with the declared home side over the whole book (pass 8 call 7; tests/canon/act-lane.test.ts)",
      "src/app/groundwork/page.tsx": "the seed alone, only when the account has no read (readById ?? relationshipFor([], …))",
    },
    // Who is in the deal.
    peopleFor: {
      "src/lib/intel/people.ts": "its own module",
      "src/lib/intel/relationship.ts": "the relationship's own reader",
      "src/lib/record/read.ts": "the account read",
      "src/lib/pipeline/build.ts": "the report's contacts line, over the room's own notes, our side filtered out (tests/pipeline-build.test.ts)",
    },
    // Whose move it is, and whether a reply is owed.
    whoseMoveFrom: {
      "src/lib/record/whose-move.ts": "its own module",
      "src/lib/groundwork/day.ts": "the read's verdict first (moveById), the rungs over the same facts only without a read",
      "src/lib/room/engine.ts": "the read's verdict first (i.whoseMove), the rungs over the same facts only without a read",
    },
    owedByThem: {
      "src/lib/room/owed.ts": "its own module",
      "src/lib/record/whose-move.ts": "the move's rungs",
      "src/lib/record/read.ts": "the account read",
    },
    owedToMe: {
      "src/lib/room/owed.ts": "its own module",
      "src/app/room/page.tsx": "the room's register, over every note the read holds (allNotes) and the sheet",
    },
    // When we last touched, on the Accounts sheet: both records by latest (C1).
    lastHumanTouch: {
      "src/lib/record/accounts.ts": "its own module",
      "src/app/accounts/page.tsx": "the sheet's column, from the read's touch and the export's row (C1)",
    },
  };

  for (const [fn, allowed] of Object.entries(GATE))
    test(`${fn} is called only where the gate names`, () => {
      assert.deepEqual(callers(fn), Object.keys(allowed).sort());
    });

  test("whether a deal is over reads the board card, the stamp's one store, everywhere", () => {
    const calls = files.flatMap((f) =>
      [...read(f, "utf8").matchAll(/\breadOutcome\(([^)]*)\)/g)].map((m) => `${f}: ${m[1]}`),
    );
    assert.ok(calls.length > 5);
    for (const c of calls)
      if (!c.startsWith("src/lib/dashboard/outcome.ts")) assert.match(c, /: \w+\.notes$/, c);
  });
});

// The Ted doctrine, pinned as behavior (CLAUDE.md "The Ted doctrine",
// :359-375, with the Spring's research-chip decree at :349-351 and the
// standing money decree at :538-539). Every test calls a function and checks
// what it returns; none reads a source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAccountNoteRow, type AccountNoteData } from "../../src/lib/notes/write";
import { latestResearchAt } from "../../src/lib/intel/deep-research";
import { corpusFor } from "../../src/lib/intel/extract";
import { lastTouchRead } from "../../src/lib/room/touch";

// ── E3 · "Money figures never appear in anything stored" (:538-539) meets
// "the record outranks every seed" (:363): the one writer redacts ────────
describe("no writer reaches AccountNote without redaction (CLAUDE.md:538-539)", () => {
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
      { accountId: "A1", kind: "mine", body: "Call Dana." },
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

  test("the Scratchpaper's carve-out keeps figures (CLAUDE.md:299-302), nothing else does", async () => {
    const { client, writes } = stub();
    await createAccountNoteRow(
      {
        accountId: "scratch:pad",
        kind: "mine",
        body: "quote came in at $12,000",
        keepFigures: true,
      },
      client,
    );
    assert.equal(writes[0].body, "quote came in at $12,000");
    await createAccountNoteRow(
      { accountId: "A1", kind: "mine", body: "quote came in at $12,000" },
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
      { accountId: "A1", kind: "account", body: "$5,000 PEPM they said" },
      client,
    );
    assert.equal(r.id, "stable");
    assert.equal(attempts.length, 3);
    for (const a of attempts) assert.ok(!a.body.includes("5,000"), a.body);
  });
});

// ── E9 · "The research control ... reading the LATEST of both stores" (:349-351)
describe("the research chip reads the latest of both stores (CLAUDE.md:349-351)", () => {
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

// ── E2 · "derived facts ... must read the WIDEST live source" (:368-371):
// the corpus carries the actors column, and a caller declares its homeSide
// (enforced by type — corpusFor's `homeSide` key is required) ─────────────
describe("every corpus carries actors and a homeSide (CLAUDE.md:368-371)", () => {
  test("a note with actors produces a doc carrying those actors as its people and sender", () => {
    const docs = corpusFor("A1", "Acme", {
      homeSide: ["Anika Patel"],
      acctNotes: [
        {
          id: "1",
          kind: "account",
          body: "✉ OL Sep 2 10:39 AM — Re: Canada · Dana Ellis → Antaeus Coe\nWe have two clients asking. Can you walk us through it?",
          createdAt: "2026-09-02T12:00:00Z",
          actors: "Dana Ellis → Antaeus Coe",
          recipients: "Antaeus Coe",
        },
      ],
    });
    assert.equal(docs.length, 1);
    assert.ok(docs[0].people?.includes("Dana Ellis"), JSON.stringify(docs[0].people));
    assert.ok(docs[0].people?.includes("Antaeus Coe"));
    assert.equal(docs[0].sender, "Dana Ellis");
    assert.equal(docs[0].direction, "in");
  });

  test("the operator's own send reads out, and the actors still ride", () => {
    const docs = corpusFor("A1", "Acme", {
      homeSide: undefined,
      acctNotes: [
        {
          id: "2",
          kind: "account",
          body: "✉ OL Sep 2 9:44 AM — Re: Canada · Antaeus Coe → Dana Ellis\nSending the model now.",
          createdAt: "2026-09-02T12:00:00Z",
          actors: "Antaeus Coe → Dana Ellis",
        },
      ],
    });
    assert.equal(docs[0].direction, "out");
    assert.ok(docs[0].people?.includes("Dana Ellis"));
    assert.equal(docs[0].sender, "");
  });
});

// ── C3 · "a fact's two stores merge by latest" (:371-372; ruled R5) ───────
describe("the touch log merges with the record by latest (CLAUDE.md:371-372)", () => {
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

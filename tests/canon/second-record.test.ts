// Canon pins for the second record (CLAUDE.md "The second record", rulings
// of 2026-09-25: D17, D18, D19, D20, D21, and pass 8's calls 5 and 14 of
// 2026-10-07). The store-level pins run the run's own entry points over an
// in-memory table handed in where the Prisma client would be, the way the
// writer takes its client.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, test } from "node:test";
import { actedDayFor, personMoved } from "../../src/lib/activity/acted";
import { createIngest } from "../../src/lib/activity/ingest";
import { lintAct, lintReason } from "../../src/lib/activity/lint";
import {
  createCsvParser,
  rowsChecksum,
  tallyChecksum,
  type ActivityRow,
} from "../../src/lib/activity/parse";
import {
  actedSweep,
  contextPackFor,
  fileGems,
  firstRecordReadFor,
  runActivityPass,
  stageActivityBatch,
  takeBackSecondRecord,
  type ActivityDb,
} from "../../src/lib/activity/run";
import {
  ACTED_NS,
  GEMS_NS,
  MANIFEST_ID,
  SECOND_RECORD_SPANS,
  STAGE_NS,
  STAGE_PENDING_NS,
  ACTIVITY_NS,
  emptyRunState,
  gemKey,
  parseActedBody,
  parseGemsBody,
  parseManifestBody,
  parseStageBody,
  renderGemsBody,
  renderManifestBody,
  renderRollupBody,
  renderStageBody,
  type Gem,
} from "../../src/lib/activity/stores";
import type { AccountSlice, DropManifest } from "../../src/lib/activity/types";
import { BOOK, csvLine, headerLine, row } from "../activity-fixtures";
import { isMachineryName } from "../../src/lib/activity/classify";
import { buildRollup, type Rollup } from "../../src/lib/activity/rollup";
import type { SecondRecord } from "../../src/lib/activity/read";
import { liveMotionIds } from "../../src/lib/groundwork/day";
import { lastHumanTouch } from "../../src/lib/record/accounts";
import { orgSignalsOf } from "../../src/lib/sendbook/read";

describe("the record has moved on a gem when a row after its day carries the gem's person (D20)", () => {
  // A send as the acted sweep reads it: the head names no one, so each case
  // says exactly which columns carry the person.
  const send = (over: Partial<Parameters<typeof personMoved>[1]>) => ({
    who: "",
    head: "✉ OL Aug 20 9:12 AM — Re: the model",
    actors: "",
    recipients: "",
    ...over,
  });

  test("an initial reads as the person: 'Natalie B.' matches 'Natalie Borland'", () => {
    assert.equal(personMoved(["Natalie B."], send({ who: "Natalie Borland" })), true);
    // The other order too.
    assert.equal(personMoved(["N. Borland"], send({ who: "Natalie Borland" })), true);
  });

  test("an address matches a row whose actors carry it", () => {
    assert.equal(
      personMoved(
        ["natalie.borland@x.com"],
        send({
          who: "natalie.borland@x.com",
          head: "✉ Re: the model — sent to natalie.borland@x.com.",
          actors: "Antaeus Coe → Natalie.Borland@x.com",
        }),
      ),
      true,
    );
    // And one whose recipients column carries it, when actors name someone else.
    assert.equal(
      personMoved(
        ["natalie.borland@x.com"],
        send({
          who: "Greg Williams",
          actors: "Antaeus Coe → Greg Williams +1",
          recipients: "greg@x.com, natalie.borland@x.com",
        }),
      ),
      true,
    );
  });

  test("a bare fragment is not a person: 'Nat' alone matches nothing", () => {
    assert.equal(personMoved(["Nat"], send({ who: "Natalie Borland" })), false);
    assert.equal(personMoved(["Nat"], send({ who: "Nathan Price" })), false);
  });

  test("a different person is not the gem's person", () => {
    assert.equal(
      personMoved(
        ["Natalie Borland"],
        send({ who: "Greg Williams", actors: "Antaeus Coe → Greg Williams" }),
      ),
      false,
    );
    assert.equal(personMoved(["Natalie B."], send({ who: "Natalie Price" })), false);
    assert.equal(personMoved([""], send({ who: "Natalie Borland" })), false);
  });
});

describe("gem lines are operator copy: the seven devices are linted, and a non-date digit kills (D21)", () => {
  test("antithesis dies: 'Ask Greg, not Jane.'", () => {
    const v = lintAct("Ask Greg, not Jane.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("antithesis"), v.faults.join("; "));
    assert.equal(lintAct("Send not the deck but the model.").ok, false);
  });

  test("the dash hinge dies: 'Send the model — the close arrives.'", () => {
    const v = lintAct("Send the model — the close arrives.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a dash hinge"), v.faults.join("; "));
    // The spaced hyphen is the same hinge.
    const r = lintReason("They asked for pricing - twice now.");
    assert.equal(r.ok, false);
    assert.ok(r.faults.includes("a dash hinge"), r.faults.join("; "));
  });

  test("a digit that is not a date kills: '3 clients want EOR.'", () => {
    const a = lintAct("3 clients want EOR.");
    assert.equal(a.ok, false);
    assert.ok(a.faults.includes("a digit that is not a date"), a.faults.join("; "));
    const r = lintReason("3 clients want EOR.");
    assert.equal(r.ok, false);
    assert.ok(r.faults.includes("a digit that is not a date"), r.faults.join("; "));
    assert.equal(lintReason("They opened 3 of ours.").ok, false);
  });

  test("a date is not a count: 'Aug 19 reply wants to discuss switching.' passes", () => {
    assert.equal(lintReason("Aug 19 reply wants to discuss switching.").ok, true);
    assert.equal(lintReason("Renewal meeting 9/12.").ok, true);
    assert.equal(lintReason("Quiet since 2026-08-01.").ok, true);
    assert.equal(lintReason("Their reply of 19 Aug asks for pricing.").ok, true);
  });

  test("plain speech passes: 'Ask Greg Williams about the call.'", () => {
    assert.equal(lintAct("Ask Greg Williams about the call.").ok, true);
    assert.equal(lintAct("Reach Natalie and William today.").ok, true);
    assert.equal(lintReason("Their partner thread is live.").ok, true);
    assert.equal(lintReason("Nine support cases. Never pitched.").ok, true);
  });

  // The plain-speech law's own examples (CLAUDE.md:90-100), verbatim, one per
  // device the lint did not yet carry — and beside each, a plain line a naive
  // regex would wrongly catch, which must pass. A false positive kills a real
  // gem, so the pass lines pin the detectors' conservatism.
  test("paradox dies: 'a call that ends hasn't ended'", () => {
    const v = lintReason("a call that ends hasn't ended");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("paradox"), v.faults.join("; "));
    // A stem and its negation in one clause, whoever the subject is.
    assert.ok(
      lintReason("The quiet thread hasn't gone quiet.").faults.includes("paradox"),
    );
    // The line's own imperative verb is the app doing its job, not a paradox;
    // and two subjects across a comma are two clauses, not one.
    assert.equal(lintAct("Ask what they haven't asked yet.").ok, true);
    assert.equal(lintReason("They replied, we haven't replied.").ok, true);
    assert.equal(lintReason("Nine support cases. Never pitched.").ok, true);
  });

  test("maxim dies: 'controlled beats discovered'", () => {
    const v = lintReason("controlled beats discovered");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a maxim"), v.faults.join("; "));
    assert.ok(lintReason("Speed over polish.").faults.includes("a maxim"));
    assert.ok(
      lintReason("Nine cases. Controlled beats discovered.").faults.includes("a maxim"),
    );
    // "over" inside an instruction is a preposition, not an aphorism.
    assert.equal(lintAct("Send the deck over email.").ok, true);
    assert.equal(lintAct("Call over Zoom.").ok, true);
    assert.equal(lintReason("Their CFO beats around the bush.").ok, true);
  });

  test("definitional flip dies: 'questions now are free — later they're change orders'", () => {
    const v = lintReason("questions now are free — later they're change orders");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a definitional flip"), v.faults.join("; "));
    // The "X is just Y" redefinition is the same device.
    assert.ok(
      lintReason("Questions are just change orders.").faults.includes(
        "a definitional flip",
      ),
    );
    // "now" and "later" in an instruction are times, not a redefinition; and
    // a measured fact with "just" is a fact.
    assert.equal(lintAct("Send it now and follow later.").ok, true);
    assert.equal(lintReason("The deck is just two pages.").ok, true);
  });

  test("escalating triad dies: 'their pay, our employment, our answer'", () => {
    const v = lintReason("their pay, our employment, our answer");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("an escalating triad"), v.faults.join("; "));
    // A real list of three actual things is content, not a device.
    assert.equal(lintAct("Ask Greg, Jane, and Natalie.").ok, true);
    assert.equal(lintReason("Their pay, their benefits, their taxes.").ok, true);
    assert.equal(lintReason("Their CFO, their CEO, and the board.").ok, true);
  });

  test("chiasmus dies: 'inside the machine, not beside it'", () => {
    assert.equal(lintReason("inside the machine, not beside it").ok, false);
    // The ABBA inversion proper: two content words mirrored in one sentence.
    const v = lintReason("Work the plan, plan the work.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("chiasmus"), v.faults.join("; "));
    assert.ok(lintReason("Plan the work and work the plan.").faults.includes("chiasmus"));
    // A word that comes back across a sentence break, or with other content
    // between the mirrored pair, is repetition, not a mirror.
    assert.equal(lintReason("Call Greg. Greg asked for a call.").ok, true);
    assert.equal(lintReason("Call Greg, since Greg asked for a call.").ok, true);
    assert.equal(lintAct("Ask Greg Williams about the call.").ok, true);
  });
});

// ── the store, in memory ────────────────────────────────────────────────────
// The run's entry points take the Prisma client as their last argument; this
// table stands in for it with exactly the calls they make. Rows come back
// newest first, as the client's orderBy asks.

type NoteRow = {
  id: string;
  accountId: string;
  body: string;
  createdAt: Date;
  kind: string;
  partner: string;
  lane: string;
  actors: string;
  source: string;
  door: string;
  recipients: string;
};

type Where = Record<string, unknown>;

const fieldMatches = (value: unknown, cond: unknown): boolean => {
  if (cond === undefined) return true;
  if (cond && typeof cond === "object" && !(cond instanceof Date)) {
    const c = cond as Record<string, unknown>;
    if ("startsWith" in c && !String(value).startsWith(String(c.startsWith)))
      return false;
    if ("contains" in c && !String(value).includes(String(c.contains))) return false;
    if ("in" in c && !(c.in as unknown[]).includes(value)) return false;
    if ("notIn" in c && (c.notIn as unknown[]).includes(value)) return false;
    if ("not" in c && value === c.not) return false;
    if ("gte" in c && !((value as Date) >= (c.gte as Date))) return false;
    return true;
  }
  return value === cond;
};

const matches = (r: Record<string, unknown>, where: Where | undefined): boolean => {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    if (k === "AND") {
      if (!(cond as Where[]).every((w) => matches(r, w))) return false;
    } else if (k === "OR") {
      if (!(cond as Where[]).some((w) => matches(r, w))) return false;
    } else if (k === "NOT") {
      const list = Array.isArray(cond) ? (cond as Where[]) : [cond as Where];
      if (list.some((w) => matches(r, w))) return false;
    } else if (!fieldMatches(r[k], cond)) return false;
  }
  return true;
};

function memoryDb(
  seed: (Partial<NoteRow> & { accountId: string; body: string })[] = [],
  markers: { accountId: string; status: string }[] = [],
  touches: Record<string, unknown>[] = [],
) {
  let clock = Date.parse("2026-09-01T12:00:00Z");
  let ids = 0;
  const notes: NoteRow[] = seed.map((n) => ({
    id: n.id ?? `seed${++ids}`,
    createdAt: n.createdAt ?? new Date((clock += 1000)),
    kind: "mine",
    partner: "",
    lane: "background",
    actors: "",
    source: "",
    door: "seed",
    recipients: "",
    ...n,
  }));
  const find = (args: { where?: Where; take?: number } = {}) => {
    const out = notes
      .filter((n) => matches(n as unknown as Record<string, unknown>, args.where))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return typeof args.take === "number" ? out.slice(0, args.take) : out;
  };
  const db = {
    accountNote: {
      findMany: async (args: { where?: Where; take?: number }) => find(args),
      findFirst: async (args: { where?: Where }) => find({ ...args, take: 1 })[0] ?? null,
      update: async (args: { where: { id: string }; data: Partial<NoteRow> }) => {
        const n = notes.find((x) => x.id === args.where.id);
        if (!n) throw new Error("no such row");
        Object.assign(n, args.data);
        return n;
      },
      delete: async (args: { where: { id: string } }) => {
        const i = notes.findIndex((x) => x.id === args.where.id);
        if (i >= 0) notes.splice(i, 1);
        return {};
      },
      deleteMany: async (args: { where?: Where }) => {
        const gone = find({ where: args.where }).map((n) => n.id);
        for (const id of gone)
          notes.splice(
            notes.findIndex((x) => x.id === id),
            1,
          );
        return { count: gone.length };
      },
      create: async (args: {
        data: Partial<NoteRow> & { accountId: string; body: string };
      }) => {
        const n: NoteRow = {
          id: `n${++ids}`,
          createdAt: args.data.createdAt ?? new Date((clock += 1000)),
          kind: "mine",
          partner: "",
          lane: "",
          actors: "",
          source: "",
          door: "",
          recipients: "",
          ...args.data,
        };
        notes.push(n);
        return { id: n.id };
      },
    },
    accountDisposition: {
      findMany: async (args: { where?: Where }) =>
        markers.filter((m) =>
          matches(m as unknown as Record<string, unknown>, args.where),
        ),
    },
    todo: { findMany: async () => [] },
    dashCard: { findFirst: async () => null },
    touch: { findMany: async () => touches },
  };
  const under = (accountId: string) => find({ where: { accountId } });
  return { db: db as unknown as ActivityDb, notes, under };
}

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const ACCT = "001TESTTRENDHR000A";

async function sliceOf(
  over: Partial<AccountSlice> & { rowKey: string },
): Promise<AccountSlice> {
  const { rowKey, ...rest } = over;
  const rows = [
    {
      k: rowKey,
      d: "2026-09-18",
      s: "Re: the model",
      a: "Antaeus Coe",
      lane: "human" as const,
      sub: "Email",
      rt: "",
      ct: "",
      fl: "",
    },
  ];
  const tally = { days: {}, camps: {}, receipts: 0 };
  return {
    id: ACCT,
    name: "Trend Personnel",
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
    rows,
    dropped: 0,
    tally,
    laneCounts: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
    laneEmails: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
    rowsSum: await rowsChecksum(rows.map((r) => r.k)),
    tallySum: await tallyChecksum(tally),
    ...rest,
  };
}

const manifestFor = (
  dropSha: string,
  slices: AccountSlice[],
  over: Partial<DropManifest> = {},
): DropManifest => ({
  dropSha,
  dropDay: "2026-09-20",
  fileName: "activity.csv",
  fileBytes: 42,
  rowCount: 9,
  textRows: 4,
  dupes: 2,
  window: { from: "2026-06-20", to: "2026-09-19" },
  laneTotals: { human: 5, csm: 0, support: 1, intent: 2, machinery: 1 },
  receiptRows: 0,
  accounts: slices.map((s) => ({
    id: s.id,
    name: s.name,
    rowsSum: s.rowsSum,
    tallySum: s.tallySum,
    rows: s.rows.length,
    humanRows: s.rows.length,
  })),
  unmatched: [{ name: "Advocate Pay LLC", id18: "001UNMATCHED00000Z", rows: 3 }],
  colleagues: [],
  collisions: [],
  headerDiff: { missing: [], extra: [] },
  totalBatches: 2,
  ...over,
});

/** A receipt line in plain speech: no dash hinge, no parenthetical, none of
 *  the coined words the C4 and X4 rows named. */
const plainLine = (line: string): string[] => {
  const faults: string[] = [];
  if (/—/.test(line)) faults.push("a dash");
  if (/[()]/.test(line)) faults.push("a parenthetical");
  if (/honest|funded|run dark|gadget|arithmetically/i.test(line))
    faults.push("coined words");
  return faults;
};

// ── D17 · staging verifies before any slice replaces its predecessor ───────

describe("a refused upload leaves the prior drop untouched (D17)", () => {
  test("an abandoned or refused upload never replaces the prior drop's slice", async () => {
    const prior = await sliceOf({ rowKey: "prior-row" });
    const { db, under } = memoryDb([
      { accountId: `${STAGE_NS}${ACCT}`, body: renderStageBody(prior, SHA_A) },
    ]);
    const next = await sliceOf({ rowKey: "next-row" });
    // Batch 0 of three lands; batch 1 never arrives.
    const first = await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 3, slices: [next] },
      db,
    );
    assert.equal(first.ok, true);
    const staged = () => parseStageBody(under(`${STAGE_NS}${ACCT}`)[0]?.body ?? "");
    // Mid-upload, the evidence the faces cite is still the prior drop's.
    assert.equal(staged()?.dropSha, SHA_A, "a half-landed upload replaced the slice");
    assert.equal(staged()?.slice.rows[0].k, "prior-row");
    // The final batch arrives with the manifest and the gap is found.
    const last = await stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 2,
        totalBatches: 3,
        slices: [],
        manifest: manifestFor(SHA_B, [next], { totalBatches: 3 }),
      },
      db,
    );
    assert.equal(last.ok, false);
    assert.equal(last.verified, false);
    assert.deepEqual(last.missingBatches, [1]);
    assert.equal(staged()?.dropSha, SHA_A, "a refused upload replaced the slice");
    assert.equal(staged()?.slice.rows[0].k, "prior-row");
  });

  test("a verified upload swaps the drop in and leaves nothing pending", async () => {
    const prior = await sliceOf({ rowKey: "prior-row" });
    const { db, notes, under } = memoryDb([
      { accountId: `${STAGE_NS}${ACCT}`, body: renderStageBody(prior, SHA_A) },
    ]);
    const next = await sliceOf({ rowKey: "next-row" });
    await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 2, slices: [next] },
      db,
    );
    const reply = await stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 1,
        totalBatches: 2,
        slices: [],
        manifest: manifestFor(SHA_B, [next]),
      },
      db,
    );
    assert.equal(reply.ok, true);
    assert.equal(reply.verified, true);
    const rows = under(`${STAGE_NS}${ACCT}`);
    assert.equal(rows.length, 1);
    assert.equal(parseStageBody(rows[0].body)?.dropSha, SHA_B);
    assert.equal(parseStageBody(rows[0].body)?.slice.rows[0].k, "next-row");
    assert.equal(
      notes.filter((n) => n.accountId.startsWith(STAGE_PENDING_NS)).length,
      0,
      "a pending slice outlived the swap",
    );
    // The swapped-in slice keeps the activity door (P4).
    assert.equal(rows[0].door, "activity");
  });

  test("the pending slices sit inside the take-back's reach and outside every face's read", () => {
    assert.ok(STAGE_PENDING_NS.startsWith(STAGE_NS));
    assert.ok(SECOND_RECORD_SPANS.some((s) => STAGE_PENDING_NS.startsWith(s.ns)));
  });
});

// ── A4.11 · an incomplete upload refuses to run ─────────────────────────────
// The run is the distillation pass both doors drive after the upload
// (src/app/room/chute.tsx, src/app/activity/dock.tsx, through activityRun).
// Whatever a client does, the pass itself refuses a drop whose manifest has
// not verified it whole: it distills nothing, writes no rollup or gem, and
// says why.

describe("an incomplete upload refuses to run (A4.11)", () => {
  const written = (notes: NoteRow[]) =>
    notes.filter(
      (n) =>
        n.accountId.startsWith(GEMS_NS) ||
        (n.accountId.startsWith(ACTIVITY_NS) &&
          !n.accountId.startsWith(STAGE_NS) &&
          n.accountId !== MANIFEST_ID),
    );

  test("a drop still uploading, with no manifest yet, does not run", async () => {
    const { db, notes } = memoryDb();
    const next = await sliceOf({ rowKey: "next-row" });
    const first = await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 2, slices: [next] },
      db,
    );
    assert.equal(first.ok, true);
    const before = notes.length;
    const pass = await runActivityPass({ db, deadlineMs: Date.now() + 5_000 });
    assert.equal(pass.ok, false);
    assert.equal(pass.done, false);
    assert.equal(pass.reason, "The drop is still uploading.");
    assert.equal(notes.length, before, "a refused pass wrote something");
    assert.deepEqual(written(notes), []);
  });

  test("a batch that never arrived refuses the drop, and the pass refuses with its line", async () => {
    const { db, notes } = memoryDb();
    const next = await sliceOf({ rowKey: "next-row" });
    await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 3, slices: [next] },
      db,
    );
    const last = await stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 2,
        totalBatches: 3,
        slices: [],
        manifest: manifestFor(SHA_B, [next], { totalBatches: 3 }),
      },
      db,
    );
    assert.equal(last.ok, false);
    const pass = await runActivityPass({ db, deadlineMs: Date.now() + 5_000 });
    assert.equal(pass.ok, false);
    assert.equal(
      pass.done,
      true,
      "a refused drop is finished: nothing runs later either",
    );
    assert.equal(pass.remaining, 0);
    assert.match(
      pass.reason ?? "",
      /^\d{2}:\d{2} · 1 of 3 batches never arrived\. The last drop still stands\./,
    );
    assert.deepEqual(written(notes), []);
    // Asked again, it refuses again; nothing queues behind the refusal.
    const again = await runActivityPass({ db, deadlineMs: Date.now() + 5_000 });
    assert.equal(again.ok, false);
    assert.deepEqual(written(notes), []);
  });

  test("a slice whose checksum fails verification refuses the drop and the pass", async () => {
    const { db, notes } = memoryDb();
    const next = await sliceOf({ rowKey: "next-row" });
    // The slice's rows changed in transit: its checksum no longer matches.
    const tampered = { ...next, rows: [{ ...next.rows[0], k: "other-row" }] };
    const reply = await stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 0,
        totalBatches: 1,
        slices: [tampered],
        manifest: manifestFor(SHA_B, [next], { totalBatches: 1 }),
      },
      db,
    );
    assert.equal(reply.ok, false);
    assert.ok(reply.mismatched?.includes(ACCT));
    const pass = await runActivityPass({ db, deadlineMs: Date.now() + 5_000 });
    assert.equal(pass.ok, false);
    assert.match(
      pass.reason ?? "",
      /account slices? failed verification\. The last drop still stands\./,
    );
    assert.deepEqual(written(notes), []);
  });

  test("with no drop staged at all, nothing runs", async () => {
    const { db, notes } = memoryDb();
    const pass = await runActivityPass({ db, deadlineMs: Date.now() + 5_000 });
    assert.equal(pass.ok, false);
    assert.equal(pass.reason, "No drop staged.");
    assert.equal(notes.length, 0);
  });
});

// ── D18 · the acted stamp is the first record ───────────────────────────────

const acted = (over: Partial<Gem> = {}): Gem => ({
  dropSha: SHA_A.slice(0, 8),
  verdict: "CONFIRMED",
  createdDay: "2026-09-20",
  actedDay: "",
  who: ["Natalie Borland"],
  whoKind: "account",
  term: "PRICING ASK",
  what: "Natalie asked for pricing",
  whenDay: "2026-09-19",
  signal: "a pricing ask",
  act: "Send Natalie the pricing sheet.",
  reason: "Sep 19 reply asks for pricing.",
  cites: [
    { k: "row-1", day: "2026-09-19", who: "Natalie Borland", subject: "Re: pricing" },
  ],
  ...over,
});

const gemsUnder = (rows: NoteRow[]): Gem[] => parseGemsBody(rows[0]?.body ?? "");

describe("the operator's acted stamp survives the take-back and re-attaches by gem key (D18)", () => {
  test("the take-back clears the gems and keeps the stamp outside every span it clears", async () => {
    const { db, under, notes } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    const r = await takeBackSecondRecord(db);
    assert.equal(r.ok, true);
    assert.equal(under(`${GEMS_NS}${ACCT}`).length, 0, "the export's span dies");
    const kept = parseActedBody(under(`${ACTED_NS}${ACCT}`)[0]?.body ?? "");
    assert.deepEqual(kept, [{ key: gemKey(acted()), day: "2026-09-22" }]);
    for (const span of SECOND_RECORD_SPANS)
      assert.equal(
        ACTED_NS.startsWith(span.ns),
        false,
        `${span.ns} would sweep the stamps`,
      );
    // The stamp row is a first-record row with a door, never a bare one (P3).
    const row = notes.find((n) => n.accountId === `${ACTED_NS}${ACCT}`);
    assert.equal(row?.door, "hand");
    // And every line the operator reads is plain.
    for (const line of r.lines) assert.deepEqual(plainLine(line), [], line);
  });

  test("the next drop that finds the same gem carries the stamp back", async () => {
    const { db, under } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    await takeBackSecondRecord(db);
    await fileGems(ACCT, [acted({ dropSha: SHA_B.slice(0, 8) })], undefined, db);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0]?.actedDay, "2026-09-22");
    assert.equal(
      under(`${ACTED_NS}${ACCT}`).length,
      0,
      "the stamp moved back onto its gem",
    );
  });

  test("a re-drop with no take-back keeps the stamp on the fresh gem", async () => {
    const { db, under } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    await fileGems(ACCT, [acted({ dropSha: SHA_B.slice(0, 8) })], undefined, db);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0]?.actedDay, "2026-09-22");
  });

  test("a stamp whose gem this drop did not find waits for a later drop", async () => {
    const { db, under } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    // This drop's gems are about something else.
    const other = acted({ term: "SUPPORT SPIKE", who: ["Greg Williams"] });
    await fileGems(ACCT, [other], undefined, db);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0]?.actedDay, "");
    assert.equal(parseActedBody(under(`${ACTED_NS}${ACCT}`)[0]?.body ?? "").length, 1);
    // A later drop finds it again.
    await fileGems(ACCT, [acted(), other], undefined, db);
    const back = gemsUnder(under(`${GEMS_NS}${ACCT}`));
    assert.equal(back.find((g) => g.term === "PRICING ASK")?.actedDay, "2026-09-22");
  });

  test("new evidence after the stamp is new motion, and a stamp the operator took back stays off", async () => {
    const { db, under } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    await fileGems(ACCT, [acted({ whenDay: "2026-09-25" })], undefined, db);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0]?.actedDay, "");
    // The operator's ↺ clears the stamp on the gem; the next drop leaves it off.
    const {
      db: db2,
      under: under2,
      notes,
    } = memoryDb([
      {
        accountId: `${GEMS_NS}${ACCT}`,
        body: renderGemsBody([acted({ actedDay: "2026-09-22" })]),
      },
    ]);
    await takeBackSecondRecord(db2);
    await fileGems(ACCT, [acted()], undefined, db2);
    const gemsRow = notes.find((n) => n.accountId === `${GEMS_NS}${ACCT}`)!;
    gemsRow.body = renderGemsBody([acted()]);
    await fileGems(ACCT, [acted()], undefined, db2);
    assert.equal(gemsUnder(under2(`${GEMS_NS}${ACCT}`))[0]?.actedDay, "");
  });
});

// ── D19 · the book's internal names and our domain come first ──────────────

async function ingestOf(rows: ActivityRow[]) {
  const ing = createIngest(BOOK);
  const p = createCsvParser();
  const text = [headerLine(), ...rows.map(csvLine)].join("\n") + "\n";
  for (const raw of [...p.push(text), ...p.finish()]) ing.takeRow(raw);
  return ing.finish({ fileName: "x.csv", fileBytes: text.length, dropDay: "2026-09-20" });
}

const signed = (name: string, email: string) =>
  `To: someone@example.com\nBody:\nThanks for the time today.\n\nBest regards,\n${name}\nE: ${email}`;

describe("a colleague is a person the book names as internal or whose address is on our domain (D19, pass 8 call 10)", () => {
  test("an account person Assigned on two accounts, with their own address, is not a colleague", async () => {
    const dana = (id18: string, account: string) =>
      row({
        subject: "Re: the model",
        account,
        id18,
        date: "9/18/2026",
        assigned: "Dana Whitfield",
        taskSubtype: "Email",
        comments: signed("Dana Whitfield", "dana.whitfield@trendpersonnel.com"),
      });
    const { manifest } = await ingestOf([
      dana("001TESTTRENDHR000A", "Trend Personnel"),
      dana("001TESTSTAFFLSG00B", "Staff Leasing CNY"),
    ]);
    assert.equal(manifest.colleagues.includes("Dana Whitfield"), false);
  });

  test("our domain makes a colleague on one account, and a writer who is never Assigned too", async () => {
    const { manifest } = await ingestOf([
      row({
        subject: "Welcome aboard",
        account: "Trend Personnel",
        id18: "001TESTTRENDHR000A",
        date: "9/18/2026",
        assigned: "Anika Steenstra",
        taskSubtype: "Email",
        comments: signed("Anika Steenstra", "anika.steenstra@prismhr.com"),
      }),
      row({
        subject: "Re: onboarding",
        account: "Staff Leasing CNY",
        id18: "001TESTSTAFFLSG00B",
        date: "9/17/2026",
        assigned: "Antaeus Coe",
        taskSubtype: "Email",
        comments: signed("Mary Mahoney", "mary.mahoney@prismhr.com"),
      }),
    ]);
    assert.ok(
      manifest.colleagues.includes("Anika Steenstra"),
      manifest.colleagues.join(", "),
    );
    assert.ok(
      manifest.colleagues.includes("Mary Mahoney"),
      manifest.colleagues.join(", "),
    );
  });

  test("with no address on any row, the two-accounts count is the fallback", async () => {
    const plain = (id18: string, account: string, who: string) =>
      row({
        subject: "Call",
        account,
        id18,
        date: "9/18/2026",
        assigned: who,
        taskSubtype: "Call",
        callType: "Outbound",
      });
    const { manifest } = await ingestOf([
      plain("001TESTTRENDHR000A", "Trend Personnel", "Colleague Two"),
      plain("001TESTSTAFFLSG00B", "Staff Leasing CNY", "Colleague Two"),
      plain("001TESTTRENDHR000A", "Trend Personnel", "Colleague One"),
    ]);
    assert.ok(manifest.colleagues.includes("Colleague Two"));
    assert.equal(manifest.colleagues.includes("Colleague One"), false);
  });
});

// ── pass 8 call 14 · campaign titles are redacted before they are counted ──

describe("campaign titles are money-redacted before they are counted (pass 8 call 14)", () => {
  test("the tally's keys carry no figure", async () => {
    const blast = (subject: string) =>
      row({
        subject,
        account: "Trend Personnel",
        id18: "001TESTTRENDHR000A",
        date: "9/12/2026",
        assigned: "Colleague One",
        taskSubtype: "Task",
      });
    const { slices } = await ingestOf([
      blast("Sent $500 gift card webinar"),
      blast("Opened $500 gift card webinar"),
    ]);
    const keys = Object.keys(slices[0].tally.camps);
    assert.equal(keys.length, 1, keys.join(" | "));
    assert.ok(!/\$|500/.test(keys[0]), keys[0]);
    assert.match(keys[0], /gift card webinar/);
    assert.deepEqual(slices[0].tally.camps[keys[0]], {
      s: 1,
      o: 1,
      c: 0,
      lastOpen: "2026-09-12",
    });
  });
});

// ── D20 and pass 8 call 5 · every first-record row, each at its own moment ─

const gemNote = (g: Gem) => ({
  accountId: `${GEMS_NS}${ACCT}`,
  body: renderGemsBody([g]),
});

describe("the acted sweep reads every first-record row carrying the gem's person (D20, pass 8 call 5)", () => {
  test("a clocked Outlook send where the person is only a recipient stamps the gem", async () => {
    const { db, under } = memoryDb([
      gemNote(acted()),
      {
        accountId: ACCT,
        body: "✉ OL Sep 22 9:12 AM — Re: the model · Antaeus Coe → Greg Williams +1",
        createdAt: new Date("2026-09-22T12:00:00.000Z"),
        source: "outlook",
        actors: "Antaeus Coe → Greg Williams +1",
        recipients: "Greg Williams, Natalie Borland",
      },
    ]);
    assert.equal(await actedSweep(db), 1);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0].actedDay, "2026-09-22");
  });

  test("their own reply moves the gem too, not only the operator's sends", async () => {
    const { db, under } = memoryDb([
      gemNote(acted()),
      {
        accountId: ACCT,
        body: "✉ OL Sep 23 10:02 AM — Re: the model · Natalie Borland → Antaeus Coe",
        createdAt: new Date("2026-09-23T12:00:00.000Z"),
        source: "outlook",
        actors: "Natalie Borland → Antaeus Coe",
        recipients: "Antaeus Coe",
      },
    ]);
    assert.equal(await actedSweep(db), 1);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0].actedDay, "2026-09-23");
  });

  test("a ✕-parked row is hidden from the sweep (X1)", async () => {
    const { db, under } = memoryDb(
      [
        gemNote(acted()),
        {
          id: "parked",
          accountId: ACCT,
          body: "✉ Re: the model — sent to Natalie Borland.",
          createdAt: new Date("2026-09-22T15:30:00.000Z"),
          source: "act-lane",
          actors: "Antaeus Coe → Natalie Borland",
          recipients: "natalie.borland@trendpersonnel.com",
        },
      ],
      [{ accountId: "hide:note:parked", status: "parked" }],
    );
    assert.equal(await actedSweep(db), 0);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0].actedDay, "");
  });

  // Pass 9's tail (A4.14, A8.4): the run swept only once per weekly export,
  // so a send filed through the Chute cleared its gem's nag a week later. A
  // filing now sweeps its own account at once ("the acted sweep can re-stamp
  // from the record any time it truly speaks", the Act Lane), and nothing
  // beyond it: another account's gem waits for its own record or the run.
  test("a filing's sweep stamps its own account's gem and leaves every other account's", async () => {
    const OTHER = "001TESTSTAFFLSG00B";
    const send = (accountId: string) => ({
      accountId,
      body: "✉ OL Sep 22 9:12 AM — Re: the pricing sheet · Antaeus Coe → Natalie Borland",
      createdAt: new Date("2026-09-22T12:00:00.000Z"),
      source: "outlook",
      actors: "Antaeus Coe → Natalie Borland",
      recipients: "Natalie Borland",
    });
    const { db, under } = memoryDb([
      gemNote(acted()),
      { accountId: `${GEMS_NS}${OTHER}`, body: renderGemsBody([acted()]) },
      send(ACCT),
      send(OTHER),
    ]);
    assert.equal(await actedSweep(db, { accountId: ACCT }), 1);
    assert.equal(gemsUnder(under(`${GEMS_NS}${ACCT}`))[0].actedDay, "2026-09-22");
    assert.equal(
      gemsUnder(under(`${GEMS_NS}${OTHER}`))[0].actedDay,
      "",
      "another account waits",
    );
    // An account with no gems costs one read and stamps nothing; the run's
    // own sweep still reaches every account.
    assert.equal(await actedSweep(db, { accountId: "001TESTNOGEMS0000C" }), 0);
    assert.equal(await actedSweep(db), 1);
    assert.equal(gemsUnder(under(`${GEMS_NS}${OTHER}`))[0].actedDay, "2026-09-22");
  });

  test("the filing runs its account's sweep after the write, fails open and never holds the filing", () => {
    // roomPaste gates on the session and the database, so its wiring is
    // read from source, as tests/ingest-filing.test.ts reads it.
    const actions = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");
    const paste = actions.slice(
      actions.indexOf("export async function roomPaste("),
      actions.indexOf("async function fileClaimed("),
    );
    assert.match(
      paste,
      /return await fileClaimed\(\{[\s\S]*?\}\)\.then\(\(r\) => sweptAfter\(acct\.id, r\)\);/,
    );
    const helper = actions.slice(
      actions.indexOf("function sweptAfter<"),
      actions.indexOf("export async function roomPaste("),
    );
    assert.ok(helper.length > 0, "the helper sits before roomPaste");
    // Only a filing that wrote rows, after it answered, on its own account.
    assert.match(helper, /if \(r\.ok && r\.filed > 0\)/);
    assert.match(
      helper,
      /after\(async \(\) => \{\s*try \{\s*await actedSweep\(getPrisma\(\), \{ accountId \}\);\s*\} catch \{/,
    );
    // Both the scheduling and the sweep fail open: neither can break or slow
    // the filing, whose result goes back as it came.
    assert.equal((helper.match(/\} catch \{/g) ?? []).length, 2);
    assert.match(helper, /return r;\s*\}\s*$/);
  });

  test("the earliest row after the gem's day wins; the gem's own day and another person do not count", () => {
    const rows = [
      {
        day: "2026-09-20",
        actors: "Antaeus Coe → Natalie Borland",
        recipients: [],
        hidden: false,
      },
      {
        day: "2026-09-24",
        actors: "Natalie Borland → Antaeus Coe",
        recipients: [],
        hidden: false,
      },
      {
        day: "2026-09-21",
        actors: "Antaeus Coe → Greg Williams",
        recipients: [],
        hidden: false,
      },
      {
        day: "2026-09-23",
        actors: "Antaeus Coe → Greg Williams",
        recipients: ["Natalie Borland"],
        hidden: false,
      },
    ];
    assert.equal(actedDayFor(acted(), rows), "2026-09-23");
    assert.equal(actedDayFor(acted({ who: ["Pat Example"] }), rows), "");
  });
});

// ── X1 · the distiller's context pack never reads a ✕-parked row ───────────

describe("hidden is hidden: the context pack skips ✕-parked rows (X1)", () => {
  test("a parked send is neither the last outbound nor a record line", async () => {
    const { db } = memoryDb(
      [
        {
          id: "seen",
          accountId: ACCT,
          body: "✉ Re: intro — sent to Natalie Borland.",
          createdAt: new Date("2026-09-10T15:00:00.000Z"),
          source: "act-lane",
          actors: "Antaeus Coe → Natalie Borland",
        },
        {
          id: "parked",
          accountId: ACCT,
          body: "✉ Re: the wrong account entirely — sent to Pat Example.",
          createdAt: new Date("2026-09-12T15:00:00.000Z"),
          source: "act-lane",
          actors: "Antaeus Coe → Pat Example",
        },
      ],
      [{ accountId: "hide:note:parked", status: "parked" }],
    );
    const pack = await contextPackFor(ACCT, "Trend Personnel", db);
    const text = pack.lines.join("\n");
    assert.ok(!/wrong account|Pat Example/.test(text), text);
    assert.match(text, /Re: intro/);
  });
});

// ── A2.4 · the context pack reads the account read's last outbound ─────────
// The Ted doctrine: a derived fact reads the widest live source, and a
// fact's two stores merge by latest (C3). The pack is what the distiller and
// the refuter are told about the operator's own motion, so it reads the
// account read's lastOutbound: every row under every id the account folds
// into, the touch log merged by latest. It used to take the newest 80 rows
// under the raw id alone, with no fold and no touch log.

describe("the context pack's last outbound is the account read's (A2.4; C3)", () => {
  const outbound = (pack: { lines: string[] }) =>
    pack.lines.find((l) => l.startsWith("the operator's last outbound")) ?? "";
  // My HR Professionals: the shell id folds into the substantive row
  // (src/lib/book/merge.ts).
  const SPMI = "001F000000w389qIAA";
  const SHELL = "0013k00002dGqODAA0";

  test("a send filed under the account's shell id is the last outbound (the fold)", async () => {
    const { db } = memoryDb([
      {
        id: "older",
        accountId: SPMI,
        body: "✉ Re: intro — sent to Joseph Lyon.",
        createdAt: new Date("2026-09-10T15:00:00.000Z"),
        source: "act-lane",
        actors: "Antaeus Coe → Joseph Lyon",
      },
      {
        id: "newer",
        accountId: SHELL,
        body: "✉ Re: the census template — sent to Joseph Lyon.",
        createdAt: new Date("2026-09-20T15:00:00.000Z"),
        source: "act-lane",
        actors: "Antaeus Coe → Joseph Lyon",
      },
    ]);
    for (const asked of [SPMI, SHELL]) {
      const line = outbound(await contextPackFor(asked, "myhrpros (SPMI)", db));
      assert.match(
        line,
        /^the operator's last outbound: 2026-09-20 to Joseph Lyon/,
        line,
      );
      assert.match(line, /the census template/, line);
    }
  });

  test("a logged touch with its message, later than the record's send, is the last outbound", async () => {
    const { db } = memoryDb(
      [
        {
          id: "send",
          accountId: ACCT,
          body: "✉ Re: intro — sent to Natalie Borland.",
          createdAt: new Date("2026-09-10T15:00:00.000Z"),
          source: "act-lane",
          actors: "Antaeus Coe → Natalie Borland",
        },
      ],
      [],
      [
        {
          subjectKey: `outreach:${ACCT}`,
          kind: "account",
          label: "Trend Personnel",
          detail: "",
          message: "Called about the census template",
          contactedAt: new Date("2026-09-25T15:00:00.000Z"),
          followUpAt: new Date("2026-09-27T15:00:00.000Z"),
          intervalDays: 2,
          status: "awaiting",
          log: [],
        },
      ],
    );
    const line = outbound(await contextPackFor(ACCT, "Trend Personnel", db));
    assert.match(line, /^the operator's last outbound: 2026-09-25/, line);
    assert.match(line, /Called about the census template/, line);
  });

  test("the record's send, when it is the later of the two, still leads", async () => {
    const { db } = memoryDb(
      [
        {
          id: "send",
          accountId: ACCT,
          body: "✉ Re: intro — sent to Natalie Borland.",
          createdAt: new Date("2026-09-28T15:00:00.000Z"),
          source: "act-lane",
          actors: "Antaeus Coe → Natalie Borland",
        },
      ],
      [],
      [
        {
          subjectKey: `outreach:${ACCT}`,
          kind: "account",
          label: "Trend Personnel",
          message: "Called about the census template",
          contactedAt: new Date("2026-09-25T15:00:00.000Z"),
          followUpAt: new Date("2026-09-27T15:00:00.000Z"),
          intervalDays: 2,
          status: "awaiting",
          log: [],
        },
      ],
    );
    const line = outbound(await contextPackFor(ACCT, "Trend Personnel", db));
    assert.match(
      line,
      /^the operator's last outbound: 2026-09-28 to Natalie Borland/,
      line,
    );
  });

  test("a send behind eighty newer rows is still the last outbound", async () => {
    const quiet = Array.from({ length: 85 }, (_, i) => ({
      id: `q${i}`,
      accountId: ACCT,
      body: `research note ${i}`,
      createdAt: new Date(Date.parse("2026-09-12T15:00:00.000Z") + i * 60_000),
      source: "hand",
    }));
    const { db } = memoryDb([
      {
        id: "send",
        accountId: ACCT,
        body: "✉ Re: intro — sent to Natalie Borland.",
        createdAt: new Date("2026-09-10T15:00:00.000Z"),
        source: "act-lane",
        actors: "Antaeus Coe → Natalie Borland",
      },
      ...quiet,
    ]);
    const line = outbound(await contextPackFor(ACCT, "Trend Personnel", db));
    assert.match(
      line,
      /^the operator's last outbound: 2026-09-10 to Natalie Borland/,
      line,
    );
  });
});

// ── C4 · the run's receipts in plain speech, every count arithmetic ────────

// The second record's faces read the first record's half of a fact from
// the one assembly the context pack reads (A2.4; A4.1): the draft desk's
// "last touched" takes its first-record day from here (src/app/activity/
// evidence/route.ts), so a shell-filed send and the touch log both count.
describe("the first record's read for the second record's faces is the account read (A2.4; A4.1)", () => {
  const SPMI = "001F000000w389qIAA";
  const SHELL = "0013k00002dGqODAA0";
  const send = {
    id: "send",
    accountId: SHELL,
    body: "✉ Re: the census template — sent to Joseph Lyon.",
    createdAt: new Date("2026-09-20T15:00:00.000Z"),
    source: "act-lane",
    actors: "Antaeus Coe → Joseph Lyon",
  };

  test("a send under the shell id and a later logged touch both reach the last touch", async () => {
    const { db } = memoryDb([send]);
    const { read } = await firstRecordReadFor(SPMI, "myhrpros (SPMI)", db);
    assert.equal(read.lastTouch?.at.slice(0, 10), "2026-09-20");
    const logged = memoryDb(
      [send],
      [],
      [
        {
          subjectKey: `outreach:${SPMI}`,
          kind: "account",
          label: "myhrpros (SPMI)",
          contactedAt: new Date("2026-09-25T15:00:00.000Z"),
          status: "awaiting",
          message: "Sent the census template again.",
          detail: "",
        },
      ],
    );
    const both = await firstRecordReadFor(SPMI, "myhrpros (SPMI)", logged.db);
    assert.equal(both.read.lastTouch?.at.slice(0, 10), "2026-09-25");
  });

  test("a ✕-parked send is not the last touch", async () => {
    const { db } = memoryDb(
      [{ ...send, id: "parked", accountId: SPMI }],
      [{ accountId: "hide:note:parked", status: "parked" }],
    );
    const { read } = await firstRecordReadFor(SPMI, "myhrpros (SPMI)", db);
    assert.equal(read.lastTouch, null);
  });

  test("the evidence route hands the read's last touch to the desk line", () => {
    const route = readFileSync(join(cwd(), "src/app/activity/evidence/route.ts"), "utf8");
    assert.match(route, /firstRecordReadFor\(acct, getPeo\(acct\)\?\.name \?\? ""\)/);
    assert.match(
      route,
      /deskLineFor\(\s*who,\s*rows,\s*second\?\.rollup \?\? null,\s*touched \? chicagoDay\(touched\) : "",\s*\)/,
    );
  });
});

describe("the run's receipt lines are plain and keep their counts (C4)", () => {
  test("the drop's opening lines", async () => {
    const next = await sliceOf({ rowKey: "next-row" });
    const { db, under } = memoryDb();
    await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 2, slices: [next] },
      db,
    );
    await stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 1,
        totalBatches: 2,
        slices: [],
        manifest: manifestFor(SHA_B, [next], {
          textRows: 0,
          headerDiff: { missing: ["Full Comments"], extra: [] },
          collisions: ["Pat Example"],
        }),
      },
      db,
    );
    const store = parseManifestBody(under(MANIFEST_ID)[0].body);
    const receipt = store?.run.receipt ?? [];
    assert.ok(receipt.length >= 4, receipt.join("\n"));
    for (const line of receipt) assert.deepEqual(plainLine(line), [], line);
    const text = receipt.join("\n");
    assert.match(text, /9 rows across 1 account/);
    assert.match(text, /3 rows matched no book account: Advocate Pay LLC with 3/);
  });

  test("the run's closing lines", async () => {
    const ids = ["001TESTTRENDHR000A", "001TESTSTAFFLSG00B", "001TESTBACKOFC000C"];
    const manifest = manifestFor(SHA_B, [], {
      accounts: ids.map((id) => ({
        id,
        name: id,
        rowsSum: "x",
        tallySum: "y",
        rows: 3,
        humanRows: 3,
      })),
    });
    const closing = async (covered: Record<string, string>, gemsFor: string[]) => {
      const run = { ...emptyRunState(), phase: "ready" as const, covered };
      const { db } = memoryDb([
        {
          accountId: MANIFEST_ID,
          body: renderManifestBody({ manifest, run, prior: null }),
        },
        ...gemsFor.map((id) => ({
          accountId: `${GEMS_NS}${id}`,
          body: renderGemsBody([acted()]),
        })),
        ...ids.map((id) => ({
          accountId: `${ACTIVITY_NS}${id}`,
          body: renderRollupBody({
            dropSha: SHA_B,
            dropDay: "2026-09-20",
            window: { from: "2026-06-20", to: "2026-09-19" },
            lanes: { human: 3, csm: 0, support: 0, intent: 0, machinery: 0 },
            emails: { human: 3, csm: 0, support: 0, intent: 0, machinery: 0 },
            intent: { s: 0, o: 0, c: 0 },
            receipts: 0,
            lastHuman: null,
            lastOrgInbound: "",
            lastTheirs: null,
            actors: [],
            threads: [],
            verdict: "",
          }),
        })),
      ]);
      const r = await runActivityPass({ db });
      for (const line of r.receipt) assert.deepEqual(plainLine(line), [], line);
      return r.receipt.join("\n");
    };
    const all = await closing(
      { [ids[0]]: "gems", [ids[1]]: "verdict", [ids[2]]: "verdict" },
      [ids[0]],
    );
    assert.match(all, /Coverage is 100%/);
    assert.match(all, /All 3 active accounts hold a gem or a verdict/);
    assert.match(
      all,
      /3 accounts distilled\. 1 holds? confirmed gems?, 2 hold a verdict/,
    );
    const held = await closing({ [ids[0]]: "gems", [ids[1]]: "held", [ids[2]]: "held" }, [
      ids[0],
      ids[1],
    ]);
    assert.match(held, /The distiller was down for 2 accounts/);
    assert.match(
      held,
      /COVERAGE FAILED\. 1 active account holds neither a gem nor a verdict/,
    );
  });
});

// ── a new drop is not a re-drop ─────────────────────────────────────────────
// The store resets to the incoming sha at a drop's first batch, so the old
// same-sha test was always true at its last: every account that already held
// a rollup counted as covered, and a new drop distilled only new accounts.
// The rollup's own head names its drop, and that is the test now.

describe("a new drop distills what changed; only the same file again costs nothing", () => {
  const rollupBody = (sha: string) =>
    renderRollupBody({
      dropSha: sha,
      dropDay: "2026-09-13",
      window: { from: "2026-06-13", to: "2026-09-12" },
      lanes: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
      emails: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
      intent: { s: 0, o: 0, c: 0 },
      receipts: 0,
      lastHuman: null,
      lastOrgInbound: "",
      lastTheirs: null,
      actors: [],
      threads: [],
      verdict: "",
    });

  const dropTwice = async (rollupSha: string) => {
    const prior = await sliceOf({ rowKey: "prior-row" });
    const next = await sliceOf({ rowKey: "next-row" });
    const done = {
      manifest: manifestFor(SHA_A, [prior]),
      run: { ...emptyRunState(), phase: "done" as const, covered: {} },
      prior: null,
    };
    const { db } = memoryDb([
      { accountId: MANIFEST_ID, body: renderManifestBody(done) },
      { accountId: `${STAGE_NS}${ACCT}`, body: renderStageBody(prior, SHA_A) },
      { accountId: `${ACTIVITY_NS}${ACCT}`, body: rollupBody(rollupSha) },
    ]);
    await stageActivityBatch(
      { dropSha: SHA_B, batchIndex: 0, totalBatches: 2, slices: [next] },
      db,
    );
    return stageActivityBatch(
      {
        dropSha: SHA_B,
        batchIndex: 1,
        totalBatches: 2,
        slices: [],
        manifest: manifestFor(SHA_B, [next]),
      },
      db,
    );
  };

  test("an account whose rollup came from the last drop and whose rows changed waits to be distilled", async () => {
    const reply = await dropTwice(SHA_A);
    assert.deepEqual(reply.queued, { distill: 1, intentOnly: 0 });
  });

  test("an account whose rollup this very drop wrote stays covered", async () => {
    const reply = await dropTwice(SHA_B);
    assert.deepEqual(reply.queued, { distill: 0, intentOnly: 0 });
  });
});

// ── A4.1 · the second record inherits every law of the first (pass 13) ─────
// The decree names four laws: the record outranks every seed, machinery is
// never a person, money never renders, and derived facts read the widest
// merge of both records by latest. Each is pinned here on the second
// record's own path, so the row holds across the decree's whole scope.

const rollupOf = (over: Partial<Rollup>): Rollup => ({
  dropSha: "037742a0",
  dropDay: "2026-09-20",
  window: { from: "2026-07-01", to: "2026-09-20" },
  lanes: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  emails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  intent: { s: 0, o: 0, c: 0 },
  receipts: 0,
  lastHuman: null,
  lastOrgInbound: "",
  lastTheirs: null,
  actors: [],
  threads: [],
  verdict: "",
  ...over,
});
const srOf = (rollup: Partial<Rollup>): SecondRecord => ({
  rollup: rollupOf(rollup),
  gems: [],
  support: null,
  intent: null,
});
const readOf = (lastTouch: { at: string; who: string } | null) =>
  ({
    lastTouch: lastTouch ? { ...lastTouch, awaitingReply: false, source: "note" } : null,
    relationship: { name: "Dana Whitfield" },
  }) as unknown as Parameters<typeof lastHumanTouch>[0];
const PAT = {
  day: "2026-09-18",
  how: "Email",
  who: "Pat Lee",
  kind: "account",
  subject: "Re: x",
};
const NOW = new Date("2026-09-20T15:00:00Z");

describe("the second record inherits every law of the first (A4.1, whole scope)", () => {
  test("the record outranks every seed: the export's last human touch stands in only until the operator's record speaks", () => {
    // Nothing on the first record: the export speaks, and says it is the export's.
    assert.deepEqual(lastHumanTouch(readOf(null), srOf({ lastHuman: PAT })), {
      who: "Pat Lee",
      day: "2026-09-18",
      kind: "account",
      record: "salesforce",
    });
    // The record speaks later: it leads, as the operator's own hand.
    const spoke = lastHumanTouch(
      readOf({ at: "2026-09-20T14:00:00Z", who: "Antaeus Coe" }),
      srOf({ lastHuman: PAT }),
    );
    assert.equal(spoke?.record, "record");
    assert.equal(spoke?.day, "2026-09-20");
    // A tie goes to the record.
    assert.equal(
      lastHumanTouch(
        readOf({ at: "2026-09-18T14:00:00Z", who: "Antaeus Coe" }),
        srOf({ lastHuman: PAT }),
      )?.record,
      "record",
    );
  });

  test("machinery is never a person: a mechanism's row names nobody, and the bare datetime never speaks", async () => {
    assert.equal(isMachineryName("Automated Process"), true);
    const { slices } = await ingestOf([
      row({
        subject: "Re: payroll",
        account: "Trend Personnel",
        id18: "001TESTTRENDHR000A",
        date: "9/18/2026",
        assigned: "Automated Process",
        taskSubtype: "Email",
        comments: "To: someone@example.com\nBody:\nWe will have the model to you Friday.",
      }),
    ]);
    const rollup = buildRollup({
      slice: slices[0],
      dropSha: "x",
      dropDay: "2026-09-20",
      window: { from: "2026-07-01", to: "2026-09-20" },
      colleagues: new Set(),
      accountPeople: new Set(),
    });
    assert.equal(rollup.lastTheirs, null);
    assert.notEqual(rollup.lastHuman?.who, "Automated Process");
    // The account-level Last Email Received is a datetime, never their voice:
    // it warms nothing and excludes nothing.
    const bare = srOf({ lastOrgInbound: "2026-09-19 10:00", lastTheirs: null });
    assert.deepEqual(orgSignalsOf(bare), { theirsAt: "", theirs: null, mktgLive: false });
    assert.deepEqual(
      liveMotionIds(new Map(), new Map(), NOW, new Map([["A", bare]])),
      new Set(),
    );
  });

  test("money never renders: the staged subject and body, the rollup's subjects and the Sendbook's head carry no figure", async () => {
    const { slices } = await ingestOf([
      row({
        subject: "Re: the $12,000 quote",
        account: "Trend Personnel",
        id18: "001TESTTRENDHR000A",
        date: "9/18/2026",
        assigned: "Dana Whitfield",
        taskSubtype: "Email",
        comments:
          "To: someone@example.com\nBody:\nThe $12,000 quote works for us at 1,200 USD a head.\n\nBest regards,\nDana Whitfield\nE: dana.whitfield@trendpersonnel.com",
      }),
    ]);
    const staged = slices[0].rows[0];
    assert.ok(!/12,000|\$/.test(staged.s), staged.s);
    assert.ok(!/12,000|1,200|\$/.test(staged.c ?? ""), staged.c);
    const rollup = buildRollup({
      slice: slices[0],
      dropSha: "x",
      dropDay: "2026-09-20",
      window: { from: "2026-07-01", to: "2026-09-20" },
      colleagues: new Set(),
      accountPeople: new Set(["Dana Whitfield"]),
    });
    assert.ok(
      !/12,000|\$/.test(rollup.lastHuman?.subject ?? ""),
      rollup.lastHuman?.subject,
    );
    assert.ok(
      !/12,000|\$/.test(rollup.lastTheirs?.subject ?? ""),
      rollup.lastTheirs?.subject,
    );
    // A rollup written before the subject was redacted at staging still
    // renders clean where it speaks.
    const head = orgSignalsOf(
      srOf({
        lastTheirs: { day: "2026-09-18", who: "Dana", subject: "Re: the $12,000 quote" },
      }),
    ).theirs?.head;
    assert.ok(head && !/12,000|\$/.test(head), head);
    // And the evidence route redacts both fields again on the way out.
    const route = readFileSync(join(cwd(), "src/app/activity/evidence/route.ts"), "utf8");
    assert.match(route, /subject: redactMoney\(cleanSubject\(r\.s\)\)/);
    assert.match(route, /excerpt: r\.c \? redactMoney\(cleanExcerpt\(r\.c\)\)/);
  });

  test("derived facts read the widest merge of both records by latest: the later record leads, and either record's inbound excludes", () => {
    // The export's later day leads; the record's later moment leads.
    assert.equal(
      lastHumanTouch(
        readOf({ at: "2026-09-10T14:00:00Z", who: "Antaeus Coe" }),
        srOf({ lastHuman: PAT }),
      )?.record,
      "salesforce",
    );
    assert.equal(
      lastHumanTouch(
        readOf({ at: "2026-09-19T14:00:00Z", who: "Antaeus Coe" }),
        srOf({ lastHuman: PAT }),
      )?.record,
      "record",
    );
    // Groundwork's exclusion: an inbound on either record within 21 days
    // means the deal is being worked.
    const theirs = (day: string) =>
      srOf({ lastTheirs: { day, who: "Pat Lee", subject: "Re: x" } });
    assert.deepEqual(
      liveMotionIds(
        new Map(),
        new Map([["A", { lastInbound: "2026-09-15T12:00:00Z" }]]),
        NOW,
        new Map(),
      ),
      new Set(["A"]),
    );
    assert.deepEqual(
      liveMotionIds(new Map(), new Map(), NOW, new Map([["B", theirs("2026-09-15")]])),
      new Set(["B"]),
    );
    assert.deepEqual(
      liveMotionIds(new Map(), new Map(), NOW, new Map([["C", theirs("2026-08-01")]])),
      new Set(),
    );
  });
});

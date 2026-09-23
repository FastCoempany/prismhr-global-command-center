// The Trend Personnel Services row of 2026-09-23, which read:
//
//   NEXT MOVE   Wait on Antaeus. You wrote today.
//
// Antaeus is the operator. The room told him to wait on himself, about a day
// that had not arrived, on an account that had been silent for three weeks.
//
// One row in the record caused all of it:
//
//   2026-10-02 | sf-ai | Antaeus Coe → Antaeus Coe
//   ✔ SF Oct 2 8:00 AM — Follow up with TrendHR
//
// A Salesforce task the operator set for himself, dated nine days ahead. Three
// separate faults stacked on it:
//
//   1. newestOutbound counted it as a send. A reminder addressed to nobody but
//      yourself never reached the account, so nothing is owed back.
//   2. targetOf handed back the operator's own name. Its home-side guard fires
//      only on COLLAPSED lines, and this one carried no "+N".
//   3. daysBetween clamps at zero, so a date in the future read as "today".
//
// The colleague case is deliberate and survives untouched: a send addressed
// only to Anika leaves the ball with Anika, and the row should say so. You
// simply cannot wait on yourself.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { csms } from "@/lib/book";
import { isHomeSideName } from "@/lib/intel/provenance";
import { lastTouchRead, newestOutbound, targetOf } from "@/lib/room/touch";
import { readDeal } from "@/lib/room/engine";

const home = (n: string) => isHomeSideName(n, csms);
const note = (actors: string, createdAt: string, body = "") => ({
  actors,
  createdAt,
  body,
  source: "outlook",
});

const TODAY = new Date("2026-09-23T17:00:00Z");

// The row as the store actually holds it.
const SELF_TASK = {
  actors: "Antaeus Coe → Antaeus Coe",
  createdAt: "2026-10-02T12:00:00",
  body: "✔ SF Oct 2 8:00 AM — Follow up with TrendHR · Antaeus Coe → Antaeus Coe",
  source: "sf-ai",
};
const REAL_SEND = note(
  "Antaeus Coe → Melanie Dreyer",
  "2026-09-02T14:44:00Z",
  "✉ OL 09/02 9:44 AM — Re: Philippines Pricing · Antaeus Coe → Melanie Dreyer",
);

describe("a note addressed only to yourself is not a touch", () => {
  test("the self-assigned task never becomes the newest outbound", () => {
    const out = newestOutbound([SELF_TASK, REAL_SEND], { now: TODAY });
    assert.equal(out?.actors, "Antaeus Coe → Melanie Dreyer");
  });

  test("with nothing else on file there is no touch at all", () => {
    assert.equal(newestOutbound([SELF_TASK], { now: TODAY }), null);
    assert.equal(lastTouchRead([SELF_TASK], null, home, TODAY), null);
  });

  test("a collapsed line is still a touch — other people were on it", () => {
    // "+2" means it went somewhere besides our own inbox.
    const out = newestOutbound(
      [note("Antaeus Coe → Antaeus Coe +2", "2026-09-20T12:00:00Z")],
      { now: TODAY },
    );
    assert.ok(out, "a send with others on it must still count");
  });
});

describe("nobody waits on themselves", () => {
  test("the operator's own name is blanked, collapsed or not", () => {
    assert.equal(targetOf("Antaeus Coe → Antaeus Coe", home), "");
    assert.equal(targetOf("Antaeus Coe → Antaeus Coe +1", home), "");
    assert.equal(targetOf("Lesha Cyphers → Antaeus Coe", home), "");
  });

  test("a colleague addressed alone still keeps the ball — unchanged", () => {
    // Deliberate since 2026-08-27: you asked Anika, it is Anika's to answer.
    assert.equal(targetOf("Antaeus Coe → Anika Steenstra", home), "Anika Steenstra");
  });

  test("a colleague leading a collapsed line is still blanked — unchanged", () => {
    assert.equal(targetOf("Antaeus Coe → Lesha Cyphers +2", home), "");
  });

  test("an account person is untouched either way", () => {
    assert.equal(targetOf("Antaeus Coe → Melanie Dreyer", home), "Melanie Dreyer");
    assert.equal(targetOf("Antaeus Coe → Leilani Gonzalez +2", home), "Leilani Gonzalez");
  });
});

describe("a send dated ahead of today has not happened", () => {
  test("a future row loses to the real one behind it", () => {
    const future = note("Antaeus Coe → Melanie Dreyer", "2026-10-02T12:00:00Z");
    const out = newestOutbound([future, REAL_SEND], { now: TODAY });
    assert.equal(out?.createdAt, REAL_SEND.createdAt);
  });

  test("without a clock the read is unchanged — no silent behavior change", () => {
    const future = note("Antaeus Coe → Melanie Dreyer", "2026-10-02T12:00:00Z");
    assert.equal(newestOutbound([future, REAL_SEND])?.createdAt, future.createdAt);
  });

  test("today's own send is not mistaken for a future one", () => {
    const todaySend = note("Antaeus Coe → Melanie Dreyer", "2026-09-23T09:00:00Z");
    assert.equal(newestOutbound([todaySend], { now: TODAY })?.createdAt, todaySend.createdAt);
  });
});

describe("the Trend row, end to end", () => {
  const notes = [SELF_TASK, REAL_SEND];

  test("the touch clock reads the real send, three weeks back", () => {
    const tr = lastTouchRead(notes, null, home, TODAY);
    assert.ok(tr);
    assert.equal(tr!.at.slice(0, 10), "2026-09-02");
    assert.equal(tr!.who, "Melanie Dreyer");
  });

  test("the stage stops telling the operator to wait on himself", () => {
    const tr = lastTouchRead(notes, null, home, TODAY)!;
    const read = readDeal({
      accountName: "Trend Personnel Services",
      step: { nodeKey: "proposal", nodeLabel: "Proposal", item: "Philippines pricing", ageDays: 21 },
      timing: null,
      lastTouch: { at: tr.at, awaitingReply: tr.awaitingReply, who: "Melanie" },
      lastRecordAt: "2026-10-02T12:00:00",
      now: TODAY,
    });
    assert.ok(!/Antaeus/.test(read.move), `still names the operator: ${read.move}`);
    assert.ok(!/wrote today/.test(read.move), `still claims today: ${read.move}`);
    assert.match(read.move, /Melanie/);
  });
});

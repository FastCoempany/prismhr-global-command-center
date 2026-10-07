// One Chicago day (the Chute brains refactor plan, slice 2; CLAUDE.md, the
// closer rule: "All days are Chicago days, theirs or ours"). Every day
// boundary in the app reads chicagoDay from src/lib/tz.ts. These pins hand
// each of the seven call sites an instant at 7:30 PM and one at 12:30 AM
// Chicago, either side of the same midnight, in daylight time and in standard
// time, and check the day each one names.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { chicagoDay, userDayKey } from "../src/lib/tz";
import { chicagoDay as ledgerDay } from "../src/lib/intranet/ledger";
import {
  chicagoDay as chuteDay,
  loadLedger,
  saveLedger,
  type LedgerStorage,
} from "../src/app/room/chute-ledger";
import { moveDoneKey } from "../src/lib/room/bind";
import { readLoss } from "../src/lib/room/loss";
import { owedToMe } from "../src/lib/room/owed";
import { buildAccountSheet } from "../src/lib/room/sheet-view";
import { dayLabelFor } from "../src/lib/scratch";
import { parseChatPaste } from "../src/lib/intel/rules-read";
import { dayStamp, morningDoneKey, weekStamp } from "../src/lib/today/build";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";
import { daysBetween, readDeal } from "../src/lib/room/engine";
import { meetingRead } from "../src/lib/intel/meeting";
import { MINE_RE } from "../src/lib/intel/provenance";
import { readAccount, type RecordNote } from "../src/lib/record/read";
import { buildPipelineReport } from "../src/lib/pipeline/build";

// Two midnights, one in each half of the year. `evening` is 7:30 PM Chicago on
// the day before; `night` is 12:30 AM Chicago on the day after. Both are
// already the later date in UTC, which is what every bare Date gets wrong.
const MIDNIGHTS = [
  {
    label: "CDT (UTC-5)",
    evening: "2026-09-25T00:30:00Z",
    night: "2026-09-25T05:30:00Z",
    before: "2026-09-24",
    after: "2026-09-25",
    beforeMD: "9/24",
    afterMD: "9/25",
    beforeDow: "THU",
    afterDow: "FRI",
  },
  {
    label: "CST (UTC-6)",
    evening: "2026-12-11T01:30:00Z",
    night: "2026-12-11T06:30:00Z",
    before: "2026-12-10",
    after: "2026-12-11",
    beforeMD: "12/10",
    afterMD: "12/11",
    beforeDow: "THU",
    afterDow: "FRI",
  },
] as const;

const memory = (): LedgerStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe("chicagoDay — the one day key (src/lib/tz.ts)", () => {
  test("it is userDayKey under the name that says which day it is", () => {
    assert.equal(chicagoDay, userDayKey);
  });

  for (const m of MIDNIGHTS) {
    test(`${m.label}: 7:30 PM and 12:30 AM name the days either side of midnight`, () => {
      assert.equal(chicagoDay(m.evening), m.before);
      assert.equal(chicagoDay(m.night), m.after);
    });
    test(`${m.label}: a string, a Date and a number agree`, () => {
      assert.equal(chicagoDay(new Date(m.evening)), m.before);
      assert.equal(chicagoDay(Date.parse(m.evening)), m.before);
      assert.equal(chicagoDay(new Date(m.night)), m.after);
      assert.equal(chicagoDay(Date.parse(m.night)), m.after);
    });
  }

  test("junk is an empty key, never a date", () => {
    assert.equal(chicagoDay("garbage"), "");
    assert.equal(chicagoDay(Number.NaN), "");
  });
});

describe("the seven call sites read the one key", () => {
  test("the intranet ledger and the Chute ledger re-export it", () => {
    assert.equal(ledgerDay, chicagoDay);
    assert.equal(chuteDay, chicagoDay);
  });

  for (const m of MIDNIGHTS) {
    test(`${m.label}: the Chute ledger keeps an evening row and drops it after midnight`, () => {
      const storage = memory();
      saveLedger(
        [{ key: 1, filename: "1.eml", state: "filed" }],
        storage,
        new Date(m.evening),
      );
      assert.equal(loadLedger(storage, new Date(m.evening)).items.length, 1);
      assert.equal(loadLedger(storage, new Date(m.night)).items.length, 0);
    });

    test(`${m.label}: the move-done key names the Chicago day`, () => {
      assert.equal(moveDoneKey("A", new Date(m.evening)), `move-done:A:${m.before}`);
      assert.equal(moveDoneKey("A", new Date(m.night)), `move-done:A:${m.after}`);
    });

    test(`${m.label}: the loss read dates the entry by its Chicago day`, () => {
      const now = new Date(m.night);
      const none = new Set<string>();
      const at = (createdAt: string) =>
        readLoss([{ id: "n", body: "lost the deal", createdAt }], none, now)?.date;
      assert.equal(at(m.evening), m.beforeMD);
      assert.equal(at(m.night), m.afterMD);
    });

    test(`${m.label}: an owed line is owed since its Chicago day`, () => {
      const now = new Date(m.night);
      const since = (createdAt: string) =>
        owedToMe(
          [{ id: "n", body: "Owed: send the Canada model — @Antaeus", createdAt }],
          new Set(),
          [],
          now,
        )[0]?.src;
      assert.equal(since(m.evening), `owed since ${m.beforeMD}`);
      assert.equal(since(m.night), `owed since ${m.afterMD}`);
    });

    test(`${m.label}: the sheet names the weekday of the reminder's Chicago day`, () => {
      const now = new Date(Date.parse(m.evening) - 7 * 86_400_000);
      const todo = (remindAt: string) => ({
        id: "t",
        body: withTags("Call the CSM.", { ...NO_TAGS, kind: "action" }),
        done: false,
        accountId: "esc",
        remindAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const when = (remindAt: string) =>
        buildAccountSheet([todo(remindAt)], "esc", new Set(), new Map(), now).delayed[0]
          ?.when;
      assert.equal(when(m.evening), m.beforeDow);
      assert.equal(when(m.night), m.afterDow);
    });

    test(`${m.label}: the Scratchpaper folds the evening line into TODAY until midnight`, () => {
      assert.equal(dayLabelFor(m.evening, new Date(m.evening)), "TODAY");
      assert.equal(dayLabelFor(m.evening, new Date(m.night)), "YESTERDAY");
      assert.equal(dayLabelFor(m.night, new Date(m.night)), "TODAY");
    });

    test(`${m.label}: the rules reader dates a bare turn by the Chicago day`, () => {
      // two turns make a chat; the bare stamp files unattributed on the same day
      const turn =
        "Lesha Cyphers 7:30 PM\nShe is expecting your call.\n7:31 PM\nCalling now.";
      assert.equal(parseChatPaste(turn, new Date(m.evening))[0]?.dayIso, m.before);
      assert.equal(parseChatPaste(turn, new Date(m.night))[0]?.dayIso, m.after);
    });
  }
});

describe("the morning done key reads the Chicago day (plan §7 item 9, answered yes)", () => {
  test("7:30 PM Chicago on Sep 24 names Sep 24", () => {
    const at = Date.parse("2026-09-25T00:30:00Z");
    assert.equal(dayStamp(at), "2026-09-24");
    assert.equal(morningDoneKey("acct:X", at), "morning:2026-09-24:acct:X");
  });
  test("12:30 AM Chicago on Sep 25 names Sep 25", () => {
    const at = Date.parse("2026-09-25T05:30:00Z");
    assert.equal(morningDoneKey("acct:X", at), "morning:2026-09-25:acct:X");
  });
  test("the week stamp stays with the Chicago day on a Sunday night", () => {
    // Sunday Sep 27, 9 PM Chicago is already Monday in UTC
    const at = Date.parse("2026-09-28T02:00:00Z");
    assert.equal(dayStamp(at), "2026-09-27");
    assert.equal(weekStamp(at), "2026-W39");
    assert.equal(weekStamp(Date.parse("2026-09-28T12:00:00Z")), "2026-W40");
  });
});

// ── the read's own day math (pass 8 X5) ─────────────────────────────────────
// The engine's day counts, the sheet's wall, the meeting read's sibling day
// and the drawer's dates all counted UTC days or 24-hour spans. Every one of
// them now names the Chicago day: a reply at 7:30 PM is yesterday's reply at
// 12:30 AM, a commitment due today still stands at 7:30 PM, and an evening
// call is that day's call.

describe("the read's day math names the Chicago day (pass 8 X5)", () => {
  for (const m of MIDNIGHTS) {
    test(`${m.label}: the engine counts Chicago days, so the evening reply is yesterday's`, () => {
      assert.equal(daysBetween(m.evening, new Date(m.night)), 1);
      assert.equal(daysBetween(m.evening, new Date(m.evening)), 0);
      const r = readDeal({
        accountName: "Simploy",
        step: null,
        timing: null,
        lastTouch: null,
        lastInbound: { at: m.evening, who: "Tom" },
        lastRecordAt: m.evening,
        now: new Date(m.night),
      });
      assert.equal(r.move, "Answer Tom. They wrote yesterday.");
    });

    test(`${m.label}: a dated wall passes when its Chicago day ends`, () => {
      const at = (now: string) =>
        readDeal({
          accountName: "Simploy",
          step: null,
          timing: { phrase: "the target date", dateIso: m.before },
          lastTouch: { at: now, awaitingReply: true, who: "Tom" },
          lastRecordAt: now,
          now: new Date(now),
        }).health;
      assert.notEqual(at(m.evening), "red", "the day is still on in Chicago");
      assert.equal(at(m.night), "red");
    });

    test(`${m.label}: the sheet's wall stands until the Chicago day ends`, () => {
      const todo = {
        id: "t",
        body: withTags("Send the census.", {
          ...NO_TAGS,
          kind: "action",
          date: m.before,
        }),
        done: false,
        accountId: "esc",
        remindAt: "",
        createdAt: "2026-09-01T15:00:00Z",
        updatedAt: "2026-09-01T15:00:00Z",
      };
      const wall = (now: string) =>
        buildAccountSheet([todo], "esc", new Set(), new Map(), new Date(now)).open[0]
          ?.wall;
      assert.equal(wall(m.evening), undefined);
      assert.equal(wall(m.night), m.beforeMD);
    });

    test(`${m.label}: the meeting read finds the sibling filed the same Chicago day`, () => {
      const read = meetingRead(
        [
          {
            id: "tape",
            body: "☰ Call transcript — Kickoff · full text under the fold\nWe walked through Mexico.",
            source: "transcript",
            createdAt: m.evening,
          },
          {
            id: "entry",
            body: "☎ CT Kickoff — Mexico EOR · Chassie Smith → Antaeus Coe\nWalked through EOR for Mexico.",
            source: "call",
            actors: "Chassie Smith → Antaeus Coe",
            createdAt: `${m.before}T15:00:00Z`,
          },
        ],
        (n) => MINE_RE.test(n),
      );
      assert.equal(read?.who, "Chassie Smith");
    });

    test(`${m.label}: the drawer dates an evening call by its Chicago day`, () => {
      const notes: RecordNote[] = [
        {
          id: "call",
          accountId: "A1",
          partner: "",
          kind: "account",
          lane: "mine",
          body: "☎ CT Kickoff — Mexico EOR · Chassie Smith → Antaeus Coe\nWalked through EOR for Mexico.",
          actors: "Chassie Smith → Antaeus Coe",
          source: "call",
          recipients: "",
          createdAt: m.evening,
        },
      ];
      const now = new Date(m.night);
      const read = readAccount({
        account: { id: "A1", name: "Simploy" },
        notes,
        touches: [],
        todos: [],
        dispositions: new Map(),
        homeSide: [],
        now,
      });
      const [rec] = buildPipelineReport({
        accounts: [
          {
            id: "A1",
            name: "Simploy",
            csm: "",
            stageLabel: "",
            notes: notes.map((n) => ({
              id: n.id,
              createdAt: n.createdAt,
              body: n.body,
              lane: "mine" as const,
              actors: n.actors,
              source: n.source,
            })),
            todos: [],
            gaps: [],
            support: null,
            actors: [],
            read,
          },
        ],
        csms: [],
        me: "Antaeus Coe",
        now,
      });
      assert.deepEqual(rec.events, [{ at: m.before, kind: "Call" }]);
      assert.equal(rec.lastTouch?.date, m.before);
      assert.equal(rec.quietDays, 1);
    });
  }
});

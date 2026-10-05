// The second record's faces — the meat cleaner, the read-layer derivations,
// and the queue rules the ship order lit (2026-08-20): intent-warm from the
// store, engaged-never-introduced, the org-wide answered flip, the
// cold-validated modifier, gems as queue evidence, and the collision gate.
// Fixtures only, no DB — the fetch layer is one query; everything below it
// is pure and tested here.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  caseNumberOf,
  cleanExcerpt,
  cleanSubject,
  correspondentsOf,
} from "../src/lib/activity/excerpt";
import {
  collisionFor,
  engagedNeverIntroduced,
  intentWarm,
  orgInboundKey,
  outreachGem,
  verifiedCold,
  dropAgeDays,
  type SecondRecord,
} from "../src/lib/activity/read";
import { buildQueue } from "../src/lib/groundwork/day";

import { dropQueues } from "../src/lib/activity/harness";
import { buildSendbook, docsFromRows } from "../src/lib/sendbook/read";
import { buildReadout } from "../src/lib/groundwork/readout";
import { mirrorActivityDigest } from "../src/lib/intranet/mirror";
import {
  isSettled,
  loadLedger,
  reconcileActivityRows,
  saveLedger,
  storedRow,
  type LedgerRow,
  type LedgerStorage,
} from "../src/app/room/chute-ledger";
import { composeFor } from "../src/lib/groundwork/compose";
import type { Peo } from "../src/lib/book";
import type { Rollup, IntentWindows } from "../src/lib/activity/rollup";
import type { Gem } from "../src/lib/activity/stores";

const NOW = new Date("2026-08-20T15:00:00Z"); // 10:00a Chicago, a Thursday

const acct = (over: Partial<Peo>): Peo => ({
  id: "TEST0000000000001",
  name: "Test Partner",
  cloud: "TST",
  csm: "Lesha Cyphers",
  contactName: "Pat Example",
  contactEmail: "pat@example.com",
  size: 5000,
  sizeBucket: "Large (5,000 - 9,999)",
  industry: "PEO/ASO",
  city: "St. Louis",
  state: "MO",
  website: "example.com",
  lastActivity: "2026-07-01",
  fit: 95,
  fitTier: "high",
  ...over,
});

const windows = (over: Partial<IntentWindows>): IntentWindows => ({
  w7: { s: 0, o: 0, c: 0 },
  w30: { s: 0, o: 0, c: 0 },
  w60: { s: 0, o: 0, c: 0 },
  w90: { s: 0, o: 0, c: 0 },
  lastOpen: "",
  top: [],
  ...over,
});

const rollup = (over: Partial<Rollup>): Rollup => ({
  dropSha: "037742a0",
  dropDay: "2026-08-20",
  window: { from: "2026-05-23", to: "2026-08-20" },
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

const gem = (over: Partial<Gem>): Gem => ({
  dropSha: "037742a0",
  verdict: "CONFIRMED",
  createdDay: "2026-08-20",
  actedDay: "",
  who: ["Tom Schenck"],
  whoKind: "account",
  term: "TAX SWITCH",
  what: "Tom asked Greg for a call about switching",
  whenDay: "2026-08-19",
  signal: "decision maker moved from silent to asking",
  act: "Ask Greg Williams about Schenck call.",
  reason: "Aug 19 reply wants to discuss switching.",
  cites: [
    {
      k: "8faf3dc6f78b8a48",
      day: "2026-08-19",
      who: "Greg Williams",
      subject: "RE: Tax",
    },
  ],
  ...over,
});

const sr = (over: Partial<SecondRecord>): SecondRecord => ({
  rollup: null,
  gems: [],
  support: null,
  intent: null,
  ...over,
});

// ═══ the meat cleaner ════════════════════════════════════════════════════════

describe("cleanExcerpt — the meat law's cleaner", () => {
  test("strips the proofpoint banner span and its warning text", () => {
    const raw =
      "Hi Anika, we have a client interested.ZjQcmQRYFpfptBannerStartThis Message Is From an External Sender DO NOT CLICK links or attachments unless you recognize the sender and know the content is safe. ZjQcmQRYFpfptBannerEnd Can you send a flyer?";
    const out = cleanExcerpt(raw);
    assert.ok(!out.includes("ZjQcmQRY"));
    assert.ok(!/External Sender/.test(out));
    assert.ok(out.includes("client interested"));
    assert.ok(out.includes("Can you send a flyer?"));
  });

  test("cuts the quoted trail where From:…Sent: begins", () => {
    const raw =
      "The answer is no, currently WFM does not allow this on the Kiosk. Just let me know how you would like to proceed. From: Sarah Pegram <s@trendhr.com> Sent: Monday, August 17, 2026 To: Natalie Subject: RE: Zayzoom Partner the old text repeats here";
    const out = cleanExcerpt(raw);
    assert.ok(out.includes("does not allow this on the Kiosk"));
    assert.ok(!out.includes("old text repeats"));
  });

  test("cuts at the confidentiality disclaimer and contact cards", () => {
    const raw =
      "Happy to help you get connected! Zayzoon are an incredible partner of ours. This message may contain confidential and/or privileged information. If you are not the addressee...";
    const out = cleanExcerpt(raw);
    assert.equal(
      out,
      "Happy to help you get connected! Zayzoon are an incredible partner of ours.",
    );
  });

  test("repairs mojibake apostrophes and squares", () => {
    const out = cleanExcerpt("wages they?ve already earned � before the period ends");
    assert.ok(out.includes("they've already earned"));
    assert.ok(!out.includes("�"));
  });

  test("caps on a word edge with an ellipsis", () => {
    const long = "word ".repeat(300);
    const out = cleanExcerpt(long, 100);
    assert.ok(out.length <= 101);
    assert.ok(out.endsWith("…"));
  });

  test("case numbers and thread tokens", () => {
    assert.equal(
      caseNumberOf("Email: PrismHR Case 00687719: Suggested Solution"),
      "00687719",
    );
    assert.equal(caseNumberOf("Re: pricing"), "");
    assert.equal(cleanSubject("Update [ thread::L9TrIyskd3q ] here"), "Update here");
  });
});

// ═══ the read-layer derivations ══════════════════════════════════════════════

describe("read.ts — the pure derivations", () => {
  test("intentWarm: 3·clicks + opens, decayed by last-open age, threshold 6", () => {
    // 2 clicks + 3 opens = 9 raw; last open yesterday → barely decayed → warm.
    const warm = intentWarm(
      sr({
        intent: {
          dropSha: "x",
          windows: windows({ w30: { s: 50, o: 3, c: 2 }, lastOpen: "2026-08-19" }),
          receipts: 0,
        },
      }),
      NOW,
    );
    assert.ok(warm && warm.score > 6);
    // Same counts, last open 40 days back → decayed to nothing → cold.
    const cold = intentWarm(
      sr({
        intent: {
          dropSha: "x",
          windows: windows({ w30: { s: 50, o: 3, c: 2 }, lastOpen: "2026-07-10" }),
          receipts: 0,
        },
      }),
      NOW,
    );
    assert.equal(cold, null);
  });

  test("verifiedCold: any account-person voice breaks the cold", () => {
    const cold = sr({
      rollup: rollup({
        lanes: { human: 1, csm: 25, support: 0, intent: 21, machinery: 0 },
        lastHuman: {
          day: "2026-06-12",
          how: "email",
          who: "Sara F",
          kind: "colleague",
          subject: "PrismHR Live",
        },
        actors: [{ lane: "csm", name: "Sara F", kind: "colleague", n: 25 }],
      }),
    });
    assert.equal(verifiedCold(cold), true);
    const notCold = sr({
      rollup: rollup({
        actors: [{ lane: "human", name: "Tom S", kind: "account", n: 2 }],
      }),
    });
    assert.equal(verifiedCold(notCold), false);
    assert.equal(verifiedCold(sr({})), false); // no rollup = never "verified"
  });

  test("orgInboundKey normalizes both date shapes", () => {
    const a = sr({ rollup: rollup({ lastOrgInbound: "2026-08-19 14:49" }) });
    assert.equal(orgInboundKey(a), "2026-08-19T14:49:00");
    const b = sr({ rollup: rollup({ lastOrgInbound: "2026-08-19" }) });
    assert.equal(orgInboundKey(b), "2026-08-19T12:00:00");
    assert.equal(orgInboundKey(sr({})), "");
  });

  test("engagedNeverIntroduced: heavy, warm support only", () => {
    const hot = sr({
      support: {
        dropSha: "x",
        total: 197,
        spike: { day: "2026-06-26", n: 9 },
        themes: [
          {
            label: "Update Provided",
            n: 62,
            firstDay: "2026-06-08",
            lastDay: "2026-08-19",
            examples: [],
          },
        ],
      },
    });
    assert.ok(engagedNeverIntroduced(hot, NOW));
    const stale = sr({
      support: {
        dropSha: "x",
        total: 40,
        spike: null,
        themes: [
          {
            label: "old",
            n: 40,
            firstDay: "2026-05-23",
            lastDay: "2026-06-01",
            examples: [],
          },
        ],
      },
    });
    assert.equal(engagedNeverIntroduced(stale, NOW), null);
    const light = sr({
      support: {
        dropSha: "x",
        total: 3,
        spike: null,
        themes: [
          {
            label: "x",
            n: 3,
            firstDay: "2026-08-10",
            lastDay: "2026-08-19",
            examples: [],
          },
        ],
      },
    });
    assert.equal(engagedNeverIntroduced(light, NOW), null);
  });

  test("collisionFor: live cadence or a colleague thread inside 7 days", () => {
    const mktg = collisionFor(
      sr({
        intent: {
          dropSha: "x",
          windows: windows({ w7: { s: 3, o: 1, c: 0 } }),
          receipts: 0,
        },
      }),
      NOW,
    );
    assert.equal(mktg?.mktgSends7, 3);
    const coll = collisionFor(
      sr({
        rollup: rollup({
          lastHuman: {
            day: "2026-08-19",
            how: "email",
            who: "Anika Steenstra",
            kind: "colleague",
            subject: "Re: intro",
          },
        }),
      }),
      NOW,
    );
    assert.equal(coll?.colleague?.who, "Anika Steenstra");
    const old = collisionFor(
      sr({
        rollup: rollup({
          lastHuman: {
            day: "2026-08-01",
            how: "email",
            who: "Anika",
            kind: "colleague",
            subject: "x",
          },
        }),
      }),
      NOW,
    );
    assert.equal(old, null);
  });

  test("outreachGem skips acted and coordination gems", () => {
    assert.ok(outreachGem(sr({ gems: [gem({})] })));
    assert.equal(outreachGem(sr({ gems: [gem({ actedDay: "2026-08-20" })] })), null);
    assert.equal(outreachGem(sr({ gems: [gem({ whoKind: "colleague" })] })), null);
  });

  test("dropAgeDays reads the newest drop day across the book", () => {
    const m = new Map<string, SecondRecord>([
      ["a", sr({ rollup: rollup({ dropDay: "2026-08-08" }) })],
      ["b", sr({ rollup: rollup({ dropDay: "2026-08-01" }) })],
    ]);
    const age = dropAgeDays(m, NOW);
    assert.ok(age != null && age > 11 && age < 13);
  });
});

// ═══ the queue rules ═════════════════════════════════════════════════════════

const baseInput = (over: Record<string, unknown>) => ({
  accounts: [acct({})],
  intelById: new Map(),
  notesById: new Map(),
  touches: [],
  contactCountById: () => 3,
  now: NOW,
  ...over,
});

describe("the queue reads the second record", () => {
  test("intent-warm fires from the store at 84 with the opens reason", () => {
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          intent: {
            dropSha: "x",
            windows: windows({ w30: { s: 40, o: 4, c: 2 }, lastOpen: "2026-08-19" }),
            receipts: 0,
          },
        }),
      ],
    ]);
    const { all } = buildQueue(baseInput({ secondById: second }) as never);
    const hit = all.find((q) => q.ruleId === "intent-warm");
    assert.ok(hit);
    assert.equal(hit.weight, 84);
    assert.equal(hit.reason, "They opened 4 of ours.");
  });

  test("engaged-never-introduced fires only with no first-record motion and no board card", () => {
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          support: {
            dropSha: "x",
            total: 197,
            spike: { day: "2026-06-26", n: 9 },
            themes: [
              {
                label: "Update Provided",
                n: 62,
                firstDay: "2026-06-08",
                lastDay: "2026-08-19",
                examples: [],
              },
            ],
          },
        }),
      ],
    ]);
    const fired = buildQueue(baseInput({ secondById: second }) as never).all.find(
      (q) => q.ruleId === "engaged-never-introduced",
    );
    assert.ok(fired);
    assert.equal(fired.reason, "197 support cases. Never pitched.");
    // A board card kills it.
    const boarded = buildQueue(
      baseInput({
        secondById: second,
        boardIds: new Set(["TEST0000000000001"]),
      }) as never,
    ).all.find((q) => q.ruleId === "engaged-never-introduced");
    assert.equal(boarded, undefined);
    // First-record motion kills it.
    const moved = buildQueue(
      baseInput({
        secondById: second,
        notesById: new Map([
          [
            "TEST0000000000001",
            [
              {
                body: "✉ sent a note",
                source: "room",
                createdAt: "2026-08-18T12:00:00Z",
              },
            ],
          ],
        ]),
      }) as never,
    ).all.find((q) => q.ruleId === "engaged-never-introduced");
    assert.equal(moved, undefined);
  });

  test("an org-side reply silences the drumbeat and produces no move (C6, amended 2026-10-05)", () => {
    // Twelve quiet days since the touch would fire the second-touch bump; the
    // export says the account answered, into a colleague's inbox. The thread is
    // answered — no bump, no revival — and the retired coordination move
    // ("Ask Anika what they said.") stages nowhere: a colleague's motion
    // produces nothing for the operator to do.
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          rollup: rollup({
            lastOrgInbound: "2026-08-18 09:00",
            lastHuman: {
              day: "2026-08-18",
              how: "email",
              who: "Anika Steenstra",
              kind: "colleague",
              subject: "Re: global",
            },
          }),
        }),
      ],
    ]);
    const input = baseInput({
      secondById: second,
      touches: [
        {
          subjectKey: "outreach:TEST0000000000001",
          contactedAt: "2026-08-08T12:00:00Z",
          followUpAt: "",
          status: "awaiting",
        },
      ],
    });
    const { all } = buildQueue(input as never);
    assert.equal(
      all.some((q) => q.ruleId === "silence-bump"),
      false,
      "no bump",
    );
    assert.equal(
      all.some((q) => q.ruleId === "cold-revival"),
      false,
      "no revival",
    );
    assert.equal(
      all.some((q) => /what they said|org-side/i.test(`${q.action} ${q.reason}`)),
      false,
      "the coordination move is retired",
    );
    // Nothing of the account's own stages. The account is free now, so the
    // CSM's briefing slot may ride it as a vehicle (D22) — a move about the
    // cadence, never about the reply; the exclusion, pinned in canon/groundwork,
    // takes even that away when the reply is an attributed inbound.
    assert.deepEqual(
      all.filter(
        (q) => q.accountId === "TEST0000000000001" && q.ruleId !== "roundup-slot",
      ),
      [],
    );
    // Without the org inbound the same quiet thread still gets its bump: the
    // silence is the reply's doing, not a dead rule.
    const unanswered = buildQueue({ ...input, secondById: new Map() } as never);
    assert.equal(unanswered.all[0]?.ruleId, "silence-bump");
    assert.equal(unanswered.all[0]?.action, "Send the second touch.");
  });

  test("cold-validated upgrades never-touched-incumbent to 52 with the verified reason", () => {
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          rollup: rollup({
            lanes: { human: 0, csm: 4, support: 0, intent: 21, machinery: 0 },
            actors: [{ lane: "csm", name: "Sara F", kind: "colleague", n: 4 }],
          }),
        }),
      ],
    ]);
    // industry PEO/ASO + high fit + no activity → incumbent rule fires. A
    // sibling account gives the CSM's roundup slot a free vehicle — the
    // cadence must never swallow this account's own move (the vehicle rule,
    // fixed 2026-08-20).
    const { all } = buildQueue(
      baseInput({
        secondById: second,
        accounts: [
          acct({}),
          acct({ id: "TEST0000000000002", name: "Second Partner", fitTier: "low" }),
        ],
      }) as never,
    );
    const roundup = all.find((q) => q.ruleId === "roundup-slot");
    assert.ok(roundup, "the cadence still fires");
    assert.equal(roundup.accountId, "TEST0000000000002", "…riding the free account");
    const hit = all.find((q) => q.ruleId === "never-touched-incumbent");
    assert.ok(hit);
    assert.equal(hit.weight, 52);
    assert.equal(hit.reason, "Verified cold. Ninety quiet days.");
  });

  test("a verified outreach gem becomes the move at 84; coordination gems stay out", () => {
    const second = new Map([["TEST0000000000001", sr({ gems: [gem({})] })]]);
    const { all } = buildQueue(baseInput({ secondById: second }) as never);
    const hit = all.find((q) => q.ruleId === "second-record-gem");
    assert.ok(hit);
    assert.equal(hit.weight, 84);
    assert.equal(hit.action, "Ask Greg Williams about Schenck call.");
    const coord = new Map([
      ["TEST0000000000001", sr({ gems: [gem({ whoKind: "colleague" })] })],
    ]);
    const none = buildQueue(baseInput({ secondById: coord }) as never).all.find(
      (q) => q.ruleId === "second-record-gem",
    );
    assert.equal(none, undefined);
  });

  test("the composers for both new rules produce addressed drafts", () => {
    const eni = composeFor({
      ruleId: "engaged-never-introduced",
      account: acct({}),
      intent: null,
      contactName: "Pat Example",
      supportCases: 197,
    });
    assert.equal(eni.kind, "send-draft");
    assert.ok(eni.payload.includes("197 support threads"));
    const g = composeFor({
      ruleId: "second-record-gem",
      account: acct({}),
      intent: null,
      contactName: "Pat Example",
      gem: {
        act: "x",
        reason: "Aug 19 reply wants to discuss switching.",
        term: "TAX SWITCH",
        who: [],
      },
    });
    assert.equal(g.kind, "send-draft");
    assert.ok(g.payload.includes("Aug 19 reply wants to discuss switching."));
  });
});

// ═══ the second ring ═════════════════════════════════════════════════════════

describe("the ring reads the second record", () => {
  test("an attributed inbound body sets the Sendbook lane and ↩ REPLIED; a bare datetime sets neither (D19)", () => {
    const notes = [
      {
        body: "✉ Sent the first note →[to Pat]",
        source: "room",
        createdAt: "2026-08-01T12:00:00Z",
        actors: "Antaeus → Pat",
        kind: "email",
      },
    ];
    const bookWith = (secondRecord: SecondRecord | null) =>
      buildSendbook({
        readsById: new Map([["A1", { docs: docsFromRows(notes), secondRecord }]]),
        tapsById: new Map(),
        now: NOW,
      });
    const before = bookWith(null);
    assert.equal(before.laneById.get("A1"), "never-met");
    // Their word, read from the row's own signature through the machinery
    // and closer reads (the rollup's lastTheirs): their voice, whoever's
    // inbox caught it. It flips the lane and annotates the send at the day's
    // noon anchor.
    const theirs = bookWith(
      sr({
        rollup: rollup({
          lastOrgInbound: "2026-08-10 09:00",
          lastTheirs: { day: "2026-08-10", who: "Pat Example", subject: "Re: global" },
        }),
      }),
    );
    assert.equal(theirs.laneById.get("A1"), "gone-cold");
    const line = theirs.lines.find((l) => l.accountId === "A1");
    assert.equal(line?.repliedAt, "2026-08-10T12:00:00.000Z");
    // The account-level Last Email Received is a datetime, never their voice:
    // with no attributed row behind it the lane stays and nothing annotates.
    const datetime = bookWith(sr({ rollup: rollup({ lastOrgInbound: "2026-08-10 09:00" }) }));
    assert.equal(datetime.laneById.get("A1"), "never-met");
    assert.equal(datetime.lines.find((l) => l.accountId === "A1")?.repliedAt, "");
    // The operator's own outbound still never warms (the decree).
    assert.equal(before.laneById.get("A1"), "never-met");
  });

  test("the readout's second-record sentence is arithmetic and lint-clean", () => {
    const r = buildReadout({
      accounts: [acct({})],
      queue: [],
      intelById: new Map(),
      intentById: new Map(),
      outreachAccountIds: new Set(),
      partnerUpdatesSent: 0,
      partnerUpdatesReplied: 0,
      secondRecord: { active30: 124, verifiedCold: 9 },
      now: NOW,
    } as never);
    const book = r.sections.find((x) => x.title === "The rest of the book");
    assert.ok(book);
    assert.ok(book.paragraphs[0].text.includes("124 of the 1 saw human motion"));
    assert.ok(book.paragraphs[0].text.includes("9 are verified cold"));
  });

  test("the digest carries rollup and gems, never staged bodies (§6 guard)", () => {
    const d = mirrorActivityDigest({
      accountId: "A1",
      accountName: "Test Partner",
      dropSha: "037742a0",
      dropDay: "2026-08-20",
      rollupBody: "⌗ ACTIVITY · drop 037742a0 · 2026-08-20 · window a→b\nLANES · human 4",
      gemsBody: "◆ GEM · drop 037742a0 · CONFIRMED · created 2026-08-20 · acted:no",
    });
    assert.ok(d);
    assert.equal(d.origin, "activity");
    assert.equal(d.originRef, "A1:037742a0");
    assert.ok(d.body.length <= 4200);
    assert.equal(
      mirrorActivityDigest({
        accountId: "A1",
        accountName: "",
        dropSha: "x",
        dropDay: "2026-08-20",
        rollupBody: "",
        gemsBody: "whatever",
      }),
      null,
    );
    // The covenant's guard, as behavior: the digest is the header line, the
    // rollup and the gems — nothing else. A staged slice handed in beside them
    // never reaches the body, because the mirror reads only those two fields.
    assert.equal(
      d.body,
      [
        "The weekly Salesforce activity export's read on Test Partner, drop of 2026-08-20. Counts are arithmetic from the rollup; gems are refuter-verified.",
        "⌗ ACTIVITY · drop 037742a0 · 2026-08-20 · window a→b\nLANES · human 4",
        "\n◆ GEM · drop 037742a0 · CONFIRMED · created 2026-08-20 · acted:no",
      ].join("\n"),
    );
    const smuggled = mirrorActivityDigest({
      accountId: "A1",
      accountName: "Test Partner",
      dropSha: "037742a0",
      dropDay: "2026-08-20",
      rollupBody: "⌗ ACTIVITY · drop 037742a0",
      gemsBody: "",
      stageBody: "activity:stage · a staged body that must never travel",
    } as Parameters<typeof mirrorActivityDigest>[0]);
    assert.ok(smuggled);
    assert.ok(!smuggled.body.includes("must never travel"));
    assert.ok(!smuggled.body.includes("activity:stage"));
  });
});

describe("the same-sha re-drop costs nothing", () => {
  test("covered accounts never re-queue; the rest follow change detection", () => {
    const accounts = [
      { id: "A", rowsSum: "r1", tallySum: "t1" },
      { id: "B", rowsSum: "r2", tallySum: "t2" },
      { id: "C", rowsSum: "r3", tallySum: "t3" },
      { id: "D", rowsSum: "r4", tallySum: "t4" },
    ];
    const prior = new Map([
      ["B", { rowsSum: "r2", tallySum: "OLD" }],
      ["C", { rowsSum: "r3", tallySum: "t3" }],
    ]);
    const { distillQueue, intentQueue } = dropQueues(
      accounts,
      prior,
      new Set(["A", "C"]),
    );
    // A covered → skipped even with no prior. C covered → skipped.
    // B unchanged rows, changed tally → intent. D never seen → distill.
    assert.deepEqual(distillQueue, ["D"]);
    assert.deepEqual(intentQueue, ["B"]);
    // A full coverage set queues nothing at all — the re-drop is free.
    const free = dropQueues(accounts, prior, new Set(["A", "B", "C", "D"]));
    assert.equal(free.distillQueue.length + free.intentQueue.length, 0);
  });
});

// ═══ the adversarial-pass patches (2026-08-21) ═══════════════════════════════

describe("the adversarial patches hold", () => {
  test("the operator is never a collision", () => {
    const mine = sr({
      rollup: rollup({
        lastOrgInbound: "2026-08-19 09:00",
        lastHuman: {
          day: "2026-08-19",
          how: "email",
          who: "Antaeus Coe",
          kind: "colleague",
          subject: "Re: global",
        },
      }),
    });
    assert.equal(collisionFor(mine, NOW), null);
    // A real colleague still registers.
    const real = sr({
      rollup: rollup({
        lastHuman: {
          day: "2026-08-19",
          how: "email",
          who: "Anika Steenstra",
          kind: "colleague",
          subject: "Re: intro",
        },
      }),
    });
    assert.equal(collisionFor(real, NOW)?.colleague?.who, "Anika Steenstra");
  });

  test("intent-warm never claims opens it doesn't have", () => {
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          intent: {
            dropSha: "x",
            windows: windows({ w30: { s: 40, o: 0, c: 3 }, lastOpen: "2026-08-19" }),
            receipts: 0,
          },
        }),
      ],
    ]);
    const { all } = buildQueue(baseInput({ secondById: second }) as never);
    const hit = all.find((q) => q.ruleId === "intent-warm");
    assert.ok(hit);
    assert.equal(hit.reason, "They clicked 3 of ours.");
  });

  test("a background note never silences engaged-never-introduced; a send does", () => {
    const second = new Map([
      [
        "TEST0000000000001",
        sr({
          support: {
            dropSha: "x",
            total: 40,
            spike: null,
            themes: [
              {
                label: "Update Provided",
                n: 20,
                firstDay: "2026-07-01",
                lastDay: "2026-08-19",
                examples: [],
              },
            ],
          },
        }),
      ],
    ]);
    const bg = buildQueue(
      baseInput({
        secondById: second,
        notesById: new Map([
          [
            "TEST0000000000001",
            [
              {
                body: "☰ filed case intel from the export",
                source: "sf",
                createdAt: "2026-08-10T12:00:00Z",
              },
            ],
          ],
        ]),
      }) as never,
    ).all.find((q) => q.ruleId === "engaged-never-introduced");
    // ☰ heads are meeting/thread glyphs — that IS conversation motion; use a
    // plain intel note instead for the background case.
    const bg2 = buildQueue(
      baseInput({
        secondById: second,
        notesById: new Map([
          [
            "TEST0000000000001",
            [
              {
                body: "case traffic summary, filed for intel",
                source: "sf",
                createdAt: "2026-08-10T12:00:00Z",
              },
            ],
          ],
        ]),
      }) as never,
    ).all.find((q) => q.ruleId === "engaged-never-introduced");
    assert.ok(bg2, "plain filed intel does not silence the rule");
    assert.equal(bg, undefined, "a send/meeting head is a conversation");
    const sent = buildQueue(
      baseInput({
        secondById: second,
        notesById: new Map([
          [
            "TEST0000000000001",
            [
              {
                body: "✉ Sent the first note",
                source: "room",
                createdAt: "2026-08-10T12:00:00Z",
              },
            ],
          ],
        ]),
      }) as never,
    ).all.find((q) => q.ruleId === "engaged-never-introduced");
    assert.equal(sent, undefined, "a filed send is a conversation");
  });
});

describe("correspondentsOf — who was on the email", () => {
  const scaffold = [
    "To: jennifer@infinitihr.com; ANTAEUS.COE@prismhr.com",
    "CC: stephanie@infinitihr.com",
    "BCC: ",
    "Attachment: --none--",
    "",
    "Subject: Re: LMS?",
    "Body:",
    "Write me at nobody@example.com and see my card: sales@vendor.com",
  ].join("\n");

  test("reads the recipient lines, lowercased, in order, and never the body", () => {
    assert.deepEqual(correspondentsOf(scaffold), [
      "jennifer@infinitihr.com",
      "antaeus.coe@prismhr.com",
      "stephanie@infinitihr.com",
    ]);
  });

  test("the case form's 'Additional To:' counts too", () => {
    const raw =
      "Additional To: alea@infinitihr.com\nCC: jjordan@prismhr.com\nBCC: \n\nSubject: Case\nBody:\nHi.";
    assert.deepEqual(correspondentsOf(raw), [
      "alea@infinitihr.com",
      "jjordan@prismhr.com",
    ]);
  });

  test("no scaffold, no correspondents — a plain note names nobody", () => {
    assert.deepEqual(correspondentsOf("Left a voicemail for scott@infinitihr.com."), []);
    assert.deepEqual(correspondentsOf(""), []);
  });

  test("the list is capped and duplicates collapse", () => {
    const many = Array.from({ length: 20 }, (_, i) => `p${i}@x.com`).join("; ");
    assert.equal(correspondentsOf(`To: ${many}\n\nBody:\nhi`).length, 12);
    assert.deepEqual(correspondentsOf("To: a@b.com; A@B.com\nCC: a@b.com\n\nBody:\nhi"), [
      "a@b.com",
    ]);
  });

  test("the cleaner still cuts the scaffold it was read from", () => {
    assert.equal(cleanExcerpt(scaffold).startsWith("Write me at"), true);
  });
});

describe("the cleaner cuts a message that quotes itself (2026-08-31)", () => {
  const msg =
    "Well, now that I've copied the correct Cheryl, I'm still not seeing the LMS icon on the Member portal. Can you show me what I'm missing? What a Monday.";

  test("the doubled copy is cut, the first copy is kept whole", () => {
    const out = cleanExcerpt(`${msg} Lauren Jones, Director of Operations ${msg}`);
    assert.match(out, /^Well, now that I've copied the correct Cheryl/);
    assert.equal(out.indexOf("What a Monday"), out.lastIndexOf("What a Monday"));
  });

  test("the copies are matched on words, not characters", () => {
    // SF's encoding mangles the two copies differently — this is the shape
    // that survived a literal compare (440 excerpts) until the probe ignored
    // punctuation.
    const mangled = msg.replace("Cheryl,", "Cheryl.?.?.");
    const out = cleanExcerpt(`${mangled} Lauren Jones ${msg}`);
    assert.equal(out.indexOf("What a Monday"), out.lastIndexOf("What a Monday"));
  });

  test("a message that never repeats is left exactly alone", () => {
    const once = `${msg} Thanks, Lauren.`;
    assert.equal(cleanExcerpt(once), once.replace(/\s+/g, " ").trim());
  });

  test("a short repeated phrase is not a quote — the probe is a whole sentence", () => {
    const chatty = "Thanks! Thanks! Thanks so much, really. Thanks!";
    assert.equal(cleanExcerpt(chatty), chatty);
  });

  test("Outlook mobile's glued header is still a quote boundary", () => {
    const body =
      "Ok standing by for access Get Outlook for iOSFrom: Javier Ramirez <j@x.com>\nSent: Thursday, 27 August 2026 14:28:24\nTo: Antaeus Coe <a@y.com>\nSubject: Re: Call recording";
    const out = cleanExcerpt(body);
    assert.match(out, /^Ok standing by for access/);
    assert.equal(/Javier Ramirez/.test(out), false);
  });
});

// ── the ledger reads the record, not its own memory ─────────────────────────
// A 13:51 COVERAGE FAILED line sat red on the Chute for four hours after the
// 17:37 run went green: the ledger persisted its receipt and never re-read
// the live run state (2026-09-01). The record outranks every seed — receipts
// included — so the Chute reconciles its second-record entries against the
// live receipt on mount and when the tab returns to view. The reconcile and
// the ledger's codec are pure (src/app/room/chute-ledger.ts) and pinned here
// as behavior.

const memory = (): LedgerStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

test("the chute reconciles stored second-record receipts against the live run", () => {
  // Structural marker — activity entries are found by flag, never by
  // sniffing filenames or reason text — and the flag survives the ledger.
  const stale: LedgerRow = {
    key: 7,
    filename: "activity.csv",
    state: "error",
    reason: "COVERAGE FAILED · 13:51",
    act: true,
  };
  assert.equal(storedRow(stale).act, true, "the flag must survive the ledger");
  const storage = memory();
  saveLedger([stale], storage);
  assert.equal(loadLedger(storage).items[0]?.act, true);
  // The reconcile itself: live receipt in, stale entries updated to what the
  // run concluded, everything else left as it was.
  const plain: LedgerRow = { key: 8, filename: "call.vtt", state: "error", reason: "x" };
  const live = { hasDrop: true, phase: "done", receipt: ["Coverage 100% · 17:37"] };
  const after = reconcileActivityRows([stale, plain], live);
  assert.equal(after[0].state, "activityDone");
  assert.equal(after[0].reason, "Coverage 100% · 17:37");
  assert.equal(after[1], plain, "a row that is not an activity drop is never touched");
  // A run that failed again reads red again, with the run's own last line.
  const red = reconcileActivityRows([{ ...stale, state: "activityDone" }], {
    hasDrop: true,
    phase: "failed",
    receipt: ["COVERAGE FAILED · 18:02"],
  });
  assert.equal(red[0].state, "error");
  assert.equal(red[0].reason, "COVERAGE FAILED · 18:02");
  // A running run is left alone for the dock to narrate; so is no drop at
  // all, an empty receipt, and a receipt that says nothing new — and in each
  // case the same array comes back, so the setter can bail out.
  const items = [stale];
  assert.equal(reconcileActivityRows(items, { ...live, phase: "running" }), items);
  assert.equal(reconcileActivityRows(items, { ...live, hasDrop: false }), items);
  assert.equal(reconcileActivityRows(items, { ...live, receipt: [] }), items);
  assert.equal(reconcileActivityRows(items, null), items);
  const settledTwice = [after[0]];
  assert.equal(reconcileActivityRows(settledTwice, live), settledTwice);
  // An in-flight activity row is the dock's, not the reconcile's.
  const inFlight = [{ ...stale, state: "activity" as const }];
  assert.equal(reconcileActivityRows(inFlight, live), inFlight);
});

test("a settled receipt clears by hand; in-flight and waiting rows cannot", () => {
  // The gate: only settled states carry the hover ✕ (tooltip-titled per the
  // Spring's minimalist-controls decree). A row waiting on the operator's
  // pick or still reading is never dismissible.
  for (const st of [
    "filed",
    "vaulted",
    "activityDone",
    "error",
    "dupe",
    "undone",
    "interrupted",
  ] as const)
    assert.equal(isSettled(st), true, `settled must include ${st}`);
  for (const st of ["pick", "mismatch", "reading", "filing", "activity"] as const)
    assert.equal(isSettled(st), false, `settled must not include ${st}`);
});

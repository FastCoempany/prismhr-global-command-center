// The email in the HomeRoom row (ship order 2026-10-20; CLAUDE.md, The email
// in the row; docs/mockups/homeroom-email-row-2026-10-20.html, Concept A).
// Pinned here: only a capture that leads with its own header is split, and
// each email entry keeps its own message's words, cleaned and whole, never a
// guess and never another message's; the cleaner keeps the person's words and
// cuts only the junk; the store redacts money, marks an email it looked for,
// and fails open; the filing keeps the whole emails from the whole capture
// and the undo takes them back after the notes; the row's latest email reads
// past sign-offs, machinery, coordination and chat; and EARLIER's lines read
// who, when and the subject, opening to the read's synopsis, its Owed lines,
// the answer and the twin.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { cleanEmailWhole } from "../src/lib/activity/excerpt";
import { redactMoneyStrict } from "../src/lib/intel/lexicon";
import { emailMessages, threadSubject, wholeEmails } from "../src/lib/intel/email-whole";
import {
  dropEmailTexts,
  emailTextsFor,
  keepEmailTexts,
  wholeEmailsFor,
  type EmailTextClient,
} from "../src/lib/notes/email-text";
import {
  cleanSubject,
  latestEmail,
  recordLines,
  whenOf,
  withSubject,
  type RowNote,
} from "../src/lib/room/email-row";
import { owedSegments } from "../src/lib/room/owed";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";
import { docOf } from "../src/lib/record/docs";
import { ADDITIVE } from "../src/lib/db/migrate";
import { outcomeMarkBody } from "../src/lib/room/loss";

const RELAY = `OUTLOOK THREAD — inbox copy
From: Dana Reyes <dana@regis.example>
To: Antaeus Coe <antaeus.coe@prismhr.com>; Elise Munoz <elise@regis.example>;
Sam Ortiz <sam@integra.example>
Cc:
Sent: 2026-10-20T14:10:12+00:00
Subject: RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant

[EXTERNAL]

Hi Antaeus,

We'd like to go with the reseller model.

Can you send the reseller agreement over so our legal team can start their review?

Thanks,
Dana
Dana Reyes | VP, Client Services
P: 555 123 4567
www.regis.example

________________________________
From: Antaeus Coe <antaeus.coe@prismhr.com>

Sent: Thursday, October 16, 2026 11:01 AM

To: Dana Reyes <dana@regis.example>

Subject: Re: Re: [EXTERNAL] Re: Intro to your Global Business Consultant

Hi Dana,

Here is the order I'd suggest.

Best,
Antaeus
`;

const DANA_WORDS =
  "Hi Antaeus,\n\nWe'd like to go with the reseller model.\n\nCan you send the reseller agreement over so our legal team can start their review?\n\nThanks,\nDana";

const DANA = {
  kind: "email",
  from: "Dana Reyes",
  subject: "RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant",
  dayIso: "2026-10-20",
  timeLabel: "9:10 AM",
};

describe("the whole email: the capture's messages and their own words", () => {
  test("a relay splits into its messages, a wrapped To line and blank header lines included", () => {
    const m = emailMessages(RELAY);
    assert.equal(m.length, 2);
    assert.match(m[0].from, /Dana Reyes/);
    assert.match(m[0].to, /Sam Ortiz/, "the wrapped recipients line joins the To line");
    assert.equal(m[0].sent, "2026-10-20T14:10:12+00:00");
    assert.match(m[1].from, /Antaeus Coe/);
    assert.equal(m[1].sent, "Thursday, October 16, 2026 11:01 AM");
  });

  test("each email entry keeps its own message, cleaned: no banner, no card, no trail", () => {
    const [newest, older] = wholeEmails(RELAY, [
      DANA,
      {
        kind: "email",
        from: "Antaeus Coe",
        subject: "Re: Intro to your Global Business Consultant",
        dayIso: "2026-10-16",
      },
    ]);
    assert.equal(newest, DANA_WORDS);
    assert.equal(older, "Hi Dana,\n\nHere is the order I'd suggest.\n\nBest,\nAntaeus");
  });

  test("no sure message keeps no whole text, and a call or task entry never does", () => {
    const r = wholeEmails(RELAY, [
      { kind: "email", from: "Somebody Else", subject: "Something else entirely" },
      {
        kind: "call",
        from: "Dana Reyes",
        subject: "Intro to your Global Business Consultant",
      },
    ]);
    assert.deepEqual(r, [null, null]);
  });

  test("a capture that does not lead with its own header keeps nothing: what it quotes is never the reply", () => {
    // A reading-pane grab: the newest message carries no header of its own,
    // and its only block is the operator's quoted original.
    const grab = `Intro to your Global Business Consultant
Dana Reyes
To: Antaeus Coe
Not yet, our CFO is out until Monday.

From: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Thursday, October 16, 2026 11:01 AM
To: Dana Reyes <dana@regis.example>
Subject: Intro to your Global Business Consultant

Did the CFO sign off on the order?`;
    assert.deepEqual(
      wholeEmails(grab, [
        { ...DANA, subject: "Intro to your Global Business Consultant" },
      ]),
      [null],
    );
    assert.deepEqual(
      wholeEmails("OUTLOOK THREAD — pasted\n\nHi there,\n\nSounds right to me.\n\nDana", [
        DANA,
      ]),
      [null],
      "an Outlook capture with no header is never read as one email",
    );
  });

  test("a day both sides name must agree: an older message never stands in for the reply", () => {
    const own = `OUTLOOK THREAD — inbox copy
From: Dana Reyes <dana@regis.example>
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Tuesday, October 13, 2026 9:00 AM
Subject: Demo

The first note.`;
    assert.deepEqual(
      wholeEmails(own, [
        { kind: "email", from: "Dana Reyes", subject: "Demo", dayIso: "2026-10-20" },
      ]),
      [null],
    );
  });

  test("the clock breaks a tie in either idiom, and a tie left standing keeps nothing", () => {
    const two = `OUTLOOK THREAD — dropped file demo.eml
From: Dana Reyes <dana@regis.example>
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Wednesday, October 14, 2026 4:40 PM
Subject: Re: Demo

Thanks!

From: Dana Reyes <dana@regis.example>
Sent: Wednesday, October 14, 2026 08:55
To: Antaeus Coe <antaeus.coe@prismhr.com>
Subject: Demo

Can we move the demo to Thursday?`;
    assert.deepEqual(
      wholeEmails(two, [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "Demo",
          dayIso: "2026-10-14",
          timeLabel: "8:55 AM",
        },
      ]),
      ["Can we move the demo to Thursday?"],
    );
    assert.deepEqual(
      wholeEmails(two, [
        { kind: "email", from: "Dana Reyes", subject: "Demo", dayIso: "2026-10-14" },
      ]),
      [null],
      "two of hers that day with no clock to tell them apart is a guess",
    );
  });

  test("one email read from a capture keeps the capture's own message when the read wrote the subject its own way", () => {
    assert.deepEqual(
      wholeEmails(RELAY, [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "Reseller agreement",
          dayIso: "2026-10-20",
        },
      ]),
      [DANA_WORDS],
    );
  });

  test("a subject as a thread knows it", () => {
    assert.equal(
      threadSubject("RE: ❗ Re: [EXTERNAL] Re: Intro to your Global Business Consultant"),
      "intro to your global business consultant",
    );
    assert.equal(cleanSubject("Re: ❗ Re: [EXTERNAL] FW: Canada"), "Canada");
    assert.equal(cleanSubject("EXTERNAL: Re: Canada"), "Canada");
    assert.equal(cleanSubject("RE: "), "No subject");
  });
});

describe("the cleaner: the person's words stay, the junk goes", () => {
  test("every trail a client sets is cut", () => {
    assert.equal(
      cleanEmailWhole(
        "Yes, Thursday works.\n\nOn Mon, Oct 20, 2026 at 9:10 AM Dana Reyes <d@x.com> wrote:\n> earlier\n> more",
      ),
      "Yes, Thursday works.",
    );
    assert.equal(
      cleanEmailWhole("Sounds good.\n\n-----Original Message-----\nFrom: Dana"),
      "Sounds good.",
    );
    assert.equal(
      cleanEmailWhole(
        "Sounds good.\n\nGet Outlook for iOSFrom: Dana Reyes <d@x.com>\n\nSent: Monday\n\nTo: you\n\nquoted",
      ),
      "Sounds good.\n\nGet Outlook for iOS",
      "a header glued onto the line above it is still a header",
    );
    assert.equal(
      cleanEmailWhole(
        "Here it is.\n\n________________________________\nFrom: Dana\nSent: Monday\nTo: you\nSubject: x\n\nquoted",
      ),
      "Here it is.",
    );
    assert.equal(cleanEmailWhole("From: Dana\nSent: today\nTo: you\nSubject: x"), "");
  });

  test("an inline reply keeps its answers and drops what it quotes", () => {
    assert.equal(
      cleanEmailWhole(
        "See below.\n\nOn Mon, Oct 20, 2026 at 9:10 AM Antaeus <a@x.com> wrote:\n> Who employs them?\nThe client does, for now.\n> When do they start?\nJanuary.",
      ),
      "See below.\n\nThe client does, for now.\nJanuary.",
    );
  });

  test("a rule that opens no header is the person's, and stays", () => {
    assert.equal(
      cleanEmailWhole("Part one.\n\n________\n\nPart two."),
      "Part one.\n\n________\n\nPart two.",
    );
  });

  test("a sign-off cuts only a card, and only when a name follows it", () => {
    assert.equal(
      cleanEmailWhole(
        "Hi Antaeus,\n\nThank you!\n\nCan you send the agreement so our legal can review?\n\nDana",
      ),
      "Hi Antaeus,\n\nThank you!\n\nCan you send the agreement so our legal can review?\n\nDana",
      "a Thank you! opening a paragraph never ends the email",
    );
    assert.equal(
      cleanEmailWhole("Here it is.\n\nThanks,\nDana\n\nP.S. Monday works."),
      "Here it is.\n\nThanks,\nDana\n\nP.S. Monday works.",
    );
    assert.equal(
      cleanEmailWhole(
        "Here it is.\n\nThanks,\nDana\nVP, Client Services\nP: 555 123 4567\nwww.regis.example",
      ),
      "Here it is.\n\nThanks,\nDana",
    );
    assert.equal(
      cleanEmailWhole(
        "CAUTION: This email originated from outside of the organization.\nHello.\n\nSent from my iPhone",
      ),
      "Hello.",
    );
  });

  test("a long run of blank space costs one pass, never its square", () => {
    const wide = `Hello.\n${" ".repeat(200_000)}\nBye.`;
    const t = performance.now();
    assert.equal(cleanEmailWhole(wide), "Hello.\n\nBye.");
    assert.ok(performance.now() - t < 1000, "the cleaner backtracks on whitespace");
  });
});

describe("the store: redacted on the way in, marking what it looked for, failing open", () => {
  const stub = () => {
    const rows: { noteId: string; accountId: string; filingId?: string; text: string }[] =
      [];
    const calls: unknown[] = [];
    const db: EmailTextClient = {
      emailText: {
        async createMany(a) {
          rows.push(...a.data);
          return { count: a.data.length };
        },
        async findMany(a) {
          return rows.filter((r) => a.where.noteId.in.includes(r.noteId));
        },
        async deleteMany(a) {
          calls.push(a.where);
          return { count: 1 };
        },
      },
    };
    return { db, rows, calls };
  };

  test("money never reaches the table, and an email it could not pair keeps an empty row", async () => {
    const { db, rows } = stub();
    const n = await keepEmailTexts(
      [
        {
          noteId: "n1",
          accountId: "a1",
          filingId: "f1",
          text: "The fee is $4,500 a month, or USD 900 a head.",
        },
        { noteId: "n2", accountId: "a1", filingId: "f1", text: "" },
      ],
      db,
    );
    assert.equal(n, 2);
    assert.ok(!/4,500|\$|900/.test(rows[0].text), rows[0].text);
    assert.equal(rows[1].text, "");
    assert.equal((await emailTextsFor(["n1", "n9"], db)).size, 1);
  });

  test("the row says why there is no whole email, and every reason is true", async () => {
    const { db } = stub();
    await keepEmailTexts(
      [
        { noteId: "kept", accountId: "a", filingId: "f", text: "Hello." },
        { noteId: "looked", accountId: "a", filingId: "f", text: "" },
      ],
      db,
    );
    const r = await wholeEmailsFor(
      [
        { id: "kept", logged: false },
        { id: "looked", logged: false },
        // Filed before the store, and before the Filing column existed too:
        // a pasted inbound with no filing is still "before", never ours.
        { id: "old", logged: false },
        { id: "sent", logged: true },
      ],
      db,
    );
    assert.deepEqual(r.get("kept"), { whole: "Hello.", missing: "" });
    assert.deepEqual(r.get("looked"), { whole: null, missing: "capture" });
    assert.deepEqual(r.get("old"), { whole: null, missing: "before" });
    assert.deepEqual(r.get("sent"), { whole: null, missing: "record" });
  });

  test("a store that cannot be read claims nothing about why", async () => {
    const down: EmailTextClient = {
      emailText: {
        createMany: async () => Promise.reject(new Error("down")),
        findMany: async () => Promise.reject(new Error("down")),
        deleteMany: async () => Promise.reject(new Error("down")),
      },
    };
    const r = await wholeEmailsFor([{ id: "x", logged: false }], down);
    assert.deepEqual(r.get("x"), { whole: null, missing: "unread" });
  });

  test("one text the table refuses never takes the others down", async () => {
    const rows: string[] = [];
    const picky: EmailTextClient = {
      emailText: {
        async createMany(a) {
          if (a.data.length > 1) throw new Error("batch refused");
          if (a.data[0].text === "bad") throw new Error("row refused");
          rows.push(a.data[0].noteId);
          return { count: 1 };
        },
        findMany: async () => [],
        deleteMany: async () => ({ count: 0 }),
      },
    };
    const n = await keepEmailTexts(
      [
        { noteId: "a", accountId: "x", text: "good" },
        { noteId: "b", accountId: "x", text: "bad" },
        { noteId: "c", accountId: "x", text: "fine\u0000" },
      ],
      picky,
    );
    assert.equal(n, 2);
    assert.deepEqual(rows, ["a", "c"]);
  });

  test("a store that is down loses the whole email, never the caller", async () => {
    const down: EmailTextClient = {
      emailText: {
        createMany: async () => Promise.reject(new Error("no table")),
        findMany: async () => Promise.reject(new Error("no table")),
        deleteMany: async () => Promise.reject(new Error("no table")),
      },
    };
    assert.equal(
      await keepEmailTexts([{ noteId: "n", accountId: "a", text: "x" }], down),
      0,
    );
    assert.equal((await emailTextsFor(["n"], down)).size, 0);
    assert.equal(await dropEmailTexts({ accountId: "a", noteIds: ["n"] }, down), 0);
  });

  test("the take-back is scoped to the account, by the notes and by the filing", async () => {
    const { db, calls } = stub();
    await dropEmailTexts({ accountId: "a1", noteIds: ["n1"], filingId: "f1" }, db);
    assert.deepEqual(calls, [
      { accountId: "a1", noteId: { in: ["n1"] } },
      { accountId: "a1", filingId: "f1" },
    ]);
  });

  test("the strict money rule takes the forms people write prices in, and leaves a 401k and a headcount", () => {
    assert.equal(redactMoneyStrict("USD 900 a month"), "[—] a month");
    assert.equal(
      redactMoneyStrict("650 per employee per month"),
      "[—] per employee per month",
    );
    assert.equal(redactMoneyStrict("a 1.5k setup"), "a [—] setup");
    assert.equal(redactMoneyStrict("2 million"), "[—]");
    assert.equal(redactMoneyStrict("their 401k plan"), "their 401k plan");
    assert.equal(redactMoneyStrict("1.5k employees"), "1.5k employees");
  });

  test("the table arrives additive, beside no existing column", () => {
    const m = ADDITIVE.find((x) => x.migration === "20261020120000_email_text");
    assert.ok(m);
    assert.deepEqual(m.present, [{ table: "EmailText" }]);
    assert.match(m.statements[0], /CREATE TABLE IF NOT EXISTS "EmailText"/);
    assert.ok(!m.statements.some((s) => /ALTER TABLE/.test(s)));
  });
});

describe("the filing keeps the whole emails, and the undo takes them back", () => {
  const core = readFileSync(join(cwd(), "src/lib/room/paste-core.ts"), "utf8");
  const actions = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");

  test("read from the whole capture, never the read's window, after the notes, one row per email", () => {
    assert.match(core, /wholeEmails\(rawText, filedEntries\)/);
    assert.match(core, /text: wholes\[k\] \?\? ""/);
    assert.match(core, /if \(kept\.length\) await keepEmailTexts\(kept\);/);
    assert.ok(
      core.indexOf("keepEmailTexts(kept)") > core.indexOf("noteIds.push(n.id);"),
      "the store writes once the notes exist",
    );
  });

  test("the undo drops them by the filing's notes and its row, after the notes are gone", () => {
    const drop = actions.indexOf(
      "await dropEmailTexts({ accountId: acct.id, noteIds: ids, filingId: filing });",
    );
    assert.ok(drop > 0);
    assert.ok(drop > actions.indexOf("await undoFiling(filing, acct.id)"));
    assert.ok(drop > actions.indexOf("where: { id: { in: ids }, accountId:"));
  });
});

// ── the row ────────────────────────────────────────────────────────────────

const HOME = ["Lesha Cyphers"];
const note = (over: Partial<RowNote> & { id: string; body: string }): RowNote => ({
  createdAt: "2026-10-20T12:00:00.000Z",
  actors: "",
  recipients: "",
  source: "outlook-ai",
  lane: "mine",
  ...over,
});
const docsFor = (notes: RowNote[]) =>
  notes.map((n) =>
    docOf(
      { ...n, kind: "account", lane: n.lane ?? "mine", recipients: n.recipients ?? "" },
      HOME,
      new Set(),
    ),
  );
const lines = (
  notes: RowNote[],
  todos: Parameters<typeof recordLines>[0]["todos"] = [],
) => recordLines({ notes, docs: docsFor(notes), todos, homeSide: HOME, limit: 6 });
const latest = (notes: RowNote[]) =>
  latestEmail({ notes, docs: docsFor(notes), homeSide: HOME });

const IN = note({
  id: "e6",
  body: "✉ OL Today 9:10 AM — RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant · Dana Reyes → Antaeus Coe +2\nThey chose the reseller model. Owed: send the reseller agreement — @Antaeus Coe.",
  actors: "Dana Reyes → Antaeus Coe +2",
  recipients: "Antaeus Coe, Elise Munoz, Sam Ortiz",
  filingId: "f6",
});
const OUT = note({
  id: "e5",
  createdAt: "2026-10-16T12:00:00.000Z",
  body: "✉ OL Oct 16 11:01 AM — Re: Intro to your Global Business Consultant · Antaeus Coe → Dana Reyes\nLays out the order.",
  actors: "Antaeus Coe → Dana Reyes",
});
const ASKED = note({
  id: "e3",
  createdAt: "2026-10-15T12:00:00.000Z",
  body: "✉ OL Oct 15 9:38 AM — RE: Intro to your Global Business Consultant · Dana Reyes → Antaeus Coe\nAsks for demo times next week.",
  actors: "Dana Reyes → Antaeus Coe",
});
const TWIN = note({ ...ASKED, id: "e2" });
const THANKS = note({
  id: "e8",
  body: "✉ OL Today 3:40 PM — RE: Intro to your Global Business Consultant · Dana Reyes → Antaeus Coe\nThanks!",
  actors: "Dana Reyes → Antaeus Coe",
});
const ACCEPTED = note({
  id: "e9",
  body: "✉ OL Today 4:00 PM — Accepted: Demo · Dana Reyes → Antaeus Coe",
  actors: "Dana Reyes → Antaeus Coe",
});
const WORKED = note({
  id: "n1",
  createdAt: "2026-10-16T16:03:00.000Z",
  body: "✓ Worked the move · Answer Dana\nMarked done from the HomeRoom.",
  source: "room",
});

describe("the row's latest email", () => {
  test("the day and the clock a person reads: the head's clock in any dialect, never the noon anchor's", () => {
    assert.deepEqual(whenOf(IN.createdAt, IN.body), { day: "10/20", time: "9:10 AM" });
    assert.deepEqual(
      whenOf(
        "2026-10-15T12:00:00.000Z",
        "✉ SF Oct 15 3:47 PM — Email: Follow up · Dana Reyes → Antaeus Coe",
      ),
      { day: "10/15", time: "3:47 PM" },
    );
    assert.deepEqual(
      whenOf("2026-10-01T12:00:00.000Z", "✉ OL Oct 1 — Re: Canada · Tom → Antaeus Coe"),
      { day: "10/1", time: "" },
    );
    assert.deepEqual(whenOf(WORKED.createdAt, WORKED.body), {
      day: "10/16",
      time: "11:03 AM",
    });
  });

  test("it reads past a sign-off and an acceptance, either direction", () => {
    const l = latest([THANKS, ACCEPTED, IN, OUT]);
    assert.ok(l);
    assert.equal(l.id, "e6");
    assert.equal(l.from, "Dana Reyes");
    assert.equal(l.to, "you");
    assert.deepEqual(l.others, ["Elise Munoz", "Sam Ortiz"]);
    assert.equal(l.subject, "Intro to your Global Business Consultant");
    assert.equal(l.kept, "They chose the reseller model.");
    assert.equal(l.time, "9:10 AM");
    const out = latest([OUT, ASKED]);
    assert.equal(out?.id, "e5", "our own send is an email too");
    assert.equal(out?.from, "you");
    assert.equal(latest([WORKED]), null);
  });

  test("a send only to a colleague, their mail that never reached you, and a chat line never take it", () => {
    const toLesha = note({
      id: "c1",
      body: "✉ OL Today 5:00 PM — Regis · Antaeus Coe → Lesha Cyphers\nQuick update on Regis.",
      actors: "Antaeus Coe → Lesha Cyphers",
      recipients: "Lesha Cyphers",
    });
    const support = note({
      id: "c2",
      lane: "background",
      body: "✉ OL Today 5:10 PM — Payroll case · Dana Reyes → Lesha Cyphers\nThe payroll run failed.",
      actors: "Dana Reyes → Lesha Cyphers",
      recipients: "Lesha Cyphers",
    });
    const chat = note({
      id: "c3",
      body: "✉ TM Today 5:20 PM — Teams chat · Dana Reyes → Antaeus Coe\nAre we still on?",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.equal(latest([toLesha, support, chat, IN])?.id, "e6");
  });

  test("an afternoon SF email outranks a morning Outlook one of the same day", () => {
    const sf = note({
      id: "s1",
      body: "✉ SF Oct 20 3:47 PM — Email: Follow up · Dana Reyes → Antaeus Coe\nFollowing up.",
      actors: "Dana Reyes → Antaeus Coe",
      source: "sf-ai",
    });
    assert.equal(latest([IN, sf])?.id, "s1");
  });
});

describe("EARLIER: who, when and the subject, each opening in place", () => {
  test("in the order the record happened, with no format code, frozen Today or prefix", () => {
    const l = lines([WORKED, IN, ASKED, OUT, TWIN, THANKS]);
    assert.deepEqual(
      l.map((x) => x.id),
      ["e8", "e6", "n1", "e5", "e3", "e2"],
    );
    const e6 = l.find((x) => x.id === "e6")!;
    assert.equal(e6.line, "Intro to your Global Business Consultant");
    assert.ok(!/OL|Today|RE:|EXTERNAL/.test(`${e6.line} ${e6.day} ${e6.time}`));
    assert.deepEqual(e6.email?.owed, [
      { mine: true, who: "Antaeus Coe", text: "send the reseller agreement", closed: "" },
    ]);
    const n1 = l.find((x) => x.id === "n1")!;
    assert.equal(n1.email, null);
    assert.equal(n1.line, "Worked the move · Answer Dana");
    assert.equal(n1.body, "Marked done from the HomeRoom.");
    assert.ok(n1.struck);
  });

  test("an afternoon email sorts above a morning stamp of the same day", () => {
    const late = note({
      id: "e7",
      createdAt: "2026-10-16T12:00:00.000Z",
      body: "✉ OL Oct 16 3:00 PM — Re: Demo · Dana Reyes → Antaeus Coe\nWorks for us.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.deepEqual(
      lines([WORKED, late]).map((x) => x.id),
      ["e7", "n1"],
      "3:00 PM Chicago is after the 11:03 AM stamp, whatever the noon anchor says",
    );
  });

  test("an answered ask closes, a twin says so, a sign-off is a sign-off", () => {
    const byId = new Map(lines([IN, ASKED, OUT, TWIN, THANKS]).map((x) => [x.id, x]));
    assert.equal(byId.get("e3")?.email?.answered, "10/16");
    assert.equal(byId.get("e6")?.email?.answered, "", "nothing of ours came after it");
    assert.equal(byId.get("e3")?.email?.twice, false, "the first copy leads");
    assert.equal(byId.get("e2")?.email?.twice, true);
    assert.equal(byId.get("e8")?.email?.closer, true);
  });

  test("a sign-off, an acceptance or a note to a colleague of ours answers nothing", () => {
    const at = (
      id: string,
      clock: string,
      rest: string,
      actors: string,
      recipients = "",
    ) =>
      note({
        id,
        createdAt: "2026-10-15T12:00:00.000Z",
        body: `✉ OL Oct 15 ${clock} — ${rest}`,
        actors,
        recipients,
      });
    const thanks = at(
      "o1",
      "10:00 AM",
      "Re: Demo · Antaeus Coe → Dana Reyes\nThanks!",
      "Antaeus Coe → Dana Reyes",
    );
    const accepted = at(
      "o2",
      "10:30 AM",
      "Accepted: Demo · Antaeus Coe → Dana Reyes",
      "Antaeus Coe → Dana Reyes",
    );
    const lesha = at(
      "o3",
      "11:00 AM",
      "Regis · Antaeus Coe → Lesha Cyphers\nUpdate.",
      "Antaeus Coe → Lesha Cyphers",
      "Lesha Cyphers",
    );
    const byId = new Map(lines([ASKED, thanks, accepted, lesha]).map((x) => [x.id, x]));
    assert.equal(byId.get("e3")?.email?.answered, "");
  });

  test("two sends of one subject to two people, or two clockless lines with no words, are not twins", () => {
    const to = (id: string, who: string) =>
      note({
        id,
        body: `✉ OL Today 9:00 AM — Demo · Antaeus Coe → ${who}\nSends the times.`,
        actors: `Antaeus Coe → ${who}`,
      });
    const bare = (id: string) =>
      note({
        id,
        body: "✉ SF Oct 20 — Email: Follow up · Antaeus Coe → Dana Reyes",
        actors: "Antaeus Coe → Dana Reyes",
      });
    const l = lines([
      to("t1", "Dana Reyes"),
      to("t2", "Sam Ortiz"),
      bare("b1"),
      bare("b2"),
    ]);
    assert.ok(
      l.every((x) => !x.email?.twice),
      JSON.stringify(l.map((x) => [x.id, x.email?.twice])),
    );
  });

  test("an Owed line closes only when every to-do its filing opened is done, on the day its done tag holds", () => {
    assert.equal(
      lines(
        [IN],
        [{ id: "t1", body: "Send the reseller agreement", done: false, filingId: "f6" }],
      )[0].email?.owed[0].closed,
      "",
    );
    const done = Date.parse("2026-10-21T15:00:00.000Z");
    assert.equal(
      lines(
        [IN],
        [
          {
            id: "t1",
            body: withTags("Send the reseller agreement", {
              ...NO_TAGS,
              kind: "action",
              doneAt: String(done),
            }),
            done: true,
            filingId: "f6",
            updatedAt: "2026-10-24T15:00:00.000Z",
          },
        ],
      )[0].email?.owed[0].closed,
      "Done 10/21.",
    );
  });

  test("the court's owners read the same here: any case, and you, me, us or we are ours", () => {
    assert.deepEqual(owedSegments("Owed: send pricing — @antaeus."), [
      { text: "send pricing", who: "antaeus", mine: true },
    ]);
    assert.deepEqual(owedSegments("Owed: the deck — @me; the invoices — @Chassie"), [
      { text: "the deck", who: "me", mine: true },
      { text: "the invoices", who: "Chassie", mine: false },
    ]);
    assert.deepEqual(owedSegments("Owed: send pricing."), [
      { text: "send pricing", who: "", mine: false },
    ]);
  });

  test("an activity line says you, and an email with no sender leaves no dangling who", () => {
    const held = note({
      id: "m1",
      body: "✔ OL Oct 19, 2:00 PM — Meeting held · Antaeus Coe → Cristina Bell +1\nOn the calendar: Follow-up",
      actors: "Antaeus Coe → Cristina Bell +1",
      createdAt: "2026-10-19T19:00:00.000Z",
    });
    const ledger = note({ id: "l1", body: "✉ Outreach sent: “Checking in”", actors: "" });
    const byId = new Map(lines([held, ledger]).map((x) => [x.id, x]));
    assert.equal(byId.get("m1")?.who, "you → Cristina Bell");
    assert.equal(byId.get("l1")?.email?.from, "");
  });

  test("the Act Lane's send reads its subject, and ✎ keeps its tail", () => {
    const sent = note({
      id: "a1",
      body: "✉ Pricing for the Toronto hire — sent to Dana Reyes.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
      source: "act-lane",
      createdAt: "2026-10-20T15:00:00.000Z",
    });
    assert.equal(lines([sent])[0].line, "Pricing for the Toronto hire");
    assert.equal(
      withSubject(sent.body, "Toronto pricing"),
      "✉ Toronto pricing — sent to Dana Reyes.",
    );
  });

  test("✎ edits the subject in its slot, and the head keeps its grammar", () => {
    assert.equal(
      withSubject(IN.body.split("\n")[0], "Reseller agreement"),
      "✉ OL Today 9:10 AM — Reseller agreement · Dana Reyes → Antaeus Coe +2",
    );
    assert.equal(withSubject("✓ Worked the move", "Worked it"), "Worked it");
  });

  test("what renders is money-redacted on the way out", () => {
    const priced = note({
      id: "p1",
      body: "✉ OL Today 9:00 AM — Pricing · Dana Reyes → Antaeus Coe\nThey asked about USD 900 per head.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.ok(!/900/.test(lines([priced])[0].email?.kept ?? ""));
  });
});

// ── the verification's cases (the five-lens review of 2026-10-20) ──────────

describe("the matcher never hands one person's words to another", () => {
  const relay = (
    top: string,
    body: string,
    quoted: string,
  ) => `OUTLOOK THREAD — inbox copy
From: ${top}
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: 2026-10-20T19:30:00+00:00
Subject: FW: Pricing for Mexico

${body}

________________________________
From: Dana <dreyes@regis.example>
Sent: Tuesday, October 20, 2026 9:00 AM
To: Anika Steenstra <anika@prismhr.com>
Subject: Pricing for Mexico

${quoted}`;

  test("a colleague's forward over the client's ask never becomes the client's email", () => {
    const raw = relay(
      "Anika Steenstra <anika@prismhr.com>",
      "Antaeus, can you take this one? I told her you'd call today.\nAnika",
      "Do you have a census template?",
    );
    // Her own quoted message is hers, "Dana" being her name's short form;
    // the colleague's note above it never is.
    assert.deepEqual(
      wholeEmails(raw, [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "Pricing for Mexico",
          dayIso: "2026-10-20",
        },
      ]),
      ["Do you have a census template?"],
    );
    assert.deepEqual(
      wholeEmails(raw, [
        {
          kind: "email",
          from: "Dana Smith",
          subject: "Pricing for Mexico",
          dayIso: "2026-10-20",
        },
      ]),
      [null],
      "another Dana is not her",
    );
  });

  test("a bare address in the relay's From reads as the name the thread pairs it with", () => {
    const raw = `OUTLOOK THREAD — inbox copy
From: dreyes@regis.example
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: 2026-10-20T14:10:00+00:00
Subject: RE: Demo

Thursday works.

From: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Monday, October 19, 2026 4:00 PM
To: Dana Reyes <dreyes@regis.example>
Subject: Demo

Can we meet this week?`;
    assert.deepEqual(
      wholeEmails(raw, [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "RE: Demo",
          dayIso: "2026-10-20",
          timeLabel: "9:10 AM",
        },
      ]),
      ["Thursday works."],
    );
  });

  test("a lone candidate whose clock disagrees is never kept, and a Mac date is a date", () => {
    const raw = (top: string) => `OUTLOOK THREAD — inbox copy
From: ${top}
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: 2026-10-20T21:40:00+00:00
Subject: RE: Reseller

We're going with the reseller model.

From: Dana Reyes <dreyes@regis.example>
Date: Tuesday, October 13, 2026 at 9:00 AM
To: Antaeus Coe <antaeus.coe@prismhr.com>
Subject: Reseller

We are not ready to decide anything yet.`;
    const entry = {
      kind: "email",
      from: "Dana Reyes",
      subject: "RE: Reseller",
      dayIso: "2026-10-20",
      timeLabel: "4:40 PM",
    };
    assert.deepEqual(
      wholeEmails(raw("d.r@mobile.example"), [entry]),
      [null],
      "last week's quoted answer never stands in for today's",
    );
    assert.deepEqual(
      wholeEmails(raw("dreyes@regis.example"), [entry]),
      ["We're going with the reseller model."],
      "her own bare address is hers",
    );
  });

  test("a forwarded block's first body line never folds into its To line", () => {
    const raw = `OUTLOOK THREAD — dropped file fw.eml
From: Dana Reyes <dreyes@regis.example>
Sent: Tuesday, October 20, 2026 9:00 AM
Subject: Payroll
To: Antaeus Coe <antaeus.coe@prismhr.com>

Sam (sam@regis.example) owns payroll; loop him in on everything
Thanks`;
    assert.deepEqual(
      wholeEmails(raw, [
        { kind: "email", from: "Dana Reyes", subject: "Payroll", dayIso: "2026-10-20" },
      ]),
      ["Sam (sam@regis.example) owns payroll; loop him in on everything\nThanks"],
    );
  });

  test("a partner's Spanish Outlook header splits like an English one", () => {
    const raw = `OUTLOOK THREAD — dropped file re.eml
From: Ana Rivera <ana@pr.example>
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Tuesday, October 20, 2026 9:00 AM
Subject: RE: Demo

Funciona para mí.

De: Antaeus Coe <antaeus.coe@prismhr.com>
Enviado el: lunes, 19 de octubre de 2026 10:00
Para: Ana Rivera <ana@pr.example>
Asunto: Demo

Our price list is attached.`;
    assert.deepEqual(
      wholeEmails(raw, [
        { kind: "email", from: "Ana Rivera", subject: "RE: Demo", dayIso: "2026-10-20" },
      ]),
      ["Funciona para mí."],
    );
    assert.equal(emailMessages(raw).length, 2);
  });
});

describe("the cleaner keeps what a person wrote after a sign-off, and every sentence that only looks like a trail", () => {
  const cases: [string, string, string][] = [
    [
      "a P.S. with a link",
      "Here it is.\n\nThanks,\nDana\n\nP.S. The signed order form is here: https://docs.example.com/order",
      "Here it is.\n\nThanks,\nDana\n\nP.S. The signed order form is here: https://docs.example.com/order",
    ],
    [
      "an introduction with an address",
      "Here it is.\n\nThanks,\nDana\n\nLooping in Sam Ortiz (sam@regis.example), who runs payroll and will own the onboarding.",
      "Here it is.\n\nThanks,\nDana\n\nLooping in Sam Ortiz (sam@regis.example), who runs payroll and will own the onboarding.",
    ],
    [
      "a mobile email with no full stops",
      "Hi Antaeus,\n\nThank you!\n\nHere's the census file\nhttps://drive.example.com/x\nLet me know if you need anything else\n\nDana",
      "Hi Antaeus,\n\nThank you!\n\nHere's the census file\nhttps://drive.example.com/x\nLet me know if you need anything else\n\nDana",
    ],
    [
      "a sentence ending in wrote:",
      "Hi Antaeus,\n\nOn the pricing question, our CFO had one concern. Here is what she wrote:\n\nWe need the deposit waived.\n\nDana",
      "Hi Antaeus,\n\nOn the pricing question, our CFO had one concern. Here is what she wrote:\n\nWe need the deposit waived.\n\nDana",
    ],
    [
      "bullets set with >",
      "Hi Antaeus,\n\n> Mexico: two hires in January\n> Canada: one in March\n\nDana",
      "Hi Antaeus,\n\n> Mexico: two hires in January\n> Canada: one in March\n\nDana",
    ],
    [
      "a request to book a meeting",
      "Hi Antaeus,\n\nCould you book a meeting with me and our CFO next week?\n\nThanks,\nDana",
      "Hi Antaeus,\n\nCould you book a meeting with me and our CFO next week?\n\nThanks,\nDana",
    ],
    [
      "a German quoted header",
      "Passt.\n\nVon: Antaeus Coe\nGesendet: Montag, 19. Oktober 2026 10:00\nAn: Jonas\nBetreff: Demo\n\nquoted",
      "Passt.",
    ],
    [
      "Outlook's one-line header after a short reply",
      "Works for me.\nFrom: Dana Reyes Sent: Monday, October 19, 2026 10:00 AM To: Antaeus Subject: Demo\nquoted",
      "Works for me.",
    ],
    ["a NUL", "Hi\u0000 there.", "Hi there."],
  ];
  for (const [name, raw, want] of cases)
    test(name, () => assert.equal(cleanEmailWhole(raw), want));
});

describe("the strict money rule takes every figure that is not plainly something else", () => {
  const gone: [string, string][] = [
    ["599-649 PEPM", "[—]"],
    ["$599-649", "[—]"],
    ["PEPM: 549", "PEPM: [—]"],
    ["3.200 € gross", "[—] gross"],
    ["45000 MXN a month", "[—] a month"],
    ["Rs. 50000", "[—]"],
    ["650 bucks a head", "[—] a head"],
    ["twelve hundred dollars a month", "[—] a month"],
    ["EOR 599 / contractor 49", "EOR [—] / contractor [—]"],
    ["Your EOR fee of 499 euros per employee", "Your EOR fee of [—] per employee"],
    ["the one-time setup fee is 1500.", "the one-time setup fee is [—]."],
    // The round-2 review's leaks: price lists, units after the figure,
    // second and third prices, spelled salaries, what a client pays.
    [
      "Here's our pricing:\nEOR - 599\nContractor management - 49\nGlobal payroll - 25",
      "Here's our pricing:\nEOR - [—]\nContractor management - [—]\nGlobal payroll - [—]",
    ],
    ["EOR is 599 PEPY if you prepay the year.", "EOR is [—] if you prepay the year."],
    ["599PMPM", "[—]"],
    [
      "Our fees are 549 in Mexico and 649 in Brazil.",
      "Our fees are [—] in Mexico and [—] in Brazil.",
    ],
    [
      "Quoted 549 for MX and 649 for BR and 699 for PE.",
      "Quoted [—] for MX and [—] for BR and [—] for PE.",
    ],
    ["Rates: 549/649/699", "Rates: [—]/[—]/[—]"],
    ["The salary is about sixty thousand a year.", "The salary is about [—] a year."],
    [
      "The client is paying 650 now with Remote, and Deel came in at 549. Can you get under 500?",
      "The client is paying [—] now with Remote, and Deel came in at [—]. Can you get under [—]?",
    ],
    [
      "Mexico: 599\nBrazil: 649\nColombia: 549",
      "Mexico: [—]\nBrazil: [—]\nColombia: [—]",
    ],
    [
      "We charge 599 for EOR in Mexico either way",
      "We charge [—] for EOR in Mexico either way",
    ],
    ["PEPM for MX: 599 / BR: 649", "PEPM for MX: [—] / BR: [—]"],
    [
      "Our EOR fee for Mexico is 599; Brazil is 649.",
      "Our EOR fee for Mexico is [—]; Brazil is [—].",
    ],
    ["Le salaire est de 3 200 € brut", "Le salaire est de [—] brut"],
    ["45 000 MXN par mois", "[—] par mois"],
    ["We pay 2025 a month for that.", "We pay [—] a month for that."],
    ["Margin is 12% on top.", "Margin is [—] on top."],
    ["They pay 4.5 per head today.", "They pay [—] per head today."],
    ["599 includes payroll", "[—] includes payroll"],
    ["599 plus tax", "[—] plus tax"],
    ["EOR at 599, COR at 299", "EOR at [—], COR at [—]"],
    ["2 million", "[—]"],
    // A pace of hiring reads like a price, so it goes too.
    ["We hire 5 a month", "We hire [—] a month"],
    // The round-5 review's leaks: a time word behind a number word or a
    // determiner, more words that price a share, a currency or a unit glued
    // to the figure, and year-shaped prices.
    ["Deel quoted 599 six months ago.", "Deel quoted [—] six months ago."],
    [
      "Senior devs in Mexico go for 3500 these days.",
      "Senior devs in Mexico go for [—] these days.",
    ],
    ["Cobran 599 todos los meses.", "Cobran [—] todos los meses."],
    ["Ils paient 3200 tous les mois.", "Ils paient [—] tous les mois."],
    ["We bill 12% of gross payroll.", "We bill [—] of gross payroll."],
    ["Remote does 15% of gross.", "Remote does [—] of gross."],
    ["They'd get a 20% rev share.", "They'd get a [—] rev share."],
    ["Our spread is 8%.", "Our spread is [—]."],
    ["She's on P25000 a month.", "She's on [—] a month."],
    ["RM5000 monthly", "[—] monthly"],
    ["Pensja 9000zł brutto.", "Pensja [—] brutto."],
    ["Contractors 49ea, EOR 599ea.", "Contractors [—], EOR [—]."],
    ["The candidate expects 1 lakh a month.", "The candidate expects [—] a month."],
    ["Deel quoted 1950-2050 for Mexico.", "Deel quoted [—] for Mexico."],
    ["Their fee is between 1900 and 2000.", "Their fee is between [—] and [—]."],
    ["O salário fica em 2000.", "O salário fica em [—]."],
    ["For June, 2000 per month.", "For June, [—] per month."],
    // The round-6 review's leaks: a grid read as a phone, prose labels and
    // bare form numbers, "pm" for per month, and a bare price after "at".
    [
      "Country\tEOR\tSetup\tDeposit\nMexico\t599\t500\t2000",
      "Country\tEOR\tSetup\tDeposit\nMexico\t[—]\t[—]\t[—]",
    ],
    ["EOR fee, setup, deposit: 599 500 2000", "EOR fee, setup, deposit: [—] [—] [—]"],
    [
      "Salaries for devs: entry level 3500, mid level 5000.",
      "Salaries for devs: entry level [—], mid level [—].",
    ],
    [
      "Our basic option 499 covers payroll only.",
      "Our basic option [—] covers payroll only.",
    ],
    ["Their fee is 941.", "Their fee is [—]."],
    ["They charge 940 per month", "They charge [—] per month"],
    [
      "The client's cost per headcount is 650.",
      "The client's cost per headcount is [—].",
    ],
    [
      "Our current provider charges contractor management 49 pm and payroll 25 pm.",
      "Our current provider charges contractor management [—] pm and payroll [—] pm.",
    ],
    ["Remote prices global payroll at 12.", "Remote prices global payroll at [—]."],
    [
      "Contractor management runs 49 pm with them.",
      "Contractor management runs [—] pm with them.",
    ],
    ["Per headcount: 650.", "Per headcount: [—]."],
    // The round-7 review's leaks: a price word later in a count's phrase, a
    // figure in a date's year slot, and the partners' price nouns.
    ["a 1500 client setup fee", "a [—] client setup fee"],
    [
      "We charge a 750 contract termination fee.",
      "We charge a [—] contract termination fee.",
    ],
    [
      "They give each hire a 500 employee stipend.",
      "They give each hire a [—] employee stipend.",
    ],
    ["She's due a 2000 year end bonus", "She's due a [—] year end bonus"],
    ["Starting Oct 1, 8500 gross per month.", "Starting Oct 1, [—] gross per month."],
    ["Effective 1 March, 4500 per month.", "Effective 1 March, [—] per month."],
    ["El salario va desde 1950 hasta 2300 euros.", "El salario va desde [—] hasta [—]."],
    [
      "O custo vai desde 1990 até 2500 por mês.",
      "O custo vai desde [—] até [—] por mês.",
    ],
    [
      "The client pays them around 8 or 9 an hour.",
      "The client pays them around [—] or [—] an hour.",
    ],
    // Price talk keeps a year-shaped figure a figure, even after "since".
    [
      "Her salary has been the same since 2000.",
      "Her salary has been the same since [—].",
    ],
    // The round-3 review's leaks: a word that counts before a price, any
    // plural or foreign word after one, and priced shares.
    ["Contractors: 49\nEmployees: 599", "Contractors: [—]\nEmployees: [—]"],
    ["We bill contractors at 49 each.", "We bill contractors at [—] each."],
    ["We have 2 people at 4500 a month each.", "We have 2 people at [—] a month each."],
    [
      "The client is hiring at 75000 a year for the role.",
      "The client is hiring at [—] a year for the role.",
    ],
    ["Onboarding: 1500 one-time", "Onboarding: [—] one-time"],
    ["Placement fee per hire: 3500", "Placement fee per hire: [—]"],
    ["She'd make 4500 after taxes.", "She'd make [—] after taxes."],
    ["EOR is 599 versus 649 at Deel.", "EOR is [—] versus [—] at Deel."],
    ["Their quote of 549 beats ours.", "Their quote of [—] beats ours."],
    ["We pay 599 every month for her.", "We pay [—] every month for her."],
    ["649 year one, 599 year two", "[—] year one, [—] year two"],
    ["It's 599 month to month.", "It's [—] month to month."],
    ["EOR 599 Contractors 49 Payroll 25", "EOR [—] Contractors [—] Payroll [—]"],
    ["599 times 12 is 7188", "[—] times [—] is [—]"],
    ["Deel quoted 599 last week.", "Deel quoted [—] last week."],
    ["El salario es de 35000 mensuales.", "El salario es de [—] mensuales."],
    ["Le pagan 4500 soles al mes.", "Le pagan [—] soles al mes."],
    ["O salário é 5000 mensais.", "O salário é [—] mensais."],
    ["We'd apply our standard 12% markup.", "We'd apply our standard [—] markup."],
    ["Remote takes a 20% cut.", "Remote takes a [—] cut."],
    ["We charge 12% on top of gross payroll.", "We charge [—] on top of gross payroll."],
    [
      "The markup on employer cost in Mexico is 12%.",
      "The markup on employer cost in Mexico is [—].",
    ],
    [
      "The admin fee on the 4500 salary is 10%.",
      "The admin fee on the [—] salary is [—].",
    ],
    ["Margin: 599 base, 12% on top", "Margin: [—] base, [—] on top"],
    // The round-4 review's leaks: a round figure read as a year, a count
    // word that labels a price, a price after a hire, plural price words,
    // and a decimal or an abbreviation cutting a share's sentence.
    ["The setup fee is 2000.", "The setup fee is [—]."],
    ["Her salary is 2000 net.", "Her salary is [—] net."],
    ["We'd do it for 1999.", "We'd do it for [—]."],
    ["Un sueldo de 2000 al mes.", "Un sueldo de [—] al mes."],
    ["Mexico\t599\t2000", "Mexico\t[—]\t[—]"],
    [
      "EOR is 499 partner cost and 699 client price.",
      "EOR is [—] partner cost and [—] client price.",
    ],
    ["Cost is 599 employee/month.", "Cost is [—] employee/month."],
    [
      "Social contributions: 320 employee, 680 employer.",
      "Social contributions: [—] employee, [—] employer.",
    ],
    [
      "INSS is 908 employee side and 1800 employer side.",
      "INSS is [—] employee side and [—] employer side.",
    ],
    ["Recruiting fee per hire 5000.", "Recruiting fee per hire [—]."],
    ["We pay each hire 4000 a month.", "We pay each hire [—] a month."],
    [
      "Our markups are 12% in Mexico and 14% in Brazil.",
      "Our markups are [—] in Mexico and [—] in Brazil.",
    ],
    ["Their commissions run 10%.", "Their commissions run [—]."],
    [
      "Markup is 12.5% for Mexico and 14% for Brazil.",
      "Markup is [—] for Mexico and [—] for Brazil.",
    ],
    [
      "Our markup in the U.S. is 12%, and approx. 14% in Mexico.",
      "Our markup in the U.S. is [—], and approx. [—] in Mexico.",
    ],
  ];
  for (const [raw, want] of gone)
    test(raw, () => {
      assert.equal(redactMoneyStrict(raw), want);
      assert.equal(redactMoneyStrict(want), want, "a second pass changed it");
    });
  test("a phone after a phone word, with figures between, survives a second pass", () => {
    for (const raw of [
      "Direct line, weekdays 8 to 5 only: 312 555 1234",
      "Mobile, before 9 or after 5 only: 312 555 1234",
    ]) {
      const once = redactMoneyStrict(raw);
      assert.match(once, /312 555 1234$/);
      assert.equal(redactMoneyStrict(once), once);
    }
  });
  test("dates, years, times, phones, labels, forms, shares and counts stay", () => {
    for (const keep of [
      "a total of 12 employees",
      "their 401k plan",
      "at 3:30 on 10/20",
      "312 555 0199",
      "Call me at (312) 555-0199 ext. 4",
      "+52 55 1234 5678",
      "Can we do 10/22 at 2pm?",
      "Can we meet at 2? Or 3:30 works.",
      "Start date is October 22, 2026.",
      "2026-10-22 and 22 October",
      "We launch in 2027.",
      "headcount 45",
      "4-5 India admin workers",
      "It takes 3 weeks to onboard.",
      "a 2-week trial and 1 month notice",
      "We'd hire 2 developers and 1 designer.",
      "1,200 employees and 1.5k contractors",
      "3 clients in 2 countries",
      "two hundred employees",
      "a W-2 and an I-9, 1099 contractors, a Section 125 plan",
      "the 2nd client on Day 1 in Tier 2, Q3 2026, Ticket #4471",
      "About 80% of their clients are in Texas.",
      "see https://example.com/a/599 or dana@ex123.com",
      "24/7 support",
      "They want 6 months of runway and 3 open roles.",
      "Tenemos 35 empleados en 3 países.",
      "a 12-month term",
      "We were founded in 2009, live since 2015, launching in the fall of 2027, Q3 2026, October 2026, the 2025-2026 plan and the 2026/27 plan year.",
      "© 2026 Regis HR",
      "a 50 person company and a 200 employee PEO",
      "headcount: 45.",
      "3 business days and 6 calendar months",
      "Q3, B2B, SOC2, M365, W2, H1B, 24x7, COVID-19",
      "Record 001F000000w38OHIAY",
      "We want to launch in the first quarter of 2027.",
      // The round-6 review's keeps: times, the partners' dates and clocks,
      // ranges said as one, and counts in everyday phrasing.
      "I'm free Tuesday 2-3pm CT, or 10:30 or 11, or between 1 and 3 pm, or 4 ET.",
      "Thursday at 10 or 11 works.",
      "La fecha de inicio es el 15 de enero de 2027.",
      "¿Nos vemos el 3 de noviembre a las 10?",
      "On peut se voir le 3 novembre à 14h ? Reunião às 10h30",
      "Their headcount is 45-50, a team of 10 to 12.",
      "It's usually a 1-2 week process with a 90 day notice period and a 3 year term.",
      "They have 45 W-2 employees and 12 1099 contractors.",
      "12 U.S. employees, 50+ employees, 2 or 3 hires, between 10 and 15 employees.",
      "We have 120 companies and work with 3 PEOs.",
      "Form 940 and 1099-NEC, PrismHR v1.38, case 00123456.",
      "(312) 555-0199 and 312.555.0100 x204",
      "Can we meet at 2 Thursday? How about a call at 2 next week? Free from 1 to 3 on Friday.",
      "Starting Oct 1, 2026 the new plan applies.",
    ])
      assert.equal(redactMoneyStrict(keep), keep);
  });
});

describe("the row claims a moment only as far as the record holds it", () => {
  test("entries a filing wrote with no day show no day, keep capture order, and are never twins of each other", () => {
    const at = (
      id: string,
      sec: number,
      clock: string,
      from: string,
      to: string,
      words: string,
    ) =>
      note({
        id,
        filingId: "fx",
        createdAt: new Date(
          Date.parse("2026-10-20T21:05:00.000Z") + sec * 10,
        ).toISOString(),
        body: `✉ OL ${clock} — Agreement · ${from} → ${to}\n${words}`,
        actors: `${from} → ${to}`,
      });
    // Filed newest message first, so the oldest carries the latest stamp.
    const newest = at("d1", 0, "4:00 PM", "Dana Reyes", "Antaeus Coe", "We signed it.");
    const reply = at("d2", 1, "11:00 AM", "Antaeus Coe", "Dana Reyes", "Here it is.");
    const oldest = at(
      "d3",
      2,
      "9:10 AM",
      "Dana Reyes",
      "Antaeus Coe",
      "Can you send the agreement?",
    );
    const notes = [newest, reply, oldest];
    const l = lines(notes);
    assert.deepEqual(
      l.map((x) => x.id),
      ["d1", "d2", "d3"],
    );
    assert.ok(l.every((x) => x.day === "" && !x.email?.twice));
    assert.equal(latest(notes)?.id, "d1");
  });

  test("a day with no clock answers nothing on its own day, and a later day answers it", () => {
    // A send late that afternoon, Chicago, after the anchor's noon.
    const sent = (id: string, createdAt: string) =>
      note({
        id,
        body: "✉ Reseller agreement — sent to Dana Reyes.",
        actors: "Antaeus Coe → Dana Reyes",
        recipients: "Dana Reyes",
        source: "act-lane",
        createdAt,
      });
    const reply = note({
      id: "r1",
      createdAt: "2026-10-19T12:00:00.000Z",
      body: "✉ SF Oct 19 — RE: Reseller agreement · Dana Reyes → Antaeus Coe\nWe'll take the reseller model. Who signs on your side?",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const sameDay = sent("a1", "2026-10-19T21:00:00.000Z");
    const byId = new Map(lines([sameDay, reply]).map((x) => [x.id, x]));
    assert.equal(byId.get("r1")?.email?.answered, "", "a same-day send answers nothing");
    const nextDay = sent("a2", "2026-10-20T15:00:00.000Z");
    const next = new Map(lines([nextDay, reply]).map((x) => [x.id, x]));
    assert.equal(next.get("r1")?.email?.answered, "10/20");
    assert.equal(
      latest([sameDay, reply])?.logged,
      true,
      "an Act Lane send says it was logged",
    );
  });

  test("an inbound filed before filings were kept is no send from the app", () => {
    const legacy = note({
      id: "old",
      createdAt: "2026-09-02T12:00:00.000Z",
      body: "✉ OL Sep 2 10:00 AM — Census · Dana Reyes → Antaeus Coe\nSends the census.",
      actors: "Dana Reyes → Antaeus Coe",
      filingId: null,
      source: "outlook-ai",
    });
    const l = latest([legacy]);
    assert.equal(l?.id, "old");
    assert.equal(l?.logged, false);
  });

  test("the paste pipeline's placeholders never render as words", () => {
    const blank = note({
      id: "u1",
      body: "✉ OL Oct 19 2:00 PM — (no subject) · (unattributed)\nA note.",
      actors: "",
    });
    const l = lines([blank])[0];
    assert.equal(l.line, "No subject");
    assert.equal(l.email?.from, "");
    const call = note({
      id: "u2",
      body: "☎ SF Oct 19 2:00 PM — (no subject) · Dana Reyes → Antaeus Coe\nTalked through the timeline.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const task = note({
      id: "u3",
      createdAt: "2026-10-18T12:00:00.000Z",
      body: "✔ SF Oct 18 — RE: [EXTERNAL] FW: Pricing for Mexico · Antaeus Coe → Dana Reyes\nFollow up.",
      actors: "Antaeus Coe → Dana Reyes",
    });
    const [c, t] = lines([call, task]);
    assert.equal(c.line, "No subject", "a call's placeholder reads as words");
    assert.equal(t.line, "Pricing for Mexico", "a task's prefixes and tags go");
  });

  test("✎ starts from what is stored, and a typed note renders as written, its prices hidden", () => {
    const typed = note({
      id: "t1",
      createdAt: "2026-10-20T15:00:00.000Z",
      body: "✎ Plans to hire 5 people in Brazil at 599 a head",
      source: "room",
    });
    const l = lines([typed, IN]);
    const t1 = l.find((x) => x.id === "t1")!;
    assert.equal(t1.line, "Plans to hire 5 people in Brazil at [—] a head");
    assert.equal(t1.edit, "Plans to hire 5 people in Brazil at [—] a head");
    const e6 = l.find((x) => x.id === "e6")!;
    assert.equal(
      e6.edit,
      "RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant",
    );
    const priced = note({
      id: "p1",
      body: "✉ OL Oct 20 1:00 PM — RE: Mexico at 599 PEPM · Dana Reyes → Antaeus Coe\nAsks about Mexico.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const p1 = lines([priced])[0];
    assert.equal(p1.line, "Mexico at [—]");
    assert.equal(p1.edit, "RE: Mexico at [—]", "the edit box hides what the line hides");
  });

  test("each Owed line closes by its own promise, across filings, released or done", () => {
    const later = note({
      id: "e7",
      filingId: "f7",
      createdAt: "2026-10-21T12:00:00.000Z",
      body: "✉ OL Oct 21 9:00 AM — Re: Agreement · Dana Reyes → Antaeus Coe\nStill waiting. Owed: send the reseller agreement — @Antaeus Coe; book the demo — @Antaeus Coe; send the intro deck — @Lesha Cyphers.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const todos = [
      {
        id: "t1",
        body: "Send the reseller agreement · from 10/20 paste",
        done: false,
        filingId: "f6",
      },
      {
        id: "t2",
        body: withTags("Book the demo", {
          ...NO_TAGS,
          kind: "action",
          doneAt: String(Date.parse("2026-10-22T15:00:00Z")),
        }),
        done: true,
        filingId: "f7",
      },
    ];
    const owed = recordLines({
      notes: [later],
      docs: docsFor([later]),
      todos,
      homeSide: HOME,
      limit: 6,
    })[0].email?.owed;
    assert.deepEqual(
      owed?.map((o) => [o.text, o.closed]),
      [
        ["send the reseller agreement", ""],
        ["book the demo", "Done 10/22."],
        ["send the intro deck", ""],
      ],
    );
    const released = recordLines({
      notes: [later],
      docs: docsFor([later]),
      todos,
      released: new Set(["t1"]),
      homeSide: HOME,
      limit: 6,
    })[0].email?.owed;
    assert.equal(released?.[0].closed, "Released.");
  });

  test("a twin on the other lane still says FILED TWICE", () => {
    const bg = note({ ...TWIN, id: "bg", lane: "background", filingId: "fb" });
    const shown = note({ ...ASKED, filingId: "fa" });
    const l = recordLines({
      notes: [shown],
      all: [shown, bg],
      docs: docsFor([shown, bg]),
      todos: [],
      homeSide: HOME,
      limit: 6,
    });
    assert.equal(l[0].email?.twice, true);
  });
});

describe("the round-3 review: who sent it, where the trail starts, and when", () => {
  const thread = (top: string, quotedTo: string, sent = "2026-10-20T14:10:00+00:00") =>
    `OUTLOOK THREAD — inbox copy
From: ${top}
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: ${sent}
Subject: RE: Reseller

We're going with the reseller model.

From: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Monday, October 19, 2026 2:00 PM
To: ${quotedTo}
Subject: Reseller

Which model do you want?`;
  const entry = (from: string) => [
    {
      kind: "email",
      from,
      subject: "RE: Reseller",
      dayIso: "2026-10-20",
      timeLabel: "9:10 AM",
    },
  ];
  const KEPT = ["We're going with the reseller model."];

  test("the same address is the same sender, the address the rules reader writes included", () => {
    assert.deepEqual(
      wholeEmails(
        thread("dreyes@regis.example", "dreyes@regis.example"),
        entry("dreyes@regis.example"),
      ),
      KEPT,
    );
  });

  test("accents fold, and a first-name address is the person's", () => {
    assert.deepEqual(
      wholeEmails(
        thread("José Peña <jpena@isla.example>", "José Peña <jpena@isla.example>"),
        entry("Jose Pena"),
      ),
      KEPT,
    );
    assert.deepEqual(
      wholeEmails(
        thread("dana@regis.example", "dana@regis.example"),
        entry("Dana Reyes"),
      ),
      KEPT,
    );
  });

  test("the name the thread pairs with a bare address is read whole, Last, First included", () => {
    // The local part spells nothing, so only the pairing can name her.
    const top = "d.r.7@regis.example";
    assert.deepEqual(
      wholeEmails(thread(top, "Reyes, Dana <d.r.7@regis.example>"), entry("Dana Reyes")),
      KEPT,
    );
    assert.deepEqual(
      wholeEmails(thread(top, "d.r.7@regis.example"), entry("Dana Reyes")),
      [null],
      "with no pairing, nothing names her",
    );
    assert.deepEqual(
      wholeEmails(
        thread(top, "'d.r.7@regis.example' <d.r.7@regis.example>"),
        entry("Dana Reyes"),
      ),
      [null],
      "a display that is the address names no one",
    );
  });

  test("never across sides, and an unreadable Sent day is never trusted", () => {
    assert.deepEqual(
      wholeEmails(
        thread(
          "Dana Reyes <dana.reyes@prismhr.com>",
          "Dana Reyes <dreyes@regis.example>",
        ),
        entry("Dana Reyes"),
      ),
      [null],
      "a colleague who shares her name is not her",
    );
    assert.deepEqual(
      wholeEmails(
        thread(
          "Dana Reyes <dreyes@regis.example>",
          "Dana Reyes <dreyes@regis.example>",
          "sometime last week",
        ),
        entry("Dana Reyes"),
      ),
      [null],
    );
  });

  test("Apple's quoted trail, the French space, the German and Dutch verb, forwards and tips are cut", () => {
    const cases: [string, string][] = [
      [
        "Sounds good.\n\nSent from my iPhone\n\n> On Oct 20, 2026, at 9:10 AM, Antaeus Coe <antaeus.coe@prismhr.com> wrote:\n> \n> Hi Dana,\n> Our quote is attached.",
        "Sounds good.",
      ],
      [
        "Parfait, merci.\n\nLe mar. 20 oct. 2026 à 09:10, Antaeus Coe <antaeus.coe@prismhr.com> a écrit :\n> Bonjour",
        "Parfait, merci.",
      ],
      [
        "Passt, danke.\n\nAm Di., 20. Okt. 2026 um 09:10 Uhr schrieb Antaeus Coe <antaeus.coe@prismhr.com>:\n> Hallo",
        "Passt, danke.",
      ],
      [
        "Prima.\n\nOp di 20 okt. 2026 om 09:10 schreef Antaeus Coe <antaeus.coe@prismhr.com>:\n> Hoi",
        "Prima.",
      ],
      [
        "You don't often get email from dreyes@regis.example. Learn why this is important\n\nHi Antaeus,\n\nThursday works.",
        "Hi Antaeus,\n\nThursday works.",
      ],
      ["Works for me.\n\nGet Outlook for iOS<https://aka.ms/o0ukef>", "Works for me."],
      [
        "See below.\n\n---------- Forwarded message ---------\nFrom: Sam <s@x.example>\nDate: Mon\n\nBody",
        "See below.",
      ],
      ["FYI\n\nBegin forwarded message:\n\nFrom: Sam <s@x.example>", "FYI"],
      ["________________________________", ""],
      ["Agreed.\n\n> line one\n> line two", "Agreed."],
      [
        "Two things:\n> the census\n> the country list\nThanks",
        "Two things:\n> the census\n> the country list\nThanks",
      ],
    ];
    for (const [raw, want] of cases) assert.equal(cleanEmailWhole(raw), want, raw);
  });

  test("an entry filed with no day never outranks a dated one", () => {
    // One filing: Dana's dated reply on top, the operator's quoted message
    // below it with a date the reader could not read.
    const dated = note({
      id: "d1",
      filingId: "fz",
      createdAt: "2026-10-20T12:00:00.000Z",
      body: "✉ OL Oct 20 9:10 AM — RE: Reseller · Dana Reyes → Antaeus Coe\nPlease send the agreement.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const quoted = note({
      id: "d2",
      filingId: "fz",
      createdAt: "2026-10-21T21:05:00.000Z",
      body: "✉ OL 3:00 PM — Reseller · Antaeus Coe → Dana Reyes\nWhich model do you want?",
      actors: "Antaeus Coe → Dana Reyes",
    });
    assert.equal(latest([quoted, dated])?.id, "d1");
    assert.deepEqual(
      lines([quoted, dated]).map((x) => x.id),
      ["d1", "d2"],
    );
    // A whole filing with no days, against an older dated email of the record.
    const record = note({
      id: "r9",
      filingId: "fr",
      createdAt: "2026-10-19T12:00:00.000Z",
      body: "✉ OL Oct 19 4:00 PM — Signed · Dana Reyes → Antaeus Coe\nWe signed. Send the countersigned copy.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const old = note({
      id: "o1",
      filingId: "fo",
      createdAt: "2026-10-21T21:05:00.000Z",
      body: "✉ OL 9:10 AM — Draft · Dana Reyes → Antaeus Coe\nCan you resend the draft?",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.equal(latest([old, record])?.id, "r9");
    assert.deepEqual(
      lines([old, record]).map((x) => x.id),
      ["r9", "o1"],
    );
    assert.equal(latest([old])?.id, "o1", "with no dated email, the undated one stands");
    // Its filing's one dated email a sign-off: the undated message below it
    // still never outranks the record's older dated email.
    const thanks = note({
      ...dated,
      id: "d3",
      body: "✉ OL Oct 20 9:10 AM — RE: Reseller · Dana Reyes → Antaeus Coe\nThanks!",
    });
    const quotedIn = note({
      ...quoted,
      id: "d4",
      body: "✉ OL 3:00 PM — Reseller · Dana Reyes → Antaeus Coe\nWhich model do you want?",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.equal(latest([thanks, quotedIn, record])?.id, "r9");
  });

  test("a later promise in the same words never reopens a kept one, and each reads its own done day", () => {
    const ask = (id: string, filingId: string | null, day: string, md: string) =>
      note({
        id,
        filingId,
        createdAt: `${day}T12:00:00.000Z`,
        body: `✉ OL ${md} 9:00 AM — Census · Dana Reyes → Antaeus Coe\nAsks for the template. Owed: send the census template — @Antaeus Coe.`,
        actors: "Dana Reyes → Antaeus Coe",
      });
    const done = (
      id: string,
      filingId: string | undefined,
      opened: string,
      at: string,
    ) => ({
      id,
      body: withTags("Send the census template", {
        ...NO_TAGS,
        kind: "action",
        doneAt: String(Date.parse(at)),
      }),
      done: true,
      createdAt: opened,
      filingId,
    });
    const open = (id: string, filingId: string | undefined, opened: string) => ({
      id,
      body: "Send the census template",
      done: false,
      createdAt: opened,
      filingId,
    });
    const owed = (n: RowNote, todos: Parameters<typeof recordLines>[0]["todos"]) =>
      lines([n], todos)[0].email?.owed[0]?.closed;
    const aug = ask("a1", "f1", "2026-08-01", "Aug 1");
    const oct = ask("a2", "f2", "2026-10-16", "Oct 16");
    const t1 = done("t1", "f1", "2026-08-01T17:00:00Z", "2026-08-05T15:00:00Z");
    // loadTodos lists done rows oldest first, so list position names nothing.
    assert.equal(owed(aug, [t1, open("t2", "f2", "2026-10-16T17:00:00Z")]), "Done 8/5.");
    assert.equal(owed(oct, [t1, open("t2", "f2", "2026-10-16T17:00:00Z")]), "");
    const t2 = done("t2", "f2", "2026-10-16T17:00:00Z", "2026-10-17T15:00:00Z");
    assert.equal(owed(oct, [t1, t2]), "Done 10/17.");
    assert.equal(owed(aug, [t2, t1]), "Done 8/5.");
    // A row typed by hand between the ask and its filing's own row never
    // stands in for the row the filing opened.
    const typed = open("t5", undefined, "2026-10-16T15:00:00Z");
    assert.equal(owed(oct, [t1, typed, t2]), "Done 10/17.");
    // Filed before filings were kept: the row opened nearest after the ask.
    const augLegacy = ask("a3", null, "2026-08-01", "Aug 1");
    const octLegacy = ask("a4", null, "2026-10-16", "Oct 16");
    const legacy = [
      done("t3", undefined, "2026-08-01T17:00:00Z", "2026-08-05T15:00:00Z"),
      open("t4", undefined, "2026-10-16T17:00:00Z"),
    ];
    assert.equal(owed(augLegacy, legacy), "Done 8/5.");
    assert.equal(owed(octLegacy, legacy), "");
  });
});

describe("the round-4 review: what counts, what trails, and who else is on it", () => {
  test("mail-app taglines, the outside-sender banner and legal footers go; a sentence about external email stays", () => {
    const body = "Hi Antaeus,\n\nThursday works for the demo.\n\nThanks,\nDana";
    for (const top of [
      "EXTERNAL EMAIL: This email originated from outside of the organization. Do not click links or open attachments unless you recognize the sender.",
      "This email originated from outside of the organization. Do not click links or open attachments unless you recognize the sender.",
      "CAUTION: External email. Do not click links or open attachments unless you recognize the sender.",
    ])
      assert.equal(cleanEmailWhole(`${top}\n\n${body}`), body, top);
    for (const foot of [
      "NOTICE: This e-mail message, including any attachments, is for the sole use of the intended recipient(s) and may contain confidential information.",
      "This email and any attachments are confidential and intended solely for the use of the addressee.",
      "The information contained in this email is confidential and may be legally privileged.",
      "Sent from Mail for Windows",
    ])
      assert.equal(cleanEmailWhole(`${body}\n\n${foot}`), body, foot);
    const own =
      "Hi Antaeus,\n\nWe sent an external email to the client yesterday about links in the portal.\n\nThanks,\nDana";
    assert.equal(cleanEmailWhole(own), own);
  });

  test("a footer below the quote is never an answer, Zoho's dashed attribution is a trail, and inline answers stay", () => {
    assert.equal(
      cleanEmailWhole(
        "Thursday works.\n\nDana\n\nOn Mon, Oct 19, 2026 at 2:00 PM Antaeus Coe <antaeus.coe@prismhr.com> wrote:\n> Can we meet this week?\n>\n\nThis email and any attachments are confidential.",
      ),
      "Thursday works.\n\nDana",
    );
    assert.equal(
      cleanEmailWhole(
        "Thursday works.\n\nOn Mon, Oct 19, 2026 at 2:00 PM Antaeus Coe <antaeus.coe@prismhr.com> wrote:\n> Can we meet?\n\n-- \nDana Reyes\nVP\n555-123-4567",
      ),
      "Thursday works.",
    );
    assert.equal(
      cleanEmailWhole(
        "Thursday works.\n\nDana\n\n---- On Mon, 19 Oct 2026 14:00:00 -0500 Antaeus Coe <antaeus.coe@prismhr.com> wrote ----\n\nHi Dana,\nOur quote is attached.",
      ),
      "Thursday works.\n\nDana",
    );
    assert.equal(
      cleanEmailWhole(
        "FYI\n\n============ Forwarded message ============\nFrom: Sam <s@x.example>",
      ),
      "FYI",
    );
    const inline = cleanEmailWhole(
      "Answers below.\n\nOn Mon, Oct 19, 2026 at 2:00 PM Antaeus Coe <antaeus.coe@prismhr.com> wrote:\n> How many hires?\nFive.\n> When?\nJanuary.\n\nThanks,\nDana",
    );
    assert.match(inline, /Five\.[\s\S]*January\.[\s\S]*Dana/);
    assert.doesNotMatch(inline, /How many/);
  });

  test("a short display pairs only when the address spells the read's name, and a paired name decides", () => {
    const raw = (top: string, quotedTo: string) => `OUTLOOK THREAD — inbox copy
From: ${top}
To: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: 2026-10-20T14:10:00+00:00
Subject: RE: Census

We'll send the census Friday.

From: Antaeus Coe <antaeus.coe@prismhr.com>
Sent: Monday, October 19, 2026 2:00 PM
To: ${quotedTo}
Subject: Census

Can you send the census?`;
    const entry = (from: string) => [
      {
        kind: "email",
        from,
        subject: "RE: Census",
        dayIso: "2026-10-20",
        timeLabel: "9:10 AM",
      },
    ];
    const KEPT = ["We'll send the census Friday."];
    assert.deepEqual(
      wholeEmails(
        raw("Dana <dreyes@regis.example>", "Dana <dreyes@regis.example>"),
        entry("Dana Reyes"),
      ),
      KEPT,
    );
    assert.deepEqual(
      wholeEmails(
        raw("Dana <dreyes@regis.example>", "Dana <dreyes@regis.example>"),
        entry("Dana Smith"),
      ),
      [null],
      "another Dana at the company is not her",
    );
    assert.deepEqual(
      wholeEmails(
        raw("dana@regis.example", "Smith, Dana <dana@regis.example>"),
        entry("Dana Reyes"),
      ),
      [null],
      "the name the thread pairs the address with decides",
    );
    assert.deepEqual(
      wholeEmails(
        raw("kimberly@regis.example", "kimberly@regis.example"),
        entry("John Kim"),
      ),
      [null],
      "a surname inside an address names no one",
    );
  });

  test("a marker or archive the filing wrote never anchors its undated entries above older dated mail", () => {
    const record = note({
      id: "r9",
      filingId: "fr",
      createdAt: "2026-10-19T12:00:00.000Z",
      body: "✉ OL Oct 19 4:00 PM — Proposal · Dana Reyes → Antaeus Coe\nAsks for the proposal.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const undated = note({
      id: "u1",
      filingId: "fb",
      createdAt: "2026-10-21T21:05:00.000Z",
      body: "✉ OL activity — RE: Proposal · Dana Reyes → Antaeus Coe\nWe went with another provider.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const marker = note({
      id: "m1",
      filingId: "fb",
      createdAt: "2026-10-21T21:05:02.000Z",
      body: outcomeMarkBody("lost", "went with another provider"),
      source: "outcome",
    });
    const order = lines([marker, undated, record]).map((x) => x.id);
    assert.ok(order.indexOf("r9") < order.indexOf("u1"), order.join(","));
  });

  test("two undated emails with one clock and different words are not twins", () => {
    const at = (id: string, filingId: string, createdAt: string, words: string) =>
      note({
        id,
        filingId,
        createdAt,
        body: `✉ OL 9:00 AM — Weekly census · Dana Reyes → Antaeus Coe\n${words}`,
        actors: "Dana Reyes → Antaeus Coe",
      });
    const a = at("w1", "fa", "2026-10-14T21:05:00.000Z", "Three new hires in Mexico.");
    const b = at("w2", "fb", "2026-10-21T21:05:00.000Z", "No new hires this week.");
    assert.ok(lines([a, b]).every((x) => !x.email?.twice));
    const c = at("w3", "fc", "2026-10-22T21:05:00.000Z", "No new hires this week.");
    assert.ok(
      lines([b, c]).some((x) => x.email?.twice),
      "the same words still say so",
    );
  });

  test("+N never counts the operator twice or an address that spells a name already shown", () => {
    const mk = (recipients: string) =>
      note({
        id: "p1",
        body: "✉ OL Oct 20 9:10 AM — Plan · Dana Reyes → Antaeus Coe\nThe plan.",
        actors: "Dana Reyes → Antaeus Coe",
        recipients,
      });
    assert.deepEqual(latest([mk("antaeus.coe@prismhr.com")])?.others, []);
    assert.deepEqual(latest([mk("Antaeus, Elise Munoz")])?.others, ["Elise Munoz"]);
    assert.deepEqual(latest([mk("Antaeus Coe antaeus.coe@prismhr.com")])?.others, []);
    const toSam = note({
      id: "p2",
      body: "✉ OL Oct 20 9:10 AM — Plan · Antaeus Coe → Sam Ortiz\nThe plan.",
      actors: "Antaeus Coe → Sam Ortiz",
      recipients: "sortiz@integra.example, Elise Munoz",
    });
    assert.deepEqual(latest([toSam])?.others, ["Elise Munoz"]);
  });
});

describe("the round-5 review: attributions, one answer, first names and accents", () => {
  test("a sentence shaped like an attribution never hides the real one, and a quote by day and clock stays", () => {
    assert.equal(
      cleanEmailWhole(
        'Hola Antaeus,\n\nEl cliente nos escribió:\n\n"Necesitamos dos personas en México."\n\nGracias,\nAna\n\nEl jue, 15 oct 2026 a las 14:00, Antaeus Coe (<antaeus.coe@prismhr.com>) escribió:\nHola Ana, ¿alguna novedad?\nSaludos,\nAntaeus',
      ),
      'Hola Antaeus,\n\nEl cliente nos escribió:\n\n"Necesitamos dos personas en México."\n\nGracias,\nAna',
    );
    const relay =
      'Hi Antaeus,\n\nOur client got back to us this morning.\n\nOn Monday at 10:30 she wrote:\n"We need two people in Mexico by January."\n\nCan we get a quote together this week?\n\nThanks,\nDana';
    assert.equal(cleanEmailWhole(relay), relay);
    assert.equal(
      cleanEmailWhole(
        "Sounds good.\n\nOn Oct 20, 2026, at 9:10 AM, Antaeus Coe wrote:\n\n> Hi Dana",
      ),
      "Sounds good.",
      "a date with its year and a clock is an attribution",
    );
  });

  test("one answer straight under one quoted question is an inline answer", () => {
    assert.equal(
      cleanEmailWhole(
        "See my answer below.\n\nOn Mon, Oct 19, 2026 at 2:00 PM Antaeus Coe <antaeus.coe@prismhr.com> wrote:\n> When do your Mexico hires start?\nJanuary 15, both of them.\n\nThanks,\nDana",
      ),
      "See my answer below.\n\nJanuary 15, both of them.\n\nThanks,\nDana",
    );
  });

  test("a send to a colleague named by first name is coordination: no latest email, no answer", () => {
    const toLesha = note({
      id: "c1",
      body: "✉ OL Oct 20 4:00 PM — Regis next steps · Antaeus Coe → Lesha\nQuick update.",
      actors: "Antaeus Coe → Lesha",
      recipients: "Lesha",
    });
    const fromDana = note({
      id: "i1",
      body: "✉ OL Oct 20 9:10 AM — Census · Dana Reyes → Antaeus Coe\nCan you send the census template?",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.equal(latest([toLesha, fromDana])?.id, "i1");
    const dana = lines([toLesha, fromDana]).find((x) => x.id === "i1");
    assert.equal(dana?.email?.answered, "");
  });

  test("an accented owner parses, names the owner, and closes by their loop", () => {
    const n = note({
      id: "j1",
      filingId: "fj",
      createdAt: "2026-10-16T12:00:00.000Z",
      body: "✉ OL Oct 16 9:00 AM — Census · José Ramírez → Antaeus Coe\nHe will pull the census. Owed: send the census file — @José Ramírez.",
      actors: "José Ramírez → Antaeus Coe",
    });
    const owed = lines([n])[0].email?.owed[0];
    assert.equal(owed?.who, "José Ramírez");
    assert.equal(owed?.text, "send the census file");
  });

  test("an Act Lane send to two addresses joined by ';' shows the second behind +1, never the first again", () => {
    const sent = note({
      id: "a9",
      body: "✉ Census template — sent to dana@regis.example; elise@regis.example.",
      actors: "Antaeus Coe → dana@regis.example; elise@regis.example",
      recipients: "dana@regis.example; elise@regis.example",
      source: "act-lane",
    });
    assert.deepEqual(latest([sent])?.others, ["elise@regis.example"]);
  });
});

describe("the round-6 review: trails that look like a person's words, and the row's own reads", () => {
  test("a sentence with an address, a notice with an ask below it, a caution about the office and a From/To list stay", () => {
    for (const keep of [
      'Hi Antaeus,\n\nOn Friday the client\'s HR lead (maria.lopez@cliente.example) wrote:\n\n"We need both hires by January 4."\n\nCan you send the quote this week?\n\nThanks,\nDana',
      "Hi Antaeus,\n\nAttached is the census for the two Mexico hires.\n\nThis email and any attachments are confidential because the census lists their national IDs, so please keep it inside your team.\n\nCan you get us the quote by Friday?\n\nThanks,\nDana",
      "Hi Dana,\n\nThanks for the time today.\n\nBook a meeting with me here for the pricing walk-through: https://calendly.com/antaeus-coe/30min\n\nI'll send the order form Friday.\n\nBest,\nAntaeus",
      "Hi Antaeus,\n\nCaution: the two Mexico hires work outside the office most days, so we need remote work terms in the contract.\n\nThanks,\nDana",
      "Hi Antaeus,\n\nOne of our client's employees is relocating:\n\nFrom: Puerto Rico\nTo: Mexico City\nDate: January 4\n\nCan you tell us what EOR would need from them?\n\nThanks,\nDana",
    ])
      assert.equal(cleanEmailWhole(keep), keep);
  });

  test("the partners' taglines, more outside-sender banners and a one-paragraph footer go", () => {
    const body = "Hi Antaeus,\n\nThursday works for the demo.\n\nThanks,\nDana";
    for (const foot of [
      "Enviado desde mi iPhone",
      "Obtener Outlook para iOS",
      "Sent from Yahoo Mail on Android",
      "Sent from Outlook",
    ])
      assert.equal(cleanEmailWhole(`${body}\n\n${foot}`), body, foot);
    for (const top of [
      "ATTENTION: This email originated from outside the organization. Do not click links or open attachments unless you recognize the sender.",
      "This email is from an external sender. Please do not click links or open attachments unless you trust the sender.",
      "CAUTION: This email originated from outside of the organization.\nDo not click links or open attachments unless you recognize the sender and know the content is safe.",
    ])
      assert.equal(cleanEmailWhole(`${top}\n\n${body}`), body, top);
    assert.equal(
      cleanEmailWhole(
        "Thursday works, thanks!\nDana\nCONFIDENTIALITY NOTICE: This e-mail message, including any attachments, is for the sole use of the intended recipient(s).",
      ),
      "Thursday works, thanks!\nDana",
    );
  });

  test("a call's body opens with its prices hidden", () => {
    const call = note({
      id: "k1",
      body: "☎ SF Oct 19 2:00 PM — Pricing call · Antaeus Coe → Dana Reyes\nWalked through pricing: 599 for Mexico, 699 for Brazil. Deposit of 2000 required. Can you do 450 per head?",
      actors: "Antaeus Coe → Dana Reyes",
    });
    const body = lines([call])[0].body;
    assert.doesNotMatch(body, /599|699|2000|450/);
  });

  test("an Act Lane send loses to the relay's copy of the same email", () => {
    const stub = note({
      id: "act",
      createdAt: "2026-10-20T15:03:22.481Z",
      body: "✉ Toronto pricing — sent to Dana Reyes.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
      source: "act-lane",
    });
    const copy = note({
      id: "rel",
      body: "✉ OL Oct 20 10:03 AM — Toronto pricing · Antaeus Coe → Dana Reyes\nSends the Toronto numbers.",
      actors: "Antaeus Coe → Dana Reyes",
    });
    const l = latest([stub, copy]);
    assert.equal(l?.id, "rel");
    assert.equal(l?.logged, false);
    assert.equal(latest([stub])?.logged, true);
  });

  test("a line with two Owed markers reads two segments, and prose after the block stays prose", () => {
    const two = note({
      id: "o1",
      body: "✉ OL Oct 20 9:10 AM — Plan · Dana Reyes → Antaeus Coe\nPrefers SmartPay. Owed: SmartPay follow-up — @Lucas. Owed: coordinate the post-mortem — @Antaeus.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    assert.deepEqual(
      lines([two])[0].email?.owed.map((o) => [o.text, o.who]),
      [
        ["SmartPay follow-up", "Lucas"],
        ["coordinate the post-mortem", "Antaeus"],
      ],
    );
    const prose = note({
      id: "o2",
      body: "✉ OL Oct 20 9:10 AM — Plan · Dana Reyes → Antaeus Coe\nSends the plan. Owed: send the census file — @Dana Reyes. Dana is out until Monday.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const e = lines([prose])[0].email;
    assert.deepEqual(
      e?.owed.map((o) => o.text),
      ["send the census file"],
    );
    assert.equal(e?.kept, "Sends the plan. Dana is out until Monday.");
    assert.deepEqual(owedSegments("Owed: send the census."), [
      { text: "send the census", who: "", mine: false },
    ]);
  });

  test("the partners' forward and reply prefixes leave the subject", () => {
    for (const raw of [
      "RV: Nómina de México",
      "TR: Nómina de México",
      "ENC: Nómina de México",
      "RES: Nómina de México",
    ])
      assert.equal(cleanSubject(raw), "Nómina de México", raw);
    assert.equal(threadSubject("RV: Nómina"), threadSubject("FW: Nómina"));
  });
});

describe("the round-7 review: banners in a person's words, a label under a thank-you, and the row's pairings", () => {
  test("a person's line about external email or a caution stays, and a label under a thank-you is no name", () => {
    for (const keep of [
      "Hi Antaeus,\n\nExternal email links get blocked by our IT team, so could you send the agreement as a PDF instead?\n\nThanks,\nDana",
      "Hi Antaeus,\n\nCaution: our sender domain changed, so links from the old domain are dead. External replies should go to the new one.\n\nThanks,\nDana",
      "Hi Antaeus,\n\nThank you!\n\nSigned Order Form\nhttps://docs.regis.example/order-form-signed\n\nDana",
    ])
      assert.equal(cleanEmailWhole(keep), keep);
  });

  test("Exchange's tip and Mail for Windows go with their links", () => {
    const body = "Hi Antaeus,\n\nThursday works for the demo.\n\nThanks,\nDana";
    for (const top of [
      "You don't often get email from dana@regis.example. Learn why this is important<https://aka.ms/LearnAboutSenderIdentification>",
      "[You don't often get email from dana@regis.example. Learn why this is important at https://aka.ms/LearnAboutSenderIdentification ]",
    ])
      assert.equal(cleanEmailWhole(`${top}\n\n${body}`), body, top);
    assert.equal(
      cleanEmailWhole(
        `${body}\n\nSent from Mail<https://go.microsoft.com/fwlink/?LinkId=550986> for Windows`,
      ),
      body,
    );
  });

  test("an Act Lane send gives way only to a copy sent to the same person", () => {
    const stub = note({
      id: "act",
      createdAt: "2026-10-20T15:01:37.000Z",
      body: "✉ Census template — sent to Dana Reyes.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
      source: "act-lane",
    });
    const toElise = note({
      id: "r-elise",
      body: "✉ OL Oct 20 9:40 AM — RE: Census template · Antaeus Coe → Elise Munoz\nAnswers Elise.",
      actors: "Antaeus Coe → Elise Munoz",
    });
    assert.equal(latest([toElise, stub])?.id, "act");
    const toDana = note({
      id: "r-dana",
      body: "✉ OL Oct 20 10:01 AM — Census template · Antaeus Coe → Dana Reyes\nSends the template.",
      actors: "Antaeus Coe → Dana Reyes",
    });
    assert.equal(latest([toElise, stub, toDana])?.id, "r-dana");
  });

  test("a client who shares a colleague's first name is the client", () => {
    const ask = note({
      id: "i1",
      createdAt: "2026-10-19T12:00:00.000Z",
      body: "✉ OL Oct 19 4:00 PM — Mexico quote · Chris Alvarez → Antaeus Coe\nCan you send the Mexico quote?",
      actors: "Chris Alvarez → Antaeus Coe",
    });
    const reply = note({
      id: "o1",
      body: "✉ OL Oct 20 10:00 AM — Mexico quote · Antaeus Coe → Chris\nHere is the quote.",
      actors: "Antaeus Coe → Chris",
      recipients: "Chris",
    });
    const home = ["Lesha Cyphers", "Chris Taylor"];
    const docs = docsFor([ask, reply]);
    assert.equal(latestEmail({ notes: [ask, reply], docs, homeSide: home })?.id, "o1");
    const l = recordLines({
      notes: [ask, reply],
      docs,
      todos: [],
      homeSide: home,
      limit: 6,
    });
    assert.equal(l.find((x) => x.id === "i1")?.email?.answered, "10/20");
  });

  test("a to-do done before the promise was made never closes it", () => {
    const ask = note({
      id: "c1",
      filingId: "f2",
      createdAt: "2026-10-15T12:00:00.000Z",
      body: "✉ OL Oct 15 9:38 AM — Canada hires · Dana Reyes → Antaeus Coe\nAsks again. Owed: send pricing — @Antaeus Coe.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const september = {
      id: "t1",
      body: withTags("Send pricing", {
        ...NO_TAGS,
        kind: "action",
        doneAt: String(Date.parse("2026-09-10T15:00:00Z")),
      }),
      done: true,
      createdAt: "2026-09-08T15:00:00Z",
      filingId: "f1",
    };
    assert.equal(lines([ask], [september])[0].email?.owed[0]?.closed, "");
  });
});

describe("the round-8 review: notices in their own words, lists in the body, and promises repeated", () => {
  test("a disclaimer phrased off the list goes; a notice with a question or a sign-off of the person's own stays", () => {
    const body = "Hi Antaeus,\n\nThursday works for the demo.\n\nThanks,\nDana";
    for (const d of [
      "This message contains confidential information and is intended only for the individual named. If you are not the named addressee you should not disseminate, distribute or copy this e-mail.",
      "DISCLAIMER: This email and its attachments may be confidential and are intended solely for the addressee.",
      "Confidentiality Note: This e-mail is intended only for the person or entity to which it is addressed and may contain confidential material.",
    ])
      assert.equal(cleanEmailWhole(`${body}\n\n${d}`), body, d);
    for (const keep of [
      "Hi Antaeus,\n\nAttached is the census.\n\nThis email and any attachments are confidential because the census lists national IDs.\nCan you keep it inside your team?\n\nDana",
      "Hi Antaeus,\n\nAttached is the census.\n\nConfidentiality notice: it lists their national IDs, so please keep it inside your team.\n\nTalk Thursday,\nDana",
      "Hi Antaeus,\n\nRelocating:\n\nFrom: San Juan\nTo: Mexico City\nDate: January 4, 2027\n\nCan you tell us what EOR would need?\n\nThanks,\nDana",
    ])
      assert.equal(cleanEmailWhole(keep), keep);
  });

  test("a first-name address is its owner's, so the Act Lane stub gives way and +N stays quiet", () => {
    const stub = note({
      id: "stub",
      createdAt: "2026-10-20T15:00:40.000Z",
      body: "✉ Census template — sent to Dana Reyes.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
      source: "act-lane",
    });
    const copy = note({
      id: "copy",
      body: "✉ OL Oct 20 10:00 AM — Census template · Antaeus Coe → dana@regis.example\nSends the template.",
      actors: "Antaeus Coe → dana@regis.example",
      recipients: "dana@regis.example",
    });
    assert.equal(latest([stub, copy])?.id, "copy");
    const named = note({
      ...copy,
      id: "copy2",
      filingId: "fc",
      body: "✉ OL Oct 20 10:00 AM — Census template · Antaeus Coe → Dana Reyes\nSends the template.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
    });
    assert.ok(
      lines([stub, named]).every((x) => !x.email?.twice),
      "a stub is never a twin",
    );
  });

  test("a promise repeated while its to-do is open closes with that to-do, never a later one", () => {
    const ask = (id: string, filingId: string, day: string, md: string) =>
      note({
        id,
        filingId,
        createdAt: `${day}T12:00:00.000Z`,
        body: `✉ OL ${md} 9:00 AM — Census · Dana Reyes → Antaeus Coe\nAsks for the file. Owed: send the census file — @Antaeus Coe.`,
        actors: "Dana Reyes → Antaeus Coe",
      });
    const repeat = ask("a", "fa", "2026-09-05", "Sep 5");
    const t0 = {
      id: "t0",
      body: withTags("Send the census file", {
        ...NO_TAGS,
        kind: "action",
        doneAt: String(Date.parse("2026-09-07T15:00:00Z")),
      }),
      done: true,
      createdAt: "2026-09-01T17:00:00Z",
      filingId: "fz",
    };
    const t2 = {
      id: "t2",
      body: "Send the census file",
      done: false,
      createdAt: "2026-10-12T17:00:00Z",
      filingId: "fc",
    };
    assert.equal(lines([repeat], [t0, t2])[0].email?.owed[0]?.closed, "Done 9/7.");
  });
});

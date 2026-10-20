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
    assert.deepEqual(
      wholeEmails(raw, [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "Pricing for Mexico",
          dayIso: "2026-10-20",
        },
      ]),
      [null],
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

describe("the strict money rule takes every form the review wrote prices in", () => {
  const gone: [string, string][] = [
    ["599-649 PEPM", "[—]-[—]"],
    ["$599-649", "[—]-[—]"],
    ["PEPM: 549", "PEPM: [—]"],
    ["3.200 € gross", "[—] gross"],
    ["45000 MXN a month", "[—] a month"],
    ["Rs. 50000", "[—]"],
    ["650 bucks a head", "[—] a head"],
    ["twelve hundred dollars a month", "[—] a month"],
    ["EOR 599 / contractor 49", "EOR [—] / contractor [—]"],
    ["Your EOR fee of 499 euros per employee", "Your EOR fee of [—] per employee"],
    ["the one-time setup fee is 1500.", "the one-time setup fee is [—]."],
  ];
  for (const [raw, want] of gone)
    test(raw, () => assert.equal(redactMoneyStrict(raw), want));
  test("a headcount, a 401k, a clock and a phone stay", () => {
    for (const keep of [
      "a total of 12 employees",
      "their 401k plan",
      "at 3:30 on 10/20",
      "312 555 0199",
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

  test("a day with no clock answers nothing on its own day", () => {
    const sent = note({
      id: "a1",
      body: "✉ Reseller agreement — sent to Dana Reyes.",
      actors: "Antaeus Coe → Dana Reyes",
      recipients: "Dana Reyes",
      source: "act-lane",
      createdAt: "2026-10-19T15:00:00.000Z",
    });
    const reply = note({
      id: "r1",
      createdAt: "2026-10-19T12:00:00.000Z",
      body: "✉ SF Oct 19 — RE: Reseller agreement · Dana Reyes → Antaeus Coe\nGot it.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const byId = new Map(lines([sent, reply]).map((x) => [x.id, x]));
    assert.equal(byId.get("r1")?.email?.answered, "");
    assert.equal(
      latest([sent, reply])?.logged,
      true,
      "an Act Lane send says it was logged",
    );
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
  });

  test("✎ starts from what is stored, and a typed note renders as written", () => {
    const typed = note({
      id: "t1",
      createdAt: "2026-10-20T15:00:00.000Z",
      body: "✎ Plans to hire 5 a month in Brazil",
      source: "room",
    });
    const l = lines([typed, IN]);
    const t1 = l.find((x) => x.id === "t1")!;
    assert.equal(t1.line, "Plans to hire 5 a month in Brazil");
    assert.equal(t1.edit, "Plans to hire 5 a month in Brazil");
    const e6 = l.find((x) => x.id === "e6")!;
    assert.equal(
      e6.edit,
      "RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant",
    );
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

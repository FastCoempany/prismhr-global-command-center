// The email in the HomeRoom row (ship order 2026-10-20; CLAUDE.md, The email
// in the row; docs/mockups/homeroom-email-row-2026-10-20.html, Concept A).
// Pinned here: the capture splits into its messages and each email entry
// keeps its own message's words, cleaned and whole; the store redacts money
// and fails open; the filing keeps the whole emails from the whole capture
// and the undo takes them back; the row's latest email reads past sign-offs
// and machinery; and EARLIER's lines read who, when and the subject, opening
// to the read's synopsis, its Owed lines, the answer and the twin.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { cleanEmailWhole } from "../src/lib/activity/excerpt";
import { emailMessages, threadSubject, wholeEmails } from "../src/lib/intel/email-whole";
import {
  dropEmailTexts,
  emailTextsFor,
  keepEmailTexts,
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
    const [newest, older] = wholeEmails(
      RELAY,
      [
        {
          kind: "email",
          from: "Dana Reyes",
          subject: "RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant",
          dayIso: "2026-10-20",
          timeLabel: "9:10 AM",
        },
        {
          kind: "email",
          from: "Antaeus Coe",
          subject: "Re: Intro to your Global Business Consultant",
          dayIso: "2026-10-16",
        },
      ],
      { outlook: true },
    );
    assert.equal(
      newest,
      "Hi Antaeus,\n\nWe'd like to go with the reseller model.\n\nCan you send the reseller agreement over so our legal team can start their review?\n\nThanks,\nDana",
    );
    assert.equal(older, "Hi Dana,\n\nHere is the order I'd suggest.\n\nBest,\nAntaeus");
  });

  test("no sure message keeps no whole text, and a call or task entry never does", () => {
    const r = wholeEmails(
      RELAY,
      [
        {
          kind: "email",
          from: "Somebody Else",
          subject: "Intro to your Global Business Consultant",
        },
        {
          kind: "call",
          from: "Dana Reyes",
          subject: "Intro to your Global Business Consultant",
        },
      ],
      { outlook: true },
    );
    assert.deepEqual(r, [null, null]);
  });

  test("a tie breaks on the day, then the clock, never on a guess", () => {
    const two = `From: Dana Reyes <dana@regis.example>
Sent: Wednesday, October 15, 2026 9:38 AM
To: Antaeus Coe <antaeus.coe@prismhr.com>
Subject: Re: Demo

Second note.

From: Dana Reyes <dana@regis.example>
Sent: Tuesday, October 14, 2026 4:02 PM
To: Antaeus Coe <antaeus.coe@prismhr.com>
Subject: Demo

First note.`;
    const r = wholeEmails(
      two,
      [{ kind: "email", from: "Dana Reyes", subject: "Demo", dayIso: "2026-10-14" }],
      { outlook: true },
    );
    assert.deepEqual(r, ["First note."]);
  });

  test("an Outlook capture with no header and one email entry is that email", () => {
    const r = wholeEmails(
      "OUTLOOK THREAD — pasted\n\nHi there,\n\nSounds right to me.\n\nDana",
      [{ kind: "email", from: "Dana Reyes", subject: "Demo" }],
      { outlook: true },
    );
    assert.deepEqual(r, ["Hi there,\n\nSounds right to me.\n\nDana"]);
    assert.deepEqual(
      wholeEmails("Hi there,\n\nSounds right.", [{ kind: "email", from: "Dana" }], {
        outlook: false,
      }),
      [null],
      "a Salesforce timeline is never read as one email",
    );
  });

  test("the cleaner keeps paragraphs and cuts every trail a client sets", () => {
    assert.equal(
      cleanEmailWhole(
        "Yes, Thursday works.\n\nOn Mon, Oct 20, 2026 at 9:10 AM Dana Reyes <d@x.com> wrote:\n> earlier",
      ),
      "Yes, Thursday works.",
    );
    assert.equal(
      cleanEmailWhole("Sounds good.\n\n-----Original Message-----\nFrom: Dana"),
      "Sounds good.",
    );
    assert.equal(
      cleanEmailWhole(
        "CAUTION: This email originated from outside of the organization.\nHello.\n\nSent from my iPhone",
      ),
      "Hello.",
    );
    assert.equal(
      cleanEmailWhole(
        "Here it is.\n\nThanks,\nDana\n\nP.S. The second client wants to talk too, maybe next week once their board meets and settles the budget question.",
      ),
      "Here it is.\n\nThanks,\nDana\n\nP.S. The second client wants to talk too, maybe next week once their board meets and settles the budget question.",
      "a P.S. is the person's words, never a card",
    );
    assert.equal(cleanEmailWhole("From: Dana\nSent: today\nTo: you\nSubject: x"), "");
  });

  test("a subject as a thread knows it", () => {
    assert.equal(
      threadSubject("RE: ❗ Re: [EXTERNAL] Re: Intro to your Global Business Consultant"),
      "intro to your global business consultant",
    );
    assert.equal(cleanSubject("Re: ❗ Re: [EXTERNAL] FW: Canada"), "Canada");
    assert.equal(cleanSubject("RE: "), "(no subject)");
  });
});

describe("the store: redacted on the way in, failing open", () => {
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

  test("money never reaches the table, and an empty text keeps nothing", async () => {
    const { db, rows } = stub();
    const n = await keepEmailTexts(
      [
        {
          noteId: "n1",
          accountId: "a1",
          filingId: "f1",
          text: "The fee is $4,500 a month.",
        },
        { noteId: "n2", accountId: "a1", text: "   " },
      ],
      db,
    );
    assert.equal(n, 1);
    assert.equal(rows.length, 1);
    assert.ok(!/4,500|\$/.test(rows[0].text), rows[0].text);
    assert.equal((await emailTextsFor(["n1", "n9"], db)).size, 1);
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

  test("read from the whole capture, never the read's window, after the notes", () => {
    assert.match(core, /wholeEmails\(rawText, filedEntries/);
    assert.match(core, /if \(kept\.length\) await keepEmailTexts\(kept\);/);
    assert.ok(
      core.indexOf("keepEmailTexts(kept)") > core.indexOf("noteIds.push(n.id);"),
      "the store writes once the notes exist",
    );
  });

  test("the undo drops them by the filing's notes and its row", () => {
    assert.match(
      actions,
      /dropEmailTexts\(\{ accountId: acct\.id, noteIds: ids, filingId: filing \}\)/,
    );
  });
});

// ── the row ────────────────────────────────────────────────────────────────

const HOME = ["Lesha Cyphers"];
const note = (over: Partial<RowNote> & { id: string; body: string }): RowNote => ({
  createdAt: "2026-10-20T12:00:00.000Z",
  actors: "",
  recipients: "",
  source: "outlook-ai",
  ...over,
});
const docsFor = (notes: RowNote[]) =>
  notes.map((n) =>
    docOf(
      { ...n, kind: "account", lane: "mine", recipients: n.recipients ?? "" },
      HOME,
      new Set(),
    ),
  );

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
  createdAt: "2026-10-20T12:00:00.000Z",
  body: "✉ OL Today 3:40 PM — RE: Intro to your Global Business Consultant · Dana Reyes → Antaeus Coe\nThanks!",
  actors: "Dana Reyes → Antaeus Coe",
});
const ACCEPTED = note({
  id: "e9",
  createdAt: "2026-10-20T12:00:00.000Z",
  body: "✉ OL Today 4:00 PM — Accepted: Demo · Dana Reyes → Antaeus Coe",
  actors: "Dana Reyes → Antaeus Coe",
});
const WORKED = note({
  id: "n1",
  createdAt: "2026-10-16T16:03:00.000Z",
  body: "✓ Worked the move · Answer Dana\nMarked done from the HomeRoom.",
  source: "room",
});

describe("the row's latest email and its EARLIER lines", () => {
  test("the day and the clock a person reads: the head's clock, never the noon anchor's", () => {
    assert.deepEqual(whenOf(IN.createdAt, IN.body), { day: "10/20", time: "9:10 AM" });
    assert.deepEqual(
      whenOf("2026-10-01T12:00:00.000Z", "✉ OL Oct 1 — Re: Canada · Tom → Antaeus Coe"),
      { day: "10/1", time: "" },
    );
    assert.deepEqual(whenOf(WORKED.createdAt, WORKED.body), {
      day: "10/16",
      time: "11:03 AM",
    });
  });

  test("the latest email reads past a sign-off and an acceptance, either direction", () => {
    const notes = [THANKS, ACCEPTED, IN, OUT];
    const l = latestEmail({ notes, docs: docsFor(notes) });
    assert.ok(l);
    assert.equal(l.id, "e6");
    assert.equal(l.from, "Dana Reyes");
    assert.equal(l.to, "you");
    assert.deepEqual(l.others, ["Elise Munoz", "Sam Ortiz"]);
    assert.equal(l.subject, "Intro to your Global Business Consultant");
    assert.equal(l.kept, "They chose the reseller model.");
    assert.equal(l.time, "9:10 AM");
    const out = latestEmail({ notes: [OUT, ASKED], docs: docsFor([OUT, ASKED]) });
    assert.equal(out?.id, "e5", "our own send is an email too");
    assert.equal(out?.from, "you");
    assert.equal(latestEmail({ notes: [WORKED], docs: docsFor([WORKED]) }), null);
  });

  test("EARLIER reads who, when and the subject, in the order the record happened", () => {
    const notes = [WORKED, IN, ASKED, OUT, TWIN, THANKS];
    const lines = recordLines({ notes, docs: docsFor(notes), todos: [], limit: 6 });
    assert.deepEqual(
      lines.map((l) => l.id),
      ["e8", "e6", "n1", "e5", "e3", "e2"],
    );
    const e6 = lines.find((l) => l.id === "e6")!;
    assert.equal(e6.line, "Intro to your Global Business Consultant");
    assert.ok(!/OL|Today|RE:|EXTERNAL/.test(`${e6.line} ${e6.day} ${e6.time}`));
    assert.deepEqual(e6.email?.owed, [
      { mine: true, who: "Antaeus Coe", text: "send the reseller agreement", closed: "" },
    ]);
    const n1 = lines.find((l) => l.id === "n1")!;
    assert.equal(n1.email, null);
    assert.equal(n1.line, "Worked the move · Answer Dana");
    assert.equal(n1.body, "Marked done from the HomeRoom.");
    assert.ok(n1.struck);
  });

  test("an afternoon email sorts above a morning stamp of the same day", () => {
    const LATE = note({
      id: "e7",
      createdAt: "2026-10-16T12:00:00.000Z",
      body: "✉ OL Oct 16 3:00 PM — Re: Demo · Dana Reyes → Antaeus Coe\nWorks for us.",
      actors: "Dana Reyes → Antaeus Coe",
    });
    const notes = [WORKED, LATE];
    const lines = recordLines({ notes, docs: docsFor(notes), todos: [], limit: 6 });
    assert.deepEqual(
      lines.map((l) => l.id),
      ["e7", "n1"],
      "3:00 PM Chicago is after the 11:03 AM stamp, whatever the noon anchor says",
    );
  });

  test("an answered ask closes, a twin says so, a sign-off is a sign-off", () => {
    const notes = [IN, ASKED, OUT, TWIN, THANKS];
    const lines = recordLines({ notes, docs: docsFor(notes), todos: [], limit: 6 });
    const byId = new Map(lines.map((l) => [l.id, l]));
    assert.equal(byId.get("e3")?.email?.answered, "10/16");
    assert.equal(byId.get("e6")?.email?.answered, "", "nothing of ours came after it");
    assert.equal(byId.get("e3")?.email?.twice, false, "the first copy leads");
    assert.equal(byId.get("e2")?.email?.twice, true);
    assert.equal(byId.get("e8")?.email?.closer, true);
  });

  test("an Owed line closes only when every to-do its filing opened is done", () => {
    const notes = [IN];
    const open = recordLines({
      notes,
      docs: docsFor(notes),
      todos: [
        { id: "t1", body: "Send the reseller agreement", done: false, filingId: "f6" },
      ],
      limit: 6,
    });
    assert.equal(open[0].email?.owed[0].closed, "");
    const done = recordLines({
      notes,
      docs: docsFor(notes),
      todos: [
        {
          id: "t1",
          body: "Send the reseller agreement",
          done: true,
          filingId: "f6",
          updatedAt: "2026-10-21T15:00:00.000Z",
        },
      ],
      limit: 6,
    });
    assert.equal(done[0].email?.owed[0].closed, "Done 10/21.");
  });

  test("✎ edits the subject in its slot, and the head keeps its grammar", () => {
    assert.equal(
      withSubject(IN.body.split("\n")[0], "Reseller agreement"),
      "✉ OL Today 9:10 AM — Reseller agreement · Dana Reyes → Antaeus Coe +2",
    );
    assert.equal(withSubject("✓ Worked the move", "Worked it"), "Worked it");
  });
});

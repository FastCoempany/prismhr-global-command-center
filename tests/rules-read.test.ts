// The rules reader (founder-decreed 2026-08-21): a pasted Teams chat or
// Outlook thread parses deterministically when the deep read is down — real
// actors, real dates, real record lines. These fixtures include the exact
// paste that exposed the gap (the Lesha/Simploy Teams chat that filed as a
// mute "☰ transcript" line while the key was dead) and every input the
// adversarial pass refuted on 2026-08-22.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { parseChatPaste, parseEmailPaste, rulesRead } from "../src/lib/intel/rules-read";
import { inferActors } from "../src/lib/intel/provenance";

const NOW = new Date("2026-08-21T20:00:00Z"); // 3:00 PM Chicago

const LESHA_CHAT = `Lesha Cyphers 1:49 PM
Hey. I just talked to Chassie at Simploy. She said they have a client that has an employee in Canada they are paying as an independent contractor.
1:50 PM
fantastic to hear. I'll reach out to her right now
Lesha Cyphers 1:51 PM
Perfect. She is expecting your call.`;

describe("the Teams-chat rules read", () => {
  test("the Lesha chat parses to turns; named turns carry real actors", () => {
    const entries = parseChatPaste(LESHA_CHAT, NOW);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].from, "Lesha Cyphers");
    assert.match(entries[0].body, /Chassie at Simploy/);
    assert.equal(entries[2].from, "Lesha Cyphers");
    assert.equal(entries[0].timeLabel, "1:49 PM");
  });

  test("a bare stamp files UNATTRIBUTED — never fabricated as the operator", () => {
    // Teams renders the same bare stamp for the copier's own turns AND a
    // speaker's grouped follow-on messages; the Ted doctrine forbids
    // guessing. Unattributed is never inbound and never outbound.
    const entries = parseChatPaste(LESHA_CHAT, NOW);
    assert.equal(entries[1].from, "");
    assert.match(entries[1].body, /fantastic to hear/);
  });

  test("a grouped follow-on message never becomes the operator's outbound", () => {
    const entries = parseChatPaste(
      `Lesha Cyphers 1:49 PM\nHey, quick one on Simploy.\n1:50 PM\nShe is expecting your call today.`,
      NOW,
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[1].from, "");
  });

  test("a clock alone inside a message never fabricates an actor", () => {
    const entries = parseChatPaste(
      `Lesha Cyphers 1:49 PM\nCan you do\n3:00 PM\ntomorrow with Chassie?`,
      NOW,
    );
    assert.ok(entries.every((e) => e.from === "" || e.from === "Lesha Cyphers"));
    assert.ok(!entries.some((e) => /Antaeus/.test(e.from)));
  });

  test("a Yesterday divider dates the turns before Today", () => {
    const entries = parseChatPaste(
      `Yesterday\nLesha Cyphers 9:00 AM\nMorning note.\nToday\nLesha Cyphers 1:50 PM\nGot it.`,
      NOW,
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[0].dayIso, "2026-08-20");
    assert.equal(entries[1].dayIso, "2026-08-21");
  });

  test("a dated divider resolves — a week-old chat never files as today", () => {
    const entries = parseChatPaste(
      `August 14\nLesha Cyphers 9:00 AM\nOld note.\nLesha Cyphers 9:05 AM\nStill old.`,
      NOW,
    );
    assert.equal(entries[0].dayIso, "2026-08-14");
    assert.equal(entries[1].dayIso, "2026-08-14");
  });

  test("agenda lines and hover stamps never become speakers", () => {
    const agenda = parseChatPaste(
      `Meeting Tomorrow 3:00 PM\nbring the Canada model\nLesha Cyphers 1:50 PM\nwill do`,
      NOW,
    );
    assert.ok(!agenda.some((e) => e.from === "Meeting Tomorrow"));
    const hover = parseChatPaste(
      `Lesha Cyphers Yesterday 1:49 PM\nHey there.\nLesha Cyphers Yesterday 1:51 PM\nOne more thing.`,
      NOW,
    );
    assert.equal(hover.length, 2);
    assert.equal(hover[0].from, "Lesha Cyphers");
    assert.equal(hover[0].dayIso, "2026-08-20");
  });

  test("lowercase particles survive the name guard", () => {
    const entries = parseChatPaste(
      `Lesha van Dyk 1:49 PM\nHey there.\nLesha van Dyk 1:51 PM\nStill me.`,
      NOW,
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[0].from, "Lesha van Dyk");
  });

  test("prose with a clock inside a sentence never becomes a speaker", () => {
    const entries = parseChatPaste(
      `we said 3:00 PM\nthat works for everyone\nand we agreed 4:00 PM\nfine by me`,
      NOW,
    );
    assert.equal(entries.length, 0);
  });

  test("one stray stamp is not a conversation", () => {
    assert.equal(parseChatPaste(`Lesha Cyphers 1:49 PM\nHey there.`, NOW).length, 0);
  });

  test("all-bare stamps with no named speaker parse to nothing", () => {
    assert.equal(
      parseChatPaste(`1:49 PM\nfirst line\n1:50 PM\nsecond line`, NOW).length,
      0,
    );
  });

  test("plain prose parses to nothing", () => {
    const entries = parseChatPaste(
      `Simploy has a client with contractors in Canada.\nThe CSM wants a model by Friday.`,
      NOW,
    );
    assert.equal(entries.length, 0);
  });

  test("a body line ending in a clock never shifts the chat's day", () => {
    const entries = parseChatPaste(
      `Lesha Cyphers 1:49 PM\nLet's lock Yesterday 4:30 PM\nLesha Cyphers 1:51 PM\nWorks for me.`,
      NOW,
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[0].dayIso, "2026-08-21");
    assert.equal(entries[1].dayIso, "2026-08-21");
    assert.match(entries[0].body, /Let's lock Yesterday 4:30 PM/);
  });

  test("the (unattributed) head label never resurrects as a sender", () => {
    // The filing loop writes "· (unattributed)" into the head when actors
    // are empty; inferActors must refuse it or the placeholder becomes a
    // phantom third party that warms accounts and registers inbound.
    assert.equal(
      inferActors("✉ TM Today 1:50 PM — fantastic to hear · (unattributed)\nbody"),
      "",
    );
    assert.equal(
      inferActors("✉ TM Today 1:49 PM — Hey there · Lesha Cyphers → Antaeus Coe\nbody"),
      "Lesha Cyphers → Antaeus Coe",
    );
  });
});

describe("the Outlook-thread rules read", () => {
  const THREAD = `From: Chassie Miller <chassie@simploy.com>
Sent: Thursday, August 20, 2026 10:12 AM
To: Antaeus Coe <acoe@prismhr.com>
Subject: Canada contractor question

Lesha said you could help with a client paying a Canadian as a contractor.

From: Antaeus Coe
Sent: Thursday, August 20, 2026 11:03 AM
To: Chassie Miller
Subject: RE: Canada contractor question

Happy to walk through the EOR path. Does Friday work?`;

  test("header blocks parse to one entry each with real actors and dates", () => {
    const entries = parseEmailPaste(THREAD);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].from, "Chassie Miller");
    assert.equal(entries[0].to, "Antaeus Coe");
    assert.equal(entries[0].subject, "Canada contractor question");
    assert.equal(entries[0].dayIso, "2026-08-20");
    assert.match(entries[1].body, /EOR path/);
  });

  test("a 12:30 AM send keeps its own day — no timezone slide", () => {
    const entries = parseEmailPaste(
      `From: Chassie Miller\nSent: Thursday, August 20, 2026 12:30 AM\nTo: Antaeus Coe\nSubject: Late one\n\nQuick question.`,
    );
    assert.equal(entries[0].dayIso, "2026-08-20");
  });

  test("a block without From and Subject is skipped", () => {
    assert.equal(parseEmailPaste("From: someone\n\njust a line").length, 0);
  });

  test("rulesRead doors: emails first, then chat, else null", () => {
    assert.equal(rulesRead(THREAD, NOW)?.dialect, "OL");
    assert.equal(rulesRead(LESHA_CHAT, NOW)?.dialect, "TM");
    assert.equal(rulesRead("nothing shaped like a thread here", NOW), null);
  });

  test("a TM hint reads the chat first — a quoted email never swallows it", () => {
    const chatWithQuote = `Lesha Cyphers 1:49 PM
Forwarding what Chassie sent:
From: Chassie Miller
Sent: Thursday, August 20, 2026 10:12 AM
To: Lesha Cyphers
Subject: Canada question
Can PrismHR handle a Canadian contractor?
Lesha Cyphers 1:51 PM
Can you take it from here?`;
    const got = rulesRead(chatWithQuote, NOW, "TM");
    assert.equal(got?.dialect, "TM");
    assert.ok(got && got.entries.length >= 2);
    // Without the hint the email block wins — the door order is the fix.
    assert.equal(rulesRead(chatWithQuote, NOW)?.dialect, "OL");
  });
});

// The rules reader (founder-decreed 2026-08-21): a pasted Teams chat or
// Outlook thread parses deterministically when the deep read is down — real
// actors, real dates, real record lines. These fixtures include the exact
// paste that exposed the gap (the Lesha/Simploy Teams chat that filed as a
// mute "☰ transcript" line while the key was dead).

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { parseChatPaste, parseEmailPaste, rulesRead } from "../src/lib/intel/rules-read";

const NOW = new Date("2026-08-21T20:00:00Z"); // 3:00 PM Chicago

const LESHA_CHAT = `Lesha Cyphers 1:49 PM
Hey. I just talked to Chassie at Simploy. She said they have a client that has an employee in Canada they are paying as an independent contractor.
1:50 PM
fantastic to hear. I'll reach out to her right now
Lesha Cyphers 1:51 PM
Perfect. She is expecting your call.`;

describe("the Teams-chat rules read", () => {
  test("the Lesha chat parses to speaker turns with real actors", () => {
    const entries = parseChatPaste(LESHA_CHAT, NOW);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].from, "Lesha Cyphers");
    assert.equal(entries[0].to, "Antaeus Coe");
    assert.match(entries[0].body, /Chassie at Simploy/);
    assert.equal(entries[1].from, "Antaeus Coe");
    assert.equal(entries[1].to, "Lesha Cyphers");
    assert.equal(entries[2].from, "Lesha Cyphers");
    assert.equal(entries[0].timeLabel, "1:49 PM");
  });

  test("a Yesterday divider dates the turns before Today", () => {
    const entries = parseChatPaste(
      `Yesterday\nLesha Cyphers 9:00 AM\nMorning note.\nToday\n1:50 PM\nGot it.`,
      NOW,
    );
    assert.equal(entries.length, 2);
    assert.equal(entries[0].dayIso, "2026-08-20");
    assert.equal(entries[1].dayIso, "2026-08-21");
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

  test("plain prose parses to nothing", () => {
    const entries = parseChatPaste(
      `Simploy has a client with contractors in Canada.\nThe CSM wants a model by Friday.`,
      NOW,
    );
    assert.equal(entries.length, 0);
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

  test("a block without From and Subject is skipped", () => {
    assert.equal(parseEmailPaste("From: someone\n\njust a line").length, 0);
  });

  test("rulesRead doors: emails first, then chat, else null", () => {
    assert.equal(rulesRead(THREAD, NOW)?.dialect, "OL");
    assert.equal(rulesRead(LESHA_CHAT, NOW)?.dialect, "TM");
    assert.equal(rulesRead("nothing shaped like a thread here", NOW), null);
  });
});

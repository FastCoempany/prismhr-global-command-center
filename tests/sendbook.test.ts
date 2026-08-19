// The Sendbook's grammar — the merged outreach register (decreed 2026-08-19).
// The decrees under test: the record's sends and the Channel Ask's taps merge
// into one view; steps are counted per run, reset by a long quiet or by the
// account speaking; NEVER MET means no reply ever and no meeting ever held —
// the operator's own outbound never warms an account; replies annotate from
// the record only.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSendbook,
  clauseFromHead,
  inboundDates,
  parseSendbookBody,
  recordSends,
  sendbookNoteBody,
  shortName,
  warmDates,
  weekStats,
} from "../src/lib/sendbook/read";

const out = (createdAt: string, subject = "Re: Global") => ({
  body: `✉ OL Aug 1 — ${subject} · Antaeus Coe → Bill Laffey +4\nbody text`,
  source: "outlook-ai",
  createdAt,
  actors: "Antaeus Coe → Bill Laffey +4",
});
const inb = (createdAt: string) => ({
  body: `✉ OL Aug 2 — Re: Global · Bill Laffey → Antaeus Coe\nthanks`,
  source: "outlook-ai",
  createdAt,
  actors: "Bill Laffey → Antaeus Coe",
});
const meeting = (createdAt: string) => ({
  body: "☰ Call transcript — demo.vtt · 8 voices\nCALL TRANSCRIPT\nA: hi\nB: hey",
  source: "call-ai",
  createdAt,
  actors: "Antaeus Coe → Bill Laffey",
});
const tap = (createdAt: string, channel = "LINKEDIN", contact = "", clause = "") => ({
  body: sendbookNoteBody(channel as never, contact, clause),
  source: "sendbook",
  createdAt,
});

test("the tap body round-trips channel, contact, and clause", () => {
  const p = parseSendbookBody(
    sendbookNoteBody("LINKEDIN", "Cristina Bouchard", "Send the introduction."),
  );
  assert.equal(p?.channel, "LINKEDIN");
  assert.equal(p?.contact, "Cristina Bouchard");
  assert.equal(p?.clause, "Send the introduction.");
});

test("an unknown channel never parses into the register", () => {
  assert.equal(parseSendbookBody("⌁ SEND CARRIER PIGEON · Bob"), null);
  assert.equal(parseSendbookBody("random text"), null);
});

test("the record's sends are the operator's non-meeting glyph entries", () => {
  const sends = recordSends([
    out("2026-08-17T18:00:00.000Z"),
    inb("2026-08-18T12:00:00.000Z"),
    meeting("2026-08-13T15:00:00.000Z"),
    { body: "plain typed note", source: "note", createdAt: "2026-08-16T00:00:00.000Z" },
  ]);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].at, "2026-08-17T18:00:00.000Z");
});

test("machinery and unattributed entries are never inbound", () => {
  const auto = {
    body: "✉ OL Aug 2 — Automatic reply: out of office · Bill Laffey → Antaeus Coe",
    source: "outlook-ai",
    createdAt: "2026-08-02T00:00:00.000Z",
    actors: "Bill Laffey → Antaeus Coe",
  };
  const unattributed = {
    body: "✔ SF Jul 1 — logged export",
    source: "sf",
    createdAt: "2026-07-01T00:00:00.000Z",
    actors: "",
  };
  assert.equal(inboundDates([auto, unattributed]).length, 0);
  // A meeting warms the lane without being "they wrote back".
  const w = warmDates([meeting("2026-08-13T15:00:00.000Z"), auto, unattributed]);
  assert.equal(w.length, 1);
});

test("steps count within a run and a 45-day quiet resets the drum", () => {
  const { lines } = buildSendbook({
    notesById: new Map(),
    tapsById: new Map([
      [
        "A1",
        [
          tap("2026-08-19T15:00:00.000Z"),
          tap("2026-08-12T15:00:00.000Z"),
          tap("2026-05-01T15:00:00.000Z"),
        ],
      ],
    ]),
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const byAt = new Map(lines.map((l) => [l.at, l.step]));
  assert.equal(byAt.get("2026-05-01T15:00:00.000Z"), 1);
  assert.equal(byAt.get("2026-08-12T15:00:00.000Z"), 1); // fresh run after the gap
  assert.equal(byAt.get("2026-08-19T15:00:00.000Z"), 2);
});

test("the account speaking resets the drum; the reply annotates the send", () => {
  const { lines, laneById } = buildSendbook({
    notesById: new Map([
      ["A1", [out("2026-08-01T12:00:00.000Z"), inb("2026-08-05T12:00:00.000Z")]],
    ]),
    tapsById: new Map([["A1", [tap("2026-08-10T12:00:00.000Z")]]]),
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  assert.equal(laneById.get("A1"), "gone-cold");
  const first = lines.find((l) => l.at === "2026-08-01T12:00:00.000Z");
  const second = lines.find((l) => l.at === "2026-08-10T12:00:00.000Z");
  assert.equal(first?.step, 1);
  assert.equal(first?.repliedAt, "2026-08-05T12:00:00.000Z");
  assert.equal(second?.step, 1); // they spoke between — a new run
  assert.equal(second?.repliedAt, "");
});

test("outbound alone never warms: ten sends to silence is still NEVER MET", () => {
  const { laneById } = buildSendbook({
    notesById: new Map([["A1", [out("2026-08-01T12:00:00.000Z")]]]),
    tapsById: new Map(),
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  assert.equal(laneById.get("A1"), "never-met");
});

test("a tapped EMAIL folds into the record's same-day send", () => {
  const { lines } = buildSendbook({
    notesById: new Map([["A1", [out("2026-08-19T16:00:00.000Z")]]]),
    tapsById: new Map([["A1", [tap("2026-08-19T15:00:00.000Z", "EMAIL")]]]),
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].from, "record");
});

test("the week head counts touches, channels, accounts, and replies", () => {
  const book = buildSendbook({
    notesById: new Map([["A2", [out("2026-08-18T12:00:00.000Z")]]]),
    tapsById: new Map([["A1", [tap("2026-08-19T15:00:00.000Z")]]]),
    now: new Date("2026-08-19T18:00:00.000Z"),
  });
  const w = weekStats(book, new Date("2026-08-19T18:00:00.000Z"));
  assert.equal(w.total, 2);
  assert.equal(w.accounts, 2);
  assert.deepEqual(w.byChannel.map(([c]) => c).sort(), ["EMAIL", "LINKEDIN"]);
});

test("the record head cleans into a short clause", () => {
  assert.equal(
    clauseFromHead(
      "✉ OL Aug 17 1:33 PM — Re: Prism Global payroll demo · Antaeus Coe → Bill Laffey +4",
    ),
    "Re: Prism Global payroll demo",
  );
});

test("the wing's short name keeps the first name and last initial", () => {
  assert.equal(shortName("Cristina Bouchard"), "CRISTINA B.");
  assert.equal(shortName("Cher"), "CHER");
  assert.equal(shortName(""), "");
});

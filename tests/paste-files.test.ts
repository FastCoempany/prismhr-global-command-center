// The Drop's readers, proven: an .eml becomes an OUTLOOK THREAD capture the
// dialect detector keys on; the sniffer names what the box is holding; the
// dispatcher sends each file type to the right reader.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sniffPaste,
  parseEml,
  emlToPaste,
  msgToPaste,
  htmlToText,
  parseTranscriptDoc,
  parseVtt,
  recordedAtFromName,
  transcriptRecordedDay,
  pasteFingerprint,
  transcriptDocToPaste,
  readerFor,
  vttToPaste,
} from "../src/lib/paste-files";

// ── sniffPaste ──────────────────────────────────────────────────────────────

test("sniffer names the head-token dialects", () => {
  assert.equal(sniffPaste("OUTLOOK THREAD — Simploy renewal\nFrom: x").kind, "outlook");
  assert.equal(sniffPaste("TEAMS THREAD with Aleks\n[9:02] hi").kind, "teams");
  assert.equal(sniffPaste("SALESNAV\nJane Doe · VP HR").kind, "salesnav");
});

test("sniffer reads bare email headers as an email thread", () => {
  const t = "From: Dana <dana@x.com>\nSent: Mon\nSubject: renewal\n\nbody here";
  const s = sniffPaste(t);
  assert.equal(s.kind, "outlook");
  assert.equal(s.label, "an email thread");
});

test("sniffer reads a Salesforce activity timeline", () => {
  const t = "Logged a Call · Jul 14\nSpoke with ops lead\nEmail: intro sent Jun 2";
  assert.equal(sniffPaste(t).kind, "sf");
});

test("sniffer reads speaker-labeled lines as a transcript", () => {
  const t = [
    "Dana: morning",
    "Marc: morning",
    "Dana: the renewal is moving",
    "Marc: who signs",
    "Dana: legal, then ops",
    "Marc: send the model today",
  ].join("\n");
  assert.equal(sniffPaste(t).kind, "transcript");
});

test("sniffer falls back to notes", () => {
  assert.equal(sniffPaste("met the team, good energy, follow up soon").kind, "note");
});

// ── parseEml ────────────────────────────────────────────────────────────────

test("parseEml reads a simple message with folded headers", () => {
  const raw = [
    "From: Dana Ellis <dana@simploy.com>",
    "To: Marc Coe",
    " <marc@prismhr.com>",
    "Subject: Renewal timing",
    "Date: Mon, 10 Aug 2026 09:15:00 -0500",
    "",
    "The board meets Thursday.",
    "Send the model before then.",
  ].join("\r\n");
  const m = parseEml(raw);
  assert.equal(m.from, "Dana Ellis <dana@simploy.com>");
  assert.equal(m.to, "Marc Coe <marc@prismhr.com>");
  assert.equal(m.subject, "Renewal timing");
  assert.match(m.body, /board meets Thursday/);
});

test("parseEml decodes quoted-printable bodies", () => {
  const raw = [
    "From: a@b.com",
    "Subject: qp",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "The price hold expires=20soon =E2=80=94 confirm it.",
    "One line wraps=",
    " here.",
  ].join("\n");
  const m = parseEml(raw);
  assert.match(m.body, /expires soon/);
  assert.match(m.body, /wraps here\./);
});

test("parseEml decodes base64 bodies as UTF-8", () => {
  const body = Buffer.from("Renewal moved to Sept — confirmed.", "utf-8").toString(
    "base64",
  );
  const raw = ["Subject: b64", "Content-Transfer-Encoding: base64", "", body].join("\n");
  assert.match(parseEml(raw).body, /moved to Sept — confirmed/);
});

test("parseEml prefers text/plain in a multipart message", () => {
  const raw = [
    "Subject: multi",
    'Content-Type: multipart/alternative; boundary="XYZ"',
    "",
    "--XYZ",
    "Content-Type: text/plain",
    "",
    "plain wins",
    "--XYZ",
    "Content-Type: text/html",
    "",
    "<p>html loses</p>",
    "--XYZ--",
  ].join("\n");
  assert.equal(parseEml(raw).body, "plain wins");
});

test("parseEml strips html when only html exists", () => {
  const raw = [
    "Subject: htmlonly",
    'Content-Type: multipart/alternative; boundary="QQ"',
    "",
    "--QQ",
    "Content-Type: text/html",
    "",
    "<div>Send the <b>model</b>.<br>Today.</div>",
    "--QQ--",
  ].join("\n");
  const m = parseEml(raw);
  assert.match(m.body, /Send the model\./);
  assert.match(m.body, /Today\./);
});

test("parseEml decodes encoded-word subjects", () => {
  const rawQ = "Subject: =?utf-8?Q?Renewal_=E2=80=94_timing?=\n\nx";
  assert.equal(parseEml(rawQ).subject, "Renewal — timing");
});

// ── emlToPaste / msgToPaste ─────────────────────────────────────────────────

test("emlToPaste heads the capture as an OUTLOOK THREAD", () => {
  const raw = [
    "From: Dana <dana@x.com>",
    "To: Marc <marc@y.com>",
    "Subject: Renewal",
    "Date: Mon, 10 Aug 2026 09:15:00 -0500",
    "",
    "Body line.",
  ].join("\n");
  const p = emlToPaste(raw, "renewal.eml");
  assert.match(p, /^OUTLOOK THREAD — dropped file renewal\.eml\n/);
  assert.match(p, /From: Dana <dana@x\.com>/);
  assert.match(p, /Subject: Renewal/);
  assert.match(p, /\n\nBody line\./);
  assert.equal(sniffPaste(p).kind, "outlook");
});

test("msgToPaste builds the same capture from msgreader fields", () => {
  const p = msgToPaste(
    {
      subject: "Q3 pricing",
      senderName: "Dana Ellis",
      senderEmail: "dana@simploy.com",
      recipients: [{ name: "Marc Coe", email: "marc@prismhr.com" }, { name: "Aleks" }],
      body: "Numbers attached.",
      messageDeliveryTime: "2026-08-10T14:15:00Z",
    },
    "pricing.msg",
  );
  assert.match(p, /^OUTLOOK THREAD — dropped file pricing\.msg\n/);
  assert.match(p, /From: Dana Ellis <dana@simploy\.com>/);
  assert.match(p, /To: Marc Coe <marc@prismhr\.com>; Aleks/);
  assert.match(p, /Subject: Q3 pricing/);
  assert.match(p, /\n\nNumbers attached\./);
});

// ── htmlToText / readerFor ──────────────────────────────────────────────────

test("htmlToText drops style blocks and decodes entities", () => {
  const t = htmlToText(
    "<style>p{color:red}</style><p>Q3 &amp; Q4 &quot;hold&quot;</p><p>next</p>",
  );
  assert.equal(t, 'Q3 & Q4 "hold"\nnext');
});

// ── parseVtt / vttToPaste ───────────────────────────────────────────────────

const TEAMS_VTT = [
  "WEBVTT",
  "",
  "1",
  "00:00:03.120 --> 00:00:06.480",
  "<v Dana Ellis>Thanks for making time today.</v>",
  "",
  "2",
  "00:00:06.900 --> 00:00:09.100",
  "<v Dana Ellis>We're serious about India this quarter.</v>",
  "",
  "3",
  "00:00:09.400 --> 00:00:14.000",
  "<v Marc Coe>Good. Let's talk about the entity question first.</v>",
].join("\n");

test("parseVtt strips the machinery and merges a speaker's run", () => {
  const t = parseVtt(TEAMS_VTT);
  assert.equal(
    t,
    [
      "Dana Ellis: Thanks for making time today. We're serious about India this quarter.",
      "Marc Coe: Good. Let's talk about the entity question first.",
    ].join("\n"),
  );
});

test("parseVtt reads speaker-prefixed cues without voice tags", () => {
  const zoom = [
    "WEBVTT",
    "",
    "00:00:01.000 --> 00:00:04.000",
    "Dana Ellis: We have workers in Poland already.",
    "00:00:04.200 --> 00:00:06.000",
    "Dana Ellis: Hungary is next.",
  ].join("\n");
  const t = parseVtt(zoom);
  assert.equal(t, "Dana Ellis: We have workers in Poland already. Hungary is next.");
});

test("parseVtt drops Teams GUID cue identifiers and joins split cues", () => {
  // The real-world shape: GUID/segment identifiers above every timing line,
  // one sentence split across cues, continuation lines without voice tags.
  const teams = [
    "WEBVTT",
    "",
    "a1239971-07e0-4b71-844e-f23bf5b55120/13-0",
    "00:00:06.521 --> 00:00:11.401",
    "<v Sharon Murray>Okay, my name is Sharon Murray.",
    "I'm the payroll manager here at XLHR.</v>",
    "",
    "a1239971-07e0-4b71-844e-f23bf5b55120/15-0",
    "00:00:12.681 --> 00:00:16.897",
    "<v Antaeus Coe>Wonderful. So the plan today,</v>",
    "",
    "a1239971-07e0-4b71-844e-f23bf5b55120/15-1",
    "00:00:16.897 --> 00:00:21.298",
    "<v Antaeus Coe>is to walk through the platform.</v>",
  ].join("\n");
  const t = parseVtt(teams);
  assert.equal(
    t,
    [
      "Sharon Murray: Okay, my name is Sharon Murray. I'm the payroll manager here at XLHR.",
      "Antaeus Coe: Wonderful. So the plan today, is to walk through the platform.",
    ].join("\n"),
  );
  assert.ok(!/a1239971/.test(t));
});

test("parseVtt survives cues with no blank line between them", () => {
  const tight = [
    "WEBVTT",
    "",
    "00:00:01.000 --> 00:00:04.000",
    "<v Dana>First thought.</v>",
    "00:00:04.200 --> 00:00:06.000",
    "<v Dana>Second thought.</v>",
  ].join("\n");
  assert.equal(parseVtt(tight), "Dana: First thought. Second thought.");
});

test("vttToPaste heads the capture as a CALL TRANSCRIPT", () => {
  const p = vttToPaste(TEAMS_VTT, "esc-discovery.vtt");
  assert.match(p, /^CALL TRANSCRIPT — dropped file esc-discovery\.vtt\n/);
  assert.match(p, /Dana Ellis: Thanks for making time/);
  const s = sniffPaste(p);
  assert.equal(s.kind, "transcript");
  assert.equal(s.label, "a call transcript");
});

// ── pasteFingerprint ────────────────────────────────────────────────────────

test("fingerprint survives whitespace and casing drift", () => {
  const a = pasteFingerprint("From: Dana\n\nThe board  meets Thursday.");
  const b = pasteFingerprint("  from: dana\n\n the BOARD meets thursday.  ");
  assert.equal(a, b);
});

test("different captures fingerprint differently", () => {
  const a = pasteFingerprint("From: Dana\n\nThe board meets Thursday.");
  const b = pasteFingerprint("From: Dana\n\nThe board meets Friday.");
  assert.notEqual(a, b);
  assert.notEqual(pasteFingerprint(""), a);
});

test("readerFor dispatches by extension", () => {
  assert.equal(readerFor("thread.eml"), "eml");
  assert.equal(readerFor("Thread.MSG"), "msg");
  assert.equal(readerFor("deck.pdf"), "pdf");
  assert.equal(readerFor("call.vtt"), "vtt");
  assert.equal(readerFor("notes.txt"), "text");
  assert.equal(readerFor("export.csv"), "text");
  // The widened gullet (decreed 2026-08-18): spreadsheets, documents, images.
  assert.equal(readerFor("book.xlsx"), "sheet");
  assert.equal(readerFor("Legacy.XLS"), "sheet");
  assert.equal(readerFor("proposal.docx"), "docx");
  assert.equal(readerFor("photo.heic"), "image");
  assert.equal(readerFor("shot.PNG"), "image");
  assert.equal(readerFor("pic.jpeg"), "image");
  assert.equal(readerFor("mystery.zip"), "unsupported");
});

// ── the transcript that arrives as a document (2026-08-28) ──────────────────
// Teams' Stream player exports one recording two ways. Until this, the Word
// form read as a nameless DOCUMENT and the call was lost.

const RECORDING = [
  "Global Payroll Prism-20260827_140038-Meeting Recording",
  "0:02You guys?",
  "0:03No, sorry.",
  "1:22All right, I think I'm already sharing my screen here.",
  "1:25Are we waiting on Scott or?",
  "31:54Any changes after the 10th would happen in the next payroll run.",
  "1:04:09We'll send the summary over.",
].join("\n");

test("a Teams recording document reads as a transcript, stamp and all", () => {
  const doc = parseTranscriptDoc(RECORDING);
  assert.ok(doc);
  assert.equal(doc.title, "Global Payroll Prism");
  assert.equal(doc.startedAt, "2026-08-27 14:00");
  assert.equal(doc.lines.length, 6);
  assert.equal(doc.lines[0], "You guys?");
  assert.equal(doc.lines[5], "We'll send the summary over.");
});

test("the paste carries the same head the .vtt path writes", () => {
  const paste = transcriptDocToPaste(parseTranscriptDoc(RECORDING)!, "call.docx");
  assert.match(paste, /^CALL TRANSCRIPT — dropped file call\.docx\n/);
  assert.match(paste, /\nMeeting: Global Payroll Prism\n/);
  assert.match(paste, /\nRecorded: 2026-08-27 14:00\n/);
  // Stream's Word export drops the voice tags. The read says so rather than
  // guessing a name from the words.
  assert.match(paste, /Speakers: not labeled in this export/);
  assert.match(paste, /\n\nYou guys\?\n/);
  assert.equal(/\d+:\d\dYou guys/.test(paste), false);
});

test("an ordinary document is never mistaken for a call", () => {
  assert.equal(parseTranscriptDoc("Quarterly plan\n\nWe hire in Mexico.\nBudget set."), null);
  assert.equal(parseTranscriptDoc("Agenda\n9:00 Welcome\n9:30 Demo\n10:00 Q&A"), null);
  assert.equal(parseTranscriptDoc(""), null);
  // A recording title with no cues under it is a title, not a transcript.
  assert.equal(
    parseTranscriptDoc("Global Payroll Prism-20260827_140038-Meeting Recording\nNo cues."),
    null,
  );
});

test("a stampless transcript still reads once the cues are unmistakable", () => {
  const cues = Array.from({ length: 12 }, (_, i) => `${i}:0${i % 10}Line ${i}.`).join("\n");
  const doc = parseTranscriptDoc(cues);
  assert.ok(doc);
  assert.equal(doc.title, "");
  assert.equal(doc.startedAt, "");
  assert.equal(doc.lines.length, 12);
  // No stamp means no Recorded line — a date is never invented.
  const paste = transcriptDocToPaste(doc, "unknown.docx");
  assert.equal(/Recorded:/.test(paste), false);
  assert.match(paste, /^CALL TRANSCRIPT/);
});

// ── the anonymized VTT (2026-08-28) ─────────────────────────────────────────
// Teams can export a recording with every voice tag stripped. "Same speaker"
// was then true of every cue in the file, and the 8/27 Infiniti call parsed
// into ONE line of 72,504 characters — no quoting, no excerpting, no timeline.

const ANON_VTT = [
  "WEBVTT",
  "",
  "42f915ef-6979-4606-90ef-25ba496255ac-0",
  "00:00:02.040 --> 00:00:02.480",
  "You guys?",
  "",
  "9efeadd7-71e2-42c3-9432-65d630a2a84f-0",
  "00:00:03.360 --> 00:00:03.880",
  "No, sorry.",
  "",
  "e18139de-dc9f-4653-be5a-784ec7d65c1b-0",
  "00:00:03.880 --> 00:00:08.576",
  "We realized our team meeting is at 2:30",
  "",
  "e18139de-dc9f-4653-be5a-784ec7d65c1b-1",
  "00:00:08.576 --> 00:00:09.600",
  "and we weren't sure how long you'd be.",
].join("\n");

test("a speakerless VTT keeps its utterances — the call never collapses to one line", () => {
  const t = parseVtt(ANON_VTT);
  assert.deepEqual(t.split("\n"), [
    "You guys?",
    "No, sorry.",
    "We realized our team meeting is at 2:30 and we weren't sure how long you'd be.",
  ]);
  // The cue identifiers stay machinery.
  assert.equal(/e18139de/.test(t), false);
});

test("an anonymized capture says so, and a named one does not", () => {
  const anon = vttToPaste(ANON_VTT, "call.vtt");
  assert.match(anon, /^CALL TRANSCRIPT — dropped file call\.vtt\n/);
  assert.match(anon, /Speakers: not labeled in this export/);
  assert.match(anon, /\n\nYou guys\?\n/);
  assert.equal(sniffPaste(anon).kind, "transcript");
  // A voice-tagged export never grows the line.
  assert.equal(/Speakers:/.test(vttToPaste(TEAMS_VTT, "esc.vtt")), false);
});

test("no cue identifiers and no speakers: each cue stands on its own", () => {
  const bare = [
    "WEBVTT",
    "",
    "00:00:01.000 --> 00:00:02.000",
    "First thing.",
    "",
    "00:00:02.100 --> 00:00:03.000",
    "Second thing.",
  ].join("\n");
  assert.deepEqual(parseVtt(bare).split("\n"), ["First thing.", "Second thing."]);
});

// ── a call is filed at the day it happened (2026-08-29) ─────────────────────
// A .vtt carries only elapsed cue times; the calendar moment is in the file
// name. Without reading it, a call dropped two days late told the room "you
// met today" — and the recap rule reads that clock.

const REAL_NAME = "Global.Payroll.Prism-20260827_140038-Meeting.Recording-en-US.vtt";

test("the recording's own moment is read from its file name", () => {
  assert.equal(recordedAtFromName(REAL_NAME), "2026-08-27 14:00");
  assert.equal(
    recordedAtFromName("Global Payroll Prism-20260827_140038-Meeting Recording.docx"),
    "2026-08-27 14:00",
  );
  assert.equal(recordedAtFromName("notes.vtt"), "");
  assert.equal(recordedAtFromName(""), "");
});

test("a .vtt paste carries the recorded date so the filing clock can read it", () => {
  const p = vttToPaste(ANON_VTT, REAL_NAME);
  assert.match(p, /\nRecorded: 2026-08-27 14:00\n/);
  assert.equal(transcriptRecordedDay(p), "2026-08-27");
  // A name with no stamp claims no date rather than inventing one.
  const bare = vttToPaste(ANON_VTT, "call.vtt");
  assert.equal(/Recorded:/.test(bare), false);
  assert.equal(transcriptRecordedDay(bare), "");
});

test("the document path falls back to the file name when the title has no stamp", () => {
  const cues = Array.from({ length: 12 }, (_, i) => `${i}:0${i % 10}Line ${i}.`).join("\n");
  const doc = parseTranscriptDoc(cues)!;
  assert.equal(doc.startedAt, "");
  assert.match(transcriptDocToPaste(doc, REAL_NAME), /Recorded: 2026-08-27 14:00/);
  // The title line still wins when it has one.
  const titled = parseTranscriptDoc(RECORDING)!;
  assert.match(
    transcriptDocToPaste(titled, "renamed-by-somebody.docx"),
    /Recorded: 2026-08-27 14:00/,
  );
});

test("transcriptRecordedDay reads the head only, never the words", () => {
  // A line deep in the conversation cannot masquerade as the head.
  const body = `CALL TRANSCRIPT — dropped file x.vtt\n\n${"filler line\n".repeat(40)}Recorded: 1999-01-01`;
  assert.equal(transcriptRecordedDay(body), "");
  assert.equal(transcriptRecordedDay(""), "");
});

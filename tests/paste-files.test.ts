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
  pasteFingerprint,
  readerFor,
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
  assert.equal(readerFor("notes.txt"), "text");
  assert.equal(readerFor("export.csv"), "text");
  assert.equal(readerFor("photo.heic"), "unsupported");
});

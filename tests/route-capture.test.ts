// The Chute's router, proven: contact email beats domain beats name; freemail
// and our own domain route nothing; ambiguity refuses to auto-route.

import { test } from "node:test";
import assert from "node:assert/strict";
import { domainOf, routeCapture } from "../src/lib/route-capture";

const ROSTER = [
  {
    id: "SIMPLOY01",
    name: "Simploy, Inc.",
    emails: ["dana@simploy.com"],
    domains: ["simploy.com"],
  },
  {
    id: "ADVOCATE01",
    name: "Advocate Pay",
    emails: ["bryce@advocatepay.com"],
    domains: ["advocatepay.com"],
  },
  {
    id: "GLOBALG01",
    name: "Global Group",
    emails: [],
    domains: ["globalgroup-peo.com"],
  },
];

test("a known contact email routes with the strongest score", () => {
  const r = routeCapture(
    "OUTLOOK THREAD — x.eml\nFrom: Dana Ellis <dana@simploy.com>\n\nhello",
    ROSTER,
  );
  assert.equal(r.best?.id, "SIMPLOY01");
  assert.match(r.best!.why, /dana@simploy\.com/);
});

test("a company domain routes when the exact contact is unknown", () => {
  const r = routeCapture(
    "From: someone-new@advocatepay.com\nSubject: intro\n\nhi",
    ROSTER,
  );
  assert.equal(r.best?.id, "ADVOCATE01");
  assert.match(r.best!.why, /advocatepay\.com/);
});

test("freemail and our own domain route nothing", () => {
  const r = routeCapture(
    "From: dana@gmail.com\nTo: marc@prismhr.com\n\nnothing identifying",
    ROSTER,
  );
  assert.equal(r.best, null);
  assert.equal(r.candidates.length, 0);
});

test("the account's name in the text routes", () => {
  const r = routeCapture(
    "Call notes: met the Simploy team about the renewal. Good energy.",
    ROSTER,
  );
  assert.equal(r.best?.id, "SIMPLOY01");
});

test("a bland name token alone does not route", () => {
  const r = routeCapture("The global rollout plan is attached.", ROSTER);
  assert.equal(r.best, null);
});

test("two accounts in the same text refuse to auto-route", () => {
  const r = routeCapture(
    "From: dana@simploy.com\nCc: bryce@advocatepay.com\n\nintro thread",
    ROSTER,
  );
  assert.equal(r.best, null);
  assert.equal(r.candidates.length, 2);
});

test("empty text routes nothing", () => {
  const r = routeCapture("", ROSTER);
  assert.equal(r.best, null);
});

test("domainOf strips scheme and www", () => {
  assert.equal(domainOf("https://www.simploy.com/about"), "simploy.com");
  assert.equal(domainOf("advocatepay.com"), "advocatepay.com");
});

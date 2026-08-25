// The record grows the roster (decreed 2026-08-20): people arriving in filed
// captures with an address on the account's domain join the Contacts view,
// derived at read time. The operator never joins his own roster, and the
// frozen SF export outranks a duplicate discovery.

import { test } from "node:test";
import assert from "node:assert/strict";
import { discoveredContacts, domainOfAccount } from "../src/lib/book/live-contacts";

const N = (body: string, at = "2026-08-14T19:59:00.000Z") => ({ body, createdAt: at });

test("the account's domain derives from the contact email first, then the site", () => {
  assert.equal(domainOfAccount("www.trendhr.com", "jasonh@trendhr.com"), "trendhr.com");
  assert.equal(domainOfAccount("https://www.trendhr.com/about", ""), "trendhr.com");
});

test("a quoted name with a credential tail files clean", () => {
  const found = discoveredContacts(
    [N('From: "Melanie Dreyer, CPA" <mdreyer@trendhr.com>')],
    "trendhr.com",
    new Set(),
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].first, "Melanie");
  assert.equal(found[0].last, "Dreyer");
  assert.equal(found[0].email, "mdreyer@trendhr.com");
  assert.equal(found[0].fromRecord, true);
});

test("off-domain people, the operator, and roster duplicates never join", () => {
  const found = discoveredContacts(
    [
      N("Antaeus Coe <antaeus.coe@prismhr.com>"),
      N('"Sarah Pegram, PHR" <SarahP@trendhr.com>'),
      N("Jason Holder <jasonh@trendhr.com>"),
    ],
    "trendhr.com",
    new Set(["jasonh@trendhr.com"]),
  );
  assert.deepEqual(
    found.map((c) => c.email),
    ["sarahp@trendhr.com"],
  );
});

test("a named sighting outranks a bare address for the same mailbox", () => {
  const found = discoveredContacts(
    [N("To: <mdreyer@trendhr.com>"), N("Melanie Dreyer <mdreyer@trendhr.com>")],
    "trendhr.com",
    new Set(),
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].first, "Melanie");
});

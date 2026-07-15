import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectTargets,
  routeLabel,
  splitMarker,
  splitTags,
  visibleText,
  withMarker,
  withTags,
} from "@/lib/today/route-notes";

// A slice of the real book shape — several accounts sharing generic industry
// words, exactly the situation that caused one note to spray across the book.
const ACCOUNTS = [
  { id: "a1", name: "Simploy", csm: "Lesha Cyphers" },
  { id: "a2", name: "Employee Professionals NE LLC", csm: "Lesha Cyphers" },
  { id: "a3", name: "Pinnacle Employee Services, Inc.", csm: "Anika Steenstra" },
  {
    id: "a4",
    name: "HAWAII EMPLOYEE LEASING PROFESSIONALS LLC dba HR HAWAII",
    csm: "Anika Steenstra",
  },
  { id: "a5", name: "Opes Companies", csm: "Lesha Cyphers" },
  { id: "a6", name: "Infiniti HR", csm: "Anika Steenstra" },
  { id: "a7", name: "Employer Services Corporation (ESC)", csm: "Lesha Cyphers" },
];
const PARTNERS = ["Lesha Cyphers", "Anika Steenstra", "Whitney Dideon"];

test("route-notes detection", async (t) => {
  await t.test("generic industry words never route (the spray regression)", () => {
    const r = detectTargets(
      "talked about employee onboarding and leasing professionals stuff today",
      ACCOUNTS,
      PARTNERS,
    );
    assert.equal(r.accounts.length, 0);
    assert.equal(r.partners.length, 0);
  });

  await t.test("a distinctive single token routes to exactly one account", () => {
    const r = detectTargets("simploy wants the pricing overview", ACCOUNTS, PARTNERS);
    assert.deepEqual(
      r.accounts.map((a) => a.id),
      ["a1"],
    );
    assert.deepEqual(r.partners, ["Lesha Cyphers"]);
  });

  await t.test("a token shared by multiple account names is ambiguous — no route", () => {
    // "hawaii" appears twice within one name but only one account — distinctive;
    // "employee" spans three accounts — never a key.
    const r = detectTargets("met the employee team", ACCOUNTS, PARTNERS);
    assert.equal(r.accounts.length, 0);
  });

  await t.test("full account name always matches", () => {
    const r = detectTargets("call with opes companies went well", ACCOUNTS, PARTNERS);
    assert.deepEqual(
      r.accounts.map((a) => a.id),
      ["a5"],
    );
  });

  await t.test("partner first name routes to the partner room", () => {
    const r = detectTargets("ping anika about the next call", ACCOUNTS, PARTNERS);
    assert.equal(r.accounts.length, 0);
    assert.deepEqual(r.partners, ["Anika Steenstra"]);
  });

  await t.test("short tokens never route (esc is only 3 chars)", () => {
    const r = detectTargets("esc quote still pending", ACCOUNTS, PARTNERS);
    assert.equal(r.accounts.length, 0);
  });

  await t.test("more than two account matches = ambiguous, nothing routes", () => {
    const r = detectTargets(
      "simploy and infiniti hr and opes companies all on deck",
      ACCOUNTS,
      PARTNERS,
    );
    assert.equal(r.accounts.length, 0);
    assert.equal(r.partners.length, 0);
  });

  await t.test("two account matches still route (a note can span a pair)", () => {
    const r = detectTargets(
      "simploy call, then infiniti hr follow-up",
      ACCOUNTS,
      PARTNERS,
    );
    assert.deepEqual(r.accounts.map((a) => a.id).sort(), ["a1", "a6"]);
  });
});

test("route-notes marker round-trip", async (t) => {
  await t.test("withMarker → splitMarker restores text, refs, and label", () => {
    const body = withMarker(
      "chassie ok'd monday",
      { accountNoteIds: ["an1"], partnerNoteIds: ["pn1", "pn2"] },
      "Simploy · Lesha",
    );
    const { text, refs, label } = splitMarker(body);
    assert.equal(text, "chassie ok'd monday");
    assert.deepEqual(refs, { accountNoteIds: ["an1"], partnerNoteIds: ["pn1", "pn2"] });
    assert.equal(label, "Simploy · Lesha");
  });

  await t.test("plain body has no marker", () => {
    const { text, refs } = splitMarker("just a scratch note");
    assert.equal(text, "just a scratch note");
    assert.equal(refs, null);
  });

  await t.test("routeLabel shows account names and partner first names", () => {
    assert.equal(
      routeLabel({
        accounts: [{ id: "a1", name: "Simploy" }],
        partners: ["Lesha Cyphers"],
      }),
      "Simploy · Lesha",
    );
  });
});

test("note tags marker", async (t) => {
  await t.test("withTags → splitTags round-trips all three fields", () => {
    const body = withTags("call aleks re: bulgaria", {
      date: "2026-07-18",
      urgency: "high",
      when: "later",
    });
    const { text, tags } = splitTags(body);
    assert.equal(text, "call aleks re: bulgaria");
    assert.deepEqual(tags, { date: "2026-07-18", urgency: "high", when: "later" });
  });

  await t.test("empty tags add no marker line", () => {
    assert.equal(
      withTags("plain note", { date: "", urgency: "", when: "" }),
      "plain note",
    );
  });

  await t.test("text without a tag line parses as untagged", () => {
    const { text, tags } = splitTags("no tags here");
    assert.equal(text, "no tags here");
    assert.deepEqual(tags, { date: "", urgency: "", when: "" });
  });

  await t.test("malformed values strip with the line but are ignored", () => {
    const { text, tags } = splitTags("note\n⚑[d:notadate,u:mega,w:never]");
    assert.equal(text, "note");
    assert.deepEqual(tags, { date: "", urgency: "", when: "" });
  });

  await t.test("tags coexist with a routing marker; visibleText strips both", () => {
    const tagged = withTags("simploy note", { date: "", urgency: "med", when: "today" });
    const body = withMarker(
      tagged,
      { accountNoteIds: ["an1"], partnerNoteIds: [] },
      "Simploy · Lesha",
    );
    const { text: afterRoute, refs } = splitMarker(body);
    assert.ok(refs);
    const { text, tags } = splitTags(afterRoute);
    assert.equal(text, "simploy note");
    assert.equal(tags.urgency, "med");
    assert.equal(tags.when, "today");
    assert.equal(visibleText(body), "simploy note");
  });

  await t.test("re-tagging replaces the old tag line instead of stacking", () => {
    const once = withTags("note", { date: "", urgency: "low", when: "" });
    const { text: stripped } = splitTags(once);
    const twice = withTags(stripped, { date: "", urgency: "high", when: "today" });
    const { text, tags } = splitTags(twice);
    assert.equal(text, "note");
    assert.deepEqual(tags, { date: "", urgency: "high", when: "today" });
    assert.equal(twice.split("⚑").length, 2);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { askLinks } from "@/lib/ask/links";
import { cleanAskText } from "@/lib/ask/clean";

// The doors an answer carries must land pre-loaded: the account drilldown
// already open, the Playbook scrolled to the card, the archive already
// searched — and never duplicate, never overflow, never leak a namespaced id.

const cite = (over: Partial<Parameters<typeof askLinks>[0]["citations"][0]>) => ({
  origin: "",
  originRef: "",
  accountId: "",
  docTitle: "",
  ...over,
});

describe("askLinks — every door lands on the exact thing", () => {
  test("a named account opens its drilldown, by name", () => {
    const out = askLinks({
      question: "what happened with esc?",
      accounts: [{ id: "ESC0000000000001", name: "Employer Solutions Corp" }],
      citations: [],
    });
    assert.equal(out[0].label, "Open Employer Solutions Corp.");
    assert.equal(out[0].href, "/accounts?focus=ESC0000000000001");
  });
  test("a playbook question cites → the Playbook, scrolled to that card", () => {
    const out = askLinks({
      question: "q",
      accounts: [],
      citations: [cite({ origin: "playbook", originRef: "question:gp-funding" })],
    });
    assert.ok(out.some((l) => l.href === "/playbook?open=gp-funding"));
  });
  test("account-record material links the account, named by the book", () => {
    const out = askLinks(
      {
        question: "q",
        accounts: [],
        citations: [cite({ origin: "account-note", accountId: "A1" })],
      },
      (id) => (id === "A1" ? "Staff Leasing" : ""),
    );
    assert.ok(
      out.some(
        (l) => l.href === "/accounts?focus=A1" && l.label === "Open Staff Leasing.",
      ),
    );
  });
  test("captured material lands in the archive, already searched", () => {
    const out = askLinks({
      question: "q",
      accounts: [],
      citations: [cite({ origin: "demo", docTitle: "XcelHR demo — Aug 12" })],
    });
    assert.ok(
      out.some((l) => l.href.startsWith("/archive?q=") && /archive/i.test(l.label)),
    );
  });
  test("namespaced ids never leak into links", () => {
    const out = askLinks({
      question: "q",
      accounts: [{ id: "playbook:market", name: "x" }],
      citations: [cite({ origin: "todo", accountId: "scratch:pad" })],
    });
    assert.ok(
      out.every((l) => !l.href.includes("focus=playbook") && !l.href.includes("scratch")),
    );
  });
  test("duplicates collapse; the cap holds; the brain's room rides along", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      cite({ origin: "account-note", accountId: `A${i % 2}` }),
    );
    const out = askLinks({ question: "who said it?", accounts: [], citations: many });
    assert.ok(out.length <= 6);
    assert.equal(new Set(out.map((l) => l.href)).size, out.length);
    assert.ok(out.some((l) => l.href.startsWith("/intranet?q=who%20said")));
  });
});

describe("the reader's cut — stored answers render without citation marks", () => {
  test("bracketed handles strip cleanly, punctuation survives", () => {
    assert.equal(
      cleanAskText(
        "The interest is EOR-shaped, not payroll [1][5], and a review turned up nothing [6]; demand is very low [7].",
      ),
      "The interest is EOR-shaped, not payroll, and a review turned up nothing; demand is very low.",
    );
  });
  test("hyphen bullets and blank lines pass through untouched", () => {
    const s =
      "Payroll, most likely.\n\n- The client is forming an NI entity\n- No reply since August 5";
    assert.equal(cleanAskText(s), s);
  });
  test("a real bracketed year is not a citation handle", () => {
    assert.equal(cleanAskText("filed [2026] style"), "filed [2026] style");
  });
});

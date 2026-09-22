// Southern Personnel Management, Inc. trades as My HR Professionals, and the
// SF export carries both as accounts. The split landed the worst way round:
// the substantive row holds the cloud code, the firmographics, fit 100 and all
// 68 contacts — every one of them @myhrpros.com or @spmihr.com — while the
// empty shell holds the live record, ten filed messages and twenty gaps,
// including the CEO thread with a man whose own address the book already binds
// to the substantive row.
//
// So the room showed a rich account with no story beside a thin account with
// all of it, the queue could offer the same company twice, and the CSM sheet
// counted one partner as two.
//
// The fold is read-time and never a write: stored rows keep the ids they were
// filed under, and every surface resolves them to one account.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AKA, ALIASES, RENAME, canonicalAccountId, isAliasedAway } from "@/lib/book/merge";
import { getPeo, peos } from "@/lib/book";
import { routingRoster } from "@/lib/book/roster";
import { routeCapture } from "@/lib/route-capture";

const SHELL = "0013k00002dGqODAA0"; // My HR Professionals
const REAL = "001F000000w389qIAA"; // Southern Personnel Management, Inc.

describe("canonicalAccountId", () => {
  test("a duplicate resolves to the account it belongs to", () => {
    assert.equal(canonicalAccountId(SHELL), REAL);
  });

  test("an account with no duplicate is untouched", () => {
    assert.equal(canonicalAccountId(REAL), REAL);
    assert.equal(canonicalAccountId("001F000000w38OIIAY"), "001F000000w38OIIAY");
  });

  test("namespaced stores fold too, keeping their namespace", () => {
    // The shell holds twenty gaps. They are the account's gaps.
    assert.equal(canonicalAccountId(`gaps:${SHELL}`), `gaps:${REAL}`);
    assert.equal(canonicalAccountId(`research:${SHELL}`), `research:${REAL}`);
    assert.equal(canonicalAccountId(`sendbook:${SHELL}`), `sendbook:${REAL}`);
    assert.equal(canonicalAccountId(`seat:${SHELL}`), `seat:${REAL}`);
    assert.equal(canonicalAccountId(`actdraft:${SHELL}`), `actdraft:${REAL}`);
  });

  test("a multi-segment namespace keeps every segment", () => {
    assert.equal(
      canonicalAccountId(`activity:stage:${SHELL}`),
      `activity:stage:${REAL}`,
    );
  });

  test("keys that only look namespaced are left alone", () => {
    for (const k of ["scratch:pad", "playbook:market", "playbook:lessons", "activity:manifest"])
      assert.equal(canonicalAccountId(k), k);
  });

  test("empty and unknown ids do not throw", () => {
    assert.equal(canonicalAccountId(""), "");
    assert.equal(canonicalAccountId("NOPE"), "NOPE");
  });
});

describe("the book speaks one account", () => {
  test("the duplicate is gone from the roster of accounts", () => {
    assert.equal(
      peos.filter((p) => p.id === SHELL).length,
      0,
      "the shell should not be its own account",
    );
    assert.equal(peos.filter((p) => p.id === REAL).length, 1);
  });

  test("no two accounts share an id, and none is an alias", () => {
    const ids = peos.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate id in the book");
    assert.deepEqual(ids.filter(isAliasedAway), []);
  });

  test("the old id still finds the account rather than nothing", () => {
    // A stored row, a bookmark, a dashboard card keyed to the shell must not
    // fall off the map.
    const byShell = getPeo(SHELL);
    assert.ok(byShell, "the shell id resolved to nothing");
    assert.equal(byShell!.id, REAL);
    assert.equal(byShell!.name, "myhrpros (SPMI)");
  });

  test("the surviving row is the one carrying the substance", () => {
    const a = getPeo(REAL)!;
    assert.equal(a.csm, "Lesha Cyphers");
    assert.ok(a.cloud, "kept the row with no cloud code");
    assert.ok(a.size > 0, "kept the row with no size");
  });
});

describe("the name the operator uses", () => {
  test("the row is called what people call it, carrying the entity", () => {
    // Nobody says "Southern Personnel Management, Inc." The people are
    // @myhrpros.com and the calls say "My HR Pros"; the legal entity rides in
    // the parenthesis so the row still reconciles with Salesforce.
    assert.equal(getPeo(REAL)!.name, "myhrpros (SPMI)");
    assert.equal(peos.filter((p) => p.name === "myhrpros (SPMI)").length, 1);
  });

  test("the legal name it left behind is still one of its spellings", () => {
    assert.ok(
      (AKA[REAL] ?? []).some((n) => /Southern Personnel/.test(n)),
      "dropping the legal name from the display would lose it entirely",
    );
  });

  test("a rename never invents an account", () => {
    const ids = new Set(peos.map((p) => p.id));
    for (const id of Object.keys(RENAME))
      assert.ok(ids.has(id), `${id} is renamed but is not an account`);
  });
});

describe("routing finds it under either name", () => {
  const roster = routingRoster();

  test("every spelling of the trade name routes to the one account", () => {
    // A tape says one form, a signature says another, and they normalize
    // three different ways.
    for (const said of ["My HR Professionals", "My HR Pros", "MyHR Pros", "MyHRPros"]) {
      const r = routeCapture(`Spoke with the team at ${said} about a global hire.`, roster);
      assert.equal(r.best?.id, REAL, `"${said}" routed to ${r.best?.name}`);
    }
  });

  test("the legal name it no longer displays still routes", () => {
    const r = routeCapture(
      "Call notes: Southern Personnel Management on the global piece.",
      roster,
    );
    assert.equal(r.best?.id, REAL);
  });

  test("a transcript routes on its people, with no address to read", () => {
    // What the Chute hands the router off a .vtt: speaker labels and speech,
    // no headers, no domains. The 9/21 call.
    const tape = [
      "Antaeus Coe: Joseph, can you hear us?",
      "Joseph Lyon: I can't. Can you guys hear me?",
      "lauren: My name is Lauren Jones. I am the Director of Operations for my HR Pros.",
      "Joseph Lyon: And I'm Joseph Lyon, the CEO and one of the owners here.",
    ].join("\n");
    const r = routeCapture(tape, roster);
    assert.equal(r.best?.id, REAL, `tape routed to ${r.best?.name}`);
  });

  test("both of the company's domains land on it", () => {
    for (const addr of ["joseph@myhrpros.com", "johnl@spmihr.com"]) {
      const r = routeCapture(`From: ${addr}\nSubject: global`, roster);
      assert.equal(r.best?.id, REAL, `${addr} routed to ${r.best?.name}`);
    }
  });

  test("the shell can no longer win a capture", () => {
    const r = routeCapture(
      "From: lauren@myhrpros.com\nMy HR Professionals — Southern Personnel Management",
      roster,
    );
    assert.notEqual(r.best?.id, SHELL);
    assert.deepEqual(
      r.candidates.filter((c) => c.id === SHELL),
      [],
      "the shell is still a routing candidate",
    );
  });

  test("an alias name does not drag in unrelated accounts", () => {
    const r = routeCapture("Notes from the professionals we met at the show.", roster);
    assert.notEqual(r.best?.id, REAL);
  });
});

describe("the alias table itself", () => {
  test("every alias points at a real account, and no chains", () => {
    const ids = new Set(peos.map((p) => p.id));
    for (const [dupe, real] of Object.entries(ALIASES)) {
      assert.ok(ids.has(real), `${dupe} points at ${real}, which is not an account`);
      assert.ok(!Object.hasOwn(ALIASES, real), `${real} is itself aliased — chain`);
    }
  });
});

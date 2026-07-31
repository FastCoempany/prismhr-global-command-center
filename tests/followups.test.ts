import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import {
  isManual,
  openCandidates,
  readFollowUp,
  routedIds,
  sameOrg,
  stripMarkers,
  wavedNames,
  withMarkers,
} from "../src/lib/today/followup-brain";

const root = cwd();
const BOOK = [
  { id: "ADVOCATEPAY000001", name: "Advocate Pay" },
  { id: "001simploy", name: "Simploy" },
  { id: "001esc", name: "ESC" },
];
const PARTNERS = ["Lesha Cyphers", "Eric Ronci"];
const read = (s: string) => readFollowUp(s, BOOK, PARTNERS);

// ── what the chase names ──────────────────────────────────────────────────────
describe("the follow-up reads its own sentence", () => {
  test("a book account in the chase is recognised", () => {
    const r = read("chase Bryce at Advocate Pay for the signed SOW");
    assert.deepEqual(
      r.accounts.map((a) => a.id),
      ["ADVOCATEPAY000001"],
    );
  });
  test("a possessive doesn't hide the account", () => {
    assert.equal(read("send Simploy's demo recording").accounts.length, 1);
  });
  test("a partner named in the chase is recognised by surname alone", () => {
    assert.deepEqual(read("ask Cyphers about the renewal").partners, ["Lesha Cyphers"]);
  });
  test("a short word never fires an account — ESC does not match escalate", () => {
    assert.equal(read("escalate the ticket").accounts.length, 0);
  });
  test("a fragment never fires — Pay does not match payroll", () => {
    assert.equal(read("run their payroll numbers").accounts.length, 0);
  });
  test("the opening verb is not a company", () => {
    const r = read("Chase the signed order form");
    assert.deepEqual(r.candidates, []);
  });
  test("a shouted TO DO is emphasis, not a name", () => {
    assert.deepEqual(read("TO DO: send the deck").candidates, []);
  });
  test("a weekday is not a company", () => {
    assert.deepEqual(read("call them Friday").candidates, []);
  });
  test("a name the book has never heard of becomes a question", () => {
    const r = read("chase Acme Logistics about their Brazil hires");
    assert.ok(r.candidates.some((c) => /Acme Logistics/.test(c)));
    assert.equal(r.accounts.length, 0);
  });
  test("a known account is never also a candidate", () => {
    const r = read("Advocate Pay owes us the countersignature");
    assert.equal(r.accounts.length, 1);
    assert.deepEqual(r.candidates, []);
  });
  test("a named partner is never a candidate either", () => {
    const r = read("Eric Ronci is handing over the Denver employer");
    assert.ok(!r.candidates.some((c) => /Eric|Ronci/.test(c)));
  });
  test("a country is never mistaken for a company — even a two-word one", () => {
    assert.deepEqual(read("price the Costa Rica hires").candidates, []);
    assert.deepEqual(read("their Brazil headcount").candidates, []);
    assert.deepEqual(read("the South Africa entity question").candidates, []);
  });
  test("a lone first name is too thin to interrupt over", () => {
    assert.deepEqual(read("ping Marcus about the deck").candidates, []);
  });
  test("a corporate tell rescues a one-word name", () => {
    assert.ok(read("chase Globex LLC for the countersignature").candidates.length === 1);
  });
  test("an empty chase reads empty, not broken", () => {
    assert.deepEqual(read(""), { accounts: [], partners: [], candidates: [] });
  });
});

// ── the marker grammar ────────────────────────────────────────────────────────
describe("a follow-up remembers what it already did", () => {
  test("routed ids survive the round trip and never reach the eye", () => {
    const d = withMarkers("teed up", ["001simploy", "001esc"], []);
    assert.deepEqual(routedIds(d), ["001simploy", "001esc"]);
    assert.equal(stripMarkers(d), "teed up");
  });
  test("waved-off names survive the round trip", () => {
    const d = withMarkers("", [], ["Acme Logistics"]);
    assert.deepEqual(wavedNames(d), ["acme logistics"]);
  });
  test("re-marking replaces rather than stacks", () => {
    const once = withMarkers("note", ["a1"], ["acme"]);
    const twice = withMarkers(once, ["a1", "a2"], ["acme", "globex"]);
    assert.equal((twice.match(/⇢/g) ?? []).length, 1);
    assert.equal((twice.match(/✗/g) ?? []).length, 1);
    assert.equal(stripMarkers(twice), "note");
  });
  test("the same id twice is one id", () => {
    assert.deepEqual(routedIds(withMarkers("", ["a1", "a1"], [])), ["a1"]);
  });
  test("a detail with no markers yields nothing, not a crash", () => {
    assert.deepEqual(routedIds("plain words"), []);
    assert.deepEqual(wavedNames(""), []);
  });
});

// ── the carousel of questions ─────────────────────────────────────────────────
describe("the new-name question asks once and stays answered", () => {
  const r = read("chase Acme Logistics about their Brazil hires");
  test("an unanswered candidate is open", () => {
    assert.equal(openCandidates(r, "", []).length, 1);
  });
  test("waving it off closes it for good", () => {
    const d = withMarkers("", [], ["Acme Logistics"]);
    assert.deepEqual(openCandidates(r, d, []), []);
  });
  test("a name already on the board is never asked about", () => {
    assert.deepEqual(openCandidates(r, "", ["Acme Logistics"]), []);
  });
  test("board matching ignores case and suffix", () => {
    assert.deepEqual(openCandidates(r, "", ["ACME LOGISTICS INC"]), []);
  });
});

// ── what we sell is not who we sell to ────────────────────────────────────────
describe("a product is never mistaken for a company", () => {
  test("the Global Payroll Platform is a product of ours, not a prospect", () => {
    const r = read(
      "Lesha - What would be the best route to set up a demo about the Global Payroll Platform that Prism is rolling out?",
    );
    assert.deepEqual(r.candidates, []);
  });
  test("the other two segments are products too", () => {
    assert.deepEqual(read("walk them through Contractor Management").candidates, []);
    assert.deepEqual(read("explain how EOR differs from CM").candidates, []);
    assert.deepEqual(read("the Employer of Record model").candidates, []);
  });
  test("a stop word inside a name is never cut out of the middle", () => {
    // "Global Payroll Platform" must never be reported as "Global Platform" —
    // a name the operator never wrote, offered as a company to create.
    const r = readFollowUp("chase Payroll Data Systems for the file", BOOK, PARTNERS);
    assert.ok(
      r.candidates.every((c) => !/^Data Systems$/.test(c)),
      "the middle of a name was cut away",
    );
  });
  test("a real company that happens to carry a product word still reads", () => {
    const r = read("chase Acme Payroll Services about Brazil");
    assert.ok(r.candidates.some((c) => /Acme/.test(c)));
  });
});

describe("the same firm is never two rows", () => {
  test("case, punctuation and the legal suffix are noise", () => {
    assert.equal(sameOrg("Acme Logistics", "ACME LOGISTICS INC"), true);
    assert.equal(sameOrg("Simploy", "Simploy, LLC"), true);
    assert.equal(sameOrg("Simploy", "Simploy HR"), false);
    assert.equal(sameOrg("", "Acme"), false);
  });
  test("the add action checks the board and the book before creating", () => {
    const actions = readFileSync(join(root, "src/app/today/actions.ts"), "utf8");
    const add =
      /export async function followUpAddBoard[\s\S]*?\n}\n/.exec(actions)?.[0] ?? "";
    assert.ok(add.includes("sameOrg"), "no duplicate check at all");
    assert.ok(/dashCard\.findMany/.test(add), "the board is never consulted");
    assert.ok(/peos\.find/.test(add), "the book is never consulted");
    assert.ok(add.includes("inBook?.name ?? name"), "a book account loses its own name");
  });
  test("the question is never asked about a name the book already carries", () => {
    const page = readFileSync(join(root, "src/app/room/page.tsx"), "utf8");
    assert.ok(/knownOrgs/.test(page));
    assert.ok(/peos\.map\(\(p\) => p\.name\)/.test(page), "the book is left out");
  });
});

describe("manual follow-ups are their own species", () => {
  test("a manual key is manual; a cadence key is not", () => {
    assert.equal(isManual("manual:abc-123"), true);
    assert.equal(isManual("outreach:001simploy"), false);
    assert.equal(isManual("kickoff:2026-W31:Lesha Cyphers"), false);
  });
});

// ── the wiring ────────────────────────────────────────────────────────────────
describe("the follow-up list is wired where the operator can reach it", () => {
  const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
  const page = readFileSync(join(root, "src/app/room/page.tsx"), "utf8");
  const actions = readFileSync(join(root, "src/app/today/actions.ts"), "utf8");
  const css = readFileSync(join(root, "src/app/room/room.module.css"), "utf8");

  test("every control the list needs is wired", () => {
    for (const a of [
      "addFollowUp",
      "followUpDone",
      "followUpDrop",
      "followUpAddBoard",
      "followUpWaveOff",
    ]) {
      assert.ok(client.includes(a), `${a} missing from the client`);
      assert.ok(
        actions.includes(`export async function ${a}`),
        `${a} has no server half`,
      );
    }
  });
  test("the count rides the add button", () => {
    assert.ok(client.includes("addBadge"));
    assert.ok(css.includes(".addBadge"));
  });
  test("arming a chase offers no when — everything is now", () => {
    // The dropdown is gone from the composer, and the action no longer reads a
    // window for a manual arm: a written-down chase is due on the spot.
    const block = /function FollowUpBlock[\s\S]*?\n}\n/.exec(client)?.[0] ?? "";
    assert.ok(block, "the follow-up block moved");
    assert.ok(!/name="when"/.test(block), "the when picker came back");
    const arm = /export async function addFollowUp[\s\S]*?\n}\n/.exec(actions)?.[0] ?? "";
    assert.ok(arm.includes("followUpAt: new Date(now)"), "a chase is no longer due now");
    assert.ok(!arm.includes("nextCheckIn"), "the arm still consults the cadence clock");
  });
  test("a chase that names an account files itself there", () => {
    const arm = /export async function addFollowUp[\s\S]*?\nasync function/.exec(
      actions,
    )?.[0];
    assert.ok(arm?.includes("fileFollowUpToAccounts"));
    const filer =
      /async function fileFollowUpToAccounts[\s\S]*?\n}\n/.exec(actions)?.[0] ?? "";
    // The action reaches the right-hand panel; the note reaches the history.
    assert.ok(filer.includes("roomCompose"), "no action lands on the account");
    assert.ok(filer.includes("createAccountNoteRow"), "no note reaches the record");
  });
  test("manual chases never reach the check-in drawer", () => {
    assert.ok(
      /partitionFollowUps\(\s*touches\.filter\(\(t\) => !isManual\(t\.subjectKey\)\)/.test(
        page,
      ),
      "cadence buckets still swallow manual follow-ups",
    );
  });
  test("the room is the HomeRoom now", () => {
    const nav = readFileSync(join(root, "src/components/app-wayfinder.tsx"), "utf8");
    assert.ok(nav.includes("HomeRoom"));
    assert.ok(!/>\s*Room\s*</.test(nav), "a bare Room label survived");
    assert.ok(page.includes('current="HomeRoom"'));
    assert.ok(client.includes("HOMEROOM"));
  });
});

// ── the click-away gesture ────────────────────────────────────────────────────
describe("every open panel closes on a click away", () => {
  const hook = readFileSync(join(root, "src/components/use-dismiss.ts"), "utf8");
  const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
  test("the hook answers to both gestures and cleans up after itself", () => {
    assert.ok(hook.includes("pointerdown"), "an outside click does nothing");
    assert.ok(/Escape/.test(hook), "Escape does nothing");
    assert.ok(/removeEventListener/.test(hook), "the listener outlives the panel");
    // The listener must not exist while the panel is shut.
    assert.ok(/if \(!open\) return;/.test(hook));
  });
  test("the HomeRoom's panels all use it", () => {
    assert.ok(client.includes("useDismiss"));
    for (const m of ["addRef", "drawerRef", "stageRef"]) {
      assert.ok(client.includes(m), `${m} never got wired`);
    }
  });
  test("the paste box is deliberately left alone", () => {
    // Typed-but-unfiled text must never vanish on a stray click; that panel
    // keeps its explicit Cancel.
    assert.ok(!/useDismiss<[^>]*>\(pasteOpen/.test(client));
  });
});

// ── the Teams capture ─────────────────────────────────────────────────────────
describe("the Teams bookmarklet", () => {
  const intake = readFileSync(join(root, "src/app/intake/capture-shelf.tsx"), "utf8");
  const bm = /function teamsBookmarklet\([\s\S]*?\n}\n/.exec(intake)?.[0] ?? "";
  test("it exists and is offered on Capture", () => {
    assert.ok(bm, "no Teams bookmarklet");
    assert.ok(intake.includes("Grab Teams thread"));
  });
  test("it reads the thread, not the whole app chrome", () => {
    assert.ok(/message-pane-list-viewport|messagePaneList/.test(bm));
    // document.body appears only to host the progress counter — never as a
    // text source.
    assert.ok(!/document\.body\.innerText/.test(bm), "it falls back to the whole page");
    assert.ok(/alert\(/.test(bm), "a miss captures something rather than refusing");
  });
  test("it loads the messages Teams hides before reading", () => {
    // Teams virtualises: without scrolling first, only the visible screenful is
    // in the DOM and the capture silently loses the conversation's history.
    assert.ok(/scrollTop=0/.test(bm), "no scroll-up pass");
    assert.ok(/scrollHeight/.test(bm), "the pass never checks whether more loaded");
  });
  test("the capture stamps its own dialect, and the pipeline knows it", () => {
    assert.ok(/TEAMS THREAD/.test(bm));
    const sf = readFileSync(join(root, "src/lib/sf-timeline.ts"), "utf8");
    assert.ok(
      /\(OUTLOOK\|TEAMS\) THREAD/.test(sf),
      "the SF parser would try to parse a Teams capture",
    );
    const room = readFileSync(join(root, "src/app/room/actions.ts"), "utf8");
    assert.ok(room.includes('"TM"'), "a Teams paste files as Salesforce activity");
    assert.ok(
      room.includes('"teams"'),
      "the source column lies about where it came from",
    );
  });
});

// ── Capture, the shelf ────────────────────────────────────────────────────────
describe("the Capture page is the shelf the grabs live on", () => {
  const shelf = readFileSync(join(root, "src/app/intake/capture-shelf.tsx"), "utf8");
  const page = readFileSync(join(root, "src/app/intake/page.tsx"), "utf8");
  const css = readFileSync(join(root, "src/app/command-center.module.css"), "utf8");

  test("all four grabs sit on it, each with what it takes and refuses", () => {
    for (const g of [
      "Grab Outlook thread",
      "Grab SF activity",
      "Grab Teams thread",
      "Grab Sales Nav intent",
    ]) {
      assert.ok(shelf.includes(g), `${g} left the shelf`);
    }
    // one type declaration + one value per tool — four grabs since Sales Nav
    assert.equal((shelf.match(/refuses:/g) ?? []).length, 5, "a grab hides its refusal");
    assert.equal((shelf.match(/takes:/g) ?? []).length, 5, "a grab hides what it takes");
  });
  test("the paste workflow is gone — filing happens at the account", () => {
    assert.ok(!existsSync(join(root, "src/app/intake/intake-client.tsx")));
    assert.ok(!existsSync(join(root, "src/app/intake/intake-tabs.tsx")));
    for (const dead of [
      "Paste from clipboard",
      "SF activity paste",
      "SF timeline",
      "Transcript / meeting notes",
    ]) {
      assert.ok(!page.includes(dead) && !shelf.includes(dead), `${dead} survived`);
    }
    const actions = readFileSync(join(root, "src/app/intake/actions.ts"), "utf8");
    assert.ok(!/export async function fileTimeline/.test(actions));
    assert.ok(!/export async function fileTranscript/.test(actions));
    assert.ok(!/export async function cleanWithAI/.test(actions));
  });
  test("the payroll form stays reachable, one click down", () => {
    assert.ok(shelf.includes("PayrollForm"));
    assert.ok(shelf.includes("Payroll intake form"));
  });
  test("the page still points at the account as the place work lands", () => {
    assert.ok(page.includes('href="/room"') || page.includes('"/room"'));
    assert.ok(page.includes('current="Capture"'));
  });
  test("every class the shelf asks for exists", () => {
    const used = new Set<string>();
    for (const m of shelf.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) used.add(m[1]);
    const defined = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)) defined.add(m[1]);
    assert.deepEqual(
      [...used].filter((c) => !defined.has(c)),
      [],
    );
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";

import {
  boardRowFor,
  isManual,
  manualFollowUpData,
  openCandidates,
  readFollowUp,
  routedIds,
  sameOrg,
  stripMarkers,
  wavedNames,
  withMarkers,
} from "../src/lib/today/followup-brain";
import {
  followUpRowsFor,
  knownOrgNames,
  splitTouches,
} from "../src/lib/today/followup-rows";
import { fileFollowUpToAccounts } from "../src/lib/today/followup-file";
import { bindDismiss, type DismissTarget } from "../src/components/use-dismiss";
import { TOOLS, teamsBookmarklet } from "../src/app/intake/grabs";
import { SALESNAV_ELSEWHERE, dockRefuses } from "../src/app/intranet/grab";
import { intentFor } from "../src/lib/groundwork/signals";
import { SOURCE_OF, sniffHead } from "../src/lib/ingest/dialect";
import { splitGrab } from "../src/lib/ingest/grab";
import { parseSfTimeline } from "../src/lib/sf-timeline";
import { WAYFINDER_ROUTES } from "../src/components/wayfinder-routes";
import {
  captureShelf,
  classesOf,
  followUpRow,
  formsOf,
  render,
  roomClient,
  textOf,
} from "./helpers/room-render";

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
    // followUpAddBoard decides through boardRowFor: the board first, then the
    // book — a row that already exists is never created twice, and a book
    // account takes the book's own spelling so every intel path binds to it.
    const board = [{ name: "ACME LOGISTICS INC" }];
    assert.deepEqual(boardRowFor("Acme Logistics", board, BOOK), {
      create: false,
      name: "Acme Logistics",
    });
    assert.deepEqual(boardRowFor("simploy, llc", [], BOOK), {
      create: true,
      name: "Simploy",
    });
    assert.deepEqual(boardRowFor("Globex LLC", board, BOOK), {
      create: true,
      name: "Globex LLC",
    });
  });
  test("the question is never asked about a name the book already carries", () => {
    // The room's known names are the board's cards AND the book behind
    // Accounts; a chase naming a book account that is not yet on the board
    // asks nothing.
    const known = knownOrgNames([{ name: "Regis HR Group" }], BOOK);
    assert.ok(known.includes("Regis HR Group"));
    assert.ok(known.includes("Simploy"));
    const rows = followUpRowsFor(
      [
        {
          subjectKey: "manual:1",
          label: "chase Simploy for the countersignature",
          detail: null,
          contactedAt: "2026-09-25T15:00:00Z",
          status: "awaiting",
        },
        {
          subjectKey: "manual:2",
          label: "chase Globex LLC for the countersignature",
          detail: null,
          contactedAt: "2026-09-25T16:00:00Z",
          status: "awaiting",
        },
      ],
      BOOK,
      PARTNERS,
      known,
    );
    // Newest armed first; the book account asks nothing, the stranger does.
    assert.deepEqual(
      rows.map((r) => [r.subjectKey, r.newName]),
      [
        ["manual:2", "Globex LLC"],
        ["manual:1", ""],
      ],
    );
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
  const roomProps = {
    rows: [],
    cadence: [],
    checkins: [],
    followUps: [followUpRow()],
    warming: [],
    later: [],
    canWrite: true,
    dbUnavailable: false,
    boardNames: [],
    pipeline: [],
    pipelineDay: "",
    pipelineStale: "",
  };

  test("every control the list needs is wired", async () => {
    const actions = (await import("../src/app/room/ledger-actions")) as Record<
      string,
      unknown
    >;
    for (const a of [
      "addFollowUp",
      "followUpDone",
      "followUpDrop",
      "followUpAddBoard",
      "followUpWaveOff",
    ]) {
      assert.equal(typeof actions[a], "function", `${a} has no server half`);
    }
    // The block the add menu opens arms a chase and comes home to /room.
    const room = await roomClient();
    const block = await render(
      createElement(room.FollowUpBlock, { rows: [followUpRow()] }),
    );
    const forms = formsOf(block);
    assert.equal(forms.length, 1);
    assert.ok(/name="label"/.test(forms[0]));
    assert.ok(/name="returnTo" value="\/room"/.test(forms[0]));
    assert.ok(textOf(block).includes("1 open"));
  });
  test("the count rides the add button", async () => {
    const room = await roomClient();
    const withOne = await render(createElement(room.RoomClient, roomProps));
    assert.match(withOne, /title="follow-ups still owed">1</);
    const withNone = await render(
      createElement(room.RoomClient, { ...roomProps, followUps: [] }),
    );
    assert.ok(!withNone.includes("follow-ups still owed"), "an empty list shows no badge");
  });
  test("arming a chase offers no when — everything is now", async () => {
    // The dropdown is gone from the composer, and the arm reads no window
    // for a manual chase: a written-down chase is due on the spot.
    const room = await roomClient();
    const block = await render(createElement(room.FollowUpBlock, { rows: [] }));
    assert.ok(!/name="when"/.test(block), "the when picker came back");
    const now = Date.parse("2026-09-25T15:00:00Z");
    const data = manualFollowUpData({
      key: "abc-123",
      label: "chase Simploy for the countersignature",
      detail: "",
      routed: ["001simploy"],
      now,
    });
    assert.equal(data.subjectKey, "manual:abc-123");
    assert.equal(data.followUpAt.getTime(), now, "a chase is no longer due now");
    assert.equal(data.contactedAt.getTime(), now);
    assert.equal(data.intervalDays, 0);
    assert.equal(data.status, "awaiting");
    assert.deepEqual(routedIds(data.detail ?? ""), ["001simploy"]);
  });
  test("a chase that names an account files itself there", async () => {
    // The action reaches the right-hand panel; the note reaches the history.
    // Returned ids are the ones that actually took, at most three.
    const composed: string[] = [];
    const noted: { accountId: string; body: string; lane: string; source: string }[] =
      [];
    const filed = await fileFollowUpToAccounts(
      "chase Bryce for the signed SOW",
      [
        { id: "a1", name: "Alpha" },
        { id: "a2", name: "Bravo" },
        { id: "a3", name: "Charlie" },
        { id: "a4", name: "Delta" },
      ],
      {
        compose: async (accountId, text, opts) => {
          composed.push(accountId);
          assert.equal(text, "chase Bryce for the signed SOW");
          assert.deepEqual(opts, { kind: "action", urgency: "med" });
          return accountId === "a2" ? { ok: false } : { ok: true };
        },
        note: async (n) => {
          noted.push(n);
        },
      },
    );
    assert.deepEqual(composed, ["a1", "a2", "a3"], "at most three accounts, in order");
    assert.deepEqual(filed, ["a1", "a3"], "only the actions that took are remembered");
    assert.deepEqual(
      noted.map((n) => n.accountId),
      ["a1", "a3"],
      "no note without its action",
    );
    for (const n of noted) {
      assert.equal(n.body, "⏲ Follow-up armed: chase Bryce for the signed SOW");
      assert.equal(n.lane, "mine");
      assert.equal(n.source, "followup");
    }
    // A composer that throws is a skipped account, never a broken arm.
    const broken = await fileFollowUpToAccounts("x", [{ id: "z", name: "Zulu" }], {
      compose: async () => {
        throw new Error("down");
      },
      note: async () => {},
    });
    assert.deepEqual(broken, []);
  });
  test("manual chases never reach the check-in drawer", () => {
    const touches = [
      { subjectKey: "manual:1", status: "awaiting" },
      { subjectKey: "manual:2", status: "archived" },
      { subjectKey: "outreach:001simploy", status: "awaiting" },
      { subjectKey: "kickoff:2026-W31:Lesha Cyphers", status: "replied" },
    ];
    const { manual, cadence } = splitTouches(touches);
    assert.deepEqual(
      manual.map((t) => t.subjectKey),
      ["manual:1"],
      "the list is the live chases",
    );
    assert.deepEqual(
      cadence.map((t) => t.subjectKey),
      ["outreach:001simploy", "kickoff:2026-W31:Lesha Cyphers"],
      "cadence buckets still swallow manual follow-ups",
    );
  });
  test("the room is the HomeRoom now", async () => {
    // The wayfinder renders from one table (src/components/wayfinder-routes.ts,
    // since the 2026-09-25 rulings); the label is read from its data, and the
    // room's own masthead says the same.
    const labels = WAYFINDER_ROUTES.map((r) => r.label);
    assert.ok(labels.includes("HomeRoom"));
    assert.ok(!labels.includes("Room"), "a bare Room label survived");
    const room = await roomClient();
    const board = await render(createElement(room.RoomClient, roomProps));
    assert.ok(textOf(board).includes("HOMEROOM"));
  });
});

// ── the click-away gesture ────────────────────────────────────────────────────
describe("every open panel closes on a click away", () => {
  // The hook binds through bindDismiss while the panel is open; the gestures
  // and the cleanup are pinned on that binding with a scripted document.
  type Listener = (e: unknown) => void;
  const fakeDoc = () => {
    const bound = new Map<string, Listener[]>();
    return {
      bound,
      addEventListener: (type: string, fn: Listener) => {
        bound.set(type, [...(bound.get(type) ?? []), fn]);
      },
      removeEventListener: (type: string, fn: Listener) => {
        bound.set(type, (bound.get(type) ?? []).filter((f) => f !== fn));
      },
      fire: (type: string, e: unknown) => {
        for (const fn of bound.get(type) ?? []) fn(e);
      },
    };
  };
  const panelWith = (inside: object) =>
    ({ contains: (n: unknown) => n === inside }) as unknown as Element;

  test("the hook answers to both gestures and cleans up after itself", () => {
    const doc = fakeDoc();
    const inside = {};
    const outside = {};
    let closed = 0;
    const unbind = bindDismiss(
      doc as unknown as DismissTarget,
      () => panelWith(inside),
      () => closed++,
    );
    // An outside pointer down closes; one inside the panel is left alone.
    doc.fire("pointerdown", { target: outside });
    assert.equal(closed, 1, "an outside click does nothing");
    doc.fire("pointerdown", { target: inside });
    assert.equal(closed, 1, "a click inside the panel closed it");
    // Escape closes; any other key does not.
    doc.fire("keydown", { key: "Escape" });
    assert.equal(closed, 2, "Escape does nothing");
    doc.fire("keydown", { key: "Enter" });
    assert.equal(closed, 2);
    // The unbind takes both listeners down, so nothing outlives the panel.
    unbind();
    assert.deepEqual(
      [...doc.bound.values()].map((l) => l.length),
      [0, 0],
      "the listener outlives the panel",
    );
    doc.fire("pointerdown", { target: outside });
    doc.fire("keydown", { key: "Escape" });
    assert.equal(closed, 2);
  });
  test("a panel with no element yet ignores the pointer", () => {
    const doc = fakeDoc();
    let closed = 0;
    bindDismiss(doc as unknown as DismissTarget, () => null, () => closed++);
    doc.fire("pointerdown", { target: {} });
    assert.equal(closed, 0);
  });
});

// ── the Teams capture ─────────────────────────────────────────────────────────
describe("the Teams bookmarklet", () => {
  const bm = teamsBookmarklet("https://cc.example.test");
  test("it exists and is offered on Capture", async () => {
    assert.ok(bm.startsWith("javascript:"), "no Teams bookmarklet");
    const teams = TOOLS.find((t) => t.key === "teams");
    assert.ok(teams, "the shelf does not offer the Teams grab");
    assert.equal(teams.label, "☰ Grab Teams thread");
    assert.equal(teams.build("https://cc.example.test"), bm);
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    assert.ok(textOf(html).includes("Grab Teams thread"));
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
    const paste =
      "TEAMS THREAD - Simploy · captured 9/25/2026\n\nChassie: the invoices are coming";
    // The SF anchor grammar refuses the dialect outright, so a Teams capture
    // never parses as Salesforce activity…
    assert.deepEqual(parseSfTimeline(paste), [], "the SF parser tried a Teams capture");
    // …roomPaste files it as TM, under its own source column. These are
    // roomPaste's own two calls (src/app/room/actions.ts): the sniff, then the
    // source table with the sniffed head. dialectOf and sourceFor, which
    // wrapped them, retired with their last caller (pass 8 housekeeping).
    const filed = (text: string, how: string) => {
      const { dialect, head } = sniffHead(text);
      return { dialect, source: SOURCE_OF(dialect, head, how) };
    };
    assert.equal(
      filed(paste, "rules").dialect,
      "TM",
      "a Teams paste files as Salesforce activity",
    );
    assert.equal(filed(paste, "rules").source, "teams", "the source column lies");
    assert.equal(filed(paste, "ai").source, "teams-ai");
    assert.equal(filed("OUTLOOK THREAD - captured", "rules").dialect, "OL");
    assert.equal(filed("OUTLOOK THREAD - captured", "rules").source, "outlook");
    assert.equal(filed("CALL TRANSCRIPT — dropped file x.vtt", "ai").dialect, "CT");
    assert.equal(filed("CALL TRANSCRIPT — dropped file x.vtt", "ai").source, "call-ai");
    assert.equal(filed("SALESNAV ACCOUNTS - captured", "rules").dialect, "SN");
    assert.equal(filed("SALESNAV ACCOUNTS - captured", "rules").source, "salesnav");
    const sf = filed("Lesha Cyphers to Kim Bartolotti\nRE: PrismOne", "ai");
    assert.equal(sf.dialect, "SF");
    assert.equal(sf.source, "sf-ai");
  });
});

// ── Capture, the shelf ────────────────────────────────────────────────────────
describe("the Capture page is the shelf the grabs live on", () => {
  test("all four grabs sit on it, each with what it takes and refuses", async () => {
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    const text = textOf(html);
    for (const g of [
      "Grab Outlook thread",
      "Grab SF activity",
      "Grab Teams thread",
      "Grab Sales Nav intent",
    ]) {
      assert.ok(text.includes(g), `${g} left the shelf`);
    }
    // One value per tool — four grabs since Sales Nav — and every grab prints
    // both on the shelf.
    assert.equal(TOOLS.length, 4);
    for (const t of TOOLS) {
      assert.ok(t.takes.length > 20, `${t.key} hides what it takes`);
      assert.ok(t.refuses.length > 20, `${t.key} hides its refusal`);
      assert.ok(text.includes(t.takes), `${t.key}'s takes is not on the shelf`);
      assert.ok(text.includes(t.refuses), `${t.key}'s refusal is not on the shelf`);
    }
    assert.equal((html.match(/<b>takes<\/b>/g) ?? []).length, 4);
    assert.equal((html.match(/<b>refuses<\/b>/g) ?? []).length, 4);
  });
  test("the paste workflow is gone — filing happens at the account", async () => {
    // The old client and its tabs are no longer modules anyone can load.
    for (const dead of ["../src/app/intake/intake-client", "../src/app/intake/intake-tabs"]) {
      await assert.rejects(import(dead), { code: "ERR_MODULE_NOT_FOUND" });
    }
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    for (const dead of [
      "Paste from clipboard",
      "SF activity paste",
      "SF timeline",
      "Transcript / meeting notes",
    ]) {
      assert.ok(!textOf(html).includes(dead), `${dead} survived`);
    }
    const actions = (await import("../src/app/intake/actions")) as Record<string, unknown>;
    for (const gone of ["fileTimeline", "fileTranscript", "cleanWithAI"]) {
      assert.equal(actions[gone], undefined, `${gone} is still an action`);
    }
    assert.equal(typeof actions.getDealIntel, "function", "the prefill action stays");
  });
  test("the payroll form stays reachable, one click down", async () => {
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    assert.ok(textOf(html).includes("✎ Payroll intake form"));
    // One click down: the form itself is not on the shelf until asked for.
    assert.ok(/aria-expanded="false"/.test(html));
    assert.ok(!/<form/.test(html), "the payroll form painted before its click");
  });
  test("the page still points at the account as the place work lands", async () => {
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    assert.ok(html.includes('href="/room"'));
    assert.ok(textOf(html).includes("HomeRoom"));
  });
  test("every class the shelf asks for exists", async () => {
    // A CSS module hands back undefined for a class the sheet does not
    // define, so a dangling styles.x paints as class="undefined".
    const shelf = await captureShelf();
    const html = await render(createElement(shelf.CaptureShelf, { accounts: [] }));
    assert.deepEqual(
      classesOf(html).filter((c) => c === "undefined" || c === "null"),
      [],
    );
  });
});

// ── pass 8 call 12 · the Sales Nav grab lands in the Chute's pipeline ─────
// "The bookmarklet's paste lands in the Chute's pipeline under the SALESNAV
// ACCOUNTS head, never in the Intranet dock." The grab opened the Intranet,
// whose grab box filled the dock with it. It opens the HomeRoom now, where
// the Chute and every account's ⚡ box file through the one paste pipeline;
// the head names the source the queue's intent read takes; the dock refuses
// a grab an older bookmark still sends there.
describe("the Sales Nav grab files through the pipeline, never the Intranet dock", () => {
  const salesnav = TOOLS.find((t) => t.key === "salesnav");
  const grab =
    "SALESNAV ACCOUNTS - captured 10/7/2026, 9:12:00 AM - 2 rows collected\n\n" +
    "Acme Staffing · High buyer intent · 11 activities\n\n----\n\nBeta HR · 2 alerts";

  test("the grab opens the HomeRoom, on both of its paths, and never the Intranet", () => {
    assert.ok(salesnav);
    const href = salesnav.build("https://cc.test");
    const opens = [...href.matchAll(/window\.open\('([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(opens, ["https://cc.test/room", "https://cc.test/room"]);
    assert.doesNotMatch(href, /intranet/);
  });

  test("the shelf says where it lands", () => {
    assert.ok(salesnav);
    assert.match(salesnav.takes, /HomeRoom/);
    assert.match(salesnav.takes, /⚡ box/);
    assert.doesNotMatch(salesnav.takes, /Chute or an account/);
  });

  test("the head the grab writes is the store the queue reads, one account's row at a time", () => {
    const { dialect, head } = sniffHead(grab);
    assert.equal(dialect, "SN");
    const source = SOURCE_OF(dialect, head, "rules");
    assert.equal(source, "salesnav");
    // Rewritten for seam S-25: this pin read the whole grab as one note,
    // which is how every row's intent became the one account's it was
    // pasted on. The pipeline now files each row on its own account under
    // the grab's head (src/lib/ingest/grab.ts; tests/ingest-route.test.ts
    // drops a grab through it), so the read takes one account's row.
    const now = new Date("2026-10-07T15:00:00.000Z");
    const { head: line, rows } = splitGrab(grab);
    const readOf = (row: string) =>
      intentFor([{ body: `${line}\n\n${row}`, source, createdAt: now.toISOString() }], now);
    assert.equal(readOf(rows[0])?.level, "high");
    assert.equal(readOf(rows[1]), null, "the Acme row's intent is not the Beta row's");
  });

  test("the Intranet dock refuses a Sales Nav grab and says where it goes", () => {
    assert.equal(dockRefuses(grab), SALESNAV_ELSEWHERE);
    assert.match(SALESNAV_ELSEWHERE, /HomeRoom/);
    assert.equal(dockRefuses("TEAMS THREAD - Simploy · captured 9/25/2026\n\nhi"), "");
    assert.equal(dockRefuses("a plain note about the Canada deal"), "");
  });

  test("the Teams grab still opens the Intranet's dock", () => {
    assert.match(teamsBookmarklet("https://cc.test"), /cc\.test\/intranet\?grab=1/);
  });
});

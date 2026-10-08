// The Trend Personnel Services row of 2026-09-23 rendered:
//
//   TODAY  0   TrendHR follow-up
//
// A count of nothing beside a thing. The numeral summed the sheet's open
// commitments and whatever the display cap held back; the trailing text fell
// through to the record's owed lines when the sheet had none. Two derivations
// for one line, so they could disagree — and on a row with an owed line and no
// todo, they did.
//
// The owed lines were never missing from the register. Springing it open
// renders them at the top, above the commitments. Only the numeral could not
// see them.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { todayRegister } from "@/lib/room/springs";
import { roomClient, roomRow } from "./helpers/room-render";

describe("the TODAY register counts what it shows", () => {
  test("the Trend row: an owed line and no commitment counts as one", () => {
    const r = todayRegister({ owed: ["TrendHR follow-up"], open: [], restCount: 0 });
    assert.equal(r.top, "TrendHR follow-up");
    assert.equal(r.count, 1, "the line it trails off with must be in the count");
  });

  test("a count is never zero while a line is shown", () => {
    // The invariant the row broke, stated directly.
    const cases = [
      { owed: ["owed a thing"], open: [], restCount: 0 },
      { owed: [], open: ["send the model"], restCount: 0 },
      { owed: ["owed a thing"], open: ["send the model"], restCount: 3 },
    ];
    for (const c of cases) {
      const r = todayRegister(c);
      assert.ok(r.top, "a case with entries showed no text");
      assert.ok(r.count > 0, `showed "${r.top}" with a count of ${r.count}`);
    }
  });

  test("nothing open reads as nothing, and the caller renders its own words", () => {
    const r = todayRegister({ owed: [], open: [], restCount: 0 });
    assert.equal(r.count, 0);
    assert.equal(r.top, "");
  });

  test("a commitment leads, the owed line stands in behind it", () => {
    // Unchanged precedence — the text was always right; the count was not.
    const r = todayRegister({
      owed: ["the record says you owe a recap"],
      open: ["send the calendar invite"],
      restCount: 0,
    });
    assert.equal(r.top, "send the calendar invite");
  });

  test("everything the register shows is summed, held-back included", () => {
    const r = todayRegister({
      owed: ["a", "b"],
      open: ["c", "d", "e"],
      restCount: 4,
    });
    assert.equal(r.count, 9);
  });

  test("blank entries are not counted as things", () => {
    const r = todayRegister({ owed: ["", "  "], open: [""], restCount: 0 });
    assert.equal(r.count, 0);
    assert.equal(r.top, "");
  });

  test("a nonsense rest count cannot push the numeral below the truth", () => {
    assert.equal(todayRegister({ owed: ["a"], open: [], restCount: -5 }).count, 1);
    assert.equal(todayRegister({ owed: ["a"], open: [], restCount: 1.7 }).count, 2);
  });
});

describe("the row reads one derivation, not two", () => {
  const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");

  test("neither render site does its own arithmetic", () => {
    // The folded summary and the sprung header both print the numeral. They
    // drifted apart once already; the shared value is what stops it twice.
    assert.ok(
      !client.includes("liveOpen.length + restCount"),
      "a render site is still summing the count itself",
    );
    assert.equal(
      client.split("{today.count}").length - 1,
      2,
      "both sites read today.count",
    );
  });

  test("the text comes from the same call as the count", () => {
    assert.ok(client.includes("const topToday = today.top;"));
    assert.ok(!/const topToday = liveOpen\[0\]/.test(client));
  });
});

// H4 (pass 8): "Filing or composing anything springs TODAY open so receipts
// never land behind a fold" (the Spring). A Chute filing, a note promoted from
// the record fold and an owed item accepted all added to TODAY and left it
// folded, so nothing visibly landed.
const room = await roomClient();

describe("whatever lands in TODAY springs it open (H4)", () => {
  const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");
  /** One handler's body: from its declaration to the next one at its depth. */
  const handler = (name: string): string => {
    const at = client.indexOf(`  const ${name} = `);
    assert.ok(at >= 0, `${name} is gone`);
    const next = client.indexOf("\n  const ", at + 1);
    return client.slice(at, next < 0 ? undefined : next);
  };

  test("a Chute filing's to-do arriving on the next paint is a landing", () => {
    // The Chute holds no row state: its filing reaches the row only when the
    // page re-derives, and the row compares what its register holds.
    const before = room.todayLines(roomRow());
    const after = room.todayLines(
      roomRow({
        sheetOpen: [
          { id: "todo-9", body: "Send the Canada numbers." },
          { id: "todo-1", body: "Send the model." },
        ],
      }),
    );
    assert.equal(room.landedSince(before, after), true);
  });

  test("an owed line the filing found is a landing too", () => {
    const before = room.todayLines(roomRow());
    const after = room.todayLines(
      roomRow({
        owed: [{ noteId: "n9", key: "owed-1", text: "the invoices", src: "9/25" }],
      }),
    );
    assert.equal(room.landedSince(before, after), true);
  });

  test("a line moving between zones, or leaving, lands nothing", () => {
    const before = room.todayLines(roomRow());
    // todo-1 delayed to tomorrow: the same ids, held instead of open.
    const moved = room.todayLines(
      roomRow({
        sheetOpen: [],
        sheetDelayed: [
          { id: "todo-1", body: "Send the model.", when: "THU" },
          { id: "todo-2", body: "Call the CSM.", when: "tomorrow" },
        ],
      }),
    );
    assert.equal(room.landedSince(before, moved), false);
    const left = room.todayLines(roomRow({ sheetOpen: [] }));
    assert.equal(room.landedSince(before, left), false);
  });

  test("every fresh line enters through one door, and the door springs TODAY", () => {
    const land = handler("landToday");
    assert.ok(land.includes('setSpring("today")'), "landToday springs TODAY");
    assert.equal(
      client.split("setFreshCaps((f) => [").length - 1,
      1,
      "a fresh line is added outside landToday",
    );
  });

  test("the record fold's promote and the owed accept land through it", () => {
    assert.ok(handler("promoteNote").includes("landToday("), "promoteNote");
    assert.ok(handler("owedAccept").includes("landToday("), "owedAccept");
    assert.ok(handler("submitCompose").includes("landToday("), "submitCompose");
    assert.ok(handler("promoteCap").includes('setSpring("today")'), "promoteCap");
  });

  // Pass 10 (A6.3): a Mark-it-done close, a Closed Won or Lost stamp, a
  // retire and a mint each added a receipt to TODAY and left it folded.
  // Every receipt now enters through one of two doors, and both spring.
  test("every receipt enters through a door, and both doors spring TODAY", () => {
    for (const door of ["addReceipt", "addInfo"])
      assert.ok(handler(door).includes('setSpring("today")'), `${door} springs TODAY`);
    const adds = client.split("setFreshInfo((f) => [").length - 1;
    assert.equal(adds, 2, "a receipt is added outside addReceipt and addInfo");
  });

  test("every path that files or composes lands through a door", () => {
    // Each write a row makes that leaves something in TODAY, by its handler.
    const paths: Record<string, RegExp> = {
      submitCompose: /landToday\(|filePaste\(/,
      promoteCap: /setSpring\("today"\)/,
      promoteNote: /landToday\(/,
      owedAccept: /landToday\(/,
      filePaste: /addReceipt\(/,
      fileText: /addReceipt\(/,
      unfileHeld: /addReceipt\(/,
      archiveFiles: /addReceipt\(/,
      confirmClose: /addInfo\(/,
      retireRow: /addInfo\(/,
      submitClose: /addInfo\(/,
    };
    for (const [name, door] of Object.entries(paths))
      assert.match(handler(name), door, `${name} lands behind the fold`);
  });

  // The coordinator's call (pass 10): the mint (⟳) is neither filing nor
  // composing, and its asks land in UNKNOWN, so it springs UNKNOWN with its
  // receipt there and leaves TODAY alone.
  test("the mint springs UNKNOWN, never TODAY, and keeps its receipt out of TODAY", () => {
    const mint = handler("refillAsks");
    assert.ok(mint.includes('setSpring("unknown")'), "the mint springs UNKNOWN");
    assert.ok(mint.includes("setMinted("), "the mint keeps its own receipt");
    assert.ok(!mint.includes('setSpring("today")'), "the mint springs TODAY");
    assert.ok(
      !/addInfo\(|addReceipt\(|landToday\(/.test(mint),
      "the mint's receipt lands in TODAY",
    );
  });

  test("the mint's receipt paints in the sprung UNKNOWN, above the asks", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { createElement } = await import("react");
    const line = "2 new asks minted from what the app knows.";
    const paint = (defaultSpring: "unknown" | "today") =>
      render(
        createElement(room.Row, {
          row: roomRow({
            gaps: [{ id: "g1", question: "Which countries come first?", at: "" }],
          }),
          collapsed: false,
          onToggle: () => {},
          defaultSpring,
          defaultMinted: line,
        }),
      );
    const text = textOf(await paint("unknown"));
    const at = text.indexOf(line);
    assert.ok(at > text.indexOf("STILL UNKNOWN"), "the receipt is in UNKNOWN");
    assert.ok(
      at < text.indexOf("Which countries come first?"),
      "above the asks it brought",
    );
    assert.ok(!textOf(await paint("today")).includes(line), "the receipt rides in TODAY");
  });

  test("the row springs TODAY when the next paint holds a line it did not", () => {
    assert.ok(
      /if \(landedSince\(seenLines, lines\)\) setSpring\("today"\);/.test(client),
      "the row compares its register across paints",
    );
  });
});

// S-2 (pass 9 seam): the read moves a commitment their side released out of
// the open list into `released` (the closer rule: a promise closes by
// delivery or explicit release; pass 8 H6), and nothing rendered it, so the
// line vanished from TODAY without a trace. It shows now as one quiet line
// with its why, outside the count, and the operator's ✓ and ✎ ride it.
describe("a released commitment shows in TODAY as a quiet line with its why", () => {
  const released = {
    id: "todo-r",
    body: "Send Chassie the census template · from 10/1 paste",
    edit: "Send Chassie the census template · from 10/1 paste",
    why: "Chassie released it 10/3.",
  };
  const paint = async (over: Parameters<typeof roomRow>[0] = {}) => {
    const { render } = await import("./helpers/room-render");
    const { createElement } = await import("react");
    return render(
      createElement(room.Row, {
        row: roomRow({ sheetReleased: [released], ...over }),
        collapsed: false,
        onToggle: () => {},
        defaultSpring: "today",
      }),
    );
  };
  const lineOf = (html: string): string => {
    const at = html.indexOf(released.why);
    assert.ok(at > 0, "the why is not on the register");
    const start = html.lastIndexOf('<div class="it ', at);
    const end = html.indexOf("</div>", at);
    return html.slice(start, end);
  };

  test("the line and its why are on the sprung register, quiet, with ✓ and ✎", async () => {
    const html = await paint();
    const line = lineOf(html);
    assert.ok(line.includes(released.body), "the line itself");
    assert.ok(line.includes('class="it itReleased"'), "the quiet line's own class");
    assert.ok(line.includes('title="done"'), "✓ closes it");
    assert.ok(line.includes('title="edit this line"'), "✎ rewrites it");
    assert.ok(!line.includes("PROMISED") && !line.includes("OPEN"), "no open-line chip");
    assert.ok(!line.includes('title="park"') && !line.includes("delay to tomorrow"));
  });

  test("it leaves the count: TODAY counts what is still open", async () => {
    const html = await paint();
    // The one open line, not two; the done is the row's own done today.
    assert.match(
      html,
      /<span class="sumn">1 · 1 done<\/span>/,
      "the released line is counted",
    );
    const read = await paint({ canWrite: false });
    assert.ok(!lineOf(read).includes('title="done"'), "a read-only session gets no ✓");
  });

  test("the class holds no color of its own", () => {
    const css = readFileSync(join(cwd(), "src/app/room/room.module.css"), "utf8");
    const rules = [...css.matchAll(/\.itReleased[^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    assert.ok(rules.length > 0, "the quiet line has its rule");
    for (const r of rules)
      for (const m of r.matchAll(/color:\s*([^;]+);/g))
        assert.match(
          m[1].trim(),
          /^var\(--(soft|faint|quiet|ink)\)$/,
          `a new color: ${m[1]}`,
        );
  });

  test("the room hands the read's released lines to the row", () => {
    const page = readFileSync(join(cwd(), "src/app/room/page.tsx"), "utf8");
    assert.match(page, /sheetReleased: sheet\.released/);
  });
});

// Canon pins for the Spring (CLAUDE.md "The Spring", ruling of 2026-09-25:
// D25 — the court line is retired in full; the move line says who and when).
// These drive the room engine with minimal inputs and read the move line's
// own who-and-when, never a chip.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { readDeal } from "../../src/lib/room/engine";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { createElement } from "react";
import {
  classesOf,
  followUpRow,
  render,
  roomClient,
  roomRow,
  textOf,
  warmRow,
} from "../helpers/room-render";
import { researchChip } from "../../src/lib/room/springs";
import { editedSeatBody, editedSheetBody } from "../../src/lib/room/sheet-view";
import { parseSeatBody, renderSeatBody } from "../../src/lib/act/lane";
import {
  splitMarker,
  splitTags,
  visibleText,
  withMarker,
  withTags,
  NO_TAGS,
} from "../../src/lib/today/route-notes";

const NOW = new Date("2026-09-02T20:00:00Z"); // 3:00p Chicago

const base = {
  accountName: "Trend Personnel Services",
  step: null,
  timing: null,
  lastRecordAt: "2026-09-02T15:39:00Z",
  now: NOW,
};

describe("the move line carries who and when (D25)", () => {
  test("their reply after our send: the move names them and says today", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-02T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-09-02T15:39:00Z", who: "Adam" },
    });
    assert.equal(r.move, "Answer Adam. They wrote today.");
    assert.equal(r.thin, false);
  });

  test("their reply two days back: the move counts the days", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-30T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-08-31T15:39:00Z", who: "Adam" },
    });
    assert.equal(r.move, "Answer Adam. They wrote 2 days ago.");
  });

  test("our send today with nothing back: the move names who we wait on and when we wrote", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-02T16:02:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
    });
    assert.equal(r.move, "Wait on Melanie. You wrote today.");
  });

  test("a meeting today: the move names who we met and when", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-01T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
      lastMeeting: { at: "2026-09-02T15:00:00Z", who: "Melanie" },
    });
    assert.equal(r.move, "Send Melanie the recap. You met today.");
  });

  test("an acceptance after our send: the move names who accepted", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-01T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
      lastAccepted: { at: "2026-09-02T15:00:00Z", who: "Melanie" },
    });
    assert.equal(r.move, "Wait for the meeting. Melanie accepted.");
  });

  test("their promise holds the await and says when it was made", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-30T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-09-01T15:39:00Z", who: "Adam", promise: true },
    });
    // The retired "Hold for their follow-up" became the approved wait line,
    // which names who owes it (the face approved 2026-10-06).
    assert.equal(r.move, "Wait on Adam. Promise made yesterday.");
  });
});

// ── The Spring's face, as the HomeRoom row paints it ───────────────────────
// Pass 10 pins the rest of the section by render: the registers' summary
// lines (A6.1), the one legend at the page foot (A6.5), the minimalist
// controls (A6.6), and the sheet line's edit (A6.10), which calls the pure
// half roomTodoEdit writes through. The two CSS clauses, the mono kicker and
// the hover-revealed ✕, read the stylesheet's rule for the class the render
// emits; nothing else here reads a source file.

const room = await roomClient();

const ask = (id: string, question: string) => ({
  id,
  question,
  at: "2026-10-01T15:00:00Z",
});
const springRow = (over: Parameters<typeof roomRow>[0] = {}) =>
  roomRow({
    gaps: [
      ask("g1", "Which countries come first?"),
      ask("g2", "Who signs for the client?"),
    ],
    peers: [
      {
        question: "How do they handle the thirteenth month?",
        shared: "Philippines",
        findHref: "/intranet?q=13th",
      },
    ],
    sheetOpen: [
      { id: "todo-1", body: "Send the model." },
      { id: "todo-4", body: "Call the CSM." },
    ],
    owed: [{ noteId: "n9", key: "owed-1", text: "the invoices", src: "promised 9/25" }],
    ...over,
  });
const paintRow = (
  row: ReturnType<typeof roomRow>,
  defaultSpring: "unknown" | "peers" | "today" | null,
) =>
  render(
    createElement(room.Row, { row, collapsed: false, onToggle: () => {}, defaultSpring }),
  );

// ── The F26 face (ship order 2026-11-04) ───────────────────────────────────
// The Spring's registers retired with the F26 face: the row rests as its one
// sentence, and opened it paints the next move, the people in the deal and
// one door, "Latest email and Chute". What the Spring's attendant decrees
// still govern is pinned here as the new face paints it: the one legend at
// the page foot (A6.5), and the account's tools on hover at its name, where
// the founder's face spells each one out (it replaced the glyph-only rule of
// A6.6 for these three).

describe("the row rests as its sentence; opened, it paints the move, the deck and one door (F26)", () => {
  test("folded, the row is its sentence and nothing else", async () => {
    const html = await render(
      createElement(room.Row, { row: springRow(), collapsed: true, onToggle: () => {} }),
    );
    const text = textOf(html);
    assert.ok(text.includes("Simploy"));
    assert.ok(text.includes("would resell"));
    // The rest stays mounted, so nothing typed in it is lost; it only stops
    // painting.
    assert.match(html, /<div class="body" hidden="">/);
    assert.ok(!classesOf(html).includes("sumline"), "a register rests on a folded row");
  });

  test("opened, the move, the deck and the door, and no register line", async () => {
    const html = await paintRow(springRow(), null);
    for (const c of ["mrow", "ppl", "doorBtn"])
      assert.ok(classesOf(html).includes(c), `${c} missing`);
    assert.ok(!classesOf(html).includes("sumline"), "a register still rests");
    const text = textOf(html);
    assert.ok(text.includes("Next move"));
    assert.ok(text.includes("Latest email and Chute"));
    assert.ok(!/\b(UNKNOWN|COMPARABLE)\b/.test(text));
  });
});

describe("the per-row keybar is retired; one legend lives at the page foot (A6.5)", () => {
  const KEYS = [
    "✉ email",
    "➤ sent",
    "✸ action",
    "⟳ research",
    "⇣ low signal",
    "☑ closed won",
  ];
  const board = (rows: ReturnType<typeof roomRow>[]) =>
    render(
      createElement(room.RoomClient, {
        rows,
        cadence: [],
        checkins: [],
        followUps: [],
        warming: [],
        later: [],
        canWrite: true,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }),
    );

  test("a row carries no legend, folded or opened", async () => {
    for (const sprung of [null, "today"] as const) {
      const text = textOf(await paintRow(springRow(), sprung));
      for (const k of KEYS)
        assert.ok(!text.includes(k), `${sprung ?? "folded"} row keys ${k}`);
    }
  });

  test("the board paints the legend once, after the last row", async () => {
    const html = await board([
      springRow(),
      springRow({
        accountId: "001F000000w38OHIAY",
        cardId: "card-regis",
        name: "Regis HR Group",
      }),
      springRow({
        accountId: "001F000000OFFB01",
        cardId: "",
        name: "Gulf Coast PEO",
        stages: [],
      }),
    ]);
    assert.equal(html.split('class="footLegend"').length - 1, 1, "one legend");
    for (const k of KEYS)
      assert.equal(textOf(html).split(k).length - 1, 1, `${k} keyed once`);
    assert.ok(
      html.indexOf('class="footLegend"') > html.lastIndexOf("Gulf Coast PEO"),
      "at the foot",
    );
  });

  test("an empty board keys nothing", async () => {
    assert.ok(!(await board([])).includes("footLegend"));
  });
});

describe("the account's tools ride on hover at its name (F26)", () => {
  const fcss = readFileSync(join(cwd(), "src/app/room/f.module.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const frule = (sel: string): string =>
    [...fcss.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => m[1].trim() === sel)
      .map((m) => m[2])
      .join("\n");
  const toolsOf = (html: string) =>
    /<span class="nmTools">([\s\S]*?)<\/span><p /.exec(html)?.[1] ?? "";
  /** Every element carrying `title`, with its own text. */
  const carrying = (html: string, title: string) =>
    [...html.matchAll(/<(a|button)\b([^>]*)>([^<]*)<\/\1>/g)].filter((m) =>
      m[2].includes(`title="${title}"`),
    );

  test("research, low signal and closed won, each spelled out and tooltip-titled", async () => {
    const tools = toolsOf(await paintRow(springRow({ researchAt: "" }), null));
    assert.ok(tools.includes("⟳ Research never run"), tools);
    assert.ok(tools.includes("⇣ Low signal"));
    assert.ok(tools.includes("☑ Closed won"));
    assert.ok(
      tools.includes('title="Send to low signal. Not in your Salesforce pipeline."'),
    );
    assert.ok(tools.includes('title="Mark Closed Won."'));
  });

  test("the bar rests hidden and shows on hover or focus at the name", () => {
    assert.match(frule(".nmTools"), /display:\s*none;/);
    assert.match(fcss, /\.fline:has\(\.nmLink:hover\) \.nmTools,/);
    assert.match(fcss, /\.nmTools:focus-within,/);
  });

  test("a low-signal row's tool takes it back", async () => {
    const tools = toolsOf(await paintRow(springRow({ lowSignal: true }), null));
    assert.ok(tools.includes("↺ Back to the live deals"), tools);
  });

  test("a closed row and a read-only session carry no tools; a row with no card has no ☑", async () => {
    const closed = await paintRow(
      springRow({ outcome: { status: "lost", phrase: "", at: "2026-10-01T15:00:00Z" } }),
      null,
    );
    const readOnly = await paintRow(springRow({ canWrite: false }), null);
    for (const html of [closed, readOnly]) assert.equal(toolsOf(html), "");
    const cardless = toolsOf(await paintRow(springRow({ cardId: "" }), null));
    assert.ok(cardless.includes("⇣ Low signal"));
    assert.ok(!cardless.includes("☑"));
  });

  test("a closed row carries ↺, which reopens it; a read-only one does not", async () => {
    const closed = (canWrite: boolean) =>
      paintRow(
        springRow({
          canWrite,
          outcome: { status: "won", phrase: "", at: "2026-10-01T15:00:00Z" },
        }),
        null,
      );
    const back = carrying(await closed(true), "Reopen the deal. The stamp comes off.");
    assert.equal(back.length, 1);
    assert.equal(back[0][3], "↺");
    assert.equal(
      carrying(await closed(false), "Reopen the deal. The stamp comes off.").length,
      0,
    );
  });
});

describe("a sheet line's edit keeps its tags and routing marker verbatim (A6.10)", () => {
  const refs = { accountNoteIds: ["an1", "an2"], partnerNoteIds: ["pn1"] };
  const tags = {
    ...NO_TAGS,
    date: "2026-10-09",
    urgency: "high" as const,
    kind: "action" as const,
    country: "ph",
  };
  const tailOf = (body: string) =>
    body.slice(splitTags(splitMarker(body).text).text.length).trimStart();

  test("the visible text changes; the tag line and the marker ride along byte for byte", () => {
    const body = withMarker(withTags("Send the model.", tags), refs, "Simploy · Lesha");
    const out = editedSheetBody(body, "Send the Canada model.");
    assert.equal(visibleText(out), "Send the Canada model.");
    assert.equal(tailOf(out), tailOf(body));
    assert.deepEqual(splitTags(splitMarker(out).text).tags, tags);
    assert.deepEqual(splitMarker(out).refs, refs);
    assert.equal(splitMarker(out).label, "Simploy · Lesha");
  });

  test("a key the codec no longer reads and a line in its own order survive", () => {
    // The retired dl: delay (removed from the codec 2026-09-25) still sits
    // on rows written before; an edit must not strip it or reorder anything.
    const body =
      "Send the model.\n⚑[u:high,dl:waiting%20on%20Adam,k:a]\n⇢[p:pn1,a:an1] Simploy · Lesha";
    assert.equal(
      editedSheetBody(body, "Call Adam."),
      "Call Adam.\n⚑[u:high,dl:waiting%20on%20Adam,k:a]\n⇢[p:pn1,a:an1] Simploy · Lesha",
    );
  });

  test("tags alone, a marker alone, neither, or no visible text at all", () => {
    const tagged = withTags("Send the model.", tags);
    assert.equal(tailOf(editedSheetBody(tagged, "x")), tailOf(tagged));
    const routed = withMarker("Send the model.", refs, "");
    assert.equal(
      editedSheetBody(routed, "Call the CSM."),
      `Call the CSM.\n${tailOf(routed)}`,
    );
    assert.equal(editedSheetBody("Send the model.  ", "Call the CSM."), "Call the CSM.");
    const bare = "⇢[a:an1] Simploy";
    assert.equal(
      editedSheetBody(bare, "Call the CSM."),
      "Call the CSM.\n⇢[a:an1] Simploy",
    );
  });

  test("hand-typed grammar never masquerades as a real marker", () => {
    const body = withMarker(withTags("Send the model.", tags), refs, "Simploy");
    const out = editedSheetBody(body, "Send it ⚑[u:low] and ⇢[a:evil] now");
    assert.deepEqual(splitMarker(out).refs, refs);
    assert.deepEqual(splitTags(splitMarker(out).text).tags, tags);
    assert.equal(tailOf(out), tailOf(body));
    assert.ok(!visibleText(out).includes("⚑["), visibleText(out));
    assert.ok(!visibleText(out).includes("⇢["), visibleText(out));
  });

  test("a seat's act is rewritten; its term and seated day survive", () => {
    const body = renderSeatBody({
      act: "Send the model",
      term: "PEO",
      day: "2026-10-06",
    });
    const out = editedSeatBody(body, "Call Adam · today");
    assert.deepEqual(parseSeatBody(out ?? ""), {
      act: "Call Adam - today",
      term: "PEO",
      day: "2026-10-06",
    });
    assert.equal(editedSeatBody("Send the model.", "x"), null, "not a seat");
  });
});

// ── pass 10, the coordinator's second list ─────────────────────────────────
// The research chip carries its date on its face as the Spring draws it; the
// copy the lint found is flat; the follow-up count and MULTI each open one
// click deep, no hover needed. Each pinned by render; the open state's CSS
// and the badge's one wire read their source.
describe("the research control is a dated chip: RESEARCH 7/2 ⟳", () => {
  test("the latest run's Chicago day rides the face; NEVER only when nothing ran", () => {
    assert.equal(researchChip("2026-07-02T15:00:00Z"), "RESEARCH 7/2 ⟳");
    // 11pm Chicago on 7/2 is 7/3 in UTC: the day is Chicago's.
    assert.equal(researchChip("2026-07-03T04:00:00Z"), "RESEARCH 7/2 ⟳");
    assert.equal(researchChip(""), "RESEARCH NEVER ⟳");
    assert.equal(
      researchChip("not a date"),
      "RESEARCH ⟳",
      "a run that cannot be read is not NEVER",
    );
  });

  test("the row paints the run's day in the tools at the name, and never run when nothing ran", async () => {
    // The F26 face (ship order 2026-11-04): "⟳ Research 7/2" in the bar at
    // the account's name; the chip grammar above still reads the day.
    const ran = await paintRow(roomRow({ researchAt: "2026-07-02T15:00:00Z" }), null);
    assert.ok(textOf(ran).includes("⟳ Research 7/2"));
    const never = await paintRow(roomRow({ researchAt: "" }), null);
    assert.ok(textOf(never).includes("⟳ Research never run"));
  });
});

describe("the row's copy is flat: no dash asides, no antithesis", () => {
  test("the opened row, its deck and its door read flat", async () => {
    const opened = textOf(await paintRow(springRow(), "today"));
    const folded = textOf(
      await render(
        createElement(room.Row, {
          row: springRow(),
          collapsed: true,
          onToggle: () => {},
        }),
      ),
    );
    assert.ok(opened.includes("Chassie Smith"), "the deck's person");
    for (const t of [opened, folded])
      assert.ok(!t.includes("—"), `a dash in the row: ${t}`);
  });

  test("the eye drawer says what it holds without an antithesis", async () => {
    const eye = textOf(
      await render(
        createElement(room.EyeDrawer, {
          warming: [warmRow()],
          later: [],
          onClose: () => {},
        }),
      ),
    );
    assert.ok(!eye.includes("not worked"), eye);
    assert.ok(
      eye.includes("You watch these here until you seed, schedule, or dismiss them."),
    );
  });

  test("the Pipeline edge tab's title is a plain phrase", async () => {
    const html = await render(
      createElement(room.RoomClient, {
        rows: [roomRow()],
        cadence: [],
        checkins: [],
        followUps: [],
        warming: [],
        later: [],
        canWrite: true,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }),
    );
    assert.ok(html.includes('title="Pipeline Status for every active account"'));
    assert.ok(!html.includes("Pipeline Status —"));
  });
});

describe("the follow-up count and MULTI open one click deep, no hover", () => {
  const board = (canWrite: boolean) =>
    render(
      createElement(room.RoomClient, {
        rows: [roomRow()],
        cadence: [],
        checkins: [],
        followUps: [followUpRow()],
        warming: [],
        later: [],
        canWrite,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }),
    );

  test("the count is its own button, beside ＋ add, never inside it", async () => {
    const html = await board(true);
    assert.match(
      html,
      /<button type="button" class="addBtn">＋ add <span class="car">▾<\/span><\/button><button type="button" class="addBadge" title="Show the follow-ups still owed">1<\/button>/,
    );
    assert.ok(
      !(await board(false)).includes("addBadge"),
      "a read-only count with no door",
    );
  });

  test("opened from the count, the list of what is owed is already open", async () => {
    const owed = followUpRow().label;
    const pinned = textOf(
      await render(
        createElement(room.FollowUpBlock, { rows: [followUpRow()], defaultPinned: true }),
      ),
    );
    assert.ok(pinned.includes(owed), "the pinned list shows the follow-up");
    const shut = textOf(
      await render(createElement(room.FollowUpBlock, { rows: [followUpRow()] })),
    );
    assert.ok(!shut.includes(owed), "the list rests shut from ＋ add");
    const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");
    assert.match(
      client,
      /title="Show the follow-ups still owed"\s*onClick=\{\(\) => \{\s*setFuOpen\(true\);\s*setMenuOpen\(true\);/,
    );
    assert.match(
      client,
      /<FollowUpBlock rows=\{followUps\} defaultPinned=\{fuOpen\} \/>/,
    );
  });

  test("MULTI heads the people deck, and the deck shows who is in the deal with no hover", async () => {
    // The F26 face (ship order 2026-11-04): the deck replaced the hovercard;
    // the opened row shows the person up front and their contact card.
    const html = await paintRow(roomRow(), null);
    assert.match(
      html,
      /<span class="multi m_y" title="How many of their people write back">MULTI<\/span>/,
    );
    assert.ok(textOf(html).includes("Chassie Smith"));
    assert.ok(textOf(html).includes("chassie@example.com"));
  });
});

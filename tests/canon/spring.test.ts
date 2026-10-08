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
import { render, roomClient, roomRow, textOf } from "../helpers/room-render";
import { todayRegister } from "../../src/lib/room/springs";
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
const css = readFileSync(join(cwd(), "src/app/room/room.module.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
/** Every declaration block whose selector is exactly `sel`. */
const rule = (sel: string): string =>
  [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) => m[1].trim() === sel)
    .map((m) => m[2])
    .join("\n");

const ask = (id: string, question: string) => ({ id, question, at: "2026-10-01T15:00:00Z" });
const springRow = (over: Parameters<typeof roomRow>[0] = {}) =>
  roomRow({
    gaps: [ask("g1", "Which countries come first?"), ask("g2", "Who signs for the client?")],
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
const paintRow = (row: ReturnType<typeof roomRow>, defaultSpring: "unknown" | "peers" | "today" | null) =>
  render(createElement(room.Row, { row, collapsed: false, onToggle: () => {}, defaultSpring }));
/** Every resting summary line in a render, in order. A summary line holds
 *  spans, buttons and links, never a div, so the first </div> closes it. */
const restingLines = (html: string): string[] =>
  [...html.matchAll(/<div class="sumline">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
const kickerOf = (line: string) => /<span class="sumk">([^<]*)<\/span>/.exec(line)?.[1];

describe("each register rests as one summary line (A6.1)", () => {
  test("UNKNOWN, COMPARABLE and TODAY each rest as one line, in that order", async () => {
    const lines = restingLines(await paintRow(springRow(), null));
    assert.deepEqual(lines.map(kickerOf), ["UNKNOWN", "COMPARABLE", "TODAY"]);
  });

  test("each line is a mono kicker, a live count, the top entry and ⊕", async () => {
    const row = springRow();
    const lines = restingLines(await paintRow(row, null));
    const today = todayRegister({
      owed: row.owed.map((o) => o.text),
      open: row.sheetOpen.map((t) => t.body),
      restCount: 0,
    });
    const want = [
      { count: String(row.gaps.length), top: "Which countries come first?" },
      { count: String(row.peers.length), top: "PHILIPPINES — How do they handle the thirteenth month?" },
      { count: `${today.count} · 1 done`, top: "Send the model." },
    ];
    lines.forEach((line, i) => {
      assert.match(line, /<span class="sumk">/, "the kicker");
      assert.equal(textOf(/<span class="sumn">([\s\S]*?)<\/span>/.exec(line)?.[1] ?? ""), want[i].count);
      assert.equal(textOf(/<span class="sumtx">([\s\S]*?)<\/span>/.exec(line)?.[1] ?? ""), want[i].top);
      assert.match(line, /<button type="button" class="splayBtn" title="Expand them out">⊕<\/button>/);
    });
  });

  test("COMPARABLE rests only when peers exist", async () => {
    const html = await paintRow(springRow({ peers: [] }), null);
    assert.deepEqual(restingLines(html).map(kickerOf), ["UNKNOWN", "TODAY"]);
    assert.ok(!textOf(html).includes("COMPARABLE"), "a COMPARABLE register with no peers");
    for (const sprung of ["unknown", "today", "peers"] as const)
      assert.ok(!textOf(await paintRow(springRow({ peers: [] }), sprung)).includes("COMPARABLE"));
  });

  test("the counts follow the record: an outstanding gate counts in UNKNOWN", async () => {
    const outstanding = { item: "Book the room", node: "first_meeting", index: 0, doneKey: "k", closedCount: 0 };
    const [unknown] = restingLines(await paintRow(springRow({ outstanding }), null));
    assert.equal(textOf(/<span class="sumn">([\s\S]*?)<\/span>/.exec(unknown)?.[1] ?? ""), "3");
    assert.equal(textOf(/<span class="sumtx">([\s\S]*?)<\/span>/.exec(unknown)?.[1] ?? ""), "Book the room");
  });

  test("one register out at a time: the others keep resting as their one line", async () => {
    const rest = { unknown: ["COMPARABLE", "TODAY"], peers: ["UNKNOWN", "TODAY"], today: ["UNKNOWN", "COMPARABLE"] };
    for (const sprung of ["unknown", "peers", "today"] as const) {
      const html = await paintRow(springRow(), sprung);
      assert.equal(html.split('class="splayed"').length - 1, 1, `${sprung}: one register out`);
      assert.deepEqual(restingLines(html).map(kickerOf), rest[sprung], sprung);
      assert.match(html, /title="Fold them back">⊖<\/button>/, `${sprung} folds back with ⊖`);
    }
  });

  test("the kicker is mono and the top entry trails off", () => {
    assert.match(rule(".sumk"), /font-family:\s*var\(--f-mono\)/);
    const tx = rule(".sumtx");
    for (const d of [/white-space:\s*nowrap/, /overflow:\s*hidden/, /text-overflow:\s*ellipsis/])
      assert.match(tx, d);
  });
});

describe("the per-row keybar is retired; one legend lives at the page foot (A6.5)", () => {
  const KEYS = ["✉ send", "⚑ owed", "✸ action", "⌕ ask the brain", "✕ not this deal"];
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

  test("a row carries no legend, in any register", async () => {
    for (const sprung of [null, "unknown", "peers", "today"] as const) {
      const text = textOf(await paintRow(springRow(), sprung));
      for (const k of KEYS) assert.ok(!text.includes(k), `${sprung ?? "folded"} row keys ${k}`);
    }
  });

  test("the board paints the legend once, after the last row", async () => {
    const html = await board([
      springRow(),
      springRow({ accountId: "001F000000w38OHIAY", cardId: "card-regis", name: "Regis HR Group" }),
      springRow({ accountId: "001F000000OFFB01", cardId: "", name: "Gulf Coast PEO", stages: [] }),
    ]);
    assert.equal(html.split('class="footLegend"').length - 1, 1, "one legend");
    for (const k of KEYS) assert.equal(textOf(html).split(k).length - 1, 1, `${k} keyed once`);
    assert.ok(html.indexOf('class="footLegend"') > html.lastIndexOf("Gulf Coast PEO"), "at the foot");
  });

  test("an empty board keys nothing", async () => {
    assert.ok(!(await board([])).includes("footLegend"));
  });
});

describe("the minimalist controls are glyphs with titles, never words (A6.6)", () => {
  const WORDS = /ask the brain|mint sharper asks|find the answer|not this deal/i;
  const CONTROLS: { glyph: string; title: string; tag: "a" | "button"; cls: string }[] = [
    { glyph: "⌕", title: "Ask the brain", tag: "a", cls: "sic" },
    { glyph: "⟳", title: "Mint sharper asks", tag: "button", cls: "sic" },
    { glyph: "✕", title: "Not this deal", tag: "button", cls: "askX" },
    { glyph: "→", title: "Find the answer", tag: "a", cls: "askGo" },
  ];
  /** Every element carrying `title`, with its own text. */
  const carrying = (html: string, title: string) =>
    [...html.matchAll(/<(a|button)\b([^>]*)>([^<]*)<\/\1>/g)].filter((m) =>
      m[2].includes(`title="${title}"`),
    );

  test("each control is its glyph alone, tooltip-titled, wherever its register paints it", async () => {
    const seen = new Set<string>();
    for (const sprung of [null, "unknown", "peers"] as const) {
      const html = await paintRow(springRow(), sprung);
      for (const c of CONTROLS)
        for (const m of carrying(html, c.title)) {
          seen.add(c.title);
          assert.equal(m[1], c.tag, `${c.title} is a ${c.tag}`);
          assert.match(m[2], new RegExp(`class="${c.cls}"`), `${c.title}'s class`);
          assert.equal(m[3], c.glyph, `${c.title} shows only ${c.glyph}`);
        }
    }
    assert.deepEqual([...seen].sort(), CONTROLS.map((c) => c.title).sort(), "every control painted");
  });

  test("no row spells a control out on its surface", async () => {
    for (const sprung of [null, "unknown", "peers", "today"] as const)
      assert.doesNotMatch(textOf(await paintRow(springRow(), sprung)), WORDS, `${sprung ?? "folded"}`);
  });

  test("a read-only session gets ⌕ and →, and neither ⟳ nor ✕", async () => {
    const html = await paintRow(springRow({ canWrite: false }), "unknown");
    assert.equal(carrying(html, "Mint sharper asks").length, 0);
    assert.equal(carrying(html, "Not this deal").length, 0);
    assert.equal(carrying(html, "Ask the brain").length, 1);
  });

  test("the ✕ rests hidden and the ask's own row reveals it on hover", () => {
    assert.match(rule(".askX"), /opacity:\s*0;/);
    assert.match(rule(".askRow:hover .askX"), /opacity:\s*1;/);
  });
});

describe("a sheet line's edit keeps its tags and routing marker verbatim (A6.10)", () => {
  const refs = { accountNoteIds: ["an1", "an2"], partnerNoteIds: ["pn1"] };
  const tags = { ...NO_TAGS, date: "2026-10-09", urgency: "high" as const, kind: "action" as const, country: "ph" };
  const tailOf = (body: string) => body.slice(splitTags(splitMarker(body).text).text.length).trimStart();

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
    const body = "Send the model.\n⚑[u:high,dl:waiting%20on%20Adam,k:a]\n⇢[p:pn1,a:an1] Simploy · Lesha";
    assert.equal(
      editedSheetBody(body, "Call Adam."),
      "Call Adam.\n⚑[u:high,dl:waiting%20on%20Adam,k:a]\n⇢[p:pn1,a:an1] Simploy · Lesha",
    );
  });

  test("tags alone, a marker alone, neither, or no visible text at all", () => {
    const tagged = withTags("Send the model.", tags);
    assert.equal(tailOf(editedSheetBody(tagged, "x")), tailOf(tagged));
    const routed = withMarker("Send the model.", refs, "");
    assert.equal(editedSheetBody(routed, "Call the CSM."), `Call the CSM.\n${tailOf(routed)}`);
    assert.equal(editedSheetBody("Send the model.  ", "Call the CSM."), "Call the CSM.");
    const bare = "⇢[a:an1] Simploy";
    assert.equal(editedSheetBody(bare, "Call the CSM."), "Call the CSM.\n⇢[a:an1] Simploy");
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
    const body = renderSeatBody({ act: "Send the model", term: "PEO", day: "2026-10-06" });
    const out = editedSeatBody(body, "Call Adam · today");
    assert.deepEqual(parseSeatBody(out ?? ""), { act: "Call Adam - today", term: "PEO", day: "2026-10-06" });
    assert.equal(editedSeatBody("Send the model.", "x"), null, "not a seat");
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import {
  cadenceRow,
  checkinRow,
  classesOf,
  followUpRow,
  formsOf,
  render,
  roomClient,
  roomRow,
  textOf,
  warmRow,
} from "./helpers/room-render";

// ADVERSARIAL — the consolidation contract. The room absorbed Today and the
// board; this manifest asserts every capability is actually wired, not just
// remembered: each action is a real export of its server module, and each
// control the operator reaches on first paint is in the markup the client
// renders. If someone deletes a form or renames an action, this suite names
// the missing limb. Nothing here reads a source file.

const room = await roomClient();
const roomActions = (await import("../src/app/room/actions")) as Record<string, unknown>;
const ledgerActions = (await import("../src/app/room/ledger-actions")) as Record<
  string,
  unknown
>;
const dashActions = (await import("../src/app/accounts/board-actions")) as Record<
  string,
  unknown
>;
// The shared door hooks (slice 8): the Drop reads, files, holds a verdict and
// takes back through them, so each is a real export too.
const ingestHooks = {
  ...(await import("../src/app/room/ingest/use-ingest")),
  ...(await import("../src/app/room/ingest/use-verdict")),
  ...(await import("../src/app/room/ingest/use-undo")),
} as Record<string, unknown>;
const modules = { room: roomActions, ledger: ledgerActions, dash: dashActions, ingest: ingestHooks };

// A board of two: one live row with open work, an owed line and a sheet; one
// row whose record reads lost, so the judgment banner paints too.
const rows = [
  roomRow({
    owed: [
      {
        noteId: "n9",
        key: "owed-1",
        text: "the September invoices",
        src: "promised on the 9/25 call",
      },
    ],
  }),
  roomRow({
    accountId: "001F000000w38OHIAY",
    cardId: "card-regis",
    name: "Regis HR Group",
    loss: {
      noteId: "n7",
      phrase: "we went with the incumbent",
      date: "9/24",
      status: "lost",
    },
  }),
];
const board = await render(
  createElement(room.RoomClient, {
    rows,
    cadence: [cadenceRow()],
    checkins: [checkinRow()],
    followUps: [followUpRow()],
    warming: [warmRow()],
    later: [],
    canWrite: true,
    dbUnavailable: false,
    boardNames: [],
    pipeline: [],
    pipelineDay: "",
    pipelineStale: "",
  }),
);
// The drawers open on a click, so they paint here on their own: a fresh
// partner, one awaiting a reply, one who replied, and one muted.
const drawer = await render(
  createElement(room.CadenceDrawer, {
    cadence: [
      cadenceRow(),
      cadenceRow({
        partner: "Eric Ronci",
        subjectKey: "roundup:eric",
        status: "awaiting",
        daysAgo: 3,
        due: false,
      }),
      cadenceRow({
        partner: "Dana Whitfield",
        subjectKey: "roundup:dana",
        status: "replied",
        due: false,
      }),
      cadenceRow({ partner: "Sam Okafor", subjectKey: "roundup:sam", muted: true }),
    ],
    checkins: [checkinRow()],
    onClose: () => {},
  }),
);
const eye = await render(
  createElement(room.EyeDrawer, {
    warming: [warmRow()],
    later: [{ id: "001later", body: "Trend HR — Philippines headcount question" }],
    onClose: () => {},
  }),
);
const followUps = await render(createElement(room.FollowUpBlock, { rows: [followUpRow()] }));
// The check-ins tab with nothing due: its empty state is drawer copy too.
const checkinsEmpty = await render(
  createElement(room.CadenceDrawer, {
    cadence: [],
    checkins: [],
    onClose: () => {},
    defaultTab: "checkins",
  }),
);
const all = board + drawer + eye + followUps + checkinsEmpty;

// The operator-facing copy of a render: its text plus every title, placeholder
// and button label the markup carries.
const copyOf = (html: string): string =>
  [
    textOf(html),
    ...[...html.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map((m) => m[1]),
  ].join("\n");

describe("room client — every absorbed capability is wired", () => {
  type Wiring = {
    what: string;
    action: string;
    from: keyof typeof modules;
    /** The control the operator reaches on first paint, when one exists
     *  there; the rest open on a click and keep the server half alone. */
    shows?: RegExp;
  };
  const wirings: Wiring[] = [
    // the old board's stage machinery, whisper-sized
    { what: "stage checklist toggles", action: "toggleCheck", from: "dash" },
    { what: "stage judgment saves", action: "saveNote", from: "dash" },
    { what: "evidence suggestions dismiss", action: "dismissSuggestion", from: "dash" },
    // the old day sheet per account
    {
      what: "composer files notes/actions/schedules",
      action: "roomCompose",
      from: "room",
      shows: /Action — open work on the sheet for Simploy\./,
    },
    // The TODAY register rests folded (the Spring), so the sheet's own
    // controls open on a click and keep the server half alone here.
    { what: "sheet item ops (done/undo/delay/drop)", action: "roomTodoSet", from: "room" },
    { what: "a capture's receipt can undo", action: "roomUnlog", from: "room" },
    { what: "any note can become an action", action: "roomNoteToAction", from: "room" },
    { what: "record entries edit in place", action: "roomRecordEdit", from: "room" },
    { what: "record entries can be deleted", action: "roomRecordDelete", from: "room" },
    {
      what: "paste files to the account",
      action: "roomPaste",
      from: "room",
      shows: /The bolt — paste anything\. It reads and files to Simploy\./,
    },
    { what: "a paste can be undone whole", action: "roomPasteUndo", from: "room" },
    // the shared door: the Drop files, holds a verdict and takes back through the hooks
    {
      what: "the Drop files through the shared door",
      action: "useIngest",
      from: "ingest",
      shows: /File — email, PDF, transcript, spreadsheet, document, or image\./,
    },
    { what: "a disputed paste is held for the pick", action: "useVerdict", from: "ingest" },
    { what: "the paste's take-back is the shared undo", action: "useUndo", from: "ingest" },
    { what: "the move closes for real", action: "roomClose", from: "room", shows: /Mark it done/ },
    // the roundups engine in the drawer
    { what: "copy & mark sent", action: "logTouch", from: "ledger", shows: /Copy &amp; mark sent/ },
    { what: "they replied", action: "markReplied", from: "ledger", shows: /They replied ▸/ },
    { what: "I replied", action: "markResponded", from: "ledger", shows: /I replied ▸/ },
    { what: "archive thread", action: "archiveThread", from: "ledger", shows: />Archive</ },
    {
      what: "mute partner",
      action: "muteRoundupPartner",
      from: "ledger",
      // "Cadence" is a retired name (standing decree; H8): the button says
      // what it mutes. Rewritten from title="mute cadence" in pass 9.
      shows: /title="mute this partner&#x27;s roundups"/,
    },
    { what: "unmute partner", action: "unmuteRoundupPartner", from: "ledger", shows: />restore</ },
    // check-ins
    { what: "push a chase to tomorrow", action: "delayFollowUp", from: "ledger" },
    // the eye (was "then, if there's time")
    { what: "park a warming signal", action: "snoozeSignal", from: "ledger", shows: /Park two weeks/ },
    { what: "dismiss a warming signal", action: "dismissTriage", from: "ledger", shows: />Dismiss</ },
    // the add menu
    {
      what: "arm a follow-up",
      action: "addFollowUp",
      from: "ledger",
      shows: /placeholder="Chase what, with whom…"/,
    },
    // the judgment mechanisms — suggest, operator confirms
    {
      what: "the loss read can retire the card",
      action: "roomMarkLost",
      from: "room",
      shows: /Confirm Closed Lost/,
    },
    {
      what: "the loss read can be waved off",
      action: "roomLossDismiss",
      from: "room",
      shows: /Keep salvaging/,
    },
    { what: "an owed item can open as work", action: "roomOwedAccept", from: "room" },
    { what: "an owed suggestion can be dismissed", action: "roomOwedDismiss", from: "room" },
  ];
  for (const { what, action, from, shows } of wirings) {
    test(`${what} — ${action} is wired`, () => {
      assert.equal(
        typeof modules[from][action],
        "function",
        `${action} has no server half in ${from}`,
      );
      if (shows) assert.match(all, shows, `${action}'s control is missing from the room`);
    });
  }

  test("every cross-page form comes home to /room", () => {
    // Each server-action <form> must carry returnTo=/room or the click
    // strands the operator on the old page. The rows, the drawers and the
    // follow-up block paint their forms here; none is same-page.
    const forms = formsOf(all);
    assert.ok(forms.length >= 10, `only ${forms.length} forms rendered`);
    for (const f of forms) {
      assert.ok(
        /name="returnTo" value="\/room"/.test(f),
        `a form lacks returnTo=/room: ${textOf(f).slice(0, 80)}`,
      );
    }
  });

  test("the one register renders whole: day rules, key, chips, composer", () => {
    const text = textOf(board);
    // The day rule and the record's fold, on every row.
    assert.ok(/\bTODAY\b/.test(text), "the TODAY kicker is missing");
    assert.ok(/EARLIER · 1/.test(text), "the EARLIER rule is missing");
    // The doors (decreed 2026-08-18): note and action are icon doors now,
    // beside the bolt and the file door.
    for (const door of [
      "Note — a line for the record on Simploy.",
      "Action — open work on the sheet for Simploy.",
      "File — email, PDF, transcript, spreadsheet, document, or image.",
    ]) {
      assert.ok(board.includes(`title="${door}"`), `door missing: ${door}`);
    }
    // Today's glyph language, present and keyed once at the foot.
    for (const key of [
      "✉ send",
      "⚖ decide",
      "⚑ owed",
      "✸ action",
      "➤ sent",
      "✓ done",
      "⏲ delayed",
      "✎ note",
    ]) {
      assert.ok(text.includes(key), `glyph missing from the key: ${key}`);
    }
    // The urgency chips are retired — the composer files at default weight.
    assert.ok(!classesOf(board).includes("urgc"), "urgency chips should be retired");
  });

  test("the drawers keep their decreed names — never Cadence", () => {
    const text = textOf(all);
    assert.ok(text.includes("ROUNDUPS"));
    assert.ok(text.includes("CHECK-INS"));
    assert.ok(copyOf(all).includes("Keep an eye out"));
    // Any case, titles included: "mute cadence" and "The cadence is quiet."
    // slipped past a capitalized check (H8).
    assert.ok(!/cadence/i.test(copyOf(all)), "the drawer copy says cadence");
    assert.ok(textOf(checkinsEmpty).includes("No check-ins due."));
  });

  test("operator copy never says steps, and MULTI is the whole badge", () => {
    const copy = copyOf(all);
    assert.ok(!/\bsteps?\b/i.test(copy), "the word 'steps' leaked");
    assert.ok(/\bMULTI\b/.test(textOf(board)));
    assert.ok(!copy.includes("MULTITHREADED"));
  });

  test("account links carry no arrow glyphs", () => {
    assert.ok(!all.includes("↗"));
  });
});

describe("room stylesheet — every class the client asks for exists", () => {
  test("no dangling class references", () => {
    // A CSS module hands back undefined for a class the sheet does not
    // define, so a dangling styles.x paints as class="undefined".
    const dangling = classesOf(all).filter((c) => c === "undefined" || c === "null");
    assert.deepEqual(dangling, [], "classes missing from room.module.css");
  });
});

// H5 (pass 8): UNKNOWN's "· N queued" and the STAGE GATE chip opened nothing.
// The click-depth law: every compression opens, one click deep.
describe("the UNKNOWN register's compressions open (H5)", () => {
  const ask = (id: string, question: string) => ({ id, question, at: "2026-10-01T15:00:00Z" });
  const askRow = roomRow({
    gaps: [ask("g1", "Which countries come first?")],
    gapsQueued: [ask("g2", "Who signs for the client?"), ask("g3", "When is the first hire?")],
    outstanding: {
      item: "Book the room",
      node: "first_meeting",
      index: 0,
      doneKey: "morning:1",
      closedCount: 2,
    },
  });
  const paint = (defaultSpring: "unknown" | null) =>
    render(
      createElement(room.Row, {
        row: askRow,
        collapsed: false,
        onToggle: () => {},
        defaultSpring,
      }),
    );

  test("folded, the queued count is a button that opens the queued asks", async () => {
    const html = await paint(null);
    assert.match(html, /<button type="button" class="sumDoor"[^>]*>· 2 queued<\/button>/);
  });

  test("sprung, the queued count still opens them, and says whether it is open", async () => {
    const html = await paint("unknown");
    assert.match(
      html,
      /<button type="button" class="sumDoor [^"]*" aria-expanded="false"[^>]*>· 2 queued<\/button>/,
    );
    // Shut until asked: the queued asks surface only through the door.
    assert.ok(!textOf(html).includes("Who signs for the client?"));
  });

  test("the STAGE GATE chip is a door to the stage's checklist", async () => {
    const html = await paint("unknown");
    assert.match(
      html,
      /<button type="button" class="gateTag" title="Open the stage&#x27;s checklist">STAGE GATE · 2 BEHIND IT<\/button>/,
    );
  });
});

// H8 and X6, the room's part: the brand palette by role, no ad-hoc forest.
describe("the room's marks wear the brand palette (H8, X6)", () => {
  test("no forest stroke anywhere in the markup", () => {
    assert.ok(!/#1E5B46/i.test(all), "the forest green is back in the markup");
  });
  test("a briefed partner's mark lights by class, the brand's green", async () => {
    const html = await render(
      createElement(room.RoomClient, {
        rows: [roomRow({ briefed: true })],
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
    assert.match(html, /class="briefed briefedOn"/);
    assert.match(html, /stroke="currentColor" stroke-width="2.4"/);
  });
  test("the due count carries its own class so it lights amber on hover", () => {
    assert.match(board, /class="edgeCount edgeDue">2</);
  });
});

// Pass 8 call 1: a row off the board has no card, so it keys by its account
// and paints with no stage.
describe("a row off the board (pass 8 call 1)", () => {
  const offBoard = roomRow({
    accountId: "001F000000OFFB01",
    cardId: "",
    name: "Gulf Coast PEO",
    stages: [],
    outstanding: null,
    climb: {
      frac: 0,
      capTone: "ok",
      label: "NOT ON THE BOARD",
      why: ["No card on the board.", "A fresh message from them or a meeting is on file."],
    },
  });

  test("two rows off the board never share a key or a fold", () => {
    const other = { ...offBoard, accountId: "001F000000OFFB02" };
    assert.notEqual(room.rowKey(offBoard), room.rowKey(other));
    assert.equal(room.rowKey(roomRow()), "card-simploy", "a board row keys by its card");
  });

  test("it paints in the existing face with no stage nodes", async () => {
    const html = await render(
      createElement(room.Row, { row: offBoard, collapsed: false, onToggle: () => {} }),
    );
    assert.ok(textOf(html).includes("NOT ON THE BOARD"));
    assert.ok(!classesOf(html).includes("node"), "a stage node painted");
    assert.ok(textOf(html).includes("Mark it done ✓"), "the move still answers");
  });
});

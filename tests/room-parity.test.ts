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
const modules = { room: roomActions, ledger: ledgerActions, dash: dashActions };

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
const all = board + drawer + eye + followUps;

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
      shows: /title="mute cadence"/,
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
    assert.ok(!/\bCadence\b/.test(copyOf(all)), "a drawer was named Cadence");
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

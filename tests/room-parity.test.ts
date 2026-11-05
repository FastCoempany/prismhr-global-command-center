import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
const modules = {
  room: roomActions,
  ledger: ledgerActions,
  dash: dashActions,
  ingest: ingestHooks,
};

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
const followUps = await render(
  createElement(room.FollowUpBlock, { rows: [followUpRow()] }),
);
// The check-ins tab with nothing due: its empty state is drawer copy too.
const checkinsEmpty = await render(
  createElement(room.CadenceDrawer, {
    cadence: [],
    checkins: [],
    onClose: () => {},
    defaultTab: "checkins",
  }),
);
// The F26 face (ship order 2026-11-04) rests every row as its sentence and
// keeps the Drop, the email and EARLIER behind "Latest email and Chute", so
// the rows' controls paint here opened, each as a click leaves it.
const opened = (
  await Promise.all(
    rows.map((row) =>
      render(
        createElement(room.Row, {
          row,
          collapsed: false,
          onToggle: () => {},
          defaultSpring: "today",
        }),
      ),
    ),
  )
).join("");
const all = board + opened + drawer + eye + followUps + checkinsEmpty;

// The operator-facing copy of a render: its text plus every title, placeholder
// and button label the markup carries.
const copyOf = (html: string): string =>
  [
    textOf(html),
    ...[...html.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map(
      (m) => m[1],
    ),
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
    // the old day sheet per account
    {
      what: "composer files notes/actions/schedules",
      action: "roomCompose",
      from: "room",
      shows: /Action\. Open work on the sheet for Simploy\./,
    },
    { what: "any note can become an action", action: "roomNoteToAction", from: "room" },
    { what: "record entries edit in place", action: "roomRecordEdit", from: "room" },
    { what: "record entries can be deleted", action: "roomRecordDelete", from: "room" },
    {
      what: "paste files to the account",
      action: "roomPaste",
      from: "room",
      shows: /The bolt\. Paste anything\. It reads and files to Simploy\./,
    },
    { what: "a paste can be undone whole", action: "roomPasteUndo", from: "room" },
    // the shared door: the Drop files, holds a verdict and takes back through the hooks
    {
      what: "the Drop files through the shared door",
      action: "useIngest",
      from: "ingest",
      shows: /File\. Email, PDF, transcript, spreadsheet, document, or image\./,
    },
    {
      what: "a disputed paste is held for the pick",
      action: "useVerdict",
      from: "ingest",
    },
    {
      what: "the paste's take-back is the shared undo",
      action: "useUndo",
      from: "ingest",
    },
    {
      what: "the move closes for real",
      action: "roomClose",
      from: "room",
      shows: /Mark it done/,
    },
    // the roundups engine in the drawer
    {
      what: "copy & mark sent",
      action: "logTouch",
      from: "ledger",
      shows: /Copy &amp; mark sent/,
    },
    {
      what: "they replied",
      action: "markReplied",
      from: "ledger",
      shows: /They replied ▸/,
    },
    { what: "I replied", action: "markResponded", from: "ledger", shows: /I replied ▸/ },
    {
      what: "archive thread",
      action: "archiveThread",
      from: "ledger",
      shows: />Archive</,
    },
    {
      what: "mute partner",
      action: "muteRoundupPartner",
      from: "ledger",
      // "Cadence" is a retired name (standing decree; H8): the button says
      // what it mutes. Rewritten from title="mute cadence" in pass 9.
      shows: /title="mute this partner&#x27;s roundups"/,
    },
    {
      what: "unmute partner",
      action: "unmuteRoundupPartner",
      from: "ledger",
      shows: />restore</,
    },
    // check-ins
    { what: "push a chase to tomorrow", action: "delayFollowUp", from: "ledger" },
    // the eye (was "then, if there's time")
    {
      what: "park a warming signal",
      action: "snoozeSignal",
      from: "ledger",
      shows: /Park two weeks/,
    },
    {
      what: "dismiss a warming signal",
      action: "dismissTriage",
      from: "ledger",
      shows: />Dismiss</,
    },
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

  // What left the row with TODAY, UNKNOWN, COMPARABLE and the stage meter
  // (the F26 face, ship order 2026-11-04): the server halves stay, the row
  // no longer calls them, and the stage checklist lives on the Accounts board.
  test("the retired registers' actions left the row", () => {
    const client = readFileSync(
      join(process.cwd(), "src/app/room/room-client.tsx"),
      "utf8",
    );
    for (const gone of [
      "roomTodoSet",
      "roomUnlog",
      "roomOwedAccept",
      "roomOwedDismiss",
      "roomGapsRefill",
      "toggleCheck",
      "saveNote",
      "dismissSuggestion",
    ])
      assert.ok(!client.includes(gone), `${gone} is still on the row`);
  });

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

  test("the Chute section renders whole: its head, the doors, EARLIER and the key", () => {
    const text = textOf(opened);
    assert.ok(/The Chute Files to Simploy/.test(text), "the Chute's head is missing");
    assert.ok(/EARLIER · 1/.test(text), "the EARLIER rule is missing");
    // The doors (decreed 2026-08-18): note and action are icon doors,
    // beside the bolt and the file door, each tooltip naming its door.
    for (const door of [
      "The bolt. Paste anything. It reads and files to Simploy.",
      "Note. A line for the record on Simploy.",
      "Action. Open work on the sheet for Simploy.",
      "File. Email, PDF, transcript, spreadsheet, document, or image.",
    ]) {
      assert.ok(opened.includes(`title="${door}"`), `door missing: ${door}`);
    }
    // The glyphs the row still paints, keyed once at the foot.
    const foot = textOf(board);
    for (const key of [
      "✉ email",
      "➤ sent",
      "☎ call",
      "◷ meeting",
      "✓ done",
      "✎ note",
      "✸ action",
      "⟳ research",
      "⇣ low signal",
      "☑ closed won",
    ]) {
      assert.ok(foot.includes(key), `glyph missing from the key: ${key}`);
    }
    // The urgency chips are retired — the composer files at default weight.
    assert.ok(!classesOf(opened).includes("urgc"), "urgency chips should be retired");
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

// H5 (pass 8) pinned UNKNOWN's queued count and STAGE GATE chip as doors.
// The register left the row with the F26 face (ship order 2026-11-04), and
// neither control paints any more.
describe("the UNKNOWN register left the row (F26)", () => {
  test("no queued count, no stage gate chip, no register line", async () => {
    const html = await render(
      createElement(room.Row, {
        row: roomRow({
          gaps: [
            {
              id: "g1",
              question: "Which countries come first?",
              at: "2026-10-01T15:00:00Z",
            },
          ],
        }),
        collapsed: false,
        onToggle: () => {},
        defaultSpring: "today",
      }),
    );
    for (const c of ["sumDoor", "gateTag", "sumline"])
      assert.ok(!classesOf(html).includes(c), `${c} painted`);
    assert.ok(!textOf(html).includes("Which countries come first?"));
  });
});

// H8 and X6, the room's part: the brand palette by role, no ad-hoc forest.
describe("the room's marks wear the brand palette (H8, X6)", () => {
  test("no forest stroke anywhere in the markup", () => {
    assert.ok(!/#1E5B46/i.test(all), "the forest green is back in the markup");
  });
  test("the partner-briefed notifier left the row (F26)", () => {
    // The partner ladder carries whether the partner is briefed from the
    // second release of the F26 face; the row paints no notifier meanwhile.
    assert.ok(!classesOf(all).includes("briefed"));
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
      why: [
        "No card on the board.",
        "A fresh message from them or a meeting is on file.",
      ],
    },
  });

  test("two rows off the board never share a key or a fold", () => {
    const other = { ...offBoard, accountId: "001F000000OFFB02" };
    assert.notEqual(room.rowKey(offBoard), room.rowKey(other));
    assert.equal(room.rowKey(roomRow()), "card-simploy", "a board row keys by its card");
  });

  test("it paints in the F26 face with no stage nodes", async () => {
    const html = await render(
      createElement(room.Row, { row: offBoard, collapsed: false, onToggle: () => {} }),
    );
    assert.ok(textOf(html).includes("Gulf Coast PEO"));
    assert.ok(!classesOf(html).includes("node"), "a stage node painted");
    assert.ok(textOf(html).includes("Mark it done ✓"), "the move still answers");
  });
});

// A4.20, the HomeRoom face shipped 2026-08-20, gave THEIRS a line atop the
// register panel. The F26 face (ship order 2026-11-04) folds it into the
// move's own door: the move keeps its seat and its words, its tooltip names
// the export's fact, and opened, the verified gems unfold under it, each
// down to its email (the meat law).
describe("THEIRS rides the move's door, and the move keeps its seat (F26)", () => {
  const theirs = {
    label: "MEXICO ASK · PAT LEE",
    gems: [
      {
        term: "MEXICO ASK",
        act: "Answer Pat about Mexico.",
        reason: "They asked on 9/30.",
        whenDay: "2026-09-30",
        cites: [{ k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" }],
      },
    ],
  };
  const paint = (over: Partial<Parameters<typeof roomRow>[0]>) =>
    render(
      createElement(room.Row, {
        row: roomRow(over),
        collapsed: false,
        onToggle: () => {},
      }),
    );
  const moveOf = (html: string) =>
    textOf(/<p class="mvt[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "");

  test("the move keeps its words whether THEIRS speaks or not", async () => {
    const quiet = await paint({});
    const loud = await paint({ theirs });
    assert.equal(moveOf(quiet), "Send the model.");
    assert.equal(moveOf(loud), moveOf(quiet));
    assert.ok(!quiet.includes('class="theirs"'), "no gem, no line");
  });

  test("the move's door names the export's fact, and paints no line of its own", async () => {
    const html = await paint({ theirs });
    assert.match(html, /title="Your Salesforce export: MEXICO ASK · PAT LEE"/);
    assert.ok(!html.includes('class="theirs"'), "THEIRS paints only once the door opens");
  });
});

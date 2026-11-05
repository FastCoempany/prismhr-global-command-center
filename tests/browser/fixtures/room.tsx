// The HomeRoom for the browser suite: three rows, one per MULTI tone, the
// first with a THEIRS gem on its move, each with its sentence's facts and a
// people deck (the F26 face, ship order 2026-11-04), and the drawers' edge
// tabs, in the room's own frame: the Chute at the top, then the board.

import type { RoomRow } from "@/app/room/room-client";
import { RoomFace } from "@/app/room/face";

export const ROW_A = "001F000000w38BOIAY";

const row = (over: Partial<RoomRow>): RoomRow => ({
  accountId: ROW_A,
  theirs: null,
  cardId: "card-simploy",
  name: "Simploy",
  meta: "RESALE · PERU",
  shape: "Shaping up to be EOR",
  identity: [
    {
      label: "employer of record",
      day: "9/25",
      line: "✉ Chassie asked for the invoices.",
    },
    { label: "Peru", day: "9/25", line: "✉ Chassie asked for the invoices." },
  ],
  facts: {
    products: [
      {
        key: "eor",
        word: "employer of record",
        day: "9/25",
        line: "✉ Chassie asked for the invoices.",
      },
    ],
    chair: {
      v: "resale",
      hand: false,
      day: "9/25",
      line: "✉ We'd resell it under our name.",
    },
    client: { name: null, hand: false, day: "" },
    countries: [
      {
        code: "co",
        name: "Colombia",
        hand: false,
        day: "9/25",
        line: "✉ Two hires in Bogotá.",
      },
    ],
    removed: [],
    heads: [
      {
        n: 2,
        country: "co",
        kind: "employee",
        day: "9/25",
        line: "✉ Two hires in Bogotá.",
      },
    ],
    date: {
      iso: "2026-12-01",
      phrase: "by December 1",
      day: "9/25",
      line: "✉ They start by December 1.",
    },
  },
  deck: [
    {
      name: "Chassie Smith",
      title: "VP Operations",
      email: "chassie@example.com",
      phone: "(555) 010-2210",
      mobile: "",
      city: "Raleigh, NC",
      linkedin: null,
      liFrom: null,
      hand: false,
      touches: [
        { at: "2026-09-25T15:00:00Z", kind: "email", dir: "in" },
        { at: "2026-09-26T15:00:00Z", kind: "email", dir: "out" },
      ],
    },
  ],
  sent: [
    {
      id: "fs1",
      at: "2026-11-02T16:00:00.000Z",
      to: "Chassie Smith",
      files: ["agreement-reseller", "onepager-overview"],
    },
  ],
  ladders: {
    partner: {
      k: "warm",
      recordK: "warm",
      hand: false,
      src: { kind: "record", day: "9/25", line: "✉ We'd resell it under our name." },
    },
    client: {
      k: "scoped",
      recordK: "scoped",
      hand: false,
      src: { kind: "record", day: "9/25", line: "✉ They start by December 1." },
    },
    agreement: { n: 0, src: null },
    passed: false,
  },
  multiTone: "y",
  people: [{ name: "Chassie Smith", line: "VP Operations · 2 threads" }],
  briefed: false,
  briefedManual: null,
  sfUrl: null,
  climb: { frac: 0.4, capTone: "ok", label: "needs analysis", why: ["demo booked"] },
  stages: [
    { key: "investigate", label: "Investigate", state: "done", items: [], judgment: "" },
    {
      key: "first_meeting",
      label: "First meeting",
      state: "cur",
      items: [{ item: "Book the room", checked: false, note: "", index: 0 }],
      judgment: "",
    },
  ],
  suggestions: [],
  move: "Send the model.",
  moveFull: "",
  thin: false,
  outstanding: null,
  sheetOpen: [{ id: "todo-1", body: "Send the model." }],
  sheetRest: [],
  sheetDelayed: [],
  sheetDoneToday: [],
  record: [
    {
      id: "n1",
      text: "✉ OL Sep 25 10:22 AM — RE: [EXTERNAL] Invoices · Chassie Smith → Antaeus Coe",
      edit: "RE: [EXTERNAL] Invoices",
      struck: false,
      glyph: "✉",
      day: "9/25",
      time: "10:22 AM",
      who: "",
      line: "Invoices",
      body: "",
      email: {
        dir: "in",
        from: "Chassie Smith",
        to: "you",
        others: [],
        subject: "Invoices",
        kept: "Chassie asked for the invoices.",
        read: true,
        owed: [],
        answered: "",
        closer: false,
        twice: false,
      },
    },
  ],
  recordTotal: 1,
  backgroundTotal: 0,
  loss: null,
  owed: [],
  outcome: null,
  gaps: [],
  gapsQueued: [],
  peers: [],
  askHref: "/intranet?q=Simploy",
  researchAt: "",
  health: "amber",
  rank: 1,
  workedToday: false,
  canWrite: true,
  ...over,
});

/** The row builder, for the fixtures that need one row of their own. */
export { row as roomRow };

const ROWS: RoomRow[] = [
  row({
    multiTone: "r",
    // The newest email in the left column (ship order 2026-10-20), as most
    // rows show it on launch day and the most a row can arrive with: filed
    // before whole emails were kept, so the read's line says so, and its
    // synopsis long enough to meet the right panel and take the door.
    latestEmail: {
      id: "n1",
      day: "9/25",
      time: "10:22 AM",
      logged: false,
      dir: "in",
      from: "Chassie Smith",
      to: "you",
      others: ["Dana Reyes"],
      subject: "Invoices",
      kept: "Chassie asked for the invoices from the moving company's current provider, so the team can see what the client pays for its India admin workers today and where the separate site and its billing come from. She wants the reseller route with their own markup, and says the client asked whether everything could sit in one place. The client is on a month-to-month term as far as she knows, and she will confirm it with them this week. She is open to a slight premium for consolidation and says there is no rush.",
      read: true,
      whole: null,
      missing: "before",
    },
    theirs: {
      label: "ASKED ABOUT MEXICO · 9/30",
      gems: [
        {
          term: "MEXICO ASK",
          act: "Answer Chassie about Mexico.",
          reason: "They asked on 9/30.",
          whenDay: "2026-09-30",
          cites: [
            { k: "r1", day: "2026-09-30", who: "Chassie Smith", subject: "Mexico" },
          ],
        },
      ],
    },
    gaps: [
      {
        id: "g1",
        question:
          "Which of their clients is hiring outside the country first, and has anyone promised that hire a start date, a salary or a title yet?",
        at: "2026-10-01T15:00:00Z",
      },
      { id: "g2", question: "Who runs payroll there today?", at: "2026-10-01T15:00:00Z" },
    ],
    peers: [
      {
        question: "How fast can a hire start in Mexico?",
        shared: "Mexico hire",
        findHref: "/intranet?q=mexico",
      },
    ],
  }),
  row({
    accountId: "001F000000w38OHIAY",
    cardId: "card-regis",
    name: "Regis HR Group",
    shape: "GP",
    identity: [{ label: "GP", day: "", line: "No product on file. GP is the default." }],
    multiTone: "y",
    rank: 2,
  }),
  row({
    accountId: "001F000000w38ZZIAY",
    cardId: "card-axcet",
    name: "Axcet HR",
    shape: "GP",
    identity: [{ label: "GP", day: "", line: "No product on file. GP is the default." }],
    multiTone: "g",
    rank: 3,
  }),
];

export default function Fixture() {
  // The page's own frame (src/app/room/page.tsx renders RoomFace).
  return (
    <RoomFace
      fontVars="harness-room-fonts"
      room={{
        rows: ROWS,
        cadence: [],
        checkins: [
          {
            subjectKey: "outreach:001simploy",
            label: "Simploy",
            ask: "the signed order form",
            quietDays: 4,
            kind: "partner",
          },
        ],
        followUps: [
          {
            subjectKey: "manual:abc-123",
            label: "chase Acme Logistics about their Brazil hires",
            armedAt: "2026-09-25T15:00:00Z",
            filed: ["Simploy"],
            newName: "Acme Logistics",
          },
        ],
        warming: [],
        later: [],
        canWrite: true,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }}
    />
  );
}

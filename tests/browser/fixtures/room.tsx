// The HomeRoom for the browser suite: three rows, one per MULTI tone, the
// first with every register the Spring draws (THEIRS, UNKNOWN with asks,
// COMPARABLE with a peer, TODAY), and the drawers' edge tabs, in the room's
// own frame: the Chute at the top, then the board.

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
    { id: "n1", t: "9/25", text: "✉ Chassie asked for the invoices.", struck: false },
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

const ROWS: RoomRow[] = [
  row({
    multiTone: "r",
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
    name: "Regis HR Group",
    shape: "GP",
    identity: [{ label: "GP", day: "", line: "No product on file. GP is the default." }],
    multiTone: "y",
    rank: 2,
  }),
  row({
    accountId: "001F000000w38ZZIAY",
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

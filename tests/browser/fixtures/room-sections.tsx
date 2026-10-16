// The HomeRoom's three sections for the browser suite: one live row, one row
// marked low signal, one closed row, in the order the page sorts them.

import { RoomFace } from "@/app/room/face";
import { roomRow } from "./room";

export default function Fixture() {
  return (
    <RoomFace
      fontVars="harness-room-fonts"
      room={{
        rows: [
          roomRow({}),
          roomRow({
            accountId: "001F000000w38OHIAY",
            cardId: "card-regis",
            name: "Regis HR Group",
            lowSignal: true,
            rank: 2,
          }),
          roomRow({
            accountId: "001F000000w38ZZIAY",
            cardId: "card-axcet",
            name: "Axcet HR",
            outcome: { status: "lost", phrase: "", at: "2026-10-01T15:00:00Z" },
            rank: 3,
          }),
        ],
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
      }}
    />
  );
}

// A HomeRoom row whose account filed today, for the browser suite: TODAY is
// rebuilt from the record's filings of today (decreed 2026-10-13), so the
// receipt and its ↺ are there on arrival, as after a reload. One filing ran
// with the reader down, as the Infiniti HR thread did on 10/13.

import { RoomFace } from "@/app/room/face";
import { ROW_A, roomRow } from "./room";

export const FILING = "f-today-1";

export default function Fixture() {
  return (
    <RoomFace
      fontVars="harness-room-fonts"
      room={{
        rows: [
          roomRow({
            accountId: ROW_A,
            todayFilings: [
              {
                filingId: FILING,
                accountId: ROW_A,
                at: "2026-10-13T15:11:21.000Z",
                day: "10/13",
                filed: 33,
                opened: 0,
                promises: 0,
                asks: 0,
                learned: 0,
                degraded: true,
                windows: [],
                dupeCheck: "ran",
              },
            ],
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

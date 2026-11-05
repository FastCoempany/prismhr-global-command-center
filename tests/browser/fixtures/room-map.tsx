// The HomeRoom's map with every country the table places (the F26 face; the
// founder's map order of 2026-11-05): each tone in turn, so the suite can
// check that every dot pulses, sits on its country's point, and brings its
// label forward when hovered.

import { useState } from "react";
import { RoomMap } from "@/app/room/f-face";
import { GEO } from "@/lib/room/world-map";

const TONES = ["hot", "warm", "cool", "none"] as const;

export default function Fixture() {
  const [selected, setSelected] = useState<string | null>(null);
  const countries = Object.keys(GEO).map((code, i) => ({
    code,
    deals: [{ key: code, name: `Deal ${code}`, n: 2 }],
    people: 2,
    kinds: [null],
    unsaid: 0,
    tone: TONES[i % 4]!,
    days: i % 4 === 0 ? 10 : null,
  }));
  return (
    <div style={{ width: 1360 }}>
      <RoomMap countries={countries} selected={selected} onPick={setSelected} />
    </div>
  );
}

// The HomeRoom's frame as it paints from what the page derived: ONE intake
// at the top, the Chute (decided 2026-08-11), then the board. The page holds
// the reads; this holds the frame, so the suite can render it (pass 11, as
// Groundwork's face.tsx and the Sendbook's register.tsx do).

import type { ComponentProps } from "react";
import { Chute } from "./chute";
import { RoomClient } from "./room-client";
import styles from "./room.module.css";

export function RoomFace({
  fontVars,
  room,
}: {
  /** The room's next/font variables, set on its frame. */
  fontVars: string;
  room: ComponentProps<typeof RoomClient>;
}) {
  return (
    <main className={`${styles.room} ${fontVars}`}>
      {/* The Chute routes on the server over the joined roster (C2, D13);
          no roster rides the page. */}
      <Chute canWrite={room.canWrite} />
      <RoomClient {...room} />
    </main>
  );
}

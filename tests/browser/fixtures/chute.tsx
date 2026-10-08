// The Chute as the HomeRoom mounts it, at the top of the room's frame
// (src/app/room/page.tsx), for a session that can write.

import { Chute } from "@/app/room/chute";
import styles from "@/app/room/room.module.css";

export default function Fixture() {
  return (
    <main className={styles.room}>
      <Chute canWrite />
    </main>
  );
}

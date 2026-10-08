// The Intranet for the browser suite, in the page's frame
// (src/app/intranet/page.tsx): one Send-it digest whose counts are doors, so
// a claim can be drilled to its passage and the drawer's account link read.

import { IntranetClient } from "@/app/intranet/intranet-client";
import { foundDoor } from "@/lib/intranet/ledger";
import styles from "@/app/command-center.module.css";

const found = foundDoor([{ id: "cl1", kind: "commitment" }])!;

export default function Fixture() {
  return (
    <main className={styles.wrap}>
      <IntranetClient
        rail={[]}
        initialQ=""
        empty={false}
        staleness=""
        queue={{ pending: 0, unindexed: 0 }}
        ledger={[
          {
            kind: "fed",
            id: "cap1",
            at: "2026-10-08T15:00:00Z",
            space: "Simploy renewal",
            title: "Simploy renewal",
            origin: "teams",
            lines: ["Got it. 4 messages.", found.line],
            briefs: [],
            detail: [],
            doors: { found },
          },
        ]}
        archive={[]}
        countries={[]}
        nowIso="2026-10-08T16:00:00Z"
        canWrite
        canAnswer
      />
    </main>
  );
}

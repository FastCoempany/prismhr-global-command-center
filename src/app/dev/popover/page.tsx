// Dev harness — renders the Focus-chip work box with SEEDED FAKE DATA so the
// popover can be exercised and screenshotted without a database. Not linked
// from anywhere; used to verify UI against the approved mocks before shipping.

import { AccountChip } from "../../today/account-chip";
import styles from "../../command-center.module.css";

export const dynamic = "force-dynamic";

const NOTES = [
  {
    id: "n1",
    kind: "mine",
    body: "Intro call: Buffalo border PEO, D'Youville, ~300-EE standalone CN prospect",
    createdAt: "2026-07-16T14:00:00.000Z",
  },
  {
    id: "n2",
    kind: "partner",
    body: "Lesha: Hatton wants platform answer before team demo",
    createdAt: "2026-07-15T16:00:00.000Z",
  },
  {
    id: "n3",
    kind: "mine",
    body: "MPEX rails + Prism front door = native story, no 3rd parties",
    createdAt: "2026-07-15T13:00:00.000Z",
  },
  {
    id: "n4",
    kind: "mine",
    body: "Hatton ruled out EOR — pure Global Payroll deal",
    createdAt: "2026-07-14T15:00:00.000Z",
  },
];

function chip(id: string, name: string, score: number) {
  return (
    <AccountChip
      account={{ id, name, score, play: null }}
      partner="Lesha Cyphers"
      tone="fresh"
      lastNoteAt="2026-07-16T14:00:00.000Z"
      card={{
        id: "c1",
        stages: [
          { key: "investigate", label: "Investigate", state: "done" },
          { key: "engaged", label: "Partner engaged & seeded", state: "active" },
          { key: "usecase", label: "Use case & options", state: "todo" },
        ],
      }}
      seedSubtitle="Lesha Cyphers"
      seedDiscovery=""
      disposition={null}
      notes={NOTES}
    />
  );
}

export default function PopoverHarness() {
  return (
    <main
      style={{
        padding: "40px 40px 0",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Popover harness (fake data)</h1>
      <div className={styles.focusRow}>
        {chip("dev-1", "Employer Services Corporation (ESC)", 90)}
      </div>
      {/* A chip pinned near the bottom of the viewport — exercises the
          flip-above + internal-scroll behavior. */}
      <div
        className={styles.focusRow}
        style={{ position: "absolute", bottom: 24, left: 40 }}
      >
        {chip("dev-2", "Infiniti HR (bottom of screen)", 87)}
      </div>
    </main>
  );
}

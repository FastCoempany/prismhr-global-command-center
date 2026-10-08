// A Playbook second-record draft card as the page paints it
// (src/app/playbook/page.tsx), with its door to the cases.

import { DraftEvidence } from "@/app/playbook/draft-evidence";
import styles from "@/app/command-center.module.css";

export default function Fixture() {
  return (
    <main className={styles.wrap}>
      <div className="srDraftCard">
        <p>
          Support traffic keeps hitting &quot;Ontario payroll&quot;: 7 cases across 2
          accounts this window. Say how Global sits beside it.
        </p>
        <DraftEvidence
          theme="Ontario payroll"
          accounts={[
            { id: "001F000000w38BOIAY", name: "Simploy", n: 5 },
            { id: "001F000000w38OHIAY", name: "Regis HR Group", n: 2 },
          ]}
        />
      </div>
    </main>
  );
}

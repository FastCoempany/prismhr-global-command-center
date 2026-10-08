// Groundwork's working-file pieces the page composes for a roundup slot
// (src/app/groundwork/page.tsx): the folded CSM prep under the composed
// thing, and the MULTI badge in every tone, in the page's frame.

import { CsmPrep, MultiBadge } from "@/app/groundwork/face";
import styles from "@/app/groundwork/groundwork.module.css";

const ACCT = "001F000000w38BOIAY";

export default function Fixture() {
  return (
    <main className={styles.wrap}>
      <div className={styles.draft}>
        <span>The composed thing</span>
        <CsmPrep
          accountId={ACCT}
          rows={[
            { k: "c1", day: "2026-10-01", who: "Lesha Cyphers", subject: "Renewal" },
            { k: "c2", day: "2026-09-24", who: "Lesha Cyphers", subject: "QBR notes" },
            { k: "c3", day: "2026-09-10", who: "Lesha Cyphers", subject: "Census" },
          ]}
        />
        <CsmPrep accountId={ACCT} rows={[]} />
      </div>
      <div className={styles.people} id="multis">
        <MultiBadge count={0} />
        <MultiBadge count={1} />
        <MultiBadge count={2} />
        <MultiBadge count={5} />
      </div>
    </main>
  );
}

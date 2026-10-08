// Groundwork's stage with its Evidence Chips, as the page hands them: the
// chip row rides the stage's body, beneath the action and the reason
// (src/app/groundwork/page.tsx). One chip of every kind.

import { GroundworkFace } from "@/app/groundwork/face";
import EvidenceChips from "@/app/groundwork/evidence-chips";
import type { QueueItem } from "@/lib/groundwork/day";

const ACCT = "001F000000w38BOIAY";
const item: QueueItem = {
  accountId: ACCT,
  name: "Simploy",
  ruleId: "second-record-gem",
  weight: 90,
  band: "now",
  action: "Answer Pat about Mexico.",
  reason: "They asked on 9/30.",
  owed: "draft composed",
  carried: false,
  intent: null,
};

export default function Fixture() {
  return (
    <GroundworkFace
      nudge={false}
      canWrite
      done={[]}
      stage={{
        item,
        prox: "",
        body: (
          <EvidenceChips
            accountId={ACCT}
            gems={[
              {
                term: "MEXICO ASK",
                act: "Answer Pat about Mexico.",
                reason: "They asked on 9/30.",
                whenDay: "2026-09-30",
                cites: [{ k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" }],
              },
            ]}
            support={{
              total: 14,
              spikeDay: "2026-09-12",
              spikeN: 5,
              spikeCites: [{ k: "s1", day: "2026-09-12", who: "Dana Ruiz", subject: "Ontario payroll" }],
            }}
            intent={{ opens30: 4, clicks30: 1, lastOpen: "2026-09-28", sends7: 0 }}
            collision={{
              mktgSends7: 0,
              colleague: { who: "Lesha Cyphers", day: "2026-10-01", cite: { k: "c1", day: "2026-10-01", who: "Lesha Cyphers", subject: "Renewal" } },
            }}
          />
        ),
      }}
      waiting={[]}
      rest={[]}
      hrefOf={(q) => `/groundwork?focus=${q.accountId}`}
      deck={{
        canWrite: true,
        wire: [],
        wireCount: 0,
        wireAll: false,
        wireHref: "/groundwork?wire=all",
        wireAvailable: false,
        wireIsDue: false,
        inst: null,
        readout: { sections: [] },
        readoutPayload: "",
        lintIssues: [],
        readoutReadAt: undefined,
        idToName: (id) => id,
        wireWhen: () => "",
        monthDay: () => "",
      }}
      foot={{
        week: { total: 0, byChannel: [], accounts: 0, replied: 0, neverMet: 0, goneCold: 0 },
        staleDropDays: null,
      }}
    />
  );
}

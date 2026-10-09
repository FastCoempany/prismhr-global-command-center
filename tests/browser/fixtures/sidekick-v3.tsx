// The flow-first sidekick for the browser suite (pass 15): the master flow,
// its screens and companion, no demo account and nothing saved.

import { SidekickV3Client } from "@/app/sidekick-v3/sidekick-v3-client";
import { flowScreens, v3Companion, v3MasterFlow } from "@/lib/sidekick-v3";

export default function Fixture() {
  return (
    <main>
      <SidekickV3Client
        flow={v3MasterFlow}
        screens={flowScreens(v3MasterFlow)}
        companion={v3Companion}
        accounts={[]}
        activeAccount={null}
        notes={{}}
        playbooks={[]}
        editedIds={[]}
        canWrite={true}
        dbUnavailable={false}
        justSaved={false}
      />
    </main>
  );
}

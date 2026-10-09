// The demo sidekick for the browser suite (pass 15): the catalog's modules
// and screens, no demo account and nothing saved.

import { SidekickClient } from "@/app/sidekick/sidekick-client";
import { modules, screens } from "@/lib/catalog";

export default function Fixture() {
  return (
    <main>
      <SidekickClient
        modules={modules}
        screens={screens}
        accounts={[]}
        activeAccount={null}
        notes={{}}
        pinnedScreenIds={[]}
        playbooks={[]}
        editedIds={[]}
        canWrite={true}
        dbUnavailable={false}
        justSaved={false}
      />
    </main>
  );
}

// Groundwork's face for the browser suite: the Klaxon, the wings, the deck
// and the foot, as the page hands them (src/app/groundwork/page.tsx). The
// stage holds one account; the waiting wing holds one of each heat, and the
// rest waits behind its fold. The clock is the page's own (the harness fixes
// it per test).

import { GroundworkFace } from "@/app/groundwork/face";
import type { QueueItem } from "@/lib/groundwork/day";

const item = (over: Partial<QueueItem>): QueueItem => ({
  accountId: "S0000000000000001",
  name: "On Stage",
  ruleId: "wire-trigger",
  weight: 88,
  band: "now",
  action: "Send the note about the news.",
  reason: "They made the wire July 29.",
  owed: "draft composed",
  carried: false,
  intent: null,
  ...over,
});

export default function Fixture() {
  return (
    <GroundworkFace
      nudge={false}
      canWrite
      done={[
        // A filed touch's channel line opens to the name whole and the
        // touch's words, as the page hands it (channelOpens).
        { name: "Worked One", at: "9:10 AM", sub: "EMAIL · STEP 1 · PAT E.", mk: "W1:wire-trigger", accountId: "W1", opens: { lines: ["To Pat Eriksen.", "Re: the Mexico hires"] } },
      ]}
      stage={{ item: item({}), prox: "", body: null }}
      waiting={[
        item({ accountId: "H1", name: "Burns", ruleId: "wire-trigger", reason: "They made the wire." }),
        item({ accountId: "H2", name: "Dated", ruleId: "silence-bump", reason: "No reply since July 22." }),
        item({ accountId: "H3", name: "Keeps", ruleId: "stakeholder-gap", reason: "One person carries it." }),
      ]}
      rest={[item({ accountId: "R1", name: "Rest One", ruleId: "stakeholder-gap", reason: "The book knows no one." })]}
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

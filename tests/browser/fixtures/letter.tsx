// Groundwork's face with the draft on the stage (ship order 2026-10-19), as
// the page hands it: an email move's letter, the run's pips, the Why fold
// with its plain lines, and a waiting wing that marks the drafted moves. The
// run is on, as it is inside the send band. People and addresses are
// synthetic.

import { GroundworkFace } from "@/app/groundwork/face";
import { StageLetter } from "@/app/groundwork/letter";
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
        {
          name: "Worked One",
          at: "9:10 AM",
          sub: "EMAIL · STEP 1 · PAT E.",
          mk: "W1:wire-trigger",
          accountId: "W1",
          opens: { lines: ["To Pat Eriksen.", "Re: the Mexico hires"] },
        },
        {
          name: "Sent One",
          at: "9:20 AM",
          sub: "SENT · WAITING ON THE COPY",
          mk: "W2:intent-warm",
          accountId: "W2",
        },
        {
          name: "From Outlook",
          at: "9:25 AM",
          sub: "EMAIL · STEP 1 · DANA M.",
          mk: "",
          accountId: "W3",
        },
      ]}
      stage={{
        item: item({ action: "Email Cristina." }),
        prox: "",
        body: (
          <StageLetter
            accountId="S0000000000000001"
            mk="S0000000000000001:wire-trigger"
            to={{
              name: "Cristina Bell",
              title: "VP, Client Services",
              email: "cristina@onstage.example",
            }}
            subject="Your news on the 29th"
            body={
              "Hi Cristina,\n\nSaw the announcement on the 29th. Congratulations to the team.\n\nIf any of your clients have asked about hiring outside the US, I can walk you through how we handle it.\n\nWant me to send a couple of times?\n\nAntaeus"
            }
            drafted="Drafted 6:02 AM from the record"
            instruction="Keep it short. Marketing sent 907 this week."
            canWrite
            nextHref="/groundwork?focus=H1&run=1"
            run={{
              on: true,
              pips: ["seen", "sent", "now", "left", "left"],
              sent: 2,
              toggleHref: "/groundwork?run=0",
            }}
            why={
              <details className="whyFoldFixture" data-why>
                <summary>Why this note ▾</summary>
                <p>They opened 176 and clicked 9 marketing emails in 30 days.</p>
              </details>
            }
            other={<button type="button">Worked it</button>}
          />
        ),
      }}
      drafted={new Set(["H1", "H2"])}
      waiting={[
        item({
          accountId: "H1",
          name: "Burns",
          ruleId: "wire-trigger",
          reason: "They made the wire.",
        }),
        item({
          accountId: "H2",
          name: "Dated",
          ruleId: "silence-bump",
          reason: "No reply since July 22.",
        }),
        item({
          accountId: "H3",
          name: "Keeps",
          ruleId: "stakeholder-gap",
          reason: "One person carries it.",
        }),
      ]}
      rest={[
        item({
          accountId: "R1",
          name: "Rest One",
          ruleId: "stakeholder-gap",
          reason: "The book knows no one.",
        }),
      ]}
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
        week: {
          total: 0,
          byChannel: [],
          accounts: 0,
          replied: 0,
          neverMet: 0,
          goneCold: 0,
        },
        staleDropDays: null,
      }}
    />
  );
}

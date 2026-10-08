// The Accounts sheet for the browser suite: one row with a live gem (the
// chip, its cites, an earlier acted gem), then enough plain rows that the
// page scrolls, so the Act Lane's stickiness can be read.

import { AccountsClient, type AccountRow } from "@/app/accounts-client";
import { EMPTY_ENGAGEMENT } from "@/lib/engagement";
import styles from "@/app/command-center.module.css";

const row = (over: Record<string, unknown>): AccountRow =>
  ({
    id: "001F000000w38BOIAY",
    second: null,
    touch: null,
    touchCite: null,
    collision: null,
    actDraft: null,
    actedDay: "",
    actedTerm: "",
    acted: [],
    onBoard: false,
    name: "Simploy",
    industry: "PEO",
    sizeBucket: "",
    size: 0,
    city: "",
    state: "",
    csm: "Anika Steenstra",
    cloud: "",
    website: "",
    contactName: "Pat Lee",
    contactEmail: "pat@simploy.com",
    incumbent: false,
    deskScore: 50,
    demand: null,
    confidence: "low",
    signals: [],
    evidence: [],
    summary: "",
    researched: false,
    play: null,
    competitors: [],
    countries: [],
    demandAdj: null,
    confFactor: 1,
    score: 50,
    tier: "medium",
    breakdown: { scale: 1, incumbency: 1, model: 1, recency: 1 },
    validation: null,
    engagement: EMPTY_ENGAGEMENT,
    risk: null,
    disposition: null,
    notes: [],
    chipNotes: [],
    bgNotes: [],
    people: [],
    contactCount: 0,
    stage: "NOT_TOUCHED",
    approach: "NEEDS_CSM",
    intent: "UNKNOWN",
    blended: 0,
    nextAction: null,
    nextActionDate: null,
    peoNotes: null,
    ...over,
  }) as unknown as AccountRow;

const LIVE = row({
  second: {
    gems: [
      {
        term: "MEXICO ASK",
        act: "Answer Pat about Mexico.",
        reason: "They asked on 9/30.",
        whenDay: "2026-09-30",
        cites: [{ k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" }],
      },
    ],
    act: "Answer Pat about Mexico.",
    verdict: "",
    supportTotal: 0,
    spikeDay: "",
  },
  acted: [{ term: "CANADA ASK", act: "Send the Canada one-pager.", actedDay: "2026-09-20" }],
  touch: { who: "Pat Lee", day: "2026-09-22", kind: "theirs", record: "record" },
  touchCite: { from: "record", day: "2026-09-22", who: "Pat Lee", how: "REPLY", text: "Can we talk Mexico?" },
  score: 90,
});

const PLAIN = Array.from({ length: 30 }, (_, i) =>
  row({
    id: `001F00000${String(i).padStart(9, "0")}`,
    name: `Plain ${String.fromCharCode(65 + (i % 26))}${i}`,
    score: 10 + i,
    csm: i % 2 ? "Lesha Cyphers" : "Anika Steenstra",
  }),
);

export default function Fixture() {
  // The page's own frame (src/app/accounts/page.tsx): the wrap carries the
  // sheet's color tokens.
  return (
    <main className={styles.wrap}>
      <AccountsClient rows={[LIVE, ...PLAIN]} canAdd canWrite onDashboard={[]} />
    </main>
  );
}

// Groundwork with the Sales Nav spine (ship order 2026-10-15), for the
// browser suite: the groundwork fixture's face with the fourth column. The
// spine's cards are what the page hands down; Nextep and Engage PEO are the
// operator's own digest of 2026-10-13, the people are made up.
//
// Groundwork's face for the browser suite: the Klaxon, the wings, the deck
// and the foot, as the page hands them (src/app/groundwork/page.tsx). The
// stage holds one account; the waiting wing holds one of each heat, and the
// rest waits behind its fold. The clock is the page's own (the harness fixes
// it per test).

import { GroundworkFace } from "@/app/groundwork/face";
import type { QueueItem } from "@/lib/groundwork/day";
import { SpineColumn, type SpineCard } from "@/app/groundwork/spine";

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

const card = (over: Partial<SpineCard>): SpineCard => ({
  key: "k0",
  kind: "active",
  label: "Employees active",
  accountId: "N0000000000000001",
  account: "Nextep",
  who: "",
  title: "",
  company: "",
  line: "Their employees are active on LinkedIn.",
  quote: "",
  at: "2026-07-30T13:10:00Z",
  when: "today",
  links: [
    {
      label: "See who's active",
      href: "https://www.linkedin.com/sales/search/people?searchQuery=(companyV2:(includedValues:List((id:52947,text:Nextep)),scope:CURRENT))",
    },
    { label: "Account", href: "https://www.linkedin.com/sales/company/52947" },
  ],
  rule: null,
  draft: null,
  sf: "https://prismhr.lightning.force.com/lightning/r/Account/001F000000w38ItIAI/view",
  sfNew: null,
  worked: false,
  workedToday: false,
  ...over,
});

export const SPINE: SpineCard[] = [
  card({
    key: "a1",
    kind: "new-in-seat",
    label: "New in seat",
    accountId: "A0000000000000001",
    account: "Armhr",
    who: "Deborah Dhuy",
    title: "Director of Project Services",
    line: "Recently hired, by Sales Navigator's badge.",
    at: "2026-07-30T14:00:00Z",
    links: [
      {
        label: "Find in Sales Nav",
        href: "https://www.linkedin.com/sales/search/people?query=(keywords%3ADeborah%20Dhuy)",
      },
      {
        label: "Account",
        href: "https://www.linkedin.com/sales/search/company?query=(keywords%3AArmhr)",
      },
    ],
    rule: "new-in-seat",
    draft: {
      to: "Deborah Dhuy",
      email: "deborah.dhuy@armhr.example",
      subject: "Congrats on the new role",
      body: "Hi Deborah — congrats on the new role as Director of Project Services at Armhr.",
      via: "Email · on file",
    },
    sfNew:
      "https://prismhr.lightning.force.com/lightning/o/Contact/new?defaultFieldValues=AccountId=001F000000w38OIIAY,FirstName=Deborah,LastName=Dhuy",
  }),
  card({ key: "a2" }),
  card({
    key: "a3",
    kind: "posted",
    label: "Posted",
    accountId: "S0000000000000002",
    account: "AlphaStaffHCM",
    who: "Allie Menz",
    title: "Head of Client Operations",
    line: "Shared a post on LinkedIn.",
    quote: "Clients keep asking how to hire in Mexico without an entity",
    at: "2026-07-29T15:00:00Z",
    when: "yesterday",
    links: [
      {
        label: "Post",
        href: "https://www.linkedin.com/sales/alert/urn:li:ugcPost:7515493319590744064",
      },
      {
        label: "InMail",
        href: "https://www.linkedin.com/sales/lead/ADoAAD,NAME_SEARCH,nSec?msgType=inmail",
      },
      { label: "Account", href: "https://www.linkedin.com/sales/company/39978" },
    ],
    rule: "post-trigger",
    draft: {
      to: "Allie Menz",
      email: "",
      subject: "",
      body: 'Hi Allie — saw your post about "Clients keep asking how to hire in Mexico without an entity".',
      via: "LinkedIn message",
    },
  }),
  card({
    key: "a4",
    label: "Leadership active",
    accountId: "E0000000000000001",
    account: "Engage PEO",
    line: "Their leadership is active on LinkedIn.",
    at: "2026-07-29T15:00:00Z",
    when: "yesterday",
  }),
  card({
    key: "a5",
    kind: "left",
    label: "Left for Nextep",
    accountId: "A0000000000000001",
    account: "Armhr",
    who: "Jordan Ellis",
    title: "VP of Operations",
    company: "Nextep",
    line: "Took a role at Nextep.",
    at: "2026-07-25T15:00:00Z",
    when: "week",
    rule: "contact-left",
    worked: true,
    workedToday: true,
    draft: {
      to: "Jordan Ellis",
      email: "",
      subject: "",
      body: "Hi Jordan — congrats on the move to Nextep.",
      via: "LinkedIn message · their old address is gone",
    },
  }),
  card({
    key: "m1",
    label: "Leadership active",
    accountId: "E0000000000000001",
    account: "Engage PEO",
    line: "Their leadership is active on LinkedIn.",
    at: "2026-07-08T15:00:00Z",
    when: "2026-07",
  }),
  card({
    key: "m2",
    kind: "posted",
    label: "Posted",
    accountId: "S0000000000000002",
    account: "AlphaStaffHCM",
    who: "Cristina Bouchard",
    title: "President & CEO",
    line: "Shared a post on LinkedIn.",
    at: "2026-06-12T15:00:00Z",
    when: "2026-06",
    rule: "post-trigger",
    draft: {
      to: "Cristina Bouchard",
      email: "",
      subject: "",
      body: "Hi Cristina — saw your post.",
      via: "LinkedIn message",
    },
  }),
];

export default function Fixture() {
  return (
    <GroundworkFace
      spine={
        <SpineColumn
          cards={SPINE}
          hidden={[{ key: "h1", label: "Base.com · Company post" }]}
          muted={[]}
          canWrite
          nowMonth="2026-07"
        />
      }
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
      ]}
      stage={{ item: item({}), prox: "", body: null }}
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

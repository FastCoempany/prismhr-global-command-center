// The HomeRoom row with the email in it (ship order 2026-10-20; docs/mockups/
// homeroom-email-row-2026-10-20.html, Concept A): a long latest email, so the
// column caps at the right panel's height, and an EARLIER list holding every
// kind of line: an inbound with an Owed line, a send, a worked move, an
// inbound a send answered, the same email filed twice, and a sign-off.

import type { RoomRow } from "@/app/room/room-client";
import type { RecordLine } from "@/lib/room/email-row";
import { RoomFace } from "@/app/room/face";
import { roomRow } from "./room";

const OTHERS = ["Elise Munoz", "Sam Ortiz", "Matthew Cooper"];

const email = (
  over: Partial<NonNullable<RecordLine["email"]>>,
): NonNullable<RecordLine["email"]> => ({
  dir: "in",
  from: "Dana Reyes",
  to: "you",
  others: OTHERS,
  subject: "Intro to your Global Business Consultant",
  kept: "",
  read: true,
  owed: [],
  answered: "",
  closer: false,
  twice: false,
  ...over,
});

const line = (over: Partial<RecordLine>): RecordLine => ({
  id: "x",
  text: "✉ OL Oct 20 9:10 AM — RE: Re: [EXTERNAL] Re: Intro to your Global Business Consultant · Dana Reyes → Antaeus Coe +3",
  struck: false,
  glyph: "✉",
  day: "10/20",
  time: "9:10 AM",
  who: "",
  line: "Intro to your Global Business Consultant",
  body: "",
  email: null,
  ...over,
});

export const RECORD: RecordLine[] = [
  line({
    id: "e6",
    email: email({
      kept: "They chose the reseller model and want the agreement for their legal team to review. Asks for a Wednesday or Thursday afternoon to go over what comes next.",
      owed: [{ mine: true, who: "Antaeus", text: "Send the reseller agreement", closed: "" }],
    }),
  }),
  line({
    id: "e5",
    day: "10/16",
    time: "11:01 AM",
    email: email({
      dir: "out",
      from: "you",
      to: "Dana Reyes",
      kept: "Lays out the order: decide the partner model first, then the client's questions.",
    }),
  }),
  line({
    id: "n1",
    glyph: "✓",
    struck: true,
    day: "10/16",
    time: "11:03 AM",
    text: "✓ Worked the move · Answer Dana",
    line: "Worked the move · Answer Dana",
    body: "Marked done from the HomeRoom after the 11:01 AM email went out.",
  }),
  line({
    id: "e3",
    day: "10/15",
    time: "9:38 AM",
    email: email({
      kept: "Says the team is working through the numbers. Asks for demo times next week.",
      answered: "10/16",
    }),
  }),
  line({
    id: "e2",
    day: "10/15",
    time: "9:38 AM",
    email: email({
      kept: "Says the team is working through the numbers. Asks for demo times next week.",
      twice: true,
    }),
  }),
  line({
    id: "e1",
    day: "10/14",
    time: "4:02 PM",
    email: email({ closer: true, kept: "Thanks!", others: [] }),
  }),
];

const WHOLE = [
  "Hi Antaeus,",
  "",
  "Thank you for laying out the order. We talked it through as a team and we'd like to go with the reseller model.",
  "",
  "Can you send the reseller agreement over so our legal team can start their review? I'll loop back on the client's questions once their finance lead answers.",
  "",
  "A few things came up while we talked it through. The first client wants to know who employs the two people once they start, and whether they keep the benefits they have today. The second client is earlier, and they asked whether we could start them on contractors and move them to full employment later in the year.",
  "",
  "Our operations lead also asked how the billing would look on our side, and whether the invoices would come to us or go straight to the client. I told her I'd ask you.",
  "",
  "Would Wednesday or Thursday afternoon work to walk through what comes next?",
  "",
  "Thanks,",
  "Dana",
].join("\n");

const ROW: RoomRow = roomRow({
  accountId: "001F000000w38OHIAY",
  name: "Regis HR Group",
  move: "Answer Dana. They wrote today.",
  record: RECORD,
  recordTotal: 33,
  latestEmail: {
    id: "e6",
    day: "10/20",
    time: "9:10 AM",
    filingId: "f6",
    dir: "in",
    from: "Dana Reyes",
    to: "you",
    others: OTHERS,
    subject: "Intro to your Global Business Consultant",
    kept: RECORD[0].email!.kept,
    read: true,
    whole: WHOLE,
    missing: "",
  },
});

/** The same row whose latest email was filed before the store. */
const OLD: RoomRow = roomRow({
  accountId: "001F000000w38ZZIAY",
  name: "Axcet HR",
  rank: 2,
  record: [],
  recordTotal: 0,
  latestEmail: {
    id: "o1",
    day: "10/6",
    time: "",
    filingId: "",
    dir: "out",
    from: "you",
    to: "Elise Munoz",
    others: [],
    subject: "Following up",
    kept: "Follows up on the September package.",
    read: true,
    whole: null,
    missing: "before",
  },
});

export default function Fixture() {
  return (
    <RoomFace
      fontVars="harness-room-fonts"
      room={{
        rows: [ROW, OLD],
        cadence: [],
        checkins: [],
        followUps: [],
        warming: [],
        later: [],
        canWrite: true,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }}
    />
  );
}

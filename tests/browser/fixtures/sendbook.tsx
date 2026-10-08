// The Sendbook register as its page hands it (src/app/sendbook/page.tsx):
// a cold account with a live campaign and a reply, so every mark paints.

import { SendbookRegister } from "@/app/sendbook/register";

export default function Fixture() {
  return (
    <SendbookRegister
      week={{ total: 2, byChannel: [["EMAIL", 2]], accounts: 1, replied: 1, neverMet: 0, goneCold: 1 }}
      channelsPresent={["EMAIL"]}
      filter=""
      total={250}
      allHref="/sendbook?all=1"
      lines={[
        {
          accountId: "001F000000w38BOIAY",
          at: "2026-10-08T15:00:00Z",
          channel: "EMAIL",
          contact: "Pat Lee",
          clause: "Re: Mexico",
          step: 2,
          name: "Simploy",
          day: "TODAY",
          reply: { at: "2026-10-08T17:00:00Z", who: "Pat Lee", head: "Re: Mexico", excerpt: "Monday works.", from: "record" },
          booking: null,
          mktg: true,
          cold: true,
          coldSince: "2026-08-14T15:00:00.000Z",
          mktgSends: 3,
        },
      ]}
    />
  );
}

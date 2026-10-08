// Groundwork's lower deck with a State of play whose book paragraph carries
// its counts as doors, as buildReadout hands them (src/lib/groundwork/readout.ts).

import { LowerDeck } from "@/app/groundwork/face";
import styles from "@/app/groundwork/groundwork.module.css";

const text =
  "I cover 2 PrismHR and PrismHCM customer accounts nationwide. 1 of the 2 have an open conversation on file right now. The weekly activity export says 1 of the 2 saw human motion in the last thirty days. 1 are verified cold on both records.";

export default function Fixture() {
  return (
    <main className={styles.wrap}>
      <LowerDeck
        canWrite
        wire={[]}
        wireCount={0}
        wireAll={false}
        wireHref="/groundwork?wire=all"
        wireAvailable={false}
        wireIsDue={false}
        inst={null}
        readout={{
          sections: [
            {
              title: "The rest of the book",
              paragraphs: [
                {
                  text,
                  doors: [
                    {
                      phrase: "2 PrismHR and PrismHCM customer accounts",
                      href: "/accounts",
                    },
                    {
                      phrase: "1 of the 2 have an open conversation",
                      lines: ["Bravo PEO"],
                    },
                    { phrase: "1 of the 2 saw human motion", lines: ["Bravo PEO"] },
                    { phrase: "1 are verified cold", lines: ["Alpha HR"] },
                  ],
                },
              ],
            },
          ],
        }}
        readoutPayload={text}
        lintIssues={[]}
        readoutReadAt={undefined}
        idToName={(id) => id}
        wireWhen={() => ""}
        monthDay={() => ""}
      />
    </main>
  );
}

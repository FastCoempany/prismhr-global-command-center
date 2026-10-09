// The Playbook's Sheet for the browser suite: the five doors on arrival, the
// country wing's index with a few countries at different depths, and the
// tally the page hands it. The country card comes down from /playbook/country,
// which the harness answers.

import { ProductSheet } from "@/app/playbook/product-sheet";

export default function Fixture() {
  return (
    <main>
      <ProductSheet
        index={[
          { name: "Mexico", alias: "mx", points: 16, verdict: "ok" },
          { name: "Canada", alias: "ca", points: 12, verdict: "note" },
          { name: "Philippines", alias: "ph", points: 4, verdict: "ask" },
          { name: "Puerto Rico", alias: "pr", points: 0, verdict: "no" },
        ]}
        tally={{ priced: 16, written: 12 }}
      />
    </main>
  );
}

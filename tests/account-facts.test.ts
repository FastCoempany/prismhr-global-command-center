// The parity that was missing.
//
// Ask the app answered "the record doesn't name a CSM on Infiniti HR directly"
// while the accounts drilldown three feet away printed CSM ANIKA STEENSTRA.
// Nothing failed, because nothing compared the two — the sheet grew columns
// and the brain's hand-written copy of that list did not.
//
// So the last suite here is the one that matters: every fact the sheet's meta
// line renders must also reach the brain as an answerable line. It fails when
// someone adds a fact to one side only, which is the way this broke.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { peos } from "@/lib/book";
import { accountFacts, factLines, metaLine } from "@/lib/account/facts";
import type { Peo } from "@/lib/book";

const peo = (over: Partial<Peo> = {}): Peo =>
  ({
    id: "a1",
    name: "Infiniti HR",
    cloud: "INF.HSG",
    csm: "Anika Steenstra",
    contactName: "",
    contactEmail: "",
    size: 400,
    sizeBucket: "mid",
    industry: "PEO/ASO",
    city: "Columbia",
    state: "MD",
    website: "",
    lastActivity: "",
    fit: 70,
    fitTier: "high",
    ...over,
  }) as Peo;

describe("the account's standing", () => {
  it("names the CSM from the book", () => {
    const f = accountFacts(peo());
    assert.equal(f.csm, "Anika Steenstra");
  });

  it("says the platform, or says plainly that there is none", () => {
    assert.equal(accountFacts(peo({ cloud: "" })).platform, "not a platform customer");
  });

  it("carries the account's own city and state", () => {
    const f = accountFacts(peo());
    assert.equal(f.city, "Columbia");
    assert.equal(f.state, "MD");
  });

  it("marks the board state the caller read", () => {
    assert.equal(accountFacts(peo(), { onDashboard: true }).onDashboard, true);
    assert.equal(accountFacts(peo()).onDashboard, false);
  });

  it("renders the sheet's meta line", () => {
    const line = metaLine(accountFacts(peo()));
    assert.ok(line.startsWith("MODEL · PEO/ASO · PRISMHR ·"), line);
    assert.ok(line.includes("COLUMBIA, MD"), line);
    assert.ok(line.includes("CSM ANIKA STEENSTRA"), line);
  });

  it("gives the brain the CSM as a sentence it can answer with", () => {
    const lines = factLines(accountFacts(peo()));
    assert.ok(
      lines.some((l) => /Anika Steenstra is the CSM on Infiniti HR/.test(l)),
      lines.join(" | "),
    );
  });

  it("says the account is on the dashboard when it is", () => {
    const lines = factLines(accountFacts(peo(), { onDashboard: true }));
    assert.ok(lines.some((l) => /on the dashboard/.test(l)), lines.join(" | "));
  });

  it("claims nothing about a board it was not told about", () => {
    const lines = factLines(accountFacts(peo()));
    assert.ok(!lines.some((l) => /dashboard/.test(l)));
  });
});

describe("the sheet and the brain cannot drift", () => {
  // Every value the meta line prints, and the fact it comes from. A new fact
  // on the meta line without a line for the brain fails here.
  const PARITY: { label: string; inMeta: (f: string) => boolean; inLines: RegExp }[] = [
    { label: "CSM", inMeta: (m) => m.includes("CSM ANIKA STEENSTRA"), inLines: /Anika Steenstra is the CSM/ },
    { label: "industry", inMeta: (m) => m.includes("PEO/ASO"), inLines: /PEO\/ASO account/ },
    { label: "platform", inMeta: (m) => m.includes("INF.HSG"), inLines: /runs on PrismHR INF\.HSG/ },
    { label: "location", inMeta: (m) => m.includes("COLUMBIA, MD"), inLines: /in Columbia, MD/ },
  ];

  it("every fact the meta line shows is answerable by the brain", () => {
    const f = accountFacts(peo());
    const meta = metaLine(f);
    const lines = factLines(f).join(" | ");
    for (const p of PARITY) {
      assert.ok(p.inMeta(meta), `${p.label} is not on the meta line: ${meta}`);
      assert.ok(p.inLines.test(lines), `${p.label} never reaches the brain: ${lines}`);
    }
  });

  it("the sheet renders the meta line from this module, not its own copy", async () => {
    const { readFileSync } = await import("node:fs");
    const client = readFileSync("src/app/accounts-client.tsx", "utf8");
    assert.ok(
      client.includes('from "@/lib/account/facts"'),
      "accounts-client must import the shared facts",
    );
    assert.ok(
      !/MODEL · \{a\.industry/.test(client),
      "the sheet is composing the meta line by hand again — that is the drift",
    );
  });

  it("the brain reads the same module", async () => {
    const { readFileSync } = await import("node:fs");
    const live = readFileSync("src/lib/ask/live.ts", "utf8");
    assert.ok(live.includes("accountFacts"), "the live read must compose from the shared facts");
    assert.ok(live.includes("factLines"), "the live read must push the shared fact lines");
  });

  it("holds against the real book, not just a fixture", () => {
    const real = peos.filter((p) => p.csm && p.name);
    assert.ok(real.length > 50, `only ${real.length} accounts carry a CSM`);
    for (const p of real.slice(0, 40)) {
      const lines = factLines(accountFacts(p));
      assert.ok(
        lines.some((l) => l.includes(p.csm) && /is the CSM on/.test(l)),
        `${p.name} does not tell the brain who its CSM is`,
      );
    }
  });
});

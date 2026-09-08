import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  COMMERCIAL_TERMS,
  HEADCOUNT,
  INCUMBENTS,
  PRODUCT_TERMS,
  URGENCY,
  countriesIn,
  redactMoney,
} from "@/lib/intel/lexicon";
import { dateNear } from "@/lib/intel/extract";
import { DISCOVERY, questionsFor } from "@/lib/intel/discovery";
import { DASH_NODES, nodeBriefs } from "@/lib/dashboard/stages";
import { MOTIONS, motionsFor } from "@/lib/intel/motions";
import { DIGEST, digestFor, digestForCardName } from "@/lib/intel/digest";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";

// Real corpus sentences as fixtures — the lexicon must read the actual mail.

describe("lexicon: product terms", () => {
  test("matches corpus phrasings", () => {
    assert.ok(PRODUCT_TERMS.eor.test("we can onboard them onto our employer of record"));
    assert.ok(PRODUCT_TERMS.eor.test("EOR CORE via channel"));
    assert.ok(
      PRODUCT_TERMS.contractor_plus.test(
        "Contractor plus is where we become the agent of record",
      ),
    );
    assert.ok(PRODUCT_TERMS.mpex.test("MPEX Licensing Need- ESC"));
    assert.ok(!PRODUCT_TERMS.mpex.test("mpexish word inside"));
    assert.ok(PRODUCT_TERMS.wallet.test("directly deposit into their GCash"));
    assert.ok(PRODUCT_TERMS.tlm.test("Unknown if they need TLM"));
  });
});

describe("lexicon: commercial + incumbents + urgency", () => {
  test("resale vs referral vs deposit", () => {
    assert.ok(
      COMMERCIAL_TERMS.resale.test("the agreement you have is a reseller structure"),
    );
    assert.ok(COMMERCIAL_TERMS.resale.test("marks up the EOR fee"));
    assert.ok(COMMERCIAL_TERMS.referral.test("proceed using a referral-based model"));
    assert.ok(COMMERCIAL_TERMS.deposit.test("we have to reinstate the deposit"));
    assert.ok(COMMERCIAL_TERMS.deposit.test("the client escrow requirement"));
  });
  test("GP matches as a word, never inside other words", () => {
    const gp = INCUMBENTS[0];
    assert.ok(gp.re.test("I think it's called GP"));
    assert.ok(gp.re.test("global hiring through Globalization Partners"));
    assert.ok(gp.re.test("consolidate the G-P layer"));
    assert.ok(!gp.re.test("the GPS coordinates"));
    assert.ok(!gp.re.test("gpu shortages"));
  });
  test("urgency phrases from real threads", () => {
    assert.ok(URGENCY.test("Info & Demo Request (time-sensitive)"));
    assert.ok(URGENCY.test("quarterly review with leadership"));
    assert.ok(URGENCY.test("locked in by August 6"));
  });
});

describe("lexicon: countries + headcounts", () => {
  test("countriesIn reads adjectives, regions, and aliases", () => {
    assert.deepEqual(countriesIn("a Bulgarian living in Spain"), ["bg", "es"]);
    assert.deepEqual(countriesIn("an Ontario branch with 25 employees"), ["ca"]);
    assert.deepEqual(
      countriesIn("we're in Philippines, Mexico, South Africa and one in the UK"),
      ["ph", "mx", "za", "gb"],
    );
    assert.deepEqual(countriesIn("nothing here"), []);
  });
  test("HEADCOUNT reads corpus shapes", () => {
    assert.equal(HEADCOUNT.exec("approximately 300 employees in Ontario")?.[1], "300");
    assert.equal(HEADCOUNT.exec("~25 employees at that branch")?.[1], "25");
    assert.equal(
      HEADCOUNT.exec("we have two, sorry, 2 independent contractors")?.[1],
      "2",
    );
    assert.equal(HEADCOUNT.exec("300 ee of theirs")?.[1], "300");
    assert.equal(HEADCOUNT.exec("in 2026 we grew"), null);
  });

  // An email signature is not a deal size (found 2026-09-08 on Trend
  // Personnel, whose Philippines opportunity rendered "9292 workers").
  test("a phone number in a signature is not a headcount", () => {
    const sig = [
      "Antaeus Coe",
      "Sr. Global Business Consultant",
      "",
      "P: 312.221.9292",
      "E: antaeus.coe@prismhr.com",
    ].join("\n");
    assert.equal(HEADCOUNT.exec(sig), null);
    // Anika's direct dial produced 4214 the same way.
    assert.equal(HEADCOUNT.exec("P: 877.837.4311\nD: 703.554.4214\nE: a@b.com"), null);
  });
  test("a count and its unit sit on one line", () => {
    assert.equal(HEADCOUNT.exec("we counted 40\nemployees left the plan"), null);
    assert.equal(HEADCOUNT.exec("we counted 40 employees")?.[1], "40");
  });
  test("a lone e is not a unit, but EE is", () => {
    assert.equal(HEADCOUNT.exec("10 e"), null);
    assert.equal(HEADCOUNT.exec("10 EEs in Puerto Rico")?.[1], "10");
    assert.equal(HEADCOUNT.exec("1 EE already onboarding")?.[1], "1");
  });
  test("digits inside a dotted run are part of a number", () => {
    assert.equal(HEADCOUNT.exec("order 12.3456 workers"), null);
    assert.equal(HEADCOUNT.exec("ext-5150 people"), null);
    // …but an ordinary sentence still reads.
    assert.equal(HEADCOUNT.exec("They have 10 workers there.")?.[1], "10");
  });
});

describe("redactMoney", () => {
  test("strips every dollar form, keeps headcounts", () => {
    assert.ok(!redactMoney("$10,000 in US per month").includes("10,000"));
    assert.ok(!redactMoney("between $550 and $700-ish per employee").includes("550"));
    assert.ok(!redactMoney("charging 25 USD per person").match(/25\s?USD/i));
    assert.ok(!redactMoney("escrow $150,000 when contracting").includes("150,000"));
    assert.ok(redactMoney("300 ee in Ontario").includes("300 ee"));
    assert.ok(redactMoney("about 25 contractors").includes("25 contractors"));
  });
});

describe("discovery bank", () => {
  test("has ≥24 questions, every one with a relay line that is a direct question", () => {
    assert.ok(DISCOVERY.length >= 24, `only ${DISCOVERY.length}`);
    for (const q of DISCOVERY) {
      assert.ok(q.relayLine.trim().endsWith("?"), `${q.id} relayLine must end with ?`);
      assert.ok(q.listenFor.length > 0, `${q.id} needs listenFor`);
      assert.ok(q.why.length > 10, `${q.id} needs a why`);
    }
  });
  test("questionsFor: phase gating, gap ordering, country merge", () => {
    const early = questionsFor({ phase: "first_meeting", gaps: [], countries: [] });
    assert.ok(early.every((q) => ["investigate", "first_meeting"].includes(q.phase)));
    const gapped = questionsFor({
      phase: "needs_analysis",
      gaps: ["commercial"],
      countries: ["bg"],
    });
    assert.equal(gapped[0].category, "commercial");
    const merged = questionsFor({ phase: "contract", gaps: [], countries: ["ca", "mx"] });
    assert.ok(
      merged.every((q) => !q.question.includes("{countries}")),
      "no unmerged {countries}",
    );
  });
});

describe("motions", () => {
  test("signals derive from intel and gate by stage", () => {
    const intel: DealIntel = {
      ...EMPTY_INTEL,
      chair: "undecided",
      threads: { people: ["Only One"], execSeen: true, opsSeen: false },
    };
    const m = motionsFor(intel, "needs_analysis");
    const ids = m.map((x) => x.id);
    assert.ok(ids.includes("settle-chair"));
    assert.ok(ids.includes("open-second-thread"));
    assert.ok(ids.includes("map-countries"));
    assert.ok(!ids.includes("settle-chair-late")); // wrong stage
  });
  test("every motion say-line is a direct question", () => {
    for (const m of MOTIONS) assert.ok(m.say.trim().endsWith("?"), m.id);
  });
});

describe("digest", () => {
  test("entries carry no dollar figures", () => {
    for (const e of DIGEST)
      for (const f of e.facts)
        assert.ok(
          !/[$€£]\s?\d|\b\d[\d,]*\s?(USD|PEPM)\b/i.test(f),
          `${e.accountId}: ${f}`,
        );
  });
  test("lookups: by id and by card-name prefix", () => {
    assert.equal(digestFor("001F000000w38BOIAY")?.names[0], "Simploy");
    assert.equal(
      digestForCardName("Advocate Pay — SubcontractorHub")?.accountId,
      "ADVOCATEPAY000001",
    );
    assert.equal(digestForCardName("ESC")?.accountId, "001F000000w38ItIAI");
    assert.equal(digestForCardName("Totally Unknown Co"), undefined);
  });
  test("Advocate digest seeds the golden facts", () => {
    const a = digestFor("ADVOCATEPAY000001")!;
    const codes = a.intelSeed.countries!.map((c) => c.value);
    for (const c of ["bg", "in", "ph", "mx", "za", "gb"]) assert.ok(codes.includes(c), c);
    assert.equal(a.intelSeed.chair, "referral");
    assert.equal(a.stage, "contract");
    assert.ok(a.intelSeed.threads!.execSeen && a.intelSeed.threads!.opsSeen);
  });
});

describe("BRIEFS pairing", () => {
  test("every node's briefs pair 1:1 with its checklist", () => {
    for (const n of DASH_NODES) {
      const briefs = nodeBriefs(n.key);
      assert.equal(
        briefs.length,
        n.checklist.length,
        `${n.key}: ${briefs.length} briefs vs ${n.checklist.length} items`,
      );
      for (const b of briefs) assert.ok(b.trim().length > 0, `${n.key} empty brief`);
    }
  });
});

// A close date belongs to the urgency phrase that names it (found 2026-09-08
// on Simploy, whose close date read 7/30). The date used to be scanned out of
// the whole document independently of where the urgency phrase sat, so on one
// note the two landed 1,100 characters apart in unrelated paragraphs and the
// operator's own errand became the deal's close date.
describe("timing reads the sentence its urgency phrase is in", () => {
  const REF = new Date("2026-07-29T19:09:00Z");

  test("the date in the matching sentence is the one taken", () => {
    const note = [
      "Chassie fails the contractor test and needs to convert to EOR",
      "The August 6th date is Chassie's internal deadline to recommend a vendor to leadership — not a go-live date",
      "Pre-recorded demo and next steps",
      "Antaeus is sending a pre-recorded version instead, by July 30th at the latest",
    ].join("\n");
    const at = note.indexOf("deadline");
    assert.equal(dateNear(note, at, REF), "2026-08-06");
  });

  test("a date in another paragraph is not this phrase's date", () => {
    const note = [
      "This is time-sensitive for them.",
      "Separately, I owe Shane a recording by July 30th.",
    ].join("\n");
    assert.equal(dateNear(note, note.indexOf("time-sensitive"), REF), undefined);
  });

  test("the preposition is optional and the ordinal is noise", () => {
    for (const s of ["deadline is August 6", "deadline by August 6th", "deadline: Aug 6"])
      assert.equal(dateNear(s, s.indexOf("deadline"), REF), "2026-08-06", s);
  });

  test("a sentence with no date says so", () => {
    const s = "This is time-sensitive but nobody named a day.";
    assert.equal(dateNear(s, s.indexOf("time-sensitive"), REF), undefined);
  });

  test("a month already past means next year", () => {
    const s = "deadline by January 15";
    assert.equal(dateNear(s, 0, REF), "2027-01-15");
  });
});

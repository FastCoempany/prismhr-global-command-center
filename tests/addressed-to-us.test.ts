// The Infiniti row of 2026-09-15: the operator dropped an Infiniti HR thread
// into the HomeRoom and the stage said "Answer Tom. They wrote today."
//
// Nobody had written to him. The newest message was Tom Harrison → Javier
// Ramirez, both of them Infiniti HR people (jramirez@infinitihr.com is in the
// book's own contacts), asking each other whether the resale paperwork was
// done. We were copied on somebody else's conversation.
//
// The cause: direction was read off the SENDER alone — not the operator, has a
// name, not machinery, not a sign-off, therefore inbound. The receiving half of
// the actors line was never consulted anywhere in the app. So an account-
// internal thread registered exactly like a reply addressed to us, flipped the
// court, and asked for an answer to a question that was put to someone else.
//
// This is the Regis row of 2026-08-27 on a second path. There the room said
// "Wait on Lesha Cyphers" because the CSM led the To line, and isHomeSideName
// was written to fix it — for the wait-on read, and never for the direction
// read beside it. Both bugs are one mistake: reading one side of an actors
// line without asking which side is ours.
//
// The rule these tests pin: a message is inbound TO US only when we are on the
// receiving side.
//
// The first cut of that rule read the actors line's recipient slot and was
// wrong, because that slot is contracted to hold something else. The cleaner
// is told to put the ACCOUNT's person there whenever a message has several
// recipients — even when a colleague leads the To line — since our own side is
// on nearly every thread and identifies nobody. Everyone else becomes "+N". So
// on a collapsed line an account-side name is exactly what the contract
// promises whether we were on it or not, and 35 of the 39 entries that first
// rule demoted sat behind a count that could have held the operator.
//
// So the capture now keeps the recipients it used to throw away, and the rule
// reads in two tiers:
//
//   • a stored recipient list — the whole receiving side, our own side
//     included. Where it exists it IS the answer.
//   • no list (every row filed before the column) — only a line naming ONE
//     recipient can take a reply away. A "+N" line proves nothing.
//
// Conservative in both tiers: the guard needs evidence to take a reply away,
// and losing a real one is the worse failure.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sanitizeAiResult } from "@/lib/intel/ai-clean";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import {
  isAddressedToUs,
  joinRecipients,
  recipientOf,
  splitRecipients,
} from "@/lib/intel/provenance";
import { readDeal } from "@/lib/room/engine";

// The names the app knows as ours. In the app this is the CSM column unioned
// with everyone the record shows working across three or more accounts.
const HOME = ["Anika Steenstra", "Lesha Cyphers", "Russell Jones"];

// The five entries the drop actually filed, verbatim from the store.
const INFINITI = [
  {
    id: "n5",
    kind: "account",
    createdAt: "2026-09-15T15:46:00",
    actors: "Tom Harrison → Javier Ramirez +3",
    body: "✉ OL Sep 15 3:46 PM — Re: PrismHR Global pricing, agreement paper, next steps · Tom Harrison → Javier Ramirez +3\nAt proposal stage and wants to confirm process before sending. Assumes Javier and Scott must still establish the resale arrangement.",
  },
  {
    id: "n4",
    kind: "account",
    createdAt: "2026-09-09T16:22:00",
    actors: "Antaeus Coe → Tom Harrison +2",
    body: "✉ OL Sep 9 4:22 PM — Re: Global prospect - quoting process · Antaeus Coe → Tom Harrison +2\nCalendar invite sent for tomorrow's call with Tom.",
  },
  {
    id: "n3",
    kind: "account",
    createdAt: "2026-09-09T15:56:00",
    actors: "Scott Smrkovski → Tom Harrison +1",
    body: "✉ OL Sep 9 3:56 PM — FW: PrismHR Global pricing · Scott Smrkovski → Tom Harrison +1\nPasses along what he has: the call recording and the contact.",
  },
];

describe("recipientOf", () => {
  test("reads the receiving side and drops the overflow count", () => {
    assert.equal(recipientOf("Tom Harrison → Javier Ramirez +3"), "Javier Ramirez");
    assert.equal(recipientOf("Antaeus Coe → Tom Harrison"), "Tom Harrison");
  });

  test("a line with no receiving side names nobody", () => {
    assert.equal(recipientOf("Antaeus Coe"), "");
    assert.equal(recipientOf(""), "");
    assert.equal(recipientOf("Tom Harrison → "), "");
    assert.equal(recipientOf("Tom Harrison → +2"), "");
  });
});

describe("isAddressedToUs", () => {
  test("a message to the operator is ours, in either spelling of him", () => {
    assert.equal(isAddressedToUs("Tom Harrison → Antaeus Coe +2", HOME), true);
    assert.equal(isAddressedToUs("Tom Harrison → acoe@prismhr.com", HOME), true);
  });

  test("a message to a colleague is ours — a reply in their inbox still reached us", () => {
    assert.equal(isAddressedToUs("Tom Harrison → Lesha Cyphers +1", HOME), true);
    assert.equal(isAddressedToUs("Chassie Smith → someone@prismhr.com", HOME), true);
  });

  test("a message to one of their own people, and only them, is not", () => {
    assert.equal(isAddressedToUs("Tom Harrison → Javier Ramirez", HOME), false);
    assert.equal(isAddressedToUs("Scott Smrkovski → Tom Harrison", HOME), false);
  });

  test("a collapsed line proves nothing, whoever it names", () => {
    // The cleaner is told to put the ACCOUNT's person in "to" when a message
    // has several recipients, even when a colleague leads the To line. So on a
    // "+N" line an account-side name is what the contract promises whether we
    // were on it or not, and the operator may be sitting in the count. Taking
    // a reply away on that is reading absence as evidence.
    assert.equal(isAddressedToUs("Tom Harrison → Javier Ramirez +3", HOME), true);
    assert.equal(isAddressedToUs("Scott Smrkovski → Tom Harrison +1", HOME), true);
  });

  test("an unnamed recipient leaves the old answer standing", () => {
    // Evidence or nothing: the guard takes a reply away only on proof that it
    // went somewhere else. No name is not proof.
    assert.equal(isAddressedToUs("Tom Harrison → ", HOME), true);
    assert.equal(isAddressedToUs("Antaeus Coe", HOME), true);
    assert.equal(isAddressedToUs("", HOME), true);
  });
});

describe("names as the record actually stores them", () => {
  // Found by sweeping the whole record before shipping, not by reasoning about
  // it. Captures come out of mail clients half-parsed, and a CSM's own name
  // carrying the tail of a stripped address failed to match the roster — which
  // demoted a real client reply to her. The rule can only be as good as its
  // name matching, so the matching gets tested on the real spellings.
  test("a half-parsed address tail still matches the roster", () => {
    assert.equal(isAddressedToUs("Sarah Pegram, PHR > → Anika Steenstra >", HOME), true);
  });

  test("an open display quote and trailing credentials still match", () => {
    assert.equal(isAddressedToUs('Melanie Dreyer → "Lesha Cyphers', HOME), true);
    assert.equal(isAddressedToUs("Melanie Dreyer → Lesha Cyphers, SPHR", HOME), true);
  });

  test("a colleague's bare first name counts as ours", () => {
    assert.equal(isAddressedToUs("Sarah Pegram → Anika", HOME), true);
  });

  test("an apostrophe inside a name survives the cleaning", () => {
    // Twenty-five people in the book carry one. Scrubbing quotes blindly made
    // "Pat O'Neil" into "Pat O Neil", which matches no roster entry — and on a
    // single-recipient line that throws a real reply away.
    assert.equal(recipientOf("Tom Harrison → Pat O'Neil"), "Pat O'Neil");
    assert.equal(recipientOf("Tom Harrison → D'Andra Simpkins >"), "D'Andra Simpkins");
    assert.equal(recipientOf('Tom Harrison → "Kelly O’Brien'), "Kelly O’Brien");
    assert.equal(
      isAddressedToUs("Client Person → Pat O'Neil", [...HOME, "Pat O'Neil"]),
      true,
    );
    assert.equal(
      isAddressedToUs("Client Person → Pat O'Neil +1", [...HOME, "Pat O'Neil"], [
        "Pat O'Neil",
      ]),
      true,
    );
  });

  test("a flipped apostrophe name still flips", () => {
    assert.equal(recipientOf("Tom Harrison → O'Neil, Pat"), "Pat O'Neil");
  });

  test("a flipped name is not mistaken for a credential", () => {
    // "Pegram, Sarah" is one person written backwards; the credential strip
    // must not eat the half that makes her findable.
    assert.equal(recipientOf("Tom Harrison → Pegram, Sarah"), "Sarah Pegram");
  });

  test("a client's own people still do not count, however spelled", () => {
    assert.equal(isAddressedToUs("Tom Harrison → Javier Ramirez >", HOME), false);
    assert.equal(isAddressedToUs("Tom Harrison → Tom", HOME), false);
  });
});

describe("the Infiniti row", () => {
  // Stated as a standing limitation, not a passing fix. The entry that caused
  // the complaint reads "Tom Harrison → Javier Ramirez +3", and the three the
  // line dropped could include the operator. The rule keeps it, so the row
  // still says "Answer Tom" until the capture stops throwing recipients away.
  // This test exists so the limitation is visible in the suite rather than
  // discovered again in the room.
  test("a collapsed internal thread is still read as inbound — the known gap", () => {
    const docs = corpusFor("INF", "Infiniti HR", {
      acctNotes: INFINITI,
      homeSide: HOME,
    });
    const newest = docs.find((d) => d.text.includes("At proposal stage"))!;
    assert.equal(newest.direction, "in");
  });

  test("the same thread on a single-recipient line is not inbound", () => {
    // What the capture would give us if it kept one name instead of a count.
    const docs = corpusFor("INF", "Infiniti HR", {
      acctNotes: INFINITI.map((n) =>
        n.id === "n5"
          ? { ...n, actors: "Tom Harrison → Javier Ramirez" }
          : n,
      ),
      homeSide: HOME,
    });
    const newest = docs.find((d) => d.text.includes("At proposal stage"))!;
    assert.equal(newest.direction, undefined);

    const intel = extractDealIntel(docs);
    assert.equal(intel.lastOutbound?.slice(0, 10), "2026-09-09");

    const read = readDeal({
      accountName: "Infiniti HR",
      step: null,
      timing: null,
      lastTouch: { at: "2026-09-09T16:22:00", awaitingReply: true, who: "Tom Harrison" },
      lastInbound: intel.lastInbound
        ? { at: intel.lastInbound, who: intel.lastInboundWho ?? "" }
        : null,
      lastRecordAt: "2026-09-15T15:46:00",
      openOwed: [{ text: "Send the calendar invite once they pick a window" }],
      now: new Date("2026-09-15T18:00:00"),
    });
    assert.ok(!/^Answer Tom\b/.test(read.move), `stage still answers Tom: ${read.move}`);
  });

  test("a real reply from Tom to the operator still owes an answer", () => {
    const docs = corpusFor("INF", "Infiniti HR", {
      acctNotes: [
        ...INFINITI,
        {
          id: "n6",
          kind: "account",
          createdAt: "2026-09-15T17:10:00",
          actors: "Tom Harrison → Antaeus Coe +1",
          body: "✉ OL Sep 15 5:10 PM — Re: Global prospect - quoting process · Tom Harrison → Antaeus Coe +1\nCan you send the quote over today?",
        },
      ],
      homeSide: HOME,
    });
    const intel = extractDealIntel(docs);
    assert.equal(intel.lastInbound?.slice(0, 10), "2026-09-15");
    assert.match(intel.lastInboundWho ?? "", /Tom Harrison/);
  });
});

describe("the recipient list, once the capture keeps one", () => {
  // The repair for the gap above. `actors` names the account's person by
  // decree and can never answer "did this reach us"; the capture now keeps
  // every recipient beside it, and where that list exists it IS the answer —
  // no counting, no inference from absence.
  test("the operator inside the list keeps the reply", () => {
    // Review's exact case: Tom → Javier +1 with Antaeus as the other recipient.
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +1", HOME, [
        "Javier Ramirez",
        "Antaeus Coe",
      ]),
      true,
    );
  });

  test("a colleague inside the list keeps it too", () => {
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +1", HOME, [
        "Javier Ramirez",
        "Lesha Cyphers",
      ]),
      true,
    );
  });

  test("a list of only their own people settles the Infiniti row", () => {
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +3", HOME, [
        "Javier Ramirez",
        "Scott Smrkovski",
        "Jennifer Hardesty",
        "Rafael Kalu",
      ]),
      false,
    );
  });

  test("the list is read through the same name cleaning", () => {
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +1", HOME, [
        "Javier Ramirez",
        "Anika Steenstra >",
      ]),
      true,
    );
  });

  test("an empty list is no list — the count rule still applies", () => {
    assert.equal(isAddressedToUs("Tom Harrison → Javier Ramirez +3", HOME, []), true);
    assert.equal(isAddressedToUs("Tom Harrison → Javier Ramirez", HOME, []), false);
  });

  test("the corpus reads it off the stored note", () => {
    const withList = INFINITI.map((n) =>
      n.id === "n5"
        ? { ...n, recipients: "Javier Ramirez, Scott Smrkovski, Jennifer Hardesty" }
        : n,
    );
    const docs = corpusFor("INF", "Infiniti HR", { acctNotes: withList, homeSide: HOME });
    assert.equal(docs.find((d) => d.text.includes("At proposal stage"))!.direction, undefined);

    const withUs = INFINITI.map((n) =>
      n.id === "n5" ? { ...n, recipients: "Javier Ramirez, Antaeus Coe" } : n,
    );
    const docs2 = corpusFor("INF", "Infiniti HR", { acctNotes: withUs, homeSide: HOME });
    assert.equal(docs2.find((d) => d.text.includes("At proposal stage"))!.direction, "in");
  });
});

describe("the list survives the whole path, model reply to stored string", () => {
  // The gap that let the field ship inert: every test above handed the list
  // straight to the rule, so none of them crossed the sanitizer — which was
  // building each entry field by field and simply never copied it. The schema
  // had it, the prompt asked for it, the guard read it, and it was "" forever.
  const reply = {
    entries: [
      {
        kind: "email",
        subject: "Re: pricing",
        from: "Tom Harrison",
        to: "Javier Ramirez",
        others: 2,
        recipients: ["Javier Ramirez", "Antaeus Coe", "Scott Smrkovski"],
        timeLabel: "3:46 PM",
        dayLabel: "Today",
        dayIso: "2026-09-15",
        body: "At proposal stage.",
      },
    ],
  };

  test("the sanitizer keeps it", () => {
    const e = sanitizeAiResult(reply).entries[0]!;
    assert.deepEqual(e.recipients, ["Javier Ramirez", "Antaeus Coe", "Scott Smrkovski"]);
  });

  test("and the operator inside it keeps the reply", () => {
    const e = sanitizeAiResult(reply).entries[0]!;
    const stored = joinRecipients(e.recipients);
    assert.equal(stored, "Javier Ramirez, Antaeus Coe, Scott Smrkovski");
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +2", HOME, splitRecipients(stored)),
      true,
    );
  });

  test("their own people only, and the reply goes", () => {
    const theirs = {
      entries: [
        { ...reply.entries[0], recipients: ["Javier Ramirez", "Scott Smrkovski"] },
      ],
    };
    const stored = joinRecipients(sanitizeAiResult(theirs).entries[0]!.recipients);
    assert.equal(
      isAddressedToUs("Tom Harrison → Javier Ramirez +2", HOME, splitRecipients(stored)),
      false,
    );
  });

  test("a reply with no recipients field degrades, never throws", () => {
    const bare = { entries: [{ ...reply.entries[0], recipients: undefined }] };
    assert.deepEqual(sanitizeAiResult(bare).entries[0]!.recipients, []);
    const junk = { entries: [{ ...reply.entries[0], recipients: "not an array" }] };
    assert.deepEqual(sanitizeAiResult(junk).entries[0]!.recipients, []);
  });

  test("names are normalized on the way through, like from and to", () => {
    const messy = {
      entries: [{ ...reply.entries[0], recipients: ["Steenstra, Anika", "  ", "You"] }],
    };
    assert.deepEqual(sanitizeAiResult(messy).entries[0]!.recipients, [
      "Anika Steenstra",
      "Antaeus Coe",
    ]);
  });
});

describe("storing the list", () => {
  test("round-trips, normalizing each name on the way in", () => {
    const stored = joinRecipients(["Javier Ramirez", "Steenstra, Anika", "  "]);
    assert.equal(stored, "Javier Ramirez, Anika Steenstra");
    assert.deepEqual(splitRecipients(stored), ["Javier Ramirez", "Anika Steenstra"]);
  });

  test("nothing stored reads as no list, not as an empty recipient", () => {
    assert.deepEqual(splitRecipients(""), []);
    assert.deepEqual(splitRecipients(null), []);
    assert.deepEqual(splitRecipients(undefined), []);
  });
});

describe("the fix does not widen past the receiving side", () => {
  test("the operator's own send is still outbound, whoever it went to", () => {
    const docs = corpusFor("INF", "Infiniti HR", {
      acctNotes: INFINITI,
      homeSide: HOME,
    });
    const own = docs.find((d) => d.text.includes("Calendar invite sent"))!;
    assert.equal(own.direction, "out");
  });

  test("with no roster handed in, the read is unchanged from before", () => {
    // Every caller that has not been taught the roster yet keeps its old
    // behavior rather than silently losing replies.
    const docs = corpusFor("INF", "Infiniti HR", { acctNotes: INFINITI });
    const newest = docs.find((d) => d.text.includes("At proposal stage"))!;
    assert.equal(newest.direction, "in");
  });
});

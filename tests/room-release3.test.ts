// The F26 face, release three: the people added by hand and LinkedIn pages,
// the files Send carries as a record, the client the read names with how
// sure the record is, and whether a count is employees or contractors.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EMPTY_INTEL } from "@/lib/intel/types";
import {
  NO_HAND,
  buildDeck,
  buildRowFacts,
  headKind,
  headWord,
  mapIndex,
} from "@/lib/room/facts";
import {
  NO_PEOPLE,
  applyPeopleChange,
  linkedInUrl,
  parsePeople,
  renderPeople,
} from "@/lib/room/people-store";
import { agreementSends, filesSentFrom, renderFilesSent } from "@/lib/room/files-sent";
import { companyKey, readClient, renderClientRead } from "@/lib/room/client-read";
import { readLadders } from "@/lib/room/ladders";
import { personLinks } from "@/lib/groundwork/spine";

describe("people added by hand and LinkedIn pages", () => {
  test("only an https LinkedIn profile or Sales Navigator lead reads as a page", () => {
    assert.equal(
      linkedInUrl("https://www.linkedin.com/in/dana-reyes/?trk=x"),
      "https://www.linkedin.com/in/dana-reyes/",
    );
    assert.equal(
      linkedInUrl("https://linkedin.com/sales/lead/ACw,NAME_SEARCH,1"),
      "https://www.linkedin.com/sales/lead/ACw,NAME_SEARCH,1",
    );
    assert.equal(linkedInUrl("http://www.linkedin.com/in/dana"), null);
    assert.equal(linkedInUrl("https://www.linkedin.com/company/acme"), null);
    assert.equal(linkedInUrl("https://evil.test/in/dana"), null);
    assert.equal(linkedInUrl("javascript:alert(1)"), null);
  });

  test("the store keeps people and pages, and a change that does not read changes nothing", () => {
    let p = applyPeopleChange(NO_PEOPLE, {
      kind: "add",
      person: { name: "Dana Reyes", title: "COO", email: "dana@acme.test", phone: "" },
    });
    p = applyPeopleChange(p, {
      kind: "linkedin",
      name: "Dana Q. Reyes",
      url: "https://www.linkedin.com/in/dana-reyes",
    });
    const back = parsePeople(renderPeople(p));
    assert.equal(back.added[0]!.name, "Dana Reyes");
    assert.equal(back.links["dana reyes"], "https://www.linkedin.com/in/dana-reyes");
    assert.equal(
      applyPeopleChange(p, { kind: "linkedin", name: "Dana Reyes", url: "not a page" }),
      p,
    );
    assert.equal(
      applyPeopleChange(p, {
        kind: "add",
        person: { name: "", title: "", email: "", phone: "" },
      }),
      p,
    );
    const gone = applyPeopleChange(p, { kind: "remove", name: "Dana Reyes" });
    assert.equal(gone.added.length, 0);
    const unlinked = applyPeopleChange(p, {
      kind: "linkedin",
      name: "Dana Reyes",
      url: null,
    });
    assert.equal(unlinked.links["dana reyes"], undefined);
    assert.deepEqual(parsePeople("something else"), NO_PEOPLE);
  });

  test("the deck: the record first, the hand after, never twice; the hand's page outranks Sales Navigator's", () => {
    const deck = buildDeck({
      people: [{ name: "Dana Reyes", title: "", email: "dana@acme.test" }],
      contacts: [],
      docs: [],
      added: [
        { name: "Dana Reyes", title: "COO", email: "", phone: "" },
        { name: "Sam Ortiz", title: "CFO", email: "sam@acme.test", phone: "555" },
      ],
      links: { "sam ortiz": "https://www.linkedin.com/in/sam" },
      salesNav: new Map([
        ["dana reyes", "https://www.linkedin.com/sales/lead/D1"],
        ["sam ortiz", "https://www.linkedin.com/sales/lead/S1"],
      ]),
    });
    assert.deepEqual(
      deck.map((p) => [p.name, p.hand, p.linkedin, p.liFrom]),
      [
        ["Dana Reyes", false, "https://www.linkedin.com/sales/lead/D1", "salesnav"],
        ["Sam Ortiz", true, "https://www.linkedin.com/in/sam", "hand"],
      ],
    );
  });

  test("a Sales Navigator alert's lead link is the person's page; a post link is not", () => {
    const head =
      "SALESNAV ALERTS - captured 10/15/2026, 9:00:00 AM - 2 alerts - from an alert email";
    const links = personLinks([
      {
        body: `${head}\n\nJordan Ellis has a new position\nLink · Profile · https://www.linkedin.com/sales/lead/ACw,NAME_SEARCH,1234\n\nAllie Menz shared a post\nLink · Post · https://www.linkedin.com/sales/alert/urn:li:share:1`,
        source: "salesnav",
        createdAt: "2026-10-15T14:00:00.000Z",
      },
    ]);
    assert.equal(
      links.get("jordan ellis"),
      "https://www.linkedin.com/sales/lead/ACw,NAME_SEARCH,1234",
    );
    assert.equal(links.has("allie menz"), false);
    assert.equal(
      personLinks([
        {
          body: `${head}\n\nJordan Ellis has a new position`,
          source: "paste",
          createdAt: "",
        },
      ]).size,
      0,
    );
  });
});

describe("the files Send carries, as a record", () => {
  test("only catalog files are kept, and an agreement's review copy is the agreement going out", () => {
    assert.equal(renderFilesSent(["no-such-file"], "Dana"), null);
    const body = renderFilesSent(
      ["agreement-reseller", "agreement-reseller"],
      "Dana Reyes",
    )!;
    const sends = filesSentFrom([
      { id: "n1", body, createdAt: "2026-11-02T16:00:00.000Z" },
      { id: "n2", body: "not a send", createdAt: "2026-11-03T16:00:00.000Z" },
    ]);
    assert.equal(sends.length, 1);
    assert.deepEqual(sends[0]!.files, ["agreement-reseller"]);
    const agr = agreementSends(sends);
    assert.equal(agr[0]!.line, "You sent Dana Reyes the reseller agreement for review.");
    const l = readLadders({
      docs: [],
      facts: buildRowFacts({
        intel: EMPTY_INTEL,
        docs: [],
        hand: NO_HAND,
        todayMd: "11/4",
      }),
      outcome: null,
      demoHeld: null,
      agreementFiles: agr,
      hand: {},
    });
    assert.equal(l.partner.k, "review");
    assert.equal(l.agreement.n, 1);
    assert.equal(l.agreement.src?.line, agr[0]!.line);
    assert.equal(l.agreement.src?.day, "11/2");
  });
});

describe("the client the read names", () => {
  test("the partner itself and our own side are never the client", () => {
    assert.equal(
      renderClientRead(
        [
          { client: "Acme PEO, Inc.", dayIso: "2026-10-01" },
          { client: "PrismHR Global" },
          { client: "" },
        ],
        "Acme PEO",
      ),
      null,
    );
    assert.equal(companyKey("The Acme Group, LLC"), "acme group");
  });

  test("named twice with no hedge is sure, once is likely, a hedge is unsure", () => {
    const note = (entries: { client: string; body: string; dayIso: string }[]) => ({
      body: renderClientRead(entries, "Acme PEO")!,
      createdAt: "2026-11-01T16:00:00.000Z",
    });
    const twice = readClient([
      note([
        {
          client: "Bolt Logistics",
          body: "Bolt needs two hires in India.",
          dayIso: "2026-10-20",
        },
      ]),
      note([
        {
          client: "Bolt Logistics LLC",
          body: "Bolt wants to start by Dec 1.",
          dayIso: "2026-10-28",
        },
      ]),
      note([
        { client: "Crane Co", body: "Crane asked about Mexico.", dayIso: "2026-10-30" },
      ]),
    ]);
    assert.deepEqual(
      [twice?.name, twice?.sure, twice?.seen, twice?.day],
      ["Bolt Logistics LLC", "sure", 2, "10/28"],
    );
    assert.equal(
      readClient([
        note([{ client: "Crane Co", body: "Crane asked about Mexico.", dayIso: "" }]),
      ])?.sure,
      "likely",
    );
    assert.equal(
      readClient([
        note([
          { client: "Crane Co", body: "Crane might need someone in Mexico.", dayIso: "" },
        ]),
      ])?.sure,
      "unsure",
    );
    assert.equal(readClient([]), null);
  });

  test("the hand's name outranks the read's; the read's names the client ladder", () => {
    const rc = {
      name: "Bolt Logistics",
      sure: "likely" as const,
      seen: 1,
      day: "10/28",
      line: "x",
    };
    const read = buildRowFacts({
      intel: EMPTY_INTEL,
      docs: [],
      hand: NO_HAND,
      todayMd: "11/4",
      readClient: rc,
    });
    assert.deepEqual(
      [read.client.name, read.client.hand, read.client.sure],
      ["Bolt Logistics", false, "likely"],
    );
    const hand = buildRowFacts({
      intel: EMPTY_INTEL,
      docs: [],
      hand: { ...NO_HAND, client: "Crane Co", day: { client: "11/3" } },
      todayMd: "11/4",
      readClient: rc,
    });
    assert.deepEqual([hand.client.name, hand.client.hand], ["Crane Co", true]);
    const l = readLadders({
      docs: [],
      facts: read,
      outcome: null,
      demoHeld: null,
      hand: {},
    });
    assert.equal(l.client?.k, "named");
  });
});

describe("what a count counts", () => {
  test("the words after the figure first, then a line that names one kind", () => {
    assert.equal(
      headKind("We need 3 contractors in the UK and 10 employees in Mexico.", 3),
      "contractor",
    );
    assert.equal(
      headKind("We need 3 contractors in the UK and 10 employees in Mexico.", 10),
      "employee",
    );
    assert.equal(headKind("✉ Two hires in Bogotá.", 2), "employee");
    assert.equal(headKind("Twelve freelancers in Brazil.", 12), "contractor");
    assert.equal(headKind("12 people in Brazil.", 12), null);
    assert.equal(headKind("", 4), null);
  });

  test("the word: employees, contractors, or people when unsaid or mixed", () => {
    assert.equal(headWord(["employee"], 2), "employees");
    assert.equal(headWord(["contractor"], 1), "contractor");
    assert.equal(headWord(["employee", "contractor"], 5), "people");
    assert.equal(headWord([null], 1), "person");
    assert.equal(headWord([], 3), "people");
  });

  test("the map carries each country's kinds", () => {
    const facts = buildRowFacts({
      intel: {
        ...EMPTY_INTEL,
        countries: [{ value: "mx", src: "n1", at: "2026-10-30T15:00:00.000Z" }],
        headcounts: [
          { value: { n: 10, country: "mx" }, src: "n1", at: "2026-10-30T15:00:00.000Z" },
        ],
      },
      docs: [
        { text: "✉ 10 employees in Mexico.", at: "2026-10-30T15:00:00.000Z", src: "n1" },
      ],
      hand: NO_HAND,
      todayMd: "11/4",
    });
    assert.equal(facts.heads[0]!.kind, "employee");
    const [mx] = mapIndex([{ key: "a", name: "A", facts, live: true }], "2026-11-04");
    assert.deepEqual([mx!.people, mx!.kinds], [10, ["employee"]]);
  });
});

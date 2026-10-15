// The Sales Nav spine (ship order 2026-10-15): the links an alert email
// carries, unwrapped from Proofpoint URL Defense and LinkedIn's tracking
// redirect to the Sales Navigator page; the builder that turns every Sales
// Nav note on a book account into one dated list; and the worked read.
//
// The wrapped links here are built by the test's own encoder, in the shape
// the operator's real alert emails carry (checked against them 2026-10-15),
// so no real tracking token lives in the suite.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  alertLink,
  companyIdOf,
  readLinkLine,
  salesNavPage,
  salesNavSearch,
  unwrapUrlDefense,
} from "../src/lib/ingest/salesnav-links";
import { alertBlocks, grabsFromSalesNavEmail } from "../src/lib/ingest/salesnav-email";
import { planGrab } from "../src/lib/ingest/grab";
import { buildSpine, spineWorked, splitPayload } from "../src/lib/groundwork/spine";
import { KIND_GROUP, KIND_RULE } from "../src/lib/groundwork/spine-kinds";
import { intentFor, peopleSignalsFor } from "../src/lib/groundwork/signals";

const NOW = new Date("2026-10-15T15:00:00Z"); // 10:00 Chicago, Thursday

/** URL Defense v3, as Proofpoint writes it: the characters it will not
 *  carry become `*`, and their bytes ride base64url after `__;`. */
function wrap(url: string): string {
  let enc = "";
  let repl = "";
  for (const c of url) {
    if ("%&=?#".includes(c)) {
      enc += "*";
      repl += c;
    } else enc += c;
  }
  return `https://urldefense.com/v3/__${enc}__;${Buffer.from(repl).toString("base64url")}!!PCVGruIq!abc$`;
}

/** LinkedIn's tracking redirect around a Sales Navigator page. */
function tracked(page: string): string {
  const redirect = `${page}${page.includes("?") ? "&" : "?"}showAppPrompt=false&trk=eml-x&lipi=urn:li:page:x&midToken=AQE&midSig=0v&eid=e1`;
  const chooser = `https://www.linkedin.com/sales/contract-chooser?contractId=99&redirect=${encodeURIComponent(redirect)}`;
  return `https://www.linkedin.com/sales-web-view?url=${encodeURIComponent(chooser)}&useCase=x&midToken=AQE`;
}

describe("the links in an alert email", () => {
  test("URL Defense v3 unwraps, runs included", () => {
    const url = "https://www.linkedin.com/sales/lead/ACw,NAME_SEARCH,1234?msgType=inmail";
    assert.equal(unwrapUrlDefense(wrap(url).replace(/\$$/, "")), url);
    // A run: `**B` stands for three replacement characters at once.
    const run = `https://urldefense.com/v3/__https://x.test/a**Bb__;${Buffer.from("%2F").toString("base64url")}!!z`;
    assert.equal(unwrapUrlDefense(run), "https://x.test/a%2Fb");
    assert.equal(unwrapUrlDefense("https://example.com/plain"), null);
  });

  test("the tracking redirect falls away and the page stays, tokens dropped", () => {
    const post = "https://www.linkedin.com/sales/alert/urn:li:ugcPost:7515";
    assert.equal(salesNavPage(wrap(tracked("/sales/alert/urn:li:ugcPost:7515"))), post);
    const inmail = salesNavPage(
      wrap(tracked("/sales/lead/ADo,NAME_SEARCH,nSec?msgType=inmail")),
    );
    assert.equal(
      inmail,
      "https://www.linkedin.com/sales/lead/ADo,NAME_SEARCH,nSec?msgType=inmail",
    );
    assert.doesNotMatch(inmail ?? "", /trk|lipi|midToken|midSig|eid|contractId/);
  });

  test("a search keeps its own query, as it was written", () => {
    const q =
      "/sales/search/people?searchQuery=(companyV2:(includedValues:List((id:52947,text:Nextep)),scope:CURRENT))";
    const page = salesNavPage(wrap(tracked(q)));
    assert.equal(page, `https://www.linkedin.com${q}`);
    assert.equal(companyIdOf(page ?? ""), "52947");
  });

  test("anything that does not land on linkedin.com/sales is dropped", () => {
    assert.equal(salesNavPage("https://evil.test/sales/lead/x"), null);
    assert.equal(salesNavPage("http://www.linkedin.com/sales/lead/x"), null);
    assert.equal(salesNavPage("https://www.linkedin.com/in/someone"), null);
    assert.equal(salesNavPage("https://www.linkedin.com.evil.test/sales/x"), null);
    const chooser = `https://www.linkedin.com/sales/contract-chooser?redirect=${encodeURIComponent("//evil.test/x")}`;
    assert.equal(salesNavPage(chooser), null);
  });

  test("each button line reads as its label", () => {
    const at = (said: string, page: string) =>
      alertLink(`${said}: ${wrap(tracked(page))}`);
    assert.equal(at("View post", "/sales/alert/urn:li:share:1")?.label, "Post");
    assert.equal(
      at("Message", "/sales/lead/A,NAME_SEARCH,x?msgType=inmail")?.label,
      "InMail",
    );
    assert.equal(at("View", "/sales/lead/A,NAME_SEARCH,1234")?.label, "Profile");
    assert.equal(
      at("View employees", "/sales/search/people?query=(x)")?.label,
      "See who's active",
    );
    assert.equal(
      at("View Account IQ", "/sales/company/39978?anchor=aiq")?.label,
      "Account",
    );
    assert.equal(alertLink("View post: https://evil.test/x"), null);
    assert.deepEqual(
      readLinkLine("Link · Post · https://www.linkedin.com/sales/alert/urn:li:share:1"),
      {
        label: "Post",
        href: "https://www.linkedin.com/sales/alert/urn:li:share:1",
      },
    );
    assert.equal(readLinkLine("Link · Post · https://evil.test/sales/x"), null);
  });

  test("a search by name is a Sales Navigator search", () => {
    assert.equal(
      salesNavSearch("people", "Allie Menz"),
      "https://www.linkedin.com/sales/search/people?query=(keywords%3AAllie%20Menz)",
    );
  });
});

// The operator's own digest of 2026-10-13, in its shape, with links.
const DIGEST = [
  "OUTLOOK THREAD — dropped file Naomi_Walsh_shared_a_post.eml",
  "From: LinkedIn Sales Navigator <messages-noreply@linkedin.com>",
  "Sent: Tue, 13 Oct 2026 15:10:31 +0000 (UTC)",
  "Subject: Allie Menz shared a post",
  "",
  "Stay on top with Sales Navigator notifications",
  "",
  "Allie Menz shared a post",
  "Head of Client Operations · AlphaStaffHCM",
  "Engaging with their content is a natural way to stay visible.",
  `View post: ${wrap(tracked("/sales/alert/urn:li:ugcPost:7515"))}`,
  `Message: ${wrap(tracked("/sales/lead/ADo,NAME_SEARCH,nSec?msgType=inmail"))}`,
  "",
  "Employees at Nextep are active",
  "Find out who’s active and reach out to the right person.",
  `View employees: ${wrap(tracked("/sales/search/people?searchQuery=(companyV2:(includedValues:List((id:52947,text:Nextep)),scope:CURRENT))"))}`,
  "",
  "Jordan Ellis started a new position as VP of Operations at Nextep",
  "Previously Director of Operations at Armhr",
  `View profile: ${wrap(tracked("/sales/lead/ACw,NAME_SEARCH,1234"))}`,
  "",
  "Increase in buyer intent",
  "My HR Pros is now expressing High buyer intent in your company.",
  "",
  "View more on Sales Navigator: https://www.linkedin.com/sales/index",
  "Unsubscribe · Help",
].join("\n");

const ROSTER = [
  { id: "A1", name: "AlphaStaffHCM", emails: [], domains: [] },
  { id: "N1", name: "Nextep", emails: [], domains: [] },
  { id: "R1", name: "Armhr", emails: [], domains: [], people: ["jordan ellis"] },
  { id: "M1", name: "My HR Pros", emails: [], domains: [] },
];
const ACCOUNTS = ROSTER.map((r) => ({ id: r.id, name: r.name }));

/** The digest filed the way the pipeline files it: grabs, split per account. */
function filed(
  text: string,
  at = NOW,
): Map<string, { body: string; source: string; createdAt: string }[]> {
  const out = new Map<string, { body: string; source: string; createdAt: string }[]>();
  for (const g of grabsFromSalesNavEmail(text, at))
    for (const f of planGrab(g, ROSTER, at).filings) {
      const list = out.get(f.account.id) ?? [];
      list.unshift({ body: f.body, source: "salesnav", createdAt: at.toISOString() });
      out.set(f.account.id, list);
    }
  return out;
}

describe("an alert's links file with it, and never route it", () => {
  test("the blocks carry their links, unwrapped, and no line counts them", () => {
    const blocks = alertBlocks(DIGEST);
    assert.equal(blocks[0]!.lines.length, 2);
    assert.deepEqual(
      blocks[0]!.links.map((l) => l.label),
      ["Post", "InMail"],
    );
  });

  test("the alerts and the intent still file on their own accounts", () => {
    const notes = filed(DIGEST);
    assert.deepEqual([...notes.keys()].sort(), ["A1", "M1", "N1", "R1"]);
    assert.match(
      notes.get("A1")![0]!.body,
      /Link · Post · https:\/\/www\.linkedin\.com\/sales\/alert\//,
    );
    assert.doesNotMatch(notes.get("A1")![0]!.body, /urldefense|midToken|trk=/);
  });

  test("a link line never changes what the queue reads", () => {
    const notes = filed(DIGEST);
    const [post] = peopleSignalsFor(notes.get("A1"), NOW, "AlphaStaffHCM");
    assert.equal(post?.name, "Allie Menz");
    assert.equal(post?.title, "Head of Client Operations");
    assert.equal(intentFor(notes.get("M1"), NOW)?.level, "high");
  });
});

describe("the spine", () => {
  const spine = (now = NOW) => buildSpine(ACCOUNTS, filed(DIGEST), now);

  test("every alert on a book account, each on the account it names", () => {
    assert.deepEqual(
      spine()
        .map((i) => `${i.account} ${i.kind}`)
        .sort(),
      [
        "AlphaStaffHCM posted",
        "Armhr left",
        "My HR Pros intent",
        "Nextep active",
        "Nextep new-in-seat",
      ],
    );
  });

  test("dated by the email's send, kicked under its Chicago day", () => {
    const s = spine();
    assert.ok(s.every((i) => i.at.startsWith("2026-10-13T15:10")));
    assert.ok(
      s.every((i) => i.when === "week"),
      "Oct 13 is two days before Oct 15",
    );
    const next = spine(new Date("2026-10-14T15:00:00Z"));
    assert.ok(next.every((i) => i.when === "yesterday"));
    const same = spine(new Date("2026-10-13T20:00:00Z"));
    assert.ok(same.every((i) => i.when === "today"));
  });

  test("the queue's rule rides each alert that feeds one; activity feeds none", () => {
    const by = Object.fromEntries(spine().map((i) => [`${i.account} ${i.kind}`, i]));
    assert.equal(by["AlphaStaffHCM posted"]!.rule, "post-trigger");
    assert.equal(by["Nextep new-in-seat"]!.rule, "new-in-seat");
    assert.equal(by["Armhr left"]!.rule, "contact-left");
    assert.equal(by["My HR Pros intent"]!.rule, "intent-warm");
    assert.equal(by["Nextep active"]!.rule, null);
    for (const [k, r] of Object.entries(KIND_RULE))
      assert.ok(KIND_GROUP[k as keyof typeof KIND_GROUP], r);
  });

  test("each alert speaks in plain sentences", () => {
    const by = Object.fromEntries(spine().map((i) => [`${i.account} ${i.kind}`, i]));
    assert.equal(by["Armhr left"]!.label, "Left for Nextep");
    assert.equal(by["Armhr left"]!.line, "Took a role at Nextep.");
    assert.equal(by["Nextep new-in-seat"]!.line, "Started as VP of Operations.");
    assert.equal(by["My HR Pros intent"]!.line, "Buyer intent is High.");
    assert.equal(by["Nextep active"]!.line, "Their employees are active on LinkedIn.");
  });

  test("its own links first; an Account link from a company id the links name; a search when none", () => {
    const by = Object.fromEntries(spine().map((i) => [`${i.account} ${i.kind}`, i]));
    const post = by["AlphaStaffHCM posted"]!;
    assert.deepEqual(
      post.links.map((l) => l.label),
      ["Post", "InMail", "Account"],
    );
    assert.match(
      post.links[2]!.href,
      /\/sales\/search\/company\?query=\(keywords%3AAlphaStaffHCM\)/,
    );
    const active = by["Nextep active"]!;
    assert.equal(
      active.links.find((l) => l.label === "Account")?.href,
      "https://www.linkedin.com/sales/company/52947",
    );
    for (const it of spine())
      for (const l of it.links)
        assert.match(l.href, /^https:\/\/www\.linkedin\.com\/sales\//);
  });

  test("the same alert from the feed and the email is one item, every link kept", () => {
    const notes = filed(DIGEST);
    const feed =
      "SALESNAV ALERTS - captured 10/13/2026, 4:00:00 PM - 1 alerts\n\nLead: Allie Menz shared a post\nAlphaStaffHCM · Head of Client Operations\n1h\nClients keep asking how to hire in Mexico";
    notes
      .get("A1")!
      .unshift({ body: feed, source: "salesnav", createdAt: NOW.toISOString() });
    const posts = buildSpine(ACCOUNTS, notes, NOW).filter((i) => i.kind === "posted");
    assert.equal(posts.length, 1);
    assert.ok(posts[0]!.links.some((l) => l.label === "Post"));
    assert.ok(posts[0]!.quote.startsWith("Clients keep asking"));
  });

  test("three months back, folded by month past the week; nothing older, nothing from the future", () => {
    const later = buildSpine(ACCOUNTS, filed(DIGEST), new Date("2026-10-21T15:00:00Z"));
    assert.equal(later.length, 5);
    assert.ok(
      later.every((i) => i.when === "2026-10"),
      "eight days on, they fold under October",
    );
    const dec = buildSpine(ACCOUNTS, filed(DIGEST), new Date("2026-12-20T15:00:00Z"));
    assert.ok(dec.every((i) => i.when === "2026-10"));
    assert.deepEqual(
      buildSpine(ACCOUNTS, filed(DIGEST), new Date("2027-01-12T15:00:00Z")),
      [],
    );
    assert.deepEqual(
      buildSpine(ACCOUNTS, filed(DIGEST), new Date("2026-10-12T15:00:00Z")),
      [],
    );
  });

  test("keys hold across a reload and across two copies of one alert", () => {
    const a = spine().map((i) => i.key);
    const b = buildSpine(
      ACCOUNTS,
      filed(DIGEST, new Date("2026-10-15T18:00:00Z")),
      NOW,
    ).map((i) => i.key);
    assert.deepEqual(a.sort(), b.sort());
    assert.equal(new Set(a).size, a.length);
  });

  test("the daily grab's rise and badge are events too", () => {
    const notes = new Map([
      [
        "R1",
        [
          {
            body: "SALESNAV ACCOUNTS - captured 10/15/2026, 9:05:00 AM - 118 rows collected\n\nArmhr\nHigh\n4 activities\nDeborah Dhuy\n· 3rd\nDirector of Project Services\nRecently hired",
            source: "salesnav",
            createdAt: "2026-10-15T14:06:00Z",
          },
          {
            body: "SALESNAV ACCOUNTS - captured 10/14/2026, 9:05:00 AM - 118 rows collected\n\nArmhr\nModerate\n1 activity",
            source: "salesnav",
            createdAt: "2026-10-14T14:06:00Z",
          },
        ],
      ],
    ]);
    const s = buildSpine(ACCOUNTS, notes, NOW);
    assert.deepEqual(s.map((i) => `${i.kind} ${i.label}`).sort(), [
      "intent Intent ↑ High",
      "new-in-seat New in seat",
    ]);
    assert.equal(
      s.find((i) => i.kind === "intent")!.line,
      "Intent rose to High · 4 activities.",
    );
    assert.ok(s.every((i) => i.when === "today"));
  });

  test("an account alert naming another company stays off this account", () => {
    const notes = new Map([
      [
        "N1",
        [
          {
            body: "SALESNAV ALERTS - captured 10/15/2026, 9:00:00 AM - 1 alerts\n\nEmployees at Armhr are active",
            source: "salesnav",
            createdAt: NOW.toISOString(),
          },
        ],
      ],
    ]);
    assert.deepEqual(buildSpine(ACCOUNTS, notes, NOW), []);
  });
});

describe("worked, and the draft's parts", () => {
  const it = {
    accountId: "A1",
    rule: "post-trigger" as const,
    at: "2026-10-13T15:10:31Z",
  };

  test("worked when its move was stamped on its day or after; take-back only today", () => {
    assert.deepEqual(spineWorked(it, ["groundwork:2026-10-15:A1:post-trigger"], NOW), {
      worked: true,
      today: true,
    });
    assert.deepEqual(spineWorked(it, ["groundwork:2026-10-14:A1:post-trigger"], NOW), {
      worked: true,
      today: false,
    });
    assert.deepEqual(spineWorked(it, ["groundwork:2026-10-12:A1:post-trigger"], NOW), {
      worked: false,
      today: false,
    });
    assert.equal(
      spineWorked(it, ["groundwork:2026-10-15:A1:intent-warm"], NOW).worked,
      false,
    );
    assert.equal(
      spineWorked({ ...it, rule: null }, ["groundwork:2026-10-15:A1:post-trigger"], NOW)
        .worked,
      false,
    );
  });

  test("a composed payload splits into to, subject and body", () => {
    assert.deepEqual(
      splitPayload("To: Dana Ruiz\nSubject: Hi\n\nLine one.\n\nLine two."),
      {
        to: "Dana Ruiz",
        subject: "Hi",
        body: "Line one.\n\nLine two.",
      },
    );
    assert.deepEqual(splitPayload("To: Allie Menz\n\nHi Allie —"), {
      to: "Allie Menz",
      subject: "",
      body: "Hi Allie —",
    });
    assert.deepEqual(splitPayload("Just a body."), {
      to: "",
      subject: "",
      body: "Just a body.",
    });
  });
});

describe("the review's cases (2026-10-15)", () => {
  test("a malformed escape in a link never throws, in the email or on the page", () => {
    assert.doesNotThrow(() => salesNavPage("https://www.linkedin.com/sales/x%ZZ"));
    assert.doesNotThrow(() =>
      salesNavPage(`https://www.linkedin.com/sales-web-view?url=${"%E0%A4%A"}`),
    );
    assert.equal(companyIdOf("https://www.linkedin.com/sales/x%ZZ"), "");
    const email = [
      "From: LinkedIn <messages-noreply@linkedin.com>",
      "Subject: Sales Navigator",
      "",
      "Allie Menz shared a post",
      "View post: https://www.linkedin.com/sales/alert/1?%ZZ=1",
    ].join("\n");
    assert.doesNotThrow(() => grabsFromSalesNavEmail(email, NOW));
    const notes = new Map([
      [
        "A1",
        [
          {
            body: "SALESNAV ALERTS - captured 10/15/2026, 9:00:00 AM - 1 alerts - from an alert email\n\nAllie Menz shared a post\nLink · Post · https://www.linkedin.com/sales/x%ZZ",
            source: "salesnav",
            createdAt: NOW.toISOString(),
          },
        ],
      ],
    ]);
    assert.doesNotThrow(() => buildSpine(ACCOUNTS, notes, NOW));
  });

  test("a link line is never the alert's company or title", () => {
    const email = [
      "From: LinkedIn <messages-noreply@linkedin.com>",
      "Subject: Sales Navigator",
      "",
      "Jordan Ellis has a new position",
      "Engaging with their content is a natural way to stay visible.",
      `View profile: ${wrap(tracked("/sales/lead/ACw,NAME_SEARCH,1234"))}`,
    ].join("\n");
    const [alerts] = grabsFromSalesNavEmail(email, NOW);
    const body = `${alerts!.split("\n\n")[0]}\n\nJordan Ellis has a new position\n${alerts!.split("\n").find((l) => l.startsWith("Link · "))}`;
    const notes = [{ body, source: "salesnav", createdAt: NOW.toISOString() }];
    const [s] = peopleSignalsFor(notes, NOW, "Armhr");
    assert.equal(s?.kind, "new-in-seat");
    assert.equal(s?.company, "");
    assert.equal(s?.title, "");
  });

  test("a filed link that walks out of /sales/ is dropped", () => {
    assert.equal(
      readLinkLine(
        "Link · Post · https://www.linkedin.com/sales/../redir/redirect?url=https%3A%2F%2Fevil.test",
      ),
      null,
    );
    assert.equal(
      readLinkLine("Link · Post · https://www.linkedin.com/sales/..\\redir/x"),
      null,
    );
  });

  test("only an alert email files links: the feed grab's text never becomes a button", () => {
    const notes = new Map([
      [
        "A1",
        [
          {
            body: "SALESNAV ALERTS - captured 10/15/2026, 9:00:00 AM - 1 alerts\n\nLead: Allie Menz shared a post\nAlphaStaffHCM · Head of Client Operations\n1h\nLink · Post · https://www.linkedin.com/sales/alert/urn:li:share:9",
            source: "salesnav",
            createdAt: NOW.toISOString(),
          },
        ],
      ],
    ]);
    const [post] = buildSpine(ACCOUNTS, notes, NOW);
    assert.equal(
      post?.links.some((l) => l.label === "Post"),
      false,
    );
  });

  test("one post seen across a day line is one card, the email's link kept", () => {
    const notes = filed(DIGEST);
    const feed =
      "SALESNAV ALERTS - captured 10/14/2026, 9:00:00 AM - 1 alerts\n\nLead: Allie Menz shared a post\nAlphaStaffHCM · Head of Client Operations\n17h\nClients keep asking";
    notes
      .get("A1")!
      .unshift({ body: feed, source: "salesnav", createdAt: NOW.toISOString() });
    const posts = buildSpine(ACCOUNTS, notes, NOW).filter((i) => i.kind === "posted");
    assert.equal(posts.length, 1);
    assert.ok(posts[0]!.links.some((l) => l.label === "Post"));
    const alone = buildSpine(ACCOUNTS, filed(DIGEST), NOW).find(
      (i) => i.kind === "posted",
    );
    assert.equal(
      posts[0]!.key,
      alone!.key,
      "the earlier sighting's key holds, so a ✕ holds",
    );
  });
});

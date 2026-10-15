// Sales Navigator alert emails and job moves (2026-10-14): an alert email
// read as the alerts and intent grabs it carries, the inbound route's
// readers and its gate, a job move filed on both companies, and the
// contact-left move on the account the person left.
//
// The email below is SYNTHETIC: LinkedIn's real alert email layout is not in
// the record yet. It is built from the alert sentences the operator's own
// Home feed shows (the July screenshots) wrapped in an email's furniture, so
// the reader is held to sentences, never to a template.

import { strict as assert } from "node:assert";
import { afterEach, describe, test } from "node:test";
import {
  alertBlocks,
  grabsFrom,
  grabsFromSalesNavEmail,
  isSalesNavEmail,
  sentStamp,
} from "../src/lib/ingest/salesnav-email";
import {
  attachedText,
  emailText,
  htmlToText,
  MAX_ATTACHED,
  messageAttachments,
  secretOk,
} from "../src/lib/ingest/inbound-email";
import { planGrab } from "../src/lib/ingest/grab";
import {
  capturedOf,
  intentFor,
  intentReadDue,
  peopleSignalsFor,
} from "../src/lib/groundwork/signals";
import { buildQueue } from "../src/lib/groundwork/day";
import { composeFor } from "../src/lib/groundwork/compose";
import { stampSubtext } from "../src/lib/groundwork/stamp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Peo } from "../src/lib/book";
import type { DealIntel } from "../src/lib/intel/types";

const NOW = new Date("2026-10-14T15:00:00Z");

const EMAIL = [
  "OUTLOOK THREAD - captured 10/14/2026, 9:40:00 AM",
  "",
  "From: LinkedIn Sales Navigator <messages-noreply@linkedin.com>",
  "Sent: Tuesday, October 13, 2026 7:02 AM",
  "To: Antaeus Coe",
  "Subject: Your Sales Navigator alerts",
  "",
  "Sales Navigator",
  "Here's what happened with your saved leads and accounts",
  "",
  "Allie Menz shared a post",
  "Head of Client Operations at AlphaStaffHCM",
  "Clients keep asking how to hire in Mexico without an entity…",
  "View post",
  "",
  "Jordan Ellis started a new position as VP of Operations at Nextep",
  "Previously Director of Operations at Armhr",
  "View profile",
  "",
  "Increase in buyer intent",
  "My HR Pros is now expressing High buyer intent in your company.",
  "",
  "Gordon J. Maier & Company, LLP posted a new photo.",
  "",
  "View all alerts",
  "Unsubscribe · Help Center",
  "© 2026 LinkedIn Corporation, 1000 West Maude Avenue, Sunnyvale, CA 94085.",
].join("\n");

const ROSTER = [
  { id: "A1", name: "AlphaStaffHCM", emails: [], domains: [] },
  { id: "A2", name: "Armhr", emails: [], domains: [], people: ["jordan ellis"] },
  { id: "A3", name: "Nextep", emails: [], domains: [] },
  { id: "A4", name: "My HR Pros", emails: [], domains: [] },
];

describe("an alert email is a grab", () => {
  test("LinkedIn's, about Sales Navigator, with an alert line", () => {
    assert.equal(isSalesNavEmail(EMAIL), true);
    assert.equal(
      isSalesNavEmail(
        "OUTLOOK THREAD - captured 10/14/2026\n\nFrom: Dana <dana@acme.com>\nCan we talk Canada?",
      ),
      false,
    );
    assert.equal(
      isSalesNavEmail(
        "From: LinkedIn <jobs@linkedin.com>\nSales Navigator trial ends soon",
      ),
      false,
      "LinkedIn mail with no alert line is not one",
    );
    assert.equal(
      isSalesNavEmail("SALESNAV ACCOUNTS - captured 10/14/2026\n\nArmhr"),
      false,
    );
  });

  test("its alerts split into blocks, the footer and the buttons left out", () => {
    const blocks = alertBlocks(EMAIL);
    assert.deepEqual(
      blocks.map((b) => [b.kind, b.lines[0]]),
      [
        ["person", "Allie Menz shared a post"],
        ["person", "Jordan Ellis started a new position as VP of Operations at Nextep"],
        ["intent", "My HR Pros is now expressing High buyer intent in your company."],
        ["account", "Gordon J. Maier & Company, LLP posted a new photo."],
      ],
    );
    assert.ok(blocks.every((b) => !b.lines.some((l) => /^view|unsubscribe|©/i.test(l))));
  });

  test("it files as an alerts grab and an intent grab, stamped with the day it was sent", () => {
    assert.match(sentStamp(EMAIL) ?? "", /^10\/13\/2026/);
    const [alerts, intent] = grabsFromSalesNavEmail(EMAIL, NOW);
    assert.match(alerts ?? "", /^SALESNAV ALERTS - captured 10\/13\/2026, .* - 3 alerts/);
    assert.match(
      intent ?? "",
      /^SALESNAV INTENT - captured 10\/13\/2026, .* - 1 accounts/,
    );
    assert.deepEqual(grabsFrom(EMAIL, NOW), [alerts, intent]);
    assert.deepEqual(grabsFrom("a plain note"), []);
  });

  test("each alert files on the account it names; a job move files on both companies", () => {
    const [alerts, intent] = grabsFromSalesNavEmail(EMAIL, NOW);
    const plan = planGrab(alerts!, ROSTER, NOW);
    const on = Object.fromEntries(plan.filings.map((f) => [f.account.name, f.body]));
    assert.match(on.AlphaStaffHCM ?? "", /Allie Menz shared a post/);
    assert.match(on.Nextep ?? "", /Jordan Ellis started a new position/);
    assert.match(on.Armhr ?? "", /Jordan Ellis started a new position/);
    assert.equal(plan.missed.length, 1, "the company photo names no book account");
    const iplan = planGrab(intent!, ROSTER, NOW);
    assert.deepEqual(
      iplan.filings.map((f) => f.account.name),
      ["My HR Pros"],
    );
  });

  test("an emailed intent reading is a reading, and never quiets the daily grab's nudge", () => {
    const [, intent] = grabsFromSalesNavEmail(EMAIL, NOW);
    const body = planGrab(intent!, ROSTER, NOW).filings[0]!.body;
    const notes = [{ body, source: "salesnav", createdAt: NOW.toISOString() }];
    assert.equal(intentFor(notes, NOW)?.level, "high");
    assert.equal(intentReadDue(new Map([["A4", notes]]), NOW), true);
  });

  test("the alerts date from the email, not the day it was filed", () => {
    const [alerts] = grabsFromSalesNavEmail(EMAIL, NOW);
    const body = planGrab(alerts!, ROSTER, NOW).filings.find(
      (f) => f.account.name === "AlphaStaffHCM",
    )!.body;
    const [post] = peopleSignalsFor(
      [{ body, source: "salesnav", createdAt: "2026-10-15T15:00:00Z" }],
      new Date("2026-10-15T16:00:00Z"),
      "AlphaStaffHCM",
    );
    assert.equal(post?.at.slice(0, 10), "2026-10-13");
    assert.equal(post?.company, "AlphaStaffHCM");
    assert.equal(post?.title, "Head of Client Operations");
  });
});

describe("a job move on both accounts", () => {
  const acct = (over: Partial<Peo>): Peo => ({
    id: "X",
    name: "X",
    cloud: "TST",
    csm: "Unassigned",
    contactName: "",
    contactEmail: "",
    size: 100,
    sizeBucket: "Small",
    industry: "PEO/ASO",
    city: "Chicago",
    state: "IL",
    website: "",
    lastActivity: "2026-07-01",
    fit: 40,
    fitTier: "low",
    ...over,
  });
  const armhr = acct({ id: "A2000000000000002", name: "Armhr" });
  const nextep = acct({ id: "A3000000000000003", name: "Nextep" });
  const [alerts] = grabsFromSalesNavEmail(EMAIL, NOW);
  const plan = planGrab(
    alerts!,
    ROSTER.map((r) => ({
      ...r,
      id: r.id === "A2" ? armhr.id : r.id === "A3" ? nextep.id : r.id,
    })),
    NOW,
  );
  const bodyOn = (id: string) => plan.filings.find((f) => f.account.id === id)!.body;
  const queue = () =>
    buildQueue({
      accounts: [armhr, nextep],
      intelById: new Map<string, DealIntel>(),
      notesById: new Map([
        [
          armhr.id,
          [{ body: bodyOn(armhr.id), source: "salesnav", createdAt: NOW.toISOString() }],
        ],
        [
          nextep.id,
          [{ body: bodyOn(nextep.id), source: "salesnav", createdAt: NOW.toISOString() }],
        ],
      ]),
      touches: [],
      contactCountById: () => 5,
      now: NOW,
    }).all;

  test("the account they left asks who replaces them; the one they joined meets them", () => {
    const all = queue();
    const left = all.find((q) => q.accountId === armhr.id && q.ruleId === "contact-left");
    const joined = all.find(
      (q) => q.accountId === nextep.id && q.ruleId === "new-in-seat",
    );
    assert.equal(left?.action, "Ask who replaces Jordan Ellis.");
    assert.equal(left?.reason, "Left for Nextep October 13.");
    assert.equal(joined?.action, "Meet Jordan Ellis.");
    assert.equal(
      all.find((q) => q.accountId === armhr.id && q.ruleId === "new-in-seat"),
      undefined,
    );
  });

  test("the note goes to the person who left, on LinkedIn, and asks who picks up their work", () => {
    const left = queue().find((q) => q.ruleId === "contact-left")!;
    const c = composeFor({
      ruleId: "contact-left",
      account: armhr,
      intent: null,
      contactName: "Pat Example",
      person: left.person,
    });
    assert.match(c.payload, /^To: Jordan Ellis/);
    assert.match(
      c.payload,
      /Hi Jordan — congrats on the move to Nextep\. Quick one: who's picking up your work at Armhr\?/,
    );
    assert.match(c.to, /LinkedIn message; their old address is gone/);
    assert.equal(
      stampSubtext("contact-left", { personName: "Jordan Ellis" }),
      "ASKED JORDAN ELLIS WHO TAKES OVER",
    );
  });
});

describe("the inbound route's readers", () => {
  const prior = process.env.SALESNAV_INBOUND_SECRET;
  afterEach(() => {
    if (prior === undefined) delete process.env.SALESNAV_INBOUND_SECRET;
    else process.env.SALESNAV_INBOUND_SECRET = prior;
  });
  const req = (headers: Record<string, string>, key = "") => ({
    headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    nextUrl: { searchParams: { get: (n: string) => (n === "key" && key ? key : null) } },
  });

  test("the secret opens it three ways; no secret configured opens nothing", () => {
    delete process.env.SALESNAV_INBOUND_SECRET;
    assert.equal(secretOk(req({ authorization: "Bearer " })), false);
    process.env.SALESNAV_INBOUND_SECRET = "s3cret-0123456789abcdef";
    assert.equal(
      secretOk(req({ authorization: "Bearer s3cret-0123456789abcdef" })),
      true,
    );
    assert.equal(secretOk(req({ "x-inbound-secret": "s3cret-0123456789abcdef" })), true);
    assert.equal(secretOk(req({}, "s3cret-0123456789abcdef")), true);
    assert.equal(secretOk(req({ authorization: "Bearer wrong" })), false);
    process.env.SALESNAV_INBOUND_SECRET = "short";
    assert.equal(
      secretOk(req({ authorization: "Bearer short" })),
      false,
      "a weak secret opens nothing",
    );
  });

  test("Postmark's JSON, a form post's fields and an HTML-only body all read as the email", () => {
    const pm = emailText({
      From: "messages-noreply@linkedin.com",
      Subject: "Your Sales Navigator alerts",
      Date: "Tue, 13 Oct 2026 07:02:00 -0500",
      TextBody:
        "Sales Navigator\nAllie Menz shared a post\nHead of Client Operations at AlphaStaffHCM",
    });
    assert.equal(isSalesNavEmail(pm), true);
    assert.match(sentStamp(pm) ?? "", /^10\/13\/2026/);
    const sg = emailText({
      from: "LinkedIn <x@linkedin.com>",
      subject: "Sales Navigator",
      text: "Allie Menz shared a post",
    });
    assert.match(sg, /^From: LinkedIn/);
    const html = emailText({
      from: "x@linkedin.com",
      subject: "Sales Navigator alerts",
      html: "<div>Allie Menz shared a post</div><p>Head of Client Operations at AlphaStaffHCM</p><a>View post</a>",
    });
    assert.match(
      html,
      /Allie Menz shared a post\nHead of Client Operations at AlphaStaffHCM/,
    );
    assert.equal(htmlToText("a&nbsp;&amp;&#39;b<br>c"), "a &'b\nc");
  });

  test("the route checks its secret before it reads a byte, and files only through the split", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/inbound/salesnav/route.ts"),
      "utf8",
    );
    const post = route.slice(route.indexOf("export async function POST("));
    assert.ok(post.indexOf("secretOk(req)") > 0);
    assert.ok(
      post.indexOf("secretOk(req)") < post.indexOf("readCapped(req)"),
      "the gate comes first",
    );
    assert.match(post, /fileGrabTexts\(grabs, "inbound", \[\]\)/);
    assert.doesNotMatch(route, /createAccountNoteRow|roomPaste/);
    // A route file exports its handlers and nothing a browser could call.
    assert.deepEqual(
      [...route.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map(
        (m) => m[1],
      ),
      ["dynamic", "maxDuration", "POST"],
    );
  });
});

describe("the review's cases (second pass, 2026-10-14)", () => {
  test("an ordinary thread that mentions Sales Navigator files as itself", () => {
    const reply = [
      "OUTLOOK THREAD - captured 10/14/2026, 9:40:00 AM",
      "",
      "From: Dana Ruiz <dana@amplifyhr.com>",
      "Sent: Tuesday, October 13, 2026 2:10 PM",
      "Subject: RE: Global",
      "",
      "Our client is hiring a payroll lead in Mexico. Can we talk Thursday?",
      "",
      "From: Antaeus Coe <acoe@prismhr.com>",
      "I found you through LinkedIn Sales Navigator.",
    ].join("\n");
    assert.deepEqual(grabsFrom(reply), []);
    const internal = [
      "From: Aleks Boruk <aboruk@prismhr.com>",
      "Subject: FW: Your Sales Navigator alerts",
      "",
      "LinkedIn says Allie Menz shared a post, worth a look.",
      "Allie Menz shared a post",
    ].join("\n");
    assert.deepEqual(
      grabsFrom(internal),
      [],
      "a colleague's forward has the colleague's From line",
    );
    const tape = [
      "CALL TRANSCRIPT - Amplify - 10/13/2026",
      "From: x@linkedin.com",
      "Jane: someone found us on LinkedIn, through Sales Navigator.",
      "Jane Doe changed jobs last spring.",
    ].join("\n");
    assert.deepEqual(grabsFrom(tape), [], "a call is never an alert email");
  });

  test("a sentence that is not a person's alert never opens one", () => {
    const mail = (line: string) =>
      `From: LinkedIn <messages-noreply@linkedin.com>\nSubject: Sales Navigator\n\n${line}`;
    for (const l of [
      "Our client shared a post about Mexico.",
      "she started a new position in May",
      "Maria changed jobs last spring",
    ])
      assert.equal(alertBlocks(mail(l)).filter((b) => b.kind === "person").length, 0, l);
    assert.equal(alertBlocks(mail("Maria de la Cruz shared a post"))[0]?.kind, "person");
  });

  test("a job sentence inside a post's words is the post's, never a move", () => {
    const grab = [
      "SALESNAV ALERTS - captured 10/14/2026, 9:20:00 AM - 1 alerts",
      "",
      "Jane Doe shared a post",
      "AlphaStaffHCM · VP Ops",
      "2d",
      "Congrats to Sam, who started a new position at Nextep.",
    ].join("\n");
    const plan = planGrab(grab, ROSTER, NOW);
    assert.deepEqual(
      plan.filings.map((f) => f.account.name),
      ["AlphaStaffHCM"],
    );
  });

  test("Outlook's zoneless Sent line is the Chicago clock, whatever zone the server runs in", () => {
    const prior = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const s = sentStamp(
        "From: x@linkedin.com\nSent: Tuesday, October 13, 2026 12:30 AM\n",
      );
      assert.match(s ?? "", /^10\/13\/2026, 12:30:00 AM$/);
      const z = sentStamp("Date: Tue, 13 Oct 2026 07:02:00 -0500\n");
      assert.match(z ?? "", /^10\/13\/2026, 7:02:00 AM$/);
    } finally {
      if (prior === undefined) delete process.env.TZ;
      else process.env.TZ = prior;
    }
  });

  test("the capture stamp reads Chicago's offset for its date, from the head line only", () => {
    assert.equal(
      new Date(
        capturedOf("SALESNAV ALERTS - captured 12/3/2026, 12:30:00 AM - 1 alerts"),
      ).toISOString(),
      "2026-12-03T06:30:00.000Z",
    );
    assert.ok(
      Number.isNaN(capturedOf("SALESNAV ALERTS - 1 alerts\n\nPost: captured 1/2/2026")),
    );
  });

  test("a late-dropped intent email loses to a fresher grab", () => {
    const old = {
      body: "SALESNAV INTENT - captured 10/10/2026, 7:00:00 AM - 1 accounts\n\nMy HR Pros is now expressing High buyer intent in your company.",
      source: "salesnav",
      createdAt: "2026-10-14T16:00:00Z",
    };
    const grab = {
      body: "SALESNAV ACCOUNTS - captured 10/14/2026, 9:05:00 AM - 118 rows collected\n\nMy HR Pros\nNeutral\n0 activities",
      source: "salesnav",
      createdAt: "2026-10-14T14:06:00Z",
    };
    assert.equal(intentFor([old, grab], new Date("2026-10-14T17:00:00Z")), null);
  });
});

describe("a forwarded alert at the inbound route", () => {
  const fwd = [
    "From: Antaeus Coe <acoe@prismhr.com>",
    "Subject: FW: Your Sales Navigator alerts",
    "",
    "---------- Forwarded message ----------",
    "From: LinkedIn Sales Navigator <messages-noreply@linkedin.com>",
    "Date: Tue, 13 Oct 2026 07:02:00 -0500",
    "",
    "Allie Menz shared a post",
    "Head of Client Operations at AlphaStaffHCM",
  ].join("\n");

  test("the inbound route takes the operator's forward; the Chute and paste never do", () => {
    assert.equal(grabsFromSalesNavEmail(fwd, NOW, { forwarded: true }).length, 1);
    assert.deepEqual(grabsFrom(fwd, NOW), []);
  });
});

// The operator's own Sales Navigator digest (received 2026-10-13, dropped
// 2026-10-14), as the app's .eml reader turns it into text (emlToPaste).
// Tracking links are replaced with <link>; every other line is verbatim.
const REAL_DIGEST = [
  "OUTLOOK THREAD — dropped file Naomi_Walsh_shared_a_post.eml",
  "From: LinkedIn Sales Navigator <messages-noreply@linkedin.com>",
  "To: Antaeus Coe <antaeus.coe@prismhr.com>",
  "Sent: Tue, 13 Oct 2026 15:10:31 +0000 (UTC)",
  "Subject: Naomi Walsh shared a post",
  "",
  "Stay on top with Sales Navigator notifications",
  "",
  "Naomi Walsh shared a post",
  "Associate Director · Strive - GTM Talent Partner",
  "Engaging with their content is a natural way to stay visible.",
  "View post: https://urldefense.com/<link>",
  "Message: https://urldefense.com/<link>",
  "",
  "Naomi Walsh shared a post",
  "Associate Director · Strive - GTM Talent Partner",
  "Engaging with their content helps them remember you.",
  "View post: https://urldefense.com/<link>",
  "",
  "New post from Base.com",
  "See what your saved account is talking about.",
  "View post: https://urldefense.com/<link>",
  "",
  "Employees at Nextep are active",
  "Find out who’s active and reach out to the right person.",
  "View employees: https://urldefense.com/<link>",
  "",
  "Your Account IQ summary for AlphaStaffHCM is ready",
  "Get AI insights to prepare for your next conversation.",
  "View Account IQ: https://urldefense.com/<link>",
  "",
  "Leadership at Engage PEO has been active",
  "Senior activity at your account can signal shifts in priorities.",
  "View leadership activity: https://urldefense.com/<link>",
  "",
  "View more on Sales Navigator: https://urldefense.com/<link>",
  "",
  "----------------------------------------",
  "",
  "This email was intended for Antaeus Coe (Complex Ai Enterprise Sales | Strategic Enterprise SaaS Consultant)",
  "Learn why we included this: https://urldefense.com/<link>",
  "You are receiving LinkedIn notification emails.",
  "",
  "Unsubscribe: https://urldefense.com/<link>   ·  Help: https://urldefense.com/<link>",
  "",
  "© 2026 LinkedIn Corporation, 1000 West Maude Avenue, Sunnyvale, CA 94085.",
].join("\n");

describe("the operator's real Sales Navigator digest", () => {
  const roster = [
    { id: "N1", name: "Nextep", emails: [], domains: [] },
    { id: "E1", name: "Engage PEO", emails: [], domains: [] },
    { id: "A1", name: "AlphaStaffHCM", emails: [], domains: [] },
  ];

  test("it reads as an alert email, sent 10:10 AM Chicago, every alert a block, no links or coaching kept", () => {
    assert.equal(isSalesNavEmail(REAL_DIGEST), true);
    assert.equal(sentStamp(REAL_DIGEST), "10/13/2026, 10:10:31 AM");
    const blocks = alertBlocks(REAL_DIGEST);
    assert.deepEqual(
      blocks.map((b) => [b.kind, b.lines[0]]),
      [
        ["person", "Naomi Walsh shared a post"],
        ["person", "Naomi Walsh shared a post"],
        ["account", "New post from Base.com"],
        ["account", "Employees at Nextep are active"],
        ["account", "Leadership at Engage PEO has been active"],
      ],
      "the Account IQ notice is not an alert",
    );
    for (const b of blocks)
      assert.ok(
        !b.lines.some((l) =>
          /https?:|^engaging with|^see what|^find out|^senior activity/i.test(l),
        ),
        b.lines.join(" | "),
      );
  });

  test("book accounts get their alerts; everyone else files nothing", () => {
    const [alerts] = grabsFromSalesNavEmail(REAL_DIGEST, NOW);
    const plan = planGrab(alerts!, roster, NOW);
    assert.deepEqual(plan.filings.map((f) => f.account.name).sort(), [
      "Engage PEO",
      "Nextep",
    ]);
    assert.equal(
      plan.missed.length,
      3,
      "Naomi Walsh twice and Base.com name no book account",
    );
  });

  test("the digest's 'Title · Company' line reads the right way round", () => {
    const [alerts] = grabsFromSalesNavEmail(REAL_DIGEST, NOW);
    const [post] = peopleSignalsFor(
      [{ body: alerts!, source: "salesnav", createdAt: NOW.toISOString() }],
      NOW,
    );
    assert.equal(post?.name, "Naomi Walsh");
    assert.equal(post?.title, "Associate Director");
    assert.equal(post?.company, "Strive - GTM Talent Partner");
  });
});

describe("the backfill: alerts forwarded as attachments (2026-10-15)", () => {
  const eml = (sent: string, who: string) =>
    [
      "From: LinkedIn Sales Navigator <messages-noreply@linkedin.com>",
      "To: Antaeus Coe <antaeus.coe@prismhr.com>",
      `Date: ${sent}`,
      `Subject: ${who} shared a post`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Sales Navigator",
      `${who} shared a post`,
      "Head of Client Operations at AlphaStaffHCM",
      "Clients keep asking how to hire in Mexico.",
      "",
    ].join("\r\n");
  const b64 = (t: string) => Buffer.from(t, "utf8").toString("base64");
  const post = {
    From: "antaeus.coe@prismhr.com",
    Subject: "FW: three alerts",
    TextBody: "See attached.",
    Attachments: [
      {
        Name: "a.eml",
        ContentType: "message/rfc822",
        Content: b64(eml("Tue, 14 Jul 2026 07:02:00 -0500", "Allie Menz")),
      },
      { Name: "logo.png", ContentType: "image/png", Content: "iVBORw0KGgo=" },
      {
        Name: "b.eml",
        ContentType: "message/rfc822",
        Content: b64(eml("Mon, 03 Aug 2026 08:15:00 -0500", "Allie Menz")),
      },
    ],
  };

  test("only the attached messages are read; an image is left alone", () => {
    const list = messageAttachments(post);
    assert.deepEqual(
      list.map((a) => a.name),
      ["a.eml", "b.eml"],
    );
  });

  test("each attached alert files at its own sent date", async () => {
    const texts = await Promise.all(messageAttachments(post).map(attachedText));
    assert.equal(
      grabsFromSalesNavEmail(emailText(post), NOW, { forwarded: true }).length,
      0,
    );
    const grabs = texts.flatMap((t) =>
      grabsFromSalesNavEmail(t, NOW, { forwarded: true }),
    );
    assert.equal(grabs.length, 2);
    assert.match(grabs[0]!, /7\/14\/2026/);
    assert.match(grabs[1]!, /8\/3\/2026/);
    const plan = planGrab(grabs[0]!, ROSTER, NOW);
    assert.deepEqual(
      plan.filings.map((f) => f.account.id),
      ["A1"],
    );
    assert.equal(plan.day, "2026-07-14");
  });

  test("a broken attachment reads as nothing and the batch is capped", async () => {
    assert.equal(
      await attachedText({
        name: "x.msg",
        type: "application/vnd.ms-outlook",
        content: "AAAA",
      }),
      "",
    );
    const many = {
      Attachments: Array.from({ length: MAX_ATTACHED + 5 }, (_, i) => ({
        Name: `${i}.eml`,
        ContentType: "message/rfc822",
        Content: "eA==",
      })),
    };
    assert.equal(messageAttachments(many).length, MAX_ATTACHED);
  });
});

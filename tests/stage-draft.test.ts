// The draft on the stage (ship order 2026-10-19; CLAUDE.md, "The draft on
// the stage"): the stagedraft grammar, the stage's action line, the mailto
// Send opens, the "Why this note" fold, Send's marker, the drafter's reader
// and voice, the drafts job's gate and schedule, and the sent copy's reader
// and router. The people and addresses below are synthetic.

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  DRAFT_KEEP_DAYS,
  EMAIL_RULES,
  SEND_WAIT_NS,
  collisionInstruction,
  draftForMove,
  draftedLine,
  draftedToday,
  mailtoHref,
  parseStageDraft,
  renderStageDraft,
  stageAction,
  waitsToday,
  whyLines,
  type StageDraft,
} from "../src/lib/groundwork/stage-draft";
import {
  DRAFTER_SYSTEM,
  drafterPrompt,
  readDraftAnswer,
} from "../src/lib/groundwork/drafter";
import { cronOk } from "../src/lib/cron";
import {
  addressesIn,
  forwardedOriginal,
  routeSentCopy,
  sentCopyOf,
  sentCopyText,
} from "../src/lib/sent-copy";
import type { RouteAccount } from "../src/lib/route-capture";

const NOW = new Date("2026-10-19T15:00:00Z");
const MK = "001F000000w38ENGAG:wire-trigger";

const draft = (over: Partial<StageDraft> = {}): StageDraft => ({
  day: "2026-10-19",
  mk: MK,
  by: "model",
  to: "Cristina Bell",
  email: "cristina@engage.example",
  subject: "Your news on the 15th",
  uses: ["wire", "gem"],
  body: "Hi Cristina,\n\nSaw the announcement on the 15th.\n\nAntaeus",
  ...over,
});

describe("the stagedraft grammar", () => {
  test("a draft renders and reads back whole", () => {
    const d = draft();
    assert.deepEqual(parseStageDraft(renderStageDraft(d)), d);
  });

  test("money never reaches the stored draft", () => {
    const body = renderStageDraft(
      draft({ subject: "A $40,000 plan", body: "It runs $12k a month." }),
    );
    assert.ok(!/\$\s?\d/.test(body), body);
  });

  test("a stray note, or a USES line naming no evidence, reads as nothing or as no use", () => {
    assert.equal(parseStageDraft("✎ DRAFT · gem\nTO x\nSUBJECT y\nbody"), null);
    const d = parseStageDraft(
      renderStageDraft(draft()).replace("USES wire,gem", "USES wire,bogus"),
    );
    assert.deepEqual(d?.uses, ["wire"]);
  });

  test("the move's draft is the newest for its key inside the keep window", () => {
    const at = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
    const notes = [
      { body: renderStageDraft(draft({ mk: "other:intent-warm" })), createdAt: at(1) },
      { body: renderStageDraft(draft({ subject: "newest" })), createdAt: at(2) },
      { body: renderStageDraft(draft({ subject: "older" })), createdAt: at(5) },
    ];
    assert.equal(draftForMove(notes, MK, NOW)?.subject, "newest");
    const stale = [
      { body: renderStageDraft(draft()), createdAt: at(24 * (DRAFT_KEEP_DAYS + 1)) },
    ];
    assert.equal(draftForMove(stale, MK, NOW), null);
    assert.equal(draftedToday(draft(), NOW), true);
    assert.equal(draftedToday(draft({ day: "2026-10-18" }), NOW), false);
  });

  test("the draft's line says who drafted it", () => {
    assert.equal(draftedLine(null, ""), "Drafted from the move's template");
    assert.equal(
      draftedLine({ by: "model", at: "" }, "6:02"),
      "Drafted 6:02 from the record",
    );
    assert.equal(draftedLine({ by: "hand", at: "" }, "9:14"), "Your edit, saved 9:14");
  });
});

describe("the stage's action line names the person and the channel", () => {
  test("an email move with a name reads 'Email {first}.'", () => {
    assert.equal(
      stageAction(
        { ruleId: "wire-trigger", action: "Send the note about the news." },
        "Cristina Bell",
      ),
      "Email Cristina.",
    );
  });

  test("a move that is not an email, or has no name, keeps the queue's line", () => {
    assert.equal(
      stageAction({ ruleId: "post-trigger", action: "Message Allie." }, "Allie Menz"),
      "Message Allie.",
    );
    assert.equal(
      stageAction({ ruleId: "intent-warm", action: "Write to them." }, ""),
      "Write to them.",
    );
    assert.equal(
      stageAction({ ruleId: "intent-warm", action: "Write to them." }, "Unassigned"),
      "Write to them.",
    );
  });

  test("the LinkedIn rules, the relays and the recipes are never drafted as email", () => {
    for (const r of [
      "post-trigger",
      "contact-left",
      "new-in-seat",
      "riding-lane",
      "roundup-slot",
      "stale-above-gate",
      "stakeholder-gap",
    ])
      assert.equal(EMAIL_RULES.has(r as never), false, r);
  });
});

describe("Send opens Outlook with the draft as it stands", () => {
  test("the address, subject and body ride the mailto, spaces as %20", () => {
    const href = mailtoHref({
      email: "cristina@engage.example",
      subject: "Your news",
      body: "Hi Cristina,\n\nSaw it.",
    });
    assert.ok(href.startsWith("mailto:cristina@engage.example?"), href);
    assert.ok(href.includes("subject=Your%20news"), href);
    assert.ok(href.includes("body=Hi%20Cristina%2C%0A%0ASaw%20it."), href);
    assert.ok(!href.includes("+"), href);
  });

  test("with no address on file the draft still opens, addressed by the operator", () => {
    assert.ok(mailtoHref({ email: "", subject: "x", body: "y" }).startsWith("mailto:?"));
  });
});

describe("Why this note: the chips said plainly", () => {
  const lines = whyLines(
    {
      gem: {
        term: "Report review",
        reason: "Their quarterly review names two clients hiring abroad.",
      },
      support: { total: 274, spikeDay: "2026-07-22", spikeN: 31 },
      intent: { opens30: 176, clicks30: 9 },
      collision: { mktgSends7: 907, colleague: null },
    },
    ["gem", "intent"],
  );

  test("each chip says what it means and whether the note uses it", () => {
    const by = (label: string) => lines.find((l) => l.label.startsWith(label));
    assert.equal(by("◆ Report review")?.used, true);
    assert.equal(
      by("Intent")?.meaning,
      "They opened 176 and clicked 9 marketing emails in 30 days.",
    );
    assert.equal(by("Support 274")?.used, false);
    assert.equal(
      by("Spike 07/22")?.meaning,
      "Their busiest support day was July 22, 31 cases.",
    );
  });

  test("the collision flag reads as an instruction, and informs without a use", () => {
    const c = lines.find((l) => l.key === "collision");
    assert.equal(c?.meaning, "Keep it short. Marketing sent 907 this week.");
    assert.equal(c?.used, null);
    assert.equal(
      collisionInstruction({
        mktgSends7: 0,
        colleague: { who: "Anika Shah", day: "2026-10-14" },
      }),
      "Anika has a live thread from October 14.",
    );
    assert.equal(collisionInstruction(null), "");
  });
});

describe("Send's marker waits for the sent copy", () => {
  test("today's markers per account, by move key", () => {
    const m = waitsToday(
      new Map([
        [
          `${SEND_WAIT_NS}A1`,
          [
            { body: MK, createdAt: "2026-10-19T14:30:00Z" },
            { body: "old", createdAt: "2026-10-18T14:30:00Z" },
          ],
        ],
        ["A1", [{ body: MK, createdAt: "2026-10-19T14:30:00Z" }]],
      ]),
      "2026-10-19",
    );
    assert.deepEqual([...m.keys()], ["A1"]);
    assert.deepEqual([...(m.get("A1") ?? [])], [MK]);
  });
});

describe("the drafter", () => {
  test("its voice carries the plain-speech law, the armer doctrine and the money doctrine", () => {
    for (const must of [
      "never mention opens, clicks, support cases",
      "No rhetorical devices",
      "No em-dash asides",
      "Money figures never appear",
      "internal (the PEO's own) or a client's",
      'Never write "X-shaped"',
    ])
      assert.ok(DRAFTER_SYSTEM.includes(must), must);
  });

  test("its prompt is money-redacted and names the evidence it may stand on", () => {
    const p = drafterPrompt({
      account: "Engage PEO",
      action: "Send the note about the news.",
      reason: "They made the wire October 15.",
      to: { name: "Cristina Bell", title: "VP" },
      template: { subject: "Saw the news", body: "Hi. It runs $40,000." },
      wire: "Engage PEO acquires a firm",
      research: "",
      gem: null,
      intent: { opens30: 176, clicks30: 9 },
      support: 274,
      record: [],
      collision: "Keep it short. Marketing sent 907 this week.",
    });
    assert.ok(!/\$\s?\d/.test(p), p);
    assert.match(p, /never mention it/);
    assert.match(p, /This is a first touch/);
  });

  test("its answer is read whole or not at all", () => {
    assert.deepEqual(
      readDraftAnswer('Here: {"subject":"Hi","body":"Hello.","uses":["wire","nope"]}'),
      {
        subject: "Hi",
        body: "Hello.",
        uses: ["wire"],
      },
    );
    assert.equal(readDraftAnswer('{"subject":"Hi","body":""}'), null);
    assert.equal(readDraftAnswer("no json"), null);
  });
});

describe("the drafts job", () => {
  test("the cron gate takes Vercel's bearer and refuses a short or missing secret", () => {
    const s = "a".repeat(32);
    assert.equal(cronOk(`Bearer ${s}`, s), true);
    assert.equal(cronOk(`Bearer ${s}x`, s), false);
    assert.equal(cronOk(null, s), false);
    assert.equal(cronOk("Bearer short", "short"), false);
    assert.equal(cronOk(`Bearer ${s}`, undefined), false);
  });

  test("Vercel runs it on weekdays before the send band, at a route that exists", () => {
    const v = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    const job = v.crons.find((c) => c.path === "/cron/stage-drafts");
    assert.ok(job);
    // 11:00 UTC is 6:00 in Chicago in daylight time and 5:00 in winter.
    assert.equal(job.schedule, "0 11 * * 1-5");
    assert.ok(existsSync("src/app/cron/stage-drafts/route.ts"));
  });

  test("Send is the letter's one orange move", () => {
    const src = readFileSync("src/app/groundwork/letter.tsx", "utf8");
    assert.equal((src.match(/styles\.btnAccent/g) ?? []).length, 1);
    assert.match(src, /Send in Outlook/);
  });
});

describe("the sent copy", () => {
  const ROSTER: RouteAccount[] = [
    {
      id: "ENG",
      name: "Engage PEO",
      emails: ["cristina@engage.example"],
      domains: ["engage.example"],
    },
    { id: "ARM", name: "Armhr", emails: [], domains: ["armhr.example"] },
  ];

  test("the flow's HTTP post reads as the sent message", () => {
    const c = sentCopyOf({
      From: "antaeus.coe@prismhr.com",
      To: "cristina@engage.example",
      Subject: "Your news on the 15th",
      DateTimeSent: "2026-10-19T14:31:00Z",
      Body: "<p>Hi Cristina,</p><p>Saw the announcement.</p>",
    });
    assert.ok(c);
    assert.equal(c.to, "cristina@engage.example");
    assert.match(c.body, /Saw the announcement\./);
    const t = sentCopyText(c);
    assert.match(
      t,
      /^OUTLOOK THREAD — sent copy\nFrom: antaeus\.coe@prismhr\.com\nTo: cristina@engage\.example\nSent: 2026-10-19T14:31:00Z\nSubject: Your news on the 15th\n\nHi Cristina,/,
    );
  });

  test("the flow's whole trigger body, as Outlook's V3 trigger hands it, reads as the sent message", () => {
    const c = sentCopyOf({
      from: "antaeus.coe@prismhr.com",
      toRecipients: "cristina@engage.example",
      ccRecipients: "",
      subject: "Your news on the 15th",
      body: "<html><body><p>Hi Cristina,</p></body></html>",
      receivedDateTime: "2026-10-19T14:31:00+00:00",
      isHtml: true,
      hasAttachments: false,
    });
    assert.equal(c?.to, "cristina@engage.example");
    assert.equal(c?.sent, "2026-10-19T14:31:00+00:00");
    assert.equal(c?.body, "Hi Cristina,");
  });

  test("Graph's recipient lists read as header lines", () => {
    const c = sentCopyOf({
      toRecipients: [
        { emailAddress: { name: "Cristina Bell", address: "cristina@engage.example" } },
      ],
      subject: "Hi",
      body: "Hello.",
    });
    assert.equal(c?.to, "Cristina Bell <cristina@engage.example>");
  });

  test("a forward to an inbound service reads as the original inside it", () => {
    const body = [
      "",
      "________________________________",
      "From: Antaeus Coe <antaeus.coe@prismhr.com>",
      "Sent: Monday, October 19, 2026 9:31 AM",
      "To: Cristina Bell <cristina@engage.example>",
      "Subject: Your news on the 15th",
      "",
      "Hi Cristina,",
    ].join("\n");
    const c = sentCopyOf({
      From: "antaeus.coe@prismhr.com",
      Subject: "FW: Your news on the 15th",
      TextBody: body,
      To: "inbound@service.example",
    });
    assert.equal(c?.subject, "Your news on the 15th");
    assert.equal(c?.to, "Cristina Bell <cristina@engage.example>");
    assert.equal(c?.body, "Hi Cristina,");
    assert.equal(forwardedOriginal("no header here"), null);
  });

  test("it routes by recipients alone, by address or domain", () => {
    const route = (to: string, cc = "", body = "") =>
      routeSentCopy({ from: "", to, cc, subject: "", sent: "", body }, ROSTER)?.id ??
      null;
    assert.equal(route("cristina@engage.example"), "ENG");
    assert.equal(route("dana@armhr.example"), "ARM");
    // A body that names another company routes nothing by itself.
    assert.equal(route("me@gmail.com", "", "Armhr and Engage PEO"), null);
    // Our own side and a personal address route nothing.
    assert.equal(route("colleague@prismhr.com"), null);
    // Two accounts on one send tie and route nothing.
    assert.equal(route("cristina@engage.example", "dana@armhr.example"), null);
    assert.deepEqual(addressesIn("A <A@X.example>; a@x.example"), ["a@x.example"]);
  });

  test("a post with no sent message in it is not one", () => {
    assert.equal(sentCopyOf({ Subject: "x" }), null);
  });
});

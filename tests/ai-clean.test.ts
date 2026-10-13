import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import {
  FILING_BUDGET_MS,
  READER_CONTRACT,
  READ_BUDGET_MS,
  READ_MAX_TOKENS,
  aiCleanTimeline,
  describeReadError,
  sanitizeAiResult,
  type ReadClient,
} from "@/lib/intel/ai-clean";
import { claudeDownReason, markClaudeDown, markClaudeUp } from "@/lib/claude/health";

test("sanitize: coerces a well-formed reply through intact", () => {
  const r = sanitizeAiResult({
    entries: [
      {
        kind: "email",
        subject: "RE: PrismOne",
        from: "Kim Bartolotti",
        to: "Lesha Cyphers",
        others: 1,
        timeLabel: "4:11 PM",
        dayLabel: "Jul 22",
        dayIso: "2025-07-22",
        body: "Wed at 9:30am would be great.",
      },
    ],
    signals: ["Implied deadline: Wednesday 9:30am meeting"],
  });
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].kind, "email");
  assert.equal(r.entries[0].dayIso, "2025-07-22");
  assert.equal(r.entries[0].others, 1);
  assert.equal(r.signals.length, 1);
});

test("sanitize: money is redacted from every field, including signals", () => {
  const r = sanitizeAiResult({
    entries: [
      {
        kind: "call",
        subject: "Pricing at $385 PEPM",
        from: "A",
        to: "B",
        others: 0,
        timeLabel: "",
        dayLabel: "",
        dayIso: "",
        body: "They asked about the $550 tier and 1,200 seats.",
      },
    ],
    signals: ["Quoted $165 for the add-on"],
  });
  assert.ok(!/385|550|165/.test(JSON.stringify(r)));
  // headcounts are sizing intel, not money — they survive by doctrine
  assert.ok(/1,200 seats/.test(JSON.stringify(r)));
});

test("sanitize: malformed shapes degrade instead of throwing", () => {
  // A junk payload degrades to the empty read: no entries, no signals, and
  // every judgment field present-but-empty so callers never branch on undefined.
  for (const junk of [null, "nope"]) {
    const empty = sanitizeAiResult(junk);
    assert.deepEqual(empty.entries, []);
    assert.deepEqual(empty.signals, []);
    assert.deepEqual(empty.actions, []);
    assert.deepEqual(empty.gaps, []);
    assert.deepEqual(empty.competitorIntel, []);
    assert.deepEqual(empty.lessons, []);
    assert.deepEqual(empty.outcome, { status: "none", phrase: "" });
    assert.equal(empty.accountName, "");
  }
  const r = sanitizeAiResult({
    entries: [
      null,
      {
        kind: "meeting", // unknown kind → email
        subject: 42, // wrong type → ""
        others: "three", // wrong type → 0
        dayIso: "July 22", // not ISO → ""
        body: "x".repeat(2000), // over cap → sliced
      },
    ],
    signals: [7, "", "real signal"],
  });
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].kind, "email");
  assert.equal(r.entries[0].subject, "");
  assert.equal(r.entries[0].others, 0);
  assert.equal(r.entries[0].dayIso, "");
  assert.equal(r.entries[0].body.length, 800);
  assert.deepEqual(r.signals, ["real signal"]);
});

test("sanitize: caps entry count at 40 and clamps others", () => {
  // bodies carry substance — body-less stubs now die at the noise gate
  const many = Array.from({ length: 60 }, (_, i) => ({
    kind: "task",
    subject: `t${i}`,
    from: "",
    to: "",
    others: 500,
    timeLabel: "",
    dayLabel: "",
    dayIso: "",
    body: `real substance ${i}`,
  }));
  const r = sanitizeAiResult({ entries: many, signals: [] });
  assert.equal(r.entries.length, 40);
  assert.equal(r.entries[0].others, 99);
});

// The fulfillment rule (founder-decreed 2026-08-19, born on the Trend HR
// Philippines thread): a promise the same document later shows KEPT is
// history, never an open action. The rule lives in the reader's contract — the
// system prompt every read is handed — and this pins it in that text, with
// the exact shape that taught it.
test("the reader's contract carries the fulfillment rule", () => {
  const contract = READER_CONTRACT;
  assert.equal(typeof contract, "string");
  assert.ok(contract.includes("THE FULFILLMENT RULE"), "the rule left the contract");
  assert.ok(
    contract.includes("Please see pricing attached"),
    "the Trend thread shape is the rule's example",
  );
  assert.ok(
    contract.includes("Only commitments the document leaves hanging become actions"),
    "the rule must state what DOES open",
  );
  // The contract is what the read runs under, so its other load-bearing rules
  // ride in the same text: explicit commitments only, and no action from a
  // musing.
  assert.ok(contract.includes("EXPLICIT commitments only"));
  assert.ok(contract.includes("NEVER invent an action from a musing"));
});

// The read's clock and its failures (2026-10-13). A 33-message thread timed
// out against a 55-second, non-streaming call and the receipt said "The
// reader was down." The read now streams with room for the model's thinking,
// one deadline bounds every attempt, a retry is spent only on a fast
// transient failure, and the paste action logs why a read failed.
describe("the reader's clock", () => {
  type Body = Anthropic.MessageCreateParamsNonStreaming;
  const reply = (over: Partial<Anthropic.Message> = {}): Anthropic.Message =>
    ({
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "m",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [
        {
          type: "text",
          text: JSON.stringify({
            entries: [
              { kind: "email", subject: "Re: docs", from: "Javier", body: "Sent." },
            ],
            signals: [],
          }),
          citations: null,
        },
      ],
      ...over,
    }) as unknown as Anthropic.Message;

  /** A client whose attempts answer in turn: a message, an error to throw,
   *  or "hang" to wait on the abort signal like a slow stream. */
  function fake(...answers: (Anthropic.Message | Error | "hang")[]) {
    const calls: { body: Body; signal: AbortSignal }[] = [];
    const client: ReadClient = {
      messages: {
        stream: (body, { signal }) => {
          calls.push({ body, signal });
          const a = answers[calls.length - 1];
          return {
            finalMessage: () =>
              a === "hang"
                ? new Promise<Anthropic.Message>((_, reject) =>
                    signal.addEventListener("abort", () =>
                      reject(new Anthropic.APIUserAbortError()),
                    ),
                  )
                : a instanceof Error
                  ? Promise.reject(a)
                  : Promise.resolve(a),
          };
        },
      },
    };
    return { client, calls };
  }
  const now = new Date("2026-10-13T15:00:00Z");
  const overloaded = () =>
    new Anthropic.InternalServerError(
      529,
      { type: "overloaded_error" },
      "Overloaded",
      new Headers(),
    );

  test("the read streams with room for thinking and the answer, under a deadline", async () => {
    const { client, calls } = fake(reply());
    const r = await aiCleanTimeline("From: Javier\nSent.", now, { client });
    assert.equal(r.entries.length, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.max_tokens, READ_MAX_TOKENS);
    assert.ok(READ_MAX_TOKENS >= 32_000, "the ceiling leaves room for thinking");
    assert.equal(calls[0].signal.aborted, false, "the deadline rides the call");
  });

  test("one filing clock fits the page's maxDuration, and the read fits the thread that failed", () => {
    const page = readFileSync(join(cwd(), "src/app/room/page.tsx"), "utf8");
    const maxDuration = Number(/export const maxDuration = (\d+)/.exec(page)?.[1]);
    assert.ok(maxDuration > 0);
    assert.ok(
      FILING_BUDGET_MS <= maxDuration * 1000 - 30_000,
      "the read and the verdict leave the writes their last 30 seconds",
    );
    assert.ok(READ_BUDGET_MS < FILING_BUDGET_MS, "the read leaves the verdict a share");
    // The 33-message Infiniti HR thread read live in 179 seconds on 10/13.
    assert.ok(READ_BUDGET_MS >= 179_000 + 45_000, "the measured read fits with room");
    // The paste action runs both calls on the one clock.
    const src = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");
    assert.match(src, /const filingDeadline = Date\.now\(\) \+ FILING_BUDGET_MS;/);
    assert.match(
      src,
      /budgetMs: Math\.min\(READ_BUDGET_MS, filingDeadline - Date\.now\(\)\)/,
    );
    assert.match(src, /\{ deadline: filingDeadline \}/);
  });

  test("a read past its deadline aborts and is not sent again", async () => {
    const { client, calls } = fake("hang", reply());
    // AbortSignal.timeout's timer does not hold the event loop open; a server
    // always has the stream's socket open, so this test holds it instead.
    const hold = setInterval(() => {}, 5);
    after(() => clearInterval(hold));
    await assert.rejects(
      aiCleanTimeline("From: Javier\nSent.", now, { client, budgetMs: 40 }),
      (e: unknown) => e instanceof Anthropic.APIUserAbortError,
    );
    assert.equal(calls.length, 1, "a spent budget buys no second attempt");
    assert.equal(calls[0].signal.aborted, true);
  });

  test("an overload is tried once more; a bad request and a timeout are not", async () => {
    const once = fake(overloaded(), reply());
    const r = await aiCleanTimeline("From: Javier\nSent.", now, { client: once.client });
    assert.equal(once.calls.length, 2);
    assert.equal(r.entries.length, 1);

    const bad = fake(
      new Anthropic.BadRequestError(
        400,
        { type: "invalid_request_error" },
        "bad",
        new Headers(),
      ),
      reply(),
    );
    await assert.rejects(aiCleanTimeline("x".repeat(40), now, { client: bad.client }));
    assert.equal(bad.calls.length, 1);

    const slow = fake(new Anthropic.APIConnectionTimeoutError(), reply());
    await assert.rejects(aiCleanTimeline("x".repeat(40), now, { client: slow.client }));
    assert.equal(slow.calls.length, 1);
  });

  test("no second attempt when too little of the budget is left", async () => {
    const { client, calls } = fake(overloaded(), reply());
    await assert.rejects(
      aiCleanTimeline("x".repeat(40), now, { client, budgetMs: 10_000 }),
    );
    assert.equal(calls.length, 1);
  });

  test("a truncated answer and a refusal fail the read instead of filing it empty", async () => {
    const cut = fake(reply({ stop_reason: "max_tokens" }));
    await assert.rejects(
      aiCleanTimeline("x".repeat(40), now, { client: cut.client }),
      /too large/,
    );
    const no = fake(reply({ stop_reason: "refusal", content: [] }));
    await assert.rejects(
      aiCleanTimeline("x".repeat(40), now, { client: no.client }),
      /declined/,
    );
  });

  test("the log line names the failure and never carries the paste", () => {
    assert.match(
      describeReadError(new Anthropic.APIUserAbortError()),
      /^the read ran out of its budget/,
    );
    assert.match(
      describeReadError(new Anthropic.APIConnectionTimeoutError()),
      /^the request timed out/,
    );
    const e = new Anthropic.InternalServerError(
      529,
      { type: "overloaded_error" },
      "Overloaded",
      new Headers({ "request-id": "req_42" }),
    );
    const line = describeReadError(e);
    assert.match(line, /^the API failed or was overloaded/);
    assert.match(line, /status 529/);
    assert.match(line, /request req_42/);
    assert.match(line, /overloaded_error/);
    const key = new Anthropic.AuthenticationError(
      401,
      { type: "authentication_error" },
      "invalid x-api-key",
      new Headers(),
    );
    assert.match(describeReadError(key), /^the key was refused · status 401/);
    assert.equal(describeReadError(new Error("a\n\nb")), "Error · a b");
  });

  test("a closed gate says whether the key is missing or latched dead", () => {
    const had = process.env.ANTHROPIC_API_KEY;
    try {
      delete process.env.ANTHROPIC_API_KEY;
      assert.equal(claudeDownReason(), "no API key is configured");
      process.env.ANTHROPIC_API_KEY = "sk-test";
      markClaudeUp();
      assert.equal(claudeDownReason(), "");
      markClaudeDown();
      assert.match(claudeDownReason(), /failed on the key itself/);
    } finally {
      markClaudeUp();
      if (had === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = had;
    }
  });

  test("the paste action logs why on both paths, never the paste itself", () => {
    const src = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");
    const at = src.indexOf("let readFailed = false;");
    const block = src.slice(at, src.indexOf("if (entries.length === 0) {", at));
    assert.match(
      block,
      /console\.error\(`\[reader\] skipped for \$\{acct\.name\}: \$\{claudeDownReason\(\)\}`\)/,
    );
    assert.match(block, /console\.error\([\s\S]*\$\{describeReadError\(e\)\}/);
    assert.match(
      block,
      /\$\{text\.length\} characters/,
      "the size is logged, not the text",
    );
    assert.doesNotMatch(
      block,
      /console\.error\([^)]*\$\{(?:text|rawText)\}/,
      "the paste never reaches the log",
    );
  });
});

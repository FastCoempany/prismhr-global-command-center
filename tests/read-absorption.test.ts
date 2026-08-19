import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import { looksLikeNotes, modelFor } from "../src/lib/intel/ai-clean";
import {
  actionBody,
  fallbackMove,
  hasFallback,
  splitFallback,
  urgencyForDue,
} from "../src/lib/room/deliverables";
import { gapDismissKey, gapNs, parseGapBody, readGaps } from "../src/lib/room/gaps";
import {
  knowledgeKey,
  parsePlaybookBody,
  playbookBody,
  readPlaybook,
} from "../src/lib/playbook/store";
import {
  OUTCOME_KEY,
  readOutcome,
  stripOutcome,
  writeOutcome,
} from "../src/lib/dashboard/outcome";
import { outcomeMarkBody, readLoss } from "../src/lib/room/loss";
import {
  NO_FILTERS,
  emptyBecause,
  facetCounts,
  selectQuestions,
  type Filters,
} from "../src/lib/intel/bank";
import { DISCOVERY } from "../src/lib/intel/discovery";
import { migrateNotes } from "../src/lib/dashboard/stages";
import { cardNextStep, commitmentsFromCards } from "../src/lib/today/build";
import { isNamespacedAccountId } from "../src/lib/today/overlay";
import { sanitizeAiResult } from "../src/lib/intel/ai-clean";
import { PRODUCT_BANK } from "../src/lib/intel/discovery-product";
import { SCENARIOS } from "../src/lib/intel/scenarios";
import {
  diffFindings,
  parseFinding,
  parseResearchBody,
  researchBody,
} from "../src/lib/intel/deep-research";
import { mintPrompt, parseAsks } from "../src/lib/intel/ask-mint";
import type { AccountNote } from "../src/lib/today/overlay";

const root = cwd();
const iso = (d: string) => new Date(d).toISOString();
const note = (
  over: Partial<AccountNote> & { id: string; body: string },
): AccountNote => ({
  accountId: "a1",
  partner: "",
  kind: "account",
  lane: "background",
  actors: "",
  source: "",
  createdAt: iso("2026-07-28T12:00:00Z"),
  ...over,
});

// ── model routing ─────────────────────────────────────────────────────────────
describe("the read routes notes-shaped pastes to the strong model", () => {
  test("freeform call notes are notes-shaped", () => {
    const raw = `7/29/26 call with Chassie\nthey want Canada + Mexico\nTO DO: get pre recorded demo via shane by 7/30`;
    assert.equal(looksLikeNotes(raw), true);
    assert.equal(modelFor(raw), "claude-opus-5");
  });
  test("an Outlook thread is shaped work, not notes — and still reads on opus", () => {
    const raw = `OUTLOOK THREAD\nFrom: Shane Smith\nTo: Antaeus Coe\nSubject: RE: contracts\n\nthat works`;
    assert.equal(looksLikeNotes(raw), false);
    // Opus or better, always (decreed 2026-07-31) — shape no longer downgrades.
    assert.equal(modelFor(raw), "claude-opus-5");
  });
  test("a Salesforce timeline is shaped work even without mail headers", () => {
    const raw = [
      "Show more actions",
      "Text Body",
      ...Array(60).fill("activity line"),
    ].join("\n");
    assert.equal(looksLikeNotes(raw), false);
  });
  test("a monster wall is never routed to the expensive model", () => {
    assert.equal(looksLikeNotes("call notes\n" + "x".repeat(30_000)), false);
  });
  test("empty text is nothing-shaped", () => {
    assert.equal(looksLikeNotes("   "), false);
  });
});

// ── commitments carry their fallback ──────────────────────────────────────────
describe("deliverables — the if/then rides the commitment", () => {
  const body = actionBody(
    "Get the pre-recorded demo from Shane",
    "send the ESC demo, scrubbed of proprietary detail",
    "from 7/29 paste",
  );
  test("the body keeps text, fallback and provenance separable", () => {
    const { text, fallback } = splitFallback(body);
    assert.equal(text, "Get the pre-recorded demo from Shane");
    assert.equal(fallback, "send the ESC demo, scrubbed of proprietary detail");
    assert.ok(body.includes("· from 7/29 paste"));
  });
  test("a commitment with no contingency has no fallback", () => {
    const plain = actionBody("Send the recap", "", "from 7/29 paste");
    assert.equal(hasFallback(plain), false);
    assert.equal(splitFallback(plain).text, "Send the recap · from 7/29 paste");
  });
  test("the blown-wall move names the contingency, not the commitment", () => {
    const move = fallbackMove(body);
    assert.ok(move.startsWith("Get the pre-recorded demo from Shane didn't land"));
    assert.ok(move.includes("scrubbed of proprietary detail"));
    assert.ok(!move.includes("from 7/29 paste"));
  });
  test("no fallback means no move to promote", () => {
    assert.equal(fallbackMove("Send the recap"), "");
  });
  test("urgency follows the wall's distance", () => {
    const now = new Date("2026-07-29T12:00:00Z");
    assert.equal(urgencyForDue("2026-07-30", now), "high");
    assert.equal(urgencyForDue("2026-08-03", now), "med");
    assert.equal(urgencyForDue("2026-09-30", now), "");
    assert.equal(urgencyForDue("", now), "");
    assert.equal(urgencyForDue("not-a-date", now), "");
  });
});

// ── the asks carousel ─────────────────────────────────────────────────────────
describe("STILL UNKNOWN — dismissal advances the carousel", () => {
  const rows = [
    note({ id: "g1", body: "? Do the India workers need benefits parity?" }),
    note({ id: "g2", body: "? Who signs on the client side?" }),
    note({ id: "g3", body: "? Which entity employs the Poland two today?" }),
    note({ id: "g4", body: "? What does their Mexico payroll calendar look like?" }),
  ];
  const map = new Map<string, AccountNote[]>([[gapNs("a1"), rows]]);

  test("shows the cap and reports the queue behind it", () => {
    const r = readGaps(map, "a1", new Set(), 3);
    assert.equal(r.shown.length, 3);
    assert.equal(r.queued, 1);
    assert.equal(r.shown[0].question, "Do the India workers need benefits parity?");
  });
  test("waving one off pulls the next ask forward instead of leaving a hole", () => {
    const r = readGaps(map, "a1", new Set([gapDismissKey("g1")]), 3);
    assert.equal(r.shown.length, 3);
    assert.equal(r.queued, 0);
    assert.ok(!r.shown.some((g) => g.id === "g1"));
    assert.equal(r.shown[2].id, "g4");
  });
  test("the same ask twice is one ask", () => {
    const dupes = new Map<string, AccountNote[]>([
      [
        gapNs("a1"),
        [
          note({ id: "d1", body: "? Who signs on the client side?" }),
          note({ id: "d2", body: "? who signs on the client side" }),
        ],
      ],
    ]);
    assert.equal(readGaps(dupes, "a1", new Set(), 3).shown.length, 1);
  });
  test("an account with no asks reads empty, not broken", () => {
    const r = readGaps(map, "unknown", new Set(), 3);
    assert.deepEqual(r, { shown: [], queued: 0 });
  });
  test("the gap body is a question, not a glyph", () => {
    assert.equal(parseGapBody("? Who owns payroll there?"), "Who owns payroll there?");
  });
  test("asks live in their own namespace, never on the account", () => {
    assert.equal(gapNs("001abc"), "gaps:001abc");
  });
});

// ── the playbook ──────────────────────────────────────────────────────────────
describe("the playbook — knowledge outlives the deal", () => {
  test("a filed fact survives the round trip with its attribution", () => {
    const body = playbookBody("market", "A deposit was required before onboarding.", {
      a: "001x",
      n: "Advocate Pay",
      w: "Antaeus Coe",
    });
    const { text, tail } = parsePlaybookBody(body);
    assert.equal(text, "A deposit was required before onboarding.");
    assert.deepEqual(tail, { a: "001x", n: "Advocate Pay", w: "Antaeus Coe" });
  });
  test("a mangled tail costs the provenance, never the fact", () => {
    const { text, tail } = parsePlaybookBody("◆ Deposits are normal ⟦{not json⟧");
    assert.ok(text.includes("Deposits are normal"));
    assert.equal(tail.a, "");
  });
  test("the same lesson said twice is one lesson", () => {
    assert.equal(
      knowledgeKey("At Remote, a deposit was required."),
      knowledgeKey("at remote a deposit was required"),
    );
  });
  test("both registers read out of the notes map the pages already load", () => {
    const map = new Map<string, AccountNote[]>([
      [
        "playbook:market",
        [
          note({
            id: "m1",
            body: playbookBody("market", "Competitors ask for a deposit.", {
              a: "001x",
              n: "Advocate Pay",
              w: "Shane Smith",
            }),
          }),
        ],
      ],
      [
        "playbook:lessons",
        [
          note({
            id: "l1",
            body: playbookBody("lesson", "Silence after pricing meant a competing bid.", {
              a: "001y",
              n: "Simploy",
              w: "",
            }),
          }),
        ],
      ],
    ]);
    const { market, lessons } = readPlaybook(map);
    assert.equal(market.length, 1);
    assert.equal(market[0].who, "Shane Smith");
    assert.equal(market[0].accountName, "Advocate Pay");
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].accountName, "Simploy");
  });
});

// ── closed won / closed lost ──────────────────────────────────────────────────
describe("Closed Won / Closed Lost — terminal staging", () => {
  test("a closure round-trips through the card's notes column", () => {
    const notes = writeOutcome(
      { demo: "went well" },
      {
        status: "lost",
        phrase: "they've gone with another provider",
        at: iso("2026-07-29T18:00:00Z"),
      },
    );
    assert.equal(notes.demo, "went well");
    const back = readOutcome(notes);
    assert.equal(back?.status, "lost");
    assert.equal(back?.phrase, "they've gone with another provider");
  });
  test("reopening removes the stamp and keeps the stage notes", () => {
    const closed = writeOutcome(
      { demo: "x" },
      { status: "won", phrase: "signed", at: "" },
    );
    const open = writeOutcome(closed, null);
    assert.equal(readOutcome(open), null);
    assert.equal(open.demo, "x");
  });
  test("an unstamped card is simply open", () => {
    assert.equal(readOutcome(null), null);
    assert.equal(readOutcome({}), null);
    assert.equal(readOutcome({ [OUTCOME_KEY]: "not json" }), null);
    assert.equal(readOutcome({ [OUTCOME_KEY]: '{"status":"maybe"}' }), null);
  });
  test("the reserved key never leaks into a per-stage note view", () => {
    const stripped = stripOutcome({ demo: "x", [OUTCOME_KEY]: "{}" });
    assert.deepEqual(Object.keys(stripped), ["demo"]);
  });
});

describe("the loss read prefers a stated outcome over an inferred one", () => {
  const now = new Date("2026-07-29T18:00:00Z");
  test("a filed marker is read as fact, in either direction", () => {
    const lost = readLoss(
      [
        note({
          id: "n1",
          body: outcomeMarkBody("lost", "we've gone with another provider"),
        }),
      ],
      new Set(),
      now,
    );
    assert.equal(lost?.status, "lost");
    assert.equal(lost?.phrase, "we've gone with another provider");
    const won = readLoss(
      [note({ id: "n2", body: outcomeMarkBody("won", "contracts are signed") })],
      new Set(),
      now,
    );
    assert.equal(won?.status, "won");
  });
  test("the phrase scan still carries a status, and negations still silence it", () => {
    const hit = readLoss(
      [note({ id: "n3", body: "They found another provider for the Brazil work." })],
      new Set(),
      now,
    );
    assert.equal(hit?.status, "lost");
    assert.equal(
      readLoss(
        [note({ id: "n4", body: "Let's move fast so we don't lose the deal." })],
        new Set(),
        now,
      ),
      null,
    );
  });
  test("a marker the operator waved off stays quiet", () => {
    assert.equal(
      readLoss(
        [note({ id: "n5", body: outcomeMarkBody("lost", "they walked") })],
        new Set(["n5"]),
        now,
      ),
      null,
    );
  });
});

// ── the filter repair ─────────────────────────────────────────────────────────
describe("the card's filters tell the truth", () => {
  const BANK = [...DISCOVERY, ...PRODUCT_BANK];
  test("the merged bank is materially bigger than the original", () => {
    assert.ok(BANK.length >= 95, `bank is only ${BANK.length}`);
  });
  test("every question id is unique — ids are retirement keys", () => {
    const ids = BANK.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  test("no filter combination the chips offer can come up empty", () => {
    // A chip is only clickable when its own count is non-zero, so for every
    // single-facet selection the count and the selection must agree.
    for (const facet of ["category", "phase", "audience", "product", "soph"] as const) {
      const values = [
        ...new Set(BANK.map((q) => (q as Record<string, unknown>)[facet] ?? "any")),
      ];
      const counts = facetCounts(BANK, NO_FILTERS, facet, values as never[], null);
      for (const [v, n] of counts) {
        const got = selectQuestions(BANK, { ...NO_FILTERS, [facet]: v } as Filters, null);
        assert.equal(got.length, n, `${facet}=${v} count disagrees with selection`);
      }
    }
  });
  test("the phase chips that used to be dead now carry questions", () => {
    for (const phase of ["investigate", "exec_summary", "contract"] as const) {
      const n = selectQuestions(BANK, { ...NO_FILTERS, phase }, null).length;
      assert.ok(n > 0, `${phase} still has no questions`);
    }
  });
  test("an 'any' question survives a product or buyer filter", () => {
    const anyQ = BANK.filter((q) => (q.product ?? "any") === "any");
    assert.ok(anyQ.length > 0);
    const eor = selectQuestions(BANK, { ...NO_FILTERS, product: "eor" }, null);
    assert.ok(eor.some((q) => (q.product ?? "any") === "any"));
    assert.ok(eor.some((q) => q.product === "eor"));
    assert.ok(!eor.some((q) => q.product === "payroll"));
  });
  test("an empty result says which filter to drop", () => {
    const impossible: Filters = {
      ...NO_FILTERS,
      category: "classification",
      phase: "contract",
      audience: "partner",
      product: "payroll",
      soph: "displacement",
    };
    const shown = selectQuestions(BANK, impossible, null);
    assert.equal(shown.length, 0);
    const why = emptyBecause(BANK, impossible, null);
    assert.ok(why.length > 20);
    assert.ok(!/^0 of/.test(why));
  });
  test("a scenario leads with its own categories and drops its noise", () => {
    const scen = SCENARIOS.find((s) => s.avoid.length > 0 && s.leadWith.length > 0)!;
    const shown = selectQuestions(BANK, NO_FILTERS, scen);
    assert.equal(shown[0].category, scen.leadWith[0]);
    for (const q of shown) assert.ok(!scen.avoid.includes(q.category));
  });
  test("asking for a scenario's avoided category by name still works", () => {
    const scen = SCENARIOS.find((s) => s.avoid.length > 0)!;
    const category = scen.avoid[0];
    const shown = selectQuestions(BANK, { ...NO_FILTERS, category }, scen);
    assert.ok(shown.length > 0, "an explicit category ask must override the scenario");
  });
});

describe("the bank keeps the house doctrine", () => {
  const BANK = [...DISCOVERY, ...PRODUCT_BANK];
  test("no money figures anywhere", () => {
    for (const q of BANK) {
      const blob = [q.question, q.why, q.followUp, q.relayLine, ...q.listenFor].join(" ");
      assert.ok(!/\$\s?\d/.test(blob), `${q.id} carries a figure`);
    }
  });
  test("the word steps never appears", () => {
    for (const q of BANK) {
      const blob = [q.question, q.why, q.followUp, q.relayLine, ...q.listenFor].join(" ");
      assert.ok(!/\bsteps?\b/i.test(blob), `${q.id} says steps`);
    }
  });
  test("every relay line is a relayable question", () => {
    for (const q of PRODUCT_BANK) {
      assert.ok(
        q.relayLine.startsWith("Would you mind asking them"),
        `${q.id} relay line breaks the relay voice`,
      );
      assert.ok(q.relayLine.trim().endsWith("?"), `${q.id} relay line is not a question`);
    }
  });
  test("one question per question", () => {
    for (const q of PRODUCT_BANK)
      assert.equal(q.question.split("?").length - 1, 1, `${q.id} stacks questions`);
  });
  test("every question carries listen-fors and a follow-up", () => {
    for (const q of PRODUCT_BANK) {
      assert.ok(q.listenFor.length >= 2 && q.listenFor.length <= 5, q.id);
      assert.ok(q.followUp.length > 10, q.id);
      assert.ok(q.why.length > 40, q.id);
    }
  });
  test("the scenario library covers the naive and the displacement buyer", () => {
    assert.ok(SCENARIOS.length >= 6);
    assert.ok(SCENARIOS.some((s) => s.sophistication === "naive"));
    assert.ok(SCENARIOS.some((s) => s.sophistication === "displacement"));
    for (const s of SCENARIOS) {
      assert.ok(s.traps.length > 0, `${s.id} has no traps`);
      assert.ok(s.objections.length > 0, `${s.id} has no objections`);
      for (const o of s.objections)
        assert.ok(!/\$\s?\d/.test(o.counter), `${s.id} counter names an amount`);
    }
  });
});

// ── research ──────────────────────────────────────────────────────────────────
describe("the research pass", () => {
  const raw = `I searched their site and postings.

\`\`\`json
{"summary":"A Michigan PEO serving small manufacturers.","signals":["Posting two roles in Poland","Opened a Mexico office in March"],"countries":["Poland","Mexico"],"people":[{"name":"Morgan, Deana","title":"VP Operations","note":"owns payroll"}],"asks":["Who employs the Poland two today?"],"sources":[{"title":"Careers","url":"https://example.com/careers"},{"title":"bad","url":"javascript:alert(1)"}]}
\`\`\``;
  test("a fenced finding parses, normalizes names, and drops unsafe sources", () => {
    const f = parseFinding(raw);
    assert.equal(f.signals.length, 2);
    assert.deepEqual(f.countries, ["Poland", "Mexico"]);
    assert.equal(f.people[0].name, "Deana Morgan");
    assert.equal(f.sources.length, 1);
    assert.equal(f.sources[0].url, "https://example.com/careers");
  });
  test("an unfenced object still parses", () => {
    const f = parseFinding(
      'here you go {"summary":"Just a summary.","signals":[]} thanks',
    );
    assert.equal(f.summary, "Just a summary.");
  });
  test("garbage degrades to an empty finding instead of throwing", () => {
    const f = parseFinding("no json at all");
    assert.equal(f.summary, "");
    assert.deepEqual(f.signals, []);
  });
  test("money never survives the pass", () => {
    const f = parseFinding(
      '{"summary":"Raised $40M in March.","signals":["ARR is $2.5M"]}',
    );
    assert.ok(!/\$\s?\d/.test(f.summary));
    assert.ok(!/\$\s?\d/.test(f.signals.join(" ")));
  });
  test("the filed body is readable first and machine-readable last", () => {
    const f = parseFinding(raw);
    const body = researchBody(f, new Date("2026-07-29T18:00:00Z"));
    assert.ok(body.startsWith("⌕ Research — 7/29/26"));
    assert.ok(body.includes("Posting two roles in Poland"));
    const back = parseResearchBody(body);
    assert.equal(back?.countries.length, 2);
    assert.equal(parseResearchBody("no tail here"), null);
  });
  test("a refresh reports only what changed", () => {
    const prev = parseFinding(
      '{"summary":"x","signals":["Posting two roles in Poland"],"countries":["Poland"],"people":[{"name":"Deana Morgan","title":"","note":""}]}',
    );
    const next = parseFinding(
      '{"summary":"x","signals":["Opened a Mexico office"],"countries":["Poland","Mexico"],"people":[{"name":"Deana Morgan","title":"","note":""},{"name":"Kim Roberts","title":"CFO","note":""}]}',
    );
    const changed = diffFindings(prev, next);
    assert.ok(changed.some((c) => c.includes("New countries: Mexico")));
    assert.ok(changed.some((c) => c.includes("New: Opened a Mexico office")));
    assert.ok(changed.some((c) => c.includes("Kim Roberts")));
    assert.ok(changed.some((c) => c.includes("Gone quiet")));
    assert.deepEqual(diffFindings(null, next), []);
  });
});

describe("the ask mint", () => {
  test("only usable questions survive the parse", () => {
    const asks = parseAsks(
      '```json\n["Who employs the Poland two today?","short","Walk the steps of payroll","Does the India team need benefits parity?"]\n```',
    );
    assert.equal(asks.length, 2);
    assert.ok(!asks.some((a) => /steps/i.test(a)));
  });
  test("garbage mints nothing rather than nonsense", () => {
    assert.deepEqual(parseAsks("sorry, I can't help with that"), []);
  });
  test("the prompt carries what must not be repeated", () => {
    const p = mintPrompt({
      accountName: "Simploy",
      countries: ["MX", "CA"],
      products: ["eor"],
      stage: "demo by 8/1",
      scenario: {
        label: "Never hired outside the US",
        blurb: "runs US payroll in-house",
      },
      research: "Posting roles in Mexico",
      lessons: ["Silence after pricing meant a competing bid"],
      asked: ["Who signs on the client side?"],
    });
    assert.ok(p.includes("ALREADY ASKED"));
    assert.ok(p.includes("Who signs on the client side?"));
    assert.ok(p.includes("Never hired outside the US"));
    assert.ok(p.includes("Posting roles in Mexico"));
  });
});

// ── the restructure ───────────────────────────────────────────────────────────
describe("the restructure holds", () => {
  const nav = readFileSync(join(root, "src/components/app-wayfinder.tsx"), "utf8");
  test("the Playbook is a tab and the battlecard is gone", () => {
    assert.ok(nav.includes('href="/playbook"'));
    assert.ok(!nav.includes("/battlecard"));
    assert.ok(!existsSync(join(root, "src/app/battlecard")));
    assert.ok(existsSync(join(root, "src/app/playbook/page.tsx")));
  });
  test("Partners is no longer a tab, and its roster folded under Accounts", () => {
    assert.ok(!/href="\/partners"/.test(nav));
    const accounts = readFileSync(join(root, "src/app/accounts/page.tsx"), "utf8");
    assert.ok(accounts.includes("partnerRoster"));
    assert.ok(accounts.includes("Partner roster"));
  });
  test("Today and the board are archived, not deleted", () => {
    assert.ok(nav.includes("app-route-archive"));
    assert.ok(nav.includes('href="/today"'));
    assert.ok(existsSync(join(root, "src/app/today/page.tsx")));
    assert.ok(existsSync(join(root, "src/app/page.tsx")));
  });
  test("Intake became Capture and points at the room's own box", () => {
    const intake = readFileSync(join(root, "src/app/intake/page.tsx"), "utf8");
    assert.ok(intake.includes('current="Capture"'));
    assert.ok(intake.includes('href="/room"'));
  });
  test("the main row is seven: HomeRoom, Accounts, Groundwork, Playbook, Intranet, Pricing, Demos", () => {
    // Everything before the archive group is a place the operator works. The
    // count is the contract — a new tab has to earn its way in on purpose.
    // The Intranet did (the app's brain, asked for by name), and Groundwork
    // did (the prospecting room, founder-directed).
    const main = nav.split("app-route-archive")[0];
    const links = [...main.matchAll(/href="(\/[a-z]*)"/g)].map((m) => m[1]);
    assert.deepEqual(links, [
      "/",
      "/room",
      "/accounts",
      "/groundwork",
      "/playbook",
      "/intranet",
      "/pricing",
      "/demos",
    ]);
  });
  test("Capture and Pipeline are archived, not deleted", () => {
    const arch = nav.split("app-route-archive")[1] ?? "";
    for (const href of ["/today", "/", "/pipeline", "/intake"]) {
      assert.ok(arch.includes(`href="${href}"`), `${href} left the archive group`);
    }
    assert.ok(existsSync(join(root, "src/app/pipeline/page.tsx")));
    assert.ok(existsSync(join(root, "src/app/intake/page.tsx")));
  });
  test("Pipeline concedes the pipeline to the Room and links land", () => {
    const pipe = readFileSync(join(root, "src/app/pipeline/page.tsx"), "utf8");
    assert.ok(/Room<\/Link> is the pipeline/.test(pipe), "the concession is missing");
    // /book redirects to /accounts and drops the query — no card may point there.
    assert.ok(!pipe.includes("/book"), "a card still links at the retired Book");
    assert.ok(pipe.includes("/accounts?peo="));
  });
  test("retiring a question comes home to the BOUND card it was asked from", () => {
    const actions = readFileSync(join(root, "src/app/today/actions.ts"), "utf8");
    // The Playbook carries its account in the query string; the whitelist has to
    // accept that, or every retirement silently unbinds the card.
    const m = /const to =\s*([\s\S]*?);\n/.exec(actions);
    assert.ok(m, "askNextDone's returnTo whitelist moved");
    const re = /\/\^\\\/playbook/.test(m![1]) || m![1].includes("playbook");
    assert.ok(re, "the whitelist no longer mentions the Playbook");
    assert.ok(actions.includes('revalidatePath("/playbook")'));
    assert.ok(!actions.includes("/battlecard"));
    const client = readFileSync(
      join(root, "src/app/playbook/playbook-client.tsx"),
      "utf8",
    );
    assert.ok(client.includes("value={`/playbook?account=${accountId}`}"));
  });

  test("the Playbook can bind to any account in the book, not a handful", () => {
    const client = readFileSync(
      join(root, "src/app/playbook/playbook-client.tsx"),
      "utf8",
    );
    assert.ok(client.includes("accounts.map("));
    assert.ok(!client.includes("accounts.slice(0, 6)"));
  });

  test("every class the Playbook asks for exists", () => {
    const client = readFileSync(
      join(root, "src/app/playbook/playbook-client.tsx"),
      "utf8",
    );
    const css = readFileSync(join(root, "src/app/playbook/playbook.module.css"), "utf8");
    const used = new Set<string>();
    for (const m of client.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) used.add(m[1]);
    const defined = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)) defined.add(m[1]);
    assert.deepEqual(
      [...used].filter((c) => !defined.has(c)),
      [],
    );
  });
});

describe("the room wires every new mechanism", () => {
  const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
  const actions = readFileSync(join(root, "src/app/room/actions.ts"), "utf8");
  const css = readFileSync(join(root, "src/app/room/room.module.css"), "utf8");
  for (const wired of [
    "roomActionUndo",
    "roomGapDismiss",
    "roomGapsRefill",
    "roomResearch",
    "roomMarkWon",
    "roomRetire",
  ]) {
    test(`${wired} reaches the client`, () => assert.ok(client.includes(wired)));
    test(`${wired} exists on the server`, () =>
      assert.ok(actions.includes(`export async function ${wired}`)));
  }
  test("the paste's undo says what it does and doesn't touch", () => {
    assert.ok(client.includes("The actions it opened stay"));
  });
  test("the research control states when it last ran", () => {
    // The Spring's chip grammar (2026-08-13): a dated stamp, or NEVER when
    // neither research store has touched the account.
    assert.ok(client.includes("RESEARCH ${new Date(row.researchAt)"));
    assert.ok(client.includes("RESEARCH — NEVER"));
  });
  test("a closed row can still be read, and retired separately", () => {
    assert.ok(client.includes("CLOSED WON"));
    assert.ok(client.includes("CLOSED LOST"));
    assert.ok(client.includes("Retire the row"));
    assert.ok(
      !actions.includes("archived: true,\n        notes: writeOutcome"),
      "closing must not archive the card",
    );
  });
  test("operator copy still never says steps", () => {
    const strings = client.match(/(["'`>])([^"'`<>{}]*)\1?/g) ?? [];
    assert.ok(!strings.some((s) => /\bsteps?\b/i.test(s)));
  });
  test("every class the new UI asks for exists", () => {
    const used = new Set<string>();
    for (const m of client.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) used.add(m[1]);
    const defined = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)) defined.add(m[1]);
    const missing = [...used].filter((c) => !defined.has(c) && !/^(m|c)_$/.test(c));
    assert.deepEqual(
      missing.filter((c) => !c.startsWith("m_") && !c.startsWith("c_")),
      [],
    );
  });
});

// ── the defects the adversarial pass found, each with the test that would have
// caught it ───────────────────────────────────────────────────────────────────
describe("the repairs hold", () => {
  test("a stage-note save can't erase a confirmed closure", () => {
    const closed = writeOutcome(
      { demo: "went well" },
      {
        status: "lost",
        phrase: "gone elsewhere",
        at: iso("2026-07-29T18:00:00Z"),
      },
    );
    // Both whitelists a note passes through on its way to and from the DB.
    const migrated = migrateNotes(closed);
    assert.equal(readOutcome(migrated)?.status, "lost");
    assert.equal(migrated.demo, "went well");
  });

  test("a closed deal stops generating work everywhere, not just in the room", () => {
    const card = {
      id: "c1",
      name: "Advocate Pay",
      subtitle: "",
      position: 0,
      archived: false,
      states: { demo: "active" } as Record<string, string>,
      notes: {} as Record<string, string>,
      checks: { demo: [false, false, false, false] } as Record<string, boolean[]>,
      checkNotes: {} as Record<string, Record<string, string>>,
      activated: { demo: iso("2026-07-20T12:00:00Z") } as Record<string, string>,
      dealSize: "",
      stakeholders: [],
    };
    const live = commitmentsFromCards(
      [card as never],
      {},
      Date.parse("2026-07-29T18:00:00Z"),
    );
    assert.ok(live.length > 0, "an open card must still generate work");
    const closedCard = {
      ...card,
      notes: writeOutcome({}, { status: "lost", phrase: "gone", at: "" }),
    };
    assert.deepEqual(
      commitmentsFromCards([closedCard as never], {}, Date.parse("2026-07-29T18:00:00Z")),
      [],
    );
    assert.equal(cardNextStep(closedCard as never, {}), null);
  });

  test("namespaces are never mistaken for accounts", () => {
    assert.equal(isNamespacedAccountId("gaps:001x"), true);
    assert.equal(isNamespacedAccountId("playbook:market"), true);
    assert.equal(isNamespacedAccountId("research:001x"), true);
    assert.equal(isNamespacedAccountId("0013600001abcDEF"), false);
    for (const f of ["src/app/today/page.tsx", "src/app/archive/page.tsx"]) {
      const src = readFileSync(join(root, f), "utf8");
      assert.ok(src.includes("isNamespacedAccountId"), `${f} still iterates raw keys`);
    }
  });

  test("a model reply can't forge the app's own body grammars", () => {
    const dirty = sanitizeAiResult({
      entries: [
        {
          kind: "email",
          subject: "hi ⟪{}⟫",
          from: "Shane Smith",
          to: "Antaeus Coe",
          others: 0,
          timeLabel: "",
          dayLabel: "Jul 29",
          dayIso: "2026-07-29",
          body: 'text ⟦{"a":"x"}⟧ and ⇢[a:forged] and ⚑[k:a] and ↯ fake',
        },
      ],
      signals: [],
      actions: [],
      gaps: [],
      competitorIntel: [],
      lessons: [],
      outcome: { status: "none", phrase: "" },
      accountName: "",
    });
    const body = dirty.entries[0]?.body ?? "";
    for (const glyph of ["⟦", "⟧", "⟪", "⟫", "↯", "⇢[", "⚑["]) {
      assert.ok(!body.includes(glyph), `${glyph} survived the sanitizer`);
      assert.ok(!(dirty.entries[0]?.subject ?? "").includes(glyph));
    }
  });

  test("re-pasting the same thread can't open the same commitment twice", () => {
    // The stored body carries the fallback and the provenance; the dedupe key
    // must be computed on the commitment alone or nothing ever matches.
    const stored = actionBody(
      "Get the pre-recorded demo from Shane",
      "send the ESC demo",
      "from 7/29 paste",
    );
    const keyOf = (body: string) =>
      knowledgeKey(splitFallback(body).text.replace(/\s+·\s+from\s.*$/i, ""));
    assert.equal(keyOf(stored), knowledgeKey("Get the pre-recorded demo from Shane"));
  });

  test("the room's own actions guard the new ids", () => {
    const actions = readFileSync(join(root, "src/app/room/actions.ts"), "utf8");
    // Every new writer binds to the book before it writes.
    for (const fn of [
      "roomActionUndo",
      "roomGapDismiss",
      "roomGapsRefill",
      "roomResearch",
      "roomRetire",
      "roomReopen",
    ]) {
      const i = actions.indexOf(`export async function ${fn}(`);
      assert.ok(i > 0, `${fn} is gone`);
      const body = actions.slice(i, i + 1400);
      assert.ok(body.includes("bindAccountId"), `${fn} doesn't bind`);
      assert.ok(body.includes("requireWrite"), `${fn} doesn't check write access`);
    }
    // An action already closed is history, not a mistake to erase.
    assert.ok(actions.includes("already closed. Undo it on the row."));
    // One completion line, not two.
    assert.ok(actions.includes("if (wasRouted) await fileCompletion"));
  });

  test("the mint and the research pass refuse to file a truncated answer", () => {
    const mint = readFileSync(join(root, "src/lib/intel/ask-mint.ts"), "utf8");
    const research = readFileSync(join(root, "src/lib/intel/deep-research.ts"), "utf8");
    for (const src of [mint, research])
      assert.ok(src.includes('stop_reason === "max_tokens"'));
    assert.ok(
      research.includes('stop_reason === "pause_turn"'),
      "a paused search is dropped",
    );
    assert.ok(!/max_tokens: 2048/.test(mint), "the mint ceiling is too low for Opus");
  });

  test("the room's buttons can't be clicked into the void", () => {
    const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
    // Separate transitions: research must not dress the ask button in its label.
    assert.ok(client.includes("rsrchPending"));
    assert.ok(client.includes("askPending"));
    // The gate chip is retired (decreed 2026-08-19): the stage's open
    // question lives in the UNKNOWN register with its own ✓, and the old
    // STILL OPEN block stays dead.
    assert.ok(client.includes("STAGE GATE"));
    assert.ok(!client.includes("GATE · "), "the movewrap gate chip is retired");
    assert.ok(!client.includes("STILL OPEN"), "the STILL OPEN block is retired");
    // The misfile bar dies with its paste.
    assert.ok(client.includes("setMismatch(null)"));
    // Bringing a held row back returns it to the open list.
    assert.ok(client.includes("setBackNow"));
  });
});

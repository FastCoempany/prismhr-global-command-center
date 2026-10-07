// Standing decrees pinned as behavior: the wayfinder's archive (the Playbook
// face's own precedent, CLAUDE.md:552-560, and the pass-1 ruling P1), the
// bank's door under the click-depth law (:427-434 with :554-558), and the
// model roster ("Opus or better, always", founder-decreed 2026-07-31; one
// roster, ruled 2026-09-25). Every test calls a function or reads a
// module's exported values, except the two import scans under P1, which read
// import statements and nothing else.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { createElement } from "react";
import { WAYFINDER_ROUTES, pageFileFor } from "../../src/components/wayfinder-routes";
import { askFolds, askLinks } from "../../src/lib/ask/links";
import { questionById } from "../../src/lib/intel/bank";
import { DISCOVERY } from "../../src/lib/intel/discovery";
import * as doctrine from "../../src/lib/intranet/doctrine";
import { relationshipFor } from "../../src/lib/intel/relationship";
import {
  payrollDemoMeta,
  payrollDemoQuestions,
  payrollDemoSteps,
} from "../../src/lib/payroll-demo-sidekick";
import { prismhrGlobalMasterDemoFlow } from "../../src/lib/sidekick-flows";
import { render } from "../helpers/room-render";

const root = cwd();

// Every .ts/.tsx under a directory, depth-first.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

// ── P1 · an archived surface leaves every tab list ────────────────────────
describe("an archived surface leaves every tab list and every revalidation list", () => {
  test("every live row's href resolves to a page on disk", () => {
    for (const r of WAYFINDER_ROUTES.filter((x) => !x.archived))
      assert.ok(existsSync(join(root, pageFileFor(r.href))), `${r.label} → ${r.href}`);
  });

  // The live table holds no archived row since the three first rooms retired
  // (2026-09-25), so the archived-row rule is pinned against a fixture that
  // marks a real page archived: the rule reads the flag, not the table.
  test("an archived row still resolves — reachable and quiet, never a dead link", () => {
    const fixture: (typeof WAYFINDER_ROUTES)[number][] = [
      { label: "Capture", href: "/intake", pages: ["Capture"], archived: true },
      { label: "HomeRoom", href: "/room", pages: ["HomeRoom"], archived: false },
    ];
    const archived = fixture.filter((x) => x.archived);
    assert.equal(archived.length, 1);
    for (const r of archived)
      assert.ok(existsSync(join(root, pageFileFor(r.href))), `${r.label} → ${r.href}`);
  });

  // The surfaces ruling (Other standing decrees): the Board at "/", Today and
  // Pipeline are retired. They left the table, and the two that had their own
  // directories left the disk; "/" keeps a page only as the redirect to /room.
  test("the retired surfaces are in the table under no href", () => {
    const hrefs = new Set(WAYFINDER_ROUTES.map((r) => r.href));
    for (const gone of ["/", "/today", "/pipeline"]) assert.ok(!hrefs.has(gone), gone);
  });

  test("no page file exists for /today or /pipeline", () => {
    for (const gone of ["/today", "/pipeline"])
      assert.ok(!existsSync(join(root, pageFileFor(gone))), pageFileFor(gone));
  });

  test("the table is well-formed: unique hrefs, every row lights on a name", () => {
    const hrefs = WAYFINDER_ROUTES.map((r) => r.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
    for (const r of WAYFINDER_ROUTES) {
      assert.ok(r.label.length > 0);
      assert.ok(r.pages.length > 0, r.label);
      assert.ok(r.href.startsWith("/"), r.href);
    }
  });

  test("the page path is derived from the href alone", () => {
    assert.equal(pageFileFor("/"), "src/app/page.tsx");
    assert.equal(pageFileFor("/room"), "src/app/room/page.tsx");
  });

  // The Board, Today and Pipeline retired 2026-09-25; their actions moved to
  // the live surfaces that post them. No live file imports from the retired
  // surfaces' action modules (P1).
  test("no file under src/app imports a retired surface's actions", () => {
    const retired = /["'](?:[./@]|[\w-]+\/)*(?:dashboard|today|pipeline)\/actions["']/;
    const offenders: string[] = [];
    for (const f of walk(join(root, "src/app"))) {
      const text = readFileSync(f, "utf8");
      for (const line of text.split("\n"))
        if (/^\s*(?:import|export)\b/.test(line) && retired.test(line))
          offenders.push(`${relative(root, f)}: ${line.trim()}`);
    }
    assert.deepEqual(offenders, []);
  });
});

// ── Every page signs in (ruled 2026-09-25): no public mode ────────────────
describe("every page signs in", () => {
  // A page takes the gate itself, or through a loader that takes it: the
  // room, Groundwork and Accounts read loadCommand / loadDashboard, the two
  // sidekicks read their data module. Each loader calls getAppAccess and
  // reports "unauthenticated" for the page to render.
  const GATES = [
    "getAppAccess(",
    "loadDashboard(",
    "loadCommand(",
    "loadSidekick(",
    "loadSidekickV3(",
  ];
  const GATED_LOADERS = [
    "src/lib/dashboard/data.ts",
    "src/lib/command-center/data.ts",
    "src/app/sidekick/data.ts",
    "src/app/sidekick-v3/data.ts",
  ];
  // The exact allowlist: the root is a pure redirect to the HomeRoom, which
  // takes the gate; the login page is the door.
  const EXEMPT = ["src/app/page.tsx", "src/app/login/page.tsx"];

  test("every loader a page gates through calls getAppAccess itself", () => {
    for (const f of GATED_LOADERS)
      assert.ok(readFileSync(join(root, f), "utf8").includes("getAppAccess("), f);
  });

  test("the root page only redirects", () => {
    const text = readFileSync(join(root, "src/app/page.tsx"), "utf8");
    assert.match(text, /redirect\("\/room"\)/);
    assert.doesNotMatch(text, /<main|return \(/);
  });

  test("every other src/app/**/page.tsx takes the access check", () => {
    const pages = walk(join(root, "src/app"))
      .filter((f) => /[\\/]page\.tsx$/.test(f))
      .map((f) => relative(root, f).split("\\").join("/"));
    assert.ok(pages.length >= 20, `only ${pages.length} pages`);
    const ungated = pages.filter((p) => {
      if (EXEMPT.includes(p)) return false;
      const text = readFileSync(join(root, p), "utf8");
      return !GATES.some((g) => text.includes(g));
    });
    assert.deepEqual(ungated, []);
  });
});

// ── C13 · a playbook citation and the bank (click-depth :429-431; the face
// :554-558). The card is retired; what holds is the bank's own lookup ─────
describe("a playbook citation opens in place to the bank's question", () => {
  const first = DISCOVERY[0];

  test("a bare question id resolves to the question's text and its gloss", () => {
    const q = questionById(first.id);
    assert.ok(q);
    assert.equal(q?.id, first.id);
    assert.equal(q?.question, first.question);
    assert.equal(q?.why, first.why);
    assert.equal(q?.relayLine, first.relayLine);
  });

  test("the citation's own spelling, question:<id>, resolves the same", () => {
    assert.deepEqual(questionById(`question:${first.id}`), questionById(first.id));
  });

  test("every question in the bank resolves; an id the bank lacks is null", () => {
    for (const q of DISCOVERY) assert.equal(questionById(q.id)?.question, q.question);
    assert.equal(questionById("no-such-question"), null);
    assert.equal(questionById(""), null);
    assert.equal(questionById("question:"), null);
  });

  // pass 8 X2: the lookup had no caller, so the answer's playbook citation
  // opened nothing. The surfaces that show the brain's answer (the bank at
  // /asks, the pad's ask register, the Intranet's drawer) take their folds
  // from askFolds, and the fold is the bank's own question and gloss.
  const cite = (originRef: string, origin = "playbook") => ({
    origin,
    originRef,
    accountId: "",
    docTitle: `Question — ${first.question.slice(0, 70)}`,
  });

  test("a cited playbook question opens to the bank's question and its gloss", () => {
    assert.deepEqual(askFolds([cite(`question:${first.id}`)]), [
      { id: first.id, question: first.question, why: first.why },
    ]);
  });

  test("the citation still carries no link: the fold is in place", () => {
    const links = askLinks({
      question: "What do we ask about funding?",
      accounts: [],
      citations: [cite(`question:${first.id}`)],
    });
    assert.deepEqual(
      links.map((l) => l.href.split("?")[0]),
      ["/intranet"],
      "only the brain's own room, as for any answer",
    );
  });

  test("one fold per question; a scenario, a lesson or another origin has none", () => {
    const second = DISCOVERY[1];
    const folds = askFolds([
      cite(`question:${first.id}`),
      cite(`question:${first.id}`),
      cite(`question:${second.id}`),
      cite("scenario:eor"),
      cite("lessons:abc"),
      cite(`question:${first.id}`, "account-note"),
      null,
    ]);
    assert.deepEqual(
      folds.map((f) => f.id),
      [first.id, second.id],
    );
  });

  test("no fold carries the bank's unfilled placeholder", () => {
    const folds = askFolds(DISCOVERY.map((q) => cite(`question:${q.id}`)));
    for (const f of folds) assert.doesNotMatch(`${f.question} ${f.why}`, /\{countries\}/);
  });
});

// ── Opus or better, always: one roster, every caller reads a slot ─────────
describe("Opus or better, always: one model roster in doctrine.ts", () => {
  const slots = Object.entries(doctrine).filter(([k]) => k.startsWith("MODEL_"));

  test("the roster has slots, and every one is Opus or better", () => {
    assert.ok(slots.length >= 10, `only ${slots.length} slots`);
    for (const [name, id] of slots) {
      assert.equal(typeof id, "string", name);
      // Opus carries every judgment; Fable is the escalation above it. Sonnet
      // and Haiku never appear.
      assert.match(id as string, /^claude-(opus|fable)-/, name);
    }
  });

  test("no slot names a lesser family", () => {
    for (const [name, id] of slots)
      assert.doesNotMatch(id as string, /sonnet|haiku/i, name);
  });
});

// ── pass 8 X6 · accents by role, never by hue or position ─────────────────
// "The Grounded-A mark is navy or currentColor only, never an accent color."
// The masthead mark and the tab icon wore the orange dot and a blue arrow;
// the Intranet's selection dots cycled the five accents by pick order.
describe("the mark is ink only, and a selection dot is one role", () => {
  const ACCENTS =
    /--ds-(?:orange|blue|green|amber|red)\b|#(?:e6701e|2563eb|22c55e|f59e0b|ef4444)\b/i;

  test("the masthead lockup renders its mark in ink, no accent", async () => {
    const { ProductLockup } = await import("../../src/components/brand");
    const html = await render(createElement(ProductLockup));
    assert.match(html, /<svg/);
    assert.doesNotMatch(html, ACCENTS);
  });

  test("the tab icon is the same mark, navy only", () => {
    const svg = readFileSync(join(root, "src/app/icon.svg"), "utf8");
    assert.doesNotMatch(svg, ACCENTS);
  });

  test("every selected rail row carries the one blue, whatever its place", async () => {
    const { SELECTION_DOT, selectionDot } = await import(
      "../../src/app/intranet/selection"
    );
    assert.equal(SELECTION_DOT, "var(--ds-blue)");
    for (let i = 0; i < 12; i++) assert.equal(selectionDot(i), SELECTION_DOT);
    assert.equal(selectionDot(-1), null);
  });
});

// ── pass 8 X7 · "The word 'steps' never appears in operator-facing copy" ──
// The demo sidekicks said it in their search, their list label, their empty
// state and the fork button, and in two lines of their data. The payroll
// sidekick renders; the fork button lives behind a state no first paint
// reaches, so its module's visible copy is read, never its code.
describe("the demo sidekicks never say steps", () => {
  const STEPS = /\bsteps\b/i;

  test("the payroll demo's first paint, in both lenses", async () => {
    const { PayrollDemoClient } = await import(
      "../../src/app/payroll-demo-sidekick/payroll-demo-client"
    );
    for (const initialLens of ["flow", "questions"] as const) {
      const html = await render(
        createElement(PayrollDemoClient, {
          meta: payrollDemoMeta,
          steps: payrollDemoSteps,
          questions: payrollDemoQuestions,
          initialLens,
        }),
      );
      assert.doesNotMatch(html, STEPS, initialLens);
    }
  });

  test("every line the payroll demo and the master flow can render", () => {
    const lines: string[] = [];
    for (const st of payrollDemoSteps)
      lines.push(st.title, st.navContext, st.visualSummary, st.say, st.demoPurpose, ...st.onScreen);
    for (const q of payrollDemoQuestions)
      lines.push(q.asker, q.question, q.askedWhileShowing, q.answer, q.answerQuote);
    lines.push(JSON.stringify(prismhrGlobalMasterDemoFlow));
    for (const l of lines) assert.doesNotMatch(l ?? "", STEPS, l);
  });

  test("the sidekick clients' own copy", () => {
    for (const f of [
      "src/app/sidekick-v3/sidekick-v3-client.tsx",
      "src/app/sidekick/sidekick-client.tsx",
      "src/app/payroll-demo-sidekick/payroll-demo-client.tsx",
    ]) {
      const copy = visibleCopy(readFileSync(join(root, f), "utf8"));
      const hit = copy.find((c) => STEPS.test(c));
      assert.equal(hit, undefined, `${f}: ${hit}`);
    }
  });
});

// The words a module shows, read from its source: JSX text between tags and
// expressions, and string literals that hold a space (copy, not keys).
// Comments go first; code identifiers never match.
function visibleCopy(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out: string[] = [];
  for (const m of code.matchAll(/[>}]([^<>{}]+)(?=[<{])/g))
    if (/[A-Za-z]{3}/.test(m[1]) && !/[;=]|=>|\(\)/.test(m[1])) out.push(m[1].trim());
  for (const m of code.matchAll(/"([^"\n]* [^"\n]*)"|`([^`\n]* [^`\n]*)`/g))
    out.push((m[1] ?? m[2]).trim());
  return out;
}

// ── pass 8 X9 · the Playbook's learned register speaks flat ───────────────
describe("the Playbook's own copy carries no antithesis", () => {
  test("the learned register's lines", () => {
    const copy = visibleCopy(
      readFileSync(join(root, "src/app/playbook/playbook-client.tsx"), "utf8"),
    );
    for (const c of copy) assert.doesNotMatch(c, /\b(\w+), not (\w+)\./i, c);
  });
});

// ── pass 8 X1 · hidden is hidden, on /partners too ────────────────────────
// A ✕-parked entry (`hide:note:<id>`) leaves every reader. The Partner Room
// read every account note for the drafting desk's recipients and for the
// draft's own prompt; both now read through visibleNotes.
describe("a parked note names no recipient in the Partner Room", () => {
  const note = (id: string, actors: string) => ({
    id,
    accountId: "A1",
    partner: "",
    kind: "account" as const,
    body: `✉ OL 9:44 AM — Re: Canada · ${actors}\nThe invoices are coming.`,
    lane: "mine" as const,
    actors,
    source: "outlook-ai",
    recipients: "",
    createdAt: "2026-09-02T14:44:00.000Z",
  });

  test("the parked row leaves, the rest stay, and the relationship reads the rest", async () => {
    const { visibleNotes } = await import("../../src/app/partners/visible");
    const notes = new Map([
      [
        "A1",
        [
          note("n1", "Dana Reyes → Antaeus Coe"),
          note("n2", "Morgan Pike → Antaeus Coe"),
        ],
      ],
    ]);
    const dispositions = new Set(["hide:note:n2"]);
    const seen = visibleNotes(notes, dispositions);
    assert.deepEqual(
      seen.get("A1")?.map((n) => n.id),
      ["n1"],
    );
    const parkedOnly = visibleNotes(
      new Map([["A1", [note("n2", "Morgan Pike → Antaeus Coe")]]]),
      dispositions,
    );
    const rel = relationshipFor(parkedOnly.get("A1") ?? [], [], { name: "", email: "" });
    assert.notEqual(rel.name, "Morgan Pike", "a parked row named the recipient");
  });
});

// ── D15 · pass 8 call 2 · no action revalidates another surface ───────────
// "An action may refresh the page it was called from, and no action
// revalidates another surface." Pinned over the surfaces slice's own server
// modules: each names only its own route, or nothing.
describe("the surfaces' actions refresh only their own page (D15, pass 8 call 2)", () => {
  const OWN: Record<string, string> = {
    "src/app/playbook/actions.ts": "/playbook",
    "src/app/partners/actions.ts": "/partners",
    "src/app/scratch/actions.ts": "/scratch",
    "src/app/intranet/actions.ts": "/intranet",
    "src/app/intake/actions.ts": "/intake",
    "src/app/sidekick/actions.ts": "/sidekick",
    "src/app/sidekick-v3/actions.ts": "/sidekick-v3",
  };

  test("every revalidation names the module's own route", () => {
    const off: string[] = [];
    for (const [f, own] of Object.entries(OWN)) {
      const text = readFileSync(join(root, f), "utf8");
      for (const m of text.matchAll(/revalidate(?:Path|Tag)\(\s*["'`]([^"'`]+)["'`]/g))
        if (m[1] !== own) off.push(`${f} → ${m[1]}`);
      assert.doesNotMatch(text, /revalidate(?:Path|Tag)\(\s*[^"'`\s]/, `${f} revalidates a computed path`);
    }
    assert.deepEqual(off, []);
  });
});

// Standing decrees pinned as behavior: the wayfinder's archive (the Playbook
// face's own precedent, CLAUDE.md:552-560, and the pass-1 ruling P1), the
// bank's door under the click-depth law (:427-434 with :554-558), and the
// model roster ("Opus or better, always", founder-decreed 2026-07-31; one
// roster, ruled 2026-09-25). Every test calls a function or reads a
// module's exported values, except the two import scans under P1, which read
// import statements and nothing else, and pass 10's sweeps at the foot: the
// account links every page holds, the MULTI badge's surfaces, the edge tabs'
// stylesheet and package.json's verify chain, each named where it reads.

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
import { receipt, render, roomClient, roomRow, textOf } from "../helpers/room-render";
import { multiTone } from "../../src/lib/room/multi";

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
    const { SELECTION_DOT, selectionDot } =
      await import("../../src/app/intranet/selection");
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
    const { PayrollDemoClient } =
      await import("../../src/app/payroll-demo-sidekick/payroll-demo-client");
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
      lines.push(
        st.title,
        st.navContext,
        st.visualSummary,
        st.say,
        st.demoPurpose,
        ...st.onScreen,
      );
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
        [note("n1", "Dana Reyes → Antaeus Coe"), note("n2", "Morgan Pike → Antaeus Coe")],
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
      assert.doesNotMatch(
        text,
        /revalidate(?:Path|Tag)\(\s*[^"'`\s]/,
        `${f} revalidates a computed path`,
      );
    }
    assert.deepEqual(off, []);
  });
});

// ── pass 10 · "Account names are plain links — no ↗ arrows or affordance
// glyphs." ─────────────────────────────────────────────────────────────────
// The Intranet's passage drawer said "Open {account} →". Every surface that
// links an account is swept: the rendered room and receipts, the brain's
// answer links by call, and every <Link>/<a> in src whose href reaches the
// Accounts page, server pages included, by its source.
describe("account names are plain links, with no arrow or affordance glyph", () => {
  // The arrow blocks, the triangles and chevrons a link might wear, and ⊞.
  const GLYPH = /[←-⇿⟰-⟿⤀-⥿⬀-⯿▶-▻➜-➿›»⊞]/;
  const accountLinks = (html: string) =>
    [...html.matchAll(/<a\b[^>]*href="\/accounts\?[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map(
      (m) => textOf(m[1]),
    );

  test("every <Link> or <a> in src that reaches /accounts carries no glyph", () => {
    const off: string[] = [];
    const seen = new Set<string>();
    for (const f of walk(join(root, "src")).filter((x) => x.endsWith(".tsx"))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/<(Link|a)(?=[\s>])/g)) {
        const at = m.index ?? 0;
        const end = text.indexOf(`</${m[1]}>`, at);
        if (end < 0) continue;
        const el = text.slice(at, end);
        if (!/\/accounts\?/.test(el)) continue;
        // The opening tag ends at the first ">" outside a JSX expression.
        let depth = 0;
        let open = -1;
        for (let i = 0; i < el.length && open < 0; i++) {
          if (el[i] === "{") depth++;
          else if (el[i] === "}") depth--;
          else if (el[i] === ">" && depth === 0) open = i;
        }
        const children = el.slice(open + 1);
        // An account name link: its words carry the account's name. A door
        // to the record ("the full record (12) ▸") names no account.
        if (!/\{[^}]*name[^}]*\}/i.test(children)) continue;
        seen.add(relative(root, f));
        if (GLYPH.test(el))
          off.push(`${relative(root, f)}: ${el.replace(/\s+/g, " ").slice(0, 120)}`);
      }
    }
    // The surfaces that link an account by name today; a new one joins the
    // sweep on its own.
    for (const f of [
      // Groundwork's stage and the Sendbook's lines paint from their faces
      // (split out in pass 10 so the suite can render them).
      "src/app/groundwork/face.tsx",
      "src/app/intranet/intranet-client.tsx",
      "src/app/room/ingest/receipt.tsx",
      "src/app/room/room-client.tsx",
      "src/app/sendbook/register.tsx",
    ])
      assert.ok(seen.has(f), `the sweep missed ${f}`);
    assert.deepEqual(off, []);
  });

  test("the brain's answer links name the account in plain words", () => {
    const cite = { origin: "", originRef: "", accountId: "", docTitle: "" };
    const links = askLinks(
      {
        question: "Where does Simploy stand?",
        accounts: [{ id: "001F000000w38BOIAY", name: "Simploy" }],
        citations: [
          { ...cite, origin: "activity", originRef: "001F000000w38OHIAY:digest" },
          { ...cite, origin: "account-note", accountId: "001F000000w38ADVPY" },
        ],
      },
      (id) => (id.endsWith("OHIAY") ? "Regis HR Group" : ""),
    ).filter((l) => l.href.startsWith("/accounts?"));
    assert.deepEqual(
      links.map((l) => l.label),
      ["Open Simploy.", "Open Regis HR Group.", "Open the account."],
    );
  });

  test("the room's row, its warm drawer and the receipts link the account bare", async () => {
    const room = await roomClient();
    const { ReceiptLine } = await receipt();
    const simploy = { id: "001F000000w38BOIAY", name: "Simploy" };
    const regis = { id: "001F000000w38OHIAY", name: "Regis HR Group" };
    const row = await render(
      createElement(room.Row, { row: roomRow(), collapsed: false, onToggle: () => {} }),
    );
    assert.deepEqual(accountLinks(row), ["Simploy"]);
    const filed = await render(
      createElement(ReceiptLine, {
        row: {
          key: 1,
          filename: "",
          state: "filed",
          account: simploy,
          filed: 2,
          day: "10/7",
        },
        canWrite: true,
      }),
    );
    assert.deepEqual(accountLinks(filed), ["Simploy"]);
    const grab = await render(
      createElement(ReceiptLine, {
        row: {
          key: 2,
          filename: "",
          state: "filed",
          filed: 2,
          day: "10/7",
          grab: {
            accounts: [
              { ...simploy, rung: "name", noteId: "N1", filingId: "F1" },
              { ...regis, rung: "name", noteId: "N2", filingId: "F2" },
            ],
            duplicates: [],
            failed: [],
            unmatched: 0,
            dupeCheck: "ran",
          },
        },
        canWrite: true,
        defaultOpen: true,
      }),
    );
    assert.deepEqual(accountLinks(grab), ["Simploy", "Regis HR Group"]);
    for (const html of [row, filed, grab])
      for (const t of accountLinks(html)) assert.doesNotMatch(t, GLYPH);
  });
});

// ── pass 10 · "Threading badge reads exactly MULTI, colored by the semantic
// ladder (red 1 thread / amber 2 / green 3+)." ─────────────────────────────
// One ladder (src/lib/room/multi.ts) feeds both surfaces that paint the
// badge. The row renders; Groundwork's file is a server page, so its call
// into the ladder is read from source.
describe("MULTI reads exactly MULTI, on the one ladder", () => {
  test("the ladder: one thread red, two amber, three or more green", () => {
    assert.equal(multiTone(1), "r");
    assert.equal(multiTone(2), "y");
    for (const n of [3, 4, 9]) assert.equal(multiTone(n), "g");
  });

  // The coordinator's call (pass 10): zero is at least as thin as one, so
  // it takes the ladder's red wherever the badge shows.
  test("zero threads take the ladder's red, whatever shape the count comes in", () => {
    for (const n of [0, -1, Number.NaN, undefined as unknown as number])
      assert.equal(multiTone(n), "r", `${n}`);
  });

  test("the row's badge says MULTI and nothing else, in its tone's class", async () => {
    const room = await roomClient();
    for (const tone of ["r", "y", "g"] as const) {
      const html = await render(
        createElement(room.Row, {
          row: roomRow({ multiTone: tone }),
          collapsed: false,
          onToggle: () => {},
        }),
      );
      assert.match(
        html,
        new RegExp(
          `<button type="button" class="multi m_${tone}" aria-expanded="false" title="Who&#x27;s in this deal">MULTI<span class="hovercard">`,
        ),
      );
    }
  });

  test("each tone's class wears its role: red, amber, green", () => {
    const room = readFileSync(join(root, "src/app/room/room.module.css"), "utf8");
    const gw = readFileSync(
      join(root, "src/app/groundwork/groundwork.module.css"),
      "utf8",
    );
    const block = (css: string, sel: string) =>
      new RegExp(`(?:^|\\n)${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ??
      "";
    assert.match(block(room, ".m_r"), /background:\s*var\(--red\)/);
    assert.match(block(room, ".m_y"), /background:\s*var\(--amber\)/);
    assert.match(block(room, ".m_g"), /background:\s*var\(--green\)/);
    for (const [t, hex] of [
      ["red", "#ef4444"],
      ["amber", "#f59e0b"],
      ["green", "#22c55e"],
    ])
      assert.match(room, new RegExp(`--${t}:\\s*${hex};`));
    assert.match(block(gw, ".multiRed"), /color:\s*var\(--ds-red\)/);
    assert.match(block(gw, ".multiAmber"), /color:\s*var\(--ds-amber\)/);
    assert.match(block(gw, ".multiGreen"), /color:\s*var\(--ds-green\)/);
  });

  test("every surface that paints MULTI reads the one ladder", () => {
    const painters = walk(join(root, "src"))
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) => /^\s*MULTI\s*$/m.test(readFileSync(f, "utf8")))
      .map((f) => relative(root, f))
      .sort();
    // Groundwork's badge moved into its face in pass 11 (MultiBadge), where
    // the browser suite renders it (tests/browser/prep.test.ts).
    assert.deepEqual(painters, [
      "src/app/groundwork/face.tsx",
      "src/app/room/room-client.tsx",
    ]);
    assert.match(
      readFileSync(join(root, "src/app/groundwork/face.tsx"), "utf8"),
      /\[\s*multiTone\(count\)\s*\]/,
    );
    assert.match(
      readFileSync(join(root, "src/app/groundwork/page.tsx"), "utf8"),
      /<MultiBadge count=\{file\.threadCount\} \/>/,
    );
    assert.match(
      readFileSync(join(root, "src/app/room/page.tsx"), "utf8"),
      /multiTone = multiToneOf\(peopleCount\)/,
    );
  });
});

// ── pass 10 · "Edge tabs (Roundups · Check-ins) are thin AND inconspicuous —
// quiet ink, color on hover only." ─────────────────────────────────────────
// The names are pinned by render in tests/room-parity.test.ts; the colors
// are the stylesheet's, read here.
describe("the edge tabs rest in quiet ink and take color on hover only", () => {
  const css = readFileSync(join(root, "src/app/room/room.module.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map((m) => ({ sel: m[1].trim(), body: m[2] }))
    .filter((r) => /\.edge\w*/.test(r.sel));
  const COLOR = /var\(--(?:orange|blue|green|amber|red)\)|#(?:fff|ffffff)\b|var\(--ink\)/;

  test("at rest the tab and its count wear the ink ladder's quiet steps", () => {
    const at = (sel: string) => rules.find((r) => r.sel === sel)?.body ?? "";
    assert.match(at(".edge"), /color:\s*var\(--quiet\);/);
    assert.match(at(".edgeCount"), /color:\s*var\(--soft\);/);
    assert.match(at(".edgeCount"), /background:\s*rgba\(10, 28, 64, 0\.08\);/);
  });

  test("solid ink, white and every accent appear only under :hover", () => {
    const off = rules
      .filter((r) => COLOR.test(r.body) && !r.sel.includes(":hover"))
      .map((r) => r.sel);
    assert.deepEqual(off, []);
    assert.ok(
      rules.some(
        (r) => r.sel === ".edge:hover .edgeDue" && /var\(--amber\)/.test(r.body),
      ),
    );
  });
});

// ── pass 10 · the ship pattern's verify chain ─────────────────────────────
// "Verify chain uses &&: prettier → tsc → eslint (0 warnings) → tsx tests →
// next build." package.json's verify script is the chain (#369), and the
// test script runs every test file in tests/. The branch, the PR and the
// squash merge are process; nothing here can show them.
describe("the verify chain: five checks in the decreed order, joined by &&", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  test("prettier, tsc, eslint with no warnings, the tests, the build", () => {
    const steps = pkg.scripts.verify.split(" && ");
    assert.equal(steps.length, 5, pkg.scripts.verify);
    assert.match(steps[0], /^npm run -s format:check$/);
    assert.match(pkg.scripts["format:check"], /^prettier --check /);
    assert.match(steps[1], /^tsc --noEmit$/);
    assert.match(steps[2], /^eslint \. --max-warnings 0\b/);
    assert.match(steps[3], /^npm test$/);
    assert.match(steps[4], /^next build$/);
    assert.match(pkg.scripts.lint, /--max-warnings 0/);
  });

  test("the test script runs every test file in tests/, each once", () => {
    const listed = pkg.scripts.test.split(/\s+/).filter((x) => x.endsWith(".test.ts"));
    const files: string[] = [];
    const walkTests = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walkTests(p);
        else if (n.endsWith(".test.ts")) files.push(relative(root, p));
      }
    };
    walkTests(join(root, "tests"));
    assert.equal(new Set(listed).size, listed.length, "a file listed twice");
    assert.deepEqual([...listed].sort(), files.sort());
  });
});

// ── pass 11 · A6.11: concepts never ship; winners do ─────────────────────────
// What "ship" means in code is "served by the app". The judging documents
// live in docs/mockups, which Next never serves (it serves src/app's routes
// and public/). So: no route is a concept, a variant or a scratch surface; no
// mockup sits in public/; nothing under src imports from docs/; and no
// rewrite in the Next config reaches docs/. The winner's ship order is the
// process half (A6.12).
describe("concepts never ship: no concept is served (A6.11)", () => {
  const routes = (readdirSync(join(root, "src/app"), { recursive: true }) as string[])
    .filter((f) => /(^|\/)(page\.tsx|route\.ts)$/.test(f))
    .map((f) => "/" + f.replace(/(^|\/)(page\.tsx|route\.ts)$/, ""));

  test("no route is named for a concept, a variant, a mockup or a scratch surface", () => {
    assert.ok(routes.length > 10);
    const CONCEPT =
      /(^|\/)(concepts?|variants?|mockups?|triptych|options?|draft|drafts|wip|sandbox|playground|dev|test|tmp|scratchpad-v\d|.*-(concept|variant|mockup|alt|b))(\/|$)/i;
    assert.deepEqual(routes.filter((r) => CONCEPT.test(r)), []);
  });

  test("no judging document is served: none in public/, none imported, no rewrite to docs/", () => {
    const mockups = new Set(readdirSync(join(root, "docs/mockups")));
    const pub = readdirSync(join(root, "public"), { recursive: true }) as string[];
    assert.deepEqual(pub.filter((f) => mockups.has(f.split("/").pop() ?? "")), []);
    assert.deepEqual(pub.filter((f) => /mockup|concept|triptych/i.test(f)), []);
    const src = (readdirSync(join(root, "src"), { recursive: true }) as string[]).filter((f) => /\.(ts|tsx)$/.test(f));
    const reaching = src.filter((f) => /from\s+["'][^"']*docs\//.test(readFileSync(join(root, "src", f), "utf8")));
    assert.deepEqual(reaching, []);
    const config = readFileSync(join(root, "next.config.ts"), "utf8");
    assert.ok(!/rewrites|redirects|docs\//.test(config), "the Next config reaches past the app");
  });
});

// ── the palette pass · "Ad-hoc per-mockup palettes of any kind. The palette
// is the brand's, always." (the design canon) ────────────────────────────────
// The brand's palette is antaeus-brand-kit/css/tokens.css: the field and its
// surfaces, ink and ink-700, the five accents and their strong states, white,
// and any of them at an alpha. Every color the app's stylesheets and its
// components write is one of those; every color variable a sheet reads
// resolves to something.
describe("the palette is the brand's, always (the design canon)", () => {
  const BRAND_HEX = new Set(["0a1c40", "142949", "e6701e", "d4661b", "2563eb", "1d4ed8", "22c55e", "f59e0b", "ef4444", "ffffff", "f5f7fb", "fafbfd", "eff2f7", "fbfaf5"]);
  const BRAND_RGB = new Set([...BRAND_HEX].map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",")));
  const hex6 = (h: string) => {
    const x = h.replace("#", "").toLowerCase();
    return (x.length === 3 ? [...x].map((c) => c + c).join("") : x).slice(0, 6);
  };
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const files = (exts: RegExp) =>
    (readdirSync(join(root, "src"), { recursive: true }) as string[])
      .filter((f) => exts.test(f) && !f.startsWith("generated"))
      .map((f) => join("src", f));
  const offBrand = (text: string) => [
    ...[...text.matchAll(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map((m) => m[0]).filter((h) => !BRAND_HEX.has(hex6(h))),
    ...[...text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map((m) => m[0]).filter((m) => !BRAND_RGB.has(m.replace(/rgba?\(\s*/, "").split(/\s*,\s*/).slice(0, 3).join(","))),
    ...[...text.matchAll(/:\s*(black|gray|grey|silver|purple|navy|teal|crimson|tomato|gold|yellow|pink|brown|orange|green|red|blue)\s*[;!]/g)].map((m) => m[1]),
  ];

  test("every color in every stylesheet under src is the brand's", () => {
    const css = files(/\.css$/);
    assert.ok(css.length > 10);
    const found = css.flatMap((f) => offBrand(strip(readFileSync(join(root, f), "utf8"))).map((c) => `${f}: ${c}`));
    assert.deepEqual(found, []);
  });

  test("every color a component writes into a style or a token is the brand's", () => {
    const found = files(/\.(ts|tsx)$/).flatMap((f) => {
      const text = readFileSync(join(root, f), "utf8");
      // A color literal in a string: style objects, svg fills, color tokens.
      return [...text.matchAll(/["'`](#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))["'`]/g)]
        .flatMap((m) => offBrand(m[1]))
        .map((c) => `${f}: ${c}`);
    });
    assert.deepEqual(found, []);
  });

  test("every color variable a stylesheet reads resolves", () => {
    const tokens = ["config/design-tokens.css", "antaeus-brand-kit/css/tokens.css", "antaeus-brand-kit/css/motion.css", "src/app/globals.css"]
      .filter((f) => existsSync(join(root, f)))
      .flatMap((f) => [...readFileSync(join(root, f), "utf8").matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const global = new Set([...tokens, "--font-donor-serif", "--font-donor-sans", "--font-donor-mono"]);
    const dangling = files(/\.css$/).flatMap((f) => {
      const s = strip(readFileSync(join(root, f), "utf8"));
      const local = new Set([...s.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
      return [...s.matchAll(/([\w-]+)\s*:[^;{}]*?var\((--[\w-]+)\s*(,[^)]*)?\)/g)]
        .filter((m) => /color|background|border|fill|stroke|shadow|outline|font/.test(m[1]))
        .filter((m) => !m[3] && !global.has(m[2]) && !local.has(m[2]))
        .map((m) => `${f}: ${m[1]} reads ${m[2]}`);
    });
    assert.deepEqual([...new Set(dangling)], []);
  });
});

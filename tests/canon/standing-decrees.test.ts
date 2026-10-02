// Standing decrees pinned as behavior: the wayfinder's archive (the Playbook
// face's own precedent, CLAUDE.md:508-516, and the pass-1 ruling P1), the
// bank's door under the click-depth law (:395-402 with :512-516), and the
// model roster ("Opus or better, always", founder-decreed 2026-07-31; one
// roster, ruled 2026-09-25). Every test calls a function or reads a
// module's exported values, except the two import scans under P1, which read
// import statements and nothing else.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { WAYFINDER_ROUTES, pageFileFor } from "../../src/components/wayfinder-routes";
import { questionById } from "../../src/lib/intel/bank";
import { DISCOVERY } from "../../src/lib/intel/discovery";
import * as doctrine from "../../src/lib/intranet/doctrine";

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

  test("every archived row still resolves — reachable and quiet, never a dead link", () => {
    for (const r of WAYFINDER_ROUTES.filter((x) => x.archived))
      assert.ok(existsSync(join(root, pageFileFor(r.href))), `${r.label} → ${r.href}`);
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

// ── C13 · a playbook citation and the bank (click-depth :397-399; the face
// :512-516). The card is retired; what holds is the bank's own lookup ─────
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

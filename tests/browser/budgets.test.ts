// "Arrival budgets never grow" (the meat law, founder-decreed 2026-08-20),
// as a ratchet in a real browser (pass 11). Each face's arrival is measured
// as the visible pieces of text one unit shows on first paint (a HomeRoom row,
// Groundwork's stage, an Accounts row, a Sendbook line, the Intranet's
// digest entry), and held to the budget recorded in budgets.json. A face
// that grows fails the build until its budget is raised in the same diff,
// where a reviewer sees it; intelligence moves a click down instead.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Browser, Locator } from "playwright-core";
import { cls, mount, openBrowser, type MountOptions } from "../helpers/browser";

const BUDGET = JSON.parse(readFileSync("tests/browser/budgets.json", "utf8")) as Record<
  string,
  number
>;

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

/** What a unit shows on arrival: its visible pieces of text (each text run
 *  a person can see, however long). A face grows when it shows more pieces;
 *  the fixtures are fixed, so the count is too. */
const piecesOf = (unit: Locator) =>
  unit.evaluate((root) => {
    let pieces = 0;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walk.nextNode())) {
      if (!(n.textContent ?? "").trim()) continue;
      if (
        !n.parentElement!.checkVisibility({
          visibilityProperty: true,
          opacityProperty: true,
        })
      )
        continue;
      pieces += 1;
    }
    return pieces;
  });

const UNITS: [
  string,
  string,
  MountOptions,
  (p: import("playwright-core").Page) => Locator,
][] = [
  [
    "homeroom-row",
    "tests/browser/fixtures/room.tsx",
    { returns: { chuteBook: [] } },
    (p) =>
      p
        .locator("a", { hasText: /^Simploy$/ })
        .first()
        .locator("xpath=ancestor::*[contains(@class,'room__row')][1]"),
  ],
  [
    "groundwork-stage",
    "tests/browser/fixtures/evidence.tsx",
    { now: "2026-07-30T15:00:00Z" },
    (p) => p.locator(cls("groundwork.module.css", "stage")),
  ],
  [
    "accounts-row",
    "tests/browser/fixtures/accounts.tsx",
    {},
    (p) => p.locator("tbody tr[id^=acct-]").first(),
  ],
  [
    "sendbook-line",
    "tests/browser/fixtures/sendbook.tsx",
    {},
    (p) => p.locator(cls("sendbook.module.css", "line")).first(),
  ],
  [
    "intranet-entry",
    "tests/browser/fixtures/intranet.tsx",
    {},
    (p) => p.locator(cls("command-center.module.css", "itRunLines")).first(),
  ],
  // The second ring (pass 12): the draft desk's head and its one cited line,
  // the roundup brief's folded prep, State of play folded, a Playbook draft.
  [
    "draft-desk",
    "tests/browser/fixtures/desk.tsx",
    {
      returns: { listMailTemplates: [] },
      routes: {
        "/activity/evidence": () => ({
          ok: true,
          line: "Dana wrote 09/18: Re: pricing.",
          cite: { k: "r1", day: "2026-09-18", who: "Dana Ruiz", subject: "Re: pricing" },
        }),
      },
    },
    (p) => p.locator(cls("command-center.module.css", "deskLine")).first(),
  ],
  [
    "roundup-prep",
    "tests/browser/fixtures/prep.tsx",
    {},
    (p) => p.locator(cls("groundwork.module.css", "draft")).first(),
  ],
  [
    "state-of-play",
    "tests/browser/fixtures/readout.tsx",
    {},
    (p) => p.locator(cls("groundwork.module.css", "russ")).first(),
  ],
  [
    "playbook-draft",
    "tests/browser/fixtures/drafts.tsx",
    {},
    (p) => p.locator(".srDraftCard").first(),
  ],
];

describe("A4.31 · arrival budgets never grow", () => {
  for (const [key, fixture, opts, unit] of UNITS)
    test(`${key} arrives within its budget of ${BUDGET[key]} pieces`, async () => {
      assert.ok(Number.isInteger(BUDGET[key]), `${key} has no budget`);
      const page = await mount(browser, fixture, opts);
      const u = unit(page);
      assert.equal(await u.count(), 1, `${key}'s unit is gone`);
      const n = await piecesOf(u);
      assert.ok(n > 0, `${key} measured nothing`);
      assert.ok(
        n <= BUDGET[key],
        `${key} arrives with ${n} pieces against a budget of ${BUDGET[key]}`,
      );
      await page.close();
    });

  test("the budget file holds a budget for every unit measured, and nothing else", () => {
    assert.deepEqual(Object.keys(BUDGET).sort(), UNITS.map(([k]) => k).sort());
  });
});

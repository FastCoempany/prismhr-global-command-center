// The Evidence Chips and the meat law in a real browser (pass 11). A4.16:
// a mono chip row beneath the stage's reason, each chip a door. A4.27: every
// citation, theme, count and case drills to row-level meat: a cite to its
// cleaned excerpt, the support count to the case list, a case to its
// timeline, intent to the campaign table, the quiet flag to the colleague's
// row. The other surfaces' drills ride their own suites (accounts.test.ts,
// room.test.ts).

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { cls, mount, openBrowser, requestsOf } from "../helpers/browser";
import { EVIDENCE, EXCERPT } from "./evidence";

const FIX = "tests/browser/fixtures/evidence.tsx";
const $ = (n: string) => cls("groundwork.module.css", n);
const ACCT = "001F000000w38BOIAY";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const chip = (page: Page, text: RegExp) => page.locator(`button${$("evChip")}`, { hasText: text });
const fold = (page: Page) => page.locator($("evFold"));

describe("A4.16 · the Evidence Chips: a mono chip row beneath the stage's reason, each chip a door", () => {
  test("the row sits under the reason line, every chip a mono button, nothing open on arrival", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    const why = await page.locator($("stgWhy")).boundingBox();
    const row = await page.locator($("evChips")).boundingBox();
    assert.ok(why && row && row.y >= why.y + why.height - 1, "the chips are not beneath the reason");
    const chips = page.locator($("evChips")).locator("> *");
    const tags = await chips.evaluateAll((els) => els.map((e) => e.tagName));
    assert.ok(tags.length >= 4 && tags.every((t) => t === "BUTTON"), tags.join(","));
    for (const f of await chips.evaluateAll((els) => els.map((e) => getComputedStyle(e).fontFamily)))
      assert.match(f, /JetBrains Mono/);
    assert.equal(await fold(page).count(), 0);
    await page.close();
  });
});

describe("A4.27 · every citation, theme, count and case drills to row-level meat", () => {
  test("the gem's cite opens to its cleaned excerpt", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    await chip(page, /◆ MEXICO ASK/).click();
    await fold(page).locator($("evCite")).first().click();
    await page.waitForSelector(`text=${EXCERPT.r1}`);
    assert.deepEqual(requestsOf(page), [`GET /activity/evidence?acct=${ACCT}&k=r1`]);
    await page.close();
  });

  test("the support count opens the case list, and a case opens its excerpt timeline", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    await chip(page, /▮ SUPPORT 14/).click();
    const kase = fold(page).locator($("evCite"), { hasText: /00123456/ });
    await kase.waitFor();
    await kase.click();
    await page.waitForSelector("text=The Ontario run is stuck on a tax table.");
    assert.deepEqual(requestsOf(page), [
      `GET /activity/evidence?acct=${ACCT}&theme=`,
      `GET /activity/evidence?acct=${ACCT}&case=00123456`,
    ]);
    await page.close();
  });

  test("the spike day opens its rows, each to its excerpt", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    await chip(page, /SPIKE 09\/12/).click();
    await fold(page).locator($("evCite")).first().click();
    await page.waitForSelector(`text=${EXCERPT.s1}`);
    await page.close();
  });

  test("intent opens the campaign table, and the quiet flag opens the colleague's row", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    await chip(page, /INTENT · O 4 · C 1 · 30D/).click();
    await page.waitForSelector("text=Global payroll webinar");
    await chip(page, /⚠/).click();
    await fold(page).locator($("evCite")).first().click();
    await page.waitForSelector(`text=${EXCERPT.c1}`);
    await page.close();
  });
});

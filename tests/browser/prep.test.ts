// The roundup brief's folded CSM prep (A4.23) and Groundwork's MULTI badge
// (A11.3) in a real browser (pass 11).

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { cls, mount, openBrowser } from "../helpers/browser";
import { EVIDENCE, EXCERPT } from "./evidence";

const FIX = "tests/browser/fixtures/prep.tsx";
const $ = (n: string) => cls("groundwork.module.css", n);

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

describe("A4.23 · the roundup brief's folded CSM prep", () => {
  test("folded on arrival, its kicker the real count; open, each row a door to its excerpt; none, no fold", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    const fold = page.locator(`details${$("prepFold")}`);
    assert.equal(await fold.count(), 1, "an empty prep painted a fold");
    assert.equal(await fold.evaluate((d) => (d as HTMLDetailsElement).open), false);
    assert.equal(await page.locator(`${$("prepFold")} button`).first().isVisible(), false);
    assert.match(await fold.locator("summary").innerText(), /THE CSM’S OWN LAST 3 ROWS/);
    await fold.locator("summary").click();
    const rows = fold.locator("button");
    assert.equal(await rows.count(), 3);
    await rows.first().click();
    await page.waitForSelector(`text=${EXCERPT.c1}`);
    await page.close();
  });
});

describe("A11.3 · Groundwork's MULTI wears the same ladder as the room's", () => {
  test("one thread red, two amber, three or more green; no badge when no one is on file", async () => {
    const page = await mount(browser, FIX);
    const badges = page.locator(`#multis ${$("multi")}`);
    assert.deepEqual(await badges.allInnerTexts(), ["MULTI", "MULTI", "MULTI"]);
    const colors = await badges.evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
    assert.deepEqual(colors, ["rgb(239, 68, 68)", "rgb(245, 158, 11)", "rgb(34, 197, 94)"]);
    await page.close();
  });
});

// The Scratchpaper in a real browser (pass 11). A7.3: a ✎ button
// bottom-right opens one running pad, and the button holds its corner while
// the page scrolls.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { callsOf, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/scratchpad.tsx";
const LINES = {
  scratchList: { ok: true, more: false, lines: [{ id: "l1", body: "Ask Pat about the Ontario run.", at: "2026-10-08T15:00:00Z" }] },
  padAskFeed: { ok: true, entries: [], unread: false },
};

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

describe("A7.3 · a ✎ button bottom-right opens one running pad", () => {
  test("the ✎ sits in the bottom-right corner, holds it on scroll, and opens one pad", async () => {
    const page = await mount(browser, FIX, { returns: LINES, viewport: { width: 1280, height: 800 } });
    const fab = page.getByRole("button", { name: "Open the scratchpaper" });
    assert.equal((await fab.innerText()).trim(), "✎");
    const at = async () => {
      const b = await fab.boundingBox();
      assert.ok(b);
      return { right: 1280 - (b.x + b.width), bottom: 800 - (b.y + b.height) };
    };
    const first = await at();
    assert.ok(first.right < 40 && first.bottom < 40, JSON.stringify(first));
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(100);
    assert.deepEqual(await at(), first, "the button left its corner on scroll");
    assert.equal(await page.getByRole("dialog").count(), 0, "a pad is open before the click");
    await fab.click();
    await page.getByRole("dialog", { name: "Scratchpaper" }).waitFor();
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.waitForSelector("text=Ask Pat about the Ontario run.");
    assert.ok((await callsOf(page)).some(([n]) => n === "scratchList"));
    // A second press closes it: one pad, never a second.
    await page.getByRole("button", { name: "Close the scratchpaper" }).click();
    await page.waitForTimeout(50);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.close();
  });
});

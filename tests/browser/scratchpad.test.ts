// The Scratchpaper in a real browser (pass 11). A7.3: a ✎ button
// bottom-right opens one running pad, and the button holds its corner while
// the page scrolls.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { callsOf, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/scratchpad.tsx";
const LINES = {
  scratchList: {
    ok: true,
    more: false,
    lines: [
      { id: "l1", body: "Ask Pat about the Ontario run.", at: "2026-10-08T15:00:00Z" },
    ],
  },
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
    const page = await mount(browser, FIX, {
      returns: LINES,
      viewport: { width: 1280, height: 800 },
    });
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
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "a pad is open before the click",
    );
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

// 2026-10-14: Shift+Enter starts a new line inside a line; Enter still keeps
// it. The paper shows the break, and the edit box works the same way.
describe("Shift+Enter starts a new line; Enter keeps", () => {
  const open = async (returns: Record<string, unknown>) => {
    const page = await mount(browser, FIX, { returns: { ...LINES, ...returns } });
    await page.getByRole("button", { name: "Open the scratchpaper" }).click();
    await page.getByRole("dialog", { name: "Scratchpaper" }).waitFor();
    await page.waitForSelector("text=Ask Pat about the Ontario run.");
    return page;
  };

  test("the write box takes a second line on Shift+Enter and keeps both on Enter", async () => {
    const kept = {
      id: "l2",
      body: "Call Pat.\nThen the Ontario run.",
      at: "2026-10-14T15:00:00Z",
    };
    const page = await open({ scratchAdd: { ok: true, line: kept } });
    const box = page.getByPlaceholder("Write it. Enter keeps it.");
    await box.click();
    await box.pressSequentially("Call Pat.");
    const one = (await box.boundingBox())!.height;
    await box.press("Shift+Enter");
    await box.pressSequentially("Then the Ontario run.");
    assert.equal(await box.inputValue(), "Call Pat.\nThen the Ontario run.");
    assert.ok(
      !(await callsOf(page)).some(([n]) => n === "scratchAdd"),
      "Shift+Enter kept the line",
    );
    assert.ok(
      (await box.boundingBox())!.height > one,
      "the box did not grow with its line",
    );
    await box.press("Enter");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("span")].some(
        (s) => s.innerText === "Call Pat.\nThen the Ontario run.",
      ),
    );
    const add = (await callsOf(page)).find(([n]) => n === "scratchAdd");
    assert.ok(add);
    assert.deepEqual(add[1], ["Call Pat.\nThen the Ontario run."]);
    assert.equal(await box.inputValue(), "", "the box did not clear");
    await page.close();
  });

  test("the edit box takes Shift+Enter as a new line and keeps on Enter", async () => {
    const page = await open({
      scratchEdit: {
        ok: true,
        body: "Ask Pat about the Ontario run.\nAnd the Quebec one.",
      },
    });
    await page.getByText("Ask Pat about the Ontario run.").hover();
    await page.getByTitle("Edit the line in place. Enter keeps it.").first().click();
    const edit = page.getByLabel("Edit the line");
    await edit.press("End");
    await edit.press("Shift+Enter");
    await edit.pressSequentially("And the Quebec one.");
    assert.ok(!(await callsOf(page)).some(([n]) => n === "scratchEdit"));
    await edit.press("Enter");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("span")].some(
        (s) => s.innerText === "Ask Pat about the Ontario run.\nAnd the Quebec one.",
      ),
    );
    const call = (await callsOf(page)).find(([n]) => n === "scratchEdit");
    assert.ok(call);
    assert.deepEqual(call[1], [
      "l1",
      "Ask Pat about the Ontario run.\nAnd the Quebec one.",
    ]);
    await page.close();
  });
});

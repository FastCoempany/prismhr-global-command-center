// The draft on the stage in a real browser (ship order 2026-10-19): Send in
// Outlook is the stage's one orange move, the Why fold stays shut on
// arrival, the run's keys drive the letter, an edit saves on blur, a stamp
// the record made carries no take-back, and the letter fits a phone.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { callsOf, cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/letter.tsx";
const $ = (n: string) => cls("groundwork.module.css", n);
const ORANGE = "rgb(230, 112, 30)";
const MID = "2026-07-30T15:00:00Z";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

describe("the letter on the stage", () => {
  test("Send in Outlook is the stage's one orange move, and the Why fold is shut", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const oranges = await page.$$eval(`${$("stage")} button`, (els) =>
      els
        .filter((e) => getComputedStyle(e).backgroundColor === "rgb(230, 112, 30)")
        .map((e) => e.textContent ?? ""),
    );
    assert.equal(oranges.length, 1);
    assert.match(oranges[0], /^Send in Outlook/);
    assert.equal(
      await page.$eval("[data-why]", (d) => (d as HTMLDetailsElement).open),
      false,
    );
    assert.match(await page.locator($("stgAct")).innerText(), /^Email Cristina\.$/);
    assert.equal(
      await page.$eval($("btnAccent"), (e) => getComputedStyle(e).backgroundColor),
      ORANGE,
    );
    await page.close();
  });

  test("the run's keys: E edits, S sends with the draft as it stands", async () => {
    const page = await mount(browser, FIX, { now: MID });
    await page.keyboard.press("e");
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), "TEXTAREA");
    await page.keyboard.type(" Thanks.");
    await page.keyboard.press("Escape");
    await page.keyboard.press("s");
    await page.waitForFunction(() =>
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(
        (c) => c[0] === "sendFromStage",
      ),
    );
    const calls = await callsOf(page);
    const save = calls.find((c) => c[0] === "saveStageDraft");
    assert.ok(save, "the edit saved on blur");
    const send = calls.find((c) => c[0] === "sendFromStage");
    assert.ok(send);
    assert.equal(send[1][0], "S0000000000000001");
    assert.match(String(send[1][3]), /Antaeus Thanks\.$/);
    await page.close();
  });

  test("a stamp the record made carries no take-back; the drafted moves say so", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const wing = page.locator($("wingL"));
    assert.equal(await wing.locator($("wingUndo")).count(), 2);
    assert.match(await wing.innerText(), /SENT · WAITING ON THE COPY/);
    assert.equal(await page.locator($("wingDrafted")).count(), 2);
    await page.close();
  });

  test("the letter fits a phone", async () => {
    const page = await mount(browser, FIX, {
      now: MID,
      viewport: { width: 390, height: 900 },
    });
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(over, false);
    await page.close();
  });
});

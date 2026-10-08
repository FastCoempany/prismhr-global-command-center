// Groundwork's face in a real browser (pass 11): what the server render left
// to the stylesheet. A9.2 to A9.7 and A10.20: the wings' sides, the heat
// ladder's color, the whisper, the Klaxon's serif verb and orange count, the
// burn bar's width, and red and the pulse inside the last five minutes.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/groundwork.tsx";
const SHEET = "groundwork.module.css";
const $ = (n: string) => cls(SHEET, n);

// 15:00Z on 7/30 is 10:00 Chicago (CDT), the send band's midpoint; 15:56Z is
// four minutes before the band closes at 11:00.
const MID = "2026-07-30T15:00:00Z";
const LATE = "2026-07-30T15:56:00Z";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const style = (page: Page, sel: string, prop: string) =>
  page.$eval(sel, (el, p) => getComputedStyle(el).getPropertyValue(p as string), prop);
const box = async (page: Page, sel: string) => {
  const b = await page.locator(sel).first().boundingBox();
  assert.ok(b, `${sel} has no box`);
  return b;
};
// The brand's accents (config/design-tokens.css, the design canon).
const AMBER = "rgb(245, 158, 11)";
const ORANGE = "rgb(230, 112, 30)";
const RED = "rgb(239, 68, 68)";
const NAVY = "rgb(10, 28, 64)";

describe("A9.2 to A9.4 · the wings sit left and right of the stage, the heat rides amber, the trigger whispers", () => {
  test("done is the left wing, waiting the right, the stage between them", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const L = await box(page, $("wingL"));
    const S = await box(page, $("stage"));
    const R = await box(page, $("wingR"));
    assert.ok(L.x + L.width <= S.x + 1, "the done wing is not left of the stage");
    assert.ok(S.x + S.width <= R.x + 1, "the waiting wing is not right of the stage");
    assert.match(await page.locator($("wingL")).innerText(), /Worked One/);
    await page.close();
  });

  test("solid amber burns today, half amber is this week, quiet ink keeps", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const tick = (n: number) => style(page, $(`tick${n}`), "background-color");
    assert.equal(await tick(3), AMBER);
    const half = await tick(2);
    assert.notEqual(half, AMBER);
    assert.match(half, /^(rgba\(245, 158, 11, 0\.\d+\)|color\(srgb 0\.96\d* 0\.6\d* 0\.04\d* \/ 0\.\d+\))$/, half);
    const quiet = await tick(1);
    assert.ok(![AMBER, half].includes(quiet), quiet);
    assert.doesNotMatch(quiet, /245, 158, 11/);
    // The name wears the ladder too: burns in solid ink, keeps quieter.
    const nm = (n: number) => style(page, $(`h${n}`), "color");
    assert.equal(await nm(3), NAVY);
    assert.notEqual(await nm(1), NAVY);
    await page.close();
  });

  test("the trigger sits beneath its name, smaller and quieter", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const row = page.locator(`a${$("wingItem")}`).first();
    const nm = await row.locator($("wingNm")).boundingBox();
    const why = await row.locator($("wingWhy")).boundingBox();
    assert.ok(nm && why);
    assert.ok(why.y >= nm.y + nm.height - 1, "the trigger is not beneath the name");
    const px = (s: string) => Number.parseFloat(s);
    const whyFont = px(await style(page, `${$("wingItem")} ${$("wingWhy")}`, "font-size"));
    const nmFont = px(await style(page, `${$("wingItem")} ${$("wingNm")}`, "font-size"));
    assert.ok(whyFont < nmFont, `${whyFont} is not smaller than ${nmFont}`);
    assert.notEqual(await style(page, `${$("wingItem")} ${$("wingWhy")}`, "color"), NAVY);
    await page.close();
  });
});

describe("A9.5 to A9.7 · the Klaxon", () => {
  test("A9.5 · the serif verb runs the masthead's left, the orange count its right", async () => {
    const page = await mount(browser, FIX, { now: MID });
    await page.waitForFunction((sel) => !/—/.test(document.querySelector(sel)?.textContent ?? "—"), $("kxCount"));
    assert.match(await style(page, $("kxVerb"), "font-family"), /DM Serif Display/);
    assert.equal(await style(page, $("kxCount"), "color"), ORANGE);
    const top = await box(page, $("kxTop"));
    const v = await box(page, $("kxVerb"));
    const c = await box(page, $("kxCount"));
    assert.ok(v.x - top.x < 4, "the verb does not lead the masthead");
    assert.ok(top.x + top.width - (c.x + c.width) < 4, "the count does not end the masthead");
    await page.close();
  });

  test("A9.6 · the burn bar spans the masthead and drains as the window empties", async () => {
    const page = await mount(browser, FIX, { now: MID });
    // The fill eases to its width over 0.4s; read it once it has settled.
    await page.waitForTimeout(700);
    const top = await box(page, $("klaxon"));
    const bar = await box(page, $("kxBurn"));
    assert.ok(bar.width >= top.width - 6, "the burn bar is not full width");
    const fill = await page.$eval(`${$("kxBurn")} i`, (el) => (el as HTMLElement).getBoundingClientRect().width);
    const ratio = fill / bar.width;
    // Ten o'clock in a nine-to-eleven band: half the window is left.
    assert.ok(Math.abs(ratio - 0.5) < 0.06, `the bar holds ${ratio} at the midpoint`);
    assert.equal(await style(page, `${$("kxBurn")} i`, "background-color"), ORANGE);
    await page.close();
  });

  test("A9.7 · inside the last five minutes the count and the bar turn red and throb; reduced motion keeps the red", async () => {
    const page = await mount(browser, FIX, { now: LATE });
    await page.waitForSelector($("kxLate"));
    assert.equal(await style(page, `${$("kxLate")} ${$("kxCount")}`, "color"), RED);
    assert.equal(await style(page, `${$("kxLate")} ${$("kxBurn")} i`, "background-color"), RED);
    assert.equal(await style(page, `${$("kxLate")} ${$("kxCount")}`, "animation-name"), "kxThrob");
    assert.equal(await style(page, `${$("kxLate")} ${$("kxBurn")} i`, "animation-name"), "kxThrob");
    await page.close();
    const still = await mount(browser, FIX, { now: LATE, reducedMotion: true });
    await still.waitForSelector($("kxLate"));
    assert.equal(await style(still, `${$("kxLate")} ${$("kxCount")}`, "color"), RED);
    assert.equal(await style(still, `${$("kxLate")} ${$("kxCount")}`, "animation-name"), "none");
    await still.close();
    // At the midpoint there is no red and no throb.
    const calm = await mount(browser, FIX, { now: MID });
    await calm.waitForTimeout(60);
    assert.equal(await calm.locator($("kxLate")).count(), 0);
    assert.equal(await style(calm, $("kxCount"), "animation-name"), "none");
    await calm.close();
  });
});

describe("A10.20 · every stamp on the wing carries the ↺, revealed on hover", () => {
  test("the ↺ rests hidden and shows when the stamp is hovered", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const undo = page.locator($("wingUndo")).first();
    const rest = Number(await undo.evaluate((el) => getComputedStyle(el).opacity));
    await page.locator($("wingDone")).first().hover();
    await page.waitForTimeout(250);
    const lit = Number(await undo.evaluate((el) => getComputedStyle(el).opacity));
    assert.ok(rest < 0.5 && lit > 0.9, `rest ${rest}, hover ${lit}`);
    await page.close();
  });
});

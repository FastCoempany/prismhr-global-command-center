// The Accounts sheet in a real browser (pass 11): what a server render left
// to the stylesheet and the click. A8.1, A8.2 (the chip's orange tick and
// its whisper), A8.6 (the chip opens the sticky lane beside the sheet), A8.7
// (a cite drills to its excerpt from the evidence route), A8.21, A8.22 (the
// Filter Door at the shoulder, lit while a filter is live, the strip holding
// filters only, the titles sorting), A8.24 (the count, ⧉ and ⇩, the search's
// depth) and A4.19 (the three columns take the width; the gem folds open
// beneath its row on a click).

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { cls, mount, openBrowser, requestsOf } from "../helpers/browser";

const FIX = "tests/browser/fixtures/accounts.tsx";
const $ = (n: string) => cls("command-center.module.css", n);
const ORANGE = "rgb(230, 112, 30)";
const BLUE = "rgb(37, 99, 235)";
const QUIET = "rgba(10, 28, 64, 0.42)";
const EVIDENCE = {
  "/activity/evidence": (u: URL) =>
    u.searchParams.get("k") === "r1"
      ? { ok: true, row: { excerpt: "Can we talk Mexico next week? We have two hires there." } }
      : { ok: false, reason: "No such row." },
};

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const css = (page: Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const box = async (page: Page, sel: string) => {
  const b = await page.locator(sel).first().boundingBox();
  assert.ok(b, `${sel} has no box`);
  return b;
};

describe("A8.1, A8.2 · the Move Chip: a fixed edge with the orange tick, the source line whispered beneath", () => {
  test("the chip's left edge is a 3px orange tick, and its other edges are not", async () => {
    const page = await mount(browser, FIX);
    const chip = $("mchip");
    assert.equal(await css(page, chip, "border-left-color"), ORANGE);
    assert.equal(await css(page, chip, "border-left-width"), "3px");
    assert.notEqual(await css(page, chip, "border-top-color"), ORANGE);
    assert.equal(await css(page, chip, "border-top-width"), "1px");
    // The fixed edge: every chip starts at its cell's left edge.
    const cell = await box(page, $("srActCell"));
    const c = await box(page, chip);
    assert.ok(c.x - cell.x < 16, "the chip does not hold the cell's left edge");
    await page.close();
  });

  test("the source line sits beneath the act, smaller, mono and quiet", async () => {
    const page = await mount(browser, FIX);
    const src = $("mchipSrc");
    const chip = await box(page, $("mchip"));
    const s = await box(page, src);
    assert.ok(s.y > chip.y + 8, "the source line is not beneath the act");
    assert.match(await page.locator(src).innerText(), /◆ MEXICO ASK · 09\/30/);
    assert.ok(Number.parseFloat(await css(page, src, "font-size")) < Number.parseFloat(await css(page, $("mchip"), "font-size")));
    assert.match(await css(page, src, "font-family"), /JetBrains Mono/);
    assert.equal(await css(page, src, "color"), QUIET);
    await page.close();
  });
});

describe("A8.6, A8.7 · the chip opens the Act Lane, a sticky workbench beside the sheet, and its cites drill", () => {
  test("a click opens the lane on the act, to the right of the sheet, and it holds while the sheet scrolls", async () => {
    const page = await mount(browser, FIX);
    assert.equal(await page.locator($("actLane")).count(), 0, "the lane is out before the click");
    await page.locator($("mchip")).first().click();
    const lane = $("actLane");
    await page.waitForSelector(lane);
    assert.match(await page.locator(lane).innerText(), /Answer Pat about Mexico\./);
    const table = await box(page, "table");
    const l = await box(page, lane);
    assert.ok(l.x >= table.x + table.width - 1, "the lane is not beside the sheet");
    assert.equal(await css(page, lane, "position"), "sticky");
    const before = l.y;
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(150);
    const scrolled = await page.evaluate(() => window.scrollY);
    assert.ok(scrolled > 500, "the page did not scroll");
    const held = (await box(page, lane)).y;
    assert.ok(held >= 0 && held < before + 1 && held <= 120, `the lane left the view: ${held}`);
    // A second click on the chip closes it.
    await page.mouse.wheel(0, -3000);
    await page.locator($("mchip")).first().click();
    await page.waitForTimeout(50);
    assert.equal(await page.locator(lane).count(), 0);
    await page.close();
  });

  test("a cite in the lane drills to its cleaned excerpt from the evidence route, and folds back", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    await page.locator($("mchip")).first().click();
    const cite = page.locator(`${$("actLane")} ${$("srCite")}`).first();
    await cite.click();
    await page.waitForSelector(`${$("actLane")} ${$("srExcerpt")}`);
    assert.match(
      await page.locator(`${$("actLane")} ${$("srExcerpt")}`).innerText(),
      /Can we talk Mexico next week\?/,
    );
    assert.deepEqual(requestsOf(page), ["GET /activity/evidence?acct=001F000000w38BOIAY&k=r1"]);
    // The cites sit above the draft.
    const c = await box(page, `${$("actLane")} ${$("srCite")}`);
    const to = await box(page, `${$("actLane")} input`);
    assert.ok(c.y < to.y, "the evidence is not above the draft");
    await cite.click();
    await page.waitForTimeout(50);
    assert.equal(await page.locator(`${$("actLane")} ${$("srExcerpt")}`).count(), 0);
    await page.close();
  });
});

describe("A8.21, A8.22 · the Filter Door at the shoulder; the titles are the only sort", () => {
  test("one mono door at the sheet's top-right shoulder, quiet at rest, lit and named while a filter is live", async () => {
    const page = await mount(browser, FIX);
    const door = page.locator($("fdoor"));
    assert.equal(await door.count(), 1);
    const d = await box(page, $("fdoor"));
    const t = await box(page, "table");
    assert.ok(Math.abs(d.x + d.width - (t.x + t.width)) < 8, "the door is not at the right shoulder");
    assert.ok(d.y + d.height <= t.y + 1, "the door is not above the sheet");
    assert.match(await css(page, $("fdoor"), "font-family"), /JetBrains Mono/);
    assert.equal(await css(page, $("fdoor"), "color"), QUIET);
    assert.equal(await page.locator("select").count(), 0, "a filter shows before the door opens");
    await door.click();
    const selects = page.locator(`${$("fstrip")} select`);
    assert.equal(await selects.count(), 5);
    const labels = await selects.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    assert.deepEqual(labels, ["Partner", "Model", "Fit tier", "Play type", "Stage"]);
    await page.locator('select[aria-label="Partner"]').selectOption("Lesha Cyphers");
    await page.waitForTimeout(50);
    assert.equal(await css(page, $("fdoor"), "color"), BLUE);
    assert.match(await door.innerText(), /Lesha|PARTNER|1/i);
    await page.close();
  });

  test("no sort control anywhere; a click on a title re-sorts the sheet", async () => {
    const page = await mount(browser, FIX);
    await page.locator($("fdoor")).click();
    for (const l of await page.locator("select").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? "")))
      assert.doesNotMatch(l, /sort/i);
    const names = () =>
      page.locator("tbody tr[id^=acct-] td:first-child").evaluateAll((els) => els.slice(0, 3).map((e) => (e.textContent ?? "").trim()));
    const first = await names();
    await page.locator($("thSort"), { hasText: /^Account/ }).first().click();
    await page.waitForTimeout(50);
    const byName = await names();
    assert.notDeepEqual(byName, first, "the Account title did not re-sort");
    await page.close();
  });
});

describe("A8.24 · the count rides the Account title, ⧉ and ⇩ ride the page title, the search has depth", () => {
  test("the count sits in the Account title; ⧉ and ⇩ sit on the h1's line; the search is raised", async () => {
    const page = await mount(browser, FIX);
    assert.match(await page.locator($("thCount")).innerText(), /31 OF 31/i);
    const h1 = await box(page, `${$("pageHead")} h1`);
    for (const g of ["⧉", "⇩"]) {
      const b = await box(page, `${$("pageHead")} >> text=${g}`);
      assert.ok(b.y < h1.y + h1.height && b.y + b.height > h1.y, `${g} is not on the title's line`);
    }
    const shadow = await css(page, $("searchDeep"), "box-shadow");
    assert.notEqual(shadow, "none");
    assert.match(shadow, /rgba\(10, 28, 64, 0\.0\d+\)/);
    await page.close();
  });
});

describe("A4.19 · LAST HUMAN TOUCH, THE SIGNAL and ACT take the width; the gem folds open beneath its row", () => {
  test("the three columns hold more width than the three before them", async () => {
    const page = await mount(browser, FIX);
    const widths = await page.locator("thead th").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    assert.equal(widths.length, 6);
    const left = widths[0] + widths[1] + widths[2];
    const right = widths[3] + widths[4] + widths[5];
    assert.ok(right > left, `the three hold ${right} beside ${left}`);
    await page.close();
  });

  test("a click on THE SIGNAL opens the gem's fold in the row directly beneath, shut on arrival", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    assert.equal(await page.locator($("srFoldTd")).count(), 0);
    await page.locator($("srTerm")).first().click();
    await page.waitForSelector($("srFoldTd"));
    const next = await page.locator("tbody tr[id^=acct-]").first().evaluate((tr) => {
      const n = tr.nextElementSibling;
      return n?.querySelector("td")?.className ?? "";
    });
    assert.match(next, /srFoldTd/, "the fold is not the next row");
    assert.match(await page.locator($("srFoldTd")).innerText(), /◆ MEXICO ASK/);
    // The acted gem keeps its ↺ in the same fold (A8.5).
    assert.match(await page.locator($("srActed")).innerText(), /Send the Canada one-pager\.[\s\S]*↺/);
    await page.close();
  });
});

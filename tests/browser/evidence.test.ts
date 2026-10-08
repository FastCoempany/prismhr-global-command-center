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

const chip = (page: Page, text: RegExp) =>
  page.locator(`button${$("evChip")}`, { hasText: text });
const fold = (page: Page) => page.locator($("evFold"));

describe("A4.16 · the Evidence Chips: a mono chip row beneath the stage's reason, each chip a door", () => {
  test("the row sits under the reason line, every chip a mono button, nothing open on arrival", async () => {
    const page = await mount(browser, FIX, { routes: EVIDENCE });
    const why = await page.locator($("stgWhy")).boundingBox();
    const row = await page.locator($("evChips")).boundingBox();
    assert.ok(
      why && row && row.y >= why.y + why.height - 1,
      "the chips are not beneath the reason",
    );
    const chips = page.locator($("evChips")).locator("> *");
    const tags = await chips.evaluateAll((els) => els.map((e) => e.tagName));
    assert.ok(tags.length >= 4 && tags.every((t) => t === "BUTTON"), tags.join(","));
    for (const f of await chips.evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).fontFamily),
    ))
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

describe("A4.27 · the second ring's citations drill too (pass 12)", () => {
  test("the draft desk's one line opens the row it cites", async () => {
    const page = await mount(browser, "tests/browser/fixtures/desk.tsx", {
      returns: { listMailTemplates: [] },
      routes: {
        "/activity/evidence": (u: URL) =>
          u.searchParams.get("who")
            ? {
                ok: true,
                line: "Dana wrote 09/18: Re: pricing.",
                cite: {
                  k: "r1",
                  day: "2026-09-18",
                  who: "Dana Ruiz",
                  subject: "Re: pricing",
                },
              }
            : EVIDENCE["/activity/evidence"](u),
      },
    });
    await page.waitForSelector("text=Dana wrote 09/18: Re: pricing.");
    await page.getByRole("button", { name: "▸ read it" }).click();
    await page.waitForSelector(`text=${EXCERPT.r1}`);
    await page.close();
  });

  test("a Playbook draft's counts open each account's cases on the theme, and a case its timeline", async () => {
    const page = await mount(browser, "tests/browser/fixtures/drafts.tsx", {
      routes: EVIDENCE,
    });
    await page.getByRole("button", { name: /THE 7 CASES ACROSS 2 ACCOUNTS/ }).click();
    await page.waitForSelector("text=Regis HR Group · 2");
    assert.ok(
      requestsOf(page).filter((r) => r.includes("theme=Ontario%20payroll")).length === 2,
      requestsOf(page).join(" | "),
    );
    await page
      .getByRole("button", { name: /00123456/ })
      .first()
      .click();
    await page.waitForSelector("text=The Ontario run is stuck on a tax table.");
    await page.close();
  });

  test("the Sendbook's ↩ REPLIED opens the message it reports", async () => {
    const page = await mount(browser, "tests/browser/fixtures/sendbook.tsx");
    assert.equal(await page.getByText("Monday works.").isVisible(), false);
    await page.getByText(/↩ REPLIED/).click();
    assert.equal(await page.getByText("Monday works.").isVisible(), true);
    await page.close();
  });
});

describe("A4.27 · the State of play's counts open the names they count (pass 12)", () => {
  test("a count opens its names in place; the book count links to the sheet; the copy stays plain", async () => {
    const page = await mount(browser, "tests/browser/fixtures/readout.tsx");
    await page.getByText("State of play ▾").click();
    assert.equal(await page.getByText("Alpha HR").count(), 0);
    await page.getByRole("button", { name: "1 are verified cold" }).click();
    await page.waitForSelector("text=Alpha HR");
    assert.equal(
      await page
        .getByRole("link", { name: "2 PrismHR and PrismHCM customer accounts" })
        .getAttribute("href"),
      "/accounts",
    );
    // The sentence reads whole around its doors.
    assert.match(
      await page.locator("p", { hasText: "verified cold" }).innerText(),
      /^I cover 2 PrismHR and PrismHCM customer accounts nationwide\. 1 of the 2 have an open conversation/,
    );
    await page.close();
  });
});

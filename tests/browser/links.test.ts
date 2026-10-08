// A11.2 in a real browser (pass 11): account names are plain links, no ↗
// arrow or affordance glyph, on every face that links one: the HomeRoom's
// rows and its receipts, Groundwork's stage, the Sendbook's lines and the
// Intranet's passage drawer (opened here by a real drill). The Accounts
// sheet's names are buttons; its drilldown's are plain words. A glyph a
// stylesheet adds through ::before or ::after counts too.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { mount, openBrowser } from "../helpers/browser";

const GLYPH = /[↗↘→⇗⇒➚➜➔›»▸▶↪⤴⤳]/;

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

/** Every link on the page that reaches an account by name, with its words
 *  and anything its stylesheet draws beside them. */
async function accountLinks(page: Page, names: string[]) {
  return page.locator("a[href*='/accounts']").evaluateAll(
    (els, ns) =>
      els
        .map((a) => ({
          text: a.textContent ?? "",
          before: getComputedStyle(a, "::before").content,
          after: getComputedStyle(a, "::after").content,
        }))
        .filter((l) => (ns as string[]).some((n) => l.text.includes(n))),
    names,
  );
}

function clean(links: { text: string; before: string; after: string }[], where: string) {
  assert.ok(links.length > 0, `${where} links no account by name`);
  for (const l of links) {
    assert.doesNotMatch(l.text, GLYPH, `${where}: ${l.text}`);
    for (const c of [l.before, l.after]) assert.ok(c === "none" || c === "normal" || c === '""', `${where}: ${l.text} draws ${c}`);
  }
}

describe("A11.2 · account names are plain links on every face", () => {
  test("the HomeRoom's rows", async () => {
    const page = await mount(browser, "tests/browser/fixtures/room.tsx", { returns: { chuteBook: [] } });
    clean(await accountLinks(page, ["Simploy", "Regis HR Group", "Axcet HR"]), "the HomeRoom");
    await page.close();
  });

  test("Groundwork's stage", async () => {
    const page = await mount(browser, "tests/browser/fixtures/groundwork.tsx", { now: "2026-07-30T15:00:00Z" });
    clean(await accountLinks(page, ["On Stage"]), "Groundwork");
    await page.close();
  });

  test("the Sendbook's lines", async () => {
    const page = await mount(browser, "tests/browser/fixtures/sendbook.tsx");
    clean(await accountLinks(page, ["Simploy"]), "the Sendbook");
    await page.close();
  });

  test("the Intranet's passage drawer, opened by a drill from a digest count", async () => {
    const page = await mount(browser, "tests/browser/fixtures/intranet.tsx", {
      returns: {
        intranetClaimLines: [{ id: "cl1", text: "We will send the census Friday.", speaker: "Pat Lee", saidAt: "2026-10-07T15:00:00Z" }],
        intranetPassage: {
          ok: true,
          before: "Pat said ",
          span: "we will send the census Friday",
          after: ".",
          title: "Simploy renewal",
          space: "Simploy renewal",
          origin: "teams",
          accountId: "001F000000w38BOIAY",
          accountName: "Simploy",
          originGone: "",
          whole: "",
          bank: null,
        },
      },
    });
    await page.getByRole("button", { name: "1 commitments people made" }).click();
    await page.getByText("We will send the census Friday.").click();
    await page.waitForSelector("text=Open Simploy.");
    clean(await accountLinks(page, ["Simploy"]), "the Intranet drawer");
    await page.close();
  });
});

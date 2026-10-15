// The Sales Nav spine in a real browser (ship order 2026-10-15): the fourth
// column sits right of the waiting wing and drops under the stage on a
// narrower screen; the newest alert shows its buttons and the rest show
// theirs on hover; the note opens as a pop-out and closes on Escape; Worked
// it stamps the alert's own move with the channel the pop-out used; ✕ hides
// one alert; every link leaves in a new tab for LinkedIn or Salesforce only;
// and orange stays the stage's one move.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/spine.tsx";
const $ = (n: string) => cls("groundwork.module.css", n);
const NOW = "2026-07-30T15:00:00Z";
const ORANGE = "rgb(230, 112, 30)";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const open = async (width = 1440): Promise<Page> => {
  const page = await mount(browser, FIX, { now: NOW });
  await page.setViewportSize({ width, height: 1100 });
  return page;
};
const calls = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __calls?: [string, unknown[]][] }).__calls ?? [],
  );

describe("the spine sits beside the waiting wing, under the stage when narrow", () => {
  test("wide: the fourth column, right of the waiting wing", async () => {
    const page = await open(1440);
    const R = await page.locator($("wingR")).boundingBox();
    const S = await page.locator($("spine")).boundingBox();
    assert.ok(R && S);
    assert.ok(R.x + R.width <= S.x + 1, "the spine is not right of the waiting wing");
    assert.ok(Math.abs(R.y - S.y) < 4, "the spine does not share the wings' row");
    await page.close();
  });

  test("narrow: under the wings, the full width, and no sideways scroll", async () => {
    const page = await open(1000);
    const R = await page.locator($("wingR")).boundingBox();
    const S = await page.locator($("spine")).boundingBox();
    assert.ok(R && S);
    assert.ok(S.y >= R.y + R.height - 1, "the spine is not under the wings");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1000);
    await page.close();
  });
});

describe("the alerts lead, the buttons follow", () => {
  test("day kickers in order, the newest large with its buttons showing", async () => {
    const page = await open();
    const days = await page.locator($("snDay")).allInnerTexts();
    assert.deepEqual(
      days.map((d) => d.trim().toUpperCase()),
      ["TODAY", "YESTERDAY", "THIS WEEK"],
    );
    const lead = page.locator($("snLead"));
    assert.equal(await lead.count(), 1);
    assert.match(await lead.innerText(), /Deborah Dhuy/);
    assert.ok(await lead.locator($("snActs")).isVisible());
    const rest = page.locator($("snEv")).nth(2);
    assert.equal(await rest.locator($("snActs")).isVisible(), false);
    await rest.hover();
    assert.ok(await rest.locator($("snActs")).isVisible());
    await page.close();
  });

  test("the filter keeps one kind", async () => {
    const page = await open();
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    const text = await page.locator($("spine")).innerText();
    assert.match(text, /Nextep/);
    assert.doesNotMatch(text, /Deborah Dhuy|Allie Menz/);
    await page.close();
  });

  test("every link opens LinkedIn's Sales Navigator or Salesforce, in a new tab", async () => {
    const page = await open();
    const links = await page
      .locator(`${$("spine")} a[target]`)
      .evaluateAll((as) =>
        as.map((a) => [a.getAttribute("href"), a.getAttribute("rel")]),
      );
    assert.ok(links.length > 5);
    for (const [href, rel] of links) {
      assert.match(
        href ?? "",
        /^https:\/\/(www\.linkedin\.com\/sales\/|prismhr\.lightning\.force\.com\/)/,
      );
      assert.match(rel ?? "", /noopener/);
    }
    await page.close();
  });

  test("no orange anywhere in the column: the stage keeps the one move", async () => {
    const page = await open();
    const orange = await page.locator(`${$("spine")} *`).evaluateAll(
      (els, o) =>
        els.filter((el) => {
          const cs = getComputedStyle(el);
          return [cs.color, cs.backgroundColor, cs.borderTopColor].includes(o as string);
        }).length,
      ORANGE,
    );
    assert.equal(orange, 0);
    await page.close();
  });
});

describe("the note pops out, and the column's own controls", () => {
  test("Draft the note opens the pop-out with the note; Escape closes it", async () => {
    const page = await open();
    await page.getByRole("button", { name: "Draft the note" }).first().click();
    const pop = page.getByRole("dialog", { name: /Note to Deborah Dhuy/ });
    assert.ok(await pop.isVisible());
    assert.match(await pop.locator("textarea").inputValue(), /^Hi Deborah/);
    assert.match(await pop.innerText(), /Subject: Congrats on the new role/);
    await page.keyboard.press("Escape");
    assert.equal(await pop.count(), 0);
    await page.close();
  });

  test("Worked it stamps the alert's own move with the channel the pop-out used", async () => {
    const page = await open();
    await page.getByRole("button", { name: "Draft the note" }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Outlook draft" }).click();
    const file = await download;
    assert.match(file.suggestedFilename(), /^Note to Deborah Dhuy\.eml$/);
    await page.getByRole("button", { name: "Worked it" }).click();
    await page.waitForTimeout(100);
    const worked = (await calls(page)).find(([n]) => n === "workedChannel");
    assert.ok(worked, "Worked it filed nothing");
    assert.deepEqual(worked[1].slice(0, 4), [
      "A0000000000000001:new-in-seat",
      "A0000000000000001",
      "EMAIL",
      "Deborah Dhuy",
    ]);
    await page.close();
  });

  test("the Outlook draft is an unsent draft, addressed, with the edited body", async () => {
    const page = await open();
    await page.getByRole("button", { name: "Draft the note" }).first().click();
    await page.locator("textarea").fill("Hi Deborah — edited.");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Outlook draft" }).click();
    const path = await (await download).path();
    const { readFileSync } = await import("node:fs");
    const eml = readFileSync(path!, "utf8");
    assert.match(eml, /^To: Deborah Dhuy <deborah\.dhuy@armhr\.example>\r\n/);
    assert.match(eml, /\r\nSubject: Congrats on the new role\r\n/);
    assert.match(eml, /\r\nX-Unsent: 1\r\n/);
    assert.match(eml, /\r\n\r\nHi Deborah — edited\.$/);
    await page.close();
  });

  test("a LinkedIn note offers no Outlook draft and says so", async () => {
    const page = await open();
    const allie = page.locator($("snEv")).filter({ hasText: "Allie Menz" });
    await allie.hover();
    await allie.getByRole("button", { name: "Draft the note" }).click();
    const pop = page.getByRole("dialog", { name: /Note to Allie Menz/ });
    assert.equal(await pop.getByRole("button", { name: "Outlook draft" }).count(), 0);
    assert.match(
      await pop.innerText(),
      /No email on file for Allie Menz\. Send it on LinkedIn\./,
    );
    assert.equal(await pop.getByRole("link", { name: "Open InMail" }).count(), 1);
    await page.close();
  });

  test("✕ hides one alert at once; a worked alert shows its ↺", async () => {
    const page = await open();
    const nextep = page.locator($("snEv")).filter({ hasText: "Nextep" }).first();
    await nextep.hover();
    await nextep.getByRole("button", { name: /Hide this alert about Nextep/ }).click();
    await page.waitForTimeout(100);
    assert.doesNotMatch(
      await page.locator($("spine")).innerText(),
      /employees are active/i,
    );
    assert.ok((await calls(page)).some(([n, a]) => n === "hideAlert" && a[0] === "a2"));
    const jordan = page.locator($("snEv")).filter({ hasText: "Jordan Ellis" });
    assert.match(await jordan.innerText(), /WORKED/);
    assert.equal(await jordan.getByRole("button", { name: "Draft the note" }).count(), 0);
    await page.close();
  });

  test("the hidden fold opens to what it holds", async () => {
    const page = await open();
    await page.locator($("snFold")).locator("summary").click();
    assert.match(await page.locator($("snFold")).innerText(), /Base\.com · Company post/);
    await page.close();
  });
});

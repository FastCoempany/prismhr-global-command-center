// The email in the HomeRoom row in a real browser (ship order 2026-10-20;
// CLAUDE.md, The email in the row). The F26 face (ship order 2026-11-04)
// moved it behind the row's one door, "Latest email and Chute": opened, the
// newest email shows whole beside the Chute; EARLIER's lines read who, when
// and the subject, one open at a time, each opening in place to what the
// record history holds; the +N door; the line for an email filed before the
// store; and no orange anywhere in the email.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/room-email.tsx";
const $ = (n: string) => cls("room.module.css", n);
const ORANGE = "rgb(230, 112, 30)";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const F = (n: string) => cls("f.module.css", n);
/** Open row `i` and its "Latest email and Chute" door. */
const openPanel = async (page: Page, i: number) => {
  const row = page.locator($("row")).nth(i);
  if ((await row.locator(F("body")).getAttribute("hidden")) !== null)
    await row.locator(F("caret")).click();
  const door = row.locator(F("doorBtn"));
  if ((await door.getAttribute("aria-expanded")) !== "true") await door.click();
  return row;
};
const open = async (viewport?: { width: number; height: number }) => {
  const page = await mount(browser, FIX, { returns: { chuteBook: [] }, viewport });
  await openPanel(page, 0);
  return page;
};
const firstRow = (page: Page) => page.locator($("row")).first();

describe("the latest email: whole beside the Chute, behind the row's one door", () => {
  test("it opens with who, when and the subject, in mono and the work's face, left of the Chute", async () => {
    const page = await open();
    const mail = firstRow(page).locator($("mail"));
    assert.match(await mail.innerText(), /LATEST EMAIL/);
    assert.match(
      await mail.locator($("mailWho")).innerText(),
      /10\/20 · 9:10 AM · DANA REYES → YOU \+3/,
    );
    assert.equal(
      await mail.locator($("mailSubj")).innerText(),
      "Intro to your Global Business Consultant",
    );
    assert.match(
      await mail.locator($("mailWho")).evaluate((el) => getComputedStyle(el).fontFamily),
      /JetBrains Mono/,
    );
    const m = (await mail.boundingBox())!;
    const chute = (await firstRow(page).locator(F("panelR")).boundingBox())!;
    assert.ok(m.x + m.width <= chute.x + 1, "the email sits left of the Chute");
    await page.close();
  });

  test("opened, the email shows whole, with no door to the rest", async () => {
    const page = await open();
    assert.equal(
      await firstRow(page).getByRole("button", { name: "Show the whole email" }).count(),
      0,
    );
    const full = firstRow(page).locator($("mailBody"));
    assert.ok(
      await full.evaluate(
        (el) => el.parentElement!.scrollHeight <= el.parentElement!.clientHeight + 1,
      ),
      "part of the email is held back",
    );
    assert.match(
      await full.innerText(),
      /walk through what comes next\?\s+Thanks,\s+Dana/,
    );
    await page.close();
  });

  test("an email that fits shows whole with no door, and the old one says why it is the synopsis", async () => {
    const page = await open();
    const old = (await openPanel(page, 1)).locator($("mail"));
    assert.equal(
      await old.getByRole("button", { name: "Show the whole email" }).count(),
      0,
    );
    assert.match(
      await old.innerText(),
      /WHAT THE READ KEPT This one was filed before whole emails were kept\.\s*Follows up on the September package\./,
    );
    assert.match(
      await old.locator($("mailWho")).innerText(),
      /^3:00 PM · YOU → /,
      "an email with no day leads with no separator",
    );
    await page.close();
  });

  test("on a phone the column stacks and the email is never capped", async () => {
    const page = await open({ width: 390, height: 900 });
    assert.equal(
      await firstRow(page).getByRole("button", { name: "Show the whole email" }).count(),
      0,
    );
    await page.close();
  });

  test("a long address in the who line wraps inside its column at phone width", async () => {
    const page = await open({ width: 390, height: 900 });
    const who = (await openPanel(page, 1)).locator($("mailWho"));
    const fits = await who.evaluate((el) => {
      const col = el.closest("[class*='panel']")!.getBoundingClientRect();
      return el.getBoundingClientRect().right <= col.right + 1;
    });
    assert.ok(fits, "the address runs out of the column");
    await page.close();
  });

  test("no orange in the email: the one move stays Mark it done", async () => {
    const page = await open();
    const colors = await firstRow(page)
      .locator($("mail"))
      .evaluate((root) =>
        [root, ...root.querySelectorAll("*")].flatMap((el) => {
          const s = getComputedStyle(el);
          return [s.color, s.backgroundColor, s.borderTopColor];
        }),
      );
    assert.ok(!colors.includes(ORANGE), "orange in the email");
    await page.close();
  });
});

describe("EARLIER: who, when and the subject, each opening in place", () => {
  const earlier = async (page: Page) => {
    await firstRow(page)
      .getByRole("button", { name: /EARLIER/ })
      .click();
    return firstRow(page).locator($("ent"));
  };

  test("the lines carry no format code, no frozen Today and no reply prefixes", async () => {
    const page = await open();
    const lines = await earlier(page);
    assert.equal(await lines.count(), 7);
    const text = await lines.allInnerTexts();
    assert.ok(
      !text.some((t) => /\bOL\b|Today|RE:|\[EXTERNAL\]/.test(t)),
      text.join("\n"),
    );
    assert.match(text[0], /10\/20 · 9:10 AM · DANA REYES → YOU \+3/);
    assert.match(text[4], /FILED TWICE/);
    assert.match(text[5], /SIGN-OFF/);
    assert.match(
      text[5],
      /^✉\s*DANA REYES → YOU/,
      "a line with no day leads with no separator",
    );
    await page.close();
  });

  test("one line opens at a time, to the read's synopsis, its Owed line and its answer", async () => {
    const page = await open();
    const lines = await earlier(page);
    const subject = (i: number) => lines.nth(i).locator($("entSubj"));
    await subject(0).click();
    assert.match(
      await lines.nth(0).locator($("kept")).innerText(),
      /WHAT THE READ KEPT\s*They chose the reseller model[\s\S]*YOU OWE Send the reseller agreement\.\s*THEIR LEGAL TEAM OWES Review the agreement\./,
    );
    await subject(3).click();
    assert.equal(
      await firstRow(page).locator($("kept")).count(),
      1,
      "two lines open at once",
    );
    assert.match(
      await lines.nth(3).locator($("kept")).innerText(),
      /CLOSED\s*Answered 10\/16\./,
    );
    await subject(3).click();
    assert.equal(
      await firstRow(page).locator($("kept")).count(),
      0,
      "the line never folds back",
    );
    await subject(5).click();
    assert.match(
      await lines.nth(5).locator($("kept")).innerText(),
      /A SIGN-OFF\s*It doesn't change the latest email\./,
    );
    await subject(2).click();
    assert.match(
      await lines.nth(2).locator($("kept")).innerText(),
      /Marked done from the HomeRoom/,
    );
    await page.close();
  });

  test("their mail draws in the system's blue, our own in the soft ink", async () => {
    const page = await open();
    const lines = await earlier(page);
    const ink = (i: number) =>
      lines
        .nth(i)
        .locator($("entIc"))
        .evaluate((el) => getComputedStyle(el).color);
    assert.equal(await ink(0), "rgb(37, 99, 235)", "an inbound line is not blue");
    assert.equal(await ink(1), "rgba(10, 28, 64, 0.66)", "our send is not the soft ink");
    await page.close();
  });

  test("a line that trails off opens to its whole text", async () => {
    const page = await open();
    const lines = await earlier(page);
    const note = lines.nth(6).locator($("entSubj"));
    const cut = () => note.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    assert.ok(await cut(), "the long note does not trail off at rest");
    await note.click();
    assert.ok(!(await cut()), "the opened note still trails off");
    assert.match(await note.innerText(), /before anyone on their side signs\.$/);
    await page.close();
  });

  test("✕ on the latest email's line takes it out of the column at once", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteBook: [], roomRecordDelete: { ok: true } },
    });
    await openPanel(page, 0);
    const lines = await earlier(page);
    await lines.nth(0).hover();
    await lines.nth(0).getByTitle("delete from the record").click();
    await page.waitForTimeout(100);
    assert.equal(await firstRow(page).locator($("mail")).count(), 0);
    await page.close();
  });

  test("a sign-off line carries no ✎, and the rail shows to the keyboard", async () => {
    const page = await open();
    const lines = await earlier(page);
    await lines.nth(5).hover();
    assert.equal(await lines.nth(5).getByTitle("edit this entry").count(), 0);
    await page.mouse.move(0, 0);
    await lines.nth(1).locator($("entSubj")).focus();
    await page.keyboard.press("Tab");
    // The rail fades in over its transition.
    await page.waitForTimeout(300);
    const focused = await page.evaluate(() => ({
      title: (document.activeElement as HTMLElement).title,
      opacity: getComputedStyle(document.activeElement!.parentElement!).opacity,
    }));
    assert.match(
      focused.title,
      /Make it an action|edit this entry|delete from the record/,
    );
    assert.equal(focused.opacity, "1", "the focused rail button is invisible");
    await page.close();
  });

  test("+N opens everyone else on the email", async () => {
    const page = await open();
    const plus = firstRow(page).locator($("mail")).getByRole("button", { name: "+3" });
    await plus.click();
    assert.equal(
      await firstRow(page).locator($("mail")).locator($("entOthers")).innerText(),
      "Elise Munoz, Sam Ortiz, Matthew Cooper",
    );
    await page.close();
  });
});

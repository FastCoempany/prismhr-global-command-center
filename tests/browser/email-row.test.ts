// The email in the HomeRoom row in a real browser (ship order 2026-10-20;
// CLAUDE.md, The email in the row; docs/mockups/homeroom-email-row-2026-10-20
// .html, Concept A): the newest email whole under the meter, never taller
// than the right panel, one door to the rest; EARLIER's lines read who, when
// and the subject, one open at a time, each opening in place to what the
// record history holds; the +N door; the line for an email filed before the
// store; and no orange anywhere in the email, because the one move is Mark
// it done.

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

const open = () => mount(browser, FIX, { returns: { chuteBook: [] } });
const firstRow = (page: Page) => page.locator($("row")).first();
const bottom = async (page: Page, sel: string) => {
  const b = await firstRow(page).locator(sel).first().boundingBox();
  assert.ok(b, `${sel} has no box`);
  return b.y + b.height;
};

describe("the latest email: whole under the meter, never taller than the right panel", () => {
  test("it arrives under the meter with who, when and the subject, in mono and the work's face", async () => {
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
    const meter = await bottom(page, $("climb"));
    const top = (await mail.boundingBox())!.y;
    assert.ok(top > meter, "the email sits under the meter");
    await page.close();
  });

  test("past the panel's height it fades, and the door opens the rest", async () => {
    const page = await open();
    const door = firstRow(page).getByRole("button", { name: "Show the whole email" });
    assert.equal(await door.count(), 1, "a long email has its door");
    // At rest the panel is short, and the email still shows a few lines.
    const rest = await firstRow(page).locator($("mailCapped")).boundingBox();
    assert.ok(rest && rest.height >= 119, "the email shows fewer than a few lines");
    // Opened, the panel grows, and the email grows to meet it and no further.
    await firstRow(page)
      .getByRole("button", { name: /EARLIER/ })
      .click();
    await page.waitForTimeout(100);
    const capped = await bottom(page, $("mailCapped"));
    const panel = await bottom(page, $("rec"));
    assert.ok(capped <= panel + 2, "the capped email runs past the right panel");
    assert.ok(capped > panel - 60, "the email stops short of the panel it can fill");
    const full = firstRow(page).locator($("mailBody"));
    assert.ok(
      await full.evaluate(
        (el) => el.parentElement!.scrollHeight > el.parentElement!.clientHeight,
      ),
      "nothing is held back",
    );
    await door.click();
    assert.equal(
      await firstRow(page).getByRole("button", { name: "Show less" }).count(),
      1,
    );
    assert.ok(
      await full.evaluate(
        (el) => el.parentElement!.scrollHeight <= el.parentElement!.clientHeight + 1,
      ),
      "the door left part of the email behind",
    );
    assert.match(
      await full.innerText(),
      /walk through what comes next\?\s+Thanks,\s+Dana/,
    );
    await page.close();
  });

  test("an email that fits shows whole with no door, and the old one says why it is the synopsis", async () => {
    const page = await open();
    const old = page.locator($("row")).nth(1).locator($("mail"));
    assert.equal(
      await old.getByRole("button", { name: "Show the whole email" }).count(),
      0,
    );
    assert.match(
      await old.innerText(),
      /WHAT THE READ KEPT\s*This one was filed before whole emails were kept\.\s*Follows up on the September package\./,
    );
    await page.close();
  });

  test("on a phone the column stacks and the email is never capped", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteBook: [] },
      viewport: { width: 390, height: 900 },
    });
    assert.equal(
      await firstRow(page).getByRole("button", { name: "Show the whole email" }).count(),
      0,
    );
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
    assert.equal(await lines.count(), 6);
    const text = await lines.allInnerTexts();
    assert.ok(
      !text.some((t) => /\bOL\b|Today|RE:|\[EXTERNAL\]/.test(t)),
      text.join("\n"),
    );
    assert.match(text[0], /10\/20 · 9:10 AM · DANA REYES → YOU \+3/);
    assert.match(text[4], /FILED TWICE/);
    assert.match(text[5], /SIGN-OFF/);
    await page.close();
  });

  test("one line opens at a time, to the read's synopsis, its Owed line and its answer", async () => {
    const page = await open();
    const lines = await earlier(page);
    const subject = (i: number) => lines.nth(i).locator($("entSubj"));
    await subject(0).click();
    assert.match(
      await lines.nth(0).locator($("kept")).innerText(),
      /WHAT THE READ KEPT\s*They chose the reseller model[\s\S]*YOU OWE\s*Send the reseller agreement\./,
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

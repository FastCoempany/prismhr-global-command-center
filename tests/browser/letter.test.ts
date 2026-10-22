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

// The files Send in Outlook carries (ship order 2026-10-22): the
// fold is shut on arrival and adds no orange; with files ticked, Send
// downloads an unsent Outlook draft carrying each file whole, fetched in
// pieces from the signed-in route, and stamps the move only once the draft
// is in hand; a file that fails to load stamps nothing.
describe("Send in Outlook carries the files ticked", () => {
  const PIECE = 3_000_000;
  const serveFiles = async (page: import("playwright-core").Page, fail = false) => {
    const { readFileSync } = await import("node:fs");
    const { attachmentById } = await import("../../src/lib/collateral/attachments");
    const asked: string[] = [];
    await page.route("**/groundwork/attach/**", (r) => {
      const url = new URL(r.request().url());
      asked.push(`${url.pathname}${url.search}`);
      const id = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const file = attachmentById(id);
      if (!file || fail) return r.fulfill({ status: 500, body: "" });
      const bytes = readFileSync(file.path);
      const part = Number(url.searchParams.get("part") ?? "0");
      return r.fulfill({
        status: 200,
        contentType: "application/octet-stream",
        headers: { "x-attach-parts": String(Math.ceil(bytes.length / PIECE)) },
        body: bytes.subarray(part * PIECE, (part + 1) * PIECE),
      });
    });
    return asked;
  };

  test("the fold is shut on arrival, adds no orange, and counts what is ticked", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const fold = page.locator($("attach"));
    assert.equal(await fold.evaluate((d) => (d as HTMLDetailsElement).open), false);
    assert.match(await fold.locator("summary").innerText(), /^ATTACH FILES ▾$/);
    await fold.locator("summary").click();
    assert.deepEqual(await fold.locator("legend").allInnerTexts(), [
      "DEMOS",
      "ONE-PAGERS",
      "AGREEMENTS",
    ]);
    assert.equal(await fold.locator("input[type=checkbox]").count(), 20);
    assert.match(await fold.innerText(), /Reseller agreement, review copy/);
    assert.match(await fold.innerText(), /Referral agreement, review copy/);
    await fold.getByLabel(/The whole platform/).check();
    await fold.getByLabel(/Employer of record/).check();
    assert.match(await fold.locator("summary").innerText(), /· 2$/);
    assert.match(await fold.innerText(), /About 7\.4 MB in the email\./);
    const oranges = await page.$$eval(
      `${$("stage")} *`,
      (els) =>
        els.filter((e) => {
          const s = getComputedStyle(e);
          return [s.backgroundColor, s.color, s.accentColor].includes(
            "rgb(230, 112, 30)",
          );
        }).length,
    );
    assert.equal(oranges, 1, "Send stays the stage's one orange move");
    await page.close();
  });

  test("Send with files downloads a draft carrying each file whole, then stamps", async () => {
    const page = await mount(browser, FIX, { now: MID });
    const asked = await serveFiles(page);
    const fold = page.locator($("attach"));
    await fold.locator("summary").click();
    await fold.getByLabel(/The whole platform/).check();
    await fold.getByLabel(/Referral agreement/).check();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /^Send in Outlook/ }).click();
    const file = await download;
    assert.match(file.suggestedFilename(), /^Note to Cristina Bell\.eml$/);
    await page.waitForFunction(() =>
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(
        (c) => c[0] === "sendFromStage",
      ),
    );
    assert.deepEqual(asked.sort(), [
      "/groundwork/attach/agreement-referral?part=0",
      "/groundwork/attach/demo-whole?part=0",
      "/groundwork/attach/demo-whole?part=1",
    ]);
    const { readFileSync } = await import("node:fs");
    const { createHash } = await import("node:crypto");
    const eml = readFileSync((await file.path())!, "latin1");
    assert.match(eml, /^To: Cristina Bell <cristina@onstage\.example>\r\n/);
    assert.match(eml, /\r\nX-Unsent: 1\r\n/);
    const boundary = /boundary="([^"]+)"/.exec(eml)![1];
    const parts = eml.split(`--${boundary}`).slice(1, -1);
    assert.equal(parts.length, 3);
    const decoded = (p: string) =>
      Buffer.from(p.split("\r\n\r\n").slice(1).join("").replace(/\s+/g, ""), "base64");
    assert.match(decoded(parts[0]).toString("utf8"), /^Hi Cristina,\r\n/);
    const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    assert.equal(
      sha(decoded(parts[1])),
      sha(readFileSync("collateral/demos/00-platform-demo.mp4")),
    );
    assert.equal(
      sha(decoded(parts[2])),
      sha(readFileSync("collateral/agreements/referral-review-copy.pdf")),
    );
    assert.match(await page.locator($("letterNote")).innerText(), /^Downloaded\./);
    await page.close();
  });

  test("a file that fails to load stamps nothing and says so", async () => {
    const page = await mount(browser, FIX, { now: MID });
    await serveFiles(page, true);
    const fold = page.locator($("attach"));
    await fold.locator("summary").click();
    await fold.getByLabel(/Talent/).check();
    await page.getByRole("button", { name: /^Send in Outlook/ }).click();
    await page.waitForFunction(
      (sel) => /didn't load/.test(document.querySelector(sel)?.textContent ?? ""),
      $("letterNote"),
    );
    assert.equal(
      (await callsOf(page)).some((c) => c[0] === "sendFromStage"),
      false,
    );
    await page.close();
  });

  test("the open fold fits a phone", async () => {
    const page = await mount(browser, FIX, {
      now: MID,
      viewport: { width: 390, height: 900 },
    });
    await page.locator(`${$("attach")} summary`).click();
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(over, false);
    await page.close();
  });
});

// The Chute in a real browser (pass 11). A1.3: files thrown at it are read
// on the spot. A drop is a real DOM drop event carrying real File objects:
// an email is read in the browser and routed at once; a PDF goes to the
// transcriber at once. Nothing waits on a tick or a button.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { callsOf, cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/chute.tsx";
const $ = (n: string) => cls("room.module.css", n);
const EML = [
  "From: Pat Lee <pat@simploy.com>",
  "To: Antaeus Coe <antaeus@prismhr.com>",
  "Subject: Mexico",
  "Date: Tue, 30 Sep 2026 10:00:00 -0500",
  "Content-Type: text/plain",
  "",
  "Can we talk Mexico next week? We have two hires there.",
].join("\r\n");

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

/** Drop files on the Chute the way a hand does: a drop event with a
 *  DataTransfer holding real files. */
async function drop(page: Page, files: { name: string; type: string; body: string }[]) {
  await page.evaluate(
    ({ files, sel }) => {
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(new File([f.body], f.name, { type: f.type }));
      const el = document.querySelector(sel)!;
      el.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    },
    { files, sel: $("chute") },
  );
}

describe("A1.3 · files thrown at the Chute are read on the spot", () => {
  test("a dropped email is read in the browser and routed at once, with its words", async () => {
    const page = await mount(browser, FIX, {
      returns: { routeText: { best: null, candidates: [], book: [] }, chuteBook: [] },
    });
    const t0 = Date.now();
    await drop(page, [{ name: "mexico.eml", type: "message/rfc822", body: EML }]);
    await page.waitForFunction(() =>
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(([n]) => n === "routeText"),
    );
    assert.ok(Date.now() - t0 < 3000, "the read waited");
    const route = (await callsOf(page)).find(([n]) => n === "routeText");
    assert.ok(route);
    assert.match(String(route[1][0]), /Can we talk Mexico next week\?/);
    // No server read of the email itself: the browser read it.
    assert.ok(!(await callsOf(page)).some(([n]) => n === "chuteReadPdf"));
    await page.close();
  });

  test("a dropped PDF goes to the transcriber at once, once", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteReadPdf: { ok: false, reason: "The reader is down." }, chuteBook: [] },
    });
    await drop(page, [{ name: "deck.pdf", type: "application/pdf", body: "%PDF-1.4 a deck" }]);
    await page.waitForFunction(() =>
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(([n]) => n === "chuteReadPdf"),
    );
    await page.waitForTimeout(200);
    assert.equal((await callsOf(page)).filter(([n]) => n === "chuteReadPdf").length, 1);
    await page.close();
  });
});

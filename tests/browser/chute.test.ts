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
      el.dispatchEvent(
        new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
      el.dispatchEvent(
        new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
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
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(
        ([n]) => n === "routeText",
      ),
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
      returns: {
        chuteReadPdf: { ok: false, reason: "The reader is down." },
        chuteBook: [],
      },
    });
    await drop(page, [
      { name: "deck.pdf", type: "application/pdf", body: "%PDF-1.4 a deck" },
    ]);
    await page.waitForFunction(() =>
      ((window as unknown as { __calls: [string][] }).__calls ?? []).some(
        ([n]) => n === "chuteReadPdf",
      ),
    );
    await page.waitForTimeout(200);
    assert.equal((await callsOf(page)).filter(([n]) => n === "chuteReadPdf").length, 1);
    await page.close();
  });
});

// ── D12 · the fold shows every waiting row plus the two newest settled, and
// receipts clear per row and all at once (pass 17) ──────────────────────────
describe("D12 · the fold shows every waiting row and the two newest settled; receipts clear per row and all at once", () => {
  const REGIS = { id: "001F000000w38OHIAY", name: "Regis HR Group" };
  const NOW = "2026-10-06T15:00:00Z";
  /** A ledger saved on the same Chicago day: two picks waiting and four
   *  settled filings, newest first. */
  const ledger = async () => {
    const { saveLedger } = await import("../../src/app/room/chute-ledger");
    const m = new Map<string, string>();
    const filed = (key: number, name: string) => ({
      key,
      filename: name,
      state: "filed" as const,
      account: REGIS,
      // The count doubles as the row's name: a settled line never shows its
      // filename (D12), so the count tells the rows apart.
      filed: key,
      day: "10/6",
      rung: "email",
    });
    const pick = (key: number, name: string) => ({
      key,
      filename: name,
      state: "pick" as const,
      text: `CALL TRANSCRIPT\nA: ${name}`,
      say: "No sure match. Pick the account.",
      candidates: [{ id: REGIS.id, name: REGIS.name, rung: "domain" }],
    });
    saveLedger(
      [
        pick(6, "f.vtt"),
        pick(5, "e.vtt"),
        filed(4, "d.eml"),
        filed(3, "c.eml"),
        filed(2, "b.eml"),
        filed(1, "a.eml"),
      ],
      { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) },
      new Date(NOW),
    );
    return Object.fromEntries(m);
  };
  // A waiting pick is the held box; a settled filing is a receipt line. Both
  // are items of the one list.
  const items = (page: Page) => page.locator(`${$("chuteList")} > li`);

  test("on arrival the two waiting picks and the two newest settled show, with the rest behind the meter", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteBook: [] },
      storage: await ledger(),
      now: NOW,
    });
    const rows = items(page);
    assert.equal(await rows.count(), 4);
    assert.equal(await page.locator($("rcptRow")).count(), 2, "two settled receipts");
    const text = (await rows.allTextContents()).join(" | ");
    for (const name of ["f.vtt", "e.vtt", "4 filed", "3 filed"])
      assert.ok(text.includes(name), `${name} missing: ${text}`);
    for (const name of ["2 filed", "1 filed"])
      assert.ok(!text.includes(name), `${name} shown on arrival`);
    await page.getByTitle("Show all 6").click();
    assert.equal(await rows.count(), 6);
    await page.close();
  });

  test("✕ clears one settled receipt; Clear all clears every settled one and leaves the waiting rows", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteBook: [] },
      storage: await ledger(),
      now: NOW,
    });
    await page.getByTitle("Show all 6").click();
    const rows = items(page);
    assert.equal(await rows.count(), 6);
    await rows.filter({ hasText: "4 filed" }).getByTitle("Clear this receipt").click();
    assert.equal(await rows.count(), 5);
    assert.ok(!(await rows.allTextContents()).join(" ").includes("4 filed"));
    await page.getByRole("button", { name: "Clear all" }).click();
    assert.equal(await rows.count(), 2);
    const left = (await rows.allTextContents()).join(" ");
    assert.ok(left.includes("f.vtt") && left.includes("e.vtt"), left);
    await page.close();
  });
});

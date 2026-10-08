// The click-depth law in a real browser (pass 11): "every shortened thing on
// every surface is a door to its evidence, exactly one click deep", "nothing
// compressed is ever a dead end", "nothing deep ever surfaces uninvited".
// The sweep mounts every face the suite can mount, reads every number a
// person can see on arrival, and holds each to the law: it is a door (a
// link, a button, a summary), or it is one of the named exemptions below,
// each with its reason. A count no rule covers fails the build. What the
// sweep cannot read is a compression with no digit in it (an abbreviation),
// and the faces it cannot mount.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { mount, openBrowser, type MountOptions } from "../helpers/browser";

const FACES: [string, string, MountOptions][] = [
  ["the HomeRoom", "tests/browser/fixtures/room.tsx", { returns: { chuteBook: [] } }],
  ["Groundwork", "tests/browser/fixtures/groundwork.tsx", { now: "2026-07-30T15:00:00Z" }],
  ["Groundwork's chips", "tests/browser/fixtures/evidence.tsx", { now: "2026-07-30T15:00:00Z" }],
  ["the Accounts sheet", "tests/browser/fixtures/accounts.tsx", {}],
  ["the Sendbook", "tests/browser/fixtures/sendbook.tsx", {}],
  ["the Intranet", "tests/browser/fixtures/intranet.tsx", {}],
  ["the Chute", "tests/browser/fixtures/chute.tsx", { returns: { chuteBook: [] } }],
  ["the roundup prep", "tests/browser/fixtures/prep.tsx", {}],
];

/** A number that names a moment in full (a clock, a day), not a count. */
const MOMENT =
  /\b\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?\b|\b\d{1,2}:\d{2}–\d{1,2}:\d{2}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.? \d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b/g;

/** The named exemptions: a selector the number sits in, and why it is no
 *  dead end. */
const EXEMPT: [RegExp, string][] = [
  // The Sendbook's week head counts the register's own lines, in view
  // beneath it, and its channel chips open each channel's lines.
  [/sendbook__(whBig|whMix)/, "counts the lines in view beneath it"],
  // A run's ordinal, not a count: the run's earlier touches are the lines
  // beneath it.
  [/sendbook__step/, "the run's ordinal"],
];

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

describe("A5.1 to A5.4 · every count on every mounted face is a door, and no fold opens uninvited", () => {
  for (const [name, fixture, opts] of FACES)
    test(`${name}: every number a person sees on arrival opens, or names a moment, or shares its line with its door`, async () => {
      const page = await mount(browser, fixture, opts);
      const seen = await page.evaluate((moment) => {
        const DOOR = "a,button,summary,label,input,select,textarea,[role=button]";
        const re = new RegExp(moment, "g");
        const out: { cls: string; text: string; door: boolean; lineDoor: boolean; openFold: boolean }[] = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walk.nextNode())) {
          const raw = n.textContent ?? "";
          const text = raw.replace(re, "");
          if (!/\d/.test(text)) continue;
          const el = n.parentElement!;
          if (el.closest("script,style")) continue;
          // What a person can see: a closed fold's contents keep a box but
          // are not rendered.
          if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
          out.push({
            cls: el.className + " " + (el.parentElement?.className ?? ""),
            text: raw.trim().slice(0, 80),
            door: !!el.closest(DOOR),
            // The count's own line carries the door that opens it.
            lineDoor: !![el, el.parentElement].some((x) => x?.querySelector(":scope > button, :scope > a")),
            openFold: !!el.closest("details[open]"),
          });
        }
        return out;
      }, MOMENT.source);
      const dead = seen.filter(
        (s) => !s.door && !s.lineDoor && !s.openFold && !EXEMPT.some(([re]) => re.test(s.cls)),
      );
      assert.deepEqual(dead, [], `${name} has a count that opens nothing`);
      // Nothing deep surfaces uninvited: no fold is open on arrival.
      assert.equal(await page.locator("details[open]").count(), 0, `${name} opened a fold on arrival`);
      await page.close();
    });
});

describe("the doors pass 11 opened each reach their evidence in one click", () => {
  test("the sheet's fit score opens the drilldown with the fit's breakdown", async () => {
    const page = await mount(browser, "tests/browser/fixtures/accounts.tsx");
    await page.getByTitle("Open the fit's breakdown.").first().click();
    await page.waitForSelector("text=On PrismHR");
    await page.close();
  });

  test("a stamp's channel line opens to the name whole and the touch's words", async () => {
    const page = await mount(browser, "tests/browser/fixtures/groundwork.tsx", { now: "2026-07-30T15:00:00Z" });
    assert.equal(await page.getByText("To Pat Eriksen.").isVisible(), false);
    await page.getByText("EMAIL · STEP 1 · PAT E.").click();
    assert.equal(await page.getByText("To Pat Eriksen.").isVisible(), true);
    await page.close();
  });

  test("the Intranet receipt's message count opens the messages the capture became", async () => {
    const page = await mount(browser, "tests/browser/fixtures/intranet.tsx", {
      returns: {
        intranetReceiptDocs: [
          { text: "Simploy renewal", meta: "Pat Lee, Lesha Cyphers · 2026-10-07" },
          { text: "Census timing", meta: "Pat Lee · 2026-10-07" },
        ],
      },
    });
    await page.getByRole("button", { name: "4 messages" }).click();
    await page.waitForSelector("text=Census timing");
    assert.ok(
      (await page.evaluate(() => (window as unknown as { __calls: [string, unknown[]][] }).__calls)).some(
        ([n, a]) => n === "intranetReceiptDocs" && a[0] === "cap1",
      ),
    );
    await page.close();
  });
});

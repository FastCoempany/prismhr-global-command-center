// The HomeRoom in a real browser (pass 11; the F26 face, ship order
// 2026-11-04): what a server render left to the stylesheet and the click.
// Each deal rests as one sentence on one line, its facts open to their source
// and the hand can set them; the account's tools ride on hover at its name;
// the move row carries Mark it done and the Chute at one size; THEIRS rides
// the move's door down to the email (A4.20, A4.27); the people deck shows
// MULTI in the ladder's colors (A11.3); the edge tabs stay thin and quiet
// (A11.4); the Drop's held file comes back after a reload (A12.7); and low
// signal, closed won and the closed ledger keep their mechanics.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser, Page } from "playwright-core";
import { callsOf, cls, mount, openBrowser } from "../helpers/browser";

const FIX = "tests/browser/fixtures/room.tsx";
const $ = (n: string) => cls("room.module.css", n);
const NAVY = "rgb(10, 28, 64)";
const BLUE = "rgb(37, 99, 235)";
const RED = "rgb(239, 68, 68)";
const AMBER = "rgb(245, 158, 11)";
const GREEN = "rgb(34, 197, 94)";
const QUIET = "rgba(10, 28, 64, 0.22)";
const ROW_A = "001F000000w38BOIAY";

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

const css = (page: Page, sel: string, prop: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const box = async (page: Page, sel: string) => {
  const b = await page.locator(sel).first().boundingBox();
  assert.ok(b, `${sel} has no box`);
  return b;
};

// ── The F26 face (ship order 2026-11-04) ───────────────────────────────────
// Every row rests as its sentence on one line; opened, it paints the next
// move with Mark it done and the Chute, the people in the deal as a deck, and
// one door, "Latest email and Chute". The sentence's parts are controls, and
// the account's tools ride on hover at its name.
const F = (n: string) => cls("f.module.css", n);
const rowBy = (page: Page, name: string) =>
  page
    .locator("a", { hasText: new RegExp(`^${name}$`) })
    .first()
    .locator("xpath=ancestor::*[contains(@class,'room__row')][1]");
const openRow = async (page: Page, name: string) => {
  const row = rowBy(page, name);
  if ((await row.locator(F("body")).getAttribute("hidden")) !== null)
    await row.locator(F("caret")).click();
  return row;
};
const openPanel = async (page: Page, name: string) => {
  const row = await openRow(page, name);
  const door = row.locator(F("doorBtn"));
  if ((await door.getAttribute("aria-expanded")) !== "true") await door.click();
  return row;
};

describe("F26 · each deal rests as one sentence on one line; the first row stands open", () => {
  test("the sentences fit their line, the first row is open and the rest rest folded", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const lines = page.locator(F("fsent"));
    assert.equal(await lines.count(), 3);
    for (const fit of await lines.evaluateAll((els) =>
      els.map((e) => e.scrollWidth <= e.clientWidth + 1),
    ))
      assert.ok(fit, "a sentence runs past its line");
    const hidden = await page
      .locator(F("body"))
      .evaluateAll((els) => els.map((e) => e.hasAttribute("hidden")));
    assert.deepEqual(hidden, [false, true, true]);
    const open = await rowBy(page, "Simploy").innerText();
    assert.match(open, /Next move/i);
    assert.match(open, /People in the deal/);
    assert.match(open, /Latest email and Chute/i);
    await page.close();
  });

  test("a click on a folded sentence opens its row, and the fold is remembered", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    await rowBy(page, "Regis HR Group").locator(F("caret")).click();
    assert.equal(
      await rowBy(page, "Regis HR Group").locator(F("body")).getAttribute("hidden"),
      null,
    );
    const kept = await page.evaluate(() => localStorage.getItem("room:open"));
    assert.ok(kept && JSON.parse(kept).includes("card-regis"), kept ?? "nothing kept");
    await page.close();
  });
});

describe("F26 · the sentence's facts open to their source, and the hand can set them", () => {
  test("every fact carries the record line it came from", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const row = rowBy(page, "Simploy");
    assert.match(
      (await row.locator(F("prodTok")).first().getAttribute("title")) ?? "",
      /From the record · 9\/25: ✉ Chassie asked for the invoices\./,
    );
    assert.match(
      (await row.locator(F("dateTok")).first().getAttribute("title")) ?? "",
      /They start by December 1\./,
    );
    await page.close();
  });

  test("reseller or referral opens a menu, and a pick files the hand's fact", async () => {
    const page = await mount(browser, FIX, {
      now: "2026-11-04T16:00:00Z",
      returns: { setRowFact: { ok: true } },
    });
    const row = rowBy(page, "Simploy");
    await row.locator(F("chairTok")).first().click();
    await row.getByRole("menuitemradio", { name: "Refer it" }).click();
    await page.waitForTimeout(50);
    const call = (await callsOf(page)).find(([n]) => n === "setRowFact");
    assert.deepEqual(call?.[1], [ROW_A, { field: "chair", value: "referral" }]);
    await page.close();
  });

  test("a click on a country offers to remove it and lists the rest to add, in one dropdown", async () => {
    const page = await mount(browser, FIX, {
      now: "2026-11-04T16:00:00Z",
      returns: { setRowFact: { ok: true } },
    });
    const row = rowBy(page, "Simploy");
    await row.locator(F("ctryTok")).first().click();
    const menu = row.locator(F("cMenu"));
    assert.match(await menu.innerText(), /✕ Remove Colombia/);
    assert.match(await menu.innerText(), /Add a country/i);
    await menu.getByRole("menuitem", { name: "Mexico" }).click();
    await page.waitForTimeout(50);
    const call = (await callsOf(page)).find(([n]) => n === "setRowFact");
    assert.deepEqual(call?.[1], [ROW_A, { field: "add", code: "mx" }]);
    await page.close();
  });

  test("an unnamed client opens a box to name it by hand", async () => {
    const page = await mount(browser, FIX, {
      now: "2026-11-04T16:00:00Z",
      returns: { setRowFact: { ok: true } },
    });
    const row = rowBy(page, "Simploy");
    await row.getByRole("button", { name: /a client not named yet/ }).click();
    const box = row.locator('input[aria-label="The client\'s name"]');
    await box.fill("Everest Transportation and Packaging");
    await box.press("Enter");
    await page.waitForTimeout(50);
    const call = (await callsOf(page)).find(([n]) => n === "setRowFact");
    assert.deepEqual(call?.[1], [
      ROW_A,
      { field: "client", value: "Everest Transportation and Packaging" },
    ]);
    await page.close();
  });
});

describe("F26 · research, low signal and closed won ride on hover at the name", () => {
  test("the bar rests hidden and shows under the hand at the account's name", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const row = rowBy(page, "Simploy");
    const tools = row.locator(F("nmTools"));
    assert.equal(await tools.evaluate((el) => getComputedStyle(el).display), "none");
    await row.locator(F("nmLink")).hover();
    await page.waitForTimeout(50);
    assert.equal(await tools.evaluate((el) => getComputedStyle(el).display), "flex");
    assert.match(
      await tools.innerText(),
      /⟳ Research[\s\S]*⇣ Low signal[\s\S]*☑ Closed won/,
    );
    // The bar never covers the name it hangs from.
    const n = await row.locator(F("nmLink")).boundingBox();
    const t = await tools.boundingBox();
    assert.ok(n && t && t.y + t.height <= n.y + 1, "the bar covers the name");
    await page.close();
  });
});

describe("F26 · the move row: Mark it done, a rule, then the Chute, one size, in the brand's green", () => {
  test("the buttons share one height and width, and Mark it done is green", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const row = rowBy(page, "Simploy");
    const done = row.locator(F("done"));
    const chute = row.locator(F("chuteb"));
    const a = await done.boundingBox();
    const b = await chute.boundingBox();
    assert.ok(
      a && b && Math.abs(a.height - b.height) < 1 && Math.abs(a.width - b.width) < 1,
    );
    assert.equal(
      await done.evaluate((el) => getComputedStyle(el).backgroundColor),
      GREEN,
    );
    assert.equal(await row.locator(F("vr")).count(), 1);
    await page.close();
  });

  test("the Chute button opens the panel with the bolt's pane", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const row = rowBy(page, "Simploy");
    await row.locator(F("chuteb")).click();
    assert.equal(await row.locator(F("doorBtn")).getAttribute("aria-expanded"), "true");
    assert.equal(await row.locator($("pastepane")).count(), 1);
    await page.close();
  });
});

describe("F26 · THEIRS rides the move's door, down to the email (A4.20, A4.27)", () => {
  test("the move opens to the export's gem, and the cite opens the email it stands on", async () => {
    const page = await mount(browser, FIX, {
      now: "2026-11-04T16:00:00Z",
      routes: {
        "/activity/evidence": (u: URL) =>
          u.searchParams.get("k") === "r1"
            ? {
                ok: true,
                row: {
                  excerpt: "Can we talk Mexico next week? We have two hires there.",
                },
              }
            : { ok: false },
      },
    });
    const row = rowBy(page, "Simploy");
    assert.equal(
      await row.locator($("theirs")).count(),
      0,
      "THEIRS paints before the door",
    );
    await row.locator(F("mvt")).first().click();
    const th = row.locator($("theirs"));
    assert.equal(await css(page, `${F("theirsUnder")} ${$("theirs")}`, "color"), BLUE);
    await th.locator("button").first().click();
    await row.locator($("theirsCite")).first().click();
    await page.waitForSelector(
      "text=Can we talk Mexico next week? We have two hires there.",
    );
    await page.close();
  });
});

describe("F26 · the people deck: one up front, the rest fanned behind, a contact card beside it", () => {
  test("MULTI wears the ladder, and the card shows the person's title and contacts", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const badges = page.locator(F("multi"));
    assert.equal(await badges.count(), 3);
    assert.deepEqual(
      await badges.evaluateAll((els) =>
        els.map((e) => getComputedStyle(e).backgroundColor),
      ),
      [RED, AMBER, GREEN],
    );
    const card = rowBy(page, "Simploy").locator(F("dright"));
    // The quiet line opens every exchange, one click deep.
    await card.locator(F("quietDoor")).click();
    const text = await card.innerText();
    assert.match(text, /Chassie Smith/);
    assert.match(text, /VP Operations/);
    assert.match(text, /chassie@example\.com/);
    assert.match(text, /Email from them · 9\/25/);
    // No LinkedIn on file: the mark is struck in red.
    assert.equal(await card.locator(F("liNone")).count(), 1);
    assert.equal(
      await card.evaluate((el) => getComputedStyle(el).borderLeftStyle),
      "solid",
      "a line divides the deck from the card",
    );
    await page.close();
  });
});

describe("F26 · Latest email and Chute: one door that stays where it is", () => {
  test("the door opens the email and the Chute, and reads Minimize in the same place", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const row = rowBy(page, "Simploy");
    const door = row.locator(F("doorBtn"));
    // Where it sits on the page, not in the viewport: a click scrolls.
    const top = () =>
      door.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const at = await top();
    assert.match(await door.innerText(), /Latest email and Chute/i);
    await door.click();
    assert.match(await door.innerText(), /Minimize/i);
    assert.ok(Math.abs((await top()) - at) < 1, "the door moved");
    assert.match(await row.locator(F("panelR")).innerText(), /The Chute/);
    assert.equal(
      await row
        .locator(F("panelR"))
        .evaluate((el) => getComputedStyle(el).borderLeftStyle),
      "solid",
      "a line divides the email from the Chute",
    );
    await page.close();
  });
});

describe("F26 release two · the partner and client ladders, each stage with its source", () => {
  test("the partner names the account with the agreement meter; stages wear their phase's color", async () => {
    const page = await mount(browser, FIX, { now: "2026-11-04T16:00:00Z" });
    const band = rowBy(page, "Simploy").locator(F("lband"));
    const text = await band.innerText();
    assert.match(text, /PARTNER\s+Simploy/i);
    assert.match(text, /Not sent yet/);
    assert.match(text, /Engaged · warm/);
    assert.match(text, /Scoped/);
    const stage = band.locator(F("lstg")).first();
    assert.equal(await stage.evaluate((el) => getComputedStyle(el).color), BLUE);
    assert.match((await stage.getAttribute("title")) ?? "", /From the record · 9\/25/);
    assert.equal(
      await band
        .locator(F("lad"))
        .nth(1)
        .evaluate((el) => getComputedStyle(el).borderLeftStyle),
      "solid",
    );
    await page.close();
  });

  test("a click on a step sets the stage by hand; live on the partner ladder is never set", async () => {
    const page = await mount(browser, FIX, {
      now: "2026-11-04T16:00:00Z",
      returns: { setRowFact: { ok: true } },
    });
    const band = rowBy(page, "Simploy").locator(F("lband"));
    await band.getByRole("button", { name: "Signed" }).click();
    await page.waitForTimeout(50);
    const call = (await callsOf(page)).find(([n]) => n === "setRowFact");
    assert.deepEqual(call?.[1], [ROW_A, { field: "partner", value: "signed" }]);
    assert.equal(
      await band.getByRole("button", { name: "Live" }).first().isDisabled(),
      true,
    );
    await page.close();
  });
});

describe("A11.4 · the edge tabs are thin and inconspicuous: quiet ink at rest, color on hover only", () => {
  test("Roundups · Check-ins rests thin in quiet ink and lifts to ink only on hover", async () => {
    const page = await mount(browser, FIX);
    const tab = page.locator($("edge"), { hasText: /ROUNDUPS/ });
    const b = await tab.boundingBox();
    assert.ok(b && b.width <= 32, `the tab is ${b?.width}px wide`);
    assert.equal(await tab.evaluate((el) => getComputedStyle(el).color), QUIET);
    const count = tab.locator($("edgeCount"));
    const restBg = await count.evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.doesNotMatch(
      restBg,
      /245, 158, 11|239, 68, 68|34, 197, 94|37, 99, 235|230, 112, 30/,
    );
    // Every edge tab rests in quiet ink.
    for (const c of await page
      .locator($("edge"))
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).color)))
      assert.equal(c, QUIET);
    await tab.hover();
    await page.waitForTimeout(50);
    assert.equal(await tab.evaluate((el) => getComputedStyle(el).color), NAVY);
    assert.equal(
      await count.evaluate((el) => getComputedStyle(el).backgroundColor),
      AMBER,
    );
    await page.close();
  });
});

describe("A12.7 · the Drop's held file comes back after a reload, saying since when", () => {
  test("a held question kept on 10/7 returns on 10/8 in the held box with Held since 10/7.", async () => {
    const shelf = {
      [ROW_A]: {
        day: "2026-10-07",
        items: [
          {
            claim: "Regis HR Group",
            bound: "Simploy",
            reason: "The read names Regis HR Group.",
            text: "OUTLOOK THREAD — renewal.eml\nthe board meets",
            filename: "renewal.eml",
          },
        ],
      },
    };
    const page = await mount(browser, FIX, {
      now: "2026-10-08T18:00:00Z",
      storage: { "prismhr.drop-held.v1": JSON.stringify(shelf) },
    });
    await openPanel(page, "Simploy");
    await page.waitForSelector("text=Held since 10/7.");
    const held = await page
      .locator("text=Held since 10/7.")
      .first()
      .evaluate((el, sel) => el.closest(sel)?.textContent ?? "", $("held"));
    assert.match(held, /renewal\.eml/);
    // The line is kept again under today's day, with its first day.
    const kept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("prismhr.drop-held.v1") ?? "{}"),
    );
    assert.equal(kept[ROW_A].items[0].heldSince, "10/7");
    await page.close();
  });
});

describe("A1.1 · the HomeRoom carries ONE intake at the top: the Chute", () => {
  test("the Chute is the frame's first child, above every row; each row's Drop is its own, and no other intake exists", async () => {
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    const first = await page
      .locator(`main${$("room")}`)
      .evaluate((m) => m.firstElementChild?.className ?? "");
    assert.match(first, /room__chute\b/);
    assert.equal(await page.locator($("chute")).count(), 1);
    const chute = await box(page, $("chute"));
    const rows = await page
      .locator(F("fsent"))
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().y));
    assert.ok(
      rows.every((y) => y > chute.y + chute.height - 1),
      "a row sits above the Chute",
    );
    // Every file input on the page is the Chute's or a row's Drop: one each.
    const inputs = await page.locator("input[type=file]").count();
    assert.equal(inputs, 1 + 3, `${inputs} file inputs for one Chute and three Drops`);
    // The page renders this frame.
    const src = (await import("node:fs")).readFileSync("src/app/room/page.tsx", "utf8");
    assert.match(src, /<RoomFace\b/);
    assert.ok(!/<Chute\b/.test(src), "the page mounts a Chute of its own");
    await page.close();
  });
});

// ── D14 · a typed note is a paste (pass 17) ─────────────────────────────────
// "A rich note typed in the Drop's ▢ composer, one that takes the full read,
// files under the TYPED NOTE head with the typed source, and its chip says
// 'Reads as a typed note.' before Enter; a jot stays an instant note, and a
// thread pasted there keeps its own dialect. The ⚡ pane stamps nothing."
describe("D14 · a typed note is a paste: the chip says so before Enter, a jot stays a note, a thread keeps its dialect, the ⚡ pane stamps nothing", () => {
  const RICH =
    "Met Chassie about Mexico.\nThey want two hires by March.\nSend the model Friday.";
  const THREAD =
    "From: Chassie Smith\nSent: Monday, October 6, 2026 9:00 AM\nTo: Antaeus Coe\nSubject: Mexico\n\nCan we start someone next month?";
  const pasted = (calls: [string, unknown[]][]) =>
    calls
      .filter(([n]) => n === "roomPaste")
      .map(
        ([, args]) =>
          args.find((a) => typeof a === "string" && a.includes("\n")) as string,
      );

  test("a jot files as an instant note through roomCompose, with no chip", async () => {
    const page = await mount(browser, FIX, {
      returns: { chuteBook: [], roomCompose: { ok: true, kind: "note", todoId: "t1" } },
    });
    await openPanel(page, "Simploy");
    await page.getByTitle("Note. A line for the record on Simploy.").first().click();
    const ta = page.locator('textarea[aria-label="Log to Simploy"]');
    await ta.fill("Call Chassie tomorrow.");
    assert.equal(await page.locator($("sniff")).count(), 0, "a jot shows no chip");
    await ta.press("Enter");
    await page.waitForTimeout(50);
    const calls = await callsOf(page);
    assert.ok(
      calls.some(([n]) => n === "roomCompose"),
      "the jot went to roomCompose",
    );
    assert.ok(!calls.some(([n]) => n === "roomPaste"), "a jot is not a paste");
    await page.close();
  });

  test("a rich note says it reads as a typed note, and files under the TYPED NOTE head", async () => {
    const { TYPED_NOTE_HEAD } = await import("../../src/lib/paste-files");
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    await openPanel(page, "Simploy");
    await page.getByTitle("Note. A line for the record on Simploy.").first().click();
    const ta = page.locator('textarea[aria-label="Log to Simploy"]');
    await ta.fill(RICH);
    assert.equal(
      await page.locator($("sniff")).first().textContent(),
      "Reads as a typed note. Enter runs the full read.",
    );
    await ta.press("Enter");
    await page.waitForTimeout(50);
    const texts = pasted(await callsOf(page));
    assert.equal(texts.length, 1, "one paste");
    assert.ok(texts[0].startsWith(`${TYPED_NOTE_HEAD}\n`), texts[0].slice(0, 60));
    assert.ok(texts[0].endsWith(RICH));
    await page.close();
  });

  test("a thread pasted into the composer keeps its own dialect: no typed head", async () => {
    const { TYPED_NOTE_HEAD } = await import("../../src/lib/paste-files");
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    await openPanel(page, "Simploy");
    await page.getByTitle("Note. A line for the record on Simploy.").first().click();
    const ta = page.locator('textarea[aria-label="Log to Simploy"]');
    await ta.fill(THREAD);
    const chip = await page.locator($("sniff")).first().textContent();
    assert.ok(chip && !chip.includes("a typed note"), chip ?? "no chip");
    await ta.press("Enter");
    await page.waitForTimeout(50);
    const texts = pasted(await callsOf(page));
    assert.equal(texts.length, 1);
    assert.ok(!texts[0].includes(TYPED_NOTE_HEAD), "the thread took a typed head");
    assert.equal(texts[0], THREAD);
    await page.close();
  });

  test("the ⚡ pane stamps nothing: the same rich text files without the typed head", async () => {
    const { TYPED_NOTE_HEAD } = await import("../../src/lib/paste-files");
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    await openPanel(page, "Simploy");
    await page
      .getByTitle("The bolt. Paste anything. It reads and files to Simploy.")
      .first()
      .click();
    await page.locator(`${$("pastepane")} textarea`).fill(RICH);
    await page.getByRole("button", { name: "✨ Read & file" }).click();
    await page.waitForTimeout(50);
    const texts = pasted(await callsOf(page));
    assert.equal(texts.length, 1);
    assert.ok(!texts[0].includes(TYPED_NOTE_HEAD), "the ⚡ pane stamped the paste");
    assert.equal(texts[0], RICH);
    await page.close();
  });
});

// Decreed 2026-10-13: TODAY always shows what happened today. A row's TODAY
// is rebuilt from the record's filings of today, so a receipt and its ↺ are
// there after a reload, and a receipt cleared today stays cleared.
describe("TODAY shows today's filings from the record, with their ↺, after a reload", () => {
  const TODAY_FIX = "tests/browser/fixtures/room-today.tsx";
  const NOW = "2026-10-13T16:00:00.000Z";
  // TODAY retired with the F26 face (ship order 2026-11-04); a row with
  // today's filings opens "Latest email and Chute" on arrival, where the
  // receipts land, so they are in view without a click.
  const openToday = async (page: Page) => {
    await page.waitForSelector(`${cls("f.module.css", "panel")}:not([hidden])`);
  };

  test("the filing's receipt is in TODAY on arrival, says the reader was down, and its ↺ takes it back", async () => {
    const page = await mount(browser, TODAY_FIX, {
      now: NOW,
      returns: { roomPasteUndo: { ok: true, removed: 33, retired: 0 } },
    });
    await openToday(page);
    const item = page.locator($("rcptItem")).first();
    assert.match(await item.innerText(), /Simploy · 33 filed · 10\/13/);
    assert.match(await item.innerText(), /The reader was down\. Only the text filed\./);
    await item.hover();
    const back = item.getByTitle("Take back everything this filing wrote");
    assert.equal((await back.innerText()).trim(), "↺");
    await back.click();
    await page.waitForFunction(() =>
      document.body.innerText.includes("Taken back from Simploy. 33 removed."),
    );
    const undo = (await callsOf(page)).find(([n]) => n === "roomPasteUndo");
    assert.ok(undo, "the take-back never reached the server");
    assert.deepEqual(undo[1], [ROW_A, [], [], "f-today-1"]);
    await page.close();
  });

  test("a receipt cleared today stays cleared on the next load", async () => {
    const page = await mount(browser, TODAY_FIX, { now: NOW });
    await openToday(page);
    const item = page.locator($("rcptItem")).first();
    await item.hover();
    await item.getByTitle("Clear this receipt").click();
    assert.equal(await page.locator($("rcptItem")).count(), 0);
    const kept = await page.evaluate(() => localStorage.getItem("room-cleared-v1"));
    assert.ok(kept, "the clear was not remembered");
    assert.deepEqual(JSON.parse(kept), { day: "2026-10-13", ids: ["f-today-1"] });
    await page.close();

    const again = await mount(browser, TODAY_FIX, {
      now: NOW,
      storage: { "room-cleared-v1": kept },
    });
    await openToday(again);
    await again.waitForTimeout(50);
    assert.equal(
      await again.locator($("rcptItem")).count(),
      0,
      "the cleared receipt came back",
    );
    await again.close();

    // Another day's clear is forgotten: the receipt shows.
    const tomorrow = await mount(browser, TODAY_FIX, {
      now: NOW,
      storage: {
        "room-cleared-v1": JSON.stringify({ day: "2026-10-12", ids: ["f-today-1"] }),
      },
    });
    await openToday(tomorrow);
    await tomorrow.waitForTimeout(50);
    assert.equal(await tomorrow.locator($("rcptItem")).count(), 1);
    await tomorrow.close();
  });
});

// Low signal (founder's order, 2026-10-16): the deals that aren't in the
// Salesforce pipeline sit in their own section above the closed ledger, a
// row's ⇣ sends it there and ↺ brings it back, and the closed ledger hides
// and shows as a whole, remembered per browser.
const SECTIONS_FIX = "tests/browser/fixtures/room-sections.tsx";
const rowOf = (page: Page, name: string) =>
  page
    .locator("a", { hasText: new RegExp(`^${name}$`) })
    .first()
    .locator("xpath=ancestor::*[contains(@class,'room__row')][1]");

describe("low signal · a section above the closed ledger, and a closed ledger that hides", () => {
  test("⇣ rests in the bar at the name, shows under the hand, and sends the row to low signal", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const row = rowOf(page, "Simploy");
    const btn = row.locator(`${F("nmTools")} button`, { hasText: "⇣ Low signal" });
    assert.equal(
      await btn.getAttribute("title"),
      "Send to low signal. Not in your Salesforce pipeline.",
    );
    assert.equal(await btn.isVisible(), false);
    await row.locator(F("nmLink")).hover();
    await page.waitForTimeout(50);
    assert.equal(await btn.isVisible(), true);
    await btn.click();
    await page.waitForFunction(
      () => (window as { __refreshes?: number[] }).__refreshes?.length,
    );
    const call = (await callsOf(page)).find(([n]) => n === "roomLowSignal");
    assert.ok(call, "the mark never reached the server");
    assert.deepEqual(call[1], [ROW_A, "card-simploy", true]);
    await page.close();
  });

  test("a low-signal row's tool brings it back to the live board", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const row = rowOf(page, "Regis HR Group");
    await row.locator(F("nmLink")).hover();
    const back = row.locator("button[title='Return it to the live board.']");
    assert.match((await back.innerText()).trim(), /^↺/);
    await back.click();
    await page.waitForFunction(
      () => (window as { __refreshes?: number[] }).__refreshes?.length,
    );
    const call = (await callsOf(page)).find(([n]) => n === "roomLowSignal");
    assert.deepEqual(call?.[1], ["001F000000w38OHIAY", "card-regis", false]);
    await page.close();
  });

  // Closed Won by hand (founder's order, 2026-10-26).
  test("☑ asks once in the move's slot, and the confirm stamps the deal won", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const row = rowOf(page, "Simploy");
    const btn = row.locator(`${F("nmTools")} button`, { hasText: "☑ Closed won" });
    assert.equal(await btn.getAttribute("title"), "Mark Closed Won.");
    await row.locator(F("nmLink")).hover();
    await page.waitForTimeout(50);
    await btn.click();
    assert.match(await row.innerText(), /MARK IT CLOSED WON/i);
    // Not yet puts the move back and stamps nothing.
    await row.getByRole("button", { name: "Not yet" }).click();
    assert.doesNotMatch(await row.innerText(), /MARK IT CLOSED WON/i);
    assert.ok(!(await callsOf(page)).some(([n]) => n === "roomMarkWonByHand"));
    await row.locator(F("nmLink")).hover();
    await btn.click();
    const confirm = row.getByRole("button", { name: "Confirm Closed Won" });
    assert.equal(
      await confirm.evaluate((el) => getComputedStyle(el).backgroundColor),
      GREEN,
      "the confirm wears the brand's green, as Mark it done does",
    );
    await confirm.click();
    await page.waitForFunction(
      () => (window as { __refreshes?: number[] }).__refreshes?.length,
    );
    const call = (await callsOf(page)).find(([n]) => n === "roomMarkWonByHand");
    assert.ok(call, "the stamp never reached the server");
    assert.deepEqual(call[1], [ROW_A, "card-simploy"]);
    await page.close();
  });

  test("a closed row's ↺ reopens the deal", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const row = rowOf(page, "Axcet HR");
    await row.locator(F("caret")).click();
    const back = row.locator("button[title='Reopen the deal. The stamp comes off.']");
    assert.equal((await back.innerText()).trim(), "↺");
    assert.equal(await row.locator(F("nmTools")).count(), 0, "a closed row has no tools");
    await back.click();
    await page.waitForFunction(
      () => (window as { __refreshes?: number[] }).__refreshes?.length,
    );
    const call = (await callsOf(page)).find(([n]) => n === "roomReopen");
    assert.deepEqual(call?.[1], ["001F000000w38ZZIAY", "card-axcet"]);
    await page.close();
  });

  test("LOW SIGNAL sits between the live book and the closed ledger", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const y = async (sel: string) => (await box(page, sel)).y;
    const live = (await rowOf(page, "Simploy").boundingBox())!.y;
    const low = await y($("lowRule"));
    const regis = (await rowOf(page, "Regis HR Group").boundingBox())!.y;
    const closed = await y($("closedRule"));
    const axcet = (await rowOf(page, "Axcet HR").boundingBox())!.y;
    assert.ok(live < low && low < regis && regis < closed && closed < axcet);
    assert.match(
      await page.locator($("lowRule")).innerText(),
      /LOW SIGNAL · 1 · NOT IN YOUR SALESFORCE PIPELINE/,
    );
    await page.close();
  });

  test("HIDE takes the closed ledger away and a reload remembers it; SHOW brings it back", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const toggle = page.locator(`${$("closedRule")} button`);
    assert.equal((await toggle.innerText()).trim(), "HIDE");
    await toggle.click();
    assert.equal(
      await rowOf(page, "Axcet HR").isVisible(),
      false,
      "the closed row stayed",
    );
    assert.equal((await toggle.innerText()).trim(), "SHOW");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.match(await page.locator($("closedRule")).innerText(), /CLOSED · 1/);
    assert.equal(
      await rowOf(page, "Regis HR Group").isVisible(),
      true,
      "low signal stays",
    );
    const kept = await page.evaluate(() => localStorage.getItem("room:closed-hidden"));
    assert.equal(kept, "1");
    await page.close();

    const again = await mount(browser, SECTIONS_FIX, {
      storage: { "room:closed-hidden": "1" },
    });
    await again.waitForTimeout(50);
    assert.equal(
      await rowOf(again, "Axcet HR").isVisible(),
      false,
      "the reload showed it",
    );
    const t2 = again.locator(`${$("closedRule")} button`);
    await t2.click();
    assert.equal(await rowOf(again, "Axcet HR").isVisible(), true);
    assert.equal(
      await again.evaluate(() => localStorage.getItem("room:closed-hidden")),
      null,
    );
    await again.close();
  });

  test("a note half-typed in a closed row survives HIDE and SHOW", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const row = await openPanel(page, "Axcet HR");
    await row.locator(`button${$("doorAct")}`).click();
    const ta = row.locator(`textarea[aria-label="Log to Axcet HR"]`);
    await ta.fill("Call them about the renewal.");
    const toggle = page.locator(`${$("closedRule")} button`);
    await toggle.click();
    await toggle.click();
    assert.equal(await ta.inputValue(), "Call them about the renewal.");
    await page.close();
  });

  test("Collapse all reads only the rows on screen while the ledger is hidden", async () => {
    const page = await mount(browser, SECTIONS_FIX);
    const all = page.locator(`button${$("shutAll")}`);
    // The F26 face rests rows folded but the first; open the closed one so
    // its own fold is the thing that must survive.
    await rowOf(page, "Axcet HR").locator(F("caret")).click();
    await page.locator(`${$("closedRule")} button`).click();
    await all.click();
    assert.equal((await all.textContent())?.trim(), "Open all");
    for (const n of ["Simploy", "Regis HR Group"])
      assert.match((await rowOf(page, n).getAttribute("class")) ?? "", /rowShut/);
    // The hidden closed row kept its own fold, so SHOW brings back an open
    // row and the button asks to collapse again.
    await page.locator(`${$("closedRule")} button`).click();
    assert.doesNotMatch(
      (await rowOf(page, "Axcet HR").getAttribute("class")) ?? "",
      /rowShut/,
    );
    assert.equal((await all.textContent())?.trim(), "Collapse all");
    await page.close();
  });
});

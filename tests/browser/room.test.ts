// The HomeRoom in a real browser (pass 11): what a server render left to the
// stylesheet and the click. A6.1 (each register rests as one line, its kicker
// mono, its top entry trailing off), A6.3 (a filing springs TODAY open; the
// mint springs UNKNOWN), A6.6 (the asks' ✕ is revealed on hover), A4.20 (the
// THEIRS line: one blue mono line atop the register panel), A11.3 (MULTI in
// the ladder's colors, open on a click as on a hover), A11.4 (the edge tabs:
// thin, quiet ink at rest, color on hover only) and A12.7 (the Drop's held
// file comes back after a reload, saying since when).

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
/** The first row's summary line for a register, by its kicker. */
const sumline = (page: Page, kicker: string) =>
  page
    .locator($("sumline"), {
      has: page.locator($("sumk"), { hasText: new RegExp(`^${kicker}$`) }),
    })
    .first();

describe("A6.1 · each register rests as one line: a mono kicker, a live count, the top entry trailing off, ⊕", () => {
  test("UNKNOWN, COMPARABLE and TODAY each take one line, and a long top entry trails off inside it", async () => {
    const page = await mount(browser, FIX);
    for (const k of ["UNKNOWN", "COMPARABLE", "TODAY"]) {
      const line = sumline(page, k);
      const b = await line.boundingBox();
      assert.ok(b, `${k} has no line`);
      const lh = await line
        .locator($("sumtx"))
        .evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(b.height < lh * 2.2, `${k} wraps: ${b.height} against ${lh}`);
      assert.match(
        await line.locator($("sumk")).evaluate((el) => getComputedStyle(el).fontFamily),
        /JetBrains Mono/,
      );
      assert.equal(
        (await line.locator("button[title='Expand them out']").innerText()).trim(),
        "⊕",
      );
    }
    const tx = sumline(page, "UNKNOWN").locator($("sumtx"));
    const m = await tx.evaluate((el) => ({
      cut: el.scrollWidth > el.clientWidth,
      ell: getComputedStyle(el).textOverflow,
      right: el.getBoundingClientRect().right,
      lineRight: el.parentElement!.getBoundingClientRect().right,
    }));
    assert.equal(m.ell, "ellipsis");
    assert.ok(m.cut, "the long ask does not trail off");
    assert.ok(m.right <= m.lineRight + 1, "the top entry runs past its line");
    await page.close();
  });
});

describe("A6.3 · filing or composing springs TODAY open; the mint springs UNKNOWN", () => {
  test("a line composed on the Drop lands in an open TODAY", async () => {
    const page = await mount(browser, FIX, {
      returns: { roomCompose: { ok: true, kind: "action", todoId: "t9" } },
    });
    assert.equal(
      await page.locator($("sumkOn"), { hasText: /^TODAY$/ }).count(),
      0,
      "TODAY is open before the filing",
    );
    await page
      .locator(`button${$("doorAct")}`)
      .first()
      .click();
    const ta = page.locator(`textarea[aria-label="Log to Simploy"]`);
    await ta.fill("Call Chassie back about Mexico.");
    await ta.press("Enter");
    await page.waitForSelector(`${$("sumkOn")}:text-is("TODAY")`);
    const compose = (await callsOf(page)).find(([n]) => n === "roomCompose");
    assert.ok(compose, "the line never reached the server");
    assert.equal(compose[1][0], ROW_A);
    assert.match(
      await page.locator($("splayed")).first().innerText(),
      /Call Chassie back about Mexico\./,
    );
    await page.close();
  });

  test("the mint springs UNKNOWN with its receipt above the asks, and TODAY stays shut", async () => {
    const page = await mount(browser, FIX, {
      returns: { roomGapsRefill: { ok: true, added: 2 } },
    });
    await page.locator("button[title='Mint sharper asks']").first().click();
    await page.waitForSelector(`${$("sumkOn")}:text-is("STILL UNKNOWN")`);
    const open = await page.locator($("splayed")).first().innerText();
    assert.match(open, /2 new asks minted from what the app knows\./);
    assert.ok(
      open.indexOf("minted") < open.indexOf("Which of their clients"),
      "the receipt is not above the asks",
    );
    assert.equal(await page.locator($("sumkOn"), { hasText: /^TODAY$/ }).count(), 0);
    await page.close();
  });
});

describe("A6.6 · 'not this deal' is a hover-revealed ✕", () => {
  test("the ✕ rests invisible and shows when its ask is hovered", async () => {
    const page = await mount(browser, FIX);
    await sumline(page, "UNKNOWN").locator("button[title='Expand them out']").click();
    const row = page.locator($("askRow")).first();
    const x = row.locator($("askX"));
    assert.equal(await x.getAttribute("title"), "Not this deal");
    assert.equal(await x.evaluate((el) => getComputedStyle(el).opacity), "0");
    await row.hover();
    await page.waitForTimeout(250);
    assert.equal(await x.evaluate((el) => getComputedStyle(el).opacity), "1");
    await page.close();
  });
});

describe("A4.20 · the THEIRS line: one blue mono line atop the register panel; the move keeps its seat", () => {
  test("THEIRS is blue, mono, one line, above UNKNOWN; the move sits above it", async () => {
    const page = await mount(browser, FIX);
    const th = $("theirs");
    assert.equal(await css(page, th, "color"), BLUE);
    assert.match(await css(page, th, "font-family"), /JetBrains Mono/);
    const t = await box(page, th);
    const fs = Number.parseFloat(await css(page, th, "font-size"));
    assert.ok(t.height < fs * 4, `THEIRS wraps: ${t.height}`);
    const u = await sumline(page, "UNKNOWN").boundingBox();
    assert.ok(u && t.y + t.height <= u.y + 1, "THEIRS is not atop the registers");
    // The move keeps its seat unconditionally: it holds the row's left
    // column, and a row with THEIRS places it exactly where a row without
    // one does.
    const seat = (name: string) =>
      page.evaluate((n) => {
        const link = [...document.querySelectorAll("a")].find(
          (a) => a.textContent === n,
        )!;
        const rowEl = link.closest("section, article, li, [class*=row]") as HTMLElement;
        const mv = [...rowEl.querySelectorAll("*")].find(
          (e) => e.children.length === 0 && e.textContent === "Send the model.",
        )!;
        const r = mv.getBoundingClientRect();
        const n0 = link.getBoundingClientRect();
        return { dx: r.x - n0.x, dy: r.y - n0.y, right: r.right };
      }, name);
    const withTheirs = await seat("Simploy");
    const without = await seat("Regis HR Group");
    assert.ok(withTheirs.right <= t.x, "the move shares the register panel's column");
    assert.deepEqual(withTheirs, { ...without, right: withTheirs.right });
    await page.close();
  });
});

describe("A11.3 · MULTI wears the ladder: one thread red, two amber, three or more green; a click opens it", () => {
  test("each tone in its color, the card shut at rest, open on a click and on a hover", async () => {
    const page = await mount(browser, FIX);
    const badges = page.locator(`button${$("multi")}`);
    assert.equal(await badges.count(), 3);
    const colors = await badges.evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backgroundColor),
    );
    assert.deepEqual(colors, [RED, AMBER, GREEN]);
    for (const t of await badges.allInnerTexts()) assert.match(t, /^MULTI/);
    const card = badges.first().locator($("hovercard"));
    assert.equal(await card.evaluate((el) => getComputedStyle(el).display), "none");
    await badges.first().click();
    assert.equal(await card.evaluate((el) => getComputedStyle(el).display), "block");
    assert.match(await card.innerText(), /Chassie Smith · VP Operations/);
    await page.mouse.click(5, 880);
    await page.waitForTimeout(50);
    assert.equal(await card.evaluate((el) => getComputedStyle(el).display), "none");
    await badges.first().hover();
    assert.equal(await card.evaluate((el) => getComputedStyle(el).display), "block");
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

describe("A4.27 · the THEIRS line's citations drill to the cleaned excerpt", () => {
  test("THEIRS opens its gem; the cite opens the email it stands on", async () => {
    const page = await mount(browser, FIX, {
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
    await page
      .locator(`${$("theirs")} button`)
      .first()
      .click();
    await page.locator($("theirsCite")).first().click();
    await page.waitForSelector(
      "text=Can we talk Mexico next week? We have two hires there.",
    );
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
      .locator("text=Shaping up to be EOR")
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

// ── pass 13 · the shape chip is a door (the click-depth law, A5) ───────────
describe("the shape chip opens to the record lines the read stands on (pass 13, A5)", () => {
  test("shut on arrival; one click lists each product and country with its day and line; the chip says it is open", async () => {
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    const chip = page.locator($("chipDoor")).first();
    assert.equal(await chip.textContent(), "Shaping up to be EOR");
    assert.equal(await chip.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator($("identityFold")).count(), 0);
    await chip.click();
    assert.equal(await chip.getAttribute("aria-expanded"), "true");
    const lines = await page.locator(`${$("identityFold")} li`).allTextContents();
    assert.deepEqual(lines, [
      "employer of record · 9/25 · ✉ Chassie asked for the invoices.",
      "Peru · 9/25 · ✉ Chassie asked for the invoices.",
    ]);
    // The click opened the fold and nothing else: the row did not collapse.
    assert.equal(await page.locator($("rowShut")).count(), 0);
    await chip.click();
    assert.equal(await page.locator($("identityFold")).count(), 0);
    await page.close();
  });

  test("a row whose read holds no product says so: GP is the default, and the chip opens to that one line", async () => {
    const page = await mount(browser, FIX, { returns: { chuteBook: [] } });
    const second = page.locator($("row")).nth(1);
    const chip = second.locator($("chipDoor"));
    assert.equal(await chip.textContent(), "GP");
    await chip.click();
    assert.deepEqual(await second.locator(`${$("identityFold")} li`).allTextContents(), [
      "GP · No product on file. GP is the default.",
    ]);
    await page.close();
  });
});

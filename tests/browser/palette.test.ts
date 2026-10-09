// The palette is the brand's, always (the design canon), as the browser
// paints it (the palette pass). Every visible element on every face the
// suite mounts computes its words, its fill and its drawn edges to one of
// the brand's colors at some alpha: the field and its surfaces, ink and
// ink-700, the five accents and their strong states, white. A color a sheet
// mixes (color-mix) is read in its own space and held to the same set.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { mount, openBrowser, type MountOptions } from "../helpers/browser";
import { renderPage, SERVER_PAGES } from "../helpers/page-render";

const BRAND = [
  "0a1c40",
  "142949",
  "e6701e",
  "d4661b",
  "2563eb",
  "1d4ed8",
  "22c55e",
  "f59e0b",
  "ef4444",
  "ffffff",
  "f5f7fb",
  "fafbfd",
  "eff2f7",
  "fbfaf5",
].map((h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)));

const FACES: [string, string, MountOptions][] = [
  ["the HomeRoom", "tests/browser/fixtures/room.tsx", { returns: { chuteBook: [] } }],
  [
    "Groundwork",
    "tests/browser/fixtures/groundwork.tsx",
    { now: "2026-07-30T15:00:00Z" },
  ],
  [
    "Groundwork's chips",
    "tests/browser/fixtures/evidence.tsx",
    { now: "2026-07-30T15:00:00Z" },
  ],
  ["the Accounts sheet", "tests/browser/fixtures/accounts.tsx", {}],
  ["the Sendbook", "tests/browser/fixtures/sendbook.tsx", {}],
  ["the Intranet", "tests/browser/fixtures/intranet.tsx", {}],
  ["the Chute", "tests/browser/fixtures/chute.tsx", { returns: { chuteBook: [] } }],
  ["the roundup prep", "tests/browser/fixtures/prep.tsx", {}],
  [
    "the draft desk",
    "tests/browser/fixtures/desk.tsx",
    {
      returns: { listMailTemplates: [] },
      routes: {
        "/activity/evidence": () => ({
          ok: true,
          line: "Dana wrote 09/18: Re: pricing.",
          cite: { k: "r1", day: "2026-09-18", who: "Dana Ruiz", subject: "Re: pricing" },
        }),
      },
    },
  ],
  ["State of play", "tests/browser/fixtures/readout.tsx", {}],
  ["a Playbook draft", "tests/browser/fixtures/drafts.tsx", {}],
  ["the Scratchpaper", "tests/browser/fixtures/scratchpad.tsx", {}],
  ["the Playbook Sheet", "tests/browser/fixtures/playbook.tsx", {}],
  ["the Intake shelf", "tests/browser/fixtures/intake.tsx", {}],
  ["the payroll demo", "tests/browser/fixtures/payroll-demo.tsx", {}],
  ["the demo sidekick", "tests/browser/fixtures/sidekick.tsx", {}],
  ["the flow-first sidekick", "tests/browser/fixtures/sidekick-v3.tsx", {}],
  ["the Pricing table", "tests/browser/fixtures/pricing.tsx", {}],
];

let browser: Browser;
before(async () => {
  browser = await openBrowser();
});
after(async () => {
  await browser?.close();
});

/** Every color one face or page paints, held to the brand's palette. */
async function paletteOf(
  page: import("playwright-core").Page,
  name: string,
): Promise<void> {
  const used = await page.evaluate(() => {
    const out: { where: string; prop: string; value: string }[] = [];
    for (const el of [...document.querySelectorAll("#root *")] as HTMLElement[]) {
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
        continue;
      const cs = getComputedStyle(el);
      const props = ["color", "background-color"];
      for (const side of ["top", "right", "bottom", "left"])
        if (
          parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0 &&
          cs.getPropertyValue(`border-${side}-style`) !== "none"
        )
          props.push(`border-${side}-color`);
      for (const p of props)
        out.push({
          where: `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`,
          prop: p,
          value: cs.getPropertyValue(p),
        });
    }
    return out;
  });
  assert.ok(used.length > 0, `${name} painted nothing`);
  const parse = (v: string): { rgb: number[]; a: number } | null => {
    let m = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(v);
    if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
    m = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/.exec(v);
    if (m)
      return {
        rgb: [+m[1], +m[2], +m[3]].map((x) => Math.round(x * 255)),
        a: m[4] === undefined ? 1 : +m[4],
      };
    return null;
  };
  const off = used.filter(({ value }) => {
    const c = parse(value);
    if (!c) return true;
    if (c.a === 0) return false;
    return !BRAND.some((b) => b.every((x, i) => Math.abs(x - c.rgb[i]) <= 2));
  });
  assert.deepEqual([...new Set(off.map((o) => `${o.where} ${o.prop}: ${o.value}`))], []);
}

describe("every color a face paints is the brand's", () => {
  for (const [name, fixture, opts] of FACES)
    test(`${name}: words, fills and edges compute to the brand's palette`, async () => {
      const page = await mount(browser, fixture, opts);
      await paletteOf(page, name);
      await page.close();
    });
});

describe("every color a page paints is the brand's: the seven pages from their server render (pass 16)", () => {
  for (const p of SERVER_PAGES)
    test(`${p.route}: words, fills and edges compute to the brand's palette`, async () => {
      const html = await renderPage(p.route);
      const page = await mount(browser, p.route, { html });
      await paletteOf(page, p.route);
      await page.close();
    });
});

// The click-depth law in a real browser (pass 11): "every shortened thing on
// every surface is a door to its evidence, exactly one click deep", "nothing
// compressed is ever a dead end", "nothing deep ever surfaces uninvited".
// The sweep mounts every face the suite can mount, reads every number a
// person can see on arrival, and holds each to the law: it is a door (a
// link, a button, a summary), or it is one of the named exemptions below,
// each with its reason. A count no rule covers fails the build. Since pass
// 13 it reads the app's own abbreviations too (ABBR below): a short line
// carrying one is a door, or sits by a door that names it, or it fails. A
// sentence is not a compression, so running prose (eight words or more) is
// outside the rule. What the sweep still cannot read is a two-word term or
// a theme with no digit and no abbreviation, and the faces it cannot mount.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Browser } from "playwright-core";
import { mount, openBrowser, type MountOptions } from "../helpers/browser";

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

/** The app's own abbreviations: each is a compression, so a short line that
 *  carries one is a door to what it stands for. */
const ABBR = /\b(EOR|PEO|PEPM|CSM|HCM|PHR|VTT|API|EOD|EOW|COR|GP|CP|SF)\b/g;

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
  // The Pricing room (pass 15): a price is the figure itself, authored on
  // this page (the third money carve-out), not a count of anything; the
  // head's count is of the rows in view beneath it.
  [/command_center__count/, "the rows in view beneath it"],
  [/command_center__fit/, "a tier is the price's own label"],
  [
    /command_center__table/,
    "the figure itself; a tier and the unit are the price's own labels",
  ],
  // The demo tabs (pass 15). A screen's ordinal in the flow, with the flow
  // beside it; a source moment's id and the frame's file name and command,
  // which are provenance; and the audience label, trade vocabulary (PEO,
  // SMB) with nothing derived behind it.
  [/payroll_demo__cardHead/, "the screen's ordinal in the flow"],
  [/sidekick_v3__(chip|provenance)/, "a source moment's id, a frame's file name"],
  [/sidekick__who/, "the audience label: trade vocabulary, nothing derived behind it"],
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
      const seen = await page.evaluate(
        ([moment, abbr]) => {
          const DOOR = "a,button,summary,label,input,select,textarea,[role=button]";
          const re = new RegExp(moment, "g");
          const abbrRe = new RegExp(abbr, "g");
          const out: {
            cls: string;
            text: string;
            kind: "count" | "abbr";
            door: boolean;
            lineDoor: boolean;
            openFold: boolean;
          }[] = [];
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n: Node | null;
          while ((n = walk.nextNode())) {
            const raw = n.textContent ?? "";
            const text = raw.replace(re, "");
            const abbrs = raw.match(abbrRe) ?? [];
            // A sentence is read whole: a bold or linked fragment inside it
            // is still prose, so the words are the nearest block's.
            const block =
              n.parentElement?.closest("p,li,td,th,h1,h2,h3,h4,dd,dt,blockquote,label") ??
              n.parentElement;
            const words = (block?.textContent ?? raw)
              .trim()
              .split(/\s+/)
              .filter(Boolean).length;
            // A count, or an abbreviation in a short line. Running prose is a
            // sentence, not a compression.
            const kind: "count" | "abbr" | null = /\d/.test(text)
              ? "count"
              : abbrs.length > 0 && words < 8
                ? "abbr"
                : null;
            if (!kind) continue;
            const el = n.parentElement!;
            if (el.closest("script,style")) continue;
            // What a person can see: a closed fold's contents keep a box but
            // are not rendered.
            if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
              continue;
            // A door within the line's card (three levels up) that names the
            // same numbers, or the abbreviation: the card's own door to what
            // the line compresses.
            const named = (() => {
              const wants =
                kind === "count"
                  ? (text.match(/\d+/g) ?? []).map((x) => new RegExp(`\\b${x}\\b`))
                  : abbrs.map((x) => new RegExp(`\\b${x}\\b`));
              let box: HTMLElement | null = el;
              for (let up = 0; up < 3 && box; up++, box = box.parentElement)
                for (const d of box.querySelectorAll<HTMLElement>(DOOR))
                  if (wants.every((w) => w.test(d.textContent ?? ""))) return true;
              return false;
            })();
            // The classes the line sits in, four levels up, so a table's
            // cell is read as the table's.
            const lineage: string[] = [];
            for (
              let up = 0, box: HTMLElement | null = el;
              up < 4 && box;
              up++, box = box.parentElement
            )
              lineage.push(box.className);
            out.push({
              cls: lineage.join(" "),
              text: raw.trim().slice(0, 80),
              kind,
              door: !!el.closest(DOOR),
              // A count's own line carries the door that opens it; an
              // abbreviation needs the door to name it.
              lineDoor:
                named ||
                (kind === "count" &&
                  !![el, el.parentElement].some((x) =>
                    x?.querySelector(":scope > button, :scope > a"),
                  )),
              openFold: !!el.closest("details[open], [aria-expanded=true] + *"),
            });
          }
          return out;
        },
        [MOMENT.source, ABBR.source],
      );
      const dead = seen.filter(
        (s) =>
          !s.door && !s.lineDoor && !s.openFold && !EXEMPT.some(([re]) => re.test(s.cls)),
      );
      assert.deepEqual(
        dead,
        [],
        `${name} has a count or an abbreviation that opens nothing`,
      );
      // Nothing deep surfaces uninvited: no fold is open on arrival.
      assert.equal(
        await page.locator("details[open]").count(),
        0,
        `${name} opened a fold on arrival`,
      );
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
    const page = await mount(browser, "tests/browser/fixtures/groundwork.tsx", {
      now: "2026-07-30T15:00:00Z",
    });
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
      (
        await page.evaluate(
          () => (window as unknown as { __calls: [string, unknown[]][] }).__calls,
        )
      ).some(([n, a]) => n === "intranetReceiptDocs" && a[0] === "cap1"),
    );
    await page.close();
  });
});

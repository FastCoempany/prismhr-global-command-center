import { mount, openBrowser } from "../helpers/browser";
const FACES: [string, Record<string, unknown>][] = [
  ["tests/browser/fixtures/room.tsx", { returns: { chuteBook: [] } }],
  ["tests/browser/fixtures/groundwork.tsx", {}],
  ["tests/browser/fixtures/evidence.tsx", {}],
  ["tests/browser/fixtures/accounts.tsx", {}],
  ["tests/browser/fixtures/sendbook.tsx", {}],
  ["tests/browser/fixtures/intranet.tsx", {}],
  ["tests/browser/fixtures/chute.tsx", { returns: { chuteBook: [] } }],
  ["tests/browser/fixtures/prep.tsx", {}],
  ["tests/browser/fixtures/desk.tsx", { returns: { listMailTemplates: [] } }],
  ["tests/browser/fixtures/readout.tsx", {}],
  ["tests/browser/fixtures/drafts.tsx", {}],
  ["tests/browser/fixtures/scratchpad.tsx", {}],
];
const b = await openBrowser();
for (const [f, o] of FACES) {
  try {
    const page = await mount(b, f, o as never);
    const got = await page.evaluate(() => {
      const DOOR = "a,button,summary,label,input,select,textarea,[role=button],abbr[title],[title]";
      const out = new Map<string, { n: number; door: number; sample: string }>();
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walk.nextNode())) {
        const el = n.parentElement!;
        if (el.closest("script,style")) continue;
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
        const raw = n.textContent ?? "";
        for (const tok of raw.match(/\b[A-Z][A-Z0-9&]{1,7}\b/g) ?? []) {
          const e = out.get(tok) ?? { n: 0, door: 0, sample: raw.trim().slice(0, 60) };
          e.n++;
          if (el.closest(DOOR)) e.door++;
          out.set(tok, e);
        }
      }
      return [...out.entries()];
    });
    console.log("==", f);
    for (const [t, e] of got) console.log(`  ${t.padEnd(10)} x${e.n} doors ${e.door}  "${e.sample}"`);
    await page.close();
  } catch (e) { console.log("!!", f, (e as Error).message.slice(0, 200)); }
}
await b.close();

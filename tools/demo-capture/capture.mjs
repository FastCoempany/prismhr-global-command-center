// PrismHR Global demo capture robot.
//
// Runs LOCALLY on your machine (the cloud build environment is blocked from
// reaching the demo host). Opens a real Chromium window pointed at the demo,
// you log in by hand, and then it silently saves a clean record of every
// screen you visit as you click through. No manual screenshotting.
//
// For each captured screen it writes, into ./capture-output/:
//   text/NNN.txt        visible page text (verbatim, includes below-the-fold)
//   dom/NNN.html        full serialized DOM (every label, field, link target)
//   a11y/NNN.yaml       accessibility (aria) snapshot — semantic roles + names
//   screenshots/NNN.png full-page screenshot (the look, for the visual guide)
// plus manifest.jsonl   one line per capture (seq, url, title, trigger, time)
//
// Your credentials never leave your machine and are never written to disk:
// you type them into the browser window yourself.
//
// Usage:
//   npm install
//   npx playwright install chromium
//   node capture.mjs
//
// Then in the window: log in, click "Start capture" in the floating panel,
// and walk the app. Re-visited screens are de-duplicated automatically.

import { chromium } from 'playwright';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const START_URL = process.env.DEMO_URL || 'https://app1.demo.prismhr.com/';
const OUT = path.resolve(process.env.OUT_DIR || 'capture-output');
const SETTLE_MS = Number(process.env.SETTLE_MS || 900); // debounce after a click

const dirs = ['text', 'dom', 'a11y', 'screenshots'];
await mkdir(OUT, { recursive: true });
await Promise.all(dirs.map((d) => mkdir(path.join(OUT, d), { recursive: true })));

const sha1 = (s) => createHash('sha1').update(s).digest('hex');

const seen = new Set(); // content hashes already captured -> skip re-visits
let seq = 0;
let started = false;
let busy = false;

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();

// --- capture routine (runs in Node) ------------------------------------------
async function capture(reason) {
  if (!started || busy) return;
  busy = true;
  try {
    try {
      await page.waitForLoadState('networkidle', { timeout: 4000 });
    } catch {
      /* SPA may never go fully idle; proceed anyway */
    }

    const text = (await page.evaluate(() => document.body?.innerText || '').catch(() => '')).trim();
    if (!text) return;

    const hash = sha1(text);
    if (seen.has(hash)) {
      console.log('·  (already captured, skipped)');
      return;
    }
    seen.add(hash);

    seq += 1;
    const id = String(seq).padStart(3, '0');
    const url = page.url();
    const title = await page.title().catch(() => '');

    // Each artifact is written independently so one failure never loses the rest.
    try {
      await writeFile(path.join(OUT, 'text', `${id}.txt`), `URL: ${url}\nTITLE: ${title}\n\n${text}`);
    } catch (e) {
      console.error('  text:', e.message);
    }

    try {
      await writeFile(path.join(OUT, 'dom', `${id}.html`), await page.content());
    } catch (e) {
      console.error('  dom:', e.message);
    }

    // Accessibility snapshot. page.accessibility was removed in recent Playwright,
    // so prefer the modern locator.ariaSnapshot() and fall back for older builds.
    try {
      let aria = null;
      try {
        aria = await page.locator('body').ariaSnapshot();
      } catch {
        /* older/newer API mismatch — try the legacy path below */
      }
      if (aria == null && page.accessibility?.snapshot) {
        aria = JSON.stringify(await page.accessibility.snapshot(), null, 2);
      }
      if (aria != null) await writeFile(path.join(OUT, 'a11y', `${id}.yaml`), aria);
    } catch (e) {
      console.error('  a11y:', e.message);
    }

    try {
      await page.screenshot({ path: path.join(OUT, 'screenshots', `${id}.png`), fullPage: true });
    } catch (e) {
      console.error('  screenshot:', e.message);
    }

    try {
      await appendFile(
        path.join(OUT, 'manifest.jsonl'),
        JSON.stringify({ seq, id, url, title, reason, ts: new Date().toISOString() }) + '\n',
      );
    } catch (e) {
      console.error('  manifest:', e.message);
    }

    console.log(`✓  ${id}  ${title || url}`);
    await page.evaluate((n) => {
      const el = document.getElementById('__cap_count');
      if (el) el.textContent = String(n);
    }, seq).catch(() => {});
  } catch (e) {
    console.error('capture error:', e.message);
  } finally {
    busy = false;
  }
}

// Bridge the page -> Node. Persists across navigations for this page.
await page.exposeFunction('__capSignal', async (reason) => {
  if (reason === 'start') {
    started = true;
    console.log('▶  capturing ON');
    await capture('start');
  } else if (reason === 'stop') {
    started = false;
    console.log('⏸  capturing OFF');
  } else {
    await capture(reason);
  }
});

// --- in-page control panel + capture triggers ---------------------------------
// Re-injected on every document load. State persists in sessionStorage so a full
// page reload doesn't silently turn capturing off.
//
// Transient states (dropdowns, hover cards, modals) are the hard case: reaching
// for a button with the mouse dismisses a hover. So we catch them THREE ways:
//   1. Auto: a MutationObserver fires whenever an overlay/modal/menu/tooltip is
//      added to the page — most transient states capture themselves, hands-free.
//   2. Hotkey Ctrl+Shift+S: fires instantly, mouse never moves, so a held hover
//      stays on screen. This is the reliable manual trigger for hovers.
//   3. Delay (Ctrl+Shift+D or "⏱ 3s"): counts down, giving you time to open and
//      hold a state before it snapshots — for anything the first two miss.
await context.addInitScript(() => {
  const KEY = '__capOn';
  const isOn = () => sessionStorage.getItem(KEY) === '1';
  const signal = (r) => window.__capSignal && window.__capSignal(r);

  function countdown(seconds, done) {
    const tip = document.getElementById('__cap_tip');
    let n = seconds;
    const tick = () => {
      if (tip) tip.textContent = n > 0 ? `capturing in ${n}…` : '';
      if (n <= 0) return done();
      n -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function mount() {
    if (document.getElementById('__cap_panel')) return;
    const panel = document.createElement('div');
    panel.id = '__cap_panel';
    panel.style.cssText =
      'position:fixed;z-index:2147483647;bottom:16px;right:16px;background:#0f172a;color:#fff;' +
      'font:13px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3);' +
      'display:flex;gap:8px;align-items:center;user-select:none';
    const bs = 'cursor:pointer;border:0;border-radius:6px;padding:6px 10px;color:#fff';
    const btn = document.createElement('button');
    btn.style.cssText = bs + ';font-weight:600;background:#2563eb';
    const snap = document.createElement('button');
    snap.textContent = '📸 Now';
    snap.title = 'Capture now (Ctrl+Shift+S)';
    snap.style.cssText = bs + ';background:#334155';
    const delay = document.createElement('button');
    delay.textContent = '⏱ 3s';
    delay.title = 'Capture after 3s — for holding a hover/dropdown open (Ctrl+Shift+D)';
    delay.style.cssText = bs + ';background:#334155';
    const tip = document.createElement('span');
    tip.id = '__cap_tip';
    tip.style.cssText = 'color:#fbbf24;min-width:0';
    const count = document.createElement('span');
    count.innerHTML = 'saved <b id="__cap_count">0</b>';

    function render() {
      const on = isOn();
      btn.textContent = on ? '⏸ Stop capture' : '▶ Start capture';
      btn.style.background = on ? '#dc2626' : '#2563eb';
    }
    btn.onclick = () => {
      const next = !isOn();
      sessionStorage.setItem(KEY, next ? '1' : '0');
      render();
      signal(next ? 'start' : 'stop');
    };
    snap.onclick = () => signal('manual');
    delay.onclick = () => countdown(3, () => signal('delayed'));

    panel.append(btn, snap, delay, tip, count);
    document.body.appendChild(panel);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  // (1) Auto-capture after any click so SPA tab/drill-down changes land.
  let t;
  document.addEventListener(
    'click',
    () => {
      if (!isOn()) return;
      clearTimeout(t);
      t = setTimeout(() => signal('auto'), 900);
    },
    true,
  );

  // (1b) Auto-capture when an overlay appears: modal, menu, dropdown, tooltip.
  // Covers most transient states with no action from you.
  const OVERLAY =
    '[role="dialog"],[aria-modal="true"],[role="menu"],[role="listbox"],[role="tooltip"],' +
    '.modal,.dropdown-menu,[data-radix-popper-content-wrapper],[data-state="open"]';
  let ot;
  const obs = new MutationObserver((muts) => {
    if (!isOn()) return;
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && (node.matches?.(OVERLAY) || node.querySelector?.(OVERLAY))) {
          clearTimeout(ot);
          ot = setTimeout(() => signal('overlay'), 600);
          return;
        }
      }
    }
  });
  const startObs = () => document.body && obs.observe(document.body, { childList: true, subtree: true });
  if (document.body) startObs();
  else document.addEventListener('DOMContentLoaded', startObs);

  // (2)/(3) Hotkeys: instant capture (mouse stays put) and delayed capture.
  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey)) return;
    if (e.key === 'S' || e.key === 's') {
      e.preventDefault();
      signal('manual');
    } else if (e.key === 'D' || e.key === 'd') {
      e.preventDefault();
      countdown(3, () => signal('delayed'));
    }
  });
});

// Catch full navigations too (click debounce + dedup keep this from doubling).
let navT;
page.on('framenavigated', (frame) => {
  if (frame !== page.mainFrame() || !started) return;
  clearTimeout(navT);
  navT = setTimeout(() => capture('nav'), SETTLE_MS);
});

await page.goto(START_URL, { waitUntil: 'domcontentloaded' }).catch((e) => {
  console.error(`Could not open ${START_URL}: ${e.message}`);
});

console.log(`
PrismHR Global demo capture
---------------------------
Output folder : ${OUT}
1. Log in to the demo in the window that just opened.
2. Click "▶ Start capture" in the panel (bottom-right).
3. Walk every menu, tab, drill-down, and row. Each new screen saves itself.
   - Re-visited screens are skipped automatically.
   - Press Ctrl+Shift+S (or "📸 Capture now") to force a snapshot of a
     transient state (open menu, hover card, modal).
4. Close the browser window when done. Files are already on disk.
`);

// Keep the process alive until the user closes the browser.
await new Promise((resolve) => {
  browser.on('disconnected', resolve);
});
console.log(`\nDone. Captured ${seq} unique screens into ${OUT}`);
process.exit(0);

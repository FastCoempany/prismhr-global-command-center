# Demo Capture Robot

A local browser robot for **phase 1** of the demo guide: it records every screen
of the PrismHR Global demo as you click through it, so you don't have to
screenshot 100–200 screens by hand.

## Why it runs on your machine

The cloud build environment is blocked by org egress policy from reaching
`app1.demo.prismhr.com`. So the robot runs **locally**, where the demo is
reachable and where you log in. Your admin credentials never leave your
machine and are never written to disk — you type them into the browser window
yourself.

## What it captures

For every unique screen you visit, into `capture-output/`:

| File | What it is | Why it matters |
| --- | --- | --- |
| `text/NNN.txt` | Visible page text, verbatim | Clean, low-noise source for scripts — includes below-the-fold |
| `dom/NNN.html` | Full serialized DOM | Every label, field, and link target; nothing hidden escapes |
| `a11y/NNN.json` | Accessibility tree | Semantic map of buttons, tabs, inputs |
| `screenshots/NNN.png` | Full-page screenshot | The look, for the eventual visual guide |
| `manifest.jsonl` | One line per capture | seq, url, title, what triggered it, timestamp |

Re-visited screens are de-duplicated automatically (by page-text hash).

## Run it

```bash
cd tools/demo-capture
npm install
npx playwright install chromium   # one-time browser download
node capture.mjs
```

Then, in the Chromium window that opens:

1. **Log in** to the demo.
2. Click **▶ Start capture** in the floating panel (bottom-right).
3. **Walk the app** — every menu, tab, drill-down, row. Each new screen saves
   itself. Be exhaustive: open every nav item, every tab on every page, click
   into list rows, expand every section.
4. For a transient state (an open dropdown, a hover card, a modal) that a click
   alone won't hold, press **Ctrl+Shift+S** or **📸 Capture now** to force a snapshot.
5. **Close the window** when done. Everything is already saved.

### Tips for completeness

- Capture both **empty** and **populated** states where they differ.
- Don't skip Settings / admin screens — capture them; we tag value later.
- If a page has filters or toggles that change what's shown, capture each variant.

## Handing the results back

`capture-output/` is git-ignored (it's large). To build the catalog, share the
lightweight parts — `text/`, `a11y/`, and `manifest.jsonl` — back into the
session (the PNGs can stay on your machine for now; they're for the phase-2
visual guide). I'll turn each captured screen into a structured catalog entry.

## Knobs (optional env vars)

- `DEMO_URL` — start URL (default `https://app1.demo.prismhr.com/`)
- `OUT_DIR` — output folder (default `capture-output`)
- `SETTLE_MS` — pause after navigation before capturing (default `900`)

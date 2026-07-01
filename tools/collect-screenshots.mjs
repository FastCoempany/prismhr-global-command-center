// Copy the captured screenshots into public/demo-screens/<screenId>.png so the
// in-app sidekick can show "screenshot beside the script".
//
// Run LOCALLY, where your capture output (including the PNGs) exists — the repo
// only carries text/a11y, not the large screenshots.
//
//   node tools/collect-screenshots.mjs
//
// Matches each catalog entry to the right capture folder + seq and copies the
// full-page PNG. Missing ones are reported and simply won't show a screenshot.

import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const ENTRIES = "docs/demo-catalog/entries";
const OUT = "public/demo-screens";
const TOPUP = "tools/demo-capture/capture-output-topup";
const BASE = "tools/demo-capture/capture-output";

mkdirSync(OUT, { recursive: true });

let copied = 0;
const missing = [];

for (const f of readdirSync(ENTRIES).filter((n) => n.endsWith(".md"))) {
  const raw = readFileSync(path.join(ENTRIES, f), "utf8");
  const id = (raw.match(/^id:\s*"?(\d+)"?/m) || [])[1];
  if (!id) continue;

  const cap = (raw.match(/^capture:\n([\s\S]*?)\n(?:tags:|---)/m) || [])[1] || "";
  const root = cap.includes("capture-output-topup") ? TOPUP : BASE;
  const seq = (cap.match(/(\d{3})\.(?:png|txt|yaml)/) || [])[1];
  if (!seq) {
    missing.push(id);
    continue;
  }

  const src = path.join(root, "screenshots", `${seq}.png`);
  if (!existsSync(src)) {
    missing.push(`${id} (seq ${seq})`);
    continue;
  }
  copyFileSync(src, path.join(OUT, `${id}.png`));
  copied++;
}

console.log(`Copied ${copied} screenshots to ${OUT}/`);
if (missing.length) console.log(`No screenshot for: ${missing.join(", ")}`);

#!/usr/bin/env node
// Extract the curated per-screen frames from the local dense pack into
// public/demo-screens/v3/<screenId>.jpg so the v3 Sidekick can show real
// screenshots. Local-only: reads the dense frame folder (never committed) and
// writes exactly one small JPEG per curated screen (21 total — these ARE meant
// to be committed, unlike the bulky pack).
//
//   npm run sidekick:frames:v3                          (default pack path)
//   npm run sidekick:frames:v3 -- --pack <dir>          (explicit pack path)
//   SIDEKICK_PACK_DIR=<dir> npm run sidekick:frames:v3  (env override)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const DEFAULT_PACK_DIR =
  "C:\\Users\\tanya\\prismhr-global-command-center\\PrismHR Global Demo\\_sidekick_import_dense_20260708-213650";

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const argIdx = process.argv.indexOf("--pack");
const packDir =
  (argIdx !== -1 ? process.argv[argIdx + 1] : undefined) ||
  process.env.SIDEKICK_PACK_DIR ||
  DEFAULT_PACK_DIR;
if (!fs.existsSync(packDir)) {
  fail(
    `Pack folder not found: ${packDir}\n` +
      `  Pass the extracted pack folder with --pack <dir> or SIDEKICK_PACK_DIR.`,
  );
}

const framesDir = path.join(packDir, "frames_dense_025s");
if (!fs.existsSync(framesDir)) fail(`No frames_dense_025s/ inside ${packDir}`);

const store = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "lib", "sidekick-v3", "screens.json"), "utf8"),
);

const outDir = path.join(ROOT, "public", "demo-screens", "v3");
fs.mkdirSync(outDir, { recursive: true });

// The suggested frame filename is computed from the 4 fps cadence; if the
// exact file is missing, fall back to the numerically nearest frame.
const available = fs
  .readdirSync(framesDir)
  .filter((n) => /\.(jpe?g|png)$/i.test(n))
  .sort();
const numbers = available.map((n) => {
  const m = n.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
});

function nearest(wanted) {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < numbers.length; i++) {
    const d = Math.abs(numbers[i] - wanted);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best >= 0 ? available[best] : null;
}

let copied = 0;
let fallbacks = 0;
for (const s of store.screens) {
  const want = s.suggestedScreenshotFrame?.approxFile;
  if (!want) {
    console.warn(`  ! ${s.id}: no suggested frame — skipped`);
    continue;
  }
  let src = path.join(framesDir, want);
  if (!fs.existsSync(src)) {
    const m = want.match(/(\d+)/);
    const alt = m ? nearest(parseInt(m[1], 10)) : null;
    if (!alt) {
      console.warn(`  ! ${s.id}: ${want} not found and no fallback — skipped`);
      continue;
    }
    console.warn(`  ~ ${s.id}: ${want} not found, using nearest ${alt}`);
    src = path.join(framesDir, alt);
    fallbacks++;
  }
  fs.copyFileSync(src, path.join(outDir, `${s.id}.jpg`));
  copied++;
}

console.log(`✓ Copied ${copied}/${store.screens.length} frames → ${outDir}`);
if (fallbacks) console.log(`  (${fallbacks} used nearest-frame fallback — eyeball them)`);
console.log(`  Review each image, swap any that missed the moment, then commit the folder.`);

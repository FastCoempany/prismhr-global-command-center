#!/usr/bin/env node
// Zoom-recording → Demo Sidekick draft importer (review-first, local-only).
//
// Reads a locally-extracted dense frame pack (transcript.vtt + frame_manifest.csv
// + frames_dense_025s/) and deterministically produces draft catalog entries for
// human review. It never touches the database and never uploads anything — the
// output is JSON/Markdown in tools/sidekick-import/output/ (gitignored).
//
//   npm run sidekick:import:draft                          (default pack path)
//   npm run sidekick:import:draft -- --pack <dir>          (explicit pack path)
//   SIDEKICK_PACK_DIR=<dir> npm run sidekick:import:draft  (env override)
//
// Pipeline: parse VTT cues → parse frame manifest (or infer from filenames at
// the 0.25 s cadence) → map each cue to its nearest frames → group cues into
// candidate demo moments (silence gaps / max length) → guess a module per group
// from keyword hits → emit drafts with say/what/capabilities/sp/de/branching
// placeholders and a confidence field.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────────

// Where the extracted dense pack lives when no --pack/env is given (the path in
// docs/sidekick-imports/sidekick-assets-dense-20260708-213650.md).
const DEFAULT_PACK_DIR =
  "C:\\Users\\tanya\\prismhr-global-command-center\\PrismHR Global Demo\\_sidekick_import_dense_20260708-213650";

const FRAME_CADENCE_S = 0.25; // 4 FPS dense extraction
const GROUP_GAP_S = 8; // a silence gap this long starts a new candidate moment
const GROUP_MAX_S = 75; // a moment never grows past this; force a split
const GROUP_MIN_CUES = 2; // trailing singleton cues merge into the previous moment
const FRAMES_PER_MOMENT = 12; // max sampled frame refs per moment (evenly spaced)
const EXCERPT_MAX = 420; // chars of transcript excerpt on each draft entry

// Module-guess vocabulary — keys must match src/lib/catalog/catalog.json.
const MODULE_KEYWORDS = {
  dashboard: ["dashboard", "home screen", "landing page", "at a glance", "overview page"],
  "new-hire": ["new hire", "add an employee", "add employee", "hire someone", "start a hire", "offer letter"],
  onboarding: ["onboarding", "onboard", "i-9", "i9", "w-4", "w4", "e-verify", "background check", "first day"],
  team: ["team", "roster", "employee list", "org chart", "directory", "profile page", "headcount"],
  invoices: ["invoice", "invoicing", "billing", "bill", "line item", "charge", "statement"],
  "time-off": ["time off", "pto", "vacation", "sick leave", "leave request", "holiday", "accrual"],
  "time-tracking": ["time tracking", "timesheet", "clock in", "clock out", "hours worked", "punch"],
  reimbursements: ["reimbursement", "reimburse", "expense", "receipt", "mileage"],
  reports: ["report", "reporting", "export", "csv", "download the data", "analytics"],
  "tools-resources": ["tools", "resources", "template", "document library", "help center", "knowledge"],
  settings: ["settings", "configuration", "configure", "permission", "role setup", "admin panel", "preferences"],
  "support-cases": ["support case", "support ticket", "ticket", "case number", "help desk", "escalate"],
  "worker-portal": ["worker portal", "employee portal", "self-service", "employee view", "worker sees", "their own login"],
};

// ── Small utilities ───────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function tsToSec(ts) {
  // "HH:MM:SS.mmm", "MM:SS.mmm", or plain seconds.
  const t = ts.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const parts = t.split(":").map((p) => parseFloat(p.replace(",", ".")));
  if (parts.some((n) => Number.isNaN(n))) return NaN;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function secToClock(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ── VTT parsing ───────────────────────────────────────────────────────────────

// Returns [{ index, startSec, endSec, speaker, text }]. Handles Zoom's
// "<v Name>text</v>" voice tags and "Name: text" prefixes; drops empty cues.
function parseVtt(raw) {
  const cues = [];
  // Normalize newlines, drop WEBVTT header/NOTE/STYLE blocks by scanning cues.
  const blocks = raw.replace(/\r\n?/g, "\n").split(/\n\n+/);
  let index = 0;
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue; // header / NOTE / numeric-only block
    const [startRaw, endRaw = ""] = lines[timeLineIdx].split("-->");
    const startSec = tsToSec(startRaw);
    // The end stamp may carry cue settings ("00:00:04.500 align:start"); take
    // the first token after trimming.
    const endSec = tsToSec(endRaw.trim().split(/\s+/)[0] ?? "");
    if (Number.isNaN(startSec) || Number.isNaN(endSec)) continue;

    let text = lines
      .slice(timeLineIdx + 1)
      .join(" ")
      .trim();
    let speaker = "";
    const voice = text.match(/^<v\s+([^>]+)>/i);
    if (voice) {
      speaker = voice[1].trim();
      text = text.replace(/^<v\s+[^>]+>/i, "").replace(/<\/v>/gi, "");
    } else {
      const named = text.match(/^([A-Z][\w .'-]{1,40}):\s+(.*)$/);
      if (named) {
        speaker = named[1].trim();
        text = named[2];
      }
    }
    text = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    cues.push({ index: index++, startSec, endSec, speaker, text });
  }
  return cues;
}

// ── Frame manifest parsing ────────────────────────────────────────────────────

// Minimal CSV line splitter (handles quoted fields with commas).
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Pull a timestamp out of a frame filename, e.g. "frame_0012.50s.jpg",
// "t0003_25.jpg", "frame_000123.jpg" (index × cadence fallback handled upstream).
function timeFromFilename(name) {
  let m = name.match(/(\d+(?:[._]\d+)?)\s*s(?:ec)?\b/i);
  if (m) return parseFloat(m[1].replace("_", "."));
  m = name.match(/(\d{2})[-_.](\d{2})[-_.](\d{2})(?:[-_.](\d{1,3}))?/);
  if (m) {
    const [, h, mm, ss, frac] = m;
    return (
      parseInt(h, 10) * 3600 +
      parseInt(mm, 10) * 60 +
      parseInt(ss, 10) +
      (frac ? parseFloat(`0.${frac}`) : 0)
    );
  }
  return NaN;
}

// Returns [{ file, tSec }] sorted by tSec. Prefers frame_manifest.csv (tolerant
// of column naming/order); falls back to scanning frames_dense_025s/ and
// inferring times from filenames or the fixed cadence.
function loadFrames(packDir) {
  const manifestPath = path.join(packDir, "frame_manifest.csv");
  const framesDir = path.join(packDir, "frames_dense_025s");

  if (fs.existsSync(manifestPath)) {
    const lines = fs
      .readFileSync(manifestPath, "utf8")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((l) => l.trim() !== "");
    if (lines.length > 0) {
      const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
      const looksLikeHeader = header.some((h) => /[a-z]/.test(h));
      const fileCol = header.findIndex((h) => /file|frame|path|name|image/.test(h));
      const timeCol = header.findIndex((h) => /time|sec|offset|stamp|^t$/.test(h));
      const rows = looksLikeHeader ? lines.slice(1) : lines;
      const frames = [];
      for (const line of rows) {
        const cols = splitCsvLine(line);
        const file = cols[fileCol >= 0 ? fileCol : 0] ?? "";
        const timeRaw = cols[timeCol >= 0 ? timeCol : 1] ?? "";
        if (!file) continue;
        let tSec = tsToSec(timeRaw);
        if (Number.isNaN(tSec)) tSec = timeFromFilename(path.basename(file));
        if (Number.isNaN(tSec)) tSec = frames.length * FRAME_CADENCE_S;
        frames.push({ file: path.basename(file), tSec });
      }
      if (frames.length > 0) {
        frames.sort((a, b) => a.tSec - b.tSec);
        return { frames, source: "frame_manifest.csv" };
      }
    }
  }

  if (fs.existsSync(framesDir)) {
    const names = fs
      .readdirSync(framesDir)
      .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
      .sort();
    const frames = names.map((name, i) => {
      const t = timeFromFilename(name);
      return { file: name, tSec: Number.isNaN(t) ? i * FRAME_CADENCE_S : t };
    });
    frames.sort((a, b) => a.tSec - b.tSec);
    if (frames.length > 0) return { frames, source: "frames_dense_025s/ (inferred)" };
  }

  fail(
    `No frames found. Expected ${manifestPath} or ${framesDir}.\n` +
      `  Pass the extracted pack folder with --pack <dir> or SIDEKICK_PACK_DIR.`,
  );
}

// Binary search: index of the frame nearest to t.
function nearestFrameIdx(frames, t) {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].tSec < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(frames[lo - 1].tSec - t) <= Math.abs(frames[lo].tSec - t)) return lo - 1;
  return lo;
}

// ── Grouping + module guessing ────────────────────────────────────────────────

function groupCues(cues) {
  const groups = [];
  let cur = null;
  for (const cue of cues) {
    const startNew =
      !cur ||
      cue.startSec - cur.endSec > GROUP_GAP_S ||
      cue.endSec - cur.startSec > GROUP_MAX_S;
    if (startNew) {
      cur = { cues: [cue], startSec: cue.startSec, endSec: cue.endSec };
      groups.push(cur);
    } else {
      cur.cues.push(cue);
      cur.endSec = Math.max(cur.endSec, cue.endSec);
    }
  }
  // Fold undersized trailing groups into their predecessor so no moment is a
  // lone half-sentence (unless it's the only group).
  const folded = [];
  for (const g of groups) {
    const prev = folded[folded.length - 1];
    if (prev && g.cues.length < GROUP_MIN_CUES && g.startSec - prev.endSec <= GROUP_GAP_S * 2) {
      prev.cues.push(...g.cues);
      prev.endSec = Math.max(prev.endSec, g.endSec);
    } else {
      folded.push(g);
    }
  }
  return folded;
}

function guessModule(text) {
  const lower = ` ${text.toLowerCase()} `;
  let best = { module: "unknown", hits: 0, matched: [] };
  for (const [module, words] of Object.entries(MODULE_KEYWORDS)) {
    const matched = words.filter((w) => lower.includes(w));
    if (matched.length > best.hits) best = { module, hits: matched.length, matched };
  }
  const confidence = best.hits >= 3 ? "high" : best.hits === 2 ? "medium" : best.hits === 1 ? "low" : "none";
  return { module: best.hits > 0 ? best.module : "unknown", confidence, matchedKeywords: best.matched };
}

function guessTitle(group, moduleGuess) {
  const first = group.cues[0].text.replace(/^[a-z]/, (c) => c.toUpperCase());
  const words = first.split(" ").slice(0, 9).join(" ");
  const clean = words.replace(/[,;:.]+$/, "");
  if (clean.length >= 12) return clean + (first.split(" ").length > 9 ? "…" : "");
  const label = moduleGuess !== "unknown" ? moduleGuess : "moment";
  return `${label} @ ${secToClock(group.startSec)}`;
}

// Evenly sample up to n frame refs across [startSec, endSec].
function sampleFrames(frames, startSec, endSec, n) {
  const a = nearestFrameIdx(frames, startSec);
  const b = nearestFrameIdx(frames, endSec);
  const span = Math.max(0, b - a);
  const count = Math.min(n, span + 1);
  const refs = [];
  for (let i = 0; i < count; i++) {
    const idx = a + Math.round((span * i) / Math.max(1, count - 1));
    const f = frames[idx];
    if (refs.length === 0 || refs[refs.length - 1].file !== f.file) {
      refs.push({ file: f.file, tSec: +f.tSec.toFixed(2), clock: secToClock(f.tSec) });
    }
  }
  return refs;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function resolvePackDir() {
  const argIdx = process.argv.indexOf("--pack");
  const fromArg = argIdx !== -1 ? process.argv[argIdx + 1] : undefined;
  const dir = fromArg || process.env.SIDEKICK_PACK_DIR || DEFAULT_PACK_DIR;
  if (!fs.existsSync(dir)) {
    fail(
      `Pack folder not found: ${dir}\n` +
        `  Extract the release archive locally, then point the importer at it:\n` +
        `    npm run sidekick:import:draft -- --pack "<extracted folder>"\n` +
        `  (See tools/sidekick-import/README.md.)`,
    );
  }
  return dir;
}

function main() {
  const packDir = resolvePackDir();
  const outDir = path.join(HERE, "output");
  fs.mkdirSync(outDir, { recursive: true });

  // 1 · Transcript.
  const vttPath = ["transcript.vtt", "GMT20260707-162904_Recording.transcript.vtt"]
    .map((n) => path.join(packDir, n))
    .find((p) => fs.existsSync(p));
  if (!vttPath) fail(`No transcript.vtt found in ${packDir}`);
  const cues = parseVtt(fs.readFileSync(vttPath, "utf8"));
  if (cues.length === 0) fail(`Transcript parsed to zero cues: ${vttPath}`);

  // 2 · Frames.
  const { frames, source: frameSource } = loadFrames(packDir);

  // 3 · Per-cue nearest frames.
  const segments = cues.map((c) => ({
    ...c,
    startClock: secToClock(c.startSec),
    endClock: secToClock(c.endSec),
    nearestFrames: {
      start: frames[nearestFrameIdx(frames, c.startSec)].file,
      mid: frames[nearestFrameIdx(frames, (c.startSec + c.endSec) / 2)].file,
      end: frames[nearestFrameIdx(frames, c.endSec)].file,
    },
  }));

  // 4 · Candidate demo moments.
  const groups = groupCues(cues);
  const candidates = groups.map((g, i) => {
    const text = g.cues.map((c) => c.text).join(" ");
    const { module, confidence, matchedKeywords } = guessModule(text);
    const title = guessTitle(g, module);
    const frameRefs = sampleFrames(frames, g.startSec, g.endSec, FRAMES_PER_MOMENT);
    const speakers = [...new Set(g.cues.map((c) => c.speaker).filter(Boolean))];
    const excerpt = text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX).trimEnd()}…` : text;
    return {
      id: `moment-${String(i + 1).padStart(3, "0")}-${slugify(title) || "untitled"}`,
      timestampStart: secToClock(g.startSec),
      timestampEnd: secToClock(g.endSec),
      timestampStartSec: +g.startSec.toFixed(2),
      timestampEndSec: +g.endSec.toFixed(2),
      titleGuess: title,
      moduleGuess: module,
      transcriptExcerpt: excerpt,
      frameRefs,
      visibleScreenNotes: "", // reviewer: what is actually on screen in these frames?
      say: `TODO — talk track for “${title}” (source: transcript ${secToClock(g.startSec)}–${secToClock(g.endSec)})`,
      what: "TODO — one-paragraph description of what this screen/moment shows",
      capabilities: [],
      sp: [],
      de: [],
      branching: [],
      confidence,
      order: i + 1,
      matchedKeywords,
      durationSec: +(g.endSec - g.startSec).toFixed(2),
      cueCount: g.cues.length,
      speakers,
    };
  });

  // 5 · Write outputs.
  const write = (name, data) =>
    fs.writeFileSync(path.join(outDir, name), typeof data === "string" ? data : JSON.stringify(data, null, 2));

  write("transcript_segments.json", { source: path.basename(vttPath), cueCount: segments.length, segments });
  write("frame_index.json", {
    source: frameSource,
    frameCount: frames.length,
    cadenceSec: FRAME_CADENCE_S,
    firstSec: frames[0].tSec,
    lastSec: frames[frames.length - 1].tSec,
    frames,
  });
  write("screen_state_candidates.json", {
    generatedFrom: { pack: packDir, transcript: path.basename(vttPath), frames: frameSource },
    grouping: { gapSec: GROUP_GAP_S, maxSec: GROUP_MAX_S },
    momentCount: candidates.length,
    // Same moments minus the draft placeholders — this file is the "what's on
    // screen here?" review queue, not the entry draft.
    moments: candidates.map((c) => {
      const rest = { ...c };
      for (const k of ["say", "what", "capabilities", "sp", "de", "branching"]) delete rest[k];
      return rest;
    }),
  });
  write("draft_catalog_entries.json", { momentCount: candidates.length, entries: candidates });

  const md = [
    `# Draft Sidekick catalog entries — review pass`,
    ``,
    `Generated deterministically from \`${path.basename(vttPath)}\` + ${frames.length} dense frames (${frameSource}).`,
    `**Nothing here is written to the app or the database.** Review each moment, fill the TODOs, fix the`,
    `module/title guesses, then hand the curated entries over for catalog/override import.`,
    ``,
    `| # | Module guess | Confidence | Range | Title guess |`,
    `|---|---|---|---|---|`,
    ...candidates.map(
      (c) => `| ${c.order} | ${c.moduleGuess} | ${c.confidence} | ${c.timestampStart}–${c.timestampEnd} | ${c.titleGuess.replace(/\|/g, "\\|")} |`,
    ),
    ``,
    ...candidates.flatMap((c) => [
      `---`,
      ``,
      `## ${c.order}. ${c.titleGuess}`,
      ``,
      `- **id:** \`${c.id}\``,
      `- **module guess:** \`${c.moduleGuess}\` (confidence: ${c.confidence}${c.matchedKeywords.length ? `; matched: ${c.matchedKeywords.join(", ")}` : ""})`,
      `- **timestamp:** ${c.timestampStart} → ${c.timestampEnd} (${c.durationSec}s, ${c.cueCount} cues${c.speakers.length ? `; ${c.speakers.join(", ")}` : ""})`,
      `- **frames:** ${c.frameRefs.map((f) => `\`${f.file}\``).join(" · ")}`,
      ``,
      `> ${c.transcriptExcerpt}`,
      ``,
      `**Visible screen notes:** _(fill in after eyeballing the frames)_`,
      ``,
      `**say:** ${c.say}`,
      ``,
      `**what:** ${c.what}`,
      ``,
      `**capabilities / sp / de / branching:** _(fill in)_`,
      ``,
    ]),
  ].join("\n");
  write("draft_catalog_entries.md", md);

  console.log(`✓ Pack: ${packDir}`);
  console.log(`✓ Transcript: ${path.basename(vttPath)} → ${cues.length} cues`);
  console.log(`✓ Frames: ${frames.length} (${frameSource})`);
  console.log(`✓ Moments: ${candidates.length}`);
  console.log(`✓ Output → ${outDir}`);
  for (const f of [
    "transcript_segments.json",
    "frame_index.json",
    "screen_state_candidates.json",
    "draft_catalog_entries.json",
    "draft_catalog_entries.md",
  ]) {
    console.log(`   - ${f}`);
  }
}

main();

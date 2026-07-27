// "Live context" — the auto-assembled, dated context for a stage panel.
// Replaces guessing at a free-text box: the newest relevant snippets, deduped
// against note surfaces already on screen, flagged when something changed
// since the stage went active. The manual field shrinks to one judgment line.

import { redactMoney } from "./lexicon";
import type { CorpusDoc } from "./extract";

export type LiveContextLine = { at: string; src: string; text: string };
export type LiveContext = {
  lines: LiveContextLine[];
  changedSinceActive: boolean;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);

export function liveContextFor(
  docs: CorpusDoc[],
  opts: {
    activatedAt?: string; // ISO when this node first went active ("" = never)
    excludeTexts?: string[]; // note bodies already rendered on this panel
    max?: number;
  } = {},
): LiveContext {
  const excl = new Set((opts.excludeTexts ?? []).map(norm));
  const max = opts.max ?? 4;
  const lines: LiveContextLine[] = [];
  const used = new Set<string>();
  for (const d of docs) {
    const key = norm(d.text);
    if (excl.has(key) || used.has(key)) continue;
    used.add(key);
    lines.push({
      at: d.at,
      src: d.src,
      text: redactMoney(d.text.replace(/\s+/g, " ").trim()).slice(0, 180),
    });
    if (lines.length >= max) break;
  }
  const activated = opts.activatedAt ? Date.parse(opts.activatedAt) : NaN;
  const changedSinceActive =
    !Number.isNaN(activated) && lines.some((l) => Date.parse(l.at) > activated);
  return { lines, changedSinceActive };
}

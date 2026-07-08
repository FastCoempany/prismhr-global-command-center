// The Stash summarizer — pure, deterministic, offline. Every capture gets an
// instant one-line micro-note; "Sharpen" is an optional heavier pass that strips
// spoken filler before clipping. No network, no model — safe to run per capture
// and trivially unit-testable. (A future version can swap sharpen() for an LLM
// call; the deterministic default is the floor, never a dependency.)

const MICRO_MAX = 90;

// Spoken/live-note filler that adds nothing to a micro-note.
const FILLER =
  /\b(?:um+|uh+|erm+|like|you know|basically|actually|really|literally|just|kind of|sort of|i mean|i guess|sorta|kinda)\b/gi;

// Leading conjunctions/hedges that a tightened note doesn't need.
const LEADING = /^(?:so|and|but|well|okay|ok|yeah|right|anyway|now)\b[\s,]*/i;

// Collapse all whitespace (including newlines) to single spaces and trim.
export function cleanText(raw: string): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

// Clip to a word boundary near `max`, drop trailing punctuation, add an ellipsis
// only when we actually truncated.
function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,.;:—–-]+$/, "");
  return `${base}…`;
}

// The instant micro-note: cleaned + clipped to one readable line.
export function microNote(raw: string, max: number = MICRO_MAX): string {
  return clip(cleanText(raw), max);
}

// Sharpen: strip filler + a leading hedge, re-collapse, sentence-case, then clip.
// Deterministic — same input always yields the same tightened line.
export function sharpen(raw: string, max: number = MICRO_MAX): string {
  let s = cleanText(raw).replace(FILLER, " ");
  s = s.replace(/\s+/g, " ").trim().replace(LEADING, "");
  if (!s) return microNote(raw, max);
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return clip(s, max);
}

// The three lanes a capture can route to, and where each lands.
export type StashLane = "todo" | "follow" | "gap";

export function isStashLane(v: string): v is StashLane {
  return v === "todo" || v === "follow" || v === "gap";
}

export const STASH_LANES: { key: StashLane; label: string; lands: string }[] = [
  { key: "todo", label: "To-do", lands: "Notetaker" },
  { key: "follow", label: "Follow-up", lands: "Follow-ups" },
  { key: "gap", label: "Gap", lands: "Voice of the base" },
];

// Phase 3 · SEGMENT — one capture becomes the conversations it actually holds.
//
// The tempting shortcut is one capture = one document. It fails three ways: a
// day of a busy chat holds four unrelated conversations and extracting them as
// one produces claims stripped of the conversation that gave them meaning;
// retrieval returning a 200-message document is not a useful thing to return;
// and drilldown Level 2 needs "the passage in its context", where the context
// is the conversation, not the day.
//
// Mechanical first, model second. The cheap signals below do the splitting; the
// model (in the server action) may only MERGE adjacent segments, never split
// further. That asymmetry keeps segmentation deterministic and cheap.

import { SEGMENT_GAP_MINUTES, SEGMENT_MSG_CAP } from "./doctrine";
import { checksum, msgKey } from "./normalize";
import type { Msg, Segment } from "./types";

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

function speakerSet(msgs: Msg[]): Set<string> {
  return new Set(msgs.map((m) => m.speaker).filter(Boolean));
}

/** How much two speaker sets differ, 0 (identical) to 1 (disjoint). */
function drift(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const s of b) if (a.has(s)) shared += 1;
  return 1 - shared / b.size;
}

/** Render a segment's messages as the body the extractor reads. Speakers stay
 *  attached to their own words — this is the shape the attribution rule leans
 *  on, so it is never flattened. */
export function renderSegment(msgs: Msg[]): string {
  return msgs
    .map((m) => `${m.speaker}: ${m.body}`.trim())
    .join("\n\n")
    .trim();
}

/** Boundaries, in the order they are checked. Any one opens a new segment. */
export function segmentMessages(msgs: Msg[]): Segment[] {
  const kept = (msgs ?? []).filter((m) => m.body.trim());
  if (kept.length === 0) return [];

  const groups: Msg[][] = [];
  let cur: Msg[] = [];

  for (const m of kept) {
    if (cur.length === 0) {
      cur.push(m);
      continue;
    }
    const prev = cur[cur.length - 1];
    const gapMs = Date.parse(m.at) - Date.parse(prev.at);
    const gapOpens = Number.isFinite(gapMs) && gapMs > SEGMENT_GAP_MINUTES * 60_000;
    const dayOpens = dayKey(m.at) !== "" && dayKey(m.at) !== dayKey(prev.at);
    const capOpens = cur.length >= SEGMENT_MSG_CAP;
    // The room emptied and refilled — more than half the voices changed.
    const roomOpens =
      cur.length >= 6 && drift(speakerSet(cur), speakerSet([...cur.slice(-3), m])) > 0.5;

    if (gapOpens || dayOpens || capOpens || roomOpens) {
      groups.push(cur);
      cur = [m];
    } else {
      cur.push(m);
    }
  }
  if (cur.length) groups.push(cur);

  return groups.map(toSegment);
}

function toSegment(msgs: Msg[]): Segment {
  const body = renderSegment(msgs);
  return {
    // Keyed on the FIRST message's identity, so a re-capture of the same
    // conversation lands on the same segment rather than a new one.
    key: checksum(msgKey(msgs[0])),
    msgs,
    occurredAt: msgs[0].at,
    speakers: [...speakerSet(msgs)],
    body,
  };
}

/** Apply the model's merge verdicts. `merges[i] === true` means segment i+1 is
 *  a continuation of segment i. The model may only join; it can never split,
 *  which is why this takes booleans rather than a new segmentation. */
export function applyMerges(segments: Segment[], merges: boolean[]): Segment[] {
  if (segments.length <= 1) return segments;
  const out: Segment[] = [];
  let acc: Msg[] = [...segments[0].msgs];
  for (let i = 1; i < segments.length; i += 1) {
    if (merges[i - 1]) {
      acc = acc.concat(segments[i].msgs);
    } else {
      out.push(toSegment(acc));
      acc = [...segments[i].msgs];
    }
  }
  out.push(toSegment(acc));
  return out;
}

/** The first line of each segment — all the merge call ever sees. It never
 *  reads the bodies, which is what keeps it costing fractions of a cent. */
export function mergeProbe(segments: Segment[]): string[] {
  return segments.map((s) => {
    const first = s.msgs[0];
    return `${first.speaker}: ${first.body.split("\n")[0].slice(0, 140)}`;
  });
}

// ── transcripts ─────────────────────────────────────────────────────────────
// A meeting or demo transcript is ONE document unless it is very long, because
// its whole value is the arc of the conversation. When it must split, it splits
// on a blank-line boundary with an overlap, so a claim spanning the seam
// survives whole in one half rather than broken across both.

const TRANSCRIPT_CHAR_CAP = 32_000; // ~8k tokens
const TRANSCRIPT_OVERLAP = 800;

export function segmentTranscript(body: string, occurredAtIso: string): Segment[] {
  const text = (body ?? "").trim();
  if (!text) return [];
  if (text.length <= TRANSCRIPT_CHAR_CAP) {
    return [
      {
        key: checksum(text.slice(0, 200)),
        msgs: [],
        occurredAt: occurredAtIso,
        speakers: [],
        body: text,
      },
    ];
  }

  const out: Segment[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + TRANSCRIPT_CHAR_CAP, text.length);
    if (end < text.length) {
      // Prefer a paragraph break near the cut; fall back to a sentence end.
      const window = text.slice(end - 1200, end);
      const para = window.lastIndexOf("\n\n");
      const stop = para >= 0 ? para : window.lastIndexOf(". ");
      if (stop >= 0) end = end - 1200 + stop + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk)
      out.push({
        key: checksum(`${occurredAtIso}|${start}|${chunk.slice(0, 120)}`),
        msgs: [],
        occurredAt: occurredAtIso,
        speakers: [],
        body: chunk,
      });
    if (end >= text.length) break;
    start = Math.max(end - TRANSCRIPT_OVERLAP, start + 1);
  }
  return out;
}

/** A fallback title, used when the titling call is unavailable. Never left
 *  blank: the title is what the operator reads at Level-3 drilldown. */
export function fallbackTitle(space: string, seg: Segment): string {
  const first = seg.msgs[0]?.body ?? seg.body;
  const gist = first.replace(/\s+/g, " ").trim().slice(0, 60);
  return `${space || "Capture"} — ${gist}${gist.length >= 60 ? "…" : ""}`;
}

/** Days between two instants, floored, never negative. */
export function daysBetweenIso(a: string, b: string): number {
  const x = Date.parse(a);
  const y = Date.parse(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return 0;
  return Math.max(0, Math.floor(Math.abs(y - x) / DAY_MS));
}

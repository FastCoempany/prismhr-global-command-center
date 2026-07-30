// Phase 2 · NORMALIZE — everything between a raw capture arriving and the first
// row being written. Pure, so the whole chain is unit-testable without a
// database or a browser.
//
// The order is fixed and it matters:
//
//   scrubSecrets → redactMoney → dialect → messages → speakers → links → checksum
//
// scrubSecrets runs FIRST because a passcode that survives into storage is
// already a leak, and redactMoney runs before anything is persisted because the
// pre-redaction text is never written down. There is no "original" to leak.

import { createHash } from "node:crypto";
import { scrubSecrets } from "@/lib/sf-timeline";
import { redactMoney } from "@/lib/intel/lexicon";
import { normPerson } from "@/lib/intel/provenance";
import type { CaptureReport, CapturedLink, Msg, NormalizedCapture } from "./types";
import type { Origin } from "./doctrine";

// ── the capture grammar ─────────────────────────────────────────────────────
// The v2 Teams grab emits delimited messages rather than a wall of innerText.
// This is what stops the extractor inferring who spoke from indentation, and
// what makes overlap dedupe possible on message identity.
//
//   ⟦MSG⟧ Lindsey Forrest ⟦AT⟧ 2026-07-30T12:03 ⟦BODY⟧
//   So does it go like this:
//   • Plan Highlights …
//
const MSG_RE =
  /⟦MSG⟧\s*([^⟦]*?)\s*⟦AT⟧\s*([^⟦]*?)\s*⟦BODY⟧\n?([\s\S]*?)(?=⟦MSG⟧|⟦LINKS⟧|⟦CAPTURED|$)/g;
const LINKS_BLOCK_RE = /⟦LINKS⟧([\s\S]*?)(?=⟦CAPTURED|$)/;
const LINK_LINE_RE = /^\s*\[(\d+)\]\s*(.+?)\s*·\s*(\S+|—)\s*(?:·\s*(.*))?$/;
const REPORT_RE =
  /⟦CAPTURED\s+(\d+)\s+messages?\s*·\s*scrolled\s+(\d+)\s*·\s*oldest\s+([^\s·⟧]+)(\s*·\s*ceiling)?\s*⟧/;

/** Heads the capture tools stamp, so the dialect is read rather than guessed. */
const HEAD_TEAMS = /^TEAMS THREAD\b/;
const HEAD_OUTLOOK = /^OUTLOOK THREAD\b/;

export function detectOrigin(raw: string, hint?: Origin): Origin {
  const head = (raw ?? "").trimStart();
  if (HEAD_TEAMS.test(head)) return "teams";
  if (HEAD_OUTLOOK.test(head)) return "paste";
  if (hint) return hint;
  return "paste";
}

/** The space a capture came from — a disambiguation label, never a partition
 *  (I.7). Read off the stamped head: "TEAMS THREAD - Global Sales Team - …". */
export function readSpace(raw: string): string {
  const first = (raw ?? "").trimStart().split("\n")[0] ?? "";
  const m = /^(?:TEAMS|OUTLOOK) THREAD\s*-\s*(.+?)\s*-\s*captured\b/i.exec(first);
  if (m) return m[1].trim().slice(0, 120);
  const m2 = /^(?:TEAMS|OUTLOOK) THREAD\s*-\s*(.+)$/i.exec(first);
  return m2
    ? m2[1]
        .replace(/\s*-\s*captured.*$/i, "")
        .trim()
        .slice(0, 120)
    : "";
}

// ── time ────────────────────────────────────────────────────────────────────
// The grab resolves relative stamps in the browser, where the day dividers are.
// Anything that still arrives unresolved is stamped with the capture time and
// flagged, so the citation can say so instead of pretending (Phase 2.3c).
function readAt(raw: string, fallbackIso: string): { at: string; inferred: boolean } {
  const s = (raw ?? "").trim();
  if (!s) return { at: fallbackIso, inferred: true };
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return { at: new Date(t).toISOString(), inferred: false };
  return { at: fallbackIso, inferred: true };
}

// ── messages ────────────────────────────────────────────────────────────────
/** Parse the delimited form. A capture with no delimiters (a plain paste, a
 *  transcript) yields a single message carrying the whole body — segmentation
 *  handles those on length rather than on turns. */
export function readMessages(body: string, capturedAtIso: string): Msg[] {
  const out: Msg[] = [];
  MSG_RE.lastIndex = 0;
  for (const m of body.matchAll(MSG_RE)) {
    const speaker = normPerson(m[1] ?? "");
    const { at, inferred } = readAt(m[2] ?? "", capturedAtIso);
    const text = (m[3] ?? "").trim();
    if (!text) continue;
    out.push({ speaker: speaker || "unknown", at, atInferred: inferred, body: text });
  }
  return out;
}

// ── links ───────────────────────────────────────────────────────────────────
/** Read the companion LINKS block. A row whose URL is "—" is a preview card
 *  Teams wouldn't give up — the label survives so the operator can search for
 *  it (I.6). */
export function readLinks(body: string, capturedAtIso: string): CapturedLink[] {
  const block = LINKS_BLOCK_RE.exec(body);
  if (!block) return [];
  const out: CapturedLink[] = [];
  for (const line of block[1].split("\n")) {
    const m = LINK_LINE_RE.exec(line);
    if (!m) continue;
    const label = (m[2] ?? "").trim().slice(0, 200);
    const rawUrl = (m[3] ?? "").trim();
    if (!label) continue;
    out.push({
      label,
      url: rawUrl && rawUrl !== "—" ? rawUrl.slice(0, 500) : null,
      seenAt: capturedAtIso,
    });
  }
  return out.slice(0, 40);
}

export function readReport(body: string): CaptureReport | null {
  const m = REPORT_RE.exec(body ?? "");
  if (!m) return null;
  return {
    messages: Number(m[1]) || 0,
    scrolled: Number(m[2]) || 0,
    oldest: m[3] ?? "",
    ceilingHit: Boolean(m[4]),
  };
}

/** Strip the grab's own scaffolding, so the stored body is conversation only. */
export function stripScaffolding(body: string): string {
  return (body ?? "")
    .replace(LINKS_BLOCK_RE, "")
    .replace(REPORT_RE, "")
    .replace(/^(?:TEAMS|OUTLOOK) THREAD\b.*$/im, "")
    .trim();
}

// ── identity ────────────────────────────────────────────────────────────────
/** A message's identity, for overlap dedupe across re-grabs (Phase 2.5).
 *  Speaker + instant + the first 60 characters — enough to be unique, stable
 *  under a re-capture, and immune to a trailing edit. */
export function msgKey(m: Msg): string {
  return `${m.speaker}|${m.at}|${m.body.slice(0, 60).replace(/\s+/g, " ").trim()}`;
}

export function checksum(s: string): string {
  return createHash("sha256")
    .update((s ?? "").replace(/\s+/g, " ").trim())
    .digest("hex")
    .slice(0, 32);
}

// ── the chain ───────────────────────────────────────────────────────────────
export function normalizeCapture(
  raw: string,
  opts: { origin?: Origin; capturedAt?: Date; title?: string } = {},
): NormalizedCapture {
  const capturedAt = opts.capturedAt ?? new Date();
  const capturedAtIso = capturedAt.toISOString();

  // Secrets first, money second. Neither ever reaches storage or a model.
  const safe = redactMoney(scrubSecrets(raw ?? ""));

  const origin = detectOrigin(safe, opts.origin);
  const space = readSpace(safe);
  const links = readLinks(safe, capturedAtIso);
  const report = readReport(safe);
  const body = stripScaffolding(safe);
  const msgs = readMessages(body, capturedAtIso);

  return {
    origin,
    space,
    title: (opts.title ?? space ?? "").slice(0, 200),
    body,
    msgs,
    links,
    report,
    checksum: checksum(body),
  };
}

/** Which messages in a fresh capture the brain has not seen before. Overlap is
 *  computed on message identity, never on fuzzy text similarity — a re-grab
 *  after twenty new messages must add twenty, not double the thread (F9). */
export function unseenMessages(fresh: Msg[], seenKeys: Set<string>): Msg[] {
  return fresh.filter((m) => !seenKeys.has(msgKey(m)));
}

/** The receipt the operator reads after a capture. States what actually
 *  happened, including what was skipped — silence about a skip reads as a
 *  capture that took everything. */
/** The receipt speaks in sentences, like a person would (IV.9) — never in
 *  fragment-and-dot pipeline shorthand. */
export function captureReceipt(input: {
  space: string;
  kept: number;
  skipped: number;
  links: number;
  report: CaptureReport | null;
}): string {
  let head = `Got it — ${input.kept} message${input.kept === 1 ? "" : "s"}${
    input.space ? ` from ${input.space}` : ""
  }`;
  if (input.report?.oldest) head += `, going back to ${input.report.oldest}`;
  if (input.links > 0)
    head += `, with ${input.links} link${input.links === 1 ? "" : "s"}`;
  const parts = [`${head}.`];
  if (input.skipped > 0)
    parts.push(`${input.skipped} already in the brain, so I skipped those.`);
  if (input.report?.ceilingHit)
    parts.push(
      "The scroll stopped at its safety ceiling — run it again from further up and I'll take the rest.",
    );
  return parts.join(" ");
}

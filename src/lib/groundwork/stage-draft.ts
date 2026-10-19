// The draft on the stage (ship order 2026-10-19; CLAUDE.md, "The draft on
// the stage"). Each email move in the queue carries its note drafted before
// the send band, kept as a stagedraft:<account> note; the stage shows it as
// a letter, Send opens it in Outlook, and the sent copy coming back through
// the inbound route is the touch. Pure, so the suite holds every grammar.
//
//   stagedraft:<accountId> — the move's draft. Newest for the move key wins.
//     The drafts job writes it before the send band, Redraft writes a fresh
//     one, and an edit on the stage saves it as the operator's own hand.
//   sendwait:<accountId>   — Send's marker: the move left for the wing and
//     the sent copy has not come back yet. Its body is the move key.
//
// Money is redacted at the write site, like everywhere else; a draft is
// never filed to the record. What went out is the record, by the sent copy.

import { redactMoney } from "@/lib/intel/lexicon";
import { userDayKey } from "@/lib/tz";
import type { QueueRuleId } from "./day";

export const STAGE_DRAFT_NS = "stagedraft:";
export const SEND_WAIT_NS = "sendwait:";

/** A draft older than this no longer speaks for its move. */
export const DRAFT_KEEP_DAYS = 3;

/** The moves the stage drafts as an email: the composer writes each one to
 *  the account's own person. The LinkedIn rules, the relays to a colleague
 *  and the research recipes keep the composed thing and its Copy. */
export const EMAIL_RULES: ReadonlySet<QueueRuleId> = new Set<QueueRuleId>([
  "seated",
  "wire-trigger",
  "intent-warm",
  "silence-bump",
  "cold-revival",
  "engaged-never-introduced",
  "second-record-gem",
  "never-touched-incumbent",
]);

export const isEmailRule = (rule: string): boolean =>
  EMAIL_RULES.has(rule as QueueRuleId);

/** Who wrote the draft: the drafts job or Redraft (model), the rule's
 *  composer when the model had no answer (template), or the operator's own
 *  edit (hand). */
export type DraftBy = "model" | "template" | "hand";

/** The evidence a draft may stand on, by key. The fold says which ones the
 *  note used. */
export const EVIDENCE_KEYS = [
  "wire",
  "research",
  "gem",
  "intent",
  "support",
  "record",
  "person",
] as const;
export type EvidenceKey = (typeof EVIDENCE_KEYS)[number];

export type StageDraft = {
  day: string;
  mk: string;
  by: DraftBy;
  to: string;
  email: string;
  subject: string;
  uses: EvidenceKey[];
  body: string;
};

const HEAD = "✎ STAGE DRAFT · ";
const one = (s: string, cap: number) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, cap);

export function renderStageDraft(d: StageDraft): string {
  return [
    `${HEAD}${d.day} · ${d.mk} · ${d.by}`,
    `TO ${one(d.to, 120)}`,
    `EMAIL ${one(d.email, 160)}`,
    `SUBJECT ${one(redactMoney(d.subject), 160)}`,
    `USES ${d.uses.filter((u) => EVIDENCE_KEYS.includes(u)).join(",")}`,
    redactMoney((d.body ?? "").replace(/\r/g, "").trim()).slice(0, 6000),
  ].join("\n");
}

export function parseStageDraft(body: string): StageDraft | null {
  const lines = (body ?? "").split("\n");
  if (!lines[0]?.startsWith(HEAD)) return null;
  const [day, mk, by] = lines[0].slice(HEAD.length).split(" · ");
  const field = (i: number, k: string) =>
    lines[i]?.startsWith(`${k} `) || lines[i] === k ? lines[i].slice(k.length + 1) : null;
  const to = field(1, "TO");
  const email = field(2, "EMAIL");
  const subject = field(3, "SUBJECT");
  const uses = field(4, "USES");
  if (!day || !mk || to === null || email === null || subject === null || uses === null)
    return null;
  return {
    day: day.trim(),
    mk: mk.trim(),
    by:
      by?.trim() === "model" || by?.trim() === "hand"
        ? (by.trim() as DraftBy)
        : "template",
    to: to.trim(),
    email: email.trim(),
    subject: subject.trim(),
    uses: uses
      .split(",")
      .map((u) => u.trim())
      .filter((u): u is EvidenceKey => (EVIDENCE_KEYS as readonly string[]).includes(u)),
    body: lines.slice(5).join("\n").trim(),
  };
}

/** The move's draft: the newest stagedraft note for this move key, written
 *  inside the keep window. Notes arrive newest first. */
export function draftForMove(
  notes: readonly { body: string; createdAt: string }[] | undefined,
  mk: string,
  now: Date,
): (StageDraft & { at: string }) | null {
  const floor = now.getTime() - DRAFT_KEEP_DAYS * 86_400_000;
  for (const n of notes ?? []) {
    const t = Date.parse(n.createdAt);
    if (Number.isNaN(t) || t < floor) continue;
    const d = parseStageDraft(n.body);
    if (d && d.mk === mk) return { ...d, at: n.createdAt };
  }
  return null;
}

/** Whether the move already has today's draft, so the job skips it. A draft
 *  from an earlier day still stands on the stage until today's lands. */
export const draftedToday = (d: { day: string } | null, now: Date): boolean =>
  !!d && d.day === userDayKey(now);

/** The stage's action line for an email move: the person and the channel,
 *  "Email Cristina." The queue's own line stays the wing's, and stands when
 *  the move is not an email or no first name is known. */
export function stageAction(
  item: { ruleId: string; action: string },
  toName: string,
): string {
  const first = (toName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!isEmailRule(item.ruleId) || !first || /^(the|unassigned)$/i.test(first))
    return item.action;
  return `Email ${first}.`;
}

/** The mailto Send opens: Outlook takes the address, the subject and the
 *  body as they stand on the stage. */
export function mailtoHref(d: { email: string; subject: string; body: string }): string {
  const q = new URLSearchParams();
  if (d.subject) q.set("subject", d.subject);
  if (d.body) q.set("body", d.body);
  // URLSearchParams writes spaces as "+", which mail clients keep literally.
  const query = q.toString().replace(/\+/g, "%20");
  return `mailto:${encodeURIComponent(d.email ?? "").replace(/%40/g, "@")}${query ? `?${query}` : ""}`;
}

/** The draft's line under the letter: who drafted it and when. */
export function draftedLine(
  d: { by: DraftBy; at: string } | null,
  clock: string,
): string {
  if (!d) return "Drafted from the move's template";
  if (d.by === "model") return `Drafted ${clock} from the record`;
  if (d.by === "hand") return `Your edit, saved ${clock}`;
  return "Drafted from the move's template";
}

// ── Why this note ─────────────────────────────────────────────────────────

export type WhyLine = {
  key: EvidenceKey | "collision";
  /** The chip's own short label, as the row of doors spells it. */
  label: string;
  /** What it means, said plainly. */
  meaning: string;
  /** Whether the note uses it; null when the line is an instruction. */
  used: boolean | null;
};

const monthDay = (day: string): string => {
  const t = Date.parse(`${day.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
};

/** The chips, each said as what it means and whether the draft used it.
 *  The collision flag reads as an instruction: it informs, never blocks. */
export function whyLines(
  input: {
    gem?: { term: string; reason: string } | null;
    support?: { total: number; spikeDay: string; spikeN: number } | null;
    intent?: { opens30: number; clicks30: number } | null;
    collision?: {
      mktgSends7: number;
      colleague: { who: string; day: string } | null;
    } | null;
  },
  uses: readonly EvidenceKey[],
): WhyLine[] {
  const out: WhyLine[] = [];
  const used = (k: EvidenceKey) => uses.includes(k);
  if (input.gem?.term)
    out.push({
      key: "gem",
      label: `◆ ${input.gem.term}`,
      meaning: redactMoney(input.gem.reason || "A verified note from the export."),
      used: used("gem"),
    });
  if (input.intent && (input.intent.opens30 > 0 || input.intent.clicks30 > 0))
    out.push({
      key: "intent",
      label: `Intent · O ${input.intent.opens30} · C ${input.intent.clicks30}`,
      meaning: `They opened ${input.intent.opens30} and clicked ${input.intent.clicks30} marketing emails in 30 days.`,
      used: used("intent"),
    });
  if (input.support && input.support.total > 0) {
    out.push({
      key: "support",
      label: `Support ${input.support.total}`,
      meaning: `${input.support.total} support cases in the last 90 days.`,
      used: used("support"),
    });
    if (input.support.spikeDay)
      out.push({
        key: "support",
        label: `Spike ${input.support.spikeDay.slice(5, 10).replace("-", "/")}`,
        meaning: `Their busiest support day was ${monthDay(input.support.spikeDay)}, ${input.support.spikeN} cases.`,
        used: used("support"),
      });
  }
  const line = collisionInstruction(input.collision ?? null);
  if (line)
    out.push({
      key: "collision",
      label: input.collision?.mktgSends7 ? "Mktg cadence live" : "Colleague's thread",
      meaning: line,
      used: null,
    });
  return out;
}

/** The quiet flag as the letter says it: what to do about it, then the
 *  fact. "" when clear. */
export function collisionInstruction(
  col: { mktgSends7: number; colleague: { who: string; day: string } | null } | null,
): string {
  if (!col) return "";
  if (col.mktgSends7 > 0)
    return `Keep it short. Marketing sent ${col.mktgSends7} this week.`;
  if (col.colleague) {
    const who = (col.colleague.who ?? "").trim().split(/\s+/)[0] || "A colleague";
    const day = monthDay(col.colleague.day);
    return `${who} has a live thread${day ? ` from ${day}` : ""}.`;
  }
  return "";
}

// ── Send's marker and the wing ─────────────────────────────────────────────

/** The move keys Send marked today, per account. */
export function waitsToday(
  notesById: ReadonlyMap<string, readonly { body: string; createdAt: string }[]>,
  dayKey: string,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [id, notes] of notesById) {
    if (!id.startsWith(SEND_WAIT_NS)) continue;
    const accountId = id.slice(SEND_WAIT_NS.length);
    for (const n of notes) {
      const t = Date.parse(n.createdAt);
      if (Number.isNaN(t) || userDayKey(new Date(t)) !== dayKey) continue;
      const set = out.get(accountId) ?? new Set<string>();
      set.add(n.body.trim());
      out.set(accountId, set);
    }
  }
  return out;
}

/** The wing's line for a move Send stamped while its sent copy is still on
 *  the way. */
export const WAITING_ON_COPY = "SENT · WAITING ON THE COPY";

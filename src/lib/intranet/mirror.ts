// Phase 4 · THE APP MIRROR — the brain reads the app.
//
// Every row the app owns becomes a document. Not moved: the home table stays
// the source of truth and each mirror carries `originRef` back to it, so a
// citation can always walk home.
//
// The composition below is the part that matters. A todo alone is a sentence; a
// todo WITH its account, its wall, its fallback and whether it was kept is a
// document worth retrieving. Composing them into prose is what makes "what have
// I actually committed to this week" answerable at all.
//
// C6 · Nothing is ever deleted. A row that vanishes from its home table keeps
// its mirror, stamped with the day it went. The brain remembers what the app
// forgot — that is the point of it.

import { splitFallback } from "@/lib/room/deliverables";
import { splitTags } from "@/lib/today/route-notes";
import { isNamespacedAccountId } from "@/lib/today/overlay";
import { redactMoney } from "@/lib/intel/lexicon";
import { scrubSecrets } from "@/lib/sf-timeline";
import type { Origin } from "./doctrine";

export type MirrorDoc = {
  origin: Origin;
  originRef: string;
  space: string;
  title: string;
  body: string;
  speakers: string[];
  occurredAt: string;
  accountId: string;
};

const OPERATOR = "Antaeus Coe";

function dayOf(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        timeZone: "America/Chicago",
      });
}

/** Strip the record's glyph head so the brain reads the substance, not the
 *  filing dialect. "✉ SF Jul 21 — subject · actors" is scaffolding. */
export function stripHead(body: string): string {
  return (body ?? "")
    .replace(/^[✉✔☎☰⚑✎✓▢✸⏲]\s*(?:SF|OL|TM)?\s*/u, "")
    .replace(/^[^\n]*—\s*/u, (m) => (m.length < 90 ? "" : m))
    .trim();
}

/** F8 · the redaction floor for the mirror.
 *
 *  Pasted text is cleaned inside normalizeCapture before its first write. The
 *  app's own rows arrive by a different road — and an account note can carry a
 *  quoted figure or a dial-in passcode just as easily as a Teams thread can. So
 *  every mirrored line passes through here, and every composed document below
 *  is built from `clean()` output rather than raw column text.
 *
 *  Headcount survives on purpose: "1,200 employees" is sizing intel. */
export function clean(s: string): string {
  return redactMoney(scrubSecrets(s ?? ""));
}

/** The one gate every mirrored document leaves through. Title, space and body
 *  are all rendered somewhere and all reach a model, so all three are cleaned —
 *  there is no "this field is internal" field. */
function sealed(d: MirrorDoc): MirrorDoc {
  return { ...d, space: clean(d.space), title: clean(d.title), body: clean(d.body) };
}

// ── account notes ───────────────────────────────────────────────────────────
export function mirrorAccountNote(
  n: {
    id: string;
    accountId: string;
    body: string;
    kind: string;
    lane: string;
    actors: string;
    source: string;
    createdAt: string;
  },
  accountName: string,
): MirrorDoc | null {
  // Playbook, gaps and research live in namespaces and are handled elsewhere —
  // sweeping them up here would silently double them.
  if (isNamespacedAccountId(n.accountId)) return null;
  const text = stripHead(n.body);
  if (!text) return null;
  const who = n.lane === "mine" ? OPERATOR : n.actors || "the record";
  return sealed({
    origin: "account-note",
    originRef: n.id,
    space: accountName || n.accountId,
    title: `${accountName || n.accountId} — note of ${dayOf(n.createdAt)}`,
    body: `On ${accountName || "this account"}, ${dayOf(n.createdAt)}: ${text}`,
    speakers: [who],
    occurredAt: n.createdAt,
    accountId: n.accountId,
  });
}

// ── actions ─────────────────────────────────────────────────────────────────
/** An action, composed with everything that makes it legible later: what was
 *  owed, by when, what the fallback was, and whether it was kept. */
export function mirrorTodo(
  t: {
    id: string;
    body: string;
    accountId: string;
    done: boolean;
    remindAt: string;
    createdAt: string;
    updatedAt: string;
  },
  accountName: string,
): MirrorDoc | null {
  const { text: tagless } = splitTags(t.body);
  const { text, fallback } = splitFallback(tagless);
  const clean = (text ?? "").replace(/\s*·\s*from [^·]*$/i, "").trim();
  if (!clean) return null;

  const bits: string[] = [];
  bits.push(
    `On ${accountName || "an account"}, an action was opened ${dayOf(t.createdAt)}: ${clean}`,
  );
  if (t.remindAt) bits.push(`due ${dayOf(t.remindAt)}`);
  if (fallback) bits.push(`with the fallback of ${fallback}`);
  const head = `${bits.join(", ")}.`;
  const tail = t.done ? ` It was completed ${dayOf(t.updatedAt)}.` : " It is still open.";

  return sealed({
    origin: "todo",
    originRef: t.id,
    space: accountName || t.accountId,
    title: `${accountName || "Action"} — ${clean.slice(0, 60)}`,
    body: head + tail,
    speakers: [OPERATOR],
    occurredAt: t.createdAt,
    accountId: t.accountId,
  });
}

// ── follow-ups and roundups ─────────────────────────────────────────────────
export function mirrorTouch(t: {
  subjectKey: string;
  kind: string;
  label: string;
  detail: string;
  message: string;
  contactedAt: string;
  status: string;
}): MirrorDoc | null {
  const label = (t.label ?? "").trim();
  if (!label) return null;
  const what =
    t.kind === "custom"
      ? `A follow-up was armed ${dayOf(t.contactedAt)}: ${label}.`
      : `Outreach to ${label} went out ${dayOf(t.contactedAt)}.`;
  const said = t.message ? ` What was said: ${t.message}` : "";
  const state =
    t.status === "replied"
      ? " They replied."
      : t.status === "archived"
        ? " The thread is closed."
        : t.status === "awaiting"
          ? " It is still waiting on them."
          : "";
  return sealed({
    origin: "touch",
    originRef: t.subjectKey,
    space: label,
    title: `Follow-up — ${label.slice(0, 60)}`,
    body: `${what}${said}${state}`,
    speakers: [OPERATOR],
    occurredAt: t.contactedAt,
    accountId: t.subjectKey.startsWith("outreach:")
      ? t.subjectKey.slice("outreach:".length)
      : "",
  });
}

// ── board cards ─────────────────────────────────────────────────────────────
export function mirrorCard(c: {
  id: string;
  name: string;
  states: Record<string, string>;
  notes: Record<string, string>;
  archived: boolean;
  updatedAt: string;
}): MirrorDoc | null {
  const stage = Object.entries(c.states ?? {}).find(([, v]) => v === "active")?.[0] ?? "";
  const judgments = Object.entries(c.notes ?? {})
    .filter(([k, v]) => k !== "discovery" && v)
    .map(([k, v]) => `On ${k}: ${v}`)
    .join(" ");
  const discovery = (c.notes ?? {}).discovery ?? "";
  const body = [
    `${c.name} sits at ${stage || "no stage"} on the board${c.archived ? ", retired" : ""}.`,
    discovery,
    judgments,
  ]
    .filter(Boolean)
    .join(" ");
  if (!body.trim()) return null;
  return sealed({
    origin: "card",
    originRef: c.id,
    space: c.name,
    title: `${c.name} — where the deal stands`,
    body,
    speakers: [OPERATOR],
    occurredAt: c.updatedAt,
    accountId: "",
  });
}

// ── demos (Phase 13.6) ──────────────────────────────────────────────────────
/** A demo's own record, mirrored rather than pasted. The sidekick already
 *  captures what was said on each screen; piping it in means the corpus gets the
 *  demo the moment it ends instead of whenever someone remembers to paste it.
 *
 *  This is where most prospect questions come from (C7), so the composition
 *  keeps the screen — a question asked on the payroll register screen is a
 *  different question from the same words asked on pricing. */
export function mirrorDemoNote(
  n: {
    id: string;
    screenId: string;
    body: string;
    createdAt: string;
  },
  demo: { name: string; company: string; persona: string },
  screenTitle: string,
): MirrorDoc | null {
  const text = stripHead(n.body);
  if (!text) return null;
  const who = demo.company || demo.name || "a prospect";
  const where = screenTitle || n.screenId;
  return sealed({
    origin: "demo",
    originRef: n.id,
    space: who,
    title: `Demo — ${who}, ${where.slice(0, 50)}`,
    body: `In a demo for ${who}${demo.persona ? ` (${demo.persona})` : ""}, on ${where}: ${text}`,
    speakers: ["the demo"],
    occurredAt: n.createdAt,
    accountId: "",
  });
}

// ── partner notes ───────────────────────────────────────────────────────────
export function mirrorPartnerNote(n: {
  id: string;
  partner: string;
  body: string;
  createdAt: string;
}): MirrorDoc | null {
  const text = stripHead(n.body);
  if (!text) return null;
  return sealed({
    origin: "partner-note",
    originRef: n.id,
    space: n.partner,
    title: `${n.partner} — ${dayOf(n.createdAt)}`,
    body: `About ${n.partner}, ${dayOf(n.createdAt)}: ${text}`,
    speakers: [OPERATOR],
    occurredAt: n.createdAt,
    accountId: "",
  });
}

// ── the sync verdict ────────────────────────────────────────────────────────
export type SyncVerdict = "create" | "update" | "skip";

/** What to do with one home row. Unchanged rows are skipped entirely — no
 *  re-extraction, no cost. This is the whole defence against re-extracting the
 *  world on every deploy (F10). */
export function syncVerdict(
  mirroredChecksum: string | null,
  freshChecksum: string,
): SyncVerdict {
  if (mirroredChecksum === null) return "create";
  return mirroredChecksum === freshChecksum ? "skip" : "update";
}

/** C6 — what happens when a home row disappears. Never a delete. */
export function goneStamp(nowIso: string): { originGone: string } {
  return { originGone: nowIso };
}

/** The line every citation to a vanished row carries, so the operator is never
 *  misled about what still exists upstream. */
export function goneLine(originGoneIso: string): string {
  const t = Date.parse(originGoneIso);
  const when = Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Chicago",
      });
  return `From a note that has since been removed from the app${when ? ` (${when})` : ""}.`;
}

// The Act Lane's stores (founder-decreed 2026-08-21, Version C winner of the
// Act Flow triptych). Two small grammars, both AccountNote rows:
//
//   actdraft:<accountId> — the lane's saved, unsent draft. One per account,
//     newest wins. The pad never eats your words: hopping chips or closing
//     the lane saves what was typed; Send consumes the draft.
//
//   seat:<accountId> — the fork's Groundwork half. A seated move leads the
//     wing (rank 95, at most three seats lead) until it is worked, taken
//     back, or the record shows an outbound after the seat.
//
// Money is redacted at the write site, like everywhere else.

import { redactMoney } from "@/lib/intel/lexicon";
import { OPERATOR_NAME } from "@/lib/intel/provenance";

export const ACT_DRAFT_NS = "actdraft:";
export const SEAT_NS = "seat:";

// The row Send files — a real ✉ outbound on the record. Provenance is
// columns (ruled 2026-09-25, D23/P3): every writer fills actors and
// recipients at write, the Act Lane included, and money never reaches the
// body. Pure, so the canon suite pins the row without a database.
export function actSendRow(a: { to: string; subject: string }): {
  body: string;
  lane: "mine";
  actors: string;
  recipients: string;
  source: "act-lane";
} {
  const to = (a.to ?? "").trim();
  const subject = (a.subject ?? "").trim();
  return {
    body: redactMoney(`✉ ${subject || "Sent"} — sent to ${to}.`),
    lane: "mine",
    actors: `${OPERATOR_NAME} → ${to}`,
    recipients: to,
    source: "act-lane",
  };
}

type ActDraft = { term: string; to: string; subject: string; body: string };

export function renderActDraftBody(d: ActDraft): string {
  return [
    `✎ DRAFT · ${d.term || "—"}`,
    `TO ${d.to}`,
    `SUBJECT ${d.subject}`,
    d.body,
  ].join("\n");
}

export function parseActDraftBody(body: string): ActDraft | null {
  const lines = body.split("\n");
  if (!lines[0]?.startsWith("✎ DRAFT · ")) return null;
  const term = lines[0].slice("✎ DRAFT · ".length).trim();
  if (!lines[1]?.startsWith("TO ") || !lines[2]?.startsWith("SUBJECT ")) return null;
  return {
    term: term === "—" ? "" : term,
    to: lines[1].slice(3).trim(),
    subject: lines[2].slice(8).trim(),
    body: lines.slice(3).join("\n"),
  };
}

export type Seat = { act: string; term: string; day: string };

export function renderSeatBody(s: Seat): string {
  return `⚑ ${s.act} · ${s.term || "—"} · seated ${s.day}`;
}

export function parseSeatBody(body: string): Seat | null {
  const m = /^⚑ (.+) · (.+) · seated (\d{4}-\d{2}-\d{2})$/.exec(body.trim());
  if (!m) return null;
  return { act: m[1], term: m[2] === "—" ? "" : m[2], day: m[3] };
}

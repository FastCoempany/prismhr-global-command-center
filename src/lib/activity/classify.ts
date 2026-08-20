// The lane classifier — every second-record row lands in exactly one lane,
// by rules applied in order, first match wins. Lanes classify the ACTIVITY;
// actor-kind classifies the DOOR (a colleague's motion produces coordination
// moves, an account person's produces outreach moves). Machinery is never a
// person: blast receipts, integration users, and engagement receipts never
// move a touch clock, never read as "they wrote," never cite into a gem.
//
// Every rule here was verified against the real 98,455-row export on
// 2026-08-20 — the golden-set test pins the boundaries.

import type { ActivityRow } from "./parse";

// The fixed machinery list — exact names, verified in the export. Additions
// are a code change with a test, never inference (Appendix C).
export const MACHINERY_USERS = [
  "HubSpot Integration User",
  "Salesforce Administrator User",
  "Automated Process",
] as const;

const MACHINERY_SET = new Set<string>(MACHINERY_USERS);

export type ActivityLane = "machinery" | "intent" | "support" | "csm" | "human";

export type LaneFlags = {
  /** A colleague-run sequence (Task Subtype = Cadence / Outreach Task Type
   *  set) — feeds collision awareness; never reads as a personal touch. */
  automated: boolean;
  inboundCall: boolean;
  event: boolean;
  /** Engagement machinery wearing a human lane's clothes: Seismic session
   *  receipts, submitted-form receipts, "Automated Email:" logs. Measured in
   *  the real export hiding inside CSM Task and Service Provider Task rows.
   *  Signal, never a touch — excluded from human clocks, actors, and gems. */
  receipt: boolean;
};

export type LaneRead = {
  lane: ActivityLane;
  /** Intent rows only: which receipt this is. */
  intentKind?: "sent" | "opened" | "clicked";
  /** Intent rows only: the campaign title (the subject's remainder). */
  campaign?: string;
  flags: LaneFlags;
};

// The blast form Salesforce generates: the verb, a space, the campaign title.
// A human email whose subject begins "Sent you the deck" arrives with
// Task Subtype = Email and falls through to HUMAN — rule 2's subtype
// condition is the trap-guard (verified: all 80,654 blast rows in the real
// export carry Task Subtype = Task exactly).
export const INTENT_RE = /^\s*(Sent|Opened|Clicked)\s+/;

// Engagement receipts that are not blast-form but are machinery all the same.
export const RECEIPT_RE = /^\s*(\[Seismic\]|Submitted Form '|Automated Email:)/;

export function laneOf(r: ActivityRow, opts?: { csmRoster?: Set<string> }): LaneRead {
  const flags: LaneFlags = {
    automated: r.taskSubtype === "Cadence" || (r.outreachTaskType ?? "").trim() !== "",
    inboundCall: /inbound/i.test(r.callType ?? ""),
    event: (r.eventSubtype ?? "").trim() !== "",
    receipt: RECEIPT_RE.test(r.subject ?? ""),
  };

  // 1 · machinery by assigned user, exact match.
  if (MACHINERY_SET.has((r.assigned ?? "").trim())) return { lane: "machinery", flags };

  // 2 · blast receipts — subject in the SF-generated form AND subtype Task
  //     (or blank). Tallied, never staged, never a touch.
  const m = INTENT_RE.exec(r.subject ?? "");
  if (m && (r.taskSubtype === "Task" || r.taskSubtype === "")) {
    const verb = m[1].toLowerCase() as "sent" | "opened" | "clicked";
    return {
      lane: "intent",
      intentKind: verb,
      campaign: (r.subject ?? "").slice(m[0].length).trim().slice(0, 120),
      flags,
    };
  }

  // 3 · support by record type; 4 · support by the case-email subject form.
  if (r.recordType === "Support Call") return { lane: "support", flags };
  if (/^\s*Email:\s*PrismHR Case\b/.test(r.subject ?? ""))
    return { lane: "support", flags };

  // 5 · CSM by record type; 6 · CSM by roster when nothing above matched.
  if (r.recordType === "CSM Task") return { lane: "csm", flags };
  if (opts?.csmRoster?.has((r.assigned ?? "").trim())) return { lane: "csm", flags };

  // 7 · everything else is human motion (flags may still say otherwise).
  return { lane: "human", flags };
}

// ── people: colleague, account person, or nobody at all ─────────────────────

export type ActorKind = "colleague" | "account" | "machinery" | "unresolved";

/** The colleague roster, re-derived from the file itself every drop:
 *  everyone who ever appears in Assigned, minus machinery, plus the book's
 *  CSMs and EXTRA_PARTNERS. Zero maintenance (Appendix C). */
export function deriveColleagues(
  assignedNames: Iterable<string>,
  bookCsms: Iterable<string>,
  extraPartners: Iterable<string>,
): Set<string> {
  const out = new Set<string>();
  for (const n of assignedNames) {
    const t = (n ?? "").trim();
    if (t && !MACHINERY_SET.has(t)) out.add(t);
  }
  for (const n of bookCsms) if ((n ?? "").trim()) out.add(n.trim());
  for (const n of extraPartners) if ((n ?? "").trim()) out.add(n.trim());
  return out;
}

/** Who a named person is. A name on both sides of the wall (a Primary
 *  Contact colliding with a colleague name) is UNRESOLVED — the refuter kills
 *  any gem whose act depends on it, and the receipt names the collision. */
export function actorKindOf(
  name: string,
  colleagues: Set<string>,
  accountPeople: Set<string>,
): ActorKind {
  const t = (name ?? "").trim();
  if (!t) return "unresolved";
  if (MACHINERY_SET.has(t)) return "machinery";
  const isColleague = colleagues.has(t);
  const isAccount = accountPeople.has(t);
  if (isColleague && isAccount) return "unresolved";
  if (isColleague) return "colleague";
  if (isAccount) return "account";
  return "unresolved";
}

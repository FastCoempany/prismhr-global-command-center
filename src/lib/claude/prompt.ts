// The drafting-desk prompt assembler. Gathers everything the app knows about a
// partner thread — the roundup actually sent, the reply state, per-account
// worked notes (yours / what the partner said), research intel, and the
// recipient — into one self-contained prompt for Claude. Used two ways: sent to
// the Anthropic API when ANTHROPIC_API_KEY is configured, or copied to the
// clipboard and pasted into claude.ai (no API needed — your subscription does
// the writing).

import { canonForPrompt } from "@/lib/collateral/canon";
import type { AccountIntel } from "@/lib/today/build";
import type { Touch } from "@/lib/today/follow-ups";
import type { AccountNote, PartnerNote } from "@/lib/today/overlay";

export type DraftRecipient = {
  name: string; // "Anika Steenstra" or "Chassie" …
  role: string; // "CSM partner at PrismHR" or "contact at Simploy" …
};

const VOICE = `Write as Antaeus Coe — Senior Global Business Consultant and the SME for PrismHR Global (EOR, global payroll, contractor management). Voice: warm, direct, fast-moving, plain-spoken; short paragraphs; no corporate filler; genuinely appreciative of partners; always concrete about the next step. Sign off with:

Antaeus
312.221.9292`;

function stamp(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function noteLine(n: AccountNote): string {
  const who =
    n.kind === "partner"
      ? `${n.partner.split(" ")[0] || "Partner"} said`
      : n.kind === "mine"
        ? "Me"
        : "Note";
  return `  - [${stamp(n.createdAt)} UTC] ${who}: ${n.body}`;
}

export function buildFollowUpPrompt(opts: {
  partner: string;
  partnerRole: string;
  recipient: DraftRecipient;
  thread: Touch | null; // the partner-outreach thread (message sent, status, log)
  accounts: AccountIntel[]; // the partner's teed-up accounts
  accountNotes: Map<string, AccountNote[]>;
  partnerNotes: PartnerNote[];
  pastedContext: string; // fork 2 — anything the owner pasted (e.g. the reply email)
}): string {
  const {
    partner,
    partnerRole,
    recipient,
    thread,
    accounts,
    accountNotes,
    partnerNotes,
    pastedContext,
  } = opts;

  const lines: string[] = [];
  lines.push(
    `You are drafting a follow-up message for me to send. Everything below is real context from my command-center app — use it, do not invent facts, and do not include anything I haven't said or been told.`,
  );
  lines.push("");
  lines.push(`## Who I am / voice`);
  lines.push(VOICE);
  lines.push("");
  lines.push(
    `## Product canon (from the released collateral — the only product claims allowed)`,
  );
  lines.push(canonForPrompt());
  lines.push("");
  lines.push(`## Recipient`);
  lines.push(`${recipient.name} — ${recipient.role}.`);
  lines.push("");
  lines.push(`## The partner thread with ${partner} (${partnerRole})`);
  if (thread) {
    lines.push(`- Status: ${thread.status} (sent ${stamp(thread.contactedAt)} UTC)`);
    if (thread.message) {
      lines.push(`- The message I actually sent:`);
      lines.push(`"""`);
      lines.push(thread.message);
      lines.push(`"""`);
    }
    if (thread.log.length) {
      lines.push(`- Thread history (oldest first):`);
      for (const e of thread.log) lines.push(`  - [${stamp(e.at)} UTC] ${e.body}`);
    }
  } else {
    lines.push(`- No outreach logged yet — this would be a first touch.`);
  }
  if (partnerNotes.length) {
    lines.push(`- Notes on ${partner}:`);
    for (const n of partnerNotes.slice(0, 10))
      lines.push(`  - [${stamp(n.createdAt)} UTC] ${n.body}`);
  }
  lines.push("");
  lines.push(`## The accounts in play (my research + worked notes)`);
  for (const a of accounts) {
    lines.push(
      `### ${a.name} — Global-fit ${a.score}/100${a.play ? ` · ${a.play}` : ""}${
        a.competitors.length ? ` · incumbent: ${a.competitors.join(", ")}` : ""
      }`,
    );
    if (a.summary) lines.push(`- Research: ${a.summary}`);
    const notes = accountNotes.get(a.id) ?? [];
    if (notes.length) {
      lines.push(`- Worked notes (newest first):`);
      for (const n of notes.slice(0, 8)) lines.push(noteLine(n));
    }
  }
  if (pastedContext.trim()) {
    lines.push("");
    lines.push(
      `## Additional context I'm pasting in (treat as ground truth, quote nothing verbatim back)`,
    );
    lines.push(`"""`);
    lines.push(pastedContext.trim());
    lines.push(`"""`);
  }
  lines.push("");
  lines.push(`## Task`);
  lines.push(
    `Write the follow-up message to ${recipient.name}. Respond to every point they raised (if a reply is included above), accept useful offers concretely (e.g. joining calls — say yes and ask for the invite), answer what can be answered from the context, and end with one clear next step. Keep it tight enough to read in under a minute. Output ONLY the message body, ready to paste.`,
  );
  return lines.join("\n");
}

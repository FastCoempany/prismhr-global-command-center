// roomPaste's pure decisions, kept out of the server action so the suite can
// pin them as behavior: which dialect a capture speaks, what source column it
// files under, and the misfile guard's read-free rung.

import { judgeFiling } from "@/lib/intel/misfile";
import type { RouteAccount } from "@/lib/route-capture";

/** The refusal roomPaste hands back when the guard objects: nothing filed,
 *  nothing opened, the dispute carried for the banner. */
export type PasteRefusal = {
  ok: false;
  filed: 0;
  how: "";
  mismatch: { claim: string; bound: string; why?: string; boundWhy?: string };
  reason: string;
};

/** The misfile guard's FIRST rung, which runs before the read spends a cent
 *  (decreed 2026-09-04). The evidence in the text — a known address, a company
 *  domain, a person the book binds to one account — needs no model at all, so
 *  a capture dropped on the wrong row is refused for free rather than after a
 *  full read. Returns the refusal, or null when the row clears the text. */
export function readFreeVerdict(
  rawText: string,
  acct: { id: string; name: string },
  roster: readonly RouteAccount[],
): PasteRefusal | null {
  const early = judgeFiling({
    text: rawText,
    claim: "",
    bound: { id: acct.id, name: acct.name },
    roster,
  });
  if (early.ok) return null;
  return {
    ok: false,
    filed: 0,
    how: "",
    mismatch: {
      claim: early.claim,
      bound: early.bound,
      why: early.why,
      boundWhy: early.boundWhy,
    },
    reason: `This reads like ${early.claim}, not ${acct.name} — ${early.why}.`,
  };
}

/** The capture's dialect, read off its head token. An Outlook thread must
 *  never masquerade as Salesforce activity. */
export type Dialect = "OL" | "TM" | "CT" | "SN" | "SF";

export function dialectOf(rawText: string): Dialect {
  return /^OUTLOOK THREAD\b/.test(rawText)
    ? "OL"
    : /^TEAMS THREAD\b/.test(rawText)
      ? "TM"
      : /^CALL TRANSCRIPT\b/.test(rawText)
        ? "CT"
        : /^SALESNAV\b/.test(rawText)
          ? "SN"
          : "SF";
}

/** The source column a filed entry carries: the dialect's own name, with the
 *  model's suffix when the read was the model's. */
export function sourceFor(dialect: Dialect, how: string): string {
  const base =
    dialect === "OL"
      ? "outlook"
      : dialect === "TM"
        ? "teams"
        : dialect === "CT"
          ? "call"
          : dialect === "SN"
            ? "salesnav"
            : "sf";
  return `${base}${how === "ai" ? "-ai" : ""}`;
}

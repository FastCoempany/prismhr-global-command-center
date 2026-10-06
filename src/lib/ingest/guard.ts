// The guard plan — two verdicts, each with its reason (the Chute brains
// refactor plan, slice 5; D9 as amended 2026-10-05 — CLAUDE.md, The Chute).
//
// A filing may be disputed twice. The text rung warns before the read, on
// the evidence the text itself carries — a known address, a company domain,
// a person the book binds to one account (readFreeVerdict). The read rung
// warns after the read, when the company the read names is not the row's
// and the row has nothing of its own to stand on (judgeFiling). Each verdict
// carries a reason of nine words or fewer that says why the file looks like
// a different company than the one it was dropped on. The text rung's
// reason is built here from the rule's own why, no model. The read rung's
// reason is the model's (src/lib/ingest/verdict-reason.ts); the rule's
// reason built here is what stands when the model has no answer.
//
// With force no rung runs. The pick is final and files without a re-judge
// (D5): the operator has answered the question, and asking it again would be
// the room arguing with its own operator.
//
// Pure: no store, no model, no request. The composed rungs are pure too
// (misfile.ts over route-capture.ts), so the plan is a function of the text,
// the claim, the row and the roster alone, and the suite pins it as behavior.

import { judgeFiling } from "@/lib/intel/misfile";
import { readFreeVerdict } from "@/lib/room/paste";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";
import { shortName } from "./short-name";

/** Which of the guard's two rungs disputed: the text's own evidence, before
 *  the read, or the read's company claim, after it. */
export type GuardRung = "text" | "read";

export type GuardVerdict = {
  rung: GuardRung;
  /** What the capture reads like — a company name or the account a person
   *  or an address binds to. */
  claim: string;
  /** The row it was dropped on. */
  bound: string;
  /** The rule's own evidence, in the operator's words (it can carry an
   *  address — the doors show it, settled receipts never keep it). */
  why: string;
  /** What the row the operator chose carries for itself — "" when nothing. */
  boundWhy?: string;
  /** The router's reading of the text, for the picker. */
  candidates?: RouteHit[];
  /** Nine words or fewer: why this looks like a different company than the
   *  one it was dropped on. Operator copy under the writing canon. */
  reason: string;
  /** The claimed company's account, when the book holds it under that exact
   *  name or a name it is also known as; absent when it does not (a PEO's
   *  client, most days) or when it is the row itself. The held box's solid
   *  button files here (slice 18a), so a loose match would file a capture
   *  to the wrong company: exact names only, as claimPage reads them. */
  claimId?: string;
  /** "model" when the reason is the model's, read from both accounts' page
   *  data and the web (src/lib/ingest/verdict-reason.ts); absent when the
   *  rule built it. The held box's grounds name it "Web check". */
  reasonBy?: "model";
};

export type GuardPlan = {
  /** The text rung's verdict, or null when the text clears the row. */
  text: GuardVerdict | null;
  /** The read rung's verdict, or null when the claim agrees with the row,
   *  when there is no claim, or when the text rung already disputed — the
   *  text rung answers first, and the pick that answers it runs no rung. */
  read: GuardVerdict | null;
};

/** The reason's cap, by decree: nine words or fewer. */
export const REASON_WORDS = 9;

const wordsOf = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

// The name as a person says it lives in its own module since slice 18a, so
// the held box reads it in the browser without the rungs; re-exported here
// for the suites that pin it beside the reason.
export { shortName };

const normName = (s: string): string =>
  shortName(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The account a claim names, by exact name or a name the book also knows it
 *  by, said the way a person says it ("Simploy, Inc." is Simploy). Undefined
 *  when the book holds no such account, or when the claim names the row it
 *  was dropped on, since filing there is the box's other button. */
export function claimAccountId(
  claim: string,
  roster: readonly RouteAccount[],
  boundId = "",
): string | undefined {
  const key = normName(claim);
  if (!key) return undefined;
  const hit = roster.find(
    (a) => normName(a.name) === key || (a.aka ?? []).some((x) => normName(x) === key),
  );
  return hit && hit.id !== boundId ? hit.id : undefined;
}

/** The claim's account as an optional key: present only when it resolves. */
const claimKey = (
  claim: string,
  roster: readonly RouteAccount[],
  boundId: string,
): { claimId?: string } => {
  const id = claimAccountId(claim, roster, boundId);
  return id ? { claimId: id } : {};
};

const clip = (name: string, words: number): string =>
  name.trim().split(/\s+/).slice(0, words).join(" ");

// The whys misfile.ts can hand back, read back into the evidence they carry.
// The address rung's why holds the address itself; the reason never repeats
// it, because the reason rides settled receipts and an address never does
// (CLAUDE.md, The Chute: D12).
const READ_WHY = /^the read names (.+)$/i;
const CONTACT_WHY = /^(.+?) is (.+)'s contact$/i;
const DOMAIN_WHY = /^(\S+) address in the text$/i;
const NAMED_WHY = /^named in the text$/i;
const HEAD_WHY = /^“(.+)” appears in the text$/i;
const INITIALS_WHY = /^“(.+)” matches the initials$/i;

/** The sentences a rung's why can become, fullest first. Every one is a
 *  plain declarative that names the other company; the budget below picks
 *  the fullest that fits beside the bound's sentence, or alone. */
function primaries(why: string, claim: string): string[] {
  const w = (why ?? "").trim();
  let m: RegExpExecArray | null;
  if (READ_WHY.test(w)) return [`The read names ${claim}.`];
  if ((m = CONTACT_WHY.exec(w))) {
    const who = m[1]!.trim();
    if (who.includes("@"))
      return [
        `${claim}'s contact address is in the text.`,
        `${claim}'s contact address is here.`,
        `${claim}'s contact is here.`,
      ];
    return [`${who} is ${claim}'s contact.`, `${who} is ${claim}'s.`];
  }
  if (DOMAIN_WHY.test(w))
    return [`A ${claim} email address is in the text.`, `A ${claim} address is here.`];
  if (NAMED_WHY.test(w)) return [`${claim} is named in the text.`, `${claim} is named.`];
  if ((m = HEAD_WHY.exec(w)))
    return [`“${m[1]}” in the text points to ${claim}.`, `“${m[1]}” points to ${claim}.`];
  if ((m = INITIALS_WHY.exec(w))) return [`“${m[1]}” matches ${claim}'s initials.`];
  return [`This reads like ${claim}.`];
}

/** The reason, nine words or fewer, built from the rung's why alone: why the
 *  file looks like a different company than the one it was dropped on. The
 *  sentence about the other company comes first; the sentence about the row
 *  it was dropped on rides along when the nine words allow it. A bound row
 *  with evidence of its own is said to show up too, never said to be absent.
 *  Pure, and linted by the suite against every why misfile.ts can produce. */
export function reasonFromWhy(
  why: string,
  bound: string,
  claim: string,
  boundWhy = "",
): string {
  const other = shortName(claim) || "another account";
  const row = shortName(bound);
  const tail = row
    ? boundWhy.trim()
      ? `${row} shows up too.`
      : `Nothing points to ${row}.`
    : "";
  const options = primaries(why, other);
  if (tail)
    for (const p of options)
      if (wordsOf(p) + wordsOf(tail) <= REASON_WORDS) return `${p} ${tail}`;
  for (const p of options) if (wordsOf(p) <= REASON_WORDS) return p;
  // A name too long for any sentence: the shortest sentence over its first
  // words. The full name rides in the verdict's claim for the doors.
  return `This reads like ${clip(other, REASON_WORDS - 3)}.`;
}

export function guardPlan(inp: {
  /** The operator's pick: with force no rung runs (D5). */
  force?: boolean;
  /** The capture's text, as filed. */
  text: string;
  /** The company the read says this is about ("" before the read, and when
   *  it named none). */
  claim: string;
  /** The row it is being filed to. */
  bound: { id: string; name: string };
  /** Every account the book knows, with its routing signals: the joined
   *  roster (C2; src/lib/ingest/route.ts), handed in so this stays pure. */
  roster: readonly RouteAccount[];
}): GuardPlan {
  if (inp.force) return { text: null, read: null };
  const text = inp.text ?? "";
  const bound = inp.bound;
  const { candidates } = routeCapture(text, [...inp.roster]);

  // The text rung, before the read: the composed readFreeVerdict, whose
  // shape the misfile-guard suite pins; the plan adds the rung and the reason.
  const early = readFreeVerdict(text, bound, inp.roster);
  if (early) {
    const { claim, bound: boundName, why = "", boundWhy = "" } = early.mismatch;
    return {
      text: {
        rung: "text",
        claim,
        bound: boundName,
        why,
        boundWhy,
        candidates,
        reason: reasonFromWhy(why, boundName, claim, boundWhy),
        ...claimKey(claim, inp.roster, bound.id),
      },
      read: null,
    };
  }

  // The read rung, after it: judgeFiling with the claim, exactly as before —
  // it disputes when the claim fails accountMatches or a rival outranks the
  // row. The text rung has cleared, so what can object here is the claim.
  const late = judgeFiling({ text, claim: inp.claim ?? "", bound, roster: inp.roster });
  if (late.ok) return { text: null, read: null };
  return {
    text: null,
    read: {
      rung: "read",
      claim: late.claim,
      bound: late.bound,
      why: late.why,
      boundWhy: late.boundWhy,
      candidates,
      reason: reasonFromWhy(late.why, late.bound, late.claim, late.boundWhy),
      ...claimKey(late.claim, inp.roster, bound.id),
    },
  };
}

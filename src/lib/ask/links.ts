// Where an answer LIVES, as links that land on the exact thing. The brain's
// citations carry origin + originRef + accountId; this turns them into doors
// that arrive pre-loaded — an account drilldown already open, the archive
// already searched — never a bare page the operator has to re-type the
// question into. A playbook question cited opens in place instead (C13):
// askFolds hands the surface the bank's question and its gloss, and the
// surface folds them under the answer, one click, with no page and no link.

import { questionById } from "@/lib/intel/bank";

export type AskLink = { label: string; href: string };

/** A playbook question the answer cites, as the bank holds it: the question
 *  and its gloss (the why), for the surface to open in place (C13). */
export type AskFold = { id: string; question: string; why: string };

type CiteLike = {
  origin: string;
  originRef: string;
  accountId: string;
  docTitle: string;
};

const ACCOUNT_ORIGINS = new Set([
  "account-note",
  "todo",
  "touch",
  "card",
  "partner-note",
  // the app's own live read, cited — its door is the account it derives from
  "live",
]);
const CAPTURE_ORIGINS = new Set(["teams", "meeting", "demo", "paste"]);
const CAP = 6;

export function askLinks(
  input: {
    question: string;
    accounts: { id: string; name: string }[];
    citations: CiteLike[];
  },
  nameOf?: (id: string) => string,
): AskLink[] {
  const out: AskLink[] = [];
  const seen = new Set<string>();
  const push = (label: string, href: string) => {
    if (!href || seen.has(href) || out.length >= CAP) return;
    seen.add(href);
    out.push({ label, href });
  };

  // The accounts the answer names — the drilldown opens and scrolls itself.
  for (const a of input.accounts ?? []) {
    if (a?.id && !a.id.includes(":"))
      push(
        `Open ${a.name || "the account"}.`,
        `/accounts?focus=${encodeURIComponent(a.id)}`,
      );
  }

  for (const c of input.citations ?? []) {
    if (!c) continue;
    // A second-record digest cited → the account IS the evidence door.
    if (c.origin === "activity") {
      const id = (c.originRef ?? "").split(":")[0];
      if (id)
        push(
          `Open ${nameOf?.(id) || "the account"}.`,
          `/accounts?focus=${encodeURIComponent(id)}`,
        );
      continue;
    }
    // A playbook citation → no link. The Call Sheet is retired
    // (founder-decreed 2026-09-15) and the bank has no browsable card, so a
    // link would land on a page that cannot show the question. The question
    // opens in place instead, through askFolds below (C13).
    if (c.origin === "playbook") continue;
    // Account-record material → the account's own drilldown.
    if (ACCOUNT_ORIGINS.has(c.origin) && c.accountId && !c.accountId.includes(":")) {
      const name = nameOf?.(c.accountId) ?? "";
      push(
        `Open ${name || "the account"}.`,
        `/accounts?focus=${encodeURIComponent(c.accountId)}`,
      );
      continue;
    }
    // Captured material (calls, demos, pastes) → the archive, already searched.
    if (CAPTURE_ORIGINS.has(c.origin) && c.docTitle) {
      push(
        "The archive on this.",
        `/archive?q=${encodeURIComponent(c.docTitle.slice(0, 80))}`,
      );
    }
  }

  // The brain's own room, question loaded — always last, never the only door
  // unless the record genuinely held nothing.
  push(
    "Ask the brain's room.",
    `/intranet?q=${encodeURIComponent((input.question ?? "").slice(0, 300))}`,
  );
  return out;
}

// The bank's text carries one placeholder the brain also fills before it reads
// a question (src/lib/intranet/playbook-in.ts): the fold reads the same words.
const fill = (s: string) => s.replaceAll("{countries}", "those countries");

/** The playbook questions an answer cites, each resolved through the bank's
 *  own lookup to its question and gloss (ruled 2026-09-25, C13: "opens in
 *  place, one click, to the cited question and its gloss from the bank, with
 *  no page and no link"). A playbook citation that is not a bank question —
 *  a scenario, a market fact, a lesson — has no fold here; its text is the
 *  citation itself. */
export function askFolds(citations: readonly (CiteLike | null | undefined)[]): AskFold[] {
  const out: AskFold[] = [];
  const seen = new Set<string>();
  for (const c of citations ?? []) {
    if (!c || c.origin !== "playbook") continue;
    const q = questionById(c.originRef ?? "");
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push({ id: q.id, question: fill(q.question), why: fill(q.why) });
    if (out.length >= CAP) break;
  }
  return out;
}

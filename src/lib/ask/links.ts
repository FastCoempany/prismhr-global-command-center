// Where an answer LIVES, as links that land on the exact thing. The brain's
// citations carry origin + originRef + accountId; this turns them into doors
// that arrive pre-loaded — an account drilldown already open, the Playbook
// scrolled to the card, the archive already searched — never a bare page the
// operator has to re-type the question into.

export type AskLink = { label: string; href: string };

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
    // A playbook question cited → the Playbook, scrolled to that exact card.
    const qm = /^question:(.+)$/.exec(c.originRef ?? "");
    if (c.origin === "playbook" && qm) {
      push("The Playbook card.", `/playbook?open=${encodeURIComponent(qm[1])}`);
      continue;
    }
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

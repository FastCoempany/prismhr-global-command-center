// One company, two rows in the book.
//
// Southern Personnel Management, Inc. trades as My HR Professionals. The SF
// export carries both as accounts, and the split is the worst shape it could
// take: the substantive row (001F000000w389qIAA) holds the cloud code, the
// firmographics, fit 100 and all 68 contacts — every one of them @myhrpros.com
// or @spmihr.com — while the empty shell (0013k00002dGqODAA0, no cloud, no
// contacts, no size, last touched in 2024) is where the live record landed:
// ten filed messages and twenty gaps, including the CEO thread with Joseph
// Lyon, whose own address the book already binds to the substantive row.
//
// So the room showed a rich account with no story beside a thin account with
// all of it, the queue could offer the same company twice, and the CSM sheet
// counted one partner as two.
//
// The merge is a READ-TIME fold, never a write. Stored rows keep the ids they
// were filed under; every surface resolves them to one account. That follows
// the Ted doctrine — a derived fact reads the widest live source the app
// holds, and the two stores merge — and it is reversible by deleting a line.
//
// Adding a pair: put `dupeId: canonicalId` in ALIASES and the trade name in
// AKA. Nothing else needs touching.

/** Duplicate account id → the id the app should speak in. */
export const ALIASES: Record<string, string> = {
  // My HR Professionals (shell) → Southern Personnel Management, Inc.
  "0013k00002dGqODAA0": "001F000000w389qIAA",
};

/** What the account is called on every surface, overriding the export's own
 *  name. The book's row says "Southern Personnel Management, Inc."; nobody
 *  says that — the people are @myhrpros.com, the calls say "My HR Pros", and
 *  the legal entity is carried in the parenthesis so the row still reconciles
 *  with Salesforce (founder-decreed 2026-09-22). Kept here rather than edited
 *  into book.json, which is an export and would lose it on the next sweep. */
export const RENAME: Record<string, string> = {
  "001F000000w389qIAA": "myhrpros (SPMI)",
};

/** Every other spelling the account answers to, by canonical id — the legal
 *  name it left behind, the trade name in the forms people actually type, and
 *  the initialism. Routing and search read these, so a capture naming any of
 *  them lands on the one account.
 *
 *  Spelling matters here: the matcher compares normalized strings, and
 *  "MyHR Pros", "My HR Pros" and "MyHRPros" normalize three different ways.
 *  A tape says one, an email signature says another. */
export const AKA: Record<string, string[]> = {
  "001F000000w389qIAA": [
    "Southern Personnel Management",
    "Southern Personnel Management, Inc.",
    "My HR Professionals",
    "My HR Pros",
    "MyHR Pros",
    "MyHRPros",
    "SPMI",
  ],
};

/** Namespaced stores key as "<namespace>:<accountId>" — gaps:, research:,
 *  gems:, seat:, sendbook:, actdraft:, activity:stage:. The account id is the
 *  tail after the last colon; everything before it is the namespace and rides
 *  through untouched. A key whose tail is not an aliased account (scratch:pad,
 *  playbook:market, activity:manifest) comes back exactly as it went in. */
export function canonicalAccountId(id: string): string {
  const key = (id ?? "").trim();
  if (!key) return key;
  const cut = key.lastIndexOf(":");
  if (cut < 0) return ALIASES[key] ?? key;
  const ns = key.slice(0, cut + 1);
  const tail = key.slice(cut + 1);
  const real = ALIASES[tail];
  return real ? ns + real : key;
}

/** True when this id is a duplicate that should never be shown as its own
 *  account. The book filters these out of `peos`. */
export function isAliasedAway(id: string): boolean {
  return Object.hasOwn(ALIASES, (id ?? "").trim());
}

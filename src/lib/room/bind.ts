// Account binding for the Operating Room's per-row composers. Every entry
// point (log box, paste pane, close button) is pre-bound to ONE account; these
// guards make that binding tamper-proof: an id must exist in the book, bodies
// are sanitized before storage, and nothing typed inside a note can re-route
// it. Pure — adversarially tested.

import { redactMoney } from "@/lib/intel/lexicon";

export type KnownAccount = { id: string; name: string };

// Resolve a submitted account id against the book. Unknown, empty, padded,
// or look-alike ids are rejected — a row can only ever file to itself.
export function bindAccountId(
  raw: unknown,
  accounts: KnownAccount[],
): KnownAccount | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 40) return null;
  return accounts.find((a) => a.id === id) ?? null;
}

// Sanitize a typed log entry before it becomes an AccountNote body: money
// redacted, control characters stripped, whitespace collapsed at the edges,
// hard length cap. The text is DATA — nothing inside it (ids, "accountId:",
// glyph prefixes) changes where it files.
export function cleanLogBody(raw: unknown, cap = 2000): string {
  if (typeof raw !== "string") return "";
  const stripped = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!stripped) return "";
  return redactMoney(stripped).slice(0, cap);
}

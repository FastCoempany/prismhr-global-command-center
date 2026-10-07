// What the Intranet's dock refuses (ruled 2026-10-07, pass 8 call 12): a
// Sales Nav grab's paste lands in the Chute's pipeline under its SALESNAV
// ACCOUNTS head, never in the Intranet dock. The grab opens the HomeRoom now;
// a bookmark dragged before that change still opens this page, so the grab
// box and the dock both read the head and point at the HomeRoom instead of
// taking it. Every other capture the dock takes as it always has.

import { sniffHead } from "@/lib/ingest/dialect";

export const SALESNAV_ELSEWHERE =
  "That's a Sales Nav grab. Paste it into an account's ⚡ box on the HomeRoom.";

/** The line the dock answers with when it will not take a capture; "" when
 *  it takes it. */
export function dockRefuses(text: string): string {
  return sniffHead(text ?? "").dialect === "SN" ? SALESNAV_ELSEWHERE : "";
}

// The HomeRoom's follow-up list, derived — pure, so the suite can pin it. The
// operator's own chases come out of the touch pile first and never reach the
// check-in drawer (threads waiting on somebody else); the one open question
// per chase is a name NOBODY already knows — not the board, and not the book
// behind Accounts, because offering to add a company that already has a
// record is how duplicates get made.

import { isManual, openCandidates, readFollowUp, routedIds } from "./followup-brain";

type TouchLike = {
  subjectKey: string;
  label: string;
  detail: string | null;
  contactedAt: string;
  status: string;
};

export type FollowUpRowView = {
  subjectKey: string;
  label: string;
  armedAt: string;
  /** Accounts this chase already filed itself against — shown as plain
   *  provenance, not as a control. */
  filed: string[];
  /** The one open question: a name nobody on the board answers to. */
  newName: string;
};

/** The operator's own chases (armed by hand, still live) apart from the
 *  cadence — every other thread, which the check-in drawer partitions. */
export function splitTouches<T extends { subjectKey: string; status: string }>(
  touches: readonly T[],
): { manual: T[]; cadence: T[] } {
  return {
    manual: touches.filter((t) => isManual(t.subjectKey) && t.status !== "archived"),
    cadence: touches.filter((t) => !isManual(t.subjectKey)),
  };
}

/** Every name somebody already knows: the board's cards and the book. */
export function knownOrgNames(
  cards: readonly { name: string }[],
  book: readonly { name: string }[],
): string[] {
  return [...cards.map((c) => c.name), ...book.map((p) => p.name)];
}

/** The follow-up rows the room shows, newest armed first, at most forty. */
export function followUpRowsFor(
  manual: readonly TouchLike[],
  book: readonly { id: string; name: string }[],
  partners: readonly string[],
  knownOrgs: readonly string[],
): FollowUpRowView[] {
  return [...manual]
    .sort((a, b) => Date.parse(b.contactedAt) - Date.parse(a.contactedAt))
    .slice(0, 40)
    .map((t) => {
      const read = readFollowUp(t.label, [...book], [...partners]);
      return {
        subjectKey: t.subjectKey,
        label: t.label,
        armedAt: t.contactedAt,
        filed: routedIds(t.detail ?? "")
          .map((id) => book.find((p) => p.id === id)?.name ?? "")
          .filter(Boolean),
        newName: openCandidates(read, t.detail ?? "", [...knownOrgs])[0] ?? "",
      };
    });
}

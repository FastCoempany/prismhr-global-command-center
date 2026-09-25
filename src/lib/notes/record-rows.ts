// The record's own rows, told from the namespaces. Some AccountNote rows are
// filed against a NAMESPACE rather than a book account — "gaps:<id>",
// "playbook:market", "research:<id>", "scratch:pad", "activity:stage:<id>",
// "pastehash:<id>:<hash>" and the rest. The column has no foreign key, which
// is what makes that work; the cost is that a whole-table read must keep
// them out. One mark defines the registry: every namespaced id carries a
// colon, and no book account id ever does (isNamespacedAccountId, overlay.ts).
//
// The intranet mirror used to read its 400-row budget first and skip the
// namespaced rows after (D30): scratch lines and second-record slices ate the
// budget before a single account note was seen. The exclusion now lives in
// the query itself, by construction — the where below admits only record
// rows, and a new namespace is excluded the day it is born, because it is
// born with the mark.

import type { Prisma } from "@/generated/prisma/client";

/** The one character every namespaced AccountNote id carries. */
export const NAMESPACE_MARK = ":";

/** True for a book account's own row; false for every namespaced store. */
export function isRecordRowId(id: string): boolean {
  return !(id ?? "").includes(NAMESPACE_MARK);
}

/** A Prisma where that admits only the record's own rows — every namespace
 *  the app defines, and every one it defines later, is excluded by the mark
 *  they all carry. */
export function recordRowsWhere(): Prisma.AccountNoteWhereInput {
  return { NOT: { accountId: { contains: NAMESPACE_MARK } } };
}

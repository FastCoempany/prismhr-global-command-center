"use server";

// The room's sheet routing. routeSheetNote files a captured note to the
// accounts and partners it names; the room's composer calls it after every
// keystroke that lands. It used to live in Today's sheet-actions file (Today
// retired 2026-09-25, dead-code ledger, section C). Called programmatically,
// so it RETURNS a value instead of redirecting; every write degrades
// gracefully when tables aren't migrated.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { accountIntel } from "@/lib/today/build";
import { createAccountNoteRow } from "@/lib/notes/write";
import {
  detectTargets,
  routeLabel,
  splitMarker,
  splitTags,
  withMarker,
  type RouteRefs,
} from "@/lib/today/route-notes";

type SheetNote = {
  id: string;
  body: string; // full stored body (marker included)
  done: boolean;
  remindAt: string;
  createdAt: string;
  unmatched?: boolean; // route attempt found no targets — offer the manual picker
};

async function canWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function bookForDetection() {
  const intel = accountIntel();
  return {
    accounts: intel.map((a) => ({ id: a.id, name: a.name, csm: a.csm })),
    partners: [
      ...new Set(intel.map((a) => a.csm).filter((c) => c && c !== "Unassigned")),
    ],
  };
}

// Create the AccountNote/PartnerNote rows for a set of targets; returns the ids
// so the marker (and undo) can reference exactly what this routing created.
async function writeRoutes(
  text: string,
  targets: { accounts: { id: string; name: string }[]; partners: string[] },
): Promise<RouteRefs> {
  const prisma = getPrisma();
  const refs: RouteRefs = { accountNoteIds: [], partnerNoteIds: [] };
  for (const a of targets.accounts) {
    try {
      const n = await createAccountNoteRow({
        accountId: a.id,
        kind: "mine",
        body: text,
        lane: "mine",
        source: "sheet",
      });
      refs.accountNoteIds.push(n.id);
    } catch {
      // table missing — skip silently
    }
  }
  for (const p of targets.partners) {
    try {
      const n = await prisma.partnerNote.create({
        data: { partner: p, body: text, source: "sheet" },
      });
      refs.partnerNoteIds.push(n.id);
    } catch {
      // table missing — skip silently
    }
  }
  return refs;
}

// Route an existing (plain) note now — auto-detect, or explicit targets when
// the caller picked them by hand.
export async function routeSheetNote(
  id: string,
  explicit?: { accountId?: string; partner?: string },
): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return null;
    const { text, refs: existing } = splitMarker(t.body);
    if (existing) return asSheetNote(t.id, t.body, t.done, t.remindAt, t.createdAt);

    // Tags are ours, not the note's content — detect and file without them.
    const { text: visible } = splitTags(text);
    const { accounts, partners } = bookForDetection();
    let targets;
    if (explicit && (explicit.accountId || explicit.partner)) {
      const acc = accounts.find((a) => a.id === explicit.accountId);
      targets = {
        accounts: acc ? [{ id: acc.id, name: acc.name }] : [],
        partners: [
          ...new Set(
            [explicit.partner, acc?.csm].filter(
              (p): p is string => !!p && p !== "Unassigned",
            ),
          ),
        ],
      };
    } else {
      targets = detectTargets(visible, accounts, partners);
    }
    if (!targets.accounts.length && !targets.partners.length)
      return {
        ...asSheetNote(id, t.body, t.done, t.remindAt, t.createdAt),
        unmatched: true,
      };

    const written = await writeRoutes(visible, targets);
    const body =
      written.accountNoteIds.length || written.partnerNoteIds.length
        ? withMarker(text, written, routeLabel(targets))
        : t.body;
    await prisma.todo.update({ where: { id }, data: { body } });
    return asSheetNote(id, body, t.done, t.remindAt, t.createdAt);
  } catch {
    return null;
  }
}

function asSheetNote(
  id: string,
  body: string,
  done: boolean,
  remindAt: Date | null,
  createdAt: Date,
): SheetNote {
  return {
    id,
    body,
    done,
    remindAt: remindAt ? remindAt.toISOString() : "",
    createdAt: createdAt.toISOString(),
  };
}

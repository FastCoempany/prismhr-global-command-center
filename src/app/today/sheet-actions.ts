"use server";

// Day-sheet server functions. Called programmatically from the client (the
// sheet never reloads the page), so they RETURN values instead of redirecting.
// Every write degrades gracefully when tables aren't migrated.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { accountIntel } from "@/lib/today/build";
import {
  detectTargets,
  NO_TAGS,
  routeLabel,
  splitMarker,
  splitTags,
  withMarker,
  withTags,
  type NoteTags,
  type RouteRefs,
} from "@/lib/today/route-notes";

export type SheetNote = {
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

// The ledger (and everything else server-rendered on Today) re-renders in the
// same response, so a capture shows up above the now-line AS IT HAPPENS — the
// sheet's client state carries its own list and is unaffected.
function refreshToday() {
  try {
    revalidatePath("/today");
  } catch {
    // outside a request scope (tests) — nothing to refresh
  }
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
      const n = await prisma.accountNote.create({
        data: { accountId: a.id, partner: "", kind: "mine", body: text },
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

// Capture a note from the sheet. plain=true (Enter-Enter) skips routing;
// otherwise targets are auto-detected and the note is filed to the partner
// room + account page as well, with a receipt marker appended to the body.
export async function captureSheetNote(
  rawBody: string,
  plain: boolean,
  opts?: { kind?: "" | "action"; urgency?: NoteTags["urgency"] },
): Promise<SheetNote | null> {
  const text = (rawBody ?? "").trim().slice(0, 20000);
  if (!(await canWrite()) || !text) return null;
  try {
    const prisma = getPrisma();
    const isAction = opts?.kind === "action";
    const urgency =
      opts?.urgency === "low" || opts?.urgency === "med" || opts?.urgency === "high"
        ? opts.urgency
        : "";
    // An ACTION goes straight to the ledger's open register — tagged, never
    // auto-routed (filing happens on the ledger, after it's done).
    const tagged =
      isAction || urgency
        ? withTags(text, { ...NO_TAGS, kind: isAction ? "action" : "", urgency })
        : text;
    let body = tagged;
    if (!plain && !isAction) {
      const { accounts, partners } = bookForDetection();
      const targets = detectTargets(text, accounts, partners);
      if (targets.accounts.length || targets.partners.length) {
        const refs = await writeRoutes(text, targets);
        if (refs.accountNoteIds.length || refs.partnerNoteIds.length)
          body = withMarker(tagged, refs, routeLabel(targets));
      }
    }
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (top?.position ?? -1) + 1;
    const t = await prisma.todo
      .create({ data: { body, position, remindAt: new Date() } })
      .catch(() => prisma.todo.create({ data: { body, position } }));
    refreshToday();
    return {
      id: t.id,
      body,
      done: false,
      remindAt: new Date().toISOString(),
      createdAt: t.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
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
    refreshToday();
    return asSheetNote(id, body, t.done, t.remindAt, t.createdAt);
  } catch {
    return null;
  }
}

// Undo a routing: delete exactly the rows the marker references, strip the
// marker off the note. The note itself stays on the sheet.
export async function undoSheetRoute(id: string): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return null;
    const { text, refs } = splitMarker(t.body);
    if (refs) {
      if (refs.accountNoteIds.length)
        await prisma.accountNote
          .deleteMany({ where: { id: { in: refs.accountNoteIds } } })
          .catch(() => null);
      if (refs.partnerNoteIds.length)
        await prisma.partnerNote
          .deleteMany({ where: { id: { in: refs.partnerNoteIds } } })
          .catch(() => null);
    }
    await prisma.todo.update({ where: { id }, data: { body: text } });
    refreshToday();
    return asSheetNote(id, text, t.done, t.remindAt, t.createdAt);
  } catch {
    return null;
  }
}

// Promote a sheet note to a dated to-do: today (end of day) or tomorrow (noon).
// A future remindAt is what puts it on the Scheduled list.
export async function promoteSheetTodo(
  id: string,
  when: "today" | "tomorrow",
): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const d = new Date();
    if (when === "today") d.setHours(23, 59, 0, 0);
    else {
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
    }
    const t = await prisma.todo.update({ where: { id }, data: { remindAt: d } });
    refreshToday();
    return asSheetNote(id, t.body, t.done, d, t.createdAt);
  } catch {
    return null;
  }
}

// Inline body edit from the sheet — preserves any routing marker AND tags.
export async function saveSheetNote(id: string, text: string): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return null;
    const { text: old, refs, label } = splitMarker(t.body);
    const { tags } = splitTags(old);
    const clean = withTags(text.trim().slice(0, 20000), tags);
    const body = refs ? withMarker(clean, refs, label) : clean;
    await prisma.todo.update({ where: { id }, data: { body } });
    refreshToday();
    return asSheetNote(id, body, t.done, t.remindAt, t.createdAt);
  } catch {
    return null;
  }
}

// "Make it an action →" — the note leaves the sheet and joins the ledger's
// open register. Text, routing marker and urgency all ride along.
export async function makeSheetAction(id: string): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return null;
    const { text, refs, label } = splitMarker(t.body);
    const { text: plain, tags } = splitTags(text);
    const tagged = withTags(plain, { ...tags, kind: "action" });
    const body = refs ? withMarker(tagged, refs, label) : tagged;
    await prisma.todo.update({ where: { id }, data: { body, done: false } });
    refreshToday();
    return asSheetNote(id, body, false, t.remindAt, t.createdAt);
  } catch {
    return null;
  }
}

// Set (or clear) a note's tags — date, urgency, today/later. The tags ride in
// the body's tag-marker line, so this works on routed and plain notes alike.
export async function tagSheetNote(
  id: string,
  tags: NoteTags,
): Promise<SheetNote | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return null;
    const { text, refs, label } = splitMarker(t.body);
    const { text: plain, tags: existing } = splitTags(text);
    // Only the sheet-facing tags are caller-settable; the ledger lifecycle tags
    // (kind/delay/doneAt/country) ride through untouched.
    const safe: NoteTags = {
      ...existing,
      date: /^\d{4}-\d{2}-\d{2}$/.test(tags.date) ? tags.date : "",
      urgency:
        tags.urgency === "low" || tags.urgency === "med" || tags.urgency === "high"
          ? tags.urgency
          : "",
      when: tags.when === "today" || tags.when === "later" ? tags.when : "",
    };
    const tagged = withTags(plain, safe);
    const body = refs ? withMarker(tagged, refs, label) : tagged;
    await prisma.todo.update({ where: { id }, data: { body } });
    refreshToday();
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

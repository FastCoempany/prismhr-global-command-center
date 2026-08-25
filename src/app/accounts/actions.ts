"use server";

import { applyPlay as applyPlayImpl, savePeo as savePeoImpl } from "../book/actions";
import { revalidatePath } from "next/cache";

// Working-the-deal actions (absorbed from the Book) — same store, same
// behavior; the forms just live on /accounts now. ("use server" files can't
// re-export directly, so these are thin async pass-throughs.)
export async function savePeo(formData: FormData) {
  return savePeoImpl(formData);
}

export async function applyPlay(formData: FormData) {
  return applyPlayImpl(formData);
}
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { contactsFor, type BookContact } from "@/lib/book/contacts";
import { getPeo } from "@/lib/book";
import { discoveredContacts, domainOfAccount } from "@/lib/book/live-contacts";
import { peopleFor } from "@/lib/intel/people";

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function done() {
  revalidatePath("/accounts");
  revalidatePath("/today");
  redirect("/accounts");
}

// The CSM/owner trust layer over an AI-researched score. confirmed = it stands,
// flagged = looks wrong (visibly distrusted downstream), adjusted = override the
// demand (flows into the composite). Retires the "scores aren't validated" seam.
export async function validateScore(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const raw = str(formData, "status", 12);
  const status = raw === "flagged" || raw === "adjusted" ? raw : "confirmed";
  const note = str(formData, "note", 500) || null;
  const adj = parseInt(str(formData, "adjustedDemand", 4), 10);
  const adjustedDemand =
    status === "adjusted" && Number.isFinite(adj)
      ? Math.max(0, Math.min(100, adj))
      : null;
  if (!(await requireWrite()) || !accountId) done();
  await getPrisma().scoreValidation.upsert({
    where: { accountId },
    create: { accountId, status, note, adjustedDemand },
    update: { status, note, adjustedDemand },
  });
  done();
}

export async function clearValidation(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  await getPrisma().scoreValidation.deleteMany({ where: { accountId } });
  done();
}

// Run a DB write, degrading to a no-op if the (newer) AccountEngagement table
// hasn't been migrated yet — never 500 the Account Room.
async function safeWrite(work: () => Promise<void>) {
  try {
    await work();
  } catch {
    // Table not migrated yet.
  }
}

// Per-account engagement: CSM meeting cadence + notes + client health.
export async function saveEngagement(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  const cadence = str(formData, "cadence", 40) || null;
  const meetingDay = str(formData, "meetingDay", 20) || null;
  const nm = str(formData, "nextMeeting", 20);
  const nextMeetingAt = nm && !Number.isNaN(Date.parse(nm)) ? new Date(nm) : null;
  const rawHealth = str(formData, "clientHealth", 10);
  const clientHealth = ["green", "yellow", "red"].includes(rawHealth) ? rawHealth : null;
  const csmNotes = str(formData, "csmNotes", 4000) || null;
  await safeWrite(async () => {
    await getPrisma().accountEngagement.upsert({
      where: { accountId },
      create: { accountId, cadence, meetingDay, nextMeetingAt, clientHealth, csmNotes },
      update: { cadence, meetingDay, nextMeetingAt, clientHealth, csmNotes },
    });
  });
  done();
}

// The "SF research pulled" gate — toggles the timestamp.
export async function toggleSfChecked(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const cur = await prisma.accountEngagement.findUnique({ where: { accountId } });
    const next = cur?.sfCheckedAt ? null : new Date();
    await prisma.accountEngagement.upsert({
      where: { accountId },
      create: { accountId, sfCheckedAt: next },
      update: { sfCheckedAt: next },
    });
  });
  done();
}

// The account's full contact roster (from the 7/24 SF contact reports) —
// fetched on demand when a Contacts panel opens, so the 1.5MB roster never
// rides in the page payload.
export type ContactRow = BookContact & { fromRecord?: boolean; firstSeen?: string };

const EMPTY_CONTACT: Omit<BookContact, "first" | "last" | "email"> = {
  id: "",
  title: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  mobile: "",
  owner: "",
};

// The roster PLUS everything else the app knows (founder-decreed 2026-08-20,
// widened same day for Back Office Risk, whose SF export held no one): the
// book's seeded primary stands in when the export lacks them, addresses on
// the account's domain join from filed captures, and name-only people from
// the record's own traffic join without an email. Derived fresh on every
// read — never stored (Ted doctrine).
export async function getContacts(accountId: string): Promise<ContactRow[]> {
  const access = await getAppAccess();
  if (access.status !== "active") return [];
  const id = (accountId ?? "").slice(0, 40);
  const roster: ContactRow[] = [...contactsFor(id)];
  const peo = getPeo(id);
  if (!peo) return roster;

  // The seed stands in until the record speaks: the book's primary contact
  // joins when the export never carried them.
  const have = new Set(roster.map((c) => c.email.toLowerCase()).filter(Boolean));
  const haveNames = new Set(
    roster.map((c) => `${c.first} ${c.last}`.trim().toLowerCase()).filter(Boolean),
  );
  const primaryName = (peo.contactName ?? "").trim();
  const primaryEmail = (peo.contactEmail ?? "").trim().toLowerCase();
  if (
    primaryName &&
    (!primaryEmail || !have.has(primaryEmail)) &&
    !haveNames.has(primaryName.toLowerCase())
  ) {
    const parts = primaryName.split(/\s+/);
    roster.unshift({
      ...EMPTY_CONTACT,
      first: parts[0] ?? "",
      last: parts.slice(1).join(" "),
      email: peo.contactEmail ?? "",
    });
    if (primaryEmail) have.add(primaryEmail);
    haveNames.add(primaryName.toLowerCase());
  }

  if (!hasDatabaseEnv()) return roster;
  try {
    const notes = await getPrisma().accountNote.findMany({
      where: { accountId: id },
      select: { body: true, createdAt: true, actors: true, lane: true },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    const found = discoveredContacts(
      notes.map((n) => ({ body: n.body, createdAt: n.createdAt.toISOString() })),
      domainOfAccount(peo.website ?? "", peo.contactEmail ?? ""),
      have,
    );
    for (const f of found) haveNames.add(`${f.first} ${f.last}`.trim().toLowerCase());

    // Name-only people from the record's traffic — a VTT voice, an actors
    // line, a filed thread — join without an email; the draft door stays
    // shut until an address arrives.
    const traffic = peopleFor(
      notes.map((n) => ({
        actors: n.actors ?? "",
        lane: n.lane === "mine" ? ("mine" as const) : ("background" as const),
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
      roster,
      24,
    );
    const named: ContactRow[] = [];
    for (const p of traffic) {
      const key = p.name.trim().toLowerCase();
      if (!key || haveNames.has(key)) continue;
      if (p.email && have.has(p.email.toLowerCase())) continue;
      // Two words minimum — "IT Help" style artifacts and single tokens stay out.
      if (p.name.trim().split(/\s+/).length < 2) continue;
      const parts = p.name.trim().split(/\s+/);
      named.push({
        ...EMPTY_CONTACT,
        first: parts[0],
        last: parts.slice(1).join(" "),
        title: p.title,
        email: p.email,
        fromRecord: true,
        firstSeen: p.lastSeen,
      });
      haveNames.add(key);
    }
    return [...found, ...named, ...roster];
  } catch {
    return roster;
  }
}

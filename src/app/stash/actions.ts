"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { nextCheckIn } from "@/lib/today/follow-ups";
import { isStashLane, microNote, sharpen, type StashLane } from "@/lib/stash/summarize";
import { loadStashTray, type StashTray } from "@/lib/stash/data";

type Db = ReturnType<typeof getPrisma>;

async function canWrite() {
  if (!hasDatabaseEnv()) return false;
  const a = await getAppAccess();
  return a.status === "active" && a.canWrite;
}

// The tray, for the client dock to refetch after any change.
export async function getTray(): Promise<StashTray> {
  return loadStashTray();
}

// Route a micro-note into its destination store. Each lane writes to the surface
// that already renders it on Today — so routed captures need no new UI. Column-
// safe on Todo (body always persists even if accountId isn't migrated yet).
async function createInLane(
  prisma: Db,
  lane: StashLane,
  micro: string,
  accountId: string | null,
): Promise<boolean> {
  const label = micro.trim().slice(0, 2000) || "(note)";
  try {
    if (lane === "todo") {
      const top = await prisma.todo.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = (top?.position ?? -1) + 1;
      try {
        await prisma.todo.create({
          data: {
            body: label,
            position,
            accountId: accountId ?? undefined,
            remindAt: new Date(), // notes are auto-dated to the day they're written
          },
        });
      } catch {
        await prisma.todo.create({ data: { body: label, position } });
      }
      return true;
    }
    if (lane === "follow") {
      const now = Date.now();
      await prisma.touch.create({
        data: {
          subjectKey: `stash:${randomUUID()}`,
          kind: "custom",
          label,
          detail: "from Stash",
          message: null,
          contactedAt: new Date(now),
          followUpAt: nextCheckIn(now, "tomorrow"),
          intervalDays: 1,
          status: "awaiting",
          log: [],
        },
      });
      return true;
    }
    // gap → Voice of the base
    await prisma.fieldNote.create({ data: { kind: "gap", body: label } });
    return true;
  } catch {
    return false;
  }
}

// Un-routed capture (highlight / drag) → lands in the tray with an instant
// micro-note. Returns the new id, or null if capture couldn't persist.
export async function captureToStash(
  body: string,
  source: string,
  accountId: string,
): Promise<{ id: string } | null> {
  if (!(await canWrite())) return null;
  const b = (body ?? "").trim().slice(0, 8000);
  if (!b) return null;
  try {
    const item = await getPrisma().stashItem.create({
      data: {
        body: b,
        micro: microNote(b),
        source: (source ?? "").slice(0, 120),
        accountId: accountId ? accountId.slice(0, 40) : null,
      },
    });
    return { id: item.id };
  } catch {
    return null;
  }
}

// Right-click routing: straight to a lane, no tray stop. Revalidates Today so the
// routed item shows on the next load of that surface.
export async function routeStash(
  body: string,
  source: string,
  accountId: string,
  lane: string,
): Promise<{ ok: boolean }> {
  if (!(await canWrite())) return { ok: false };
  const b = (body ?? "").trim().slice(0, 8000);
  if (!b || !isStashLane(lane)) return { ok: false };
  try {
    const ok = await createInLane(
      getPrisma(),
      lane,
      microNote(b),
      accountId ? accountId.slice(0, 40) : null,
    );
    if (ok) revalidatePath("/today");
    return { ok };
  } catch {
    return { ok: false };
  }
}

// Sort a tray item into a lane, then remove it from the tray (it now lives on
// Today). Uses the item's sharpened micro-note if it has one.
export async function routeTrayItem(id: string, lane: string): Promise<{ ok: boolean }> {
  if (!(await canWrite()) || !id || !isStashLane(lane)) return { ok: false };
  try {
    const prisma = getPrisma();
    const item = await prisma.stashItem.findUnique({ where: { id } });
    if (!item) return { ok: false };
    const micro = item.micro?.trim() || microNote(item.body);
    const ok = await createInLane(prisma, lane, micro, item.accountId ?? null);
    if (ok) {
      await prisma.stashItem.delete({ where: { id } });
      revalidatePath("/today");
    }
    return { ok };
  } catch {
    return { ok: false };
  }
}

// Route a capture to a partner: it becomes a dated PartnerNote, which shows on
// that partner's outreach card on Today and in the Partner Room. Both surfaces
// read the same row, so they can never disagree.
async function createPartnerNote(
  prisma: Db,
  partner: string,
  micro: string,
): Promise<boolean> {
  const p = partner.trim().slice(0, 120);
  const body = micro.trim().slice(0, 2000) || "(note)";
  if (!p) return false;
  try {
    await prisma.partnerNote.create({ data: { partner: p, body, source: "stash" } });
    return true;
  } catch {
    return false;
  }
}

// Right-click / drop routing straight to a partner (no tray stop).
export async function routeStashToPartner(
  body: string,
  source: string,
  partner: string,
): Promise<{ ok: boolean }> {
  if (!(await canWrite())) return { ok: false };
  const b = (body ?? "").trim().slice(0, 8000);
  if (!b || !partner) return { ok: false };
  try {
    const ok = await createPartnerNote(getPrisma(), partner, microNote(b));
    if (ok) {
      revalidatePath("/today");
      revalidatePath("/partners");
    }
    return { ok };
  } catch {
    return { ok: false };
  }
}

// Sort a tray item to a partner, then remove it from the tray.
export async function routeTrayItemToPartner(
  id: string,
  partner: string,
): Promise<{ ok: boolean }> {
  if (!(await canWrite()) || !id || !partner) return { ok: false };
  try {
    const prisma = getPrisma();
    const item = await prisma.stashItem.findUnique({ where: { id } });
    if (!item) return { ok: false };
    const ok = await createPartnerNote(
      prisma,
      partner,
      item.micro?.trim() || microNote(item.body),
    );
    if (ok) {
      await prisma.stashItem.delete({ where: { id } });
      revalidatePath("/today");
      revalidatePath("/partners");
    }
    return { ok };
  } catch {
    return { ok: false };
  }
}

// Sharpen a tray item's micro-note in place (deterministic tighten).
export async function sharpenTrayItem(id: string): Promise<{ micro: string } | null> {
  if (!(await canWrite()) || !id) return null;
  try {
    const prisma = getPrisma();
    const item = await prisma.stashItem.findUnique({ where: { id } });
    if (!item) return null;
    const micro = sharpen(item.body);
    await prisma.stashItem.update({ where: { id }, data: { micro } });
    return { micro };
  } catch {
    return null;
  }
}

// Discard a tray item without routing it.
export async function deleteTrayItem(id: string): Promise<{ ok: boolean }> {
  if (!(await canWrite()) || !id) return { ok: false };
  try {
    await getPrisma().stashItem.deleteMany({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

"use server";

// The scenario is a per-account fact, so it persists like every other one: a
// namespaced disposition row whose reason carries the scenario id. Status must
// be "parked" — the loader drops any row with a status it doesn't recognize.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { SCENARIOS } from "@/lib/intel/scenarios";

export async function setScenario(
  accountId: string,
  scenarioId: string,
): Promise<{ ok: boolean }> {
  if (!hasDatabaseEnv()) return { ok: false };
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return { ok: false };
  const bound = peos.find((p) => p.id === accountId);
  if (!bound) return { ok: false };
  const id = SCENARIOS.some((s) => s.id === scenarioId) ? scenarioId : "";
  const key = `scenario:${bound.id}`.slice(0, 191);
  try {
    const prisma = getPrisma();
    if (!id) await prisma.accountDisposition.deleteMany({ where: { accountId: key } });
    else
      await prisma.accountDisposition.upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: id },
        update: { status: "parked", reason: id },
      });
    revalidatePath("/playbook");
    revalidatePath("/room");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

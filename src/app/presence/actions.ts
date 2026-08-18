"use server";

// The desk meter's two verbs — bank a minute, read the day. One row per
// Chicago day in the disposition table under the presence: namespace; every
// account surface skips namespaced ids by construction, so the meter never
// leaks into the book.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  PRESENCE_NS,
  parsePresenceReason,
  presenceDayKey,
  presenceReason,
} from "@/lib/presence";

async function accessLevel(): Promise<"write" | "read" | "none"> {
  if (!hasDatabaseEnv()) return "none";
  const access = await getAppAccess();
  if (access.status !== "active") return "none";
  return access.canWrite ? "write" : "read";
}

// Bank a delta. The client flushes about once a minute, so a delta beyond two
// minutes is a replay or a clock trick and gets clamped to nothing much.
export async function presenceLog(activeSec: number, passiveSec: number): Promise<void> {
  if ((await accessLevel()) !== "write") return;
  const clamp = (n: number) =>
    Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 180) : 0;
  const a = clamp(activeSec);
  const p = clamp(passiveSec);
  if (a === 0 && p === 0) return;
  const key = `${PRESENCE_NS}${presenceDayKey(new Date())}`;
  try {
    const prisma = getPrisma();
    const prior = await prisma.accountDisposition.findUnique({
      where: { accountId: key },
      select: { reason: true },
    });
    const t = parsePresenceReason(prior?.reason ?? "");
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "presence", reason: presenceReason(a, p) },
      update: { reason: presenceReason(t.a + a, t.p + p) },
    });
  } catch {
    // a lost minute costs the meter, never the work
  }
}

// Today's tally, for seeding the capsule on page load.
export async function presenceToday(): Promise<{ a: number; p: number }> {
  if ((await accessLevel()) === "none") return { a: 0, p: 0 };
  try {
    const row = await getPrisma().accountDisposition.findUnique({
      where: { accountId: `${PRESENCE_NS}${presenceDayKey(new Date())}` },
      select: { reason: true },
    });
    return parsePresenceReason(row?.reason ?? "");
  } catch {
    return { a: 0, p: 0 };
  }
}

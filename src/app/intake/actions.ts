"use server";

// Intake actions — file parsed Salesforce timeline entries onto an account as
// dated notes. The app only ever RECEIVES here; nothing talks back to SF.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import type { TimelineEntry } from "@/lib/sf-timeline";

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

const GLYPH: Record<TimelineEntry["kind"], string> = {
  email: "✉",
  task: "✔",
  call: "☎",
};

// One entry → one account note, stamped with the activity's own date so the
// note reads right even though createdAt is "when filed".
function noteBody(e: TimelineEntry): string {
  const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
  const who = `${e.from} → ${e.to}${e.others ? ` +${e.others}` : ""}`;
  const head = `${GLYPH[e.kind] ?? "✉"} SF ${when || "activity"} — ${
    e.subject || "(no subject)"
  } · ${who}`;
  return (e.body ? `${head}\n${e.body}` : head).slice(0, 2000);
}

export async function fileTimeline(
  accountId: string,
  entries: TimelineEntry[],
): Promise<{ ok: boolean; filed: number }> {
  const id = (accountId ?? "").trim().slice(0, 40);
  if (!(await requireWrite()) || !id || !Array.isArray(entries))
    return { ok: false, filed: 0 };
  const batch = entries.slice(0, 50);
  let filed = 0;
  try {
    const prisma = getPrisma();
    for (const e of batch) {
      if (!e || typeof e !== "object") continue;
      await prisma.accountNote.create({
        data: { accountId: id, partner: "", kind: "account", body: noteBody(e) },
      });
      filed++;
    }
    revalidatePath("/accounts");
    revalidatePath("/today");
    return { ok: true, filed };
  } catch {
    return { ok: filed > 0, filed };
  }
}

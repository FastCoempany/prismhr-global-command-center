"use server";

// The Second Record's doors — thin guards around the run library. The
// browser stages batches through here and drives the distillation passes;
// status rides the same shape the receipts render.

import { getAppAccess } from "@/lib/auth";
import {
  activityStatus,
  runActivityPass,
  stageActivityBatch,
  type ActivityStatus,
  type RunPassResult,
} from "@/lib/activity/run";
import type { StageBatch, StageReply } from "@/lib/activity/types";

async function guardWrite(): Promise<string> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return "Read-only session.";
  return "";
}

export async function activityStage(batch: StageBatch): Promise<StageReply> {
  const bad = await guardWrite();
  if (bad) return { ok: false, reason: bad };
  try {
    return await stageActivityBatch(batch);
  } catch (e) {
    const msg = (e as Error)?.message ?? "unknown";
    return { ok: false, reason: `Staging failed — ${msg.slice(0, 120)}.` };
  }
}

export async function activityRun(): Promise<RunPassResult> {
  const bad = await guardWrite();
  if (bad) return { ok: false, done: false, remaining: 0, receipt: [], reason: bad };
  try {
    return await runActivityPass({ deadlineMs: Date.now() + 220_000 });
  } catch (e) {
    const msg = (e as Error)?.message ?? "unknown";
    return {
      ok: false,
      done: false,
      remaining: 0,
      receipt: [],
      reason: `The pass failed — ${msg.slice(0, 120)}.`,
    };
  }
}

export async function activityReceipt(): Promise<ActivityStatus | null> {
  const access = await getAppAccess();
  if (access.status !== "active") return null;
  try {
    return await activityStatus();
  } catch {
    return null;
  }
}

"use server";

// The bank's own ask box — the same door the pad uses, waited on in place.
// One brain, one ledger; this surface just asks from the page.

import { revalidatePath } from "next/cache";
import { padAsk } from "@/app/scratch/actions";

export async function bankAsk(formData: FormData): Promise<void> {
  const q = String(formData.get("q") ?? "").trim();
  if (!q) return;
  await padAsk(q);
  revalidatePath("/asks");
}

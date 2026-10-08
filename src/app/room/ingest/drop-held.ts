// The Drop's held questions across a reload and a day line (pass 10, A12.7:
// Yesterday carries). A disputed filing on a row's Drop waits for the pick,
// and a held file vaults only after it (drop-plan.ts vaultAfterVerdict), so
// a pick the room forgot would be a file neither filed nor backed up. The
// Drop keeps its line of held questions per account, the way the Chute's
// ledger keeps a waiting row (C20): the verdict and the text ride; the files
// cannot, so the pick files the text and the ✕ backs the text up. A hold
// whose text cannot be kept comes back as a receipt asking for the re-drop.
// A hold carried past the Chicago day says since when. Pure over a storage,
// so the suite can read it.

import { chicagoDay } from "@/lib/tz";
import type { Window } from "@/lib/ingest/windows";
import { LEDGER_TEXT_CAP, monthDayOfKey } from "../chute-ledger";
import type { Verdict } from "./use-verdict";

export const DROP_HELD_KEY = "prismhr.drop-held.v1";

/** One held question as the Drop keeps it. */
export type KeptHold = Verdict & {
  text: string;
  windows?: Window[];
  /** The dropped file's name, when a file was held. */
  filename?: string;
  /** The Chicago day, M/D, the hold was first carried past. */
  heldSince?: string;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type Shelf = Record<string, { day: string; items: KeptHold[] }>;

const shelfOf = (storage: Storage): Shelf => {
  const raw = storage.getItem(DROP_HELD_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === "object" ? (parsed as Shelf) : {};
};

/** Write an account's line of held questions; an empty line clears it. */
export function saveDropHolds(
  storage: Storage,
  accountId: string,
  holds: readonly (Verdict & {
    text: string;
    windows?: Window[];
    files?: readonly File[];
    filename?: string;
    heldSince?: string;
  })[],
  now: Date = new Date(),
): void {
  const shelf = shelfOf(storage);
  if (holds.length === 0) delete shelf[accountId];
  else
    shelf[accountId] = {
      day: chicagoDay(now),
      items: holds.map(({ files, ...h }) => ({
        ...h,
        filename: h.filename ?? files?.[0]?.name,
        // The text rides while it fits; past the cap the hold comes back
        // asking for the re-drop, as the Chute's ledger does (C20).
        text: h.text.length <= LEDGER_TEXT_CAP ? h.text : "",
      })),
    };
  storage.setItem(DROP_HELD_KEY, JSON.stringify(shelf));
}

/** An account's held questions after a reload: the ones whose text came
 *  back, each saying since when once the day has turned, and the names of
 *  the ones that did not, for a receipt that asks for the re-drop. */
export function loadDropHolds(
  storage: Storage,
  accountId: string,
  now: Date = new Date(),
): { holds: KeptHold[]; lost: string[] } {
  const kept = shelfOf(storage)[accountId];
  if (!kept || !Array.isArray(kept.items)) return { holds: [], lost: [] };
  const since = kept.day === chicagoDay(now) ? "" : monthDayOfKey(kept.day);
  const holds: KeptHold[] = [];
  const lost: string[] = [];
  for (const h of kept.items) {
    if (!h || typeof h.claim !== "string") continue;
    if (!h.text) lost.push(h.filename || "Paste");
    else holds.push({ ...h, heldSince: h.heldSince || since || undefined });
  }
  return { holds, lost };
}

// The one implementation of "this stage item is done": check the box on the
// card (durable — the derivation advances instead of regenerating), stamp the
// completion key, and file a ✓ note on the account's own ledger. Used by
// Today's morning moves and the Operating Room alike.

import { getPrisma } from "@/lib/db";
import {
  DASH_NODE_KEYS,
  lightNext,
  migrateActivated,
  migrateChecks,
  migrateStates,
  nodeChecklist,
  stateFromChecks,
  syncActivation,
  type DashNodeKey,
} from "@/lib/dashboard/stages";
import { createAccountNoteRow } from "@/lib/notes/write";
import { mirrorNoteToSheet } from "@/lib/today/mirror";

export async function applyStepComplete(args: {
  cardId: string;
  node: DashNodeKey;
  index: number;
  doneKey: string; // per-day ledger stamp
  item: string;
  cardName: string;
  accountId: string; // "" = no book account resolved; the note is skipped
}): Promise<void> {
  const { cardId, node, index, doneKey, item, cardName, accountId } = args;
  if (!DASH_NODE_KEYS.includes(node) || Number.isNaN(index)) return;
  const prisma = getPrisma();

  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (card) {
    const count = nodeChecklist(node).length;
    const allChecks = migrateChecks(card.checks);
    const arr = Array.isArray(allChecks[node]) ? [...allChecks[node]] : [];
    while (arr.length < count) arr.push(false);
    if (index >= 0 && index < count && !arr[index]) {
      arr[index] = true;
      allChecks[node] = arr;
      const states = migrateStates(card.states);
      states[node] = stateFromChecks(arr, count);
      if (states[node] === "done") lightNext(states, node);
      const activated = migrateActivated(card.activated);
      syncActivation(activated, states);
      await prisma.dashCard.update({
        where: { id: cardId },
        data: { checks: allChecks, states, activated },
      });
    }
  }

  if (doneKey) {
    const existing = await prisma.taskDone.findUnique({ where: { key: doneKey } });
    if (!existing) await prisma.taskDone.create({ data: { key: doneKey } });
  }

  if (accountId && item) {
    const body = `✓ Closed: ${item}`.slice(0, 500);
    const n = await createAccountNoteRow({
      accountId,
      kind: "account",
      body,
      lane: "mine",
      source: "move",
    });
    await mirrorNoteToSheet(
      body,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      cardName || "account",
    );
  }
}

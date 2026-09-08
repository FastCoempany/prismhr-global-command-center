// Gathering the Pipeline report's inputs from the app's loaded stores — one
// implementation, used by the HomeRoom's render AND by the fresh pull the
// drawer makes when it opens.
//
// Why it exists: the records were assembled inside RoomPage's row loop, which
// meant they were as old as the page. Leave the room open, drop a transcript
// down the Chute, press the Word button, and the file would carry the record
// as it stood before the drop (founder-caught 2026-09-08). The drawer now
// re-reads on open — and a second copy of this gathering, written for the
// action, is exactly the drift the spec forbids. So it lives here once.

import { readOutcome } from "@/lib/dashboard/outcome";
import { cardNextStep } from "@/lib/today/build";
import { GAP_DISMISS, readGaps } from "@/lib/room/gaps";
import { digestForCardName } from "@/lib/intel/digest";
import type { PipelineAccount } from "./build";

// The board's own row shape — taken from loadDashboard() rather than restated,
// so a column added there can never quietly stop reaching the report.
type Card = Parameters<typeof cardNextStep>[0] & {
  archived: boolean;
  notes: Parameters<typeof readOutcome>[0];
};
type Note = {
  id: string;
  createdAt: string;
  body: string;
  lane: "mine" | "background";
  actors?: string;
  source?: string;
};
type Todo = {
  id: string;
  body: string;
  accountId: string;
  createdAt: string;
  remindAt: string;
  updatedAt: string;
  done: boolean;
};
type Second = {
  support: PipelineAccount["support"];
  rollup: { actors: PipelineAccount["actors"] } | null;
};

export type CollectInput = {
  cards: readonly Card[];
  /** The board's own stage labels, as loadDashboard() returns them. */
  labels: Record<string, string>;
  notesById: ReadonlyMap<string, Note[]>;
  todos: readonly Todo[];
  /** Dispositions gate two things here: ✕-parked note rows and dismissed gaps. */
  dispositions: ReadonlyMap<string, unknown>;
  secondById: ReadonlyMap<string, Second>;
  peos: readonly { id: string; name: string; csm?: string }[];
  now: Date;
};

/** Every ACTIVE account's inputs. "Active" is the rule the board already keeps
 *  — not archived, and no Closed Won / Closed Lost stamp. Nothing new is
 *  invented to define it, and the count is whatever the board says. */
export function collectPipelineAccounts(input: CollectInput): PipelineAccount[] {
  const idByName = new Map(input.peos.map((p) => [p.name.toLowerCase(), p.id]));
  const peoById = new Map(input.peos.map((p) => [p.id, p]));
  const gapDismissed = new Set(
    [...input.dispositions.keys()].filter((k) => k.startsWith(GAP_DISMISS)),
  );
  const out: PipelineAccount[] = [];

  for (const card of input.cards) {
    if (card.archived) continue;
    const accountId =
      idByName.get(card.name.toLowerCase()) ??
      digestForCardName(card.name)?.accountId ??
      "";
    if (!accountId) continue;
    if (readOutcome(card.notes)) continue;

    // ✕-parked entries leave every register view — the note survives in the
    // table, the row does not. The report must read exactly what the room does.
    const notes = (input.notesById.get(accountId) ?? []).filter(
      (n) => !input.dispositions.has(`hide:note:${n.id}`),
    );
    const step = cardNextStep(card, input.labels, input.now.getTime());
    const second = input.secondById.get(accountId);

    out.push({
      id: accountId,
      name: card.name,
      csm: String(peoById.get(accountId)?.csm ?? ""),
      stageLabel: step?.nodeLabel ?? "",
      notes,
      todos: input.todos.filter((t) => t.accountId === accountId),
      gaps: readGaps(input.notesById as never, accountId, gapDismissed).shown.map(
        (g) => g.question,
      ),
      support: second?.support ?? null,
      actors: second?.rollup?.actors ?? [],
    });
  }
  return out;
}

/** The Chicago day, as the report heads itself. */
export function pipelineDayLabel(now: Date): string {
  return now.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

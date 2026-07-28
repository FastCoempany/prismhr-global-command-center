// The stage rail — the old dashboard's seven nodes and their checklists,
// distilled into a compact, serializable view for the room's climb bar and
// its whisper-sized drawer. Pure; adversarially tested.

import { DASH_NODES, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";

export type StageItemView = {
  item: string;
  checked: boolean;
  note: string;
  index: number;
};
export type StageView = {
  key: DashNodeKey;
  label: string;
  state: "done" | "cur" | "todo";
  items: StageItemView[];
  judgment: string;
};

type CardLike = {
  states: Record<string, NodeState | string>;
  checks: Record<string, boolean[]>;
  checkNotes: Record<string, Record<number, string>>;
  notes: Record<string, string>;
};

// One entry per stage, in pipeline order. "cur" = the first active node (the
// climb's ringed dot); nodes whose state is done render filled; everything
// else is quiet. Bad or missing card data degrades to all-todo, never throws.
export function buildStageRail(
  card: CardLike,
  labels: Record<string, string>,
): StageView[] {
  const out: StageView[] = [];
  let curSeen = false;
  for (const node of DASH_NODES) {
    const rawState = card?.states?.[node.key];
    const checks = Array.isArray(card?.checks?.[node.key]) ? card.checks[node.key] : [];
    const notes = card?.checkNotes?.[node.key] ?? {};
    const items: StageItemView[] = node.checklist.map((item, index) => ({
      item,
      index,
      checked: !!checks[index],
      note: typeof notes[index] === "string" ? notes[index].slice(0, 300) : "",
    }));
    const state: StageView["state"] =
      rawState === "done" ? "done" : rawState === "active" && !curSeen ? "cur" : "todo";
    if (state === "cur") curSeen = true;
    out.push({
      key: node.key,
      label: (labels?.[node.key] ?? node.label).slice(0, 24),
      state,
      items,
      judgment:
        typeof card?.notes?.[node.key] === "string"
          ? card.notes[node.key].slice(0, 400)
          : "",
    });
  }
  return out;
}

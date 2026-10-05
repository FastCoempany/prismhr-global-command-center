// Every note written anywhere in the app also lands on the Day Sheet — one
// surface owns "what crossed the desk today". The mirror row is a pre-routed
// sheet note: its marker references the note row the action just created, so
// the receipt reads "routed → X" and ↩ undo removes exactly that note. Best
// effort by design — a failed mirror never fails the write it mirrors.

import { getPrisma } from "@/lib/db";
import { createTodoRow } from "@/lib/notes/write";
import { withMarker, type RouteRefs } from "./route-notes";

export async function mirrorNoteToSheet(
  body: string,
  refs: RouteRefs,
  label: string,
): Promise<string | null> {
  try {
    const prisma = getPrisma();
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (top?.position ?? -1) + 1;
    // The marker is already on the body; the writer takes it as handed over.
    // A table without remindAt still takes the row, as before.
    const b = withMarker(body.slice(0, 20000), refs, label);
    const t = await createTodoRow({ body: b, position, remindAt: new Date() }).catch(() =>
      createTodoRow({ body: b, position }),
    );
    return t.id;
  } catch {
    // Sheet mirror is best-effort; the original note already saved.
    return null;
  }
}

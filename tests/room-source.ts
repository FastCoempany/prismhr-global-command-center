// The room's actions as the source scans read them. roomPaste's pipeline
// moved to src/lib/room/paste-core.ts (2026-10-19) so the sent-copy route
// files through it with no session; roomPaste is that core behind the
// session check. The scans slice roomPaste's body out of the actions file,
// so this splices the core back in where it read before: its helpers ahead
// of the wrapper, its pipeline behind it.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export function roomActionsSource(root: string): string {
  const actions = readFileSync(join(root, "src/app/room/actions.ts"), "utf8");
  const core = readFileSync(join(root, "src/lib/room/paste-core.ts"), "utf8");
  const at = core.indexOf("export async function pasteCapture(");
  const helpers = core.slice(core.indexOf("export type PasteResult"), at);
  const pipeline = core.slice(at);
  const head = "export async function roomPaste(";
  const seam = "  return pasteCapture(accountId, raw, opts, requireWrite);\n}\n";
  if (!actions.includes(seam) || !actions.includes(head))
    throw new Error("roomPaste's wrapper moved");
  // Function replacers: the core's own text carries `$` sequences a
  // replacement string would expand.
  return actions
    .replace(head, () => `${helpers}${head}`)
    .replace(seam, () => `${seam}\n${pipeline}\n`);
}

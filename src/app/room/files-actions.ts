"use server";

// The files Send carries, recorded (the F26 face, release three). A file
// that leaves in a downloaded Outlook draft leaves no trace in the sent copy
// the relay files, so the app records the send the moment the draft is in
// hand: one filessent:<accountId> note per send (src/lib/room/files-sent.ts).
// ↺ takes one back. Called from the HomeRoom's Send files and the Groundwork
// letter's Send.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { bindAccountId } from "@/lib/room/bind";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";
import { FILES_NS, renderFilesSent } from "@/lib/room/files-sent";

async function writable(accountId: string): Promise<string | null> {
  const acct = bindAccountId(accountId, peos);
  if (!acct || !hasDatabaseEnv()) return null;
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return null;
  return acct.id;
}

export async function recordFilesSent(
  accountId: string,
  fileIds: string[],
  to: string,
): Promise<{ ok: boolean }> {
  const id = await writable(accountId);
  if (!id) return { ok: false };
  const body = renderFilesSent(fileIds ?? [], redactMoney(to ?? ""));
  if (!body) return { ok: false };
  try {
    await createAccountNoteRow({
      accountId: `${FILES_NS}${id}`,
      kind: "mine",
      body,
      door: "hand",
      lane: "mine",
      source: "filessent",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** ↺ on one send: the record of it comes off; nothing else was written. */
export async function takeBackFilesSent(
  accountId: string,
  noteId: string,
): Promise<{ ok: boolean }> {
  const id = await writable(accountId);
  if (!id || !noteId) return { ok: false };
  try {
    await getPrisma().accountNote.deleteMany({
      where: { id: noteId, accountId: `${FILES_NS}${id}` },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
